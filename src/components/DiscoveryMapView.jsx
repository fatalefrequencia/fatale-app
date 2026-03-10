import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Minus, Activity, Music, Disc, Mic, Radio, Speaker, Zap, X, ChevronRight, MapPin, Play } from 'lucide-react';
import API from '../services/api';
import { CommunityDetailsModal, CreateCommunityModal } from './CommunityModals';

// ─── CONFIG ────────────────────────────────────────────────────────────────
const WORLD_W = 6000;
const WORLD_H = 3800;
const NODE_W = 76;
const NODE_H = 76;
const COL_GAP = 320;
const ROW_GAP = 280;

export const SECTORS = [
    { name: 'ELECTRONIC', x: 1400, y: 1100, color: '#ff006e', desc: 'House, Techno, Trance, Drum & Bass', subgenres: ['House', 'Techno', 'Ambient', 'Trance', 'Drum & Bass'] },
    { name: 'HIP HOP / R&B', x: 3000, y: 600, color: '#00ffff', desc: 'Trap, Boom Bap, Neo-soul, Drill', subgenres: ['Trap', 'Boom Bap', 'Neo-Soul', 'Drill'] },
    { name: 'POP / DANCE', x: 1400, y: 2700, color: '#9b5de5', desc: 'Synthpop, Hyperpop, K-Pop, Disco', subgenres: ['Synthpop', 'Hyperpop', 'K-Pop', 'Disco'] },
    { name: 'ROCK / METAL', x: 3000, y: 3200, color: '#ffcc00', desc: 'Indie, Post-Punk, Shoegaze, Alt', subgenres: ['Indie Rock', 'Post-Punk', 'Black Metal', 'Shoegaze'] },
    { name: 'EXPERIMENTAL / JAZZ', x: 4600, y: 1100, color: '#00ff88', desc: 'Free Jazz, Noise, IDM, Avant-Garde', subgenres: ['Free Jazz', 'Noise', 'IDM', 'Avant-Garde'] },
    { name: 'SOUL / GOSPEL', x: 4600, y: 2700, color: '#ff9900', desc: 'Neo-Soul, Gospel, Blues, Funk', subgenres: ['Neo-Soul', 'Gospel', 'Blues', 'Funk'] },
];

const ICONS = [Disc, Music, Mic, Radio, Speaker, Zap];

