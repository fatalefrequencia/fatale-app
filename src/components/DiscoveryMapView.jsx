import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Minus, Activity, Music, Disc, Mic, Radio, Speaker, Zap, X, ChevronRight, MapPin, Play } from 'lucide-react';
import API from '../services/api';

// ─── CONFIG ────────────────────────────────────────────────────────────────
const WORLD_W = 6000;
const WORLD_H = 3800;
const NODE_W = 76;
const NODE_H = 76;
const COL_GAP = 300;
const ROW_GAP = 240;

const SECTORS = [
    { name: 'NEON SLUMS', x: 200, y: 150, color: '#ff006e', desc: 'Underground beats & raw signal' },
    { name: 'SILICON HEIGHTS', x: 3000, y: 80, color: '#00ffff', desc: 'Synthetic highs & digital dreams' },
    { name: 'DATA VOID', x: 180, y: 2200, color: '#9b5de5', desc: 'Deep frequency & noise art' },
    { name: 'CENTRAL HUB', x: 2700, y: 1700, color: '#ffcc00', desc: 'Convergence point of all signals' },
    { name: 'OUTER RIM', x: 4700, y: 500, color: '#00ff88', desc: 'Fringe transmissions & outliers' },
];

const ICONS = [Disc, Music, Mic, Radio, Speaker, Zap];

// ─── HELPERS ───────────────────────────────────────────────────────────────
const hashStr = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return Math.abs(h);
};

