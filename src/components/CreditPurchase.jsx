import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../services/api';
import creditCoin from '../assets/credit_coin.png';
import ActionModal from './ActionModal';

const CreditPurchase = ({ user, refreshProfile }) => {
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, confirmText: 'Confirm' });

    useEffect(() => {
        fetchBundles();
    }, []);

    const fetchBundles = async () => {
        try {
            const res = await API.Economy.getBundles();
            setBundles(res.data);
        } catch (error) {
            console.error("Failed to fetch credit bundles", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = (bundleId) => {
        setModalConfig({
            isOpen: true,
            title: 'Authorization_Required',
            message: "Confirm purchase? This will charge your card on file and allocate credits to your account.",
            type: 'confirm',
            confirmText: 'Execute',
            onConfirm: async () => {
                setProcessing(true);
                try {
                    const res = await API.Economy.purchaseCredits(bundleId);
                    setModalConfig({
                        isOpen: true,
                        title: 'Acquisition_Complete',
                        message: res.data.message || "Credits successfully allocated to your system wallet.",
                        type: 'alert',
                        confirmText: 'Acknowledge'
                    });
                    if (refreshProfile) refreshProfile(true);
                } catch (error) {
                    setModalConfig({
                        isOpen: true,
                        title: 'Transaction_Error',
                        message: "Purchase failed: " + (error.response?.data || error.message),
                        type: 'alert',
                        confirmText: 'Back'
                    });
                } finally {
                    setProcessing(false);
                }
            }
        });
    };

    if (loading) return (
        <div className="text-[9px] text-white/20 font-mono uppercase tracking-widest py-8">
            &gt; FETCHING_CREDIT_BUNDLES...
        </div>
    );

    return (
        <div className="bg-black/60 p-6 md:p-8 relative overflow-hidden border border-white/5">
            {/* Corner accents */}
            <div className="absolute top-0 right-0 p-3 opacity-30">
                <div className="w-12 h-px bg-[#ff006e]/40 mb-1" />
                <div className="w-6 h-px bg-[#ff006e]/40 ml-auto" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <motion.img
                    src={creditCoin}
                    alt="Credits"
                    className="w-8 h-8 object-contain rounded-full mix-blend-screen shadow-[0_0_12px_rgba(255,0,110,0.6)]"
                    animate={{ rotateY: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
                <div className="text-[11px] font-black text-[#ff006e]/60 uppercase tracking-[0.3em]">// CREDIT_ACQUISITION</div>
            </div>

            {/* Info banner */}
            <div className="mb-8 px-4 py-3 border border-[#ff006e]/10 bg-[#ff006e]/5 flex items-start gap-3">
                <span className="text-[#ff006e]/40 font-black text-[10px] mt-0.5">&gt;</span>
                <p className="text-xs text-white/40 font-mono uppercase tracking-wide leading-relaxed">
                    Artists keep <span className="text-[#ff006e]/80 font-black">100%</span> of credits spent on their tracks.
                    Direct support, zero platform cut on artist earnings.
                </p>
            </div>

            {/* Bundles grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {bundles.map(bundle => (
                    <div
                        key={bundle.id}
                        className={`relative flex flex-col p-5 border transition-all hover:-translate-y-0.5 ${bundle.bestValue
                            ? 'border-[#ff006e]/40 bg-[#ff006e]/5'
                            : bundle.popular
                                ? 'border-white/10 bg-white/[0.03]'
                                : 'border-white/5 bg-black/40'
                            }`}
                    >
                        {/* Badge */}
                        {bundle.bestValue && (
                            <div className="absolute -top-px left-0 right-0 h-px bg-[#ff006e]" />
                        )}
                        {bundle.bestValue && (
                            <div className="text-[10px] font-black text-[#ff006e] uppercase tracking-widest mb-3">&#9670; BEST_VALUE</div>
                        )}
                        {bundle.popular && !bundle.bestValue && (
                            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">&#9670; MOST_POPULAR</div>
                        )}
                        {!bundle.bestValue && !bundle.popular && (
                            <div className="mb-6" />
                        )}

                        {/* Credits amount */}
                        <div className="text-4xl font-black text-white tracking-tighter mb-0.5">
                            {bundle.credits}
                        </div>
                        <div className="text-xs text-white/20 uppercase tracking-widest font-black mb-4">CREDITS</div>

                        {/* Artist value */}
                        <div className="text-xs text-[#ff006e]/60 font-mono mb-1">
                            ${(bundle.credits * 0.10).toFixed(2)} → ARTISTS
                        </div>

                        {/* Price */}
                        <div className="text-lg font-black text-white mb-1 tracking-tighter">
                            ${bundle.price}
                        </div>

                        {/* Fee */}
                        {bundle.fee && (
                            <div className="text-[10px] text-white/20 font-mono mb-4">
                                +{bundle.fee} PLATFORM_FEE
                            </div>
                        )}

                        <div className="flex-1" />

                        <button
                            onClick={() => handlePurchase(bundle.id)}
                            disabled={processing}
                            className={`w-full py-2.5 font-black text-xs uppercase tracking-widest transition-all mt-4 relative overflow-hidden group active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${bundle.bestValue
                                ? 'bg-[#ff006e]/20 border border-[#ff006e]/50 text-white hover:bg-[#ff006e]/40 hover:border-[#ff006e] shadow-[0_0_20px_rgba(255,0,110,0.2)]'
                                : 'bg-white/5 border border-white/10 text-white/60 hover:border-[#ff006e]/40 hover:text-white'
                                }`}
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-400" />
                            <span className="relative z-10">{processing ? '...' : 'ACQUIRE'}</span>
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-6 text-[10px] text-center text-white/15 font-mono uppercase tracking-widest">
                Prices include platform fees · Payments processed via Stripe
            </div>

            <ActionModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                confirmText={modalConfig.confirmText}
            />
        </div>
    );
};

export default CreditPurchase;
