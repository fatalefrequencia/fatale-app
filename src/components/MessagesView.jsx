import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Search, Edit, MoreHorizontal, Phone, Volume2, Send, ChevronLeft, User, X, Heart } from 'lucide-react';
import API from '../services/api';

export const MessagesView = ({ user, navigateToProfile }) => {
    const [conversations, setConversations] = useState([]);
    const [currentChat, setCurrentChat] = useState(null); // The user object we are chatting with
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);

    // Search functionality state
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchConversations = async () => {
        try {
            const res = await API.Messages.getConversations();
            setConversations(res.data || []);
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatHistory = async (otherUserId) => {
        try {
            const res = await API.Messages.getConversation(otherUserId);
            setMessages(res.data || []);
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        setIsSearchingUsers(true);
        try {
            // Fetch following list to mark users
            const followingRes = await API.Users.getFollowing(user?.id || user?.Id).catch(() => ({ data: [] }));
            const followingIds = new Set((followingRes.data || []).map(u => String(u.id || u.Id)));

            if (query.trim() === '') {
                // Privacy-first suggestions: Merge following users and active conversations
                console.log("Analyzing contact link history...");
                const convsRes = await API.Messages.getConversations().catch(() => ({ data: [] }));

                // Extract unique users from following and conversations
                const following = (followingRes.data || []).map(u => ({ ...u, isFollowing: true }));
                const convs = (convsRes.data || []).map(c => ({
                    id: c.userId,
                    username: c.username,
                    profilePictureUrl: c.profileImageUrl,
                    isFollowing: followingIds.has(String(c.userId))
                }));

                const merged = [...following];
                convs.forEach(c => {
                    if (!merged.find(m => String(m.id || m.Id) === String(c.id))) {
                        merged.push(c);
                    }
                });

                setSearchResults(merged);
            } else {
                console.log("Scanning sector for:", query);
                const res = await API.Users.searchUsers(query);
                const results = (res.data || []).map(u => ({
                    ...u,
                    isFollowing: followingIds.has(String(u.id || u.Id))
                }));
                setSearchResults(results);
            }
        } catch (err) {
            console.error("Signal sync failed", err);
        } finally {
            setIsSearchingUsers(false);
        }
    };

    const handleSearchFollow = async (e, targetId, isFollowing) => {
        e.stopPropagation();
        try {
            const apiRes = await import('../services/api').then(mod => mod.default);
            if (isFollowing) {
                await apiRes.Users.unfollowUser(targetId);
            } else {
                await apiRes.Users.followUser(targetId);
            }
            // Refresh search results to show new state
            handleSearch({ target: { value: searchQuery } });
        } catch (err) {
            console.error("Link action failed", err);
        }
    };

    const startNewChat = (targetUser) => {
        setCurrentChat({
            id: targetUser.id || targetUser.Id,
            username: targetUser.username || targetUser.Username,
            profileImageUrl: targetUser.profilePictureUrl || targetUser.ProfilePictureUrl
        });
        setIsSearching(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    // Auto-fetch some users when opening modal
    useEffect(() => {
        if (isSearching && searchQuery === '') {
            handleSearch({ target: { value: '' } });
        }
    }, [isSearching]);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (currentChat) {
            fetchChatHistory(currentChat.id);
            const interval = setInterval(() => fetchChatHistory(currentChat.id), 3000);
            return () => clearInterval(interval);
        }
    }, [currentChat]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentChat) return;

        try {
            const res = await API.Messages.sendMessage({
                receiverId: currentChat.id,
                content: newMessage
            });
            setMessages([...messages, res.data]);
            setNewMessage('');
            fetchConversations(); // Update inbox snippet
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    const openChat = (conv) => {
        setCurrentChat({ id: conv.userId, username: conv.username, profileImageUrl: conv.profileImageUrl });
    };

    if (currentChat) {
        return (
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="h-full flex flex-col bg-black z-50 relative"
            >
                {/* Chat Header - Sleeker */}
                <div className="px-8 py-10 border-b border-white/5 flex items-center gap-6 bg-gradient-to-b from-black to-transparent">
                    <button onClick={() => setCurrentChat(null)} className="p-2 text-white/40 hover:text-[#ff006e] hover:bg-white/5 rounded-full transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div
                        onClick={() => navigateToProfile(currentChat?.id)}
                        className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center overflow-hidden ring-1 ring-white/5 cursor-pointer hover:border-[#ff006e]/50 transition-colors"
                    >
                        {currentChat.profileImageUrl ? (
                            <img src={currentChat.profileImageUrl.startsWith('http') ? currentChat.profileImageUrl : `http://localhost:5264${currentChat.profileImageUrl}`} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-[10px] text-white/20 font-mono italic uppercase">SIG</span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h3
                                onClick={() => navigateToProfile(currentChat?.id)}
                                className="text-white font-medium tracking-widest uppercase text-sm cursor-pointer hover:text-[#ff006e] transition-colors"
                            >
                                {currentChat.username}
                            </h3>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#4eda2c] animate-pulse shadow-[0_0_8px_#4eda2c]" />
                        </div>
                    </div>
                </div>

                {/* Chat History - Ultra-Sleek Futuristic Bubbles */}
                <div className="flex-1 overflow-y-auto px-12 py-10 space-y-10 no-scrollbar">
                    {messages.map((m, i) => {
                        const isMe = String(m.senderId) === String(user?.id || user?.Id);
                        return (
                            <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] px-6 py-4 rounded-t-2xl transition-all relative group ${isMe
                                    ? 'bg-gradient-to-br from-white/[0.06] to-transparent border-t border-r border-white/5 rounded-bl-2xl shadow-2xl'
                                    : 'bg-[#030303] border border-white/[0.02] rounded-br-2xl'
                                    }`}>
                                    {/* High-end holographic accent line */}
                                    {isMe && (
                                        <div className="absolute top-0 right-0 w-8 h-[1px] bg-gradient-to-l from-[#ff006e] to-transparent opacity-40" />
                                    )}

                                    <p className={`leading-relaxed text-[15px] font-light tracking-wide ${isMe ? 'text-white/90' : 'text-white/70'}`}>
                                        {m.content}
                                    </p>

                                    <div className="flex items-center gap-3 mt-5">
                                        <div className={`h-px w-4 bg-white/5 ${isMe ? 'ml-auto' : ''}`} />
                                        <span className={`text-[8px] font-mono tracking-[0.3em] uppercase ${isMe ? 'text-[#ff006e]/60' : 'text-white/20'}`}>
                                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Sleeker */}
                <form onSubmit={handleSendMessage} className="px-8 py-10 bg-gradient-to-t from-black to-transparent">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="ENCODE_DATA_PULSE..."
                            className="w-full bg-[#050505] border border-white/5 rounded-full py-4 px-8 text-white text-[12px] outline-none focus:border-[#ff006e]/20 pr-16 transition-all font-mono tracking-[0.1em] placeholder:text-white/5"
                        />
                        <button type="submit" className="absolute right-4 p-2.5 text-[#ff006e] hover:text-white transition-all transform active:scale-90">
                            <Send size={16} />
                        </button>
                    </div>
                    <div className="mt-4 flex justify-center">
                        <span className="text-[7px] text-white/10 font-mono tracking-[0.5em] uppercase">E2E_Encryption_Active // Relay_01</span>
                    </div>
                </form>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col bg-black relative overflow-hidden"
        >
            <AnimatePresence>
                {isSearching && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[60] bg-black/98 backdrop-blur-3xl p-8 flex flex-col"
                    >
                        {/* High-end decorative background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff006e]/5 blur-[120px] rounded-full pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#ff006e]/5 blur-[120px] rounded-full pointer-events-none" />

                        {/* Scanline Effect Overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

                        <div className="flex justify-between items-center mb-12 relative">
                            <div className="flex flex-col">
                                <h2 className="text-3xl font-light text-white tracking-[0.3em] uppercase leading-none opacity-90 italic">Subspace Sync</h2>
                                <div className="flex items-center gap-2 mt-3">
                                </div>
                            </div>
                            <button onClick={() => setIsSearching(false)} className="group p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all relative">
                                <X size={20} className="text-white opacity-40 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>

                        <div className="relative mb-12 group">
                            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                                <Search className="text-[#ff006e] opacity-40 group-focus-within:opacity-100 transition-opacity" size={20} />
                            </div>
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={handleSearch}
                                placeholder="IDENTIFY_TARGET_SIGNATURE..."
                                className="w-full bg-transparent border-b border-white/10 py-6 pl-14 pr-8 text-2xl text-white outline-none focus:border-[#ff006e]/40 transition-all font-light tracking-[0.1em] placeholder:text-white/5 uppercase"
                            />
                            {/* Decorative corner accents */}
                            <div className="absolute -left-[1px] -bottom-[1px] w-1 h-1 bg-[#ff006e]/40" />
                            <div className="absolute -right-[1px] -bottom-[1px] w-1 h-1 bg-[#ff006e]/40" />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar relative">
                            {isSearchingUsers ? (
                                <div className="text-center py-20 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 border border-[#ff006e]/20 border-t-[#ff006e] rounded-full animate-spin mb-4" />
                                    <div className="italic text-[#ff006e] animate-pulse font-mono tracking-widest uppercase text-[10px] opacity-60">Synchronizing Relay...</div>
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(u => (
                                    <div
                                        key={u.id || u.Id}
                                        className="group p-5 bg-white/[0.01] border border-transparent hover:border-white/5 rounded-xl flex items-center gap-6 transition-all cursor-pointer relative"
                                    >
                                        <div
                                            onClick={() => navigateToProfile(u.id || u.Id)}
                                            className="w-12 h-12 rounded-full overflow-hidden border border-white/5 group-hover:border-[#ff006e]/20 transition-all ring-1 ring-black shadow-2xl cursor-pointer"
                                        >
                                            {u.profilePictureUrl || u.ProfilePictureUrl ? (
                                                <img src={(u.profilePictureUrl || u.ProfilePictureUrl).startsWith('http') ? (u.profilePictureUrl || u.ProfilePictureUrl) : `http://localhost:5264${u.profilePictureUrl || u.ProfilePictureUrl}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[#222] bg-[#0a0a0a]"><User size={20} /></div>
                                            )}
                                        </div>
                                        <div onClick={() => navigateToProfile(u.id || u.Id)} className="cursor-pointer">
                                            <div className="text-white font-medium tracking-[0.1em] uppercase text-sm group-hover:text-[#ff006e] transition-colors">{u.username || u.Username}</div>
                                        </div>
                                        <div className="ml-auto flex items-center gap-4">
                                            <button
                                                onClick={(e) => handleSearchFollow(e, u.id || u.Id, u.isFollowing)}
                                                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${u.isFollowing
                                                    ? 'bg-[#ff006e] text-black shadow-[0_0_20px_rgba(255,0,110,0.3)]'
                                                    : 'bg-white/5 text-[#ff006e] border border-[#ff006e]/20 hover:bg-[#ff006e] hover:text-black'
                                                    }`}
                                            >
                                                {u.isFollowing ? 'Linked' : 'Link'}
                                            </button>
                                            <button
                                                onClick={() => startNewChat(u)}
                                                className="p-4 bg-[#ff006e]/10 text-[#ff006e] rounded-full hover:bg-[#ff006e] hover:text-black transition-all border border-[#ff006e]/20"
                                            >
                                                <Send size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : searchQuery.length > 0 ? (
                                <div className="text-center py-20">
                                    <div className="text-[#333] font-mono uppercase tracking-[0.5em] text-[9px] mb-2 opacity-40">No connection established</div>
                                    <div className="text-[#ff006e] font-mono uppercase tracking-[0.1em] text-[10px] opacity-60 italic">Signal Lost // Sector Cold</div>
                                </div>
                            ) : (
                                <div className="text-center py-20">
                                    <div className="text-[#222] font-mono uppercase tracking-[0.6em] text-[8px] animate-pulse">Awaiting Signal Input</div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inbox Header - Sleeker Layout */}
            <div className="px-10 pt-12 pb-8 flex justify-between items-center z-10 relative">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-light text-white tracking-[0.3em] uppercase leading-none opacity-90 italic">Comms_Hub</h1>
                        <div className="flex items-center gap-2 mt-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#4eda2c] animate-pulse shadow-[0_0_8px_#4eda2c]" />
                            <span className="text-[9px] text-[#4eda2c] font-mono tracking-[0.4em] opacity-40 uppercase">Status: Online</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setIsSearching(true)}
                    className="p-3 rounded-xl border border-white/5 hover:border-[#ff006e]/40 bg-white/[0.02] hover:bg-[#ff006e]/10 transition-all text-[#ff006e] group active:scale-95 shadow-lg shadow-[#ff006e]/5"
                    title="Initiate Uplink"
                >
                    <Edit size={16} className="group-hover:rotate-12 transition-all" />
                </button>
            </div>

            {/* Conversation List - Sleeker Minimal Layout */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-1 no-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 py-20">
                        <div className="w-1 h-8 bg-gradient-to-b from-[#ff006e] to-transparent animate-[loading-pulse_1s_infinite_linear]" />
                        <div className="text-[9px] text-[#ff006e] font-mono tracking-[0.5em] mt-6 opacity-40 uppercase italic">Calibrating_Frequencies</div>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center p-12">
                        <div className="text-[#222] font-mono uppercase tracking-[0.6em] text-[9px] border-b border-white/5 pb-4 mb-6">No data pulses found</div>
                        <button
                            onClick={() => setIsSearching(true)}
                            className="text-[#ff006e] text-[9px] font-mono uppercase tracking-[0.3em] hover:text-white transition-all opacity-40 hover:opacity-100 flex items-center gap-2"
                        >
                            <span className="h-px w-8 bg-[#ff006e]/20" /> Establish Bridge <span className="h-px w-8 bg-[#ff006e]/20" />
                        </button>
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <div
                            key={conv.userId}
                            onClick={() => openChat(conv)}
                            className="group p-4 rounded-xl hover:bg-white/[0.01] transition-all flex gap-6 cursor-pointer relative border border-transparent hover:border-white/5 mx-2"
                        >
                            <div className="w-12 h-12 rounded-full ring-1 ring-white/5 flex items-center justify-center overflow-hidden group-hover:ring-[#ff006e]/30 transition-all shadow-2xl relative bg-black">
                                {conv.profileImageUrl ? (
                                    <img src={conv.profileImageUrl.startsWith('http') ? conv.profileImageUrl : `http://localhost:5264${conv.profileImageUrl}`} alt="User" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                ) : (
                                    <span className="font-mono text-white/20 text-[10px] tracking-tighter">{conv.username?.[0]?.toUpperCase()}</span>
                                )}
                                {conv.unreadCount > 0 && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ff006e] rounded-full border-2 border-black animate-pulse" />}
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="text-sm font-medium text-white/80 group-hover:text-white tracking-[0.05em] transition-colors uppercase">{conv.username}</h3>
                                    <span className={`text-[10px] font-mono ${conv.unreadCount > 0 ? 'text-[#ff006e] font-bold' : 'text-white/60'}`}>
                                        {new Date(conv.timestamp || conv.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-[11px] truncate pr-8 ${conv.unreadCount > 0 ? 'text-white font-medium' : 'text-white/30'} font-light tracking-wide`}>
                                        {conv.unreadCount > 0 && <span className="text-[#ff006e] mr-1">/</span>}
                                        {conv.content || conv.Content}
                                    </p>
                                    {conv.unreadCount > 0 && (
                                        <div className="shrink-0 text-[10px] font-mono text-[#ff006e] opacity-80">
                                            ({conv.unreadCount})
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Sub-footer hint - Minimized */}
            <div className="px-10 py-8 text-center relative">
                <div className="flex items-center justify-center gap-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                    <p className="text-[7px] font-mono uppercase tracking-[0.8em] text-white/10">Subspace_Link_Encrypted // Sector_Prime</p>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </div>
            </div>
        </motion.div>
    );
};
