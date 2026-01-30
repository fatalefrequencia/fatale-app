import React from 'react';
import { motion } from 'framer-motion';
import { Search, Music, Disc, User, Play, Heart } from 'lucide-react';

const DISCOVERY_ITEMS = [
    { id: 1, title: 'Sophia Mitchell', type: 'Artist', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=600&auto=format&fit=crop', color: '#e0e020', span: 'col-span-1 row-span-2' },
    { id: 2, title: 'Neon Nights', type: 'Playlist', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=600&auto=format&fit=crop', color: '#ff006e', span: 'col-span-1 row-span-1' },
    { id: 3, title: 'Ava Sullivan', type: 'Artist', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop', color: '#ffffff', span: 'col-span-1 row-span-2' },
    { id: 4, title: 'William Brown', type: 'Album', image: 'https://images.unsplash.com/photo-1514525253440-b393452e233e?q=80&w=600&auto=format&fit=crop', color: '#a020f0', span: 'col-span-1 row-span-1' },
    { id: 5, title: 'Retro Glitch', type: 'Mix', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop', color: '#00ffff', span: 'col-span-1 row-span-1' },
    { id: 6, title: 'Deep Focus', type: 'Playlist', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop', color: '#ff006e', span: 'col-span-1 row-span-2' },
    { id: 7, title: 'Oliver Ben', type: 'Artist', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop', color: '#ffffff', span: 'col-span-1 row-span-1' },
    { id: 8, title: 'System Error', type: 'Track', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop', color: '#e0e020', span: 'col-span-1 row-span-1' },
];

const FILTERS = ['All', 'Artists', 'Playlists', 'Albums', 'Tracks', 'Mixes'];

export const DiscoveryView = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full bg-black relative flex flex-col pt-4 "
        >
            {/* Floating Top Bar */}
            <div className="absolute top-4 left-4 right-4 z-20 flex gap-3">
                <div className="flex-1 bg-white/10 backdrop-blur-md rounded-full flex items-center px-4 py-3 border border-white/10 shadow-lg">
                    <Search size={18} className="text-white/60 mr-3" />
                    <input
                        type="text"
                        placeholder="Start Search"
                        className="bg-transparent border-none outline-none text-white text-sm font-bold placeholder-white/40 w-full"
                    />
                </div>
                <button className="bg-white/10 backdrop-blur-md rounded-full px-5 py-3 text-white text-xs font-bold border border-white/10 shadow-lg whitespace-nowrap">
                    Electro
                </button>
                <button className="bg-[#ff006e] backdrop-blur-md rounded-full px-5 py-3 text-white text-xs font-black border border-[#ff006e] shadow-lg shadow-[#ff006e]/20 whitespace-nowrap">
                    Featured
                </button>
            </div>

            {/* Scrollable Grid */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-2 pt-20 pb-24">
                <div className="grid grid-cols-2 gap-2">
                    {DISCOVERY_ITEMS.map((item) => (
                        <div
                            key={item.id}
                            className={`relative rounded-2xl overflow-hidden group aspect-[3/4] ${item.id % 3 === 0 ? 'row-span-2' : ''}`}
                        >
                            <img
                                src={item.image}
                                alt={item.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h3 className="text-xl font-black text-white leading-none mb-1 shadow-black drop-shadow-lg">{item.title}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-white/60 tracking-widest">{item.type}</span>
                                    {item.type === 'Artist' && <span className="text-[10px] text-[#ff006e]">★</span>}
                                </div>
                            </div>

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <button className="w-12 h-12 bg-[#ff006e] rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform delay-75 shadow-[0_0_20px_#ff006e]">
                                    <Play fill="black" size={20} className="ml-1" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </motion.div>
    );
};
