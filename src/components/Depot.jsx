import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Shield, Database, Wifi } from 'lucide-react';
import CreditPurchase from './CreditPurchase';
import SubscriptionManager from './SubscriptionManager';

const Depot = ({ user, refreshProfile }) => {
    const [activeSection, setActiveSection] = useState('CREDITS'); // 'CREDITS' or 'ACCESS'

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-6">
                <div>
                    <div className="text-[10px] font-black text-[#ff006e]/50 uppercase tracking-[0.3em] font-mono mb-4">// THE_DEPOT</div>
                    <p className="text-[11px] text-white/30 font-mono uppercase tracking-widest max-w-lg">
                        Secure exchange &amp; system upgrades
                        <span className="text-white/15 ml-3">::: AUTH_ID: {user?.id || 'GUEST'}</span>
                    </p>
                </div>

                {/* Flat terminal tab switcher */}
                <div className="flex border-b border-white/10 relative">
                    <button
                        onClick={() => setActiveSection('CREDITS')}
                        className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSection === 'CREDITS' ? 'text-[#ff006e]' : 'text-white/30 hover:text-white'
                            }`}
                    >
                        <Skull size={13} /> CREDITS
                        {activeSection === 'CREDITS' && (
                            <motion.div layoutId="depotSwitch" className="absolute bottom-0 left-0 right-0 h-px bg-[#ff006e] shadow-[0_0_8px_#ff006e]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveSection('ACCESS')}
                        className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSection === 'ACCESS' ? 'text-cyan-400' : 'text-white/30 hover:text-white'
                            }`}
                    >
                        <Shield size={13} /> ROOT_ACCESS
                        {activeSection === 'ACCESS' && (
                            <motion.div layoutId="depotSwitch" className="absolute bottom-0 left-0 right-0 h-px bg-cyan-400 shadow-[0_0_8px_rgb(34,211,238)]" />
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeSection === 'CREDITS' && (
                    <motion.div
                        key="credits"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <CreditPurchase user={user} refreshProfile={refreshProfile} />
                    </motion.div>
                )}

                {activeSection === 'ACCESS' && (
                    <motion.div
                        key="access"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <SubscriptionManager user={user} refreshProfile={refreshProfile} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Depot;
