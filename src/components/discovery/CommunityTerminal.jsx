import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Users, Zap, Globe, Shield, Star, MoveLeft, MessageSquare, ImagePlus, AlertTriangle, CheckCircle, Terminal, Bug } from 'lucide-react';
import API from '../../services/api';
import { SECTORS, getMediaUrl } from '../../constants';
import { useNotification } from '../../contexts/NotificationContext';

// ── FATALE_CORE Feedback Panel ────────────────────────────────────────────────
const FataleCorePanel = ({ user, onBack }) => {
    const { showNotification } = useNotification();
    const [category, setCategory] = useState('BUG_REPORT');
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState(0);
    const [sending, setSending] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const SYSTEM_COMMUNITY_ID = 4; // FATALE_CORE db id
    const COLOR = '#ff0033';

    const fetchLogs = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const res = await API.CommunityChat.getMessages(SYSTEM_COMMUNITY_ID);
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('[FATALE_CORE_FETCH]', e);
        } finally {
            setLoadingLogs(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim() || sending) return;
        setSending(true);
        const prefix = category === 'REVIEW' && rating > 0
            ? `[${category}][${rating}/5★] `
            : `[${category}] `;
        const full = prefix + message.trim();
        try {
            await API.CommunityChat.sendMessage(SYSTEM_COMMUNITY_ID, full);
            setSubmitted(true);
            setMessage('');
            setRating(0);
            showNotification('SIGNAL_RECEIVED', 'Your transmission has been logged by the Fatale team.', 'success');
            setTimeout(() => { setSubmitted(false); fetchLogs(); }, 2500);
        } catch (err) {
            console.error('[FATALE_CORE_SEND]', err);
            showNotification('SYNC_ERROR', 'Failed to transmit signal. Try again.', 'error');
        } finally {
            setSending(false);
        }
    };

    const CATEGORIES = [
        { id: 'BUG_REPORT', label: 'Bug Report', icon: Bug },
        { id: 'REVIEW', label: 'Review', icon: Star },
        { id: 'FEATURE_REQUEST', label: 'Feature Request', icon: Terminal },
        { id: 'OTHER', label: 'Other', icon: MessageSquare },
    ];

    return (
        <div
            className="w-full h-full flex flex-col relative overflow-hidden backdrop-blur-xl"
            style={{ background: 'rgba(0,0,0,0.92)', borderColor: `${COLOR}30`, border: `1px solid ${COLOR}30` }}
        >
            {/* Header */}
            <div className="flex-none flex items-center justify-between px-4 h-14 border-b border-white/5 bg-black/60">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105"
                    style={{ color: COLOR }}
                >
                    <MoveLeft size={14} /> BACK_TO_ORBIT
                </button>
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 flex items-center justify-center border"
                        style={{ borderColor: `${COLOR}40`, background: `${COLOR}10` }}
                    >
                        <Terminal size={14} style={{ color: COLOR }} />
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-[10px] font-black uppercase tracking-tight" style={{ color: COLOR, textShadow: `0 0 10px ${COLOR}` }}>
                            FATALE_CORE
                        </div>
                        <div className="text-[7px] text-white/30 mono tracking-widest">SYSTEM_NODE // READ-ONLY</div>
                    </div>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: COLOR, boxShadow: `0 0 8px ${COLOR}` }} />
                </div>
            </div>

            {/* Status strip */}
            <div
                className="flex-none px-4 py-2 border-b border-white/5 flex items-center gap-3 text-[8px] mono uppercase tracking-widest"
                style={{ background: `${COLOR}08`, color: `${COLOR}80` }}
            >
                <AlertTriangle size={9} />
                <span>OFFICIAL FEEDBACK CHANNEL — MONITORED BY THE FATALE TEAM</span>
                <span className="ml-auto opacity-50">SYS_NODE_04</span>
            </div>

            {/* Scrollable log feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {loadingLogs && (
                    <div className="flex items-center justify-center h-16 text-[8px] mono text-white/20 uppercase tracking-widest">
                        LOADING_LOGS...
                    </div>
                )}
                {!loadingLogs && logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-24 opacity-20 text-center space-y-2">
                        <Terminal size={20} />
                        <div className="text-[8px] uppercase tracking-[0.3em]">NO_TRANSMISSIONS_YET</div>
                    </div>
                )}
                {logs.map((m, i) => {
                    const isBug = m.content?.startsWith('[BUG');
                    const isReview = m.content?.startsWith('[REVIEW');
                    const isFeature = m.content?.startsWith('[FEATURE');
                    const tagColor = isBug ? '#ff4444' : isReview ? '#ffaa00' : isFeature ? '#00ffaa' : '#aaaaff';
                    return (
                        <div key={m.id || i} className="flex flex-col gap-1 border-l-2 pl-3 py-1" style={{ borderColor: `${tagColor}50` }}>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-tight" style={{ color: tagColor }}>{m.username}</span>
                                <span className="text-[7px] text-white/20 mono">{new Date(m.sentAt).toLocaleString()}</span>
                            </div>
                            <div className="text-[10px] text-white/70 leading-relaxed">{m.content}</div>
                        </div>
                    );
                })}
            </div>

            {/* Submission form */}
            <form onSubmit={handleSubmit} className="flex-none border-t border-white/10 bg-black/80 p-4 space-y-3">
                {/* Category tabs */}
                <div className="flex gap-2 flex-wrap">
                    {CATEGORIES.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setCategory(id)}
                            className="flex items-center gap-1 px-2 py-1 text-[8px] font-black uppercase tracking-widest border transition-all"
                            style={category === id ? {
                                borderColor: COLOR, color: COLOR, background: `${COLOR}15`,
                                boxShadow: `0 0 8px ${COLOR}40`
                            } : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}
                        >
                            <Icon size={8} /> {label}
                        </button>
                    ))}
                </div>

                {/* Star rating (reviews only) */}
                {category === 'REVIEW' && (
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] mono text-white/30 uppercase tracking-widest">RATING:</span>
                        {[1, 2, 3, 4, 5].map(n => (
                            <button
                                key={n} type="button"
                                onClick={() => setRating(n)}
                                className="transition-all hover:scale-125"
                            >
                                <Star
                                    size={14}
                                    style={n <= rating ? { color: '#ffaa00', fill: '#ffaa00', filter: 'drop-shadow(0 0 6px #ffaa00)' } : { color: 'rgba(255,255,255,0.15)' }}
                                />
                            </button>
                        ))}
                    </div>
                )}

                {/* Message input */}
                <div className="flex items-start gap-3">
                    <textarea
                        className="flex-1 bg-transparent border text-[10px] mono text-white outline-none placeholder:text-white/20 resize-none p-2"
                        style={{ borderColor: `${COLOR}30`, minHeight: '60px' }}
                        placeholder={`Describe your ${category.toLowerCase().replace('_', ' ')}...`}
                        value={message}
                        onChange={e => setMessage(e.target.value.slice(0, 500))}
                        rows={3}
                    />
                    <button
                        type="submit"
                        disabled={!message.trim() || sending}
                        className="px-3 py-2 border font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-20 self-end"
                        style={{ borderColor: COLOR, color: COLOR, background: `${COLOR}10` }}
                    >
                        {submitted ? <CheckCircle size={14} /> : sending ? <Zap size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </div>

                <div className="text-[7px] text-white/15 mono uppercase tracking-widest">
                    {message.length}/500 chars — TRANSMITTING AS: {user?.username || 'ANONYMOUS'}
                </div>
            </form>

            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-scanlines mix-blend-overlay animate-scanlines" />
        </div>
    );
};

