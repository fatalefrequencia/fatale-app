import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../services/api';
import ActionModal from './ActionModal';

const SubscriptionManager = ({ user, refreshProfile }) => {
    const [status, setStatus] = useState(null);
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, confirmText: 'Confirm' });

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            const [statusRes, tiersRes] = await Promise.all([
                API.Subscriptions.getStatus(),
                API.Subscriptions.getTiers()
            ]);
            setStatus(statusRes.data);
            setTiers(tiersRes.data);
        } catch (error) {
            console.error("Failed to fetch subscription data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = (tierId) => {
        setModalConfig({
            isOpen: true,
            title: 'Authorization_Required',
            message: "Confirm subscription? This will charge your card on file and initialize premium node access.",
            type: 'confirm',
            confirmText: 'Execute',
            onConfirm: async () => {
                setProcessing(true);
                try {
                    await API.Subscriptions.subscribe(tierId);
                    setModalConfig({
                        isOpen: true,
                        title: 'Sync_Complete',
                        message: "Success! Premium node access initialized. Offline cache is now active.",
                        type: 'alert',
                        confirmText: 'Acknowledge'
                    });
                    await fetchData();
                    if (refreshProfile) refreshProfile(true);
                } catch (error) {
                    setModalConfig({
                        isOpen: true,
                        title: 'Sync_Error',
                        message: "Subscription failed: " + (error.response?.data || error.message),
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
            &gt; SEARCHING_SUBSCRIPTION_NODES...
        </div>
    );

    return (
        <div className="bg-black/60 p-6 md:p-8 relative overflow-hidden border border-white/5">
            {/* Corner accents */}
            <div className="absolute top-0 right-0 p-3 opacity-30">
                <div className="w-12 h-px bg-cyan-500/40 mb-1" />
                <div className="w-6 h-px bg-cyan-500/40 ml-auto" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    {/* Animated signal icon */}
                    <div className="relative w-6 h-6 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-cyan-400">
                            <motion.path d="M12 20h.01" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} />
                            <motion.path d="M8.5 16.429a5 5 0 0 1 7 0" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} />
                            <motion.path d="M5 12.859a10 10 0 0 1 14 0" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }} />
                        </svg>
                    </div>
                    <div className="text-[11px] font-black text-cyan-400/60 uppercase tracking-[0.3em]">// OFFLINE_CACHE_ACCESS</div>
                    {status?.isActive && (
                        <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 font-black tracking-widest uppercase">ACTIVE_NODE</span>
                    )}
                </div>

                {/* Current plan status OR info banner */}
                {status?.isActive ? (
                    <div className="mb-8 border border-cyan-500/15 bg-cyan-500/5 p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div>
                                <div className="text-[11px] text-white/30 font-black uppercase tracking-[0.25em] mb-1">CURRENT_PLAN</div>
                                <div className="text-xl font-black text-white uppercase tracking-tighter">{status.tierName}</div>
                                <div className="text-[10px] text-white/20 font-mono mt-1 uppercase tracking-widest">
                                    NEXT_RENEWAL: {new Date(status.currentPeriodEnd).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] uppercase tracking-widest font-black">
                                    <span className="text-white/30">CACHE_USAGE</span>
                                    <span className="text-cyan-400/80">
                                        {status.cacheUsed} / {status.cacheLimit === -1 ? '∞' : status.cacheLimit}
                                    </span>
                                </div>
                                <div className="w-full bg-white/5 h-px overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${status.cacheLimit === -1 ? (status.cacheUsed > 0 ? 100 : 0) : Math.min(100, (status.cacheUsed / status.cacheLimit) * 100)}%` }}
                                        className="bg-cyan-400 h-full shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 px-4 py-3 border border-white/5 bg-white/[0.02] flex items-start gap-3">
                        <span className="text-white/20 font-black text-[10px] mt-0.5">&gt;</span>
                        <p className="text-xs text-white/30 font-mono uppercase tracking-wide leading-relaxed">
                            Cache YouTube tracks for offline listening.{' '}
                            <span className="text-cyan-400/60 font-black">Artists still earn</span> via credit purchases regardless of subscription status.
                        </p>
                    </div>
                )}

                {/* Tiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {tiers && tiers.length > 0 ? (
                        tiers.map(tier => {
                            const isCurrent = status?.tier === tier.id;
                            return (
                                <div
                                    key={tier.id}
                                    className={`relative flex flex-col p-5 border transition-all ${isCurrent
                                        ? 'border-cyan-500/40 bg-cyan-500/5'
                                        : 'border-white/5 bg-black/40 hover:border-white/10'
                                        }`}
                                >
                                    {/* Recommended top accent */}
                                    {tier.id === 2 && !isCurrent && (
                                        <>
                                            <div className="absolute -top-px left-0 right-0 h-px bg-cyan-500/50" />
                                            <div className="text-[10px] font-black text-cyan-400/60 uppercase tracking-widest mb-3">&#9670; RECOMMENDED</div>
                                        </>
                                    )}
                                    {isCurrent && (
                                        <div className="text-[10px] font-black text-cyan-400/80 uppercase tracking-widest mb-3">&#9670; CURRENT_PLAN</div>
                                    )}
                                    {tier.id !== 2 && !isCurrent && (
                                        <div className="mb-6" />
                                    )}

                                    <div className="text-base font-black text-white uppercase tracking-tighter mb-1">{tier.name}</div>
                                    <div className="text-2xl font-black text-cyan-400 tracking-tighter mb-4">
                                        ${tier.price}<span className="text-xs text-white/20 font-black ml-1">/MO</span>
                                    </div>

                                    <ul className="space-y-2 mb-6 flex-1">
                                        <li className="flex items-center gap-2 text-[10px] text-white/40 font-mono uppercase tracking-wide">
                                            <span className="text-cyan-500/60 text-[8px]">&gt;</span>
                                            {tier.cacheLimit === -1 ? 'UNLIMITED' : tier.cacheLimit} CACHED_TRACKS
                                        </li>
                                        <li className="flex items-center gap-2 text-[10px] text-white/40 font-mono uppercase tracking-wide">
                                            <span className="text-cyan-500/60 text-[8px]">&gt;</span>
                                            OFFLINE_PLAYBACK
                                        </li>
                                        <li className="flex items-center gap-2 text-[10px] text-white/40 font-mono uppercase tracking-wide">
                                            <span className="text-cyan-500/60 text-[8px]">&gt;</span>
                                            HQ_AUDIO_STREAM
                                        </li>
                                    </ul>

                                    <button
                                        onClick={() => handleSubscribe(tier.id)}
                                        disabled={isCurrent || processing}
                                        className={`w-full py-2.5 font-black text-xs uppercase tracking-widest transition-all relative overflow-hidden group active:scale-95 ${isCurrent
                                            ? 'border border-white/5 text-white/20 cursor-default'
                                            : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/60 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                                            } disabled:opacity-30`}
                                    >
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-400" />
                                        <span className="relative z-10">{isCurrent ? 'ACTIVE' : processing ? '...' : 'INITIALIZE'}</span>
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-12 text-center">
                            <p className="text-white/20 font-mono text-[9px] uppercase tracking-widest">
                                &gt; SEARCHING_FOR_ACTIVE_SUBSCRIPTION_NODES...<br />
                                <span className="text-cyan-500/20">SYSTEM_READY · NO_TIERS_BROADCASTED</span>
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-[10px] text-center text-white/15 font-mono uppercase tracking-widest">
                    Billed monthly in USD · Cancel anytime
                </div>
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

export default SubscriptionManager;
