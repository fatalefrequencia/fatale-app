import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShieldCheck, Download, Zap, Coins, HardDrive, AlertCircle } from 'lucide-react';
import API from '../services/api';

const TrackEconomyModal = ({
    isOpen,
    onClose,
    track,
    isLiveBroadcast,
    userBalance,
    onTipSuccess,
    onPurchase,
    onDownload,
    showNotification
}) => {
    const [tipAmount, setTipAmount] = useState(50);
    const [customTip, setCustomTip] = useState('');
    const [isSubmittingTip, setIsSubmittingTip] = useState(false);

    if (!track) return null;

    const isYoutube = track.category === 'YouTube' || track.source?.startsWith('youtube:') || String(track.id).startsWith('youtube:');
    const isNative = !isYoutube && !isLiveBroadcast;
    const isOwned = track.isOwned || track.isMine;

    const presetAmounts = [10, 25, 50, 100, 250];

    const getFinalTipAmount = () => {
        if (customTip) {
            const parsed = parseInt(customTip, 10);
            return isNaN(parsed) ? 0 : parsed;
        }
        return tipAmount;
    };

    const finalTip = getFinalTipAmount();
    const tipUSD = (finalTip * 0.1).toFixed(2);
    const hasEnoughForTip = userBalance >= finalTip;

    const handleTipExecution = async () => {
        if (finalTip <= 0) {
            showNotification?.("INVALID_AMOUNT", "Please specify a positive credit amount.", "error");
            return;
        }

        if (!hasEnoughForTip) {
            showNotification?.("INSUFFICIENT_CRD", "Insufficient credits in your wallet.", "error");
            return;
        }

        setIsSubmittingTip(true);
        try {
            const artistId = track.artistId || track.ArtistId || track.userId || track.UserId;
            if (!artistId) {
                showNotification?.("TIP_ERROR", "Cannot identify artist for tipping.", "error");
                return;
            }
            const tipRes = await API.Economy.tipArtist(artistId, finalTip);
            showNotification?.("TIP_SUCCESS", `Tipped ${finalTip} credits ($${tipUSD}) to ${track.artist || "Artist"}!`, "success");
            onTipSuccess?.(tipRes.data.newBalance);
            onClose();
        } catch (err) {
            console.error("Tipping failed:", err);
            showNotification?.("TIP_ERROR", err.response?.data?.message || "Tipping failed. Check network or credit balance.", "error");
        } finally {
            setIsSubmittingTip(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 20 }}
                        className="w-full max-w-lg bg-[#050505] border border-[#ff006e]/30 relative overflow-hidden shadow-[0_0_80px_rgba(255,0,110,0.2)] rounded-sm font-mono text-white"
                    >
                        {/* Status bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff006e] via-[#d60036] to-[#9d00ff]" />

                        {/* Top close button */}
                        <div className="flex justify-between items-center p-5 border-b border-white/5 bg-black/50">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff006e] flex items-center gap-2">
                                <Coins size={14} className="text-[#ff006e] animate-pulse" />
                                {isLiveBroadcast ? "BROADCAST_RESONANCE_SUPPORT" : "SIGNAL_TRANSACTION_TERMINAL"}
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/40 hover:text-[#ff006e] transition-all hover:rotate-90 p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Track Details Widget */}
                            <div className="flex items-center justify-between gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-sm">
                                <div className="flex items-center gap-4 min-w-0">
                                    {track.cover || track.thumbnail || track.coverImageUrl ? (
                                        <img src={track.cover || track.thumbnail || track.coverImageUrl} alt="Cover" className="w-12 h-12 object-cover rounded-sm border border-[#ff006e]/30 shrink-0" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-sm bg-[#ff006e]/10 border border-[#ff006e]/20 flex items-center justify-center font-black text-[#ff006e] shrink-0">
                                            {resolveArtworkLetter(track)}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-xs font-black uppercase text-white tracking-widest truncate">{track.title}</div>
                                        <div className="text-[8px] text-white/40 uppercase tracking-widest mt-1 truncate">{track.artist}</div>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    {isLiveBroadcast ? (
                                        <span className="px-2 py-0.5 border border-[#ff006e]/30 bg-[#ff006e]/10 text-[#ff006e] text-[8px] font-bold uppercase tracking-widest">LIVE BROADCAST</span>
                                    ) : isOwned ? (
                                        <span className="px-2 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={10} /> OWNED</span>
                                    ) : (
                                        <span className="px-2 py-0.5 border border-white/10 bg-white/5 text-white/40 text-[8px] font-bold uppercase tracking-widest">NOT LICENSED</span>
                                    )}
                                </div>
                            </div>

                            {/* Economy Actions Grid */}
                            {!isLiveBroadcast && isNative && (
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Action 1: Purchase / Ownership License */}
                                    <div className="bg-black/40 border border-white/5 p-4 flex flex-col justify-between space-y-3 rounded-sm">
                                        <div>
                                            <div className="text-[8px] text-white/40 uppercase tracking-widest">SIGNAL_ACQUISITION</div>
                                            <div className="text-[10px] font-black uppercase text-white mt-1">Ownership License</div>
                                        </div>
                                        {isOwned ? (
                                            <div className="text-[8px] text-emerald-400 uppercase tracking-widest mt-2 flex items-center gap-1.5 py-3">
                                                <ShieldCheck size={12} /> SECURED IN CLOUD
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    onPurchase?.(track);
                                                    onClose();
                                                }}
                                                className="w-full py-2.5 text-[8px] font-black uppercase tracking-widest bg-[#ff006e] text-black hover:bg-white transition-all rounded-sm flex items-center justify-center gap-1.5"
                                            >
                                                <Zap size={10} /> {(track.price > 0 || track.Price > 0) ? `BUY (${track.price || track.Price} CRD)` : "CLAIM FREE"}
                                            </button>
                                        )}
                                    </div>

                                    {/* Action 2: Offline Listen Caching */}
                                    <div className="bg-black/40 border border-white/5 p-4 flex flex-col justify-between space-y-3 rounded-sm">
                                        <div>
                                            <div className="text-[8px] text-white/40 uppercase tracking-widest">OFFLINE_LISTEN_CACHE</div>
                                            <div className="text-[10px] font-black uppercase text-white mt-1">Spotify-Style Storage</div>
                                        </div>
                                        {!isOwned ? (
                                            <div className="text-[8px] text-white/30 uppercase tracking-widest mt-2 flex items-center gap-1.5 py-3">
                                                <AlertCircle size={12} /> REQUIRES LICENSE
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    onDownload?.(track);
                                                    onClose();
                                                }}
                                                className={`w-full py-2.5 text-[8px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center justify-center gap-1.5 ${
                                                    track.isCached
                                                        ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white'
                                                        : 'bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black'
                                                }`}
                                            >
                                                {track.isCached ? <HardDrive size={10} /> : <Download size={10} />}
                                                {track.isCached ? "REMOVE CACHE" : "DOWNLOAD TRACK"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tipping Panel */}
                            <div className="space-y-4 border-t border-white/5 pt-6">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff006e] flex items-center gap-1.5">
                                    <Heart size={10} /> TRANSMIT_APPRECIATION_TIP
                                </div>

                                {/* Presets */}
                                <div className="grid grid-cols-5 gap-2">
                                    {presetAmounts.map((amt) => (
                                        <button
                                            key={amt}
                                            disabled={isSubmittingTip}
                                            onClick={() => {
                                                setTipAmount(amt);
                                                setCustomTip('');
                                            }}
                                            className={`py-2 text-[9px] font-black tracking-wider rounded-sm border uppercase transition-all ${
                                                tipAmount === amt && !customTip
                                                    ? 'bg-[#ff006e]/15 border-[#ff006e] text-[#ff006e]'
                                                    : 'bg-white/5 border-white/10 hover:border-white/30 text-white/70 hover:text-white'
                                            }`}
                                        >
                                            {amt} CRD
                                        </button>
                                    ))}
                                </div>

                                {/* Custom input */}
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        disabled={isSubmittingTip}
                                        value={customTip}
                                        onChange={(e) => {
                                            setCustomTip(e.target.value);
                                            setTipAmount(0);
                                        }}
                                        placeholder="ENTER_CUSTOM_TIP_AMOUNT"
                                        className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-[#ff006e] outline-none text-[9px] text-white px-3 py-3 rounded-sm tracking-widest"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-white/30 tracking-widest">CRD</span>
                                </div>

                                {/* Wallet balance and estimated value */}
                                <div className="grid grid-cols-2 gap-4 p-4 bg-black border border-white/5 rounded-sm">
                                    <div className="text-left space-y-1">
                                        <div className="text-[7px] text-white/40 uppercase">VALUE (USD)</div>
                                        <div className="text-xs font-black text-[#00ffff]">${tipUSD} USD</div>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div className="text-[7px] text-white/40 uppercase">WALLET BALANCE</div>
                                        <div className="text-xs font-black">{userBalance} CRD</div>
                                    </div>
                                </div>

                                {/* Warning */}
                                {!hasEnoughForTip && finalTip > 0 && (
                                    <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-sm">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                        <div className="text-[8px] uppercase tracking-wider leading-relaxed">
                                            Transmission Blocked: Insufficient system credits. Please top up your wallet in the system hub.
                                        </div>
                                    </div>
                                )}

                                {/* Submit button */}
                                <button
                                    onClick={handleTipExecution}
                                    disabled={isSubmittingTip || finalTip <= 0 || !hasEnoughForTip}
                                    className="w-full py-3.5 text-[9px] font-black uppercase tracking-widest bg-[#ff006e] text-black hover:bg-white transition-all disabled:opacity-30 disabled:hover:bg-[#ff006e] disabled:hover:text-black rounded-sm shadow-[0_0_20px_rgba(255,0,110,0.25)]"
                                >
                                    {isSubmittingTip ? "TRANSMITTING APPRECIATION RESONANCE..." : "EXECUTE TIP TRANSMISSION"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const resolveArtworkLetter = (track) => {
    const title = track.title || track.Title || "A";
    return title.substring(0, 2).toUpperCase();
};

export default TrackEconomyModal;
