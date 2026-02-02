// UPDATED SECTIONS FOR DISCOVERYMAPVIEW.JSX
// This file contains the corrected viewport logic and premium HUD design

// ============================================
// SECTION 1: Updated viewport calculation (lines 212-252)
// Replace the existing useEffect with this:
// ============================================

// Calculate viewport-based stats whenever map position or items change
const updateLocalStats = () => {
    if (!mapItems.length) return;

    const currentMapX = mapX.get();
    const currentMapY = mapY.get();
    const currentZoom = zoom.get();

    // With origin-center, map center (5000, 5000) is at screen center
    // Items are positioned relative to map center
    const visibleTracks = mapItems.filter(item => {
        if (item.category !== 'Track') return false;

        // Calculate item's screen position
        // The map container has origin-center, so we need to project correctly
        const itemX = item.x - CENTER_OFFSET_X;
        const itemY = item.y - CENTER_OFFSET_Y;

        // Project to screen space accounting for zoom and pan
        const screenX = currentMapX + (itemX * currentZoom);
        const screenY = currentMapY + (itemY * currentZoom);

        // Check if within viewport (with buffer)
        const buffer = 200;
        return screenX >= -buffer && screenX <= window.innerWidth + buffer &&
            screenY >= -buffer && screenY <= window.innerHeight + buffer;
    });

    const totalScans = visibleTracks.reduce((sum, track) => {
        return sum + (track.playCount || track.PlayCount || 0);
    }, 0);

    setLocalStats({
        scans: totalScans,
        tracks: visibleTracks.length
    });
};

// Update stats on motion value changes
useMotionValueEvent(mapX, "change", updateLocalStats);
useMotionValueEvent(mapY, "change", updateLocalStats);
useMotionValueEvent(zoom, "change", updateLocalStats);

useEffect(() => {
    updateLocalStats();
}, [mapItems]);


// ============================================
// SECTION 2: Premium HUD Design (lines 311-380)
// Replace the existing HUD section with this:
// ============================================

{/* Local Stats HUD (Top Right) - Premium Minimalist */ }
<div className="absolute top-6 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
    <motion.div
        initial={false}
        animate={{
            width: isStatsCollapsed ? "56px" : "300px",
            opacity: 1
        }}
        transition={{ type: "spring", stiffness: 250, damping: 30 }}
        className="relative bg-black/40 backdrop-blur-3xl ring-1 ring-white/5 rounded-[2rem] shadow-2xl pointer-events-auto overflow-hidden group border border-white/5 hover:border-[#ff006e]/30 transition-colors duration-500"
    >
        {/* Glass Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

        {/* Header / Toggle */}
        <div
            onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
            className="px-2 py-2 flex items-center justify-end cursor-pointer transition-all duration-300"
        >
            <AnimatePresence mode="wait">
                {!isStatsCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex flex-col items-end mr-4 flex-1"
                    >
                        <div className="text-[8px] font-black uppercase tracking-[0.5em] text-[#ff006e] mb-0.5 opacity-80">Local Telemetry</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                {loading ? '...' : localStats.scans.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">Energy</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isStatsCollapsed ? 'bg-white/5' : 'bg-[#ff006e] shadow-[0_0_20px_#ff006e40]'}`}>
                <Zap
                    className={`transition-all duration-500 ${isStatsCollapsed ? 'text-white/40' : 'text-black'}`}
                    size={20}
                    fill={isStatsCollapsed ? "none" : "currentColor"}
                />
            </div>
        </div>

        {/* Expanded Data Display */}
        <AnimatePresence>
            {!isStatsCollapsed && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-6 pt-2 overflow-hidden bg-gradient-to-b from-transparent to-black/40"
                >
                    <div className="space-y-4">
                        {/* Data Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="text-[7px] font-bold text-white/30 uppercase tracking-[0.3em]">Tracks_Identified</div>
                                <div className="text-lg font-black text-white italic tabular-nums">{localStats.tracks}</div>
                            </div>
                            <div className="space-y-1 text-right">
                                <div className="text-[7px] font-bold text-white/30 uppercase tracking-[0.3em]">Active_Presence</div>
                                <div className="flex items-center justify-end gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff006e] animate-ping" />
                                    <div className="text-lg font-black text-white italic tabular-nums">{onlineUsers}</div>
                                </div>
                            </div>
                        </div>

                        {/* Status Bar */}
                        <div className="pt-4 border-t border-white/5">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[7px] font-black text-[#ff006e] uppercase tracking-[0.5em]">System Status</span>
                                <span className="text-[7px] font-bold text-green-400 uppercase tracking-widest">Synchronized</span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-[#ff006e]"
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                        </div>

                        <div className="text-[8px] text-white/20 italic tracking-[0.1em] text-center pt-1">
                            Scanning local sectors for active frequencies...
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
</div>
