import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowDownLeft, ArrowUpRight, Download } from 'lucide-react';
import API from '../services/api';

const TransactionHistory = ({ user, onBack }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('ALL');
    const [search, setSearch] = useState('');

    // ... (rest of state) ...
    // Pagination
    const [page, setPage] = useState(0);
    const limit = 20;
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadTransactions(0, true);
    }, [filterType, user]); // Reload on filter change

    const loadTransactions = async (offset, reset = false) => {
        if (reset) setLoading(true);
        try {
            const res = await API.Wallet.getTransactions(filterType === 'ALL' ? '' : filterType, limit, offset);
            const newData = res.data.data || [];

            if (reset) {
                setTransactions(newData);
            } else {
                setTransactions(prev => [...prev, ...newData]);
            }

            setHasMore(newData.length === limit);
        } catch (err) {
            console.error("Failed to load transactions", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadTransactions(nextPage * limit);
    };

    const filteredTx = transactions.filter(tx =>
        tx.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl h-full flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors group">
                            <ArrowDownLeft size={20} className="rotate-45 text-white/40 group-hover:text-white" />
                        </button>
                    )}
                    <h2 className="text-xl font-black uppercase italic text-white tracking-widest">History</h2>
                    <div className="h-4 w-[1px] bg-white/20" />
                    <div className="flex gap-2">
                        {['ALL', 'PURCHASE', 'DEPOSIT', 'TIP_SENT', 'EARNING_SALE'].map(type => (
                            <button
                                key={type}
                                onClick={() => { setFilterType(type); setPage(0); }}
                                className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold transition-all border ${filterType === type
                                    ? 'bg-white text-black border-white'
                                    : 'bg-transparent text-white/40 border-white/10 hover:border-white/30'
                                    }`}
                            >
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-black border border-white/10 rounded-full pl-10 pr-4 py-2 text-xs text-white focus:border-[#ff006e] outline-none w-40 focus:w-60 transition-all font-mono"
                        />
                    </div>
                    <button className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {loading ? (
                    <div className="p-10 text-center text-white/20 animate-pulse text-xs uppercase">Decryption in progress...</div>
                ) : filteredTx.length === 0 ? (
                    <div className="p-10 text-center text-white/20 text-xs uppercase font-mono">No transactions found matching criteria.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-[10px] text-white/40 uppercase font-black tracking-widest sticky top-0 backdrop-blur-md">
                            <tr>
                                <th className="p-4 pl-8">Type</th>
                                <th className="p-4">Description</th>
                                <th className="p-4">Date</th>
                                <th className="p-4 text-right pr-8">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTx.map(tx => (
                                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4 pl-8">
                                        <span className={`inline-flex items-center gap-2 text-[10px] font-bold px-2 py-1 rounded uppercase ${tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-white/50'
                                            }`}>
                                            {tx.type.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm font-bold text-white/90 group-hover:text-[#ff006e] transition-colors">
                                        {tx.description}
                                    </td>
                                    <td className="p-4 text-xs text-white/40 font-mono">
                                        {new Date(tx.timestamp).toLocaleString()}
                                    </td>
                                    <td className={`p-4 pr-8 text-right font-mono font-bold ${tx.amount > 0 ? 'text-emerald-500' : 'text-white/60'}`}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount} CRD
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {hasMore && !loading && (
                    <div className="p-4 text-center border-t border-white/5">
                        <button
                            onClick={handleLoadMore}
                            className="text-white/40 hover:text-white text-xs uppercase font-bold tracking-widest transition-colors"
                        >
                            Load More Records
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TransactionHistory;
