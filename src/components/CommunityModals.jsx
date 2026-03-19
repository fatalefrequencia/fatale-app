import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Globe, LogOut, Loader2, Send, Shield, Zap, ChevronRight, Minimize2, Heart } from 'lucide-react';
import API from '../services/api';
import { SECTORS, API_BASE_URL } from '../constants';

// ─── NEURAL STATION — Community Hub Modal ──────────────────────────────────
export const CommunityDetailsModal = ({ community, onClose, onMinimize, onJoin, onLeave, onFollow, onUnfollow, isFollowed, currentUser, loadingAction, navigateToProfile }) => {
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'nodes'
    const chatEndRef = useRef(null);
    const pollRef = useRef(null);
    const lastTickRef = useRef(null);

    const color = community?.color || '#ff006e';
    const userCommunityId = currentUser?.communityId ?? currentUser?.CommunityId;
    const userId = currentUser?.id ?? currentUser?.Id;
    const isMember = userCommunityId != null && String(userCommunityId) === String(community?.id);
    const isFounder = userId != null && String(userId) === String(community?.founderId);

    // ── Members ──
    const fetchMembers = useCallback(async () => {
        if (!community?.id) return;
        setLoadingMembers(true);
        try {
            const res = await API.Communities.getMembers(community.id);
            setMembers(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('Failed to load members', e);
        } finally {
            setLoadingMembers(false);
        }
    }, [community?.id]);

    const fetchMessages = useCallback(async (afterId = null) => {
        if (!community?.id) return;
        try {
            const res = await API.CommunityChat.getMessages(community.id, afterId);
            const newMsgs = Array.isArray(res.data) ? res.data : [];
            
            if (newMsgs.length > 0) {
                // ALWAYS advance the cursor to the latest message ID to stop loop
                const maxId = Math.max(...newMsgs.map(m => m.id));
                if (afterId === null || maxId > lastTickRef.current) {
                    lastTickRef.current = maxId;
                }

                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const fresh = newMsgs.filter(m => !existingIds.has(m.id));
                    if (fresh.length === 0) return prev;
                    return [...prev, ...fresh];
                });
            }
        } catch (e) {
            console.error('Chat fetch error', e);
        }
    }, [community?.id]);

    useEffect(() => {
        fetchMembers();
        fetchMessages();
    }, [fetchMembers, fetchMessages]);

    // Poll every 3 seconds for new messages
    useEffect(() => {
        pollRef.current = setInterval(() => {
            fetchMessages(lastTickRef.current);
        }, 3000);
        return () => clearInterval(pollRef.current);
    }, [fetchMessages]);

    // Scroll to bottom when messages arrive
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Send ──
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sendingMsg) return;
        setSendingMsg(true);
        const text = newMessage.trim();
        setNewMessage('');
        try {
            const res = await API.CommunityChat.sendMessage(community.id, text);
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                if (existingIds.has(res.data.id)) return prev;
                return [...prev, res.data];
            });
            lastTickRef.current = res.data.id;
        } catch (e) {
            console.error('Failed to send', e);
            setNewMessage(text);
        } finally {
            setSendingMsg(false);
        }
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
    };

    if (!community) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6"
        >
            {/* Backdrop with sector-tinted blur */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 backdrop-blur-[16px]"
                style={{ background: `radial-gradient(ellipse at center, ${color}12 0%, rgba(0,0,0,0.88) 70%)` }}
                onClick={onClose}
            />

            {/* Station Panel */}
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="relative w-full max-w-4xl h-[85vh] max-h-[700px] flex flex-col rounded-sm overflow-hidden"
                style={{
                    background: 'rgba(4,4,4,0.97)',
                    border: `1px solid ${color}40`,
                    boxShadow: `0 0 80px -20px ${color}50, 0 0 200px -60px ${color}30`,
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Ambient light leak */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[100px] opacity-20" style={{ background: color }} />
                    <div className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-10" style={{ background: color }} />
                </div>

                {/* Scanline */}
                <motion.div
                    className="absolute inset-x-0 h-[1px] blur-[1px] z-10 pointer-events-none opacity-30"
                    style={{ background: color }}
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                />

                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 z-20" style={{ borderColor: color }} />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 z-20" style={{ borderColor: color }} />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 z-20" style={{ borderColor: color }} />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 z-20" style={{ borderColor: color }} />

                {/* ─── HEADER ─────────────────────────────────── */}
                <div className="relative z-10 px-6 pt-5 pb-4 border-b flex items-start justify-between gap-4 shrink-0"
                    style={{ borderColor: `${color}25` }}>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-2 h-2 rounded-full animate-pulse shadow-lg" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                            <span className="text-[9px] font-black tracking-[0.4em] uppercase mono" style={{ color }}>
                                NEURAL_STATION // SECTOR_{community.sectorId}
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none truncate">
                            {community.name}
                        </h1>
                        <p className="text-white/40 text-xs mt-1 mono leading-relaxed max-w-xl line-clamp-2">
                            {community.description || 'No manifesto data found for this node.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Stats pill */}
                        <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-sm border text-xs mono"
                            style={{ borderColor: `${color}30`, background: `${color}10` }}>
                            <span className="text-white/50">Members</span>
                            <span className="font-black text-white">{community.memberCount || 0}</span>
                        </div>
                        {/* Founder badge */}
                        {isFounder && (
                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-sm border text-[9px] font-black mono uppercase"
                                style={{ borderColor: `${color}40`, color, background: `${color}15` }}>
                                <Shield size={10} />
                                FOUNDER
                            </div>
                        )}
                        {/* Minimize — collapses to floating widget */}
                        {onMinimize && (
                            <button onClick={onMinimize} className="p-1.5 text-white/30 hover:text-white transition-colors" title="Minimize to chat widget">
                                <Minimize2 size={18} />
                            </button>
                        )}
                        {/* Follow Button */}
                        <button 
                            onClick={() => isFollowed ? onUnfollow(community.id) : onFollow(community.id)} 
                            className="p-1.5 transition-all hover:scale-110 active:scale-95"
                            title={isFollowed ? "Unfollow frequency" : "Follow frequency"}
                            style={{ color: isFollowed ? color : 'rgba(255,255,255,0.3)' }}
                        >
                            <Heart size={18} fill={isFollowed ? color : 'transparent'} className={isFollowed ? 'drop-shadow-[0_0_8px_currentColor]' : ''} />
                        </button>
                        <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* ─── BODY — SPLIT LAYOUT ────────────────────── */}
                <div className="flex flex-1 min-h-0 relative z-10">

                    {/* LEFT — Node Members (collapsible on mobile) */}
                    <div className="hidden md:flex flex-col w-64 shrink-0 border-r overflow-hidden"
                        style={{ borderColor: `${color}20` }}>
                        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${color}15` }}>
                            <Users size={12} style={{ color }} />
                            <span className="text-[9px] font-black tracking-[0.3em] uppercase mono text-white/40">Active_Nodes</span>
                            <span className="ml-auto text-[9px] font-black mono" style={{ color }}>{members.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1 min-h-0"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: `${color}50 transparent` }}>
                            {loadingMembers ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 size={16} className="animate-spin text-white/20" />
                                </div>
                            ) : members.length === 0 ? (
                                <div className="text-center py-8 text-[8px] mono text-white/20 uppercase tracking-widest">
                                    NO_SIGNALS_FOUND
                                </div>
                            ) : members.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => { if (navigateToProfile) { onClose(); navigateToProfile(m.id); } }}
                                    className="w-full flex items-center gap-2 px-2 py-2 rounded-sm hover:bg-white/5 transition-all group text-left"
                                >
                                    <div className="relative w-7 h-7 rounded-sm overflow-hidden border shrink-0"
                                        style={{ borderColor: `${m.themeColor || color}40` }}>
                                        {m.profilePictureUrl ? (
                                            <img src={m.profilePictureUrl.startsWith('http') ? m.profilePictureUrl : `${API_BASE_URL}${m.profilePictureUrl}`}
                                                alt={m.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[8px] font-black"
                                                style={{ color: m.themeColor || color }}>
                                                {m.username?.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 border opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ borderColor: `${m.themeColor || color}80` }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-black text-white truncate">{m.username}</div>
                                        <div className="text-[8px] mono text-white/30 truncate">{m.biography || 'no bio data'}</div>
                                    </div>
                                    <ChevronRight size={10} className="text-white/20 group-hover:text-white/60 transition-colors shrink-0" />
                                </button>
                            ))}
                        </div>

                        {/* Join/Leave */}
                        <div className="p-3 border-t" style={{ borderColor: `${color}20` }}>
                            {isMember ? (
                                <button
                                    onClick={() => onLeave(community.id)}
                                    disabled={loadingAction}
                                    className="w-full py-2.5 flex items-center justify-center gap-2 border text-xs font-black mono uppercase tracking-widest text-red-400 border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-40 rounded-sm"
                                >
                                    {loadingAction ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    onClick={() => onJoin(community.id)}
                                    disabled={loadingAction || !!currentUser?.communityId}
                                    className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-black mono uppercase tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-sm"
                                    style={{
                                        background: `linear-gradient(135deg, ${color}30, ${color}15)`,
                                        border: `1px solid ${color}60`,
                                    }}
                                >
                                    {loadingAction ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                                    {currentUser?.communityId ? 'Limit Reached' : 'Establish Link'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — Chat */}
                    <div className="flex-1 flex flex-col min-w-0 min-h-0">
                        {/* Chat header */}
                        <div className="px-5 py-3 border-b flex items-center gap-2 shrink-0" style={{ borderColor: `${color}15` }}>
                            <Zap size={11} style={{ color }} className="animate-pulse" />
                            <span className="text-[9px] font-black tracking-[0.3em] uppercase mono text-white/40">
                                Freq_Chat // {community.name}
                            </span>
                            <div className="ml-auto flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                                <span className="text-[8px] mono text-white/30 uppercase tracking-widest">live</span>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: `${color}50 transparent` }}>
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                                    <div className="w-12 h-12 rounded-sm border flex items-center justify-center opacity-20"
                                        style={{ borderColor: color }}>
                                        <Zap size={20} style={{ color }} />
                                    </div>
                                    <div className="text-[9px] mono text-white/20 uppercase tracking-widest">
                                        No transmissions yet.<br />Be the first to broadcast.
                                    </div>
                                </div>
                            )}
                            {messages.map((msg, i) => {
                                const isMe = msg.userId === (currentUser?.id || currentUser?.Id);
                                return (
                                    <motion.div
                                        key={msg.id || i}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                                    >
                                        {/* Avatar */}
                                        <div className="w-6 h-6 rounded-sm shrink-0 overflow-hidden border flex items-center justify-center text-[7px] font-black"
                                            style={{
                                                borderColor: `${msg.themeColor || '#ff006e'}50`,
                                                color: msg.themeColor || '#ff006e',
                                                background: `${msg.themeColor || '#ff006e'}15`
                                            }}>
                                            {msg.profilePictureUrl ? (
                                                <img src={msg.profilePictureUrl.startsWith('http') ? msg.profilePictureUrl : `${API_BASE_URL}${msg.profilePictureUrl}`}
                                                    alt={msg.username} className="w-full h-full object-cover" />
                                            ) : (
                                                msg.username?.substring(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        {/* Bubble */}
                                        <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                            <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-[9px] font-black mono" style={{ color: msg.themeColor || '#ff006e' }}>
                                                    {msg.username}
                                                </span>
                                                <span className="text-[8px] mono text-white/20">
                                                    {formatTime(msg.sentAt)}
                                                </span>
                                            </div>
                                            <div className="px-3 py-2 rounded-sm text-[11px] text-white/90 leading-relaxed"
                                                style={{
                                                    background: isMe ? `${msg.themeColor || color}18` : 'rgba(255,255,255,0.04)',
                                                    border: `1px solid ${isMe ? `${msg.themeColor || color}35` : 'rgba(255,255,255,0.07)'}`,
                                                }}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="px-4 py-3 border-t flex items-center gap-3 shrink-0"
                            style={{ borderColor: `${color}20` }}>
                            {isMember || userId ? (
                                <>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value.slice(0, 280))}
                                        placeholder="Transmit signal..."
                                        className="flex-1 bg-white/[0.03] border px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-all mono rounded-sm"
                                        style={{ borderColor: `${color}30` }}
                                        onFocus={e => e.target.style.borderColor = `${color}70`}
                                        onBlur={e => e.target.style.borderColor = `${color}30`}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || sendingMsg}
                                        className="w-10 h-10 flex items-center justify-center rounded-sm border transition-all disabled:opacity-30"
                                        style={{
                                            borderColor: `${color}50`,
                                            background: `${color}20`,
                                            color
                                        }}
                                    >
                                        {sendingMsg ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    </button>
                                </>
                            ) : (
                                <div className="flex-1 text-center text-[9px] mono text-white/20 uppercase tracking-widest py-2">
                                    Join this node to transmit
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* Mobile join/leave strip */}
                <div className="md:hidden border-t px-4 py-3 shrink-0 flex gap-3" style={{ borderColor: `${color}20` }}>
                    {isMember ? (
                        <button onClick={() => onLeave(community.id)} disabled={loadingAction}
                            className="flex-1 py-2 flex items-center justify-center gap-2 border text-xs font-black mono uppercase text-red-400 border-red-500/30 hover:bg-red-500/10 rounded-sm disabled:opacity-40">
                            {loadingAction ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />} Disconnect
                        </button>
                    ) : (
                        <button onClick={() => onJoin(community.id)} disabled={loadingAction || !!currentUser?.communityId}
                            className="flex-1 py-2 flex items-center justify-center gap-2 text-xs font-black mono uppercase text-white rounded-sm disabled:opacity-30"
                            style={{ background: `${color}30`, border: `1px solid ${color}60` }}>
                            {loadingAction ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                            {currentUser?.communityId ? 'Limit Reached' : 'Establish Link'}
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── CREATE COMMUNITY MODAL ───────────────────────────────────────────────
export const CreateCommunityModal = ({ onClose, onSubmit, loading, user_credits = 0 }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [sectorId, setSectorId] = useState(0);
    const [localError, setLocalError] = useState(null);
    const CREATION_COST = 0;
    const canAfford = (user_credits || 0) >= CREATION_COST;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);
        if (!name.trim() || !description.trim()) {
            setLocalError('A community identifier and manifesto are required.');
            return;
        }
        if (!canAfford) {
            setLocalError('Insufficient credits: Access to founding protocols denied.');
            return;
        }
        try {
            await onSubmit({ name: name.trim(), description: description.trim(), sectorId });
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || 'Node initialization failed.';
            setLocalError(msg);
        }
    };

    const activeSector = SECTORS.find(s => s.id === sectorId) || SECTORS[0];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6"
        >
            <motion.div
                className="absolute inset-0 backdrop-blur-[12px]"
                style={{ background: `radial-gradient(ellipse at 40% 40%, ${activeSector.color}10 0%, rgba(0,0,0,0.88) 70%)` }}
                onClick={() => !loading && onClose()}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 30 }}
                transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                className="relative w-full max-w-lg rounded-sm overflow-hidden"
                style={{
                    background: 'rgba(5,5,5,0.95)',
                    border: `1px solid ${activeSector.color}35`,
                    boxShadow: `0 0 60px -15px ${activeSector.color}40`,
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Corner brackets */}
                {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                  'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((cls, i) => (
                    <div key={i} className={`absolute w-4 h-4 ${cls} z-20`} style={{ borderColor: activeSector.color }} />
                ))}
                {/* Scanline */}
                <motion.div className="absolute inset-x-0 h-[1px] z-10 pointer-events-none opacity-20"
                    style={{ background: activeSector.color }}
                    animate={{ top: ['0%','100%'] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'linear' }} />

                <div className="p-7 relative z-10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: activeSector.color }} />
                                <span className="text-[8px] font-black mono tracking-[0.4em] uppercase" style={{ color: activeSector.color }}>
                                    genesis_protocol // node_initialization
                                </span>
                            </div>
                            <h1 className="text-lg mono tracking-[0.1em] flex items-center gap-3 ml-1">
                                <span className="text-white/20">[</span>
                                <span className="text-white/20 font-light">found_community</span>
                                <span className="text-white/20">]</span>
                            </h1>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <AnimatePresence>
                            {localError && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                    className="bg-red-500/8 border border-red-500/25 px-4 py-3 text-[10px] text-red-400 mono rounded-sm">
                                    ⚠ {localError}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black mono tracking-[0.3em] uppercase text-white/40 ml-1">
                                Community Identifier
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => { setName(e.target.value); if (localError) setLocalError(null); }}
                                maxLength={100}
                                required
                                className="w-full bg-black/40 border px-4 py-3 text-white font-semibold outline-none transition-all text-sm mono rounded-sm"
                                style={{ borderColor: `${activeSector.color}30` }}
                                onFocus={e => e.target.style.borderColor = `${activeSector.color}70`}
                                onBlur={e => e.target.style.borderColor = `${activeSector.color}30`}
                                placeholder="enter a name..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black mono tracking-[0.3em] uppercase text-white/40 ml-1">
                                Manifesto
                            </label>
                            <textarea
                                value={description}
                                onChange={e => { setDescription(e.target.value); if (localError) setLocalError(null); }}
                                maxLength={500}
                                required
                                rows={3}
                                className="w-full bg-black/40 border px-4 py-3 text-white/80 outline-none transition-all text-sm resize-none mono rounded-sm"
                                style={{ borderColor: `${activeSector.color}30` }}
                                onFocus={e => e.target.style.borderColor = `${activeSector.color}70`}
                                onBlur={e => e.target.style.borderColor = `${activeSector.color}30`}
                                placeholder="describe your community's frequency..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black mono tracking-[0.3em] uppercase text-white/40 ml-1 block text-center">
                                Sector Alignment
                            </label>
                            <div className="flex flex-wrap justify-center gap-2">
                                {SECTORS.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setSectorId(s.id)}
                                        className="px-3 py-1.5 rounded-sm text-[10px] mono font-black uppercase tracking-wide transition-all border"
                                        style={{
                                            borderColor: sectorId === s.id ? s.color : 'rgba(255,255,255,0.08)',
                                            background: sectorId === s.id ? `${s.color}20` : 'rgba(255,255,255,0.02)',
                                            color: sectorId === s.id ? s.color : 'rgba(255,255,255,0.4)',
                                            boxShadow: sectorId === s.id ? `0 0 12px ${s.color}30` : 'none',
                                        }}>
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-3 flex gap-3">
                            <button type="button" onClick={onClose}
                                className="flex-1 py-3 text-xs font-black mono uppercase tracking-widest text-white/30 hover:text-white border border-white/10 hover:border-white/20 transition-all rounded-sm">
                                Abort
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !canAfford}
                                className="flex-1 py-3 text-xs font-black mono uppercase tracking-widest text-white transition-all disabled:opacity-30 rounded-sm flex items-center justify-center gap-2"
                                style={{
                                    background: `linear-gradient(135deg, ${activeSector.color}50, ${activeSector.color}25)`,
                                    border: `1px solid ${activeSector.color}60`,
                                    boxShadow: loading ? 'none' : `0 0 20px ${activeSector.color}20`,
                                }}>
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                {loading ? 'Initializing...' : `Found — ${CREATION_COST} CR`}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    );
};
