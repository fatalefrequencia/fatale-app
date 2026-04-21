import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Users, Zap, Globe, Shield, Star, MoveLeft, MessageSquare } from 'lucide-react';
import API from '../../services/api';
import { SECTORS, getMediaUrl } from '../../constants';

const CommunityTerminal = ({ community, user, onBack, sectorColor }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const lastTickRef = useRef(0);
    const chatEndRef = useRef(null);
    const pollRef = useRef(null);

    const isJoined = (user?.communityId || user?.CommunityId) === community.id;
    const color = sectorColor || community.color || '#ff006e';

    const fetchMessages = useCallback(async (afterId = null) => {
        if (!community?.id) return;
        try {
            const res = await API.CommunityChat.getMessages(community.id, afterId);
            const newMsgs = Array.isArray(res.data) ? res.data : [];
            
            if (newMsgs.length > 0) {
                const maxId = Math.max(...newMsgs.map(m => m.id));
                lastTickRef.current = Math.max(lastTickRef.current, maxId);

                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const fresh = newMsgs.filter(m => !existingIds.has(m.id));
                    if (fresh.length === 0) return prev;
                    return [...prev, ...fresh].sort((a,b) => new Date(a.sentAt) - new Date(b.sentAt));
                });
            }
        } catch (e) {
            console.error('[TERMINAL_FETCH_ERROR]', e);
        }
    }, [community?.id]);

    useEffect(() => {
        fetchMessages();
        pollRef.current = setInterval(() => fetchMessages(lastTickRef.current), 4000);
        return () => clearInterval(pollRef.current);
    }, [fetchMessages]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        setSending(true);
        const text = newMessage.trim();
        setNewMessage('');
        try {
            await API.CommunityChat.sendMessage(community.id, text);
            fetchMessages(lastTickRef.current);
        } catch (e) {
            console.error('[TERMINAL_SEND_ERROR]', e);
            setNewMessage(text);
        } finally {
            setSending(true); // briefly keep sending state for visual feedback
            setTimeout(() => setSending(false), 500);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full h-full flex flex-col bg-black/40 border border-white/10 relative overflow-hidden backdrop-blur-xl"
            style={{ borderColor: `${color}30` }}
        >
            {/* Header / Nav Section */}
            <div className="flex-none flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105"
                    style={{ color }}
                >
                    <MoveLeft size={14} />
                    BACK_TO_ORBIT
                </button>
                <div className="flex items-center gap-2">
                    <div className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[120px] text-right">{community.name}</div>
                    {isJoined && <Star size={10} className="text-yellow-400 fill-yellow-400" />}
                </div>
            </div>

            {/* Matrix Data Strip */}
            <div className="flex-none bg-black/60 px-4 py-2 border-b border-white/5 flex items-center justify-between text-[8px] mono text-white/30 uppercase tracking-[0.2em]">
                 <div className="flex items-center gap-4">
                    <span>ID: {community.id?.toString(16).toUpperCase()}</span>
                    <span>SEC: {community.sectorId}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                    <span style={{ color }}>LINK_STABLE</span>
                 </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-2">
                        <MessageSquare size={24} />
                        <div className="text-[8px] uppercase tracking-[0.3em]">No incoming transmissions</div>
                    </div>
                ) : (
                    messages.map((m, i) => (
                        <div key={m.id || i} className={`flex flex-col ${m.userId === (user?.id || user?.Id) ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[8px] font-black uppercase tracking-tight" style={{ color: m.themeColor || color }}>{m.username}</span>
                                <span className="text-[7px] opacity-20 mono">{new Date(m.sentAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div 
                                className="px-3 py-2 text-[10px] bg-white/[0.03] border border-white/5 rounded-sm max-w-[90%] leading-relaxed"
                                style={{ borderLeftColor: m.themeColor || color, borderLeftWidth: '2px' }}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Overlay */}
            <form onSubmit={handleSend} className="flex-none p-4 bg-black/80 border-t border-white/10 flex items-center gap-3">
                <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value.slice(0, 140))}
                    placeholder="TRANSMIT_SIGNAL..."
                    className="flex-1 bg-transparent border-none text-[10px] mono text-white outline-none placeholder:text-white/10"
                />
                <button 
                    disabled={!newMessage.trim() || sending}
                    className="p-2 transition-all hover:scale-110 disabled:opacity-20"
                    style={{ color }}
                >
                    {sending ? <Zap size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
            </form>

            {/* Scanning Overlay Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-scanlines mix-blend-overlay animate-scanlines" />
        </motion.div>
    );
};

export default CommunityTerminal;
