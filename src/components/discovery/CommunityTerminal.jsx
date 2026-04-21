import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Users, Zap, Globe, Shield, Star, MoveLeft, MessageSquare, ImagePlus } from 'lucide-react';
import API from '../../services/api';
import { SECTORS, getMediaUrl } from '../../constants';
import { useNotification } from '../../contexts/NotificationContext';

const CommunityTerminal = ({ community, user, followedCommunities = [], onFollowUpdate, setUser, onBack, sectorColor }) => {
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
            chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
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
            setSending(true);
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
                    BACK_TO_ORBIT
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
                        <div className="text-[7px] opacity-30 mono tracking-widest">SIGNAL_STRENGTH: 98%</div>
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
                            <Zap size={8} /> DELETE_CLIQUE
                        </button>
                    )}
                 </div>
                 <div className="flex items-center gap-3">
                    {!isMember ? (
                        <button 
                            onClick={handleJoin}
                            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-2 py-0.5 rounded-sm transition-all flex items-center gap-1 hover:scale-105"
                        >
                            JOIN_CLIQUE
                        </button>
                    ) : (
                        <button 
                            onClick={handleLeave}
                            className="text-[#ff006e]/60 hover:text-[#ff006e] border border-[#ff006e]/20 px-2 py-0.5 rounded-sm transition-all"
                        >
                            LEAVE_CLIQUE
                        </button>
                    )}
                    <div className="w-[1px] h-3 bg-white/10 mx-1" />
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                        <span style={{ color }}>LINK_STABLE</span>
                    </div>
                 </div>
            </div>

            {/* Chat Area */}
            <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 relative" 
                style={{ 
                    overflowAnchor: 'none',
                    scrollbarGutter: 'stable',
                    contain: 'content'
                }}
            >
                <div className="min-h-full flex flex-col relative">
                    {messages.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 text-center space-y-2 pointer-events-none">
                            <MessageSquare size={24} />
                            <div className="text-[8px] uppercase tracking-[0.3em]">No incoming transmissions</div>
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
