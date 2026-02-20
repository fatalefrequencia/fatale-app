import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../services/api';
import creditCoin from '../assets/credit_coin.png';
import { Skull } from 'lucide-react';
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

    if (loading) return <div className="text-white">Loading credit options...</div>;

    return (
        <div className="bg-black/80 p-6 md:p-8 border-l-2 border-[#ff006e]/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-1 bg-[#ff006e]/20 mb-1"></div>
                <div className="w-8 h-1 bg-[#ff006e]/20 ml-auto"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <motion.img
                    src={creditCoin}
                    alt="Credits"
                    className="w-10 h-10 object-contain rounded-full mix-blend-screen drop-shadow-[0_0_8px_rgba(255,0,110,0.5)]"
                    animate={{ rotateY: 360 }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
                Buy Credits
            </h2>

            <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-200 text-sm">
                Support artists directly!
                <span className="text-purple-400 font-bold ml-1">Artists keep 100%</span> of the credits you spend on their tracks.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {bundles.map(bundle => (
                    <div
                        key={bundle.id}
                        className={`relative p-5 rounded-xl border flex flex-col items-center text-center transition-all hover:scale-105 ${bundle.bestValue
                            ? 'bg-gradient-to-b from-purple-900/40 to-black border-purple-500/50 shadow-lg shadow-purple-900/20'
                            : bundle.popular
                                ? 'bg-zinc-800/80 border-yellow-500/30'
                                : 'bg-zinc-800/50 border-white/5'
                            }`}
                    >
                        {bundle.bestValue && (
                            <div className="absolute -top-3 bg-purple-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-lg">
                                Best Value
                            </div>
                        )}
                        {bundle.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg whitespace-nowrap">
                                MOST POPULAR
                            </div>
                        )}

                        <div className="text-3xl font-black text-white mb-1">
                            {bundle.credits}
                        </div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Credits</div>

                        {/* Artist Value Display */}
                        <div className="text-[10px] text-emerald-400 mb-3 font-mono">
                            ${(bundle.credits * 0.10).toFixed(2)} to artists
                        </div>

                        <div className="text-xl font-bold text-purple-300 mb-2">
                            ${bundle.price}
                        </div>

                        {/* Platform Fee Badge */}
                        {bundle.fee && (
                            <div className="text-[9px] text-gray-500 mb-4 font-mono">
                                +{bundle.fee} platform fee
                            </div>
                        )}

                        <button
                            onClick={() => handlePurchase(bundle.id)}
                            disabled={processing}
                            className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${bundle.bestValue
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {processing ? '...' : 'Buy Now'}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-4 text-xs text-center text-gray-600">
                Prices include platform fees. Payments processed securely via Stripe.
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
