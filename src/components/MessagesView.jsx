import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Edit, MoreHorizontal, Phone, Video } from 'lucide-react';

const MESSAGES = [
    { id: 1, user: 'Mon Coeur', message: 'So, flights are booked! 😌 We\'re officially going...', time: '14:23', unread: 0, online: true },
    { id: 2, user: 'Sugar 💙 Glider', message: 'I can\'t wait. Okay, final packing. See you at 17:30! 💕', time: '13:07', unread: 0, online: false },
    { id: 3, user: 'Camille LaRue', message: 'RIGHT?? It\'s one of those books that sticks with you...', time: '17:16', unread: 5, online: true },
    { id: 4, user: 'Michel Laurent', message: 'Oh man. The eternal question. I think Kundera argues...', time: '17:11', unread: 1, online: false },
    { id: 5, user: 'Vamp_Grl', message: 'Did you check the new synth patch?', time: 'Yesterday', unread: 0, online: false },
    { id: 6, user: 'Neon_Raver', message: 'Collab on the next track?', time: 'Monday', unread: 0, online: true },
];

const FAVORITES = [
    { id: 1, name: 'Mon Coeur', online: true },
    { id: 2, name: 'Anna & C..', online: true },
    { id: 3, name: 'Anna De...', online: false },
    { id: 4, name: 'Erin Bro...', online: true },
    { id: 5, name: 'Ramy M...', online: false },
];

export const MessagesView = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col bg-black relative overflow-hidden"
        >
            {/* Header */}
            <div className="px-6 pt-6 pb-2 flex justify-between items-center z-10 bg-black/90 backdrop-blur-sm sticky top-0">
                <h1 className="text-4xl font-black text-white tracking-tighter">Chats</h1>
                <button className="text-[#ff006e] font-bold text-sm hover:text-white transition-colors">Edit</button>
            </div>

            {/* Tabs / Filters */}
            <div className="px-6 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
                <button className="px-4 py-1.5 rounded-full bg-[#ff006e] text-white text-xs font-bold">All</button>
                <button className="px-4 py-1.5 rounded-full bg-[#1a1a1a] text-[#666] text-xs font-bold hover:bg-[#333]">Inner circle</button>
                <button className="px-4 py-1.5 rounded-full bg-[#1a1a1a] text-[#666] text-xs font-bold hover:bg-[#333]">Design <span className="text-[#ff006e]">13</span></button>
            </div>

            {/* Message List (Scrollable Area - Black Background) */}
            <div
                className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 no-scrollbar"
                style={{ scrollbarWidth: 'none' }}
            >
                {MESSAGES.map((msg) => (
                    <div key={msg.id} className="group p-3 rounded-2xl hover:bg-[#111] transition-colors flex gap-4 cursor-pointer">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-14 h-14 rounded-full bg-[#222] border border-[#333] flex items-center justify-center overflow-hidden">
                                <span className="font-black text-white text-sm">{msg.user.substring(0, 2).toUpperCase()}</span>
                            </div>
                            {msg.online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#4eda2c] border-2 border-black rounded-full" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center border-b border-[#2221] pb-1">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className="text-[15px] font-bold text-white truncate pr-2">{msg.user}</h3>
                                <div className="flex items-center gap-1">
                                    {/* Double check icon mock */}
                                    {msg.unread === 0 && <span className="text-[#ff006e] text-[10px]">✓✓</span>}
                                    <span className={`text-[11px] ${msg.unread > 0 ? 'text-[#ff006e] font-bold' : 'text-[#666]'}`}>{msg.time}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-start">
                                <p className={`text-[13px] truncate pr-4 leading-snug ${msg.unread > 0 ? 'text-white font-medium' : 'text-[#888]'}`}>
                                    {msg.message}
                                </p>
                                {msg.unread > 0 && (
                                    <div className="shrink-0 w-5 h-5 bg-[#ff006e] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_10px_#ff006e60]">
                                        {msg.unread}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Favorites Section (Minimalist Black with Pink Contour) */}
            <div className="bg-black border-t border-[#ff006e] rounded-t-[30px] p-6 pb-5 shadow-[0_-5px_30px_rgba(255,0,110,0.1)] z-20">
                <div className="flex justify-between items-center mb-4 text-[#ff006e]">
                    <h2 className="text-xs font-black uppercase tracking-widest">Favorites</h2>
                    <MoreHorizontal size={16} />
                </div>
                <div
                    className="flex gap-4 overflow-x-auto pb-4 no-scrollbar"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {FAVORITES.map((fav) => (
                        <div key={fav.id} className="flex flex-col items-center gap-2 shrink-0 w-[4.5rem]">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-[20px] bg-[#111] border border-[#ff006e]/30 flex items-center justify-center shadow-lg transform rotate-2 hover:rotate-0 transition-transform cursor-pointer group hover:border-[#ff006e]">
                                    <span className="font-black text-white text-sm group-hover:text-[#ff006e]">{fav.name.substring(0, 2).toUpperCase()}</span>
                                </div>
                                {fav.online && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#4eda2c] border-2 border-black rounded-full" />}
                            </div>
                            <span className="text-[10px] font-bold text-[#666] truncate max-w-full">{fav.name}</span>
                        </div>
                    ))}
                    {/* Add Button */}
                    <div className="flex flex-col items-center gap-2 shrink-0 w-[4.5rem]">
                        <div className="w-14 h-14 rounded-[20px] bg-[#111] border border-[#333] border-dashed flex items-center justify-center cursor-pointer hover:border-[#ff006e]/50 hover:text-[#ff006e] transition-colors text-[#444]">
                            <span className="font-black text-xl">+</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#444]">Add New</span>
                    </div>
                </div>
            </div>

        </motion.div>
    );
};
