import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import API from '../services/api';
import { Zap } from 'lucide-react';
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

    if (loading) return <div className="text-white">Loading subscription details...</div>;

    return (
        <div className="bg-black/80 p-6 md:p-8 border-l-2 border-[#10b981]/50 relative overflow-hidden group">
            {/* Corner Accents */}
            <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-1 bg-[#10b981]/20 mb-1"></div>
                <div className="w-8 h-1 bg-[#10b981]/20 ml-auto"></div>
            </div>

            <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-10 h-10">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-8 h-8 text-[#10b981] drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                        >
                            <motion.path
                                d="M12 20h.01"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0 }}
                            />
                            <motion.path
                                d="M8.5 16.429a5 5 0 0 1 7 0"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.3 }}
                            />
                            <motion.path
                                d="M5 12.859a10 10 0 0 1 14 0"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.6 }}
                            />
                            <motion.path
                                d="M2 8.82a15 15 0 0 1 20 0"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.9 }}
                            />
                        </svg>
                    </div>
                    YouTube Offline Cache
                    {status?.isActive && (
                        <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded-sm font-black tracking-tighter italic ml-2">ACTIVE_NODE</span>
                    )}
                </h2>

                {/* Current Status / Info */}
                {status?.isActive ? (
                    <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div>
                                <div className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-1">Current Plan</div>
                                <div className="text-xl font-bold text-white italic uppercase tracking-tighter">{status.tierName}</div>
                                <div className="text-xs text-white/40 mt-1 font-mono">NEXT_RENEWAL: {new Date(status.currentPeriodEnd).toLocaleDateString()}</div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end text-sm">
                                    <span className="text-gray-400">Cache Usage</span>
                                    <span className="text-white">
                                        {status.cacheUsed} / {status.cacheLimit === -1 ? '∞' : status.cacheLimit}
                                    </span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${status.cacheLimit === -1 ?
                                                (status.cacheUsed > 0 ? 100 : 0) :
                                                Math.min(100, (status.cacheUsed / status.cacheLimit) * 100)}%`
                                        }}
                                        className="bg-[#10b981] h-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-200 text-sm">
                        Subscribe to cache your favorite YouTube tracks for offline listening.
                        Artists still get paid via credit purchases regardless of your subscription status.
                    </div>
                )}

                {/* Tiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {tiers && tiers.length > 0 ? (
                        tiers.map(tier => {
                            const isCurrent = status?.tier === tier.id;
                            return (
                                <motion.div
                                    key={tier.id}
                                    whileHover={!isCurrent ? { y: -5, scale: 1.02 } : {}}
                                    className={`relative p-5 rounded-xl border flex flex-col ${isCurrent
                                        ? 'bg-emerald-900/20 border-[#10b981]'
                                        : 'bg-zinc-800/50 border-white/5 hover:border-white/20'
                                        } transition-all duration-300`}
                                >
                                    {tier.id === 2 && !isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg whitespace-nowrap uppercase tracking-widest">
                                            Recommended
                                        </div>
                                    )}

                                    <div className="text-lg font-bold text-white mb-1 uppercase tracking-tighter">{tier.name}</div>
                                    <div className="text-2xl font-black text-emerald-400 mb-4 italic tracking-tighter">
                                        ${tier.price}<span className="text-sm text-gray-500 font-normal ml-1">/mo</span>
                                    </div>

                                    <ul className="text-sm text-gray-400 space-y-2 mb-6 flex-1">
                                        <li className="flex items-center gap-2">
                                            <span className="text-emerald-500 text-xs">✓</span>
                                            {tier.cacheLimit === -1 ? 'Unlimited' : tier.cacheLimit} cached tracks
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-emerald-500 text-xs">✓</span>
                                            Offline playback
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-emerald-500 text-xs">✓</span>
                                            High-quality audio
                                        </li>
                                    </ul>

                                    <button
                                        onClick={() => handleSubscribe(tier.id)}
                                        disabled={isCurrent || processing}
                                        className={`w-full py-2 rounded-lg font-bold text-sm transition-all ${isCurrent
                                            ? 'bg-white/10 text-gray-400 cursor-default shadow-none border-none'
                                            : 'bg-white text-black hover:bg-gray-200 active:scale-95 shadow-lg'
                                            } disabled:opacity-50`}
                                    >
                                        {isCurrent ? 'Current Plan' : processing ? '...' : 'Subscribe'}
                                    </button>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-12 text-center">
                            <p className="text-white/20 font-mono text-xs uppercase tracking-widest">
                                &gt; Searching for active subscription nodes... <br />
                                <span className="text-[#10b981]/40">System ready. No tiers broadcasted.</span>
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-center text-gray-600">
                    <p className="text-xs">
                        Subscriptions are billed monthly in USD. Cancel anytime.
                    </p>
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