// ── Standard Community Terminal ───────────────────────────────────────────────
const CommunityTerminal = ({ community, user, followedCommunities = [], onFollowUpdate, setUser, onBack, sectorColor }) => {
    const { t } = useLanguage();
    const { showNotification } = useNotification();
    const lastTickRef = useRef(0);
    const chatEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const pollRef = useRef(null);
    const [displayImageUrl, setDisplayImageUrl] = useState(community.imageUrl || community.ImageUrl);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Route system nodes to the special panel
    if (community.isSystem) {
        return <FataleCorePanel user={user} onBack={onBack} />;
    }

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
        if (isAtBottom) {
            const container = chatContainerRef.current;
            if (container) {
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight;
                });
            }
        }
    }, [messages, isAtBottom]);

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const atBottom = scrollHeight - scrollTop - clientHeight < 50;
        setIsAtBottom(atBottom);
    };

    const isFollowed = followedCommunities.includes(community.id);
    const isMember = (user?.communityId || user?.CommunityId) === community.id;
    const isFounder = (user?.id || user?.Id) === (community.founderId || community.founderUserId || community.FounderUserId);

    const handleToggleFollow = async (e) => {
        e.stopPropagation();
        try {
            if (isFollowed) {
                await API.Communities.unfollow(community.id);
            } else {
                await API.Communities.follow(community.id);
            }
            if (onFollowUpdate) onFollowUpdate();
        } catch (e) {
            console.error('[FOLLOW_TOGGLE_ERROR]', e);
        }
    };

    const handleJoin = async () => {
        try {
            setSending(true);
            await API.Communities.join(community.id);
            if (setUser) {
                setUser(prev => ({ ...prev, communityId: community.id, CommunityId: community.id }));
            }
            showNotification("NEURAL_SYNC_ESTABLISHED", `Welcome to ${community.name}. Faction link verified.`, "success");
        } catch (e) {
            console.error('[JOIN_ERROR]', e);
            showNotification("SYNC_FAILURE", "Failed to establish clan membership link.", "error");
        } finally {
            setSending(false);
        }
    };

    const handleLeave = async () => {
        try {
            setSending(true);
            await API.Communities.leave();
            if (setUser) {
                setUser(prev => ({ ...prev, communityId: null, CommunityId: null }));
            }
            showNotification("LINK_TERMINATED", "Clan membership revoked. Signal returned to solo status.", "success");
        } catch (e) {
            console.error('[LEAVE_ERROR]', e);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("CRITICAL_ACTION: This will permanently erase the clique signal. Continue?")) return;
        try {
            setSending(true);
            await API.Communities.delete(community.id);
            showNotification("SIGNAL_ERASED", "Clique termination sequence complete.", "success");
            onBack();
        } catch (e) {
            console.error('[DELETE_ERROR]', e);
        } finally {
            setSending(false);
        }
    };

    const handleIconUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            setSending(true);
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadRes = await API.Files.upload(formData);
            const newUrl = uploadRes.data.url || uploadRes.data.imageUrl || uploadRes.data.FilePath;
            
            if (newUrl) {
                await API.Communities.updateImageUrl(community.id, newUrl);
                setDisplayImageUrl(newUrl);
                showNotification("LINK_UPDATED", "Clique imagery successfully recalibrated.", "success");
                if (onFollowUpdate) onFollowUpdate();
            }
        } catch (e) {
            console.error('[ICON_UPLOAD_ERROR]', e);
            showNotification("UPLOAD_FAILURE", "Failed to upload clique imagery.", "error");
        } finally {
            setSending(false);
        }
    };

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
            setTimeout(() => setSending(false), 500);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-black/40 border border-white/10 relative overflow-hidden backdrop-blur-xl" style={{ borderColor: `${color}30` }}>
            {/* Header / Nav Section */}
            <div className="flex-none flex items-center justify-between px-4 h-14 border-b border-white/5 bg-white/5 backdrop-blur-md relative">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105"
                    style={{ color }}
                >
                    <MoveLeft size={14} />
                    {t('BACK_TO_ORBIT')}
                </button>
                <div className="flex items-center gap-3">
                    <div className="relative group/icon">
                        <div className="w-8 h-8 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center shrink-0 relative overflow-hidden">
                            {displayImageUrl ? (
                                <img src={getMediaUrl(displayImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-60 group-hover/icon:opacity-100 transition-all" />
                            ) : (
                                <Globe size={14} className="text-white opacity-20" />
                            )}
                            
                            {isFounder && (
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 bg-[#ff006e]/60 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                    title="RECALIBRATE_ICON"
                                >
                                    <ImagePlus size={14} className="text-white" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[150px] text-right">{community.name}</div>
                        <div className="text-[7px] opacity-30 mono tracking-widest">{t('SIGNAL_STRENGTH')}: 98%</div>
                    </div>
                    <button 
                        onClick={handleToggleFollow}
                        className={`transition-all hover:scale-125 ${isJoined ? 'pointer-events-none' : 'cursor-pointer'}`}
                    >
                        <Star 
                            size={14} 
                            className={isJoined || isFollowed ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" : "text-white/20"} 
                        />
                    </button>
                </div>
            </div>

            {/* Matrix Data Strip */}
            <div className="flex-none bg-black/60 px-4 py-2 border-b border-white/5 flex items-center justify-between text-[8px] mono text-white/30 uppercase tracking-[0.2em]">
                 <div className="flex items-center gap-4">
                    <span>ID: {community.id?.toString(16).toUpperCase()}</span>
                    <span>SEC: {community.sectorId}</span>
                    {isFounder && (
                        <button onClick={handleDelete} className="text-red-500 hover:text-red-400 font-black cursor-pointer bg-red-500/10 px-2 flex items-center gap-1 border border-red-500/20">
                            <Zap size={8} /> {t('DELETE_CLIQUE')}
                        </button>
                    )}
                 </div>
                 <div className="flex items-center gap-3">
                    {!isMember ? (
                        <button 
                            onClick={handleJoin}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-2 py-0.5 rounded-sm transition-all flex items-center gap-1 hover:scale-105"
                        >
                            {t('JOIN_CLIQUE')}
                        </button>
                    ) : (
                        <button 
                            onClick={handleLeave}
                            className="text-[#ff006e]/60 hover:text-[#ff006e] border border-[#ff006e]/20 px-2 py-0.5 rounded-sm transition-all"
                        >
                            {t('LEAVE_CLIQUE')}
                        </button>
                    )}
                    <div className="w-[1px] h-3 bg-white/10 mx-1" />
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                        <span style={{ color }}>{t('LINK_STABLE')}</span>
                    </div>
                 </div>
            </div>

            {/* Chat Area */}
            <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 relative no-scrollbar" 
                style={{ 
                    overflowAnchor: 'auto',
                    scrollbarGutter: 'stable',
                    contain: 'size layout style',
                    height: '100%'
                }}
            >
                <div className="min-h-full flex flex-col relative">
                    {messages.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 text-center space-y-2 pointer-events-none">
                            <MessageSquare size={24} />
                            <div className="text-[8px] uppercase tracking-[0.3em]">{t('NO_INCOMING_TRANSMISSIONS')}</div>
                        </div>
                    )}
                    <div className="space-y-4">
                        {messages.map((m, i) => (
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
                        ))}
                    </div>
                </div>
                <div ref={chatEndRef} className="h-4 flex-none" />
            </div>

            {/* Input Overlay */}
            <form onSubmit={handleSend} className="flex-none h-16 px-4 bg-black/80 border-t border-white/10 flex items-center gap-3">
                <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value.slice(0, 140))}
                    placeholder={isMember ? (t('TRANSMIT_SIGNAL') + '...') : "[ ÚNETE AL CLIQUE PARA TRANSMITIR ]"}
                    disabled={!isMember}
                    className="flex-1 bg-transparent border-none text-[10px] mono text-white outline-none placeholder:text-white/10 disabled:opacity-50"
                />
                <div className="w-10 flex items-center justify-center">
                    <button 
                        disabled={!isMember || !newMessage.trim() || sending}
                        className="p-2 transition-all hover:scale-110 disabled:opacity-20"
                        style={{ color }}
                    >
                        {sending ? <Zap size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                </div>
            </form>

            {/* Scanning Overlay Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-scanlines mix-blend-overlay animate-scanlines" />

            {/* Hidden Founder Tools */}
            <input 
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleIconUpload}
            />
        </div>
    );
};

export default CommunityTerminal;
