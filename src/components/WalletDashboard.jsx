import React, { useState, useEffect } from 'react';
import { CreditCard, ArrowRight, ArrowUpRight, ArrowDownLeft, Send } from 'lucide-react';
import API from '../services/api';
import CreditTransferModal from './CreditTransferModal';

const WalletDashboard = ({ user, onRefreshProfile, setActiveTab }) => {
    const [stats, setStats] = useState({ totalEarnings: 0, last30Days: 0 });
    const [recentTx, setRecentTx] = useState([]);
    const [showTransfer, setShowTransfer] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch basic earnings stats for the dashboard cards
                const earningsRes = await API.Wallet.getEarningsSummary();
                const eData = earningsRes.data || {};
                setStats({
                    totalEarnings: eData.totalEarnings !== undefined ? eData.totalEarnings : (eData.TotalEarnings || 0),
                    last30Days: eData.last30Days !== undefined ? eData.last30Days : (eData.Last30Days || 0)
                });

                // Fetch recent transactions
                const txRes = await API.Wallet.getTransactions(null, 5, 0); // Limit 5
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
    }, [user?.credits]); // Refresh when credits change

    return (
        <div className="space-y-6">
            {/* Balance Card Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Balance Card */}
                <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-[#ff006e]/20 to-black border border-[#ff006e]/30 rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute right-[-20px] top-[-20px] w-64 h-64 bg-[#ff006e]/10 rounded-full blur-3xl group-hover:bg-[#ff006e]/20 transition-all duration-700" />

                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[180px]">
                        <div>
                            <h3 className="text-[#ff006e] text-xs font-black uppercase tracking-widest mb-2">Available Balance</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,0,110,0.5)]">
                                    {user?.credits || 0}
                                </span>
                                <span className="text-xl font-bold text-white/40">CRD</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-8">
                            <button
                                onClick={() => setActiveTab('Depot')}
                                className="bg-[#ff006e] text-black px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-white transition-all shadow-[0_0_20px_rgba(255,0,110,0.3)]"
                            >
                                Buy Credits
                            </button>
                            <button
                                onClick={() => setShowTransfer(true)}
                                className="bg-white/10 text-white border border-white/10 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-white/20 transition-all flex items-center gap-2"
                            >
                                <Send size={14} /> Transfer
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Column */}
                <div className="space-y-6">
                    {/* Monthly Earnings Card */}
                    <div
                        onClick={() => setActiveTab('Earnings')}
                        className="bg-[#0a0a0a] border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><ArrowUpRight size={20} /></div>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-black group-hover:text-emerald-500 transition-colors">Earnings (30d)</span>
                        </div>
                        <div className="text-3xl font-black text-white">{stats.last30Days} <span className="text-sm text-white/20">CRD</span></div>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/20">
                            <div className="h-full bg-emerald-500 w-[40%] shadow-[0_0_10px_#10b981]" />
                        </div>
                    </div>

                    {/* Pending/Spent Card */}
                    <div className="bg-[#0a0a0a] border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><ArrowDownLeft size={20} /></div>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-black">Lifetime Earned</span>
                        </div>
                        <div className="text-3xl font-black text-white">{stats.totalEarnings} <span className="text-sm text-white/20">CRD</span></div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 md:p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Recent Activity</h3>
                    <button
                        onClick={() => setActiveTab('Transactions')}
                        className="text-xs text-[#ff006e] font-bold uppercase hover:text-white transition-colors flex items-center gap-1"
                    >
                        View All <ArrowRight size={14} />
                    </button>
                </div>

                <div className="space-y-1">
                    {recentTx.length > 0 ? (
                        recentTx.map(tx => (
                            <TransactionItem key={tx.id} tx={tx} />
                        ))
                    ) : (
                        <div className="text-center py-8 text-white/20 text-xs uppercase font-mono">No recent transactions</div>
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
        <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors group border-b border-white/5 last:border-0">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${isPositive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/10 text-white/60'
                    }`}>
                    {isPositive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div>
                    <div className="text-white font-bold text-sm">{tx.description}</div>
                    <div className="text-xs text-white/30 font-mono uppercase">{date} • {tx.type.replace('_', ' ')}</div>
                </div>
            </div>
            <div className={`font-mono font-bold ${isPositive ? 'text-emerald-500' : 'text-white/60'}`}>
                {isPositive ? '+' : ''}{tx.amount}
            </div>
        </div>
    );
};

export default WalletDashboard;
