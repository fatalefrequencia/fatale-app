import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CreditCard, ArrowLeftRight, TrendingUp, Zap, History, DollarSign } from 'lucide-react';
import WalletDashboard from './WalletDashboard';
import TransactionHistory from './TransactionHistory';
import EarningsDashboard from './EarningsDashboard';

import Depot from './Depot';

const WalletView = ({ user, onRefreshProfile }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('Overview');

    return (
        <div className="w-full h-full flex flex-col bg-[#020202] text-white overflow-hidden relative">
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-fatale/5 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[150px] rounded-full" />
            </div>

            {/* Header */}
            <div className="p-4 md:p-8 pb-0 z-10">
                <div className="text-[10px] font-black text-fatale/50 uppercase tracking-[0.3em] font-mono mb-4 md:mb-6">// {t('SYSTEM_WALLET')}</div>
                <p className="text-white/30 text-[10px] md:text-[11px] font-mono uppercase tracking-widest max-w-xl">
                    {t('WALLET_DESC')}
                    <span className="text-fatale/50 ml-3">:: ENCRYPTED_v2.0</span>
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 md:px-8 mt-4 md:mt-8 border-b border-white/5 z-10 flex justify-start md:justify-center gap-4 md:gap-8 overflow-x-auto no-scrollbar whitespace-nowrap">
                <TabButton
                    label={t('OVERVIEW')}
                    icon={<Wallet size={16} />}
                    active={activeTab === 'Overview'}
                    onClick={() => setActiveTab('Overview')}
                />

                <TabButton
                    label={t('DEPOT')}
                    icon={<Zap size={16} />}
                    active={activeTab === 'Depot'}
                    onClick={() => setActiveTab('Depot')}
                />

                <TabButton
                    label={t('TRANSACTIONS') || 'Transactions'}
                    icon={<History size={16} />}
                    active={activeTab === 'Transactions'}
                    onClick={() => setActiveTab('Transactions')}
                />

                <TabButton
                    label={t('EARNINGS') || 'Earnings'}
                    icon={<DollarSign size={16} />}
                    active={activeTab === 'Earnings'}
                    onClick={() => setActiveTab('Earnings')}
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 z-10">
                <AnimatePresence mode="wait">
                    {activeTab === 'Overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-7xl mx-auto space-y-8"
                        >
                            <WalletDashboard user={user} onRefreshProfile={onRefreshProfile} setActiveTab={setActiveTab} />
                        </motion.div>
                    )}

                    {activeTab === 'Transactions' && (
                        <motion.div
                            key="transactions"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-6xl mx-auto h-full"
                        >
                            <TransactionHistory user={user} onBack={() => setActiveTab('Overview')} />
                        </motion.div>
                    )}

                    {activeTab === 'Earnings' && (
                        <motion.div
                            key="earnings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-6xl mx-auto"
                        >
                            <EarningsDashboard user={user} onBack={() => setActiveTab('Overview')} />
                        </motion.div>
                    )}

                    {activeTab === 'Depot' && (
                        <motion.div
                            key="depot"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full"
                        >
                            <Depot user={user} refreshProfile={onRefreshProfile} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const TabButton = ({ label, icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`pb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all relative ${active ? 'text-fatale' : 'text-white/30 hover:text-white'
            }`}
    >
        {icon}
        {label}
        {active && (
            <motion.div
                layoutId="activeTabWallet"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-fatale shadow-[0_0_10px_rgb(var(--theme-primary))]"
            />
        )}
    </button>
);

export default WalletView;
