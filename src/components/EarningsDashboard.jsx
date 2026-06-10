import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Music, Gift, ArrowDown, ArrowDownLeft, X, Landmark, RefreshCw } from 'lucide-react';
import API from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import ActionModal from './ActionModal';

const EarningsDashboard = ({ user, onBack }) => {
    const { showNotification } = useNotification();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [showWiseModal, setShowWiseModal] = useState(false);

    // Wise simulated bank transfer states
    const [withdrawAmount, setWithdrawAmount] = useState('500');
    const [recipientName, setRecipientName] = useState(user?.username?.toUpperCase() || 'NEURAL_USER');
    const [bankName, setBankName] = useState('WISE BANCO DE RECEPTACIÓN');
    const [accountNumber, setAccountNumber] = useState('ES42 1234 5678 9012 3456');
    const [swiftCode, setSwiftCode] = useState('WISEES2X');

    useEffect(() => {
        fetchEarnings();
    }, [user]);

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

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        const amountInt = parseInt(withdrawAmount, 10);
        if (isNaN(amountInt) || amountInt <= 0) {
            showNotification("INVALID_AMOUNT", "Please specify a positive credit amount.", "error");
            return;
        }

        if (amountInt < 500) {
            showNotification("MINIMUM_PAYOUT", "Minimum payout request is 500 Credits ($50.00 USD).", "error");
            return;
        }

        setIsWithdrawing(true);
        try {
            const res = await API.Wallet.requestWithdrawal(amountInt, 'Wise Transfer');
            showNotification("PAYOUT_SIGNAL", `Wise request queued successfully! Sent $${(amountInt * 0.1).toFixed(2)} USD to ${bankName}.`, "success");
            setShowWiseModal(false);
            fetchEarnings(); // Refresh balance stats
        } catch (err) {
            showNotification("PAYOUT_FAILURE", err.response?.data?.message || err.response?.data || "Withdrawal failed", "error");
        } finally {
            setIsWithdrawing(false);
        }
    };

    if (loading) return <div className="p-10 text-center text-white/20 animate-pulse text-xs uppercase font-mono">Loading Financial Data...</div>;

    const hasEarnings = stats?.totalEarnings > 0;
    const withdrawAmountInt = parseInt(withdrawAmount, 10) || 0;
    const valueUSD = (withdrawAmountInt * 0.10).toFixed(2);
    const wiseFee = 1.50;
    const finalAmountUSD = Math.max(0, parseFloat(valueUSD) - wiseFee).toFixed(2);

    return (
        <div className="space-y-8 pb-20 font-mono text-white">
            {/* Header */}
            <div>
                <div className="flex items-center gap-4 mb-2">
                    {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 hover:bg-[#ff006e]/10 rounded-full transition-colors group">
                            <ArrowDownLeft size={24} className="rotate-45 text-[#ff006e]/60 group-hover:text-[#ff006e]" />
                        </button>
                    )}
                    <div className="text-[10px] font-black text-[#ff006e]/50 uppercase tracking-[0.25em] font-mono">// MY_EARNINGS</div>
                </div>
                <p className="text-xs text-white/40 uppercase tracking-widest pl-1">
                    {hasEarnings ? 'Track your revenue from sales and tips.' : 'Start uploading music to earn credits.'}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#050505] border border-emerald-500/20 rounded-sm p-8 relative overflow-hidden">
                    <div className="absolute right-[-20px] top-[-20px] w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl z-0" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-sm"><DollarSign size={20} /></div>
                            <span className="text-[10px] text-white/40 uppercase font-black tracking-widest">Total Revenue</span>
                        </div>
                        <div className="text-5xl font-black text-white tracking-tight">{stats?.totalEarnings || 0} <span className="text-lg text-white/20">CRD</span></div>
                    </div>
                </div>

                <div className="bg-[#050505] border border-white/5 rounded-sm p-8 flex flex-col justify-center gap-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-sm"><Music size={16} /></div>
                            <span className="text-xs font-bold text-white uppercase tracking-wide">Track Sales</span>
                        </div>
                        <span className="font-mono font-bold text-white">{stats?.breakdown?.sales || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-500/10 text-pink-500 rounded-sm"><Gift size={16} /></div>
                            <span className="text-xs font-bold text-white uppercase tracking-wide">Tips Received</span>
                        </div>
                        <span className="font-mono font-bold text-white">{stats?.breakdown?.tips || 0}</span>
                    </div>
                </div>

                <div className="bg-[#050505] border border-white/5 rounded-sm p-8 flex flex-col justify-center items-center text-center gap-4">
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
            <div className="bg-[#050505] border border-white/5 rounded-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-lg font-black uppercase text-white italic tracking-tighter">Wise Payouts</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest max-w-sm mt-2">
                        Withdraw your accumulated artist credits directly to your bank account via Wise. Minimum withdrawal: 500 CRD.
                    </p>
                </div>
                <button
                    onClick={() => setShowWiseModal(true)}
                    disabled={!hasEarnings}
                    className="px-8 py-4 bg-[#ff006e] text-black font-black uppercase tracking-widest rounded-sm hover:bg-white transition-all disabled:opacity-30 flex items-center gap-2 shadow-[0_0_15px_rgba(255,0,110,0.25)]"
                >
                    Request Payout <ArrowDown size={16} />
                </button>
            </div>

            {/* Custom Wise Simulated Withdrawal dialog */}
            <AnimatePresence>
            {showWiseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 15 }}
                        className="w-full max-w-md bg-[#050505] border border-[#ff006e]/30 relative overflow-hidden shadow-[0_0_50px_rgba(255,0,110,0.25)] rounded-sm"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b border-white/5 bg-black">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff006e] flex items-center gap-2">
                                <Landmark size={14} className="text-[#ff006e]" />
                                WISE_REVENUE_RETRIEVAL
                            </div>
                            <button
                                onClick={() => setShowWiseModal(false)}
                                className="text-white/40 hover:text-[#ff006e] transition-all hover:rotate-90 p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[8px] text-white/40 uppercase tracking-widest">Withdrawal Amount (Credits)</label>
                                    <input
                                        type="number"
                                        min="500"
                                        required
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 focus:border-[#ff006e] outline-none text-[10px] text-white px-3 py-3 rounded-sm tracking-wider"
                                    />
                                    <div className="text-[8px] text-white/20 uppercase tracking-wide">Minimum: 500 Credits</div>
                                </div>

                                <div className="p-4 bg-black border border-white/5 space-y-2">
                                    <div className="flex justify-between text-[9px] uppercase tracking-wider">
                                        <span className="text-white/40">Gross Payout Value:</span>
                                        <span className="font-bold">${valueUSD} USD</span>
                                    </div>
                                    <div className="flex justify-between text-[9px] uppercase tracking-wider">
                                        <span className="text-white/40">Wise Transfer Fee:</span>
                                        <span className="font-bold text-white/50">${wiseFee.toFixed(2)} USD</span>
                                    </div>
                                    <div className="h-px bg-white/5 my-2" />
                                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-black text-[#00ffff]">
                                        <span>Estimated Received:</span>
                                        <span>${finalAmountUSD} USD</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[8px] text-white/40 uppercase tracking-widest">Account Holder Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value.toUpperCase())}
                                        className="w-full bg-white/5 border border-white/10 focus:border-[#ff006e] outline-none text-[10px] text-white px-3 py-3 rounded-sm uppercase tracking-wider"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[8px] text-white/40 uppercase tracking-widest">Bank Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 focus:border-[#ff006e] outline-none text-[10px] text-white px-3 py-3 rounded-sm tracking-wider"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[8px] text-white/40 uppercase tracking-widest">IBAN / Account Number</label>
                                        <input
                                            type="text"
                                            required
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-[#ff006e] outline-none text-[10px] text-white px-3 py-3 rounded-sm tracking-wider"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[8px] text-white/40 uppercase tracking-widest">SWIFT / BIC Code</label>
                                        <input
                                            type="text"
                                            required
                                            value={swiftCode}
                                            onChange={(e) => setSwiftCode(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-[#ff006e] outline-none text-[10px] text-white px-3 py-3 rounded-sm tracking-wider"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowWiseModal(false)}
                                    disabled={isWithdrawing}
                                    className="w-1/3 py-3 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 text-white/70 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isWithdrawing || withdrawAmountInt < 500}
                                    className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-[#ff006e] text-black hover:bg-white transition-all shadow-[0_0_15px_rgba(255,0,110,0.3)] disabled:opacity-50"
                                >
                                    {isWithdrawing ? 'PROCESSING...' : 'DISPATCH PAYOUT'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default EarningsDashboard;
