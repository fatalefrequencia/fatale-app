import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Music, Gift, ArrowDown, ArrowDownLeft } from 'lucide-react';
import API from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

const EarningsDashboard = ({ user, onBack }) => {
    const { showNotification } = useNotification();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    useEffect(() => {
        const fetchEarnings = async () => {
            try {
                const res = await API.Wallet.getEarningsSummary();
                setStats(res.data);
            } catch (err) {
                console.error("Failed to load earnings", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEarnings();
    }, [user]);

    const handleWithdraw = async () => {
        const amount = prompt("Enter amount to withdraw (CRD):");
        if (!amount) return;

        setIsWithdrawing(true);
        try {
            const res = await API.Wallet.requestWithdrawal(parseInt(amount), 'Stripe');
            showNotification("PAYOUT_SIGNAL", res.data.message, "success");
        } catch (err) {
            showNotification("PAYOUT_FAILURE", err.response?.data || "Withdrawal failed", "error");
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-white/20 animate-pulse text-xs uppercase">Loading Financial Data...</div>;

    const hasEarnings = stats?.totalEarnings > 0;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div>
                <div className="flex items-center gap-4 mb-2">
                    {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors group">
                            <ArrowDownLeft size={24} className="rotate-45 text-white/40 group-hover:text-white" />
                        </button>
                    )}
                    <h2 className="text-3xl font-black uppercase italic text-white tracking-widest">My Earnings</h2>
                </div>
                <p className="text-xs text-white/40 uppercase tracking-widest pl-1">
                    {hasEarnings ? 'Track your revenue from sales and tips.' : 'Start uploading music to earn credits.'}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#0a0a0a] border border-emerald-500/20 rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl z-0" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg"><DollarSign size={20} /></div>
                            <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">Total Revenue</span>
                        </div>
                        <div className="text-5xl font-black text-white tracking-tight">{stats?.totalEarnings || 0} <span className="text-lg text-white/20">CRD</span></div>
                    </div>
                </div>

                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col justify-center gap-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Music size={16} /></div>
                            <span className="text-xs font-bold text-white uppercase tracking-wide">Track Sales</span>
                        </div>
                        <span className="font-mono font-bold text-white">{stats?.breakdown?.sales || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg"><Gift size={16} /></div>
                            <span className="text-xs font-bold text-white uppercase tracking-wide">Tips Received</span>
                        </div>
                        <span className="font-mono font-bold text-white">{stats?.breakdown?.tips || 0}</span>
                    </div>
                </div>

                <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col justify-center items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 mb-2">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-white/40 uppercase tracking-widest font-black mb-1">Last 30 Days</div>
                        <div className="text-2xl font-black text-white">+{stats?.last30Days || 0} CRD</div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-lg font-black uppercase text-white italic tracking-tighter">Payouts</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest max-w-sm mt-2">
                        Withdraw your earnings to your linked bank account via Stripe. Minimum withdrawal: 500 CRD.
                    </p>
                </div>
                <button
                    onClick={handleWithdraw}
                    disabled={!hasEarnings || isWithdrawing}
                    className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 disabled:bg-white/10 disabled:text-white/40 flex items-center gap-2"
                >
                    {isWithdrawing ? 'Processing...' : 'Request Payout'} <ArrowDown size={16} />
                </button>
            </div>
        </div>
    );
};

export default EarningsDashboard;
