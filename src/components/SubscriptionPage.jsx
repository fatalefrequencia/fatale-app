import React from 'react';
import SubscriptionManager from './SubscriptionManager';
import CreditPurchase from './CreditPurchase';
import { Zap, Heart, ShieldCheck } from 'lucide-react';

const SubscriptionPage = ({ user, onRefreshProfile }) => {
    return (
        <div className="w-full h-full p-6 md:p-12 overflow-y-auto custom-scrollbar bg-black">
            {/* Background Ambience - Clean Dark */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-green-900/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto space-y-10 pb-24">

                {/* Header Section - Minimal & Brutalist */}
                <div className="text-center space-y-8 pt-12 pb-8">
                    <div className="relative inline-block">
                        <h1 className="text-4xl md:text-6xl font-black uppercase italic leading-none overflow-visible tracking-[0.2em] px-12 flex justify-center items-center gap-4 [transform:skewX(-12deg)]">
                            <span className="text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.4)] [text-shadow:0_0_20px_rgba(255,0,110,0.3)] py-2 pr-2">
                                PREMIUM
                            </span>
                            <span className="text-white drop-shadow-[0_0_10px_rgba(255,0,110,0.4)] [text-shadow:0_0_20px_rgba(147,51,234,0.3)] py-2 pr-4">
                                ACCESS
                            </span>
                        </h1>
                        {/* Artisanal Underline */}
                        <div className="absolute -bottom-2 left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-[#10b981] via-[#ff006e] to-transparent opacity-50 blur-[1px]"></div>
                        <div className="absolute -bottom-2 left-24 right-24 h-[1px] bg-white opacity-30 shadow-[0_0_8px_white]"></div>
                    </div>

                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-purple-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <div className="relative px-6 py-2 border border-white/10 bg-white/5 backdrop-blur-xl rounded-sm overflow-hidden flex items-center gap-4">
                                <div className="absolute left-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#10b981] to-transparent"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]"></div>
                                <p className="text-[10px] md:text-xs font-bold font-mono text-gray-400 uppercase tracking-[0.15em] leading-relaxed">
                                    Unlock offline listening, support artists with zero fees, and upgrade your sonic arsenal.
                                </p>
                                <div className="hidden md:block px-1.5 py-0.5 border border-white/20 text-[8px] text-white/40 rounded uppercase font-black">v1.0.4</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Manager - Floating Glass Card */}
                <div className="relative">
                    {/* Subtle Glow behind */}
                    <div className="absolute inset-x-0 -top-10 -bottom-10 bg-[#ff006e]/5 blur-3xl rounded-full opacity-50"></div>

                    <div className="relative">
                        <SubscriptionManager user={user} refreshProfile={onRefreshProfile} />
                    </div>
                </div>

                {/* Cinematic Divider */}
                <div className="relative py-8">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-dashed border-white/20"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <div className="bg-black px-6 py-2 border border-white/20 rounded-none flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,0,0.1)]">
                            <span className="text-[#ff006e] font-mono font-bold text-xs">{`>>>`}</span>
                            <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase font-mono">
                                DIRECT_ARTIST_UPLINK
                            </span>
                            <span className="text-[#ff006e] font-mono font-bold text-xs">{`<<<`}</span>
                        </div>
                    </div>
                </div>

                {/* Credit Purchase - Clean Integration */}
                <div id="credits" className="relative">
                    <CreditPurchase user={user} refreshProfile={onRefreshProfile} />
                </div>

                {/* Trusted Footer */}
                <div className="flex justify-center items-center gap-2 text-white/20 text-[10px] font-mono uppercase tracking-widest pt-12">
                    <ShieldCheck size={12} />
                    <span>Secure // Encrypted // Verified</span>
                </div>

            </div>
        </div>
    );
};

export default SubscriptionPage;
