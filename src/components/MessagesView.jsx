import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Search, Edit, MoreHorizontal, Phone, Volume2, Send, ChevronLeft, User, X, Heart } from 'lucide-react';
import API from '../services/api';
import { API_BASE_URL } from '../constants';

export const MessagesView = ({ user, navigateToProfile, initialChatUser }) => {
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
        if (initialChatUser) {
            setCurrentChat({
                id: initialChatUser.id || initialChatUser.Id,
                username: initialChatUser.username || initialChatUser.Username,
                profileImageUrl: initialChatUser.profilePictureUrl || initialChatUser.ProfilePictureUrl || initialChatUser.profileImageUrl || initialChatUser.ProfileImageUrl
            });
        }
    }, [initialChatUser]);

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
        setCurrentChat({
            id: conv.userId || conv.UserId,
            username: conv.username || conv.Username,
            profileImageUrl: conv.profileImageUrl || conv.ProfileImageUrl
        });
    };

    if (currentChat) {
        return (
            <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col bg-black z-50 relative"
            >
                {/* Terminal Window Header */}
                <div className="px-6 py-4 border-b border-white/10 bg-black flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentChat(null)} className="p-1 hover:bg-[#ff006e] hover:text-black text-[#ff006e] transition-all border border-[#ff006e]/20">
                            <ChevronLeft size={14} />
                        </button>
                        <div className="text-[10px] font-mono text-white tracking-[0.2em] font-black uppercase">
                            :: {currentChat.username} ::
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#4eda2c] animate-pulse" />
                        <span className="text-[9px] text-[#4eda2c]/60 font-mono font-black">STABLE_LINK</span>
                    </div>
                </div>

                {/* System Message Header */}
                <div className="px-8 pt-6 pb-2 font-mono text-[10px] uppercase tracking-wider text-white/30 italic">
                    -- beginning transmission with {currentChat.username} --
                </div>

                {/* Terminal Message Log */}
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-1 no-scrollbar bg-black font-mono">
                    {messages.map((m, i) => {
                        const isMe = String(m.senderId || m.SenderId) === String(user?.id || user?.Id);
                        const timestamp = m.timestamp || m.Timestamp;
                        const content = m.content || m.Content;
                        const otherUserInitial = (currentChat.username || "??").toUpperCase().slice(0, 2);

                        return (
                            <div key={m.id || i} className="group flex gap-3 text-[13px] leading-relaxed">
                                <span className="text-white/20 shrink-0 select-none">
                                    [{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}]
                                </span>
                                <div className="flex-1">
                                    <span
                                        onClick={() => !isMe && navigateToProfile(m.senderId || m.SenderId)}
                                        className={`font-black uppercase tracking-tight cursor-pointer mr-2 ${isMe ? 'text-[#ff006e]' : 'text-cyan-400 hover:underline'}`}
                                    >
                                        [{isMe ? 'YOU' : otherUserInitial}]
                                    </span>
                                    <span className={isMe ? 'text-white/90' : 'text-white/70'}>
                                        {content}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Terminal Input Area */}
                <form onSubmit={handleSendMessage} className="px-6 py-6 bg-black border-t border-white/5">
                    <div className="relative flex items-center">
                        <div className="absolute left-4 text-[#ff006e] font-mono text-xs select-none">&gt;</div>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="AWAITING_INPUT..."
                            className="w-full bg-[#080808] border border-white/5 py-4 pl-10 pr-16 text-white text-[13px] outline-none focus:border-[#ff006e]/40 transition-all font-mono tracking-widest placeholder:text-white/5"
                        />
                        <button
                            type="submit"
                            className="absolute right-4 px-4 py-2 bg-[#ff006e]/10 text-[#ff006e] border border-[#ff006e]/20 hover:bg-[#ff006e] hover:text-black transition-all font-mono text-[10px] font-black uppercase tracking-widest"
                        >
                            SEND
                        </button>
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

                        <div className="flex justify-between items-center mb-8 relative">
                            <div>
                                <div className="text-[10px] font-black text-[#ff006e]/50 uppercase tracking-[0.3em] font-mono mb-1">// SUBSPACE_SYNC</div>
                                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">NEW_TRANSMISSION</h2>
                            </div>
                            <button onClick={() => { setIsSearching(false); setSearchQuery(''); setSearchResults([]); }} className="p-2 border border-white/10 hover:border-[#ff006e]/40 text-white/40 hover:text-white transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="relative mb-8 group">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                <Search className="text-[#ff006e]/40 group-focus-within:text-[#ff006e] transition-colors" size={16} />
                            </div>
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={handleSearch}
                                placeholder="IDENTIFY_TARGET..."
                                className="w-full bg-black border border-white/10 py-4 pl-12 pr-6 text-white text-sm outline-none focus:border-[#ff006e]/40 transition-all font-mono tracking-widest uppercase placeholder:text-white/10 placeholder:tracking-widest"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar relative">
                            {isSearchingUsers ? (
                                <div className="text-center py-16 flex flex-col items-center justify-center">
                                    <div className="w-6 h-6 border border-[#ff006e]/20 border-t-[#ff006e] animate-spin mb-4" />
                                    <div className="text-[#ff006e]/40 font-mono tracking-widest uppercase text-[10px]">SYNC_RELAY...</div>
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.filter(u => u && (u.id || u.Id)).map(u => (
                                    <div
                                        key={u.id || u.Id}
                                        className="group p-4 border border-white/5 hover:border-[#ff006e]/20 flex items-center gap-4 transition-all cursor-pointer"
                                    >
                                        <div
                                            onClick={() => navigateToProfile(u.id || u.Id)}
                                            className="w-10 h-10 overflow-hidden border border-white/10 group-hover:border-[#ff006e]/30 transition-all cursor-pointer flex-shrink-0"
                                        >
                                            {u.profilePictureUrl || u.ProfilePictureUrl ? (
                                                <img src={(u.profilePictureUrl || u.ProfilePictureUrl).startsWith('http') ? (u.profilePictureUrl || u.ProfilePictureUrl) : `${API_BASE_URL}${u.profilePictureUrl || u.ProfilePictureUrl}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/20 bg-black"><User size={16} /></div>
                                            )}
                                        </div>
                                        <div onClick={() => navigateToProfile(u.id || u.Id)} className="cursor-pointer flex-1">
                                            <div className="text-white font-black tracking-widest uppercase text-xs group-hover:text-[#ff006e] transition-colors">{u.username || u.Username}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={(e) => handleSearchFollow(e, u.id || u.Id, u.isFollowing)}
                                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${u.isFollowing
                                                    ? 'bg-[#ff006e] text-black'
                                                    : 'border border-[#ff006e]/30 text-[#ff006e]/60 hover:bg-[#ff006e] hover:text-black'
                                                    }`}
                                            >
                                                {u.isFollowing ? 'LINKED' : 'LINK'}
                                            </button>
                                            <button
                                                onClick={() => startNewChat(u)}
                                                className="p-2 border border-[#ff006e]/20 text-[#ff006e]/60 hover:bg-[#ff006e]/10 hover:text-[#ff006e] transition-all"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : searchQuery.length > 0 ? (
                                <div className="text-center py-16">
                                    <div className="text-white/20 font-mono uppercase tracking-widest text-[10px] mb-1">&gt; NO_CONNECTION_ESTABLISHED</div>
                                    <div className="text-[#ff006e]/40 font-mono uppercase tracking-widest text-[10px]">SIGNAL_LOST :: SECTOR_COLD</div>
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="text-white/15 font-mono uppercase tracking-widest text-[10px] animate-pulse">&gt; AWAITING_SIGNAL_INPUT</div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inbox Header */}
            <div className="px-8 pt-8 pb-6 flex justify-between items-center z-10 relative border-b border-white/5">
                <div>
                    <div className="text-[10px] font-black text-[#ff006e]/50 uppercase tracking-[0.3em] font-mono mb-1">// COMMS_HUB</div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">TRANSMISSIONS</h1>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-[#4eda2c] animate-pulse shadow-[0_0_8px_#4eda2c]" />
                            <span className="text-[9px] text-[#4eda2c]/50 font-mono uppercase tracking-widest">ONLINE</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setIsSearching(true)}
                    className="p-2.5 border border-white/10 hover:border-[#ff006e]/40 text-[#ff006e]/60 hover:text-[#ff006e] transition-all"
                    title="New Transmission"
                >
                    <Edit size={15} />
                </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto pb-4 no-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48">
                        <div className="w-px h-8 bg-[#ff006e]/40 animate-pulse" />
                        <div className="text-[10px] text-[#ff006e]/40 font-mono tracking-widest mt-4 uppercase">CALIBRATING_FREQ...</div>
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center px-8">
                        <div className="text-white/15 font-mono uppercase tracking-widest text-[10px] mb-4">&gt; NO_DATA_PULSES_FOUND</div>
                        <button
                            onClick={() => setIsSearching(true)}
                            className="text-[#ff006e]/50 text-[10px] font-mono uppercase tracking-widest hover:text-[#ff006e] transition-all flex items-center gap-2"
                        >
                            <span className="h-px w-6 bg-[#ff006e]/20" /> ESTABLISH_BRIDGE <span className="h-px w-6 bg-[#ff006e]/20" />
                        </button>
                    </div>
                ) : (
                    conversations.filter(c => c && (c.userId || c.UserId)).map((conv) => {
                        const cid = conv.userId || conv.UserId;
                        const cusername = conv.username || conv.Username;
                        const cimg = conv.profileImageUrl || conv.ProfileImageUrl;
                        const cunread = conv.unreadCount || conv.UnreadCount;
                        const ctimestamp = conv.timestamp || conv.Timestamp;
                        const ccontent = conv.content || conv.Content;

                        return (
                            <div
                                key={cid}
                                onClick={() => openChat(conv)}
                                className={`group px-6 py-4 flex gap-4 cursor-pointer relative transition-all border-b border-white/[0.03] hover:bg-white/[0.02] ${cunread > 0 ? 'border-l-2 border-l-[#ff006e]/60' : 'border-l-2 border-l-transparent'
                                    }`}
                            >
                                <div className="w-10 h-10 flex-shrink-0 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-[#ff006e]/30 transition-all relative bg-black">
                                    {cimg ? (
                                        <img src={cimg.startsWith('http') ? cimg : `${API_BASE_URL}${cimg}`} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-mono text-white/20 text-xs font-black">{cusername?.[0]?.toUpperCase()}</span>
                                    )}
                                    {cunread > 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-[#ff006e] border border-black" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className={`text-xs font-black tracking-widest uppercase transition-colors ${cunread > 0 ? 'text-white' : 'text-white/60 group-hover:text-white'
                                            }`}>{cusername}</h3>
                                        <span className={`text-[9px] font-mono ${cunread > 0 ? 'text-[#ff006e]' : 'text-white/20'}`}>
                                            {new Date(ctimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-[11px] truncate pr-4 font-mono ${cunread > 0 ? 'text-white/70' : 'text-white/25'
                                            }`}>
                                            {cunread > 0 && <span className="text-[#ff006e] mr-1">&gt;</span>}
                                            {ccontent}
                                        </p>
                                        {cunread > 0 && (
                                            <div className="shrink-0 text-[9px] font-mono font-black text-[#ff006e] bg-[#ff006e]/10 px-1">
                                                {cunread}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-white/5 text-center">
                <p className="text-[9px] font-mono uppercase tracking-widest text-white/10">SUBSPACE_LINK_ENCRYPTED :: SECTOR_PRIME</p>
            </div>
        </motion.div>
    );
};
