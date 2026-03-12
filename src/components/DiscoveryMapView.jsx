import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Minus, Activity, Music, Disc, Mic, Radio, Speaker, Zap, X, ChevronRight, MapPin, Play, Send, Star, MessageSquare, Minimize2 } from 'lucide-react';
import API from '../services/api';
import { CommunityDetailsModal, CreateCommunityModal } from './CommunityModals';
import { useNotification } from '../contexts/NotificationContext';

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
    const { showNotification } = useNotification();
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

    // Floating Chat Widget (persisted via localStorage)
    const [chatOpen, setChatOpen] = useState(() =>
        localStorage.getItem('fatale_chat_open') === 'true'
    );
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const chatLastTickRef = useRef(null);
    const chatPollRef = useRef(null);
    const chatEndRef = useRef(null);

    // Favorite Locations (persisted via localStorage)
    const [savedLocations, setSavedLocations] = useState(() => {
        try { return JSON.parse(localStorage.getItem('fatale_saved_locations') || '[]'); } catch { return []; }
    });
    const [favLocationsOpen, setFavLocationsOpen] = useState(false);
    const [savingLocation, setSavingLocation] = useState(false);

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

            // First pass: group artists by community to prepare for orbital spacing
            const commGroups = {};
            const ungrouped = [];

            raw.forEach(a => {
                const commId = a.communityId || a.CommunityId;
                if (commId) {
                    const cId = String(commId);
                    if (!commGroups[cId]) commGroups[cId] = [];
                    commGroups[cId].push(a);
                } else {
                    ungrouped.push(a);
                }
            });

            // Helper for orbital placement
            const getOrbitalPos = (index, total, centerX, centerY) => {
                const initialRadius = 140; 
                const spacing = 110; 
                const angle = index * (Math.PI * 2 * 0.15); 
                const radius = initialRadius + (Math.floor(index / 6) * spacing) + (index % 6) * 15;
                return {
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                };
            };

            const finalArtists = [];

            // Process grouped artists
            Object.entries(commGroups).forEach(([commId, group]) => {
                const targetComm = processedComms.find(c => String(c.id) === String(commId));
                if (!targetComm) {
                    ungrouped.push(...group);
                    return;
                }

                group.forEach((a, i) => {
                    const id = a.id || a.Id || `art-${a.userId || a.UserId}-${i}`;
                    const hashSource = (a.userId || a.UserId || id).toString();
                    const h = hashStr(hashSource);
                    const sec = SECTORS[targetComm.sectorId] || SECTORS[0];
                    const plays = a.playCount || a.PlayCount || a.plays || ((h % 900) + 10);
                    // nodeSize based on plays (logarithmic scaling)
                    const nodeSize = Math.round(40 + Math.min(120, Math.log10(plays + 1) * 35));
                    
                    const pos = getOrbitalPos(i, group.length, targetComm.x, targetComm.y);

                    finalArtists.push({
                        id,
                        name: a.name || a.Name || `ARTIST_${i}`,
                        userId: a.userId || a.UserId,
                        color: sec.color,
                        icon: ICONS[h % ICONS.length],
                        profileImage: a.imageUrl || a.ImageUrl || a.profileImageUrl || a.ProfileImageUrl || null,
                        sector: sec.name,
                        targetCommId: targetComm.id,
                        x: pos.x,
                        y: pos.y,
                        isMock: !!a.isMock,
                        plays,
                        nodeSize,
                        isResident: plays > 5000
                    });
                });
            });

            // Process ungrouped (traditional grid/jitter)
            ungrouped.forEach((a, i) => {
                const id = a.id || a.Id || `ungrouped-${i}`;
                const hashSource = (a.userId || a.UserId || id).toString();
                const h = hashStr(hashSource);
                const dbSectorId = a.sectorId ?? a.SectorId;
                const sec = (dbSectorId !== null && dbSectorId !== undefined) ? SECTORS[dbSectorId] : SECTORS[h % SECTORS.length];
                const li = Math.floor((h / SECTORS.length) | 0) % 36;
                const plays = a.playCount || a.PlayCount || a.plays || ((h % 900) + 10);
                const nodeSize = Math.round(40 + Math.min(120, Math.log10(plays + 1) * 35));

                finalArtists.push({
                    id,
                    name: a.name || a.Name || `ARTIST_${i}`,
                    userId: a.userId || a.UserId,
                    color: sec.color,
                    icon: ICONS[h % ICONS.length],
                    profileImage: a.imageUrl || a.ImageUrl || a.profileImageUrl || a.ProfileImageUrl || null,
                    sector: sec.name,
                    x: sec.x + (li % 6) * COL_GAP + ((h % 250) - 125),
                    y: sec.y + Math.floor(li / 6) * ROW_GAP + (((h >> 5) % 200) - 100),
                    isMock: !!a.isMock,
                    plays,
                    nodeSize,
                    isResident: plays > 5000
                });
            });

            console.log('[MapData] Processed Artists (sample):', finalArtists.slice(0, 5).map(a => ({ name: a.name, pfp: a.profileImage })));
            setArtists(finalArtists);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMapData();
    }, []);

    // ── Floating Chat Logic ──
    const userCommunityId = user?.communityId ?? user?.CommunityId;
    const userCommunity = userCommunityId ? communities.find(c => String(c.id) === String(userCommunityId)) : null;

    const fetchChatMessages = useCallback(async (afterId = null) => {
        if (!userCommunityId) return;
        try {
            const res = await API.CommunityChat.getMessages(userCommunityId, afterId);
            const msgs = Array.isArray(res.data) ? res.data : [];
            if (msgs.length > 0) {
                // ALWAYS move the cursor forward to the highest ID seen to stop loops
                const maxId = Math.max(...msgs.map(m => m.id));
                if (afterId === null || maxId > chatLastTickRef.current) {
                    chatLastTickRef.current = maxId;
                }

                setChatMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const fresh = msgs.filter(m => !existingIds.has(m.id));
                    if (fresh.length === 0) return prev;
                    return [...prev, ...fresh];
                });
            }
        } catch (e) {
            console.error('[FloatingChat] fetch error', e);
        }
    }, [userCommunityId]);

    useEffect(() => {
        if (!userCommunityId) return;

        // Reset chat state when joining a new community to prevent message bleed
        setChatMessages([]);
        chatLastTickRef.current = 0;

        fetchChatMessages();
        chatPollRef.current = setInterval(() => {
            fetchChatMessages(chatLastTickRef.current);
        }, 3000);
        return () => clearInterval(chatPollRef.current);
    }, [userCommunityId, fetchChatMessages]);

    useEffect(() => {
        if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, chatOpen]);

    useEffect(() => {
        localStorage.setItem('fatale_chat_open', String(chatOpen));
    }, [chatOpen]);

    const handleChatSend = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || chatSending || !userCommunityId) return;
        const text = chatInput.trim();
        setChatInput('');
        setChatSending(true);
        try {
            const res = await API.CommunityChat.sendMessage(userCommunityId, text);
            // Add optimistically; polling will skip it since lastId is updated
            setChatMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                if (existingIds.has(res.data.id)) return prev;
                return [...prev, res.data];
            });
            chatLastTickRef.current = res.data.id;
        } catch (e) {
            console.error('[FloatingChat] send error', e);
            setChatInput(text);
        } finally { setChatSending(false); }
    };

    // Persist favorites to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('fatale_saved_locations', JSON.stringify(savedLocations));
    }, [savedLocations]);

    // ── Favorite Locations Logic ──
    const saveCurrentLocation = () => {
        const container = containerRef.current;
        if (!container) return;
        const vw = container.clientWidth;
        const vh = container.clientHeight;
        const cx = (-viewState.x + vw / 2) / viewState.zoom;
        const cy = (-viewState.y + vh / 2) / viewState.zoom;
        const label = prompt('Name this location:');
        if (!label) return;
        const newLoc = { id: Date.now(), label: label.trim(), x: cx, y: cy, zoom: viewState.zoom };
        const updated = [...savedLocations, newLoc];
        setSavedLocations(updated);
        localStorage.setItem('fatale_saved_locations', JSON.stringify(updated));
    };

    const deleteSavedLocation = (id) => {
        const updated = savedLocations.filter(l => l.id !== id);
        setSavedLocations(updated);
        localStorage.setItem('fatale_saved_locations', JSON.stringify(updated));
    };

    const flyToLocation = (loc) => {
        const container = containerRef.current;
        if (!container) return;
        const vw = container.clientWidth;
        const vh = container.clientHeight;
        setViewState({ zoom: loc.zoom, x: -loc.x * loc.zoom + vw / 2, y: -loc.y * loc.zoom + vh / 2 });
        setFavLocationsOpen(false);
    };

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
            style={{ background: '#000000', cursor: isDragging ? 'grabbing' : 'crosshair', fontFamily: "'Space Grotesk', sans-serif" }}
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
                    background: rgba(0,0,0,0.45);
                    border: 1px solid rgba(255,255,255,0.03);
                    backdrop-filter: blur(40px) saturate(180%);
                    -webkit-backdrop-filter: blur(40px) saturate(180%);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.8);
                    isolation: isolate;
                }
                .hud-panel-accent {
                    background: rgba(255,0,110,0.03);
                    border: 1px solid rgba(255,0,110,0.1);
                    backdrop-filter: blur(40px);
                    -webkit-backdrop-filter: blur(40px);
                    isolation: isolate;
                }
                .hud-bracket-tl { position: absolute; top: 0; left: 0; width: 6px; height: 6px; border-top: 1px solid currentColor; border-left: 1px solid currentColor; opacity: 0.4; }
                .hud-bracket-tr { position: absolute; top: 0; right: 0; width: 6px; height: 6px; border-top: 1px solid currentColor; border-right: 1px solid currentColor; opacity: 0.4; }
                .hud-bracket-bl { position: absolute; bottom: 0; left: 0; width: 6px; height: 6px; border-bottom: 1px solid currentColor; border-left: 1px solid currentColor; opacity: 0.4; }
                .hud-bracket-br { position: absolute; bottom: 0; right: 0; width: 6px; height: 6px; border-bottom: 1px solid currentColor; border-right: 1px solid currentColor; opacity: 0.4; }
                
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


                        {/* Sleeker High-Tech Data Callout */}
                        <div className="flex flex-col items-start origin-top-left">
                            {/* Connector Line */}
                            <div className="w-[1px] h-24 bg-gradient-to-b from-[#fbbf24] to-transparent opacity-30 ml-4" />
                            
                            <div className="flex items-start gap-3 mt-[-4px]">
                                {/* Horizontal Anchor */}
                                <div className="w-6 h-[1px] bg-[#fbbf24] mt-3 opacity-40" />
                                
                                <div className="flex flex-col">
                                    <div className="hud-panel p-4 min-w-[200px] relative overflow-hidden backdrop-blur-2xl bg-black/30 border-l border-[#fbbf24]/20">
                                        <div className="hud-bracket-tr text-[#fbbf24]/30" />
                                        <div className="hud-bracket-br text-[#fbbf24]/30" />
                                        
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="mono text-[8px] text-[#fbbf24] opacity-60 font-black">SEC // 0{SECTORS.indexOf(s) + 1}</div>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-[#fbbf24]/30 to-transparent" />
                                        </div>

                                        <div className="text-[13px] font-black text-[#fbbf24] uppercase tracking-[0.3em] leading-tight mb-2">
                                            {s.name.replace('_', ' ')}
                                        </div>
                                        
                                        <div className="flex flex-col gap-1.5 border-t border-white/5 pt-2">
                                            <div className="flex justify-between items-center text-[7px] mono text-white/40 tracking-widest leading-none">
                                                <span>COORDS_NAV</span>
                                                <span className="text-[#fbbf24]/60">S_{s.x}.{s.y}</span>
                                            </div>
                                            
                                            <div className="text-[6px] mono text-white/20 tracking-[0.4em] font-black uppercase mt-0.5">
                                                &gt; NODE_FREQ_LOCKED
                                            </div>
                                        </div>
                                    </div>
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
                {SECTORS.map(s => {
                    if (!s.subgenres) return null;
                    return s.subgenres.map((sg, i) => {
                        const sx = s.x + 400 + (Math.sin(i * Math.PI / 2) * 500);
                        const sy = s.y + 300 + (Math.cos(i * Math.PI / 2) * 400);
                        return (
                            <motion.div key={`sg-${s.name}-${sg}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.2 + (viewState.zoom - 0.35) * 0.3 }}
                                className="absolute pointer-events-none mono"
                                style={{
                                    left: sx, top: sy,
                                    fontSize: 32, fontWeight: 900, letterSpacing: '0.4em',
                                    color: s.color, whiteSpace: 'nowrap', userSelect: 'none',
                                    transform: 'translate(-50%, -50%)',
                                    opacity: 0.2,
                                    zIndex: 0
                                }}>
                                {sg.toUpperCase()}
                            </motion.div>
                        );
                    });
                })}

                {/* Communities */}
                {communities.map(c => (
                    <CommunityNode
                        key={`comm-${c.id}`}
                        community={c}
                        isFavorite={savedLocations.some(l => l.label === c.name)}
                        onClick={() => setSelectedCommunity(c)}
                        onStar={(comm) => {
                            const exists = savedLocations.find(l => l.label === comm.name);
                            if (exists) {
                                deleteSavedLocation(exists.id);
                            } else {
                                const newLoc = { id: Date.now(), label: comm.name, x: comm.x, y: comm.y, zoom: 0.7 };
                                const updated = [...savedLocations, newLoc];
                                setSavedLocations(updated);
                                localStorage.setItem('fatale_saved_locations', JSON.stringify(updated));
                            }
                        }}
                    />
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
                                zoom={viewState.zoom}
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
                
                {/* Community Connection Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 11 }}>
                    {clusteredNodes.filter(n => n.targetCommId).map(n => {
                        const comm = communities.find(c => c.id === n.targetCommId);
                        if (!comm) return null;
                        return (
                            <motion.line
                                key={`comm-line-${n.id}-${comm.id}`}
                                x1={n.x + (n.nodeSize || 76)/2}
                                y1={n.y + (n.nodeSize || 76)/2}
                                x2={comm.x}
                                y2={comm.y}
                                stroke={comm.color}
                                strokeWidth="1"
                                strokeDasharray="4 4"
                                opacity="0.15"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.15 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        );
                    })}
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
                background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 45%, #000000 100%)',
            }} />

            {/* Atmospheric fog - removed for clean black background */}

            {/* ══════════════════════════════════════════
                HUD ELEMENTS
            ══════════════════════════════════════════ */}

            {/* TOP RIGHT: HUD controls and stats */}
            <div data-hud className="absolute top-4 right-4 z-50 flex flex-col items-end gap-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCreatingCommunity(true)}
                        className="hud-panel rounded-sm px-4 py-2.5 flex items-center gap-2 group relative outline-none transition-colors duration-200"
                    >
                        {/* Active/Hover Background Layer */}
                        <div className="absolute inset-0 bg-[#ff006e]/5 group-hover:bg-[#ff006e]/10 transition-colors" />
                        
                        <div className="hud-bracket-tl text-[#ff006e] opacity-40 group-hover:opacity-100" />
                        <div className="hud-bracket-tr text-[#ff006e] opacity-40 group-hover:opacity-100" />
                        <div className="hud-bracket-bl text-[#ff006e] opacity-40 group-hover:opacity-100" />
                        <div className="hud-bracket-br text-[#ff006e] opacity-40 group-hover:opacity-100" />
                        
                        <Plus size={12} className="relative text-white opacity-70 group-hover:text-[#ff006e] group-hover:opacity-100 transition-all group-hover:scale-110" />
                        <span className="relative mono text-[9px] tracking-[0.3em] text-white font-black group-hover:text-[#ff006e] opacity-60 group-hover:opacity-100 transition-all">
                            found a community....
                        </span>
                    </button>

                    <button
                        onClick={() => flyTo(4200, 1900, 0.35)}
                        className="hud-panel rounded-sm w-10 h-10 flex items-center justify-center text-white/30 hover:text-[#ff006e] relative group outline-none"
                        title="Reset View"
                    >
                        <div className="hud-bracket-tl opacity-10 group-hover:opacity-60" />
                        <div className="hud-bracket-tr opacity-10 group-hover:opacity-60" />
                        <div className="hud-bracket-bl opacity-10 group-hover:opacity-60" />
                        <div className="hud-bracket-br opacity-10 group-hover:opacity-60" />
                        <Activity size={14} className="group-hover:scale-110 transition-transform" />
                    </button>
                    {user && (
                        <button
                            onClick={() => {
                                const me = artists.find(a => a.userId === user.id || a.userId === user.Id);
                                if (me) flyTo(me.x, me.y, 1.2);
                            }}
                            className="hud-panel rounded-sm w-10 h-10 flex items-center justify-center text-white/30 hover:text-[#ff006e] relative group outline-none"
                            title="Find Me"
                        >
                            <div className="hud-bracket-tl opacity-10 group-hover:opacity-60" />
                            <div className="hud-bracket-tr opacity-10 group-hover:opacity-60" />
                            <div className="hud-bracket-bl opacity-10 group-hover:opacity-60" />
                            <div className="hud-bracket-br opacity-10 group-hover:opacity-60" />
                            <MapPin size={14} className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}
                </div>

                <div className="hud-panel rounded-sm px-4 py-2.5 flex gap-10 relative overflow-hidden">
                    <div className="hud-bracket-tl text-[#ff006e]/30" />
                    <div className="hud-bracket-br text-[#ff006e]/30" />
                    
                    <div className="flex flex-col items-end">
                        <div className="mono text-[7px] tracking-[0.3em] text-[#ff0000]/50 uppercase mb-1 font-black">node_results</div>
                        <div className="mono text-[16px] font-black tracking-[0.1em] leading-none" style={{ color: 'rgba(255,0,0,0.7)' }}>
                            {stats.tracks.toLocaleString()}
                        </div>
                    </div>
                    <div className="flex flex-col items-end border-l border-white/5 pl-10">
                        <div className="mono text-[7px] tracking-[0.3em] text-[#ff006e]/50 uppercase mb-1 font-black">users_sync</div>
                        <div className="mono text-[16px] font-black tracking-[0.1em] leading-none" style={{ color: 'rgba(255,0,110,0.7)' }}>
                            {stats.online.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* TOP-LEFT: Search + title */}
            <div data-hud className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                {/* Title bar */}
                <div className="hud-panel bg-black/40 rounded-sm px-5 py-2.5 flex items-center gap-4 relative overflow-hidden">
                    <div className="hud-bracket-tl text-[#ff0000]" />
                    <div className="hud-bracket-br text-[#ff0000]" />
                    
                    <div className="flex flex-col">
                        <span className="mono text-[10px] tracking-[0.4em] text-[#ff0000] uppercase font-black">FATALE_SYSTEM // DISCOVERY_05</span>
                        <div className="flex items-center gap-2 mt-1">
                            <MapClock />
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="flex flex-col gap-1">
                    <div
                        className="hud-panel rounded-sm flex items-center gap-2 px-3 overflow-hidden transition-all duration-300 relative z-[60]"
                        style={{ width: searchOpen ? 320 : 38, height: 36 }}
                    >
                        <div className="hud-bracket-tl text-[#ff0000]/40" />
                        <div className="hud-bracket-br text-[#ff0000]/40" />
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
                                placeholder="SEARCH_NODES_OR_STREAM..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-white/80 text-[10px] outline-none placeholder:text-white/20 mono tracking-widest"
                            />
                        )}
                        {searchingYoutube && <div className="w-3 h-3 border border-[#ff0000] border-t-transparent rounded-full animate-spin mr-1" />}
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
                            <div className="hud-panel rounded-sm p-4 w-64 relative overflow-hidden">
                                <div className="hud-bracket-tl text-[#fbbf24]/40" />
                                <div className="hud-bracket-br text-[#fbbf24]/40" />
                                <div className="absolute top-0 right-0 p-1 px-2 text-[6px] text-[#fbbf24]/30 font-black tracking-widest bg-[#fbbf24]/5 uppercase">FREQUENCY_LINK_SCAN</div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1.5 h-1.5 rounded-sm bg-[#fbbf24] animate-pulse shadow-[0_0_8px_#fbbf24]" />
                                    <span className="mono text-[9px] tracking-[0.3em] text-[#fbbf24] uppercase font-black">ACTIVE_FREQUENCIES</span>
                                </div>
                                <div className="space-y-3">
                                    {favoriteStations.filter(s => (s.isLive || s.IsLive)).slice(0, 3).map(station => (
                                        <button
                                            key={`hud-fav-${station.id || station.Id}`}
                                            onClick={(e) => { e.stopPropagation(); navigateToProfile?.(station.artistUserId || station.ArtistUserId); }}
                                            className="w-full text-left group transition-all"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="text-[10px] font-black text-white/80 uppercase truncate group-hover:text-[#fbbf24] transition-colors">{station.name || station.Name}</div>
                                                <div className="text-[7px] text-[#fbbf24] mono animate-pulse">LIVE</div>
                                            </div>
                                            <div className="text-[8px] text-white/30 truncate uppercase tracking-widest mono">
                                                {station.currentSessionTitle || station.CurrentSessionTitle || 'STREAMING_DATA'}
                                            </div>
                                            <div className="w-full h-[1px] bg-white/5 mt-2 group-hover:bg-[#fbbf24]/20 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* BOTTOM-LEFT: Zoom + Favorites */}
            <div data-hud className="absolute bottom-8 left-4 z-50 flex flex-col gap-1">
                <button
                    onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(Math.max(prev.zoom + 0.1, 0.07), 2) }))}
                    className="hud-panel w-8 h-8 rounded-md flex items-center justify-center text-white/50 hover:text-[#ff006e] transition-all"
                >
                    <Plus size={12} />
                </button>
                <div className="hud-panel w-8 h-8 rounded-md flex flex-col items-center justify-center gap-0.5 bg-black/60 border border-white/5">
                    <div className="text-[6px] mono text-white/30 uppercase leading-none font-bold">Zoom</div>
                    <div className="text-[9px] mono text-[#ff006e] font-black leading-none">{viewState.zoom.toFixed(2)}</div>
                </div>
                <button
                    onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(Math.max(prev.zoom - 0.1, 0.07), 2) }))}
                    className="hud-panel w-8 h-8 rounded-md flex items-center justify-center text-white/50 hover:text-[#ff006e] transition-all"
                >
                    <Minus size={12} />
                </button>
                <div className="w-full h-[1px] bg-white/5 my-0.5" />
                <button
                    onClick={() => setFavLocationsOpen(o => !o)}
                    title={favLocationsOpen ? 'Close locations' : 'Saved locations'}
                    className="hud-panel w-8 h-8 rounded-md flex items-center justify-center transition-all"
                    style={{ color: favLocationsOpen ? '#ff006e' : 'rgba(255,255,255,0.4)' }}
                >
                    <Star size={12} fill={favLocationsOpen ? '#ff006e' : 'none'} />
                </button>

                {/* Favorite Locations Dropdown */}
                <AnimatePresence>
                    {favLocationsOpen && (
                        <motion.div
                            key="fav-panel"
                            initial={{ opacity: 0, x: -8, scaleX: 0, originX: 0 }}
                            animate={{ opacity: 1, x: 0, scaleX: 1 }}
                            exit={{ opacity: 0, x: -8, scaleX: 0 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-10 bottom-0 hud-panel rounded-sm w-52 overflow-hidden z-10"
                            style={{ background: 'rgba(4,4,4,0.97)', border: '1px solid rgba(255,0,110,0.25)' }}
                        >
                            <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                                <span className="text-[8px] font-black mono text-[#ff006e] uppercase tracking-widest">Saved Locations</span>
                                <button onClick={saveCurrentLocation} className="text-[7px] mono text-white/30 hover:text-[#ff006e] transition-colors uppercase tracking-widest">+ save here</button>
                            </div>
                            <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#ff006e40 transparent' }}>
                                {savedLocations.length === 0 ? (
                                    <div className="px-3 py-4 text-[8px] mono text-white/20 uppercase tracking-widest text-center">No saved locations</div>
                                ) : savedLocations.map(loc => (
                                    <div key={loc.id} className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-all group">
                                        <button onClick={() => flyToLocation(loc)} className="flex-1 flex items-center gap-2 text-left">
                                            <MapPin size={10} className="text-[#ff006e]/50 shrink-0" />
                                            <span className="text-[10px] text-white/70 truncate group-hover:text-white transition-colors">{loc.label}</span>
                                        </button>
                                        <button onClick={() => deleteSavedLocation(loc.id)} className="text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* BOTTOM-CENTER: Sector nav */}
            <div data-hud className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1">
                {SECTORS.map(s => (
                    <button
                        key={s.name}
                        onClick={() => { flyTo(s.x + 800, s.y + 600); setActiveSector(s.name); }}
                        className="rounded-sm px-4 py-2.5 flex items-center gap-3 transition-all duration-300 relative overflow-hidden group outline-none"
                        style={{
                            background: activeSector === s.name ? `${s.color}20` : 'rgba(0,0,0,0.6)',
                            border: `1px solid ${activeSector === s.name ? `${s.color}60` : 'rgba(255,255,255,0.05)'}`,
                            backdropFilter: 'blur(30px)',
                            boxShadow: activeSector === s.name ? `0 0 20px ${s.color}20` : 'none'
                        }}
                    >
                        {activeSector === s.name && (
                            <>
                                <div className="hud-bracket-tl" style={{ color: s.color }} />
                                <div className="hud-bracket-tr" style={{ color: s.color }} />
                                <div className="hud-bracket-bl" style={{ color: s.color }} />
                                <div className="hud-bracket-br" style={{ color: s.color }} />
                            </>
                        )}
                        
                        <div className="w-1.5 h-3 rounded-full" style={{ background: activeSector === s.name ? s.color : `${s.color}30`, boxShadow: activeSector === s.name ? `0 0 10px ${s.color}` : 'none' }} />
                        <span className="mono text-[10px] tracking-[0.3em] uppercase font-black transition-colors"
                            style={{ color: activeSector === s.name ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>
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
                        style={{ background: '#000000' }}
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
                        currentUser={user}
                        onClose={() => setSelectedCommunity(null)}
                        onMinimize={userCommunity ? () => { setSelectedCommunity(null); setChatOpen(true); } : undefined}
                        onJoin={handleJoinCommunity}
                        onLeave={handleLeaveCommunity}
                        loadingAction={communityActionLoading}
                        navigateToProfile={navigateToProfile}
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

            {/* ── SIDEBAR SLIDING COMMUNITY CHAT ── */}
            <div data-hud className="fixed top-0 right-0 h-full z-[60] flex items-center" 
                style={{ 
                    pointerEvents: userCommunity ? 'auto' : 'none',
                    transform: `translateX(${chatOpen && userCommunity ? '0' : '320px'})`,
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                {userCommunity && (
                    <>
                        {/* Vertical Minimizer Tab / Toggle (stays on screen edge when closed) */}
                        <div className="h-full flex items-center pr-[1px]">
                            <button
                                onClick={() => setChatOpen(o => !o)}
                                className="flex flex-col items-center justify-center gap-4 py-6 w-9 text-[10px] font-black mono uppercase tracking-[0.2em] transition-all rounded-l-md shadow-2xl group border-t border-l border-b relative z-10"
                                style={{
                                    minHeight: '140px',
                                    background: chatOpen ? `${userCommunity.color || '#00ffff'}10` : 'rgba(5,5,5,0.98)',
                                    borderColor: `${userCommunity.color || '#00ffff'}40`,
                                    color: chatOpen ? userCommunity.color : 'rgba(255,255,255,0.7)',
                                    backdropFilter: 'blur(20px)',
                                }}
                            >
                                <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: userCommunity.color, boxShadow: `0 0 10px ${userCommunity.color}80` }} />
                                <div className="flex items-center gap-3 my-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                    <span className="truncate max-w-[140px] font-black leading-none">{userCommunity.name}</span>
                                    <div className="flex-shrink-0 text-white/50 group-hover:text-white transition-all duration-300" style={{ transform: chatOpen ? 'rotate(-90deg)' : 'rotate(90deg)' }}>
                                        <Minimize2 size={12} />
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Main Drawer Panel */}
                        <div
                            className="w-[320px] h-full flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)] border-l pb-24"
                            style={{
                                background: 'rgba(5,5,5,0.95)',
                                borderColor: `${userCommunity.color || '#00ffff'}40`,
                                backdropFilter: 'blur(30px)',
                            }}
                        >
                            {/* Drawer Header (Optional aesthetic top bar) */}
                            <div className="h-14 border-b flex items-center px-5 shrink-0" style={{ borderColor: `${userCommunity.color || '#00ffff'}20`, background: `${userCommunity.color || '#00ffff'}05` }}>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black mono text-white tracking-[0.2em] uppercase">
                                        SEC::{userCommunity.sectorId} // NODE
                                    </span>
                                    <span className="text-[9px] mono opacity-50" style={{ color: userCommunity.color }}>
                                        {userCommunity.name}
                                    </span>
                                </div>
                            </div>

                            {/* Scrollable messages area */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: `${userCommunity.color || '#00ffff'}50 transparent` }}>
                                {chatMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full gap-2 text-[9px] mono text-white/20 uppercase tracking-[0.2em] text-center">
                                        <Zap size={14} className="opacity-10 mb-1" />
                                        TRANSMISSION_IDLE...<br/>WAITING_FOR_SIGNAL
                                    </div>
                                )}
                                {chatMessages.map((msg, i) => {
                                    const isMe = String(msg.userId) === String(user?.id ?? user?.Id);
                                    return (
                                        <div key={msg.id || i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <div className="w-6 h-6 rounded-sm shrink-0 flex items-center justify-center text-[8px] font-black border overflow-hidden"
                                                style={{ 
                                                    borderColor: `${msg.themeColor || '#ff006e'}40`, 
                                                    color: msg.themeColor || '#ff006e', 
                                                    background: `${msg.themeColor || '#ff006e'}10` 
                                                }}>
                                                {msg.profilePictureUrl
                                                    ? <img src={msg.profilePictureUrl.startsWith('http') ? msg.profilePictureUrl : `http://localhost:5264${msg.profilePictureUrl}`} className="w-full h-full object-cover" alt="" />
                                                    : msg.username?.substring(0,2).toUpperCase()}
                                            </div>
                                            <div className={`max-w-[85%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-[9px] font-black mono" style={{ color: msg.themeColor || '#00ffff' }}>{msg.username}</span>
                                                </div>
                                                <div className="px-3 py-2 rounded-sm text-[11px] text-white/90 leading-relaxed shadow-sm"
                                                    style={{
                                                        background: isMe ? `${msg.themeColor || userCommunity.color}15` : 'rgba(255,255,255,0.05)',
                                                        border: `1px solid ${isMe ? `${msg.themeColor || userCommunity.color}25` : 'rgba(255,255,255,0.08)'}`,
                                                    }}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input form */}
                            <form onSubmit={handleChatSend} className="flex gap-2 px-4 py-4 border-t bg-black/50 shrink-0"
                                style={{ borderColor: `${userCommunity.color || '#00ffff'}20` }}>
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value.slice(0, 280))}
                                    placeholder="Transmit signal..."
                                    className="flex-1 bg-white/[0.03] border px-4 py-3 text-[11px] text-white placeholder-white/20 outline-none mono rounded-sm transition-all focus:bg-white/[0.05]"
                                    style={{ borderColor: `${userCommunity.color || '#00ffff'}30` }}
                                />
                                <button type="submit" disabled={!chatInput.trim() || chatSending}
                                    className="w-11 h-11 flex items-center justify-center rounded-sm border transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
                                    style={{ 
                                        borderColor: `${userCommunity.color}50`, 
                                        background: `${userCommunity.color}20`, 
                                        color: userCommunity.color 
                                    }}>
                                    <Send size={15} />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>

        </div >
    );
};

// ─── COMMUNITY NODE ──────────────────────────────────────────────────────
const CommunityNode = React.memo(({ community, isFavorite, onClick, onStar }) => {
    return (
        <div
            className="node absolute flex justify-center items-center pointer-events-none group"
            style={{
                left: community.x - 100,
                top: community.y - 100,
                width: 200,
                height: 200,
                zIndex: 5, // Lowered so artists (z-index 10+) sit on top
            }}
        >
            {/* Star / Favorite button — visible on hover */}
            <button
                onClick={(e) => { e.stopPropagation(); onStar?.(community); }}
                className="absolute top-2 right-2 z-30 w-5 h-5 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110 pointer-events-auto"
                style={{ color: community.color, background: `${community.color}20`, border: `1px solid ${community.color}40` }}
                title={isFavorite ? 'Remove from favorites' : 'Save location'}
            >
                <Star size={9} fill={isFavorite ? community.color : 'none'} />
            </button>

            <div className="absolute w-24 h-24 pointer-events-none transition-all duration-500 group-hover:scale-110">
                <div className="hud-bracket-tl text-[#ff006e] opacity-40 group-hover:opacity-100" style={{ color: community.color }} />
                <div className="hud-bracket-tr text-[#ff006e] opacity-40 group-hover:opacity-100" style={{ color: community.color }} />
                <div className="hud-bracket-br text-[#ff006e] opacity-40 group-hover:opacity-100" style={{ color: community.color }} />
                <div className="hud-bracket-bl text-[#ff006e] opacity-40 group-hover:opacity-100" style={{ color: community.color }} />
            </div>

            {/* Glowing Base Radial */}
            <div className="absolute w-[180px] h-[180px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{
                background: `radial-gradient(circle, ${community.color}15 0%, transparent 70%)`,
            }} />

            {/* Core Box - CLICKABLE AREA */}
            <div 
                className="absolute w-[76px] h-[76px] rounded-sm flex items-center justify-center border hud-panel shadow-2xl transition-all duration-500 group-hover:border-white/40 cursor-pointer pointer-events-auto" 
                style={{
                    borderColor: `${community.color}60`,
                    background: 'rgba(0,0,0,0.92)'
                }}
                onClick={onClick}
            >
                {/* Sector Scan Light */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#ffffff05] to-transparent animate-scanlines opacity-20" />

                <div className="text-center px-1 z-10">
                    <div className="mono text-[7px] text-white/90 font-black tracking-[0.2em] leading-tight uppercase line-clamp-2 mb-1 px-1">
                        {community.name}
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-[1px] bg-white/10 mb-1" />
                        <div className="text-[5px] text-white/30 tracking-[0.4em] uppercase font-black">
                            NODE_ACTV
                        </div>
                        <div className="mt-1 text-[4px] mono text-[#ff006e] opacity-40 animate-pulse" style={{ color: community.color }}>
                            // CORE_SYNC_OK
                        </div>
                    </div>
                </div>
            </div>

            {/* Orbiting HUD Deco */}
            <div className="absolute w-[140px] h-[140px] pointer-events-none border border-white/5 rounded-sm opacity-20 rotate-45 group-hover:rotate-90 transition-transform duration-1000" />
            <div className="absolute w-[110px] h-[110px] pointer-events-none border border-white/5 rounded-sm opacity-10 group-hover:-rotate-45 transition-transform duration-1000" />
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

            {/* Moving Data Packet - Byte Block */}
            <rect width="2" height="2" fill={line.to.color} className="group-hover/line:opacity-100 opacity-0 transition-opacity">
                <animateMotion
                    dur="2.5s"
                    repeatCount="indefinite"
                    path={`M ${line.from.x + 6} ${line.from.y + 6} L ${line.to.x + 6} ${line.to.y + 6}`}
                />
            </rect>

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
                zIndex: isSearchResult ? 30 : 20
            }}
            onClick={onClick}
        >
            {/* Outline */}
            <div className="absolute w-full h-full border border-white/10 group-hover:border-white/30 transition-colors" style={{
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(10px)',
                boxShadow: isSearchResult ? `0 0 20px ${cluster.color}30` : 'none'
            }} />

            {/* Corner Brackets */}
            <div className="hud-bracket-tl" style={{ color: cluster.color, opacity: 0.6 }} />
            <div className="hud-bracket-br" style={{ color: cluster.color, opacity: 0.6 }} />

            <div className="relative text-white font-black text-[12px] mono tracking-tighter">
                {cluster.count.toString().padStart(2, '0')}
            </div>
        </motion.div>
    );
});

// ─── ARTIST NODE ─────────────────────────────────────────────────────────
const ArtistNode = React.memo(({ artist, zoom, hovered, isSearchResult, dimmed, onHover, onClick }) => {
    const Icon = artist.icon || Music;
    const sz = artist.nodeSize || 76;
    const showPhoto = (zoom > 0.3) || (isSearchResult && !dimmed);
    
    // Correct URL handling for images
    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `http://localhost:5264${url}`;
    };

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
                zIndex: isSearchResult || hovered ? 30 : 20,
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

            {/* Pulse ring (Visual Only) */}
            <div className={`ring-pulse absolute rounded-sm pointer-events-none ${artist.isResident ? 'border-2' : 'border'}`} style={{
                inset: -10,
                border: `${artist.isResident ? '2px' : '1px'} solid ${artist.color}`,
                opacity: hovered ? 0.65 : 0.28,
                borderRadius: 6,
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
                {/* Visual Content Layer */}
                <div className="absolute inset-0 bg-black/40" />
                
                <AnimatePresence>
                    {showPhoto && artist.profileImage ? (
                        <motion.div
                            key="photo"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1, filter: hovered ? 'brightness(1)' : 'brightness(0.6)' }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0"
                        >
                            <img
                                src={getImageUrl(artist.profileImage)}
                                alt={artist.name}
                                className="w-full h-full object-cover grayscale-[0.2]"
                                onError={(e) => { 
                                    console.error(`[ArtistNode] Failed to load image for ${artist.name}:`, getImageUrl(artist.profileImage));
                                }}
                            />
                            
                            {/* Cyber-Tint Overlay */}
                            <div className="absolute inset-0 pointer-events-none mix-blend-color opacity-70" style={{ background: artist.color }} />
                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                            
                            {/* Scanlines Effect */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[repeating-linear-gradient(rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_2px)]" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="abstract"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, #000000 0%, ${artist.color}12 100%)` }}
                        >
                            <Icon size={Math.round(sz * 0.35)} style={{ color: artist.color, opacity: hovered ? 1 : 0.25 }} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Always-on Corner brackets */}
                <div className="absolute top-0 left-0 w-2 h-2 pointer-events-none" style={{ borderTop: `0.5px solid ${artist.color}`, borderLeft: `0.5px solid ${artist.color}`, opacity: 0.6 }} />
                <div className="absolute top-0 right-0 w-2 h-2 pointer-events-none" style={{ borderTop: `0.5px solid ${artist.color}`, borderRight: `0.5px solid ${artist.color}`, opacity: 0.6 }} />
                <div className="absolute bottom-0 left-0 w-2 h-2 pointer-events-none" style={{ borderBottom: `0.5px solid ${artist.color}`, borderLeft: `0.5px solid ${artist.color}`, opacity: 0.6 }} />
                <div className="absolute bottom-0 right-0 w-2 h-2 pointer-events-none" style={{ borderBottom: `0.5px solid ${artist.color}`, borderRight: `0.5px solid ${artist.color}`, opacity: 0.6 }} />

                {/* Resident Badge */}
                {artist.isResident && (
                    <div className="absolute top-1 right-1 bg-[#ff006e] text-black font-black text-[5px] px-1 rounded-sm tracking-tighter">
                        RES_01
                        <div className="absolute -inset-x-2 h-[0.5px] bg-[#ff006e]/30 top-1/2" />
                    </div>
                )}

                {/* Bottom ID strip */}
                <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-black/60 border-t border-white/5">
                    <div className="mono truncate font-black" style={{ fontSize: Math.max(5, Math.round(sz * 0.08)), color: artist.color, opacity: 0.9, letterSpacing: '0.2em' }}>
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
                        className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-50"
                        style={{ bottom: sz + 12, whiteSpace: 'nowrap' }}
                    >
                        <div className="px-3 py-2 rounded-sm bg-black/95 border border-[#fbbf24] text-[#fbbf24] shadow-2xl mono text-[10px]">
                            <div className="text-[8px] font-black">{artist.sector}</div>
                            <div className="font-bold">{artist.name.toUpperCase()}</div>
                        </div>
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
            {/* Ultra-thin vector grid */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.05]">
                <defs>
                    <pattern id="radarGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ff006e" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#radarGrid)" />
                {/* Crosshair */}
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#ff006e" strokeWidth="0.5" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#ff006e" strokeWidth="0.5" />
            </svg>

            {/* Sector Nav Points */}
            {sectors.map(s => (
                <div key={s.name} className="absolute w-1 h-1 rounded-sm border border-[#ff006e]/40" style={{
                    left: s.x * sx - 0.5, top: s.y * sy - 0.5,
                    transform: 'rotate(45deg)',
                }} />
            ))}

            {/* Artist Pulse Nodes */}
            {artists.map((a, i) => (
                <div key={a.id || i} className="absolute rounded-full pointer-events-none transition-all duration-500" style={{
                    left: a.x * sx, top: a.y * sy,
                    width: 1.5, height: 1.5,
                    background: a.color,
                    boxShadow: `0 0 4px ${a.color}`,
                }} />
            ))}
        </>
    ), [artists, sectors, sx, sy]);

    return (
        <div
            data-hud
            className="absolute bottom-8 right-6 z-50 rounded-sm overflow-hidden group/radar shadow-2xl"
            style={{
                width: RW, height: RH,
                background: 'rgba(0,0,0,0.65)',
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(30px)',
                cursor: 'crosshair',
            }}
            onClick={handleClick}
        >
            <div className="h-full relative font-mono">
                {/* Brackets */}
                <div className="hud-bracket-tl text-[#ff006e]/30" />
                <div className="hud-bracket-br text-[#ff006e]/30" />

                {RadarStaticBackground}

                {/* Rotating Sonar Sweep */}
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] pointer-events-none opacity-[0.08]" style={{
                    background: 'conic-gradient(from 0deg, #ff006e 0deg, transparent 90deg)',
                    animation: 'spin 4s linear infinite',
                    transformOrigin: 'center center',
                }} />

                {/* Viewport Frame */}
                <div
                    className="absolute transition-all duration-200"
                    onPointerDown={handleBoxDown}
                    onPointerMove={handleBoxMove}
                    onPointerUp={handleBoxUp}
                    onPointerCancel={handleBoxUp}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        left: boxX, top: boxY,
                        width: boxW, height: boxH,
                        border: '0.5px solid rgba(255,0,110,0.6)',
                        background: 'rgba(255,0,110,0.03)',
                        boxShadow: '0 0 10px rgba(255,0,110,0.1)',
                        cursor: 'grab',
                        zIndex: 20
                    }}
                >
                    <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-[#ff006e]" />
                    <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-[#ff006e]" />
                </div>

                {/* Status Bar */}
                <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-black/40 flex justify-between items-center text-[6px] tracking-[0.2em] text-[#ff006e] border-t border-white/5 uppercase font-black">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-[#ff006e] rounded-full animate-pulse" />
                        RADAR_LINK_STABLE
                    </div>
                    <div>{artists.length.toString().padStart(4, '0')} // SIG_NODES</div>
                </div>
            </div>
        </div>
    );
});

export default React.memo(DiscoveryMapView);
