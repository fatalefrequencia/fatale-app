import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, X, AlertCircle, Check } from 'lucide-react';
import API from '../services/api';

const CreditTransferModal = ({ user, onClose, onRefresh, initialTargetId = '' }) => {
    const [targetId, setTargetId] = useState(initialTargetId);
    const [amount, setAmount] = useState('');
    const [status, setStatus] = useState('idle'); // idle, processing, success, error
    const [msg, setMsg] = useState('');

    const handleTransfer = async (e) => {
        e.preventDefault();
        if (!targetId || !amount) return;

        setStatus('processing');
        try {
            await API.Wallet.transferCredits(parseInt(targetId), parseInt(amount));
            setStatus('success');
            setMsg(`Successfully sent ${amount} credits!`);
            if (onRefresh) onRefresh();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setStatus('error');
            setMsg(err.response?.data || "Transfer failed");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-black/90 border-l-2 border-[#ff006e]/50 backdrop-blur-xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden group"
            >
                {/* Corner Accent */}
                <div className="absolute top-0 right-0 p-2 opacity-30">
                    <div className="w-12 h-0.5 bg-[#ff006e]/30 mb-1"></div>
                    <div className="w-6 h-0.5 bg-[#ff006e]/30 ml-auto"></div>
                </div>

                <button onClick={onClose} className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"><X size={18} /></button>

                <div className="mb-8 flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#ff006e]/10 flex items-center justify-center text-[#ff006e] rounded-lg border border-[#ff006e]/20">
                        <Send size={18} />
                    </div>
                    <div>
                        <h3
                            className="text-xl font-extrabold uppercase italic tracking-tight text-white"
                            style={{ transform: 'skewX(-2deg)' }}
                        >
                            Send_Credits
                        </h3>
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-mono">P2P_TRANSFER_NODE</p>
                    </div>
                </div>

                {status === 'success' ? (
                    <div className="text-center py-8 space-y-4">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/20"
                        >
                            <Check size={24} />
                        </motion.div>
                        <h4 className="text-white/80 font-mono text-sm uppercase tracking-widest">{msg}</h4>
                    </div>
                ) : (
                    <form onSubmit={handleTransfer} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-[#ff006e] uppercase tracking-widest ml-1">Recipient_ID</label>
                            <input
                                type="number"
                                value={targetId}
                                onChange={e => setTargetId(e.target.value)}
                                placeholder="Target System ID"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white text-sm font-bold outline-none focus:border-[#ff006e]/50 transition-colors placeholder:text-white/10"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-extrabold text-[#ff006e] uppercase tracking-widest ml-1">Transfer_Amount</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0.00"
                                max={user?.credits || 0}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white text-sm font-bold outline-none focus:border-[#ff006e]/50 transition-colors placeholder:text-white/10"
                            />
                            <div className="text-right text-[10px] text-white/20 font-mono uppercase tracking-widest pr-2">Balance: {user?.credits} CRD</div>
                        </div>

                        {status === 'error' && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500/80 text-[10px] font-mono uppercase tracking-widest"
                            >
                                <AlertCircle size={14} /> {msg}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'processing' || !amount || !targetId}
                            className="w-full py-4 bg-[#ff006e] text-black font-black uppercase tracking-widest text-xs rounded-lg hover:bg-white transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(255,0,110,0.2)]"
                        >
                            {status === 'processing' ? 'Processing...' : 'Execute_Transfer'}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default CreditTransferModal;
