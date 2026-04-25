import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HUDWidget = ({ title, children, icon, searchQuery, activeColor }) => {
    const [isRebooting, setIsRebooting] = useState(false);

    // Trigger reboot effect when search query changes
    useEffect(() => {
        setIsRebooting(true);
        const timer = setTimeout(() => setIsRebooting(false), 800); // 800ms reboot sequence
        return () => clearTimeout(timer);
    }, [searchQuery]);

    return (
        <div className="relative w-full h-full flex flex-col group/widget select-none overflow-hidden">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-2">
                    <div 
                        className={`transition-all duration-300 ${activeColor ? 'scale-110 drop-shadow-[0_0_8px_var(--widget-accent)]' : 'text-[#ff006e] opacity-80 group-hover/widget:opacity-100'}`}
                        style={activeColor ? { color: activeColor, '--widget-accent': activeColor } : {}}
                    >
                        {icon}
                    </div>
                    <div 
                        className={`text-[10px] font-black tracking-[0.2em] uppercase transition-colors ${activeColor ? '' : 'text-[#ff006e]/80 group-hover/widget:text-[#ff006e]'}`}
                        style={activeColor ? { color: activeColor } : {}}
                    >
                        {title}
                    </div>
                </div>
                <div className="flex gap-1">
                    <div className="w-1 h-1 transition-colors" style={{ backgroundColor: activeColor ? `${activeColor}66` : 'rgba(255,0,110,0.2)' }} />
                    <div className="w-1 h-1 transition-colors" style={{ backgroundColor: activeColor ? `${activeColor}AA` : 'rgba(255,0,110,0.4)' }} />
                    <div className="w-1 h-1 transition-colors" style={{ backgroundColor: activeColor ? activeColor : 'rgba(255,0,110,0.6)' }} />
                </div>
            </div>

            {/* Main Content Container with Glassmorphism */}
            <div 
                className={`flex-1 relative border transition-all duration-500 overflow-hidden bg-black backdrop-blur-md ${isRebooting ? 'border-[#ff006e]/60 bg-[#ff006e]/5 ring-1 ring-[#ff006e]/20' : ''}`}
                style={activeColor ? { 
                    borderColor: `${activeColor}99`, 
                    boxShadow: `0 0 20px ${activeColor}26`,
                    outline: `1px solid ${activeColor}4D`
                } : { borderColor: 'rgba(255,0,110,0.1)' }}
            >
                
                {/* Top Content Labeling */}
                {activeColor && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                        <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: activeColor }} />
                        <span className="text-[7px] font-black tracking-widest uppercase opacity-60" style={{ color: activeColor }}>SIGNAL_LOCKED</span>
                    </div>
                )}

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
                        opacity: [1, 0.6, 1, 0.8, 1],
                        scale: [1, 1.005, 0.995, 1],
                        filter: ['brightness(1)', 'brightness(1.5)', 'brightness(0.9)', 'brightness(1)']
                    } : { opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
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
                    <div className="text-[7px] text-[#ff006e] opacity-20 uppercase font-light tracking-tighter transition-opacity duration-300">
                        {isRebooting ? "RECALIBRATING_SIGNAL..." : ""}
                    </div>
                    <div className={`w-1 h-1 rounded-full ${isRebooting ? 'bg-amber-500 animate-pulse' : 'bg-[#ff006e]/20'}`} />
                </div>
            </div>
        </div>
    );
};

export default HUDWidget;
