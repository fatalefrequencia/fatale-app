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
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-2 flex items-center gap-3">
                        The <span className="text-[#ff006e]">Depot</span>
                    </h2>
                    <p className="text-xs text-white/40 font-mono uppercase tracking-widest max-w-lg">
                        Secure Exchange & System Upgrades. <br />
                        <span className="text-white/20">Authorized Personnel Only. ID: {user?.id || 'GUEST'}</span>
                    </p>
                </div>

                {/* Switcher */}
                <div className="bg-black border border-white/10 p-1 rounded-full flex relative w-full md:w-auto">
                    <button
                        onClick={() => setActiveSection('CREDITS')}
                        className={`flex-1 md:w-40 py-2 px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 ${activeSection === 'CREDITS' ? 'text-black' : 'text-white/40 hover:text-white'
                            }`}
                    >
                        <Skull size={14} /> Credits
                    </button>
                    <button
                        onClick={() => setActiveSection('ACCESS')}
                        className={`flex-1 md:w-40 py-2 px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all relative z-10 flex items-center justify-center gap-2 ${activeSection === 'ACCESS' ? 'text-black' : 'text-white/40 hover:text-white'
                            }`}
                    >
                        <Shield size={14} /> Root Access
                    </button>

                    {/* Sliding Background */}
                    <motion.div
                        layoutId="depotSwitch"
                        className={`absolute top-1 bottom-1 rounded-full shadow-lg ${activeSection === 'CREDITS' ? 'bg-[#ff006e] left-1 w-[calc(50%-4px)] md:w-40' : 'bg-[#8b5cf6] left-[calc(50%+2px)] md:left-[166px] w-[calc(50%-4px)] md:w-40'
                            }`}
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
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
