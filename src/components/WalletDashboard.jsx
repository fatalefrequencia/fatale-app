import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowUpRight, ArrowDownLeft, Send, Activity } from 'lucide-react';
import API from '../services/api';
import CreditTransferModal from './CreditTransferModal';

const WalletDashboard = ({ user, onRefreshProfile, setActiveTab }) => {
    const [stats, setStats] = useState({ totalEarnings: 0, last30Days: 0 });
    const [recentTx, setRecentTx] = useState([]);
    const [showTransfer, setShowTransfer] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const earningsRes = await API.Wallet.getEarningsSummary();
                const eData = earningsRes.data || {};
                setStats({
                    totalEarnings: eData.totalEarnings !== undefined ? eData.totalEarnings : (eData.TotalEarnings || 0),
                    last30Days: eData.last30Days !== undefined ? eData.last30Days : (eData.Last30Days || 0)
                });

                const txRes = await API.Wallet.getTransactions(null, 5, 0);
                const txNormalized = (txRes.data?.data || txRes.data?.Data || []).map(tx => ({
                    ...tx,
                    id: tx.id || tx.Id,
                    amount: tx.amount !== undefined ? tx.amount : tx.Amount,
                    timestamp: tx.timestamp || tx.Timestamp,
                    description: tx.description || tx.Description,
                    type: tx.type || tx.Type
                }));
                setRecentTx(txNormalized);
            } catch (err) {
                console.error("Failed to load wallet dashboard data", err);
            }
        };
        fetchData();
    }, [user?.credits]);

    return (
        <div className="space-y-6">
            {/* Balance + Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Balance */}
                <div className="col-span-1 md:col-span-2 border-l-2 border-[#ff006e] bg-black/60 p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff006e]/5 blur-3xl pointer-events-none" />
                    <div className="text-[11px] font-black text-[#ff006e]/60 uppercase tracking-[0.3em] mb-3">// AVAILABLE_BALANCE</div>
                    <div className="flex items-baseline gap-3 mb-8">
                        <span className="text-6xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,0,110,0.4)]">
                            {user?.credits || 0}
                        </span>
                        <span className="text-base font-black text-white/20 uppercase tracking-widest">CRD</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setActiveTab('Depot')}
                            className="bg-[#ff006e] text-black px-6 py-3 font-black text-xs uppercase tracking-widest hover:bg-white transition-all"
                        >
                            BUY_CREDITS
                        </button>
                        <button
                            onClick={() => setShowTransfer(true)}
                            className="border border-white/10 text-white/60 px-6 py-3 font-black text-xs uppercase tracking-widest hover:border-white/40 hover:text-white transition-all flex items-center gap-2"
                        >
                            <Send size={12} /> TRANSFER
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                    <div
                        onClick={() => setActiveTab('Earnings')}
                        className="border border-[#ff006e]/10 bg-black/60 p-6 relative overflow-hidden cursor-pointer hover:border-[#ff006e]/30 transition-all group"
                    >
                        <div className="text-[11px] font-black text-white/30 uppercase tracking-[0.25em] mb-3 flex items-center justify-between">
                            <span>EARNINGS_(30D)</span>
                            <ArrowUpRight size={12} className="text-[#ff006e]/40 group-hover:text-[#ff006e] transition-colors" />
                        </div>
                        <div className="text-3xl font-black text-white tracking-tighter">
                            {stats.last30Days} <span className="text-xs text-white/20 font-black">CRD</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-[#ff006e]/10">
                            <div className="h-full bg-[#ff006e]/40 w-[40%]" />
                        </div>
                    </div>

                    <div className="border border-white/5 bg-black/60 p-6 relative overflow-hidden">
                        <div className="text-[11px] font-black text-white/30 uppercase tracking-[0.25em] mb-3 flex items-center justify-between">
                            <span>LIFETIME_EARNED</span>
                            <ArrowDownLeft size={12} className="text-white/10" />
                        </div>
                        <div className="text-3xl font-black text-white tracking-tighter">
                            {stats.totalEarnings} <span className="text-xs text-white/20 font-black">CRD</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="border border-white/5 bg-black/60 p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <div className="text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">// RECENT_ACTIVITY</div>
                    <button
                        onClick={() => setActiveTab('Transactions')}
                        className="text-[11px] text-[#ff006e]/60 font-black uppercase tracking-widest hover:text-[#ff006e] transition-colors flex items-center gap-1"
                    >
                        VIEW_ALL <ArrowRight size={10} />
                    </button>
                </div>

                <div className="space-y-0">
                    {recentTx.length > 0 ? (
                        recentTx.map(tx => (
                            <TransactionItem key={tx.id} tx={tx} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-white/20 text-xs uppercase font-mono tracking-widest">
                            &gt; NO_RECENT_TRANSACTIONS
                        </div>
                    )}
                </div>
            </div>

            {showTransfer && <CreditTransferModal user={user} onClose={() => setShowTransfer(false)} onRefresh={onRefreshProfile} />}
        </div>
    );
};

const TransactionItem = ({ tx }) => {
    const isPositive = tx.amount > 0;
    const date = new Date(tx.timestamp).toLocaleDateString();

    return (
        <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group px-2">
            <div className="flex items-center gap-4">
                <div className={`w-6 h-6 flex items-center justify-center ${isPositive ? 'text-[#ff006e]' : 'text-white/20'}`}>
                    {isPositive ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                </div>
                <div>
                    <div className="text-white/80 font-bold text-sm uppercase tracking-wide">{tx.description}</div>
                    <div className="text-[11px] text-white/20 font-mono uppercase tracking-widest">{date} · {tx.type?.replace('_', ' ')}</div>
                </div>
            </div>
            <div className={`font-mono font-black text-sm ${isPositive ? 'text-[#ff006e]' : 'text-white/30'}`}>
                {isPositive ? '+' : ''}{tx.amount}
            </div>
        </div>
    );
};

export default WalletDashboard;
