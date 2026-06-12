import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, ShieldCheck, Zap, Lock, CreditCard, ChevronRight, AlertTriangle, X } from 'lucide-react';
import API from '../services/api';
import creditCoin from '../assets/credit_coin.png';
import ActionModal from './ActionModal';

const CreditPurchase = ({ user, refreshProfile }) => {
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, confirmText: 'Confirm' });

    // Stripe checkout simulation states
    const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
    const [cardExpiry, setCardExpiry] = useState('12/28');
    const [cardCvv, setCardCvv] = useState('042');
    const [cardName, setCardName] = useState(user?.username?.toUpperCase() || 'NEURAL_USER');

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

    const calculateStripeFee = (price) => {
        // Stripe fee formula: (price + 0.30) / (1 - 0.029) - price
        // This calculates the fee to pass to the user so we get exactly the bundle price.
        const base = parseFloat(price);
        const total = (base + 0.30) / (1 - 0.029);
        return {
            fee: (total - base).toFixed(2),
            total: total.toFixed(2)
        };
    };

    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBundle) return;

        setProcessing(true);
        try {
            const res = await API.Economy.purchaseCredits(selectedBundle.id);
            setModalConfig({
                isOpen: true,
                title: 'Acquisition_Complete',
                message: res.data.message || `Secured ${selectedBundle.credits} credits. System wallets updated.`,
                type: 'alert',
                confirmText: 'Acknowledge'
            });
            setSelectedBundle(null);
            if (refreshProfile) refreshProfile(true);
        } catch (error) {
            setModalConfig({
                isOpen: true,
                title: 'Transaction_Error',
                message: "Stripe verification failed: " + (error.response?.data || error.message),
                type: 'alert',
                confirmText: 'Back'
            });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="text-[9px] text-white/20 font-mono uppercase tracking-widest py-8">
            &gt; FETCHING_CREDIT_BUNDLES...
        </div>
    );

    return (
        <div className="bg-black/60 p-6 md:p-8 relative overflow-hidden border border-white/5 font-mono text-white">
            {/* Corner accents */}
            <div className="absolute top-0 right-0 p-3 opacity-30">
                <div className="w-12 h-px bg-fatale/40 mb-1" />
                <div className="w-6 h-px bg-fatale/40 ml-auto" />
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
                <div className="text-[11px] font-black text-fatale/60 uppercase tracking-[0.3em]">// CREDIT_ACQUISITION</div>
            </div>

            {/* Info banner */}
            <div className="mb-8 px-4 py-3 border border-fatale/10 bg-fatale/5 flex items-start gap-3">
                <span className="text-fatale/40 font-black text-[10px] mt-0.5">&gt;</span>
                <p className="text-xs text-white/40 uppercase tracking-wide leading-relaxed">
                    Artists keep <span className="text-fatale/80 font-black">100%</span> of credits spent on their tracks.
                    Direct support, zero platform cut on artist earnings.
                </p>
            </div>

            {/* Bundles grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {bundles.map(bundle => {
                    const fees = calculateStripeFee(bundle.price);
                    return (
                        <div
                            key={bundle.id}
                            className={`relative flex flex-col p-5 border transition-all hover:-translate-y-0.5 ${bundle.bestValue
                                ? 'border-fatale/40 bg-fatale/5'
                                : bundle.popular
                                    ? 'border-white/10 bg-white/[0.03]'
                                    : 'border-white/5 bg-black/40'
                                }`}
                        >
                            {/* Badge */}
                            {bundle.bestValue && (
                                <div className="absolute -top-px left-0 right-0 h-px bg-fatale" />
                            )}
                            {bundle.bestValue && (
                                <div className="text-[10px] font-black text-fatale uppercase tracking-widest mb-3">&#9670; BEST_VALUE</div>
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
                            <div className="text-xs text-fatale/60 mb-1">
                                ${(bundle.credits * 0.10).toFixed(2)} → ARTISTS
                            </div>

                            {/* Price */}
                            <div className="text-lg font-black text-white mb-1 tracking-tighter">
                                ${bundle.price} USD
                            </div>

                            {/* Fee */}
                            <div className="text-[8px] text-white/25 font-mono mb-4">
                                +${fees.fee} STRIPE_PROCESSING_FEE
                            </div>

                            <div className="flex-1" />

                            <button
                                onClick={() => setSelectedBundle(bundle)}
                                className={`w-full py-2.5 font-black text-xs uppercase tracking-widest transition-all mt-4 relative overflow-hidden group active:scale-95 ${bundle.bestValue
                                    ? 'bg-fatale/20 border border-fatale/50 text-white hover:bg-fatale/40 hover:border-fatale shadow-[0_0_20px_rgba(255,0,110,0.2)]'
                                    : 'bg-white/5 border border-white/10 text-white/60 hover:border-fatale/40 hover:text-white'
                                    }`}
                            >
                                <span className="relative z-10">BUY_CREDITS</span>
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 text-[10px] text-center text-white/15 uppercase tracking-widest">
                Prices exclude platform fees · Payments processed via Stripe
            </div>

            {/* Custom Stripe Checkout Dialog Overlay */}
            <AnimatePresence>
                {selectedBundle && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 15 }}
                            className="w-full max-w-md bg-[#050505] border border-fatale/30 relative overflow-hidden shadow-[0_0_50px_rgba(255,0,110,0.25)] rounded-sm"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-black">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fatale flex items-center gap-2">
                                    <CreditCard size={14} className="text-fatale" />
                                    STRIPE_SECURE_PAYMENT
                                </div>
                                <button
                                    onClick={() => setSelectedBundle(null)}
                                    className="text-white/40 hover:text-fatale transition-all hover:rotate-90 p-1"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Stripe simulated form */}
                            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-6">
                                {/* Order Summary */}
                                <div className="p-4 bg-black border border-white/5 space-y-2">
                                    <div className="flex justify-between text-[9px] uppercase tracking-wider">
                                        <span className="text-white/40">ITEM:</span>
                                        <span className="font-bold text-white">{selectedBundle.credits} FATALE CREDITS</span>
                                    </div>
                                    <div className="flex justify-between text-[9px] uppercase tracking-wider">
                                        <span className="text-white/40">SUBTOTAL:</span>
                                        <span className="font-bold text-white">${selectedBundle.price} USD</span>
                                    </div>
                                    <div className="flex justify-between text-[9px] uppercase tracking-wider">
                                        <span className="text-white/40">STRIPE PROCESSING FEE:</span>
                                        <span className="font-bold text-white/50">${calculateStripeFee(selectedBundle.price).fee} USD</span>
                                    </div>
                                    <div className="h-px bg-white/5 my-2" />
                                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-black">
                                        <span className="text-fatale">TOTAL CHARGE:</span>
                                        <span className="text-fatale">${calculateStripeFee(selectedBundle.price).total} USD</span>
                                    </div>
                                </div>

                                {/* Form Inputs */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[8px] text-white/40 uppercase tracking-widest">Cardholder Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={cardName}
                                            onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                            className="w-full bg-white/5 border border-white/10 focus:border-fatale outline-none text-[10px] text-white px-3 py-3 rounded-sm uppercase tracking-wider"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[8px] text-white/40 uppercase tracking-widest">Card Number</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                value={cardNumber}
                                                onChange={(e) => setCardNumber(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 focus:border-fatale outline-none text-[10px] text-white px-3 py-3 rounded-sm tracking-wider pl-10"
                                            />
                                            <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[8px] text-white/40 uppercase tracking-widest">Expiration</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="MM/YY"
                                                value={cardExpiry}
                                                onChange={(e) => setCardExpiry(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 focus:border-fatale outline-none text-[10px] text-white px-3 py-3 rounded-sm tracking-wider text-center"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[8px] text-white/40 uppercase tracking-widest">CVV / CVC</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="CVV"
                                                maxLength="3"
                                                value={cardCvv}
                                                onChange={(e) => setCardCvv(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 focus:border-fatale outline-none text-[10px] text-white px-3 py-3 rounded-sm tracking-wider text-center"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5 p-3 bg-cyan-500/5 border border-cyan-500/20 text-cyan-400/80 rounded-sm">
                                    <Lock size={12} className="shrink-0 mt-0.5" />
                                    <div className="text-[7px] uppercase tracking-wider leading-relaxed">
                                        Sandbox Mode Active: Cards are simulated. Stripe endpoints will route test transactions and deduct zero actual fiat currency.
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBundle(null)}
                                        disabled={processing}
                                        className="w-1/3 py-3 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/70 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-fatale text-black hover:bg-white transition-all shadow-[0_0_15px_rgba(255,0,110,0.3)] disabled:opacity-50"
                                    >
                                        {processing ? 'VERIFYING...' : `PAY $${calculateStripeFee(selectedBundle.price).total}`}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
