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
    const [searchQuery, setSearchQuery] = useState('cyberpunk music'); // Default query
    const [searchResults, setSearchResults] = useState([]); // Store explicit search results for overlay
    const [showResultsOverlay, setShowResultsOverlay] = useState(false); // Toggle overlay
    const [lastError, setLastError] = useState(null); // Capture execution errors

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

        // Feature: Search results (YouTube) should be clustered near the center/user
        // to be immediately visible.
        let rangeX = 4000;
        let rangeY = 3000;

        if (category === 'YouTube') {
            rangeX = 800; // Much tighter range for search results
            rangeY = 600;
        }

        const x = (Math.sin(hash) * 10000) % rangeX;
        const y = (Math.cos(hash) * 10000) % rangeY;
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
        setLastError(null); // Clear previous errors
        console.log("Fetching map data...");
        try {
            // Attempt API Fetch for non-track items
            let youtubeItems = [];
            let youtubeError = null;

            try {
                const ytResp = await API.Youtube.search(searchQuery);
                youtubeItems = ytResp.data || [];
            } catch (err) {
                console.error("Youtube Search Failed:", err);
                youtubeError = err.response?.data?.message || err.message || "Unknown API Error";
                setLastError(youtubeError);
            }

            const [albumsResponse, artistsResponse, profileResponse] = await Promise.all([
                API.Albums.getAll().catch(e => ({ data: [] })),
                API.Artists.getAll().catch(e => ({ data: [] })),
                API.Users.getProfile().catch(() => ({ data: null }))
            ]);

            const tracks = allTracks && allTracks.length > 0 ? allTracks : [];
            const albums = albumsResponse.data || [];
            const fetchedArtists = artistsResponse.data || [];
            // youtubeItems is already set above

            console.log("DEBUG: Youtube Items:", youtubeItems);
            setSearchResults(youtubeItems);

            if (youtubeItems.length > 0 || youtubeError) {
                setShowResultsOverlay(true);
            }

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
                }),
                ...youtubeItems.map(y => {
                    const yId = y.id || y.Id || y.videoId;
                    return {
                        id: yId,
                        title: y.title || y.Title,
                        artist: y.author || y.Author || y.channelTitle,
                        category: 'YouTube',
                        displayId: `yt-${yId}`,
                        img: y.thumbnailUrl || y.ThumbnailUrl || y.thumbnail,
                        playCount: parseInt(y.viewCount || y.ViewCount) || 0,
                        nodeSize: y.nodeSize || y.NodeSize || y.Scale,
                        streamUrl: null,
                        source: `youtube:${yId}`,
                        price: 0,
                        isLocked: false,
                        isOwned: true
                    };
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
                    x, y,
                    debugCategory: item.category // Trace category
                };
            });

            console.log("DEBUG: All Map Items:", allItems);
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
            } else if (youtubeItems.length > 0) {
                // If we have search results, Auto-Pan to the first one!
                console.log("Search Results Found! Auto-panning...");
                const firstHit = youtubeItems[0];
                const pos = getDeterministicPosition(firstHit.videoId, 'YouTube');

                const targetX = CENTER_OFFSET_X - pos.x;
                const targetY = CENTER_OFFSET_Y - pos.y;

                animate(mapX, targetX, { type: "spring", stiffness: 40 });
                animate(mapY, targetY, { type: "spring", stiffness: 40 });
                animate(zoom, 1.0, { type: "spring" });
            } else {
                // Default Center if no residency and no active search results
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

    // Calculate viewport-based stats whenever map position or items change
    const updateLocalStats = useCallback(() => {
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
    }, [mapItems, mapX, mapY, zoom, CENTER_OFFSET_X, CENTER_OFFSET_Y]);

    // Real-time viewport tracking - updates instantly during navigation
    useMotionValueEvent(mapX, "change", updateLocalStats);
    useMotionValueEvent(mapY, "change", updateLocalStats);
    useMotionValueEvent(zoom, "change", updateLocalStats);

    // Initial calculation and when items change
    useEffect(() => {
        updateLocalStats();
    }, [mapItems, updateLocalStats]);


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
        else if (item.category === 'YouTube') {
            // Construct a playable track object from the YouTube item
            const ytTrack = {
                id: item.id,
                title: item.title,
                artist: item.artist,
                cover: item.img,
                source: item.streamUrl || `https://www.youtube.com/watch?v=${item.id}`, // Fallback if no streamUrl
                duration: 0, // Unknown duration
                isLocked: false,
                isOwned: true,
                price: 0
            };
            onPlayPlaylist([ytTrack], 0);
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
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                        placeholder="Search Youtube / System..."
                        className="bg-transparent border-none outline-none text-white text-sm w-32 md:w-64 font-bold italic placeholder-white/30"
                    />
                </div>
                <button
                    onClick={fetchData}
                    className="bg-black/40 backdrop-blur-2xl ring-1 ring-white/10 p-4 rounded-full text-[#ff006e] hover:bg-[#ff006e] hover:text-black transition-all pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_#ff006e]"
                    title="Refresh / Search"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* SEARCH RESULTS OVERLAY (Micro-Window) */}
            <AnimatePresence>
                {showResultsOverlay && searchResults.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        drag
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // Allow slight drag but mostly fixed
                        className="absolute top-24 left-6 z-[150] w-80 max-h-[60vh] bg-black/80 backdrop-blur-xl border border-[#ff006e]/30 rounded-2xl flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto"
                    >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-[#ff006e] font-black uppercase tracking-widest text-xs flex items-center gap-2">
                                <Search size={14} /> Search Results ({searchResults.length})
                            </h3>
                            <button onClick={() => setShowResultsOverlay(false)} className="text-white/50 hover:text-white">
                                <Minus size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-[#ff006e]/30 scrollbar-track-transparent">

                            {lastError && (
                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-100 text-xs font-mono">
                                    <strong>ERROR:</strong> {lastError}
                                </div>
                            )}

                            {searchResults.length === 0 && !lastError && (
                                <div className="p-4 text-white/30 text-xs text-center italic">
                                    No results found for "{searchQuery}".
                                </div>
                            )}

                            {searchResults.map((item) => (
                                <div key={item.videoId} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg group transition-colors border border-transparent hover:border-white/10">
                                    <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
                                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-transparent">
                                            <Play size={16} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" fill="white" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0" onClick={() => {
                                        // Trigger play manually from overlay
                                        const yId = item.id || item.Id || item.videoId;
                                        const ytTrack = {
                                            id: yId,
                                            title: item.title || item.Title,
                                            artist: item.author || item.Author || item.channelTitle,
                                            cover: item.thumbnailUrl || item.ThumbnailUrl || item.thumbnail,
                                            source: `youtube:${yId}`, // Flag for App.jsx
                                            duration: 0,
                                            isLocked: false,
                                            isOwned: true,
                                            price: 0
                                        };
                                        onPlayPlaylist([ytTrack], 0);
                                    }}>
                                        <div className="text-white text-xs font-bold truncate group-hover:text-[#ff006e] cursor-pointer transition-colors">{item.title}</div>
                                        <div className="text-white/40 text-[10px] truncate">{item.channelTitle}</div>
                                    </div>
                                    <div className="text-[#00ffff] text-[9px] font-mono">{parseInt(item.viewCount).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Local Stats HUD (Top Right) - Premium Minimalist */}
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
                    } else if (item.category === 'YouTube') {
                        glowColor = "0, 255, 255"; // Cyan for YouTube
                    }

                    const shadowRadius = 25 + glowIntensity;
                    const isGlowing = scans > 0 || item.isOwned || isMyTrack;
                    const glowOpacity = 0.15 + (glowIntensity / 100) + (isGlowing ? 0.4 : 0);

                    // Dynamic Sizing Logic: Refined to prevent overlap
                    // Base size reduced from 240px to 160px.
                    // Backend Scale (1-5) is dampened to (1.0 - 1.8) range.
                    let sizeScale = 1;
                    if (item.nodeSize !== undefined) {
                        // Dampen backend scale: 1->1, 5->1.8
                        sizeScale = 1 + ((item.nodeSize - 1) * 0.2);
                    } else {
                        // Logarithmic scale: Max 1.5x
                        sizeScale = Math.min(1.5, Math.max(0.6, 0.6 + (Math.log10(scans + 1) * 0.3)));
                    }
                    const pixelSize = 160 * sizeScale;

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
