import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import { Search, Play, Target, RefreshCw, Plus, Minus, Compass, Map as MapIcon, Navigation, Heart, Zap, User } from 'lucide-react';
import API from '../services/api';

const BASE_API_URL = 'http://localhost:5264';
const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${BASE_API_URL}${path}`;
};


const DiscoveryMapView = ({ onPlayPlaylist, allTracks, onLike, stats, user: currentUser, navigateToProfile }) => {
    const [mapItems, setMapItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [artists, setArtists] = useState([]);
    const [followingIds, setFollowingIds] = useState(new Set());
    // Zoom Motion Value for smooth aesthetic driving
    const zoom = useMotionValue(0.8);
    const [isNavOpen, setIsNavOpen] = useState(false);

    // Stats HUD State
    const [isStatsCollapsed, setIsStatsCollapsed] = useState(true);
    const [localStats, setLocalStats] = useState({ scans: 0, tracks: 0 });
    const [onlineUsers, setOnlineUsers] = useState(0); // Will be fetched from backend

    // Dynamic Layer Opacities
    // Macro (World View): Visible at low zoom (< 0.6), fades out by 1.0
    const macroOpacity = useTransform(zoom, [0.3, 0.8], [1, 0]);
    // Micro (Texture View): Fades in as you zoom in (> 0.5)
    // We cap it at 0.3 opacity (as per previous bright visuals)
    const microOpacity = useTransform(zoom, [0.4, 1.0], [0, 0.3]);

    // Label Opacity (Fades out quickly as you zoom in)
    const labelOpacity = useTransform(zoom, [0.4, 0.7], [1, 0]);

    // Map Dimensions
    const MAP_SIZE = 10000;
    const CENTER_OFFSET_X = -MAP_SIZE / 2 + window.innerWidth / 2;
    const CENTER_OFFSET_Y = -MAP_SIZE / 2 + window.innerHeight / 2;

    // Use MotionValues for high-performance drag + animation
    // Start centered!
    const mapX = useMotionValue(CENTER_OFFSET_X);
    const mapY = useMotionValue(CENTER_OFFSET_Y);

    // Radar Transforms (Map specific coordinate space to % on radar)
    // Map moves from (Center + 5000) to (Center - 5000) roughly
    // Let's map relative to the center anchor
    const radarX = useTransform(mapX, [CENTER_OFFSET_X - 5000, CENTER_OFFSET_X + 5000], ["0%", "100%"]);
    const radarY = useTransform(mapY, [CENTER_OFFSET_Y - 5000, CENTER_OFFSET_Y + 5000], ["0%", "100%"]);

    // Invert for viewing window
    const viewportX = useTransform(mapX, [CENTER_OFFSET_X + 5000, CENTER_OFFSET_X - 5000], ["0%", "100%"]);
    const viewportY = useTransform(mapY, [CENTER_OFFSET_Y + 5000, CENTER_OFFSET_Y - 5000], ["0%", "100%"]);

    // Infinite Pixel Scrolling (Restored)
    const bgPosX = useTransform(mapX, v => v + 'px');
    const bgPosY = useTransform(mapY, v => v + 'px');

    const radarRef = useRef(null);

    // ... radar interaction ...
    const handleRadarInteraction = (e) => {
        if (!radarRef.current) return;
        const rect = radarRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

        // Calculate percentages (0 to 1)
        const pctX = x / rect.width;
        const pctY = y / rect.height;

        // 0% -> Moves map to Right limit -> (CENTER_OFFSET + 5000)
        // 100% -> Moves map to Left limit -> (CENTER_OFFSET - 5000)
        // Note: 5000 is half map size
        const range = 5000;
        const newMapX = (CENTER_OFFSET_X + range) - (pctX * (range * 2));
        const newMapY = (CENTER_OFFSET_Y + range) - (pctY * (range * 2));

        mapX.set(newMapX);
        mapY.set(newMapY);
    };

    // Fast Travel Sectors
    const SECTORS = [
        { name: 'Central Hub', x: 0, y: 0, color: '#ff006e' },
        { name: 'Neon Wastes', x: 2500, y: -1500, color: '#00ffee' },
        { name: 'Deep Data', x: -2000, y: 2000, color: '#bd00ff' },
        { name: 'Outer Rim', x: 3000, y: 3000, color: '#ffae00' },
    ];

    const handleZoom = (delta) => {
        const current = zoom.get();
        const newZoom = Math.min(Math.max(current + delta, 0.2), 3); // Expanded range for Orbital view
        animate(zoom, newZoom, { type: "spring", stiffness: 200, damping: 20 });
    };

    // Deterministic Position Fallback (for tracks with no DB coords)
    // Uses a pseudo-random hash of the ID and type to ensure unique positions
    const getDeterministicPosition = (id, category) => {
        // Simple string hash
        const str = `${category}-${id}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }

        const x = (Math.sin(hash) * 10000) % 4000;
        const y = (Math.cos(hash) * 10000) % 3000;
        return { x, y };
    };

    const handleFastTravel = (sector) => {
        // Zoom Correction: 1.2
        const ZOOM_TARGET = 1.2;
        const targetX = CENTER_OFFSET_X - (sector.x * ZOOM_TARGET);
        const targetY = CENTER_OFFSET_Y - (sector.y * ZOOM_TARGET);

        animate(mapX, targetX, { type: "spring", stiffness: 50, damping: 20 });
        animate(mapY, targetY, { type: "spring", stiffness: 50, damping: 20 });
        animate(zoom, ZOOM_TARGET, { type: "spring", stiffness: 50 });
        setIsNavOpen(false);
    };

    const fetchData = async () => {
        setLoading(true);
        console.log("Fetching map data...");
        try {
            // Attempt API Fetch for non-track items
            const [albumsResponse, artistsResponse, profileResponse] = await Promise.all([
                API.Albums.getAll().catch(e => ({ data: [] })),
                API.Artists.getAll().catch(e => ({ data: [] })),
                API.Users.getProfile().catch(() => ({ data: null }))
            ]);

            const tracks = allTracks && allTracks.length > 0 ? allTracks : [];
            const albums = albumsResponse.data || [];
            const fetchedArtists = artistsResponse.data || [];
            const user = profileResponse?.data;

            // Stats removed as requested to focus on artistry
            setLocalStats({ scans: 0, tracks: 0 });
            setOnlineUsers(1);

            // Filter out autogenerated artist profiles
            const realArtists = fetchedArtists.filter(a => {
                const bio = (a.bio || a.Bio || '').toLowerCase();
                const name = (a.name || a.Name || '').toLowerCase();
                return !bio.includes('auto-generated') &&
                    !bio.includes('new artist profile') &&
                    name !== 'unknown artist';
            });

            setArtists(realArtists); // Store filtered artists

            console.log("API Data:", { tracks: tracks.length, albums: albums.length, artists: fetchedArtists.length });

            // Process Items with coordinates
            const allItems = [
                ...tracks.map(t => {
                    const tid = t.id || t.Id;
                    return {
                        ...t,
                        id: tid,
                        category: 'Track',
                        displayId: `track-${tid}`,
                        img: getMediaUrl(t.coverImageUrl || t.CoverImageUrl),
                        // Ensure these are present for initial render
                        isOwned: t.isOwned,
                        isLocked: (t.isLocked !== undefined) ? t.isLocked : (t.IsLocked !== undefined ? t.IsLocked : false),
                        artistUserId: t.artistUserId
                    };
                }),
                ...albums.map(a => {
                    const aid = a.id || a.Id;
                    return { ...a, id: aid, category: 'Album', displayId: `album-${aid}`, img: getMediaUrl(a.coverImageUrl || a.CoverImageUrl) };
                }),
                ...realArtists.map(a => {
                    const arid = a.id || a.Id;
                    return { ...a, id: arid, category: 'Artist', displayId: `artist-${arid}`, img: getMediaUrl(a.imageUrl || a.ImageUrl) };
                })
            ].map(item => {
                let x, y;
                const itemId = item.id; // Normalized above

                // 1. Use DB Coordinates if available
                if (item.mapX != null && item.mapY != null) {
                    x = item.mapX + CENTER_OFFSET_X; // CENTER_OFFSET applied to align with view
                    y = item.mapY + CENTER_OFFSET_Y;
                } else {
                    // 2. Fallback to Deterministic Position
                    const pos = getDeterministicPosition(itemId, item.category);
                    x = pos.x + CENTER_OFFSET_X;
                    y = pos.y + CENTER_OFFSET_Y;
                }

                return {
                    ...item,
                    title: item.title || item.name || "Unknown",
                    x, y
                };
            });

            setMapItems(allItems);

            // Handle Residency Spawn
            if (user && user.residentSectorId != null) {
                const residentSector = SECTORS.find(s => s.id === user.residentSectorId);
                if (residentSector) {
                    console.log("Spawning at Resident Sector:", residentSector.name);
                    const ZOOM_TARGET = 1.2;
                    const targetX = CENTER_OFFSET_X - (residentSector.x * ZOOM_TARGET);
                    const targetY = CENTER_OFFSET_Y - (residentSector.y * ZOOM_TARGET);

                    animate(mapX, targetX, { type: "spring", stiffness: 50 });
                    animate(mapY, targetY, { type: "spring", stiffness: 50 });
                    animate(zoom, ZOOM_TARGET, { type: "spring", stiffness: 50 });
                } else {
                    // Default Center
                    animate(mapX, CENTER_OFFSET_X, { type: "spring" });
                    animate(mapY, CENTER_OFFSET_Y, { type: "spring" });
                    animate(zoom, 0.4);
                }
            } else {
                // Default Center if no residency
                animate(mapX, CENTER_OFFSET_X, { type: "spring" });
                animate(mapY, CENTER_OFFSET_Y, { type: "spring" });
                animate(zoom, 0.4);
            }

        } catch (error) {
            console.error("Critical error in discovery map:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFollowing = useCallback(async () => {
        if (!currentUser) return;
        try {
            const res = await API.Users.getFollowing(currentUser.id || currentUser.Id);
            const ids = new Set((res.data || []).map(u => String(u.id || u.Id)));
            setFollowingIds(ids);
        } catch (err) {
            console.error("Failed to fetch following state", err);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchData();
        fetchFollowing();
    }, [allTracks.length, currentUser]); // Re-run if tracks are added/removed, sync effect handles status changes

    const handleFollow = async (artistId) => {
        try {
            const isFollowing = followingIds.has(String(artistId));
            if (isFollowing) {
                await API.Users.unfollowUser(artistId);
                setFollowingIds(prev => {
                    const next = new Set(prev);
                    next.delete(String(artistId));
                    return next;
                });
            } else {
                await API.Users.followUser(artistId);
                setFollowingIds(prev => {
                    const next = new Set(prev);
                    next.add(String(artistId));
                    return next;
                });
            }
        } catch (err) {
            console.error("Link action failed", err);
        }
    };

    // Calculate viewport-based stats - Real-time function
    const calculateViewportStats = useCallback(() => {
        if (!mapItems.length) {
            console.log('[Viewport] No map items loaded yet');
            return;
        }

        const currentMapX = mapX.get();
        const currentMapY = mapY.get();
        const currentZoom = zoom.get();

        console.log('[Viewport] Calculating with:', {
            totalItems: mapItems.length,
            mapX: currentMapX,
            mapY: currentMapY,
            zoom: currentZoom
        });

        // Filter tracks visible in viewport
        const visibleTracks = mapItems.filter((item) => {
            if (item.category !== 'Track') return false;

            // Calculate screen position correctly:
            // Item Local + Center Offset (5000) * Zoom + Map Pan
            const screenX = item.x * currentZoom + currentMapX + 5000;
            const screenY = item.y * currentZoom + currentMapY + 5000;

            const buffer = 100;
            const isVisible = screenX >= -buffer && screenX <= window.innerWidth + buffer &&
                screenY >= -buffer && screenY <= window.innerHeight + buffer;

            return isVisible;
        });

        console.log('[Viewport] Visible tracks:', visibleTracks.length);

        const totalScans = visibleTracks.reduce((sum, track) => {
            return sum + (track.playCount || track.PlayCount || 0);
        }, 0);

        setLocalStats({
            scans: totalScans,
            tracks: visibleTracks.length
        });
    }, [mapItems, mapX, mapY, zoom]);

    // Real-time viewport tracking - updates instantly during navigation
    useMotionValueEvent(mapX, "change", calculateViewportStats);
    useMotionValueEvent(mapY, "change", calculateViewportStats);
    useMotionValueEvent(zoom, "change", calculateViewportStats);

    // Initial calculation and when items change
    useEffect(() => {
        calculateViewportStats();
    }, [mapItems, calculateViewportStats]);


    // Update online users from backend stats
    useEffect(() => {
        console.log('[Stats] Received stats:', stats);
        if (stats?.activeUsers !== undefined) {
            setOnlineUsers(stats.activeUsers);
        } else if (stats?.onlineUsers !== undefined) {
            setOnlineUsers(stats.onlineUsers);
        } else {
            // Default to 1 (current user) if no stats available
            setOnlineUsers(1);
        }
    }, [stats]);


    // Synchronize all status fields from allTracks prop
    useEffect(() => {
        if (allTracks && allTracks.length > 0) {
            setMapItems(prev => prev.map(item => {
                if (item.category === 'Track') {
                    const latest = allTracks.find(t => String(t.id) === String(item.id));
                    if (latest) {
                        return {
                            ...item,
                            isLiked: latest.isLiked,
                            isOwned: latest.isOwned,
                            isLocked: latest.isLocked,
                            artistUserId: latest.artistUserId,
                            price: latest.price,
                            playCount: latest.playCount
                        };
                    }
                }
                return item;
            }));
        }
    }, [allTracks]);

    const handlePlayClick = (e, item) => {
        e.stopPropagation();
        if (!onPlayPlaylist || !allTracks || allTracks.length === 0) return;

        if (item.category === 'Track') {
            onPlayPlaylist([allTracks.find(t => t.id === item.id) || allTracks[0]], 0);
        }
        else if (item.category === 'Album') {
            const albumTracks = allTracks.filter(t => t.albumId === item.id);
            if (albumTracks.length > 0) onPlayPlaylist(albumTracks, 0);
        }
        else if (item.category === 'Artist') {
            const artistTracks = allTracks.filter(t => t.artistId === item.id);
            if (artistTracks.length > 0) onPlayPlaylist(artistTracks, 0);
        }
    };

    return (
        <div className="w-full h-full bg-transparent overflow-hidden relative isolate">
            {/* HUD de búsqueda flotante */}
            <div className="absolute top-6 left-6 z-[100] flex items-center gap-4 pointer-events-none">
                <div className="group bg-black/40 backdrop-blur-2xl ring-1 ring-white/10 p-4 rounded-full flex items-center gap-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] pointer-events-auto transition-all duration-300 focus-within:ring-[#ff006e] focus-within:shadow-[0_0_30px_rgba(255,0,110,0.2)]">
                    <Search className="text-[#ff006e] opacity-70 group-focus-within:opacity-100 transition-opacity" size={20} />
                    <input
                        type="text"
                        placeholder="Explorar sonidos..."
                        className="bg-transparent border-none outline-none text-white text-sm w-32 md:w-64 font-bold italic placeholder-white/30"
                    />
                </div>
                <button
                    onClick={fetchData}
                    className="bg-black/40 backdrop-blur-2xl ring-1 ring-white/10 p-4 rounded-full text-[#ff006e] hover:bg-[#ff006e] hover:text-black transition-all pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_#ff006e]"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Local Stats HUD (Top Right) - Collapsible */}
            <div className="absolute top-6 right-6 z-[100] flex flex-col items-end gap-2 pointer-events-none">
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
                                    className="flex flex-col items-start mr-4 flex-1 pl-4"
                                >
                                    <div className="text-[8px] font-black uppercase tracking-[0.5em] text-[#ff006e] mb-0.5 opacity-80">Local Telemetry</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white italic tracking-tighter tabular-nums leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                            {loading ? '...' : localStats.scans.toLocaleString()}
                                        </span>
                                        <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">AMPLITUDE</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border ${isStatsCollapsed
                            ? 'bg-white/5 border-transparent text-white/40'
                            : 'bg-[#ff006e]/10 border-[#ff006e]/50 shadow-[0_0_15px_rgba(255,0,110,0.25)] text-[#ff006e]'
                            }`}>
                            <Zap
                                className={`transition-all duration-500 ${isStatsCollapsed ? '' : 'drop-shadow-[0_0_8px_#ff006e]'}`}
                                size={20}
                                fill="none"
                                strokeWidth={1.5}
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
                                className="px-6 pb-6 pt-0 overflow-hidden"
                            >
                                <div className="space-y-4 pt-2 border-t border-white/5">
                                    {/* Data Grid */}
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <div className="text-[7px] font-bold text-white/40 uppercase tracking-[0.3em]">Visible_Tracks</div>
                                            <div className="text-xl font-black text-white italic tabular-nums tracking-tighter">{localStats.tracks}</div>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <div className="text-[7px] font-bold text-white/40 uppercase tracking-[0.3em]">Active_Users</div>
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#ff006e] animate-pulse" />
                                                <div className="text-xl font-black text-white italic tabular-nums tracking-tighter">{onlineUsers}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Artists Section */}
                                    {artists.length > 0 && (
                                        <div className="pt-4 border-t border-white/5">
                                            <div className="text-[7px] font-bold text-white/40 uppercase tracking-[0.3em] mb-3">Artists_Online</div>
                                            <div className="flex flex-col gap-3 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#ff006e]/50 scrollbar-track-transparent">
                                                {artists.map(artist => (
                                                    <div key={artist.id || artist.Id} className="flex items-center justify-between gap-2">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <h3
                                                                onClick={() => navigateToProfile(artist.userId || artist.UserId)}
                                                                className="text-white font-black italic uppercase tracking-tighter text-lg leading-tight truncate cursor-pointer hover:text-[#ff006e] transition-colors"
                                                            >
                                                                {artist.username}
                                                            </h3>
                                                            <p className="text-[10px] text-[#ff006e]/60 font-black tracking-widest uppercase truncate">{artist.bio || 'SIGNAL_DETECTED'}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleFollow(artist.userId || artist.UserId)}
                                                                className={`p-2.5 rounded-xl border transition-all active:scale-95 ${followingIds.has(String(artist.userId || artist.UserId))
                                                                    ? 'bg-[#ff006e] border-[#ff006e] text-black shadow-[0_0_15px_rgba(255,0,110,0.3)]'
                                                                    : 'bg-white/5 border-white/10 text-white hover:border-[#ff006e]/50 hover:text-[#ff006e]'
                                                                    }`}
                                                                title={followingIds.has(String(artist.id || artist.Id)) ? "Linked" : "Link"}
                                                            >
                                                                <Zap size={16} fill={followingIds.has(String(artist.id || artist.Id)) ? "currentColor" : "none"} />
                                                            </button>
                                                            <button
                                                                onClick={() => navigateToProfile(artist.id || artist.Id)}
                                                                className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:border-[#ff006e]/50 hover:text-[#ff006e] transition-all active:scale-95"
                                                                title="View Signature"
                                                            >
                                                                <Target size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>


            {/* NAVIGATION HUD (Bottom Left) */}
            <div className="absolute bottom-6 left-6 z-[100] flex flex-col items-start gap-4 pointer-events-none">
                {/* Zoom Controls (Compact Pill) */}
                <div className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 rounded-full p-1 flex flex-col gap-1 shadow-2xl">
                    <button onClick={() => handleZoom(0.2)} className="w-10 h-10 flex items-center justify-center hover:bg-[#ff006e] hover:text-black text-white rounded-full transition-colors"><Plus size={18} /></button>
                    <div className="w-full h-px bg-white/10 mx-auto w-6" />
                    <button onClick={() => handleZoom(-0.2)} className="w-10 h-10 flex items-center justify-center hover:bg-[#ff006e] hover:text-black text-white rounded-full transition-colors"><Minus size={18} /></button>
                </div>

                {/* Collapsible Fast Travel */}
                <div className="relative pointer-events-auto">
                    <AnimatePresence>
                        {isNavOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                                className="absolute bottom-16 left-0 bg-black/80 backdrop-blur-xl border border-[#ff006e]/30 rounded-2xl p-3 flex flex-col gap-2 shadow-[0_0_30px_rgba(0,0,0,0.8)] w-56 origin-bottom-left"
                            >
                                <div className="flex items-center gap-2 text-[#ff006e] text-[10px] font-black uppercase tracking-widest mb-2 border-b border-[#ff006e]/20 pb-2">
                                    <Navigation size={14} /> Fast Travel
                                </div>
                                {SECTORS.map(s => (
                                    <button
                                        key={s.name}
                                        onClick={() => handleFastTravel(s)}
                                        className="text-left text-xs font-bold text-white/80 hover:text-[#ff006e] hover:bg-white/5 px-4 py-3 rounded-xl transition-all flex items-center justify-between group gap-4 border border-transparent hover:border-[#ff006e]/20"
                                    >
                                        {s.name}
                                        <div className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_5px_currentColor]" style={{ backgroundColor: s.color, color: s.color }} />
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsNavOpen(!isNavOpen)}
                        className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-xl border shadow-2xl transition-all duration-300 ${isNavOpen ? 'bg-[#ff006e] text-black border-[#ff006e]' : 'bg-black/60 text-white border-white/10 hover:border-[#ff006e] hover:text-[#ff006e]'}`}
                    >
                        <Compass size={24} className={`transition-transform duration-500 ${isNavOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {/* RADAR / MINIMAP (Bottom Right) */}
            <div
                ref={radarRef}
                onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    handleRadarInteraction(e);
                }}
                onPointerMove={(e) => {
                    if (e.buttons === 1) handleRadarInteraction(e);
                }}
                className="absolute bottom-6 right-6 z-[100] bg-black/80 backdrop-blur-xl border border-[#ff006e]/30 rounded-full w-48 h-48 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)] cursor-crosshair active:scale-95 transition-transform"
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_#000_100%)] pointer-events-none z-20" />
                <div className="w-full h-full relative opacity-50 pointer-events-none">
                    {/* Simplified dots for radar */}
                    {mapItems.map(item => (
                        <div
                            key={'radar-' + item.displayId}
                            className="absolute w-1 h-1 rounded-full bg-[#ff006e] -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${50 + (item.x / 5000 * 50)}%`, // Simplified projection
                                top: `${50 + (item.y / 5000 * 50)}%`
                            }}
                        />
                    ))}
                    {/* Viewport Indicator (Follows Map) */}
                    <motion.div
                        className="absolute w-16 h-10 border-2 border-white/80 rounded-sm z-30 box-border -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_white] bg-white/5"
                        style={{
                            left: viewportX,
                            top: viewportY
                        }}
                    />
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center text-[8px] font-black uppercase tracking-widest text-[#ff006e] z-30 pointer-events-none">
                    RADAR_SYS
                </div>
            </div>

            {/* YUME NIKKI FLASHLIGHT OVERLAY (Fixed on screen) */}
            {/* Wide aperture: Center 40% is clear, fades to black at edges */}
            <div className="absolute inset-0 z-[50] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,#000000_100%)]" />

            {/* Contenedor del Mapa Draggable */}
            <motion.div
                drag
                dragMomentum={true}
                dragTransition={{ power: 0.2, timeConstant: 200 }} // Controlled slide
                style={{ x: mapX, y: mapY, scale: zoom }}
                onDragStart={() => setIsNavOpen(false)}
                className="absolute w-[10000px] h-[10000px] cursor-grab active:cursor-grabbing z-0 origin-center bg-transparent"
                onDrag={(e, info) => {
                    // Optional: you can sync something here if needed
                }}
            >
                {/* MACRO LAYER (World View) */}
                {/* Static Image centered on the 'Universe' */}
                {/* Moves with mapX/Y but is NOT tiled. It's one giant image. */}
                <motion.div
                    className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
                    style={{ opacity: macroOpacity }}
                >
                    <div className="relative w-[10000px] h-[10000px] flex items-center justify-center">
                        {SECTORS.map(sector => (
                            <div
                                key={sector.name}
                                className="absolute text-6xl font-black tracking-[1em] text-white/50 uppercase whitespace-nowrap drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                                style={{
                                    left: 5000 + sector.x,
                                    top: 5000 + sector.y,
                                    transform: 'translate(-50%, -50%)',
                                    color: sector.color
                                }}
                            >
                                {sector.name}
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* INFINITE MACRO GRID (Reference lines in the Void) */}
                <motion.div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        opacity: macroOpacity,
                        backgroundImage: 'linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)',
                        backgroundSize: '500px 500px',
                        backgroundPosition: 'center'
                    }}
                />

                {/* MICRO LAYER (Infinite Texture) */}
                <motion.div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        opacity: microOpacity,
                        backgroundImage: 'url(/assets/discovery_map_bg.png)',
                        backgroundSize: '800px 800px',
                        backgroundRepeat: 'repeat',
                        backgroundPosition: 'center'
                    }}
                />

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[200]">
                        <div className="text-[#ff006e] font-black tracking-widest animate-pulse">LOADING_SYSTEM_DATA...</div>
                    </div>
                )}

                {mapItems.map((item) => {
                    const scans = item.playCount || item.PlayCount || 0;
                    const glowIntensity = Math.min(scans * 5, 60); // Max 60px glow
                    const currentUserId = currentUser?.id || currentUser?.Id;
                    const isMyTrack = item.category === 'Track' && (item.artistUserId || item.ArtistUserId) !== undefined && String(item.artistUserId || item.ArtistUserId) === String(currentUserId);
                    const targetUserIdForItem = item.category === 'Artist' ? (item.id || item.Id) : (item.artistUserId || item.ArtistUserId);

                    // Dynamic Glow Logic
                    let glowColor = "255, 0, 110"; // Default Pink
                    if (isMyTrack) {
                        glowColor = "0, 255, 238"; // Cyan for My Tracks
                    } else if (item.category === 'Track' && item.isOwned) {
                        glowColor = "0, 255, 100"; // Neon Green for Purchased
                    }

                    const shadowRadius = 25 + glowIntensity;
                    const isGlowing = scans > 0 || item.isOwned || isMyTrack;
                    const glowOpacity = 0.15 + (glowIntensity / 100) + (isGlowing ? 0.4 : 0);

                    // Dynamic Sizing Logic: Logarithmic scale based on plays
                    // Base size: 240px. Range: 0.6x (144px) to 2.5x (600px)
                    const sizeScale = Math.min(2.5, Math.max(0.6, 0.6 + (Math.log10(scans + 1) * 0.4)));
                    const pixelSize = 240 * sizeScale;

                    return (
                        <motion.div
                            key={item.displayId}
                            style={{
                                x: item.x,
                                y: item.y,
                                width: pixelSize,
                                height: pixelSize,
                                boxShadow: isGlowing
                                    ? `0 0 ${shadowRadius}px rgba(${glowColor}, ${glowOpacity})`
                                    : '0 0 30px rgba(0,0,0,0.8)'
                            }}
                            className={`absolute left-1/2 top-1/2 rounded-xl overflow-hidden border border-white/20 bg-[#0a0a0a] group cursor-pointer z-10 hover:z-50 hover:border-[#ff006e]/50 hover:shadow-[0_0_50px_rgba(255,0,110,0.4)] transition-all`}
                            whileHover={{ scale: 1.15 }}
                            onClick={(e) => {
                                handlePlayClick(e, item);
                            }}
                        >
                            {/* Cover Art Background with Fallback Gradient */}
                            <div className={`absolute inset-0 z-0 bg-gradient-to-br ${item.category === 'Artist' ? 'from-purple-900 to-black' :
                                item.category === 'Album' ? 'from-blue-900 to-black' :
                                    'from-[#ff006e]/20 to-black'
                                }`}>
                                {item.img && (
                                    <img
                                        src={item.img}
                                        alt={item.title}
                                        onError={(e) => {
                                            e.target.style.display = 'none'; // Hide broken image to show gradient
                                        }}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                            </div>

                            {/* Content Overlay */}
                            <div className="absolute inset-0 p-6 flex flex-col justify-end z-10 pointer-events-none">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="text-[8px] font-black uppercase tracking-[0.4em] text-[#ff006e] opacity-70 italic">{item.category}</div>
                                    {item.price > 0 && item.category === 'Track' && (
                                        <div className="px-2 py-0.5 bg-[#ff006e] text-white text-[8px] font-black rounded uppercase tracking-widest shadow-[0_0_10px_#ff006e]">
                                            {item.price} CRD
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-lg break-words">{item.title}</h3>
                            </div>

                            {/* Locked Overlay */}
                            {item.isLocked && !item.isOwned && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px] z-10">
                                    <div className="flex flex-col items-center gap-2 text-[#ff006e] animate-pulse">
                                        <div className="p-2 border border-[#ff006e] rounded-full">
                                            <div className="w-3 h-3 bg-[#ff006e] rounded-sm" />
                                        </div>
                                        <span className="text-[8px] font-black tracking-[0.2em]">LOCKED</span>
                                    </div>
                                </div>
                            )}

                            {/* Play & Like Buttons */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 gap-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (item.isLocked && !item.isOwned) {
                                                alert("Track Encrypted. Purchase to unlock.");
                                                return;
                                            }
                                            handlePlayClick(e, item)
                                        }}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_30px_#ff006e] scale-75 group-hover:scale-100 transition-transform cursor-pointer pointer-events-auto hover:bg-white ${item.isLocked && !item.isOwned ? 'bg-gray-800 cursor-not-allowed opacity-50' : 'bg-[#ff006e]'
                                            }`}
                                    >
                                        {item.isLocked && !item.isOwned ? (
                                            <div className="w-4 h-4 bg-[#ff006e] opacity-50" />
                                        ) : (
                                            <Play size={24} fill="black" className="ml-1 text-black" />
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigateToProfile(targetUserIdForItem);
                                        }}
                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-white hover:bg-[#ff006e] hover:border-[#ff006e] transition-all scale-75 group-hover:scale-100 pointer-events-auto shadow-xl"
                                        title="View Signature"
                                    >
                                        <Target size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    {item.category === 'Track' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onLike && onLike(item);
                                            }}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all scale-75 group-hover:scale-100 pointer-events-auto shadow-xl ${item.isLiked
                                                ? 'bg-[#ff006e] border-[#ff006e] text-black shadow-[0_0_15px_#ff006e]'
                                                : 'bg-black/40 border-white/20 text-[#ff006e] hover:border-[#ff006e]'
                                                }`}
                                        >
                                            <Heart size={18} fill={item.isLiked ? "currentColor" : "transparent"} />
                                        </button>
                                    )}
                                    {/* Link button removed as requested */
                                    }
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>
        </div >
    );
};

export default DiscoveryMapView;
