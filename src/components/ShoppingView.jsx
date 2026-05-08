import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ExternalLink, ArrowRight, ShoppingCart, Tag, Star } from 'lucide-react';
import { getMediaUrl } from '../constants';

const ARTIST_SHOPS = [
    {
        id: 1,
        artistName: "FATALE_CORE",
        shopName: "OFFICIAL_MERCH_HUB",
        url: "https://fatale-frequencia.creator-spring.com/",
        image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop",
        desc: "Neural-link compatible apparel and system hardware."
    },
    {
        id: 2,
        artistName: "NEON_WITCH",
        shopName: "HEX_WARE_COLLECTIVE",
        url: "#",
        image: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1974&auto=format&fit=crop",
        desc: "Custom synth modules and digital spellbooks."
    },
    {
        id: 3,
        artistName: "VOID_RUNNER",
        shopName: "SIGNAL_GEAR_SHOP",
        url: "#",
        image: "https://images.unsplash.com/photo-1614850523296-e8c041de4398?q=80&w=2070&auto=format&fit=crop",
        desc: "Encrypted data drives and street-ready tactical gear."
    }
];

const ShoppingView = () => {
    return (
        <div className="h-full w-full overflow-y-auto no-scrollbar bg-black p-6 lg:p-12">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto space-y-12 pb-32"
            >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#ff006e]/20 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-[#ff006e]">
                            <ShoppingBag size={24} className="animate-pulse" />
                            <h1 className="text-4xl font-black tracking-tighter uppercase italic">MARKET_SIGNAL</h1>
                        </div>
                        <p className="text-xs mono text-white/40 tracking-[0.3em] uppercase">Authorized_Merchant_Network // v1.0.4</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] mono text-white/20 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-sm border border-white/5">
                        <Tag size={12} className="text-[#ff006e]" />
                        <span>Active_Vending_Nodes: {ARTIST_SHOPS.length}</span>
                    </div>
                </div>

                {/* Shop Grid */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8">
                    {ARTIST_SHOPS.map((shop, idx) => (
                        <motion.div
                            key={shop.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group relative bg-[#0a0a0a] border border-white/5 hover:border-[#ff006e]/40 transition-all duration-500 overflow-hidden break-inside-avoid mb-8 inline-block w-full"
                        >
                            {/* Image Background */}
                            <div className="w-full overflow-hidden relative">
                                <img 
                                    src={shop.image} 
                                    alt={shop.shopName} 
                                    className="w-full h-auto object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                                
                                {/* Badge */}
                                <div className="absolute top-4 left-4 bg-[#ff006e] text-black px-2 py-1 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_#ff006e]">
                                    <Star size={10} />
                                    VERIFIED_NODE
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <div className="text-[10px] mono text-[#ff006e] font-black uppercase tracking-widest">{shop.artistName}</div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter group-hover:text-[#ff006e] transition-colors">{shop.shopName}</h3>
                                </div>
                                
                                <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-wider h-8 line-clamp-2">
                                    {shop.desc}
                                </p>

                                <a 
                                    href={shop.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 group-hover:bg-[#ff006e] group-hover:border-[#ff006e] transition-all duration-300"
                                >
                                    <span className="text-[10px] font-black text-white group-hover:text-black uppercase tracking-[0.2em]">ACCESS_STORE</span>
                                    <ArrowRight size={14} className="text-[#ff006e] group-hover:text-black transition-colors" />
                                </a>
                            </div>

                            {/* Scanlines Effect */}
                            <div className="absolute inset-0 bg-scanlines opacity-[0.03] pointer-events-none" />
                        </motion.div>
                    ))}

                    {/* Placeholder for expansion */}
                    <div className="border border-dashed border-white/10 flex flex-col items-center justify-center p-12 gap-4 opacity-30 hover:opacity-100 transition-opacity cursor-pointer group break-inside-avoid mb-8 inline-block w-full">
                        <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#ff006e] group-hover:text-[#ff006e] transition-all">
                            <ShoppingCart size={20} />
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] font-black uppercase tracking-widest">SUBMIT_STORE</div>
                            <div className="text-[8px] mono mt-1">OPEN_FOR_ARTISTS [+]</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ShoppingView;
