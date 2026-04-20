import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HUDWidget = ({ title, children, icon, searchQuery }) => {
    const [isRebooting, setIsRebooting] = useState(false);

    // Trigger reboot effect when search query changes
    useEffect(() => {
        if (!searchQuery) return;
        
        setIsRebooting(true);
        const timer = setTimeout(() => setIsRebooting(false), 800); // 800ms reboot sequence
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <div className="relative w-full h-full flex flex-col group/widget select-none overflow-hidden">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-2">
                    <div className="text-[#ff006e] opacity-80 group-hover/widget:opacity-100 transition-opacity">
                        {icon}
                    </div>
                    <div className="text-[10px] font-black tracking-[0.2em] text-[#ff006e]/80 uppercase group-hover/widget:text-[#ff006e] transition-colors">
                        {title}
                    </div>
                </div>
                <div className="flex gap-1">
                    <div className="w-1 h-1 bg-[#ff006e]/20" />
                    <div className="w-1 h-1 bg-[#ff006e]/40" />
                    <div className="w-1 h-1 bg-[#ff006e]/60" />
                </div>
            </div>

            {/* Main Content Container with Glassmorphism */}
            <div className={`flex-1 relative border border-[#ff006e]/10 bg-black/40 backdrop-blur-md transition-all duration-500 overflow-hidden ${isRebooting ? 'border-[#ff006e]/60 bg-[#ff006e]/5 ring-1 ring-[#ff006e]/20' : ''}`}>
                
                {/* Corner Brackets */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff006e]/30 group-hover/widget:border-[#ff006e]/60 transition-colors" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#ff006e]/30 group-hover/widget:border-[#ff006e]/60 transition-colors" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#ff006e]/30 group-hover/widget:border-[#ff006e]/60 transition-colors" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff006e]/30 group-hover/widget:border-[#ff006e]/60 transition-colors" />

                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none z-10 opacity-10">
                    <div className="w-full h-1 bg-[#ff006e]/20 animate-scanlines" />
                </div>

                {/* Content Area with Reboot Animation */}
                <motion.div 
                    animate={isRebooting ? { 
                        opacity: [1, 0, 1, 0.4, 1],
                        scale: [1, 1.01, 0.99, 1],
                        filter: ['brightness(1) contrast(1)', 'brightness(2) contrast(1.5)', 'brightness(0.5) contrast(1)', 'brightness(1) contrast(1)']
                    } : { opacity: 1 }}
                    transition={{ duration: 0.6, times: [0, 0.2, 0.4, 0.8, 1] }}
                    className="h-full w-full p-3 custom-scrollbar overflow-y-auto relative z-0"
                >
                    {children}

                    {/* Terminal Static Overlay during reboot */}
                    <AnimatePresence>
                        {isRebooting && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.15 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 pointer-events-none bg-white mix-blend-overlay"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                                }}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Footer Status */}
                <div className="absolute bottom-1 right-2 flex items-center gap-2 pointer-events-none">
                    <div className="text-[7px] text-[#ff006e] opacity-20 uppercase font-light tracking-tighter">
                        {isRebooting ? "RECALIBRATING_SIGNAL..." : "ENCRYPTED_LINK_ACTIVE"}
                    </div>
                    <div className={`w-1 h-1 rounded-full ${isRebooting ? 'bg-amber-500 animate-pulse' : 'bg-[#ff006e]/40'}`} />
                </div>
            </div>
        </div>
    );
};

export default HUDWidget;