// ─── MAIN ──────────────────────────────────────────────────────────────────
// ─── MAIN ──────────────────────────────────────────────────────────────────
const DiscoveryMapView = ({ navigateToProfile, onPlayPlaylist, allTracks = [] }) => {
    const [artists, setArtists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hoveredId, setHoveredId] = useState(null);
    // Removed old zoom/pan state in favor of viewState
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [panStart, setPanStart] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [youtubeResults, setYoutubeResults] = useState([]);
    const [searchingYoutube, setSearchingYoutube] = useState(false);
    const [activeSector, setActiveSector] = useState(null);
    const [utcTime, setUtcTime] = useState('');
    const containerRef = useRef(null);

    // Stats
    const [stats, setStats] = useState({ online: 0, tracks: 0 });

    // Smooth camera state
    const [viewState, setViewState] = useState({ x: -300, y: -100, zoom: 0.38 });

    // Derived for rendering
    const pan = { x: viewState.x, y: viewState.y };
    const zoom = viewState.zoom;

    // ── UTC CLOCK ──
    useEffect(() => {
        const tick = () => {
            const n = new Date();
            const pad = v => String(v).padStart(2, '0');
            setUtcTime(`${n.getUTCFullYear()}.${pad(n.getUTCMonth() + 1)}.${pad(n.getUTCDate())} ${pad(n.getUTCHours())}:${pad(n.getUTCMinutes())}:${pad(n.getUTCSeconds())} UTC`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // ── DATA ──
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await API.Artists.getAll().catch(() => ({ data: [] }));
                let raw = Array.isArray(res?.data) ? res.data : [];
                setArtists(raw.map((a, i) => {
                    const id = a.id || a.Id || `mock-${i}`;
                    const h = hashStr(id.toString());
                    const sec = SECTORS[h % SECTORS.length];
                    const li = Math.floor((h / SECTORS.length) | 0) % 36;
                    // Simulate play count: real data uses playCount field, mocks get hash-derived value
                    const plays = a.playCount || a.PlayCount || a.plays || ((h % 900) + 10);
                    // Node size: 60px (low plays) → 110px (viral), log-scaled
                    const nodeSize = Math.round(60 + Math.min(50, Math.log10(plays + 1) * 20));
                    return {
                        id,
                        name: a.name || a.Name || `ARTIST_${i}`,
                        userId: a.userId || a.UserId,
                        color: sec.color,
                        icon: ICONS[h % ICONS.length],
                        profileImage: a.profileImageUrl || a.ProfileImageUrl || null,
                        sector: sec.name,
                        x: sec.x + (li % 6) * COL_GAP + ((h % 80) - 40),
                        y: sec.y + Math.floor(li / 6) * ROW_GAP + (((h >> 5) % 60) - 30),
                        isMock: !!a.isMock,
                        plays,
                        nodeSize,
                    };
                }));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ── STATS ──
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [sRes, uRes] = await Promise.all([
                    API.Discovery.getStats().catch(() => ({ data: { totalTracks: 0 } })),
                    API.Discovery.getOnlineUsers().catch(() => ({ data: { count: 1 } }))
                ]);
                setStats({
                    tracks: sRes.data?.totalTracks || 0,
                    online: uRes.data?.count || 1
                });
            } catch (err) {
                console.warn('Failed to fetch stats', err);
            }
        };
        fetchStats();
        // Refresh every 30s
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    // ── SEARCH DEBOUNCE (YouTube) ──
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 3) {
            setYoutubeResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchingYoutube(true);
            try {
                const res = await API.Youtube.search(searchQuery);
                console.log('[DiscoveryMap] Search Response:', res.status, res.data);
                setYoutubeResults(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.warn('YouTube search failed', err);
            } finally {
                setSearchingYoutube(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ── PAN / ZOOM ──
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            // Zoom
            setViewState(prev => {
                const newZoom = Math.min(Math.max(prev.zoom + (e.deltaY > 0 ? -0.05 : 0.05), 0.07), 2);
                return { ...prev, zoom: newZoom };
            });
        } else {
            // Pan
            setViewState(prev => ({
                ...prev,
                x: prev.x - e.deltaX * 1.4,
                y: prev.y - e.deltaY * 1.4
            }));
        }
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    const onPointerDown = (e) => {
        // Don't start drag if clicking on any interactive HUD element
        if (e.target.closest('button, input, [data-hud]')) return;
        if (e.target.closest('.node')) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setPanStart({ x: viewState.x, y: viewState.y });
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        if (!isDragging) return;
        setViewState(prev => ({
            ...prev,
            x: panStart.x + e.clientX - dragStart.x,
            y: panStart.y + e.clientY - dragStart.y
        }));
    };
    const onPointerUp = () => { setIsDragging(false); setDragStart(null); };

    const flyTo = (x, y, z = 0.55) => {
        const vw = containerRef.current?.clientWidth || 900;
        const vh = containerRef.current?.clientHeight || 600;
        setViewState({
            zoom: z,
            x: -(x * z) + vw / 2,
            y: -(y * z) + vh / 2
        });
    };

    const handleRadarPan = (dx, dy) => {
        setViewState(prev => ({
            ...prev,
            x: prev.x - dx * prev.zoom,
            y: prev.y - dy * prev.zoom
        }));
    };

    const localArtists = searchQuery
        ? artists.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const localTracks = searchQuery && allTracks
        ? allTracks.filter(t =>
            t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.artist?.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 10)
        : [];

    const visible = artists; // Keep all nodes visible
    const matchedArtistIds = new Set(localArtists.map(a => a.id));

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative overflow-hidden"
            style={{ background: '#04040a', cursor: isDragging ? 'grabbing' : 'crosshair', fontFamily: "'Space Grotesk', sans-serif" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Share+Tech+Mono&display=swap');
                
                * {
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    text-rendering: optimizeLegibility;
                }

                .mono { 
                    font-family: 'Share Tech Mono', monospace; 
                    letter-spacing: 0.05em;
                }

                @keyframes scanY { 0%{transform:translateY(-100%)} 100%{transform:translateY(300%)} }
                @keyframes pulse-ring { 0%,100%{opacity:.12;transform:scale(1)} 50%{opacity:.4;transform:scale(1.18)} }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
                @keyframes drift { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-40} }
                
                .ring-pulse { animation: pulse-ring 4s ease-in-out infinite; }
                .blink { animation: blink 1.6s ease-in-out infinite; }
                .drift-line { animation: drift 3s linear infinite; }
                
                .hud-panel {
                    background: rgba(4,4,10,0.85);
                    border: 1px solid rgba(255,255,255,0.08);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                    isolation: isolate;
                }
                .hud-panel-accent {
                    background: rgba(4,4,10,0.85);
                    border: 1px solid rgba(255,0,110,0.15);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    isolation: isolate;
                }
                .node-card {
                    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, border-color 0.2s ease, filter 0.2s ease;
                }
            `}</style>

            {/* ── WORLD ── */}
            <motion.div
                className="absolute top-0 left-0 origin-top-left"
                animate={{
                    x: viewState.x,
                    y: viewState.y,
                    scale: viewState.zoom
                }}
                transition={{
                    type: isDragging ? "tween" : "spring",
                    stiffness: isDragging ? undefined : 260,
                    damping: isDragging ? undefined : 20,
                    duration: isDragging ? 0 : undefined
                }}
                style={{ width: WORLD_W, height: WORLD_H }}
            >
                {/* Hex grid SVG */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.055 }}>
                    <defs>
                        <pattern id="hex" x="0" y="0" width="80" height="92" patternUnits="userSpaceOnUse">
                            <polygon points="40,2 78,22 78,70 40,90 2,70 2,22" fill="none" stroke="#ff006e" strokeWidth="0.6" />
                        </pattern>
                        <radialGradient id="worldFade" cx="50%" cy="50%" r="55%">
                            <stop offset="0%" stopColor="white" stopOpacity="1" />
                            <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </radialGradient>
                        <mask id="worldMask">
                            <rect width="100%" height="100%" fill="url(#worldFade)" />
                        </mask>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hex)" mask="url(#worldMask)" />
                </svg>

                {/* Sector atmosphere — keep the haze, just slightly lighter */}
                {SECTORS.map(s => (
                    <div key={s.name} className="absolute pointer-events-none" style={{
                        left: s.x - 200, top: s.y - 150, width: 900, height: 600,
                        background: `radial-gradient(ellipse at 35% 40%, ${s.color}09 0%, transparent 60%)`,
                    }} />
                ))}

                {/* Sector labels — large ghost text */}
                {SECTORS.map(s => (
                    <div key={`lbl-${s.name}`} className="absolute pointer-events-none mono" style={{
                        left: s.x - 10, top: s.y - 50,
                        fontSize: 64, fontWeight: 900, letterSpacing: '0.25em',
                        color: s.color, opacity: 0.04, whiteSpace: 'nowrap', userSelect: 'none',
                    }}>
                        {s.name}
                    </div>
                ))}

                {/* Connection lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {visible.map((a, i) => {
                        const b = visible[i + 1];
                        if (!b || i % 4 !== 0 || a.sector !== b.sector) return null;
                        return (
                            <line key={`l${i}`}
                                x1={a.x + NODE_W / 2} y1={a.y + NODE_H / 2}
                                x2={b.x + NODE_W / 2} y2={b.y + NODE_H / 2}
                                stroke={a.color} strokeWidth="0.8" strokeDasharray="6 14"
                                opacity="0.12" className="drift-line"
                            />
                        );
                    })}
                </svg>

                {/* Nodes */}
                {visible.map(a => (
                    <ArtistNode
                        key={a.id}
                        artist={a}
                        hovered={hoveredId === a.id}
                        isSearchResult={searchQuery.length > 0 && matchedArtistIds.has(a.id)}
                        dimmed={searchQuery.length > 0 && !matchedArtistIds.has(a.id)}
                        onHover={setHoveredId}
                        onClick={() => navigateToProfile?.(a.userId)}
                    />
                ))}
            </motion.div>

            {/* Scan line */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(255,0,110,0.025) 50%, transparent 100%)',
                    animation: 'scanY 10s linear infinite',
                }} />
            </div>

            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 45%, #04040a 100%)',
            }} />

            {/* Atmospheric fog — mostly purple with faint sector hints */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: [
                    'radial-gradient(ellipse 70% 55% at 20% 25%, rgba(155,93,229,0.13) 0%, transparent 65%)',
                    'radial-gradient(ellipse 60% 50% at 75% 70%, rgba(155,93,229,0.10) 0%, transparent 60%)',
                    'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(155,93,229,0.06) 0%, transparent 55%)',
                    'radial-gradient(ellipse 35% 30% at 85% 20%, rgba(0,255,255,0.03) 0%, transparent 50%)',
                    'radial-gradient(ellipse 30% 25% at 10% 80%, rgba(155,93,229,0.08) 0%, transparent 50%)',
                ].join(', '),
            }} />

            {/* ══════════════════════════════════════════
                HUD ELEMENTS
            ══════════════════════════════════════════ */}

            {/* TOP-LEFT: Search + title */}
            <div data-hud className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                {/* Title bar */}
                <div className="hud-panel rounded-lg px-[18px] py-[10px] flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff006e] blink shadow-[0_0_8px_#ff006e]" />
                    <span className="mono text-[10px] tracking-[0.4em] text-white/95 uppercase font-bold">Discovery // Node Map</span>
                    <span className="mono text-[10px] text-[#ff006e] ml-3 tabular-nums font-bold drop-shadow-[0_0_4px_rgba(255,0,110,0.3)]">{utcTime}</span>
                </div>

                {/* Search */}
                <div className="flex flex-col gap-1">
                    <div
                        className="hud-panel rounded-lg flex items-center gap-2 px-3 overflow-hidden transition-all duration-300 relative z-[60]"
                        style={{ width: searchOpen ? 320 : 38, height: 36 }}
                    >
                        <button
                            onClick={() => { setSearchOpen(s => !s); if (searchOpen) setSearchQuery(''); }}
                            className="flex-shrink-0 text-white/50 hover:text-[#ff006e] transition-colors"
                        >
                            {searchOpen ? <X size={13} /> : <Search size={13} />}
                        </button>
                        {searchOpen && (
                            <input
                                autoFocus
                                placeholder="search nodes or youtube..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-white/80 text-[11px] outline-none placeholder:text-white/30 mono"
                            />
                        )}
                        {searchingYoutube && <div className="w-3 h-3 border-2 border-[#ff006e] border-t-transparent rounded-full animate-spin mr-1" />}
                    </div>

                    {/* Search Results Dropdown */}
                    <AnimatePresence>
                        {searchOpen && searchQuery.length >= 2 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="hud-panel rounded-lg w-[320px] max-h-[400px] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1 border border-white/5 shadow-2xl mt-1"
                            >
                                {/* Local Artists */}
                                {localArtists.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <div className="mono text-[8px] text-white/30 px-2 py-1 tracking-widest uppercase">Artists on Map</div>
                                        {localArtists.slice(0, 5).map(a => (
                                            <button
                                                key={`local-art-${a.id}`}
                                                onClick={() => { flyTo(a.x, a.y, 0.8); setSearchOpen(false); }}
                                                className="w-full text-left p-2 rounded hover:bg-white/5 flex items-center gap-3 group transition-colors"
                                            >
                                                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
                                                    <MapPin size={12} className="text-[#ff006e]/50 group-hover:text-[#ff006e]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] text-white font-bold truncate tracking-wider">{a.name}</div>
                                                    <div className="text-[8px] text-white/60 mono uppercase">{a.sector}</div>
                                                </div>
                                                <ChevronRight size={12} className="text-white/30 group-hover:text-white/60" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Local Tracks */}
                                {localTracks.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-2 border-t border-white/5 pt-2">
                                        <div className="mono text-[8px] text-white/30 px-2 py-1 tracking-widest uppercase">Local Tracks</div>
                                        {localTracks.map(t => (
                                            <button
                                                key={`local-trk-${t.id}`}
                                                onClick={() => { onPlayPlaylist?.([t], 0); setSearchOpen(false); }}
                                                className="w-full text-left p-2 rounded hover:bg-white/5 flex items-center gap-3 group transition-colors"
                                            >
                                                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center">
                                                    <Music size={12} className="text-[#00ffff]/50 group-hover:text-[#00ffff]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] text-white font-bold truncate tracking-wider">{t.title}</div>
                                                    <div className="text-[8px] text-white/60 mono uppercase truncate">{t.artist}</div>
                                                </div>
                                                <Play size={10} className="text-white/30 group-hover:text-[#ff006e]" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* YouTube Results */}
                                {youtubeResults.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-2 border-t border-white/5 pt-2">
                                        <div className="mono text-[8px] text-white/30 px-2 py-1 tracking-widest uppercase font-bold text-[#ff006e]/80">Global Frequency (YouTube)</div>
                                        {youtubeResults.slice(0, 8).map((yt, idx) => {
                                            const id = yt.id || yt.Id || `yt-fallback-${idx}`;
                                            const title = yt.title || yt.Title || 'Unknown Title';
                                            const author = yt.author || yt.Author || yt.channelTitle || 'Unknown Artist';
                                            const thumb = yt.thumbnailUrl || yt.ThumbnailUrl || (yt.snippet?.thumbnails?.default?.url);

                                            return (
                                                <button
                                                    key={id}
                                                    onClick={() => {
                                                        const track = {
                                                            id,
                                                            title,
                                                            artist: author,
                                                            duration: '0:00',
                                                            cover: thumb,
                                                            source: `youtube:${id}`,
                                                            isYoutube: true,
                                                            isYT: true
                                                        };
                                                        onPlayPlaylist?.([track], 0);
                                                        setSearchOpen(false);
                                                    }}
                                                    className="w-full text-left p-2 rounded hover:bg-white/5 flex items-center gap-3 group transition-colors"
                                                >
                                                    <div className="w-10 h-6 rounded bg-black/40 overflow-hidden relative flex-shrink-0">
                                                        <img src={thumb} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute inset-0 bg-[#ff006e]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[9px] text-white font-medium truncate leading-tight" dangerouslySetInnerHTML={{ __html: title }} />
                                                        <div className="text-[7px] text-white/60 mono uppercase truncate">{author}</div>
                                                    </div>
                                                    <Play size={10} className="text-[#ff006e]/40 group-hover:text-[#ff006e] flex-shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {searchingYoutube && youtubeResults.length === 0 && (
                                    <div className="p-6 flex flex-col items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-[#ff006e] border-t-transparent rounded-full animate-spin" />
                                        <div className="mono text-[8px] text-white/30 tracking-[0.2em]">Scanning Frequencies...</div>
                                    </div>
                                )}

                                {localArtists.length === 0 && localTracks.length === 0 && youtubeResults.length === 0 && !searchingYoutube && (
                                    <div className="p-8 text-center flex flex-col items-center gap-2">
                                        <Search size={20} className="text-white/5 mb-2" />
                                        <div className="mono text-[9px] text-white/20 tracking-widest">SIGNAL LOST: NO MATCHES FOUND</div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* TOP-RIGHT: Stats */}
            <div data-hud className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
                <div className="hud-panel rounded-lg px-[18px] py-[10px] flex items-center gap-3">
                    <Activity size={12} className="text-[#ff006e] drop-shadow-[0_0_4px_#ff006e]" />
                    <span className="mono text-[10px] tracking-widest text-white/95 font-bold">
                        <span className="text-white/60">ONLINE:</span> {stats.online}
                    </span>
                    <span className="mono text-[10px] text-white/50 font-bold">·</span>
                    <span className="mono text-[10px] tracking-widest text-white/95 font-bold">
                        {visible.length} <span className="text-white/60">NODES</span>
                    </span>
                    <span className="mono text-[10px] text-white/50 font-bold">·</span>
                    <span className="mono text-[10px] tracking-widest text-white/95 font-bold">
                        {stats.tracks} <span className="text-white/60">TRACKS</span>
                    </span>
                </div>
            </div>

            {/* BOTTOM-LEFT: Zoom controls */}
            <div data-hud className="absolute bottom-8 left-4 z-50 flex flex-col gap-1">
                {[
                    { icon: Plus, delta: 0.1 },
                    { icon: Minus, delta: -0.1 },
                ].map(({ icon: Icon, delta }) => (
                    <button
                        key={delta}
                        onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(Math.max(prev.zoom + delta, 0.07), 2) }))}
                        className="hud-panel w-8 h-8 rounded-md flex items-center justify-center text-white/50 hover:text-[#ff006e] transition-all"
                    >
                        <Icon size={12} />
                    </button>
                ))}
            </div>

            {/* BOTTOM-CENTER: Sector nav */}
            <div data-hud className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1">
                {SECTORS.map(s => (
                    <button
                        key={s.name}
                        onClick={() => { flyTo(s.x + 600, s.y + 300); setActiveSector(s.name); }}
                        className="rounded-md px-3 py-2 flex items-center gap-2 transition-all duration-200 shadow-lg"
                        style={{
                            background: activeSector === s.name ? `${s.color}25` : 'rgba(4,4,10,0.85)',
                            border: `1px solid ${activeSector === s.name ? s.color : 'rgba(255,255,255,0.15)'}`,
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color, opacity: activeSector === s.name ? 1 : 0.7, boxShadow: activeSector === s.name ? `0 0 8px ${s.color}` : 'none' }} />
                        <span className="mono text-[9px] tracking-[0.25em] uppercase font-bold"
                            style={{ color: activeSector === s.name ? '#ffffff' : 'rgba(255,255,255,0.85)', textShadow: activeSector === s.name ? `0 0 10px ${s.color}aa` : 'none' }}>
                            {s.name}
                        </span>
                    </button>
                ))}
            </div>

            {/* BOTTOM-RIGHT: Radar */}
            <RadarMinimap
                artists={visible}
                pan={pan}
                zoom={zoom}
                sectors={SECTORS}
                containerRef={containerRef}
                onNavigate={(wx, wy) => flyTo(wx, wy, 0.5)}
                onPan={handleRadarPan}
            />

            {/* Loading */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
                        className="absolute inset-0 z-[999] flex flex-col items-center justify-center"
                        style={{ background: '#04040a' }}
                    >
                        <div className="mono text-[10px] tracking-[0.6em] text-[#ff006e]/40 uppercase mb-4">Initializing Node Map</div>
                        <div className="flex gap-1">
                            {[0, 1, 2, 3, 4].map(i => (
                                <div key={i} className="w-1 h-6 rounded-full bg-[#ff006e]/30"
                                    style={{ animation: `blink 1s ease-in-out ${i * 0.15}s infinite` }} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

// ─── ARTIST NODE ─────────────────────────────────────────────────────────
const ArtistNode = ({ artist, hovered, isSearchResult, dimmed, onHover, onClick }) => {
    const Icon = artist.icon || Music;
    const sz = artist.nodeSize || 76; // dynamic size based on plays
    return (
        <div
            className="node absolute"
            style={{
                left: artist.x,
                top: artist.y,
                width: sz,
                height: sz,
                opacity: dimmed ? 0.2 : 1,
                filter: dimmed ? 'grayscale(0.5) blur(1px)' : 'none',
                transition: 'opacity 0.5s ease, filter 0.5s ease',
                zIndex: isSearchResult || hovered ? 10 : 1
            }}
            onMouseEnter={() => onHover(artist.id)}
            onMouseLeave={() => onHover(null)}
            onClick={onClick}
        >
            {/* Search Highlight */}
            <AnimatePresence>
                {isSearchResult && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.4, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="absolute inset-0 rounded-full"
                        style={{ border: `2px solid ${artist.color}`, boxShadow: `0 0 30px ${artist.color}` }}
                        transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
                    />
                )}
            </AnimatePresence>

            {/* Pulse ring */}
            <div className="ring-pulse absolute rounded-sm pointer-events-none" style={{
                inset: -10,
                border: `1px solid ${artist.color}`,
                opacity: hovered ? 0.65 : 0.28,
                borderRadius: 6,
                transition: 'opacity 0.25s',
            }} />

            {/* Glow halo */}
            <div className="absolute pointer-events-none" style={{
                inset: -6,
                background: `radial-gradient(circle, ${artist.color}35 0%, transparent 70%)`,
                opacity: hovered ? 1 : 0.5,
                transition: 'opacity 0.25s',
            }} />

            {/* Card */}
            <div
                className="node-card relative w-full h-full overflow-hidden"
                style={{
                    borderRadius: 6,
                    border: `1px solid ${hovered ? artist.color : artist.color + '55'}`,
                    boxShadow: hovered
                        ? `0 0 24px ${artist.color}55, 0 0 60px ${artist.color}18, inset 0 0 12px ${artist.color}10`
                        : `0 0 10px ${artist.color}25`,
                    transform: hovered ? 'scale(1.18)' : 'scale(1)',
                    cursor: 'pointer',
                }}
            >
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-3 h-3 pointer-events-none" style={{ borderTop: `1px solid ${artist.color}`, borderLeft: `1px solid ${artist.color}` }} />
                <div className="absolute top-0 right-0 w-3 h-3 pointer-events-none" style={{ borderTop: `1px solid ${artist.color}`, borderRight: `1px solid ${artist.color}` }} />
                <div className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none" style={{ borderBottom: `1px solid ${artist.color}`, borderLeft: `1px solid ${artist.color}` }} />
                <div className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none" style={{ borderBottom: `1px solid ${artist.color}`, borderRight: `1px solid ${artist.color}` }} />

                {/* Content */}
                {artist.profileImage ? (
                    <img
                        src={artist.profileImage}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        style={{ filter: hovered ? 'brightness(1) saturate(1.1)' : 'brightness(0.55) saturate(0.6)' }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{
                        background: `linear-gradient(135deg, #08080f 0%, ${artist.color}12 100%)`,
                    }}>
                        <Icon size={Math.round(sz * 0.34)} style={{ color: artist.color, opacity: hovered ? 0.85 : 0.35 }} />
                    </div>
                )}

                {/* Scanline overlay */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
                }} />

                {/* Bottom ID strip */}
                <div className="absolute bottom-0 inset-x-0 px-1.5 py-0.5" style={{
                    background: `linear-gradient(to top, ${artist.color}20, transparent)`,
                }}>
                    <div className="mono truncate" style={{ fontSize: Math.max(6, Math.round(sz * 0.09)), color: artist.color, opacity: 0.7, letterSpacing: '0.1em' }}>
                        {artist.name.toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.92 }}
                        transition={{ duration: 0.14 }}
                        className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-50"
                        style={{ bottom: sz + 12, whiteSpace: 'nowrap' }}
                    >
                        <div className="px-3 py-2 rounded-md mono text-[10px] tracking-widest" style={{
                            background: 'rgba(4,4,10,0.98)',
                            border: `1px solid ${artist.color}80`,
                            color: '#ffffff',
                            boxShadow: `0 8px 32px rgba(0,0,0,0.9), 0 0 16px ${artist.color}30`,
                        }}>
                            <div className="text-[#ff006e] text-[8px] mb-0.5 font-bold uppercase">{artist.sector}</div>
                            {artist.name.toUpperCase()}
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45"
                            style={{ bottom: -4, background: artist.color + '50', border: `1px solid ${artist.color}50` }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── RADAR MINIMAP ─────────────────────────────────────────────────────────
const RW = 200, RH = 130;

const RadarMinimap = ({ artists, pan, zoom, sectors, containerRef, onNavigate, onPan }) => {
    const sx = RW / WORLD_W;
    const sy = RH / WORLD_H;
    const el = containerRef?.current;

    // Viewport box in radar-pixel space — clamp to max 50% of radar dims
    const screenW = el ? el.clientWidth : 900;
    const screenH = el ? el.clientHeight : 600;
    const vpWWorld = screenW / zoom;
    const vpHWorld = screenH / zoom;
    const vpX = Math.max(0, -pan.x / zoom);
    const vpY = Math.max(0, -pan.y / zoom);

    const boxX = Math.max(0, Math.min(vpX * sx, RW - 4));
    const boxY = Math.max(0, Math.min(vpY * sy, RH - 4));
    const boxW = Math.min(vpWWorld * sx, RW * 0.5, RW - boxX);
    const boxH = Math.min(vpHWorld * sy, RH * 0.5, RH - boxY);

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleBoxDown = (e) => {
        e.stopPropagation();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleBoxMove = (e) => {
        if (!isDragging || !onPan) return;
        const dx = (e.clientX - dragStart.x) / sx;
        const dy = (e.clientY - dragStart.y) / sy;
        onPan(dx, dy);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleBoxUp = () => setIsDragging(false);

    const handleClick = (e) => {
        if (!onNavigate || isDragging) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const rx = e.clientX - rect.left;
        const ry = e.clientY - rect.top;
        // Convert radar coords to world coords
        onNavigate(rx / sx, ry / sy);
    };

    return (
        <div
            data-hud
            className="absolute bottom-8 right-4 z-50 rounded-xl overflow-hidden"
            style={{
                width: RW, height: RH,
                background: 'rgba(4,4,10,0.9)',
                border: '1px solid rgba(255,0,110,0.22)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 0 40px rgba(255,0,110,0.08)',
                cursor: 'crosshair',
            }}
            onClick={handleClick}
        >
            {/* Hex grid on radar */}
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.08 }}>
                <defs>
                    <pattern id="rhex" x="0" y="0" width="20" height="23" patternUnits="userSpaceOnUse">
                        <polygon points="10,1 19,5.5 19,17.5 10,22 1,17.5 1,5.5" fill="none" stroke="#ff006e" strokeWidth="0.4" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#rhex)" />
            </svg>

            {/* Sector glows */}
            {sectors.map(s => (
                <div key={s.name} className="absolute rounded-full pointer-events-none" style={{
                    left: s.x * sx - 12, top: s.y * sy - 8,
                    width: 24, height: 16,
                    background: `radial-gradient(ellipse, ${s.color}50 0%, transparent 70%)`,
                }} />
            ))}

            {/* Artist dots */}
            {artists.map(a => (
                <div key={a.id} className="absolute rounded-full" style={{
                    left: a.x * sx, top: a.y * sy,
                    width: 2.5, height: 2.5,
                    background: a.color, opacity: 0.85,
                    boxShadow: `0 0 3px ${a.color}`,
                }} />
            ))}

            {/* Viewport rect — Properly draggable */}
            <div
                className="absolute"
                onPointerDown={handleBoxDown}
                onPointerMove={handleBoxMove}
                onPointerUp={handleBoxUp}
                onPointerCancel={handleBoxUp}
                onClick={(e) => e.stopPropagation()}
                style={{
                    left: boxX, top: boxY,
                    width: boxW, height: boxH,
                    border: '1px solid rgba(255,0,110,0.8)',
                    background: 'rgba(255,0,110,0.15)',
                    boxShadow: '0 0 8px rgba(255,0,110,0.2)',
                    cursor: 'grab',
                    zIndex: 20
                }}
            />

            {/* Sweep */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: 'linear-gradient(to bottom, transparent 0%, rgba(255,0,110,0.06) 50%, transparent 100%)',
                animation: 'scanY 4s linear infinite',
            }} />

            {/* Labels */}
            <div className="absolute bottom-1.5 left-2 mono text-[7px] tracking-[0.3em] uppercase" style={{ color: 'rgba(255,0,110,0.5)' }}>
                RADAR // LIVE
            </div>
            <div className="absolute top-1.5 right-2 mono text-[7px]" style={{ color: 'rgba(255,0,110,0.4)' }}>
                {artists.length.toString().padStart(3, '0')}
            </div>
            {/* Click hint */}
            <div className="absolute bottom-1.5 right-2 mono text-[6px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                CLICK TO NAV
            </div>
        </div>
    );
};

export default DiscoveryMapView;
