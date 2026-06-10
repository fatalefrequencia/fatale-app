import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShieldAlert } from 'lucide-react';
import API from '../services/api';

const TipArtistModal = ({ isOpen, onClose, artist, userBalance, onTipSuccess, showNotification }) => {
    const [amount, setAmount] = useState(50);
    const [customAmount, setCustomAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const presetAmounts = [10, 25, 50, 100, 250];

    const getFinalAmount = () => {
        if (customAmount) {
            const parsed = parseInt(customAmount, 10);
            return isNaN(parsed) ? 0 : parsed;
        }
        return amount;
    };

    const finalAmount = getFinalAmount();
    const finalUSD = (finalAmount * 0.1).toFixed(2);
    const hasEnoughBalance = userBalance >= finalAmount;

    const handleTip = async () => {
        if (finalAmount <= 0) {
            showNotification?.("INVALID_AMOUNT", "Please specify a positive credit amount.", "error");
            return;
        }

        if (!hasEnoughBalance) {
            showNotification?.("INSUFFICIENT_CRD", "Insufficient credits in your wallet.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const artistId = artist.id || artist.Id;
            const res = await API.Purchases.purchaseTrack(null); // Just imports API context, but let's call our tip endpoint directly:
            // EconomyController tip endpoint: POST api/Economy/tip/{artistId}?amount=50
            const tipRes = await API.post(`Economy/tip/${artistId}?amount=${finalAmount}`);
            
            showNotification?.("TIP_SUCCESS", `Successfully tipped ${finalAmount} credits ($${finalUSD}) to ${artist.name || artist.Name}!`, "success");
            onTipSuccess?.(tipRes.data.newBalance);
            onClose();
        } catch (err) {
            console.error("Tipping failed:", err);
            showNotification?.("TIP_ERROR", err.response?.data?.message || err.response?.data || "Tipping failed. Check network or credit balance.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 15 }}
                        className="w-full max-w-md bg-[#050505] border border-[#ff006e]/30 relative overflow-hidden shadow-[0_0_50px_rgba(255,0,110,0.25)] rounded-sm font-mono text-white"
                    >
                        {/* Header banner */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff006e] via-[#9b5de5] to-[#00ffff]" />

                        {/* Top close button */}
                        <div className="flex justify-between items-center p-5 border-b border-white/5">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff006e] flex items-center gap-2">
                                <Heart size={14} className="text-[#ff006e] animate-pulse" />
                                SUPPORT_ARTIST_RESONANCE
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/40 hover:text-[#ff006e] transition-all hover:rotate-90 p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Artist Profile mini widget */}
                            <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-sm">
                                <div className="w-10 h-10 rounded-full bg-[#ff006e]/10 border border-[#ff006e]/20 flex items-center justify-center font-black text-[#ff006e] text-xs">
                                    {(artist.name || artist.Name || "A").substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-xs font-black uppercase text-white tracking-widest">{artist.name || artist.Name}</div>
                                    <div className="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">ESTABLISHING NEURAL TIP TRANSMISSION</div>
                                </div>
                            </div>

                            {/* Presets */}
                            <div className="space-y-2">
                                <label className="text-[8px] text-white/40 uppercase tracking-widest">Select Tip Amount</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {presetAmounts.map((amt) => (
                                        <button
                                            key={amt}
                                            disabled={isSubmitting}
                                            onClick={() => {
                                                setAmount(amt);
                                                setCustomAmount('');
                                            }}
                                            className={`py-2 text-[10px] font-black tracking-wider rounded-sm border uppercase transition-all ${
                                                amount === amt && !customAmount
                                                    ? 'bg-[#ff006e]/15 border-[#ff006e] text-[#ff006e] shadow-[0_0_10px_rgba(255,0,110,0.15)]'
                                                    : 'bg-white/5 border-white/10 hover:border-white/30 text-white/70 hover:text-white'
                                            }`}
                                        >
                                            {amt} CRD
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Amount */}
                            <div className="space-y-2">
                                <label className="text-[8px] text-white/40 uppercase tracking-widest">Or Enter Custom Amount</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        disabled={isSubmitting}
                                        value={customAmount}
                                        onChange={(e) => {
                                            setCustomAmount(e.target.value);
                                            setAmount(0);
                                        }}
                                        placeholder="CUSTOM_CREDIT_AMOUNT"
                                        className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-[#ff006e] outline-none text-[10px] text-white uppercase px-3 py-3 rounded-sm tracking-widest transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white/30 tracking-widest">CRD</span>
                                </div>
                            </div>

                            {/* conversion and verification panel */}
                            <div className="p-4 bg-black border border-white/5 rounded-sm space-y-2">
                                <div className="flex justify-between items-center text-[9px] uppercase tracking-wider">
                                    <span className="text-white/40">ESTIMATED VALUE:</span>
                                    <span className="font-bold text-[#00ffff]">${finalUSD} USD</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] uppercase tracking-wider">
                                    <span className="text-white/40">YOUR CURRENT BALANCE:</span>
                                    <span className="font-bold">{userBalance} CRD</span>
                                </div>
                            </div>

                            {/* Warnings */}
                            {!hasEnoughBalance && finalAmount > 0 && (
                                <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-sm">
                                    <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                                    <div className="text-[8px] uppercase tracking-wider leading-relaxed">
                                        Transmission Blocked: Insufficient system credits. Please top up your wallet balance in the wallet center.
                                    </div>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="w-1/3 py-3 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all rounded-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleTip}
                                    disabled={isSubmitting || finalAmount <= 0 || !hasEnoughBalance}
                                    className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-[#ff006e] text-black hover:bg-white transition-all disabled:opacity-30 disabled:hover:bg-[#ff006e] disabled:hover:text-black rounded-sm shadow-[0_0_15px_rgba(255,0,110,0.25)]"
                                >
                                    {isSubmitting ? 'TRANSMITTING...' : 'EXECUTE TIP'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TipArtistModal;