// ─── HELPERS ───────────────────────────────────────────────────────────────
const hashStr = (s) => {
    if (!s) return 0;
    let h = 0;
    const str = s.toString();
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

const MapClock = React.memo(() => {
    const [utcTime, setUtcTime] = useState('');

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

    return <span className="mono text-[10px] text-[#ff006e] ml-3 tabular-nums font-bold drop-shadow-[0_0_4px_rgba(255,0,110,0.3)]">{utcTime}</span>;
});

// ─── MAIN ──────────────────────────────────────────────────────────────────
const DiscoveryMapView = ({ navigateToProfile, onPlayPlaylist, allTracks = [], favoriteStations = [], user, onCommunityUpdate }) => {
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
    const [isScanning, setIsScanning] = useState(false);
    const [activeSector, setActiveSector] = useState(null);
    const [placedYoutubeSignals, setPlacedYoutubeSignals] = useState([]);
    const containerRef = useRef(null);

    // Debounced view for "Search this area" logic
    const [lastStableCenter, setLastStableCenter] = useState({ x: 4200, y: 1900 });
    const [debouncedZoom, setDebouncedZoom] = useState(0.35);

    // Stats
    const [stats, setStats] = useState({ online: 0, tracks: 0 });

    // Smooth camera state - start fully zoomed out to see the circular layout
    const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 0.12 });

    // Derived for rendering
    const pan = { x: viewState.x, y: viewState.y };
    const zoom = viewState.zoom;

    // Communities
    const [communities, setCommunities] = useState([]);
    const [selectedCommunity, setSelectedCommunity] = useState(null);
    const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
    const [communityActionLoading, setCommunityActionLoading] = useState(false);

    // Vitality Layer (Top Tracks & Connections)
    const [vitalitySignals, setVitalitySignals] = useState([]);
    const [vitalityLines, setVitalityLines] = useState([]);

    // ── DATA ──
    const fetchMapData = async () => {
        setLoading(true);
        try {
            const [res, commRes] = await Promise.all([
                API.Artists.getAll().catch(() => ({ data: [] })),
                API.Communities.getAll().catch(() => ({ data: [] }))
            ]);
            let raw = Array.isArray(res?.data) ? res.data : [];
            let comms = Array.isArray(commRes?.data) ? commRes.data : [];

            // Assign sectors & positions to communities
            const processedComms = comms.map((c, i) => {
                const hComm = hashStr(c.name || 'comm' + i);
                const sec = SECTORS[c.sectorId] || SECTORS[0];
                return {
                    ...c,
                    x: sec.x + (hComm % 700) - 100,
                    y: sec.y + ((hComm >> 4) % 400),
                    color: sec.color,
                    sector: sec.name
                };
            });
            setCommunities(processedComms);

            setArtists(raw.map((a, i) => {
                const id = a.id || a.Id || `mock-${i}`;
                const hashSource = (a.userId || a.UserId || id).toString();

                // User's specific community
                const commId = a.communityId || a.CommunityId;
                let targetComm = commId ? processedComms.find(c => c.id === commId) : null;

                const dbSectorId = a.sectorId ?? a.SectorId;
                const h = hashStr(hashSource);
                const sec = targetComm ? (SECTORS[targetComm.sectorId] || SECTORS[0]) : ((dbSectorId !== null && dbSectorId !== undefined) ? SECTORS[dbSectorId] : SECTORS[h % SECTORS.length]);
                const li = Math.floor((h / SECTORS.length) | 0) % 36;
                // Simulate play count
                const plays = a.playCount || a.PlayCount || a.plays || ((h % 900) + 10);
                // Enhanced Node size: 60px (low plays) → 180px (superstar landmark)
                const nodeSize = Math.round(50 + Math.min(130, Math.log10(plays + 1) * 38));
                return {
                    id,
                    name: a.name || a.Name || `ARTIST_${i}`,
                    userId: a.userId || a.UserId,
                    color: sec.color,
                    icon: ICONS[h % ICONS.length],
                    profileImage: a.profileImageUrl || a.ProfileImageUrl || null,
                    sector: sec.name,
                    targetCommId: targetComm?.id,
                    x: targetComm ? targetComm.x + (((h % 40) - 20) * 8) : sec.x + (li % 6) * COL_GAP + ((h % 250) - 125),
                    y: targetComm ? targetComm.y + ((((h >> 2) % 40) - 20) * 8) : sec.y + Math.floor(li / 6) * ROW_GAP + (((h >> 5) % 200) - 100),
                    isMock: !!a.isMock,
                    plays,
                    nodeSize,
                    isResident: plays > 5000
                };
            }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMapData();
    }, []);

    // Community Handlers
    const handleJoinCommunity = async (communityId) => {
        setCommunityActionLoading(true);
        try {
            await API.Communities.join(communityId);
            showNotification('ACCESS GRANTED', 'You have successfully joined the node community.', 'success');
            if (onCommunityUpdate) await onCommunityUpdate();
            await fetchMapData(); // Refresh map
            setSelectedCommunity(null);
        } catch (error) {
            console.error("Failed to join community", error);
            showNotification('JOIN_FAILURE', error.response?.data?.message || 'Could not establish connection to the community node.', 'error');
        } finally {
            setCommunityActionLoading(false);
        }
    };

    const handleLeaveCommunity = async (communityId) => {
        setCommunityActionLoading(true);
        try {
            await API.Communities.leave();
            showNotification('CONNECTION SEVERED', 'You have left the community frequency.', 'info');
            if (onCommunityUpdate) await onCommunityUpdate();
            await fetchMapData(); // Refresh map
            setSelectedCommunity(null);
        } catch (error) {
            console.error("Failed to leave community", error);
            showNotification('DEPARTURE_ERROR', 'The system encountered an error while purging community data from your profile.', 'error');
        } finally {
            setCommunityActionLoading(false);
        }
    };

    const handleFoundCommunity = async (data) => {
        setCommunityActionLoading(true);
        try {
            await API.Communities.create(data);
            showNotification('COMMUNITY ESTABLISHED', `${data.name.toUpperCase()} has been initialized on the frequency map.`, 'success');
            if (onCommunityUpdate) await onCommunityUpdate();
            await fetchMapData(); // Refresh map
            setIsCreatingCommunity(false);
        } catch (error) {
            console.error("Failed to found community", error);
            const msg = error.response?.data?.message || error.response?.data || 'Failed to initialize the new community node.';
            showNotification('INITIALIZATION_FAILED', msg, 'error');
            // We'll also handle the error locally in the modal if preferred, but global notification is a good start
            throw error; // Rethrow to let the modal component handle its own error state
        } finally {
            setCommunityActionLoading(false);
        }
    };

    // Intro zoom effect
    useEffect(() => {
        const timer = setTimeout(() => {
            // Nudging even further right as requested (4200 instead of 3600)
            flyTo(4200, 1900, 0.35);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    // ── VITALITY GENERATION (REAL DATA) ──
    useEffect(() => {
        let active = true;
        const generateVitality = async () => {
            try {
                // 1. Fetch real Fatale trending tracks once
                const fataleRes = await API.Tracks.getAllTracks({ sort: 'trending' });
                let trendingFatale = fataleRes.data || [];
                if (trendingFatale.length === 0 && allTracks && allTracks.length > 0) {
                    trendingFatale = allTracks;
                }

                // 2. Sequential Fetch for each sector to prevent YouTube API rate limiting
                const allSignals = [];
                const allLines = [];

                for (const sec of SECTORS) {
                    if (!active) break;

                    const secSignals = [];
                    const secLines = [];

                    // A. Fatale signals for this sector
                    let sectorFatale = trendingFatale.filter(t => {
                        const tags = (t.Tags || t.tags || "").toLowerCase();
                        return tags.includes(sec.name.toLowerCase()) ||
                            sec.subgenres.some(sg => tags.includes(sg.toLowerCase()));
                    }).slice(0, 3);

                    if (sectorFatale.length === 0 && trendingFatale.length > 0) {
                        const start = Math.abs(hashStr(sec.name)) % trendingFatale.length;
                        sectorFatale = trendingFatale.slice(start, start + 2);
                    }

                    sectorFatale.forEach((t, i) => {
                        const tId = t.Id || t.id;
                        const h = hashStr(tId + sec.name);
                        const pPath = t.FilePath || t.filePath || "";
                        const source = pPath.startsWith('http') ? pPath : `http://localhost:5264${pPath}`;
                        const cover = t.CoverImageUrl || t.coverImageUrl || t.ImageUrl || t.imageUrl || "";
                        const normalizedCover = cover.startsWith('http') ? cover : `http://localhost:5264${cover}`;

                        secSignals.push({
                            id: `v-fatale-${tId}-${sec.name}`,
                            trackId: tId,
                            title: t.Title || t.title || "UNTITLED_NODE",
                            artist: t.Artist?.Name || t.artist || "ARCHIVE_SIGNAL",
                            color: '#ff0000',
                            isYoutube: false,
                            track: {
                                ...t,
                                id: tId,
                                dbId: tId,
                                source: source,
                                cover: normalizedCover,
                                isOwned: true,
                                isLocked: false
                            },
                            x: sec.x + (i % 2 === 0 ? 350 : -350) + (h % 300),
                            y: sec.y + (i < 2 ? 350 : -350) + ((h >> 2) % 300),
                        });
                    });

                    // B. YouTube discovery for this sector
                    try {
                        const searchQuery = `${sec.name} ${sec.subgenres?.[0] || ""}`;
                        const ytRes = await API.Youtube.getDiscoveryNodes(searchQuery);
                        const ytNodes = (ytRes.data || []).slice(0, 2);

                        console.log(`[VITALITY] YT Results for ${sec.name}: ${ytNodes.length}`);

                        ytNodes.forEach((node, i) => {
                            const nId = node.Id || node.id;
                            const h = hashStr(nId + sec.name);
                            const nTitle = node.Title || node.title || "YT_SIGNAL";
                            const nAuthor = node.Author || node.author || node.Album?.Artist?.Name || node.album?.artist?.name || "STREAM_SOURCE";

                            const sig = {
                                id: `v-yt-${nId}-${sec.name}`,
                                videoId: nId,
                                title: nTitle,
                                artist: nAuthor,
                                color: '#00ffff',
                                isYoutube: true,
                                track: {
                                    id: nId,
                                    dbId: nId,
                                    title: nTitle,
                                    artist: nAuthor,
                                    source: `youtube:${nId}`,
                                    cover: node.ThumbnailUrl || node.thumbnailUrl || node.CoverImageUrl || node.coverImageUrl,
                                    isYoutube: true,
                                    isOwned: true,
                                    isLocked: false,
                                    duration: node.Duration || '0:00'
                                },
                                x: sec.x + (i % 2 === 0 ? 600 : -600) + (h % 400),
                                y: sec.y + (i < 2 ? -500 : 500) + ((h >> 3) % 400),
                            };
                            secSignals.push(sig);

                            // Partner line
                            const partner = secSignals.find(s => !s.isYoutube);
                            if (partner) {
                                secLines.push({
                                    id: `line-${sig.id}-${partner.id}`,
                                    from: sig,
                                    to: partner,
                                    color: sec.color
                                });
                            }
                        });
                    } catch (e) {
                        console.warn(`[VITALITY] YT fetch partial fail for ${sec.name}`);
                    }

                    allSignals.push(...secSignals);
                    allLines.push(...secLines);
                }

                if (!active) return;
                setVitalitySignals(allSignals);
                setVitalityLines(allLines);
                console.log(`[VITALITY] Sync Complete: ${allSignals.length} signals`);
            } catch (err) {
                console.error("[VITALITY] Generation error:", err);
            }
        };

        generateVitality();
        return () => { active = false; };
    }, [allTracks]);

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
            setPlacedYoutubeSignals([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchingYoutube(true);
            try {
                const res = await API.Youtube.search(searchQuery);
                console.log('[DiscoveryMap] Search Response:', res.status, res.data);
                const results = Array.isArray(res.data) ? res.data : [];
                setYoutubeResults(results);
                setPlacedYoutubeSignals([]); // Clear old nodes on new search results
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

    // Calculate viewport bounds and update lastStableCenter
    useEffect(() => {
        setIsScanning(true);
        const timer = setTimeout(() => {
            const vw = containerRef.current?.clientWidth || 900;
            const vh = containerRef.current?.clientHeight || 600;
            const wx = (vw / 2 - viewState.x) / viewState.zoom;
            const wy = (vh / 2 - viewState.y) / viewState.zoom;
            setLastStableCenter({ x: wx, y: wy });
            setDebouncedZoom(viewState.zoom);
            setIsScanning(false);
        }, 600);
        return () => clearTimeout(timer);
    }, [viewState.x, viewState.y, viewState.zoom]);

    // Handle persistent YouTube Signal placement
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 3 || youtubeResults.length === 0) return;

        setPlacedYoutubeSignals(prev => {
            const updated = [...prev];
            const vw = containerRef.current?.clientWidth || 900;
            const vh = containerRef.current?.clientHeight || 600;
            const buffer = 1500 / debouncedZoom; // How far out of view we keep nodes before recycling them

            const halfW = (vw / 2) / debouncedZoom;
            const halfH = (vh / 2) / debouncedZoom;
            const b = {
                l: lastStableCenter.x - halfW,
                r: lastStableCenter.x + halfW,
                t: lastStableCenter.y - halfH,
                b: lastStableCenter.y + halfH
            };

            const visibleSectors = SECTORS.filter(s =>
                s.x > b.l - 400 && s.x < b.r + 400 &&
                s.y > b.t - 400 && s.y < b.b + 400
            );

            // Check top 20 results
            youtubeResults.slice(0, 20).forEach((yt, i) => {
                const videoId = yt.id || yt.Id || `yt-${i}`;
                const existingIdx = updated.findIndex(u => u.videoId === videoId);

                // If node exists and is within a reasonable distance, keep it there!
                if (existingIdx !== -1) {
                    const node = updated[existingIdx];
                    const dist = Math.sqrt(Math.pow(node.x - lastStableCenter.x, 2) + Math.pow(node.y - lastStableCenter.y, 2));
                    if (dist < buffer) return; // Still in or near scope, don't move it
                }

                // Node is either new or too far away — re-calculate its world position
                const title = yt.title || yt.Title || 'Unknown';
                const author = yt.author || yt.channelTitle || '';
                const thumb = yt.thumbnailUrl || yt.ThumbnailUrl;
                // Add center to hash or randomness for re-distribution
                const h = hashStr(videoId + title + lastStableCenter.x + i);

                let anchorX, anchorY, scatterX, scatterY;
                if (visibleSectors.length > 0) {
                    const sec = visibleSectors[h % visibleSectors.length];
                    anchorX = sec.x;
                    anchorY = sec.y;
                    scatterX = 1400; scatterY = 1000;
                } else {
                    anchorX = lastStableCenter.x;
                    anchorY = lastStableCenter.y;
                    scatterX = halfW * 1.5; scatterY = halfH * 1.5;
                }

                const newNode = {
                    id: `yt-map-${videoId}-${h}`,
                    videoId, title, author, thumb,
                    x: anchorX + (h % scatterX) - (scatterX / 2),
                    y: anchorY + ((h >> 3) % scatterY) - (scatterY / 2)
                };

                if (existingIdx !== -1) {
                    updated[existingIdx] = newNode;
                } else {
                    updated.push(newNode);
                }
            });

            return updated;
        });
    }, [lastStableCenter, debouncedZoom, youtubeResults, searchQuery]);

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

    const youtubeMapNodes = searchQuery.length >= 3 ? placedYoutubeSignals : [];

    const matchedArtistIdsForRendering = React.useMemo(() =>
        new Set(localArtists.map(a => a.id)),
        [localArtists]);

    const visibleRaw = React.useMemo(() => artists.filter(a => {
        // Search takes priority
        if (searchQuery.length > 0 && matchedArtistIdsForRendering.has(a.id)) return true;

        // LOD Zoom Logic:
        if (viewState.zoom < 0.25) return a.plays > 5000;
        if (viewState.zoom < 0.45) return a.plays > 1000;
        if (viewState.zoom < 0.65) return a.plays > 100;
        return true;
    }), [artists, searchQuery, matchedArtistIdsForRendering, viewState.zoom]);

    const clusteredNodes = React.useMemo(() => {
        // If searching, just render all visible without clusters
        if (searchQuery.length > 0 || viewState.zoom > 0.6) return visibleRaw.map(a => ({ ...a, isCluster: false }));

        const clusters = [];
        const THRESHOLD = 120 / viewState.zoom; // Clustering distance shrinks rapidly as we zoom

        visibleRaw.forEach(a => {
            if (a.targetCommId) {
                // Keep community nodes unclustered for easy viewing, or group them directly to the community hub
                clusters.push({ ...a, isCluster: false });
                return;
            }
            let found = null;
            for (let c of clusters) {
                if (!c.isCluster && c.members) continue; // Skip single non-cluster points? Wait, handle all clusters.
                const dx = c.x - a.x;
                const dy = c.y - a.y;
                if (dx * dx + dy * dy < THRESHOLD * THRESHOLD) {
                    found = c;
                    break;
                }
            }
            if (found) {
                found.count++;
                found.members.push(a);
                // Move cluster center slightly toward new node
                found.x = (found.x * (found.count - 1) + a.x) / found.count;
                found.y = (found.y * (found.count - 1) + a.y) / found.count;
            } else {
                clusters.push({ ...a, isCluster: true, count: 1, members: [a] });
            }
        });

        return clusters.map(c => {
            if (c.count === 1) return { ...c.members[0], isCluster: false };
            return c;
        });
    }, [visibleRaw, viewState.zoom, searchQuery]);

    const visible = clusteredNodes; // Map loop expects 'visible'

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
                    backface-visibility: hidden;
                }

                .mono { 
                    font-family: 'Share Tech Mono', monospace; 
                    letter-spacing: 0.05em;
                }

                @keyframes scanY { 0%{transform:translateY(-100%)} 100%{transform:translateY(300%)} }
                @keyframes pulse-ring { 0%,100%{opacity:.12;transform:scale(1)} 50%{opacity:.4;transform:scale(1.18)} }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
                @keyframes drift { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-40} }
                @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
                
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
                    stiffness: isDragging ? undefined : 450,
                    damping: isDragging ? undefined : 42,
                    mass: 0.5,
                    duration: isDragging ? 0 : undefined
                }}
                style={{ width: WORLD_W, height: WORLD_H, willChange: 'transform' }}
            >
                {/* Hex grid SVG */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.055 }}>
                    <defs>
                        <pattern id="hex" x="0" y="0" width="80" height="92" patternUnits="userSpaceOnUse">
                            <polygon points="40,2 78,22 78,70 40,90 2,70 2,22" fill="none" stroke="#ff006e" strokeWidth="0.6" />
                        </pattern>
                        <radialGradient id="worldFade" cx="50%" cy="50%" r="95%">
                            <stop offset="0%" stopColor="white" stopOpacity="1" />
                            <stop offset="100%" stopColor="white" stopOpacity="0" />
                        </radialGradient>
                        <mask id="worldMask">
                            <rect width="100%" height="100%" fill="url(#worldFade)" />
                        </mask>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#hex)" mask="url(#worldMask)" />
                </svg>

                {/* Vitality Connections (Functional Lines) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                    {vitalityLines.map(line => (
                        <ResonanceLine
                            key={line.id}
                            line={line}
                            onResonanceClick={() => {
                                // Start a "Resonance Session" (mini-mix of connected tracks)
                                if (onPlayPlaylist) {
                                    const tracks = [line.from.track || line.from, line.to.track || line.to].filter(Boolean);
                                    onPlayPlaylist(tracks, 0);
                                }
                            }}
                        />
                    ))}
                </svg>

                {/* Vitality Signals */}
                {vitalitySignals.map(sig => (
                    <TopTrackSignal
                        key={sig.id}
                        signal={sig}
                        onClick={() => {
                            if (onPlayPlaylist && sig.track) onPlayPlaylist([sig.track], 0);
                        }}
                    />
                ))}

                {/* Sector atmosphere - subtle high-fidelity color nebulae */}
                {SECTORS.map(s => (
                    <div key={s.name} className="absolute pointer-events-none" style={{
                        left: s.x - 1200, top: s.y - 800, width: 4800, height: 3200,
                        background: `radial-gradient(ellipse at 50% 50%, ${s.color}08 0%, transparent 70%)`,
                    }} />
                ))}

                <AnimatePresence>
                    {isScanning && searchQuery.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#fbbf24]/10 border border-[#fbbf24]/40 flex items-center gap-3 z-50 overflow-hidden"
                            style={{ boxShadow: '0 0 20px rgba(251,191,36,0.1)' }}
                        >
                            {/* Brackets */}
                            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#fbbf24]" />
                            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#fbbf24]" />

                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                                <Zap size={14} className="text-[#fbbf24]" />
                            </motion.div>
                            <span className="mono text-[10px] tracking-[0.3em] font-black text-[#fbbf24]">SIGNAL_SCANNING_RANGE...</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#fbbf2415] to-transparent scan-light" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sector labels — large ghost text */}
                {SECTORS.map(s => (
                    <div key={`lbl-${s.name}`} className="absolute pointer-events-none mono" style={{
                        left: s.x + 800, top: s.y - 180,
                        zIndex: 1
                    }}>


                        {/* Cyberpunk HUD Overlay Label */}
                        <div className="mt-[-20px] ml-4 flex items-start gap-4">
                            <div className="bg-[#fbbf24] text-black px-2 py-0.5 text-[10px] font-black italic tracking-tighter">
                                SECTOR_0{SECTORS.indexOf(s) + 1}
                            </div>
                            <div className="hud-panel border-l-2 border-[#fbbf24] bg-black/60 p-2 min-w-[120px] relative overflow-hidden">
                                {/* Brackets */}
                                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#fbbf24]/40" />
                                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#fbbf24]/40" />

                                <div className="text-[8px] font-black text-[#fbbf24] uppercase tracking-widest">{s.name.replace('_', ' ')}</div>

                                {/* Status Meter */}
                                <div className="flex gap-0.5 mt-1.5 leading-none">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <div key={i} className={`h-1 w-1.5 ${i < 6 ? 'bg-[#fbbf24]' : 'bg-[#fbbf24]/10'}`} />
                                    ))}
                                    <span className="text-[6px] text-[#fbbf24] ml-2 font-bold opacity-80">LOAD: 72%</span>
                                </div>
                            </div>
                        </div>
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

                {/* Subgenre Labels */}
                {viewState.zoom >= 0.45 && SECTORS.map(s => {
                    if (!s.subgenres) return null;
                    return s.subgenres.map((sg, i) => {
                        const sx = s.x + 400 + (Math.sin(i * Math.PI / 2) * 500);
                        const sy = s.y + 300 + (Math.cos(i * Math.PI / 2) * 400);
                        return (
                            <motion.div key={`sg-${s.name}-${sg}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.15 + (viewState.zoom - 0.45) * 0.3 }}
                                className="absolute pointer-events-none mono"
                                style={{
                                    left: sx, top: sy,
                                    fontSize: 48, fontWeight: 700, letterSpacing: '0.15em',
                                    color: s.color, whiteSpace: 'nowrap', userSelect: 'none',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 0
                                }}>
                                {sg}
                            </motion.div>
                        );
                    });
                })}

                {/* Communities */}
                {communities.map(c => (
                    <CommunityNode key={`comm-${c.id}`} community={c} onClick={() => setSelectedCommunity(c)} />
                ))}

                {/* Nodes */}
                <AnimatePresence>
                    {visible.map(a =>
                        a.isCluster ? (
                            <ClusterNode
                                key={`cluster-${a.id}`}
                                cluster={a}
                                onClick={() => flyTo(a.x, a.y, Math.min(viewState.zoom + 0.3, 1.5))}
                                dimmed={searchQuery.length > 0 && !a.members.some(m => matchedArtistIdsForRendering.has(m.id))}
                                isSearchResult={searchQuery.length > 0 && a.members.some(m => matchedArtistIdsForRendering.has(m.id))}
                            />
                        ) : (
                            <ArtistNode
                                key={a.id}
                                artist={a}
                                hovered={hoveredId === a.id}
                                isSearchResult={searchQuery.length > 0 && matchedArtistIdsForRendering.has(a.id)}
                                dimmed={searchQuery.length > 0 && !matchedArtistIdsForRendering.has(a.id)}
                                onHover={setHoveredId}
                                onClick={() => navigateToProfile?.(a.userId)}
                            />
                        )
                    )}
                </AnimatePresence>

                {/* YouTube Signal Nodes — appear on canvas during search */}
                <AnimatePresence>
                    {youtubeMapNodes.map(node => (
                        <YoutubeSignalNode
                            key={node.id}
                            node={node}
                            onPlay={() => onPlayPlaylist?.([
                                {
                                    id: node.videoId,
                                    title: node.title,
                                    artist: node.author,
                                    source: `youtube:${node.videoId}`,
                                    cover: node.thumb,
                                    isYoutube: true,
                                    duration: '0:00',
                                }
                            ], 0)}
                        />
                    ))}
                </AnimatePresence>

                {/* Vitality Layer (Pulsing Signals & Resonance Lines) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 12 }}>
                    {vitalityLines.map(line => (
                        <ResonanceLine
                            key={line.id}
                            line={line}
                            onResonanceClick={() => {
                                // Find partner signal for context or just play the 'to' signal
                                if (line.to?.track) onPlayPlaylist?.([line.to.track], 0);
                            }}
                        />
                    ))}
                </svg>

                {/* Pulsing Vitality Tracks */}
                {vitalitySignals.map(sig => (
                    <TopTrackSignal
                        key={sig.id}
                        signal={sig}
                        onClick={() => onPlayPlaylist?.([sig.track], 0)}
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

            {/* Atmospheric fog — cinematic gray anchored layer to prevent color bleed */}
            <div className="absolute inset-0 pointer-events-none" style={{
                background: [
                    'radial-gradient(ellipse 70% 55% at 20% 25%, rgba(100,100,110,0.12) 0%, transparent 65%)',
                    'radial-gradient(ellipse 60% 50% at 75% 70%, rgba(90,90,100,0.1) 0%, transparent 60%)',
                    'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(110,110,120,0.08) 0%, transparent 55%)',
                    'radial-gradient(ellipse 35% 30% at 85% 20%, rgba(255,255,255,0.02) 0%, transparent 50%)',
                    'radial-gradient(ellipse 30% 25% at 10% 80%, rgba(80,80,90,0.07) 0%, transparent 50%)',
                ].join(', '),
            }} />

            {/* ══════════════════════════════════════════
                HUD ELEMENTS
            ══════════════════════════════════════════ */}

            {/* TOP RIGHT: HUD controls and stats */}
            <div data-hud className="absolute top-4 right-4 z-50 flex flex-col items-end gap-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCreatingCommunity(true)}
                        className="hud-panel rounded-lg px-3 py-2 flex items-center gap-2 bg-[#ff006e]/5 hover:bg-[#ff006e]/10 transition-colors border-[#ff006e]/20 hover:border-[#ff006e]/50 group"
                    >
                        <Plus size={12} className="text-[#ff006e]/70 group-hover:text-[#ff006e]" />
                        <span className="mono text-[9px] tracking-[0.2em] text-[#ff006e]/70 group-hover:text-[#ff006e] uppercase font-black italic">
                            FOUND_COMMUNITY
                        </span>
                    </button>

                    <button
                        onClick={() => flyTo(4200, 1900, 0.35)}
                        className="hud-panel rounded-lg w-8 h-8 flex items-center justify-center text-[#ff006e]/50 hover:text-[#ff006e] transition-colors"
                        title="Reset View"
                    >
                        <Activity size={12} />
                    </button>
                    {user && (
                        <button
                            onClick={() => {
                                const me = artists.find(a => a.userId === user.id || a.userId === user.Id);
                                if (me) flyTo(me.x, me.y, 1.2);
                            }}
                            className="hud-panel rounded-lg w-8 h-8 flex items-center justify-center text-[#ff006e]/50 hover:text-[#ff006e] transition-colors"
                            title="Find Me"
                        >
                            <MapPin size={12} />
                        </button>
                    )}
                </div>

                <div className="hud-panel rounded-lg px-4 py-2 flex gap-8 border-[#ff006e]/20">
                    <div className="flex flex-col items-end">
                        <div className="mono text-[8px] tracking-[0.2em] text-[#ff006e]/40 uppercase mb-0.5 font-bold italic">NODES_SCANNED</div>
                        <div className="mono text-[14px] font-bold text-[#ff006e] tracking-widest leading-none" style={{ textShadow: '0 0 10px rgba(255,0,110,0.3)' }}>
                            {stats.tracks.toLocaleString()}
                        </div>
                    </div>
                    <div className="flex flex-col items-end border-l border-white/5 pl-8">
                        <div className="mono text-[8px] tracking-[0.2em] text-[#00ffff]/40 uppercase mb-0.5 font-bold italic">USERS_SYNCED</div>
                        <div className="mono text-[14px] font-bold text-[#00ffff] tracking-widest leading-none" style={{ textShadow: '0 0 10px rgba(0,255,255,0.3)' }}>
                            {stats.online.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* TOP-LEFT: Search + title */}
            <div data-hud className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                {/* Title bar */}
                <div className="hud-panel border-l-4 border-[#ff0000] bg-black/80 rounded-lg px-[18px] py-[10px] flex items-center gap-3 shadow-[0_0_20px_rgba(255,0,0,0.15)]">
                    <div className="w-1.5 h-1.5 rounded-sm bg-[#ff0000] animate-pulse shadow-[0_0_10px_#ff0000]" />
                    <span className="mono text-[10px] tracking-[0.4em] text-[#ff0000] uppercase font-black italic">fatale // Discovery_05</span>
                    <MapClock />
                </div>

                {/* Search */}
                <div className="flex flex-col gap-1">
                    <div
                        className="hud-panel rounded-lg flex items-center gap-2 px-3 overflow-hidden transition-all duration-300 relative z-[60] border-[#ff0000]/20"
                        style={{ width: searchOpen ? 320 : 38, height: 36 }}
                    >
                        <button
                            onClick={() => {
                                setSearchOpen(s => !s);
                                if (searchOpen) {
                                    setSearchQuery('');
                                }
                            }}
                            className="flex-shrink-0 text-[#ff0000]/60 hover:text-[#ff0000] transition-colors"
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
                        {searchingYoutube && <div className="w-3 h-3 border-2 border-[#ff0000] border-t-transparent rounded-full animate-spin mr-1" />}
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
                                {/* Local Tracks */}
                                {localTracks.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <div className="mono text-[8px] text-white/30 px-2 py-1 tracking-widest uppercase">Fatale Songs</div>
                                        {localTracks.map(t => (
                                            <button
                                                key={`local-trk-${t.id}`}
                                                onClick={() => {
                                                    onPlayPlaylist?.([t], 0);
                                                    setSearchQuery('');
                                                    setSearchOpen(false);
                                                }}
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

                                {/* Local Artists */}
                                {localArtists.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-2 border-t border-white/5 pt-2">
                                        <div className="mono text-[8px] text-white/30 px-2 py-1 tracking-widest uppercase">Fatale Profiles</div>
                                        {localArtists.slice(0, 5).map(a => (
                                            <button
                                                key={`local-art-${a.id}`}
                                                onClick={() => {
                                                    flyTo(a.x, a.y, 0.8);
                                                    setSearchQuery('');
                                                    setSearchOpen(false);
                                                }}
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

                                {/* YouTube Results */}
                                {youtubeResults.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-2 border-t border-white/5 pt-2">
                                        <div className="mono text-[8px] text-[#fbbf24]/60 px-2 py-1 tracking-widest uppercase font-black italic">GLOBAL_STREAM_CARRIER</div>
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
                                                            isYT: true,
                                                            isOwned: true,
                                                            isLocked: false
                                                        };
                                                        onPlayPlaylist?.([track], 0);
                                                        setSearchQuery('');
                                                        setSearchOpen(false);
                                                    }}
                                                    className="w-full text-left p-2 border-b border-[#fbbf24]/5 hover:bg-[#fbbf24]/5 flex items-center gap-3 group transition-colors"
                                                >
                                                    <div className="w-10 h-6 bg-black/40 overflow-hidden relative flex-shrink-0 border border-[#fbbf24]/20 group-hover:border-[#fbbf24]/60">
                                                        <img src={thumb} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute inset-0 bg-[#fbbf24]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[9px] text-white/90 font-bold truncate leading-tight group-hover:text-[#fbbf24]" dangerouslySetInnerHTML={{ __html: title }} />
                                                        <div className="text-[7px] text-[#fbbf24]/50 mono uppercase truncate">AUTH // {author}</div>
                                                    </div>
                                                    <Play size={10} className="text-[#fbbf24]/30 group-hover:text-[#fbbf24] flex-shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {searchingYoutube && youtubeResults.length === 0 && (
                                    <div className="p-6 flex flex-col items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-[#fbbf24] border-t-transparent rounded-full animate-spin" />
                                        <div className="mono text-[8px] text-[#fbbf24]/40 tracking-[0.2em]">CONNECTING_TO_GLOBAL_GRID...</div>
                                    </div>
                                )}

                                {localArtists.length === 0 && localTracks.length === 0 && youtubeResults.length === 0 && !searchingYoutube && (
                                    <div className="p-8 text-center flex flex-col items-center gap-2">
                                        <Search size={20} className="text-[#fbbf24]/10 mb-2" />
                                        <div className="mono text-[9px] text-[#fbbf24]/20 tracking-widest italic font-bold">SIGNAL LOST: ZERO_MATCHES_DETECTED</div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Favorite Frequencies Panel */}
                <AnimatePresence>
                    {favoriteStations && favoriteStations.filter(s => (s.isLive || s.IsLive)).length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="mt-4 flex flex-col gap-2"
                        >
                            <div className="hud-panel border-l-2 border-[#fbbf24] bg-black/80 rounded-lg p-4 w-64 shadow-[0_0_30px_rgba(251,191,36,0.1)] relative z-50">
                                <div className="absolute top-0 right-0 p-1 px-2 text-[6px] text-[#fbbf24]/50 font-black tracking-widest bg-[#fbbf24]/5 uppercase italic">FREQUENCY_SCANNER</div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-1.5 rounded-sm bg-[#fbbf24] animate-pulse shadow-[0_0_8px_#fbbf24]" />
                                    <span className="mono text-[9px] tracking-[0.3em] text-[#fbbf24] uppercase font-black italic">Live_Favorites</span>
                                </div>
                                <div className="space-y-3">
                                    {favoriteStations.filter(s => (s.isLive || s.IsLive)).slice(0, 3).map(station => (
                                        <button
                                            key={`hud-fav-${station.id || station.Id}`}
                                            onClick={(e) => { e.stopPropagation(); navigateToProfile?.(station.artistUserId || station.ArtistUserId); }}
                                            className="w-full text-left group transition-all"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="text-[10px] font-black text-[#fbbf24]/90 uppercase truncate group-hover:text-[#fbbf24]">{station.name || station.Name}</div>
                                                <div className="text-[7px] text-[#fbbf24] mono animate-pulse">LIVE</div>
                                            </div>
                                            <div className="text-[8px] text-[#fbbf24]/30 italic truncate uppercase tracking-tighter">
                                                {station.currentSessionTitle || station.CurrentSessionTitle || 'Broadcasting'}
                                            </div>
                                            <div className="w-full h-[1px] bg-[#fbbf24]/10 mt-2 group-hover:bg-[#fbbf24]/30 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                        onClick={() => { flyTo(s.x + 800, s.y + 600); setActiveSector(s.name); }}
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

            {/* Community Modals */}
            <AnimatePresence>
                {selectedCommunity && (
                    <CommunityDetailsModal
                        community={selectedCommunity}
                        user={user}
                        onClose={() => setSelectedCommunity(null)}
                        onJoin={handleJoinCommunity}
                        onLeave={handleLeaveCommunity}
                        loading={communityActionLoading}
                    />
                )}
                {isCreatingCommunity && (
                    <CreateCommunityModal
                        onClose={() => setIsCreatingCommunity(false)}
                        onSubmit={handleFoundCommunity}
                        loading={communityActionLoading}
                        user_credits={user?.credits}
                        sectors={SECTORS}
                    />
                )}
            </AnimatePresence>
        </div >
    );
};

// ─── COMMUNITY NODE ──────────────────────────────────────────────────────
const CommunityNode = React.memo(({ community, onClick }) => {
    return (
        <div
            className="node absolute flex justify-center items-center cursor-pointer group"
            style={{
                left: community.x - 100,
                top: community.y - 100,
                width: 200,
                height: 200,
                zIndex: 2,
            }}
            onClick={onClick}
        >
            {/* Glowing Base */}
            <div className="absolute w-[300px] h-[300px] pointer-events-none" style={{
                background: `radial-gradient(circle, ${community.color}25 0%, transparent 60%)`,
                animation: 'pulse-ring 8s ease-in-out infinite'
            }} />

            {/* Core */}
            <div className="absolute w-[80px] h-[80px] rounded-full flex items-center justify-center border-4" style={{
                borderColor: community.color,
                boxShadow: `0 0 30px ${community.color}, inset 0 0 20px ${community.color}`,
                background: 'rgba(0,0,0,0.8)'
            }}>
                <div className="text-center">
                    <div className="mono text-[8px] text-white/80 font-bold tracking-widest leading-none mt-1">{community.name}</div>
                    <div className="text-[6px] text-white/40 tracking-[0.2em] uppercase mt-1">Founding Node</div>
                </div>
            </div>

            {/* Orbiting Ring */}
            <div className="absolute w-[160px] h-[160px] rounded-full pointer-events-none border border-dashed" style={{
                borderColor: `${community.color}55`,
                animation: 'spin 30s linear infinite'
            }} />
        </div>
    );
});

// ─── YOUTUBE SIGNAL NODE ─────────────────────────────────────────────────
const YoutubeSignalNode = React.memo(({ node, onPlay }) => (
    <motion.div
        className="node absolute cursor-pointer group"
        style={{ left: node.x, top: node.y, width: 64, height: 64, zIndex: 8 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onPlay}
    >
        {/* Pulse ring */}
        <div className="ring-pulse absolute rounded-sm pointer-events-none" style={{
            inset: -10, border: '1px solid #a855f7', opacity: 0.45, borderRadius: 6
        }} />
        {/* Glow halo */}
        <div className="absolute pointer-events-none" style={{
            inset: -6,
            background: 'radial-gradient(circle, #a855f740 0%, transparent 70%)',
            opacity: 0.7,
            transition: 'opacity 0.25s'
        }} />
        {/* Card */}
        <motion.div
            className="relative w-full h-full overflow-hidden"
            style={{ borderRadius: 6, border: '1px solid #a855f755', boxShadow: '0 0 12px #a855f730' }}
            whileHover={{ scale: 1.15, boxShadow: '0 0 28px #a855f760' }}
        >
            {node.thumb
                ? <img src={node.thumb} alt="" className="w-full h-full object-cover opacity-55 group-hover:opacity-100 transition-opacity" />
                : <div className="w-full h-full bg-[#a855f7]/10 flex items-center justify-center"><Music size={20} className="text-[#a855f7]/40" /></div>
            }
            {/* YT Badge */}
            <div className="absolute top-1 right-1 text-[6px] font-black bg-[#a855f7] text-white px-1 rounded-sm mono leading-tight">YT</div>
        </motion.div>
    </motion.div>
));

// ─── VITALITY COMPONENTS ──────────────────────────────────────────────────
const TopTrackSignal = React.memo(({ signal, onClick }) => {
    return (
        <motion.div
            className="node absolute z-30 cursor-pointer group flex items-center justify-center translate-x-[-20px] translate-y-[-20px]"
            style={{
                left: signal.x,
                top: signal.y,
                width: 40,
                height: 40,
                pointerEvents: 'auto'
            }}
            onClick={(e) => {
                e.stopPropagation();
                console.log("[FATALE_MAP] Signal Intercepted:", signal.title);
                onClick();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Pulsing Dot */}
            <div className="relative w-4 h-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: signal.color }} />
                <div className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ background: signal.color, color: signal.color }} />
            </div>

            {/* Cyberpunk HUD Metadata - Amber Style */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 whitespace-nowrap z-50">
                <div className="h-4 w-[1px] opacity-50" style={{ background: signal.color }} />
                <div className="relative bg-[#0a0a0c]/95 border-l-2 p-2 pr-6 shadow-[0_0_30px_rgba(255,0,0,0.15)] min-w-[140px]" style={{ borderColor: signal.color }}>
                    {/* Corner Brackets */}
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r opacity-60" style={{ borderColor: signal.color }} />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r opacity-60" style={{ borderColor: signal.color }} />

                    {/* Scanline Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[repeating-linear-gradient(transparent_0px,transparent_1px,rgba(255,0,0,0.5)_2px)] bg-[length:100%_3px]" />

                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1 h-3 animate-pulse" style={{ background: signal.color }} />
                        <span className="text-[7px] font-black tracking-[0.2em] uppercase mono italic" style={{ color: signal.color }}>
                            {signal.isYoutube ? 'CONNECTED_STREAM' : 'FATALE_CARRIER'}
                        </span>
                    </div>

                    <div className="text-[10px] font-black mono uppercase tracking-tight truncate max-w-[180px]" style={{ color: signal.color }}>
                        {signal.title}
                    </div>
                    <div className="text-[7px] mono uppercase tracking-widest mt-0.5" style={{ color: `${signal.color}99` }}>
                        SRC // {signal.artist}
                    </div>

                    {/* Bitrate/Signal Bar */}
                    <div className="flex gap-0.5 mt-2 opacity-60">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-1 w-2" style={{ background: i < 5 ? signal.color : `${signal.color}33` }} />
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

const ResonanceLine = React.memo(({ line, onResonanceClick }) => {
    const dx = line.to.x - line.from.x;
    const dy = line.to.y - line.from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return (
        <g
            className="cursor-pointer pointer-events-auto group/line"
            onClick={(e) => { e.stopPropagation(); onResonanceClick(); }}
        >
            {/* Transparent Hit Area - Much larger for easier interaction */}
            <line
                x1={line.from.x + 8} y1={line.from.y + 8}
                x2={line.to.x + 8} y2={line.to.y + 8}
                stroke="transparent" strokeWidth="24"
            />

            {/* The Actual Visible Line */}
            <line
                x1={line.from.x + 6} y1={line.from.y + 6}
                x2={line.to.x + 6} y2={line.to.y + 6}
                stroke={line.from.color} strokeWidth="0.5"
                strokeDasharray="4 8"
                opacity="0.15"
                className="group-hover/line:opacity-60 transition-opacity"
            />

            {/* Moving Data Packet */}
            <circle r="1" fill={line.to.color} className="group-hover/line:opacity-100 opacity-0 transition-opacity">
                <animateMotion
                    dur="3s"
                    repeatCount="indefinite"
                    path={`M ${line.from.x + 6} ${line.from.y + 6} L ${line.to.x + 6} ${line.to.y + 6}`}
                />
            </circle>

            {/* Hover Tooltip Label */}
            <foreignObject
                x={(line.from.x + line.to.x) / 2}
                y={(line.from.y + line.to.y) / 2 - 10}
                width="80" height="20"
                className="opacity-0 group-hover/line:opacity-100 transition-opacity pointer-events-none"
            >
                <div className="text-[6px] font-black text-white/40 mono bg-black/60 px-1 py-0.5 rounded border border-white/5 inline-block">
                    RESONANCE_BRIDGE
                </div>
            </foreignObject>
        </g>
    );
});

// ─── CLUSTER NODE ────────────────────────────────────────────────────────
const ClusterNode = React.memo(({ cluster, onClick, dimmed, isSearchResult }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: dimmed ? 0.3 : 1, scale: 1, filter: dimmed ? 'grayscale(0.8)' : 'none' }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
            className="node absolute flex justify-center items-center cursor-pointer group"
            style={{
                left: cluster.x,
                top: cluster.y,
                width: 70,
                height: 70,
                zIndex: isSearchResult ? 10 : 5
            }}
            onClick={onClick}
        >
            {/* Outline */}
            <div className="absolute w-full h-full rounded-full border border-white/20 group-hover:border-white/60 transition-colors" style={{
                background: 'rgba(4,4,10,0.8)',
                backdropFilter: 'blur(8px)',
                boxShadow: isSearchResult ? `0 0 20px ${cluster.color}` : 'none'
            }} />

            {/* Pulse */}
            <div className="absolute w-full h-full rounded-full pointer-events-none" style={{
                border: `2px solid ${cluster.color}`,
                opacity: 0.5,
                animation: 'pulse-ring 3s infinite'
            }} />

            <div className="relative text-white font-bold text-[14px] mono">
                +{cluster.count}
            </div>
        </motion.div>
    );
});

// ─── ARTIST NODE ─────────────────────────────────────────────────────────
const ArtistNode = React.memo(({ artist, hovered, isSearchResult, dimmed, onHover, onClick }) => {
    const Icon = artist.icon || Music;
    const sz = artist.nodeSize || 76; // dynamic size based on plays
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{
                opacity: dimmed ? 0.2 : 1,
                scale: 1,
                filter: dimmed ? 'grayscale(0.5) blur(1px)' : 'none'
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "linear" }}
            className="node absolute"
            style={{
                left: artist.x,
                top: artist.y,
                width: sz,
                height: sz,
                zIndex: isSearchResult || hovered ? 10 : 1,
                cursor: 'pointer'
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

            {/* Resident Ring (Double) */}
            {artist.isResident && (
                <div className="absolute rounded-sm pointer-events-none" style={{
                    inset: -16,
                    border: `1px solid ${artist.color}30`,
                    borderRadius: 8,
                    animation: 'pulse-ring 6s ease-in-out infinite'
                }} />
            )}

            {/* Pulse ring */}
            <div className={`ring-pulse absolute rounded-sm pointer-events-none ${artist.isResident ? 'border-2' : 'border'}`} style={{
                inset: -10,
                border: `${artist.isResident ? '2px' : '1px'} solid ${artist.color}`,
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
            <motion.div
                className="node-card relative w-full h-full overflow-hidden"
                animate={{
                    scale: hovered ? 1.18 : 1,
                    boxShadow: hovered
                        ? `0 0 24px ${artist.color}55, 0 0 60px ${artist.color}18, inset 0 0 12px ${artist.color}10`
                        : `0 0 10px ${artist.color}25`,
                    borderColor: hovered ? artist.color : artist.color + '55'
                }}
                style={{
                    borderRadius: 6,
                    border: '1px solid',
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

                {/* Resident Badge */}
                {artist.isResident && (
                    <div className="absolute top-1 right-1 bg-[#ff006e] text-black font-black text-[6px] px-1 rounded-sm tracking-tighter">
                        RESIDENT
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
            </motion.div>

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
                        <div className="px-3 py-2 rounded-sm mono text-[10px] tracking-widest relative overflow-hidden" style={{
                            background: 'rgba(4,4,10,0.98)',
                            border: `1px solid #fbbf24`,
                            color: '#fbbf24',
                            boxShadow: `0 8px 32px rgba(0,0,0,0.9), 0 0 16px rgba(251,191,36,0.15)`,
                        }}>
                            {/* Brackets */}
                            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#fbbf24]/60" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#fbbf24]/60" />

                            <div className="text-black bg-[#fbbf24] text-[8px] mb-1 px-1 font-black uppercase inline-block">{artist.sector}</div>
                            <div className="font-bold">{artist.name.toUpperCase()}</div>
                            <div className="flex items-center gap-2 mt-1 opacity-60 text-[7px]">
                                <Activity size={8} /> {artist.plays} SCANS_DETECTED
                            </div>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45"
                            style={{ bottom: -4, background: '#fbbf24', border: `1px solid #fbbf24` }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

// ─── RADAR MINIMAP ─────────────────────────────────────────────────────────
const RW = 200, RH = 130;

const RadarMinimap = React.memo(({ artists, pan, zoom, sectors, containerRef, onNavigate, onPan }) => {
    const sx = RW / WORLD_W;
    const sy = RH / WORLD_H;
    const el = containerRef?.current;

    // Viewport box in radar-pixel space
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
        onNavigate(rx / sx, ry / sy);
    };

    // Memoize the background (grid, sectors, dots) since it only changes when 'artists' data changes
    const RadarStaticBackground = React.useMemo(() => (
        <>
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
            {artists.map((a, i) => (
                <div key={a.id || i} className="absolute rounded-full pointer-events-none" style={{
                    left: a.x * sx, top: a.y * sy,
                    width: 2.5, height: 2.5,
                    background: a.color, opacity: 0.85,
                    boxShadow: `0 0 3px ${a.color}`,
                }} />
            ))}
        </>
    ), [artists, sectors, sx, sy]);

    return (
        <div
            data-hud
            className="absolute bottom-8 right-4 z-50 rounded-xl overflow-hidden shadow-2xl group/radar"
            style={{
                width: RW, height: RH,
                background: 'rgba(4,4,10,0.92)',
                border: '1px solid rgba(255,0,110,0.3)',
                backdropFilter: 'blur(16px)',
                cursor: 'crosshair',
            }}
            onClick={handleClick}
        >
            <div className="h-full relative">
                {RadarStaticBackground}

                {/* Viewport rect */}
                <div
                    className="absolute transition-colors duration-200"
                    onPointerDown={handleBoxDown}
                    onPointerMove={handleBoxMove}
                    onPointerUp={handleBoxUp}
                    onPointerCancel={handleBoxUp}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        left: boxX, top: boxY,
                        width: boxW, height: boxH,
                        border: '1px solid rgba(255,0,110,0.8)',
                        background: 'rgba(255,0,110,0.12)',
                        boxShadow: '0 0 12px rgba(255,0,110,0.25)',
                        cursor: 'grab',
                        zIndex: 20
                    }}
                />

                {/* Sweep */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(255,0,110,0.1) 50%, transparent 100%)',
                    animation: 'scanY 4s linear infinite',
                }} />

                {/* Labels */}
                <div className="absolute bottom-1.5 left-2 mono text-[7px] tracking-[0.3em] uppercase opacity-80" style={{ color: '#ff006e' }}>
                    RADAR // SCAN
                </div>
                <div className="absolute bottom-1.5 right-2 mono text-[7px] opacity-60 text-[#ff006e]">
                    {artists.length.toString().padStart(3, '0')} SIGS
                </div>
            </div>
        </div>
    );
});

export default React.memo(DiscoveryMapView);
