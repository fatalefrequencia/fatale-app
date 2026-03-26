import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    ReactFlow,
    useNodesState,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter } from 'lucide-react';

import API from '../services/api';
import { SECTORS, getMediaUrl } from '../constants';
import { useNotification } from '../contexts/NotificationContext';
import { CommunityDetailsModal, CreateCommunityModal } from './CommunityModals';

import ArtistNode from './discovery/ArtistNode';
import PlaylistNode from './discovery/PlaylistNode';
import SectorLabel from './discovery/SectorLabel';
import YoutubeNode from './discovery/YoutubeNode';
import PlaylistPreviewPanel from './discovery/PlaylistPreviewPanel';

// ─── Helpers ────────────────────────────────────────────────────────────────
const hashStr = (s) => {
    if (!s) return 0;
    let h = 0;
    const str = s.toString();
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

// Deterministic jitter for stable layout
const jitter = (seed, range) => ((hashStr(seed + 'x') % range) - range / 2);

// Archimedean spiral for scattering artists around sector center
const spiral = (index, cx, cy) => {
    const a = 180;
    const b = 95;
    const angle = index * 2.4;
    const radius = a + b * angle;
    return {
        x: cx + Math.cos(angle) * radius + jitter(index + 'ax', 40),
        y: cy + Math.sin(angle) * radius * 1.15 + jitter(index + 'ay', 40),
    };
};

// --- Node types registered outside component to avoid recreation ---
const nodeTypes = {
    artistNode: ArtistNode,
    playlistNode: PlaylistNode,
    sectorLabel: SectorLabel,
    youtubeNode: YoutubeNode,
};

// ─── Inner canvas (needs ReactFlow context) ─────────────────────────────────
const DiscoveryCanvas = ({
    navigateToProfile,
    onPlayPlaylist,
    onPlayTrack,
    allTracks = [],
    user,
    onCommunityUpdate,
    followedCommunities = [],
    onFollowUpdate,
}) => {
    const { showNotification } = useNotification();
    const { getViewport } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [activeSector, setActiveSector] = useState(null); // null = all
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [communities, setCommunities] = useState([]);
    const [selectedCommunity, setSelectedCommunity] = useState(null);
    const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
    const [youtubeNodes, setYoutubeNodes] = useState([]);

    // Track current viewport zoom for node visibility
    const [currentZoom, setCurrentZoom] = useState(0.45);

    // ── Build nodes from API data ──
    const buildNodes = useCallback((artists, playlists, zoom) => {
        const result = [];

        // 1. Sector background labels
        SECTORS.forEach(sec => {
            result.push({
                id: `sector-label-${sec.id}`,
                type: 'sectorLabel',
                position: { x: sec.x - 280, y: sec.y - 200 },
                data: { name: sec.name, color: sec.color, desc: sec.desc, zoom },
                draggable: false,
                selectable: false,
                focusable: false,
                zIndex: -10,
            });
        });

        // 2. Group artists by sector
        const sectorGroups = {};
        SECTORS.forEach(s => sectorGroups[s.id] = []);

        artists.forEach((a, i) => {
            const dbSectorId = a.sectorId ?? a.SectorId;
            const h = hashStr((a.userId || a.UserId || a.id || i).toString());
            const secId = (dbSectorId !== null && dbSectorId !== undefined && SECTORS[dbSectorId])
                ? dbSectorId
                : h % SECTORS.length;
            if (!sectorGroups[secId]) sectorGroups[secId] = [];
            sectorGroups[secId].push(a);
        });

        // 3. Place artist nodes
        Object.entries(sectorGroups).forEach(([secId, group]) => {
            const sec = SECTORS[parseInt(secId)] || SECTORS[0];
            group.forEach((a, idx) => {
                const pos = spiral(idx, sec.x, sec.y);
                const id = (a.id || a.Id || `a-${a.userId || a.UserId}-${idx}`).toString();
                const trackCount = a.trackCount || a.TrackCount || 0;
                const isLive = a.isLive || a.IsLive || false;
                result.push({
                    id,
                    type: 'artistNode',
                    position: pos,
                    data: {
                        name: a.name || a.Name || 'ARTIST',
                        imageUrl: a.imageUrl || a.ImageUrl || a.profileImageUrl || null,
                        sectorColor: sec.color,
                        isLive,
                        trackCount,
                        userId: a.userId || a.UserId,
                        navigateToProfile,
                        zoom,
                    },
                    zIndex: isLive ? 10 : 1,
                });
            });
        });

        // 4. Place playlist nodes (near their owner's sector)
        playlists.forEach((pl, idx) => {
            const ownerId = pl.userId || pl.UserId || pl.ownerId;
            const ownerArtist = artists.find(a => String(a.userId || a.UserId) === String(ownerId));
            const dbSectorId = ownerArtist?.sectorId ?? ownerArtist?.SectorId;
            const h = hashStr((ownerId || idx).toString());
            const secId = (dbSectorId !== null && dbSectorId !== undefined && SECTORS[dbSectorId])
                ? dbSectorId
                : h % SECTORS.length;
            const sec = SECTORS[secId] || SECTORS[0];

            // Place playlists further out from the sector center
            const angle = (idx * 1.7) + 0.5;
            const radius = 600 + (idx % 5) * 120;
            const pos = {
                x: sec.x + Math.cos(angle) * radius + jitter(idx + 'plx', 60),
                y: sec.y + Math.sin(angle) * radius * 1.1 + jitter(idx + 'ply', 60),
            };

            result.push({
                id: `pl-${pl.id || pl.Id || idx}`,
                type: 'playlistNode',
                position: pos,
                data: {
                    name: pl.name || pl.Name || 'Playlist',
                    imageUrl: pl.imageUrl || pl.ImageUrl || null,
                    trackCount: pl.trackCount || pl.TrackCount || (pl.tracks?.length ?? 0),
                    creatorName: pl.creatorName || pl.username || null,
                    zoom,
                    onClick: () => setSelectedPlaylist(pl),
                },
                zIndex: 2,
            });
        });

        // 5. Merge in YouTube nodes fetched separately
        youtubeNodes.forEach(yn => result.push(yn));

        return result;
    }, [navigateToProfile, youtubeNodes]);

    // ── Fetch YouTube results per sector ──
    const fetchYoutube = useCallback(async (onPlayTrackFn) => {
        const results = [];
        // Sample 3 sectors to avoid too many requests
        const sampledSectors = SECTORS.slice(0, 4);
        await Promise.all(sampledSectors.map(async (sec) => {
            try {
                const query = sec.subgenres?.[0] || sec.name;
                const res = await API.Youtube.getDiscoveryNodes(query).catch(() => null);
                const items = Array.isArray(res?.data) ? res.data : [];
                items.forEach((item, idx) => {
                    const videoId = item.videoId || item.VideoId || item.id || item.Id;
                    if (!videoId) return;
                    // Place YT nodes in an outer ring around the sector
                    const angle = (idx * 0.85) + 4.2;
                    const radius = 900 + (idx % 4) * 160;
                    const xj = ((hashStr(videoId + 'ytx') % 80) - 40);
                    const yj = ((hashStr(videoId + 'yty') % 80) - 40);
                    results.push({
                        id: `yt-${videoId}-${sec.id}`,
                        type: 'youtubeNode',
                        position: {
                            x: sec.x + Math.cos(angle) * radius + xj,
                            y: sec.y + Math.sin(angle) * radius * 1.2 + yj,
                        },
                        data: {
                            title: item.title || item.Title || 'YouTube Signal',
                            channelTitle: item.channelTitle || item.ChannelTitle || '',
                            thumbnail: item.thumbnail || item.Thumbnail || item.thumbnailUrl || '',
                            videoId,
                            sectorColor: sec.color,
                            zoom: 0.45,
                            onPlay: onPlayTrackFn,
                        },
                        zIndex: 3,
                    });
                });
            } catch {}
        }));
        setYoutubeNodes(results);
    }, []);

    // ── Fetch data ──
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [artistRes, commRes] = await Promise.all([
                API.Artists.getAll().catch(() => ({ data: [] })),
                API.Communities.getAll().catch(() => ({ data: [] })),
            ]);

            const artists = Array.isArray(artistRes?.data) ? artistRes.data : [];
            const comms = Array.isArray(commRes?.data) ? commRes.data : [];
            setCommunities(comms);

            // Fetch public playlists from all artists (grab first page)
            let playlists = [];
            try {
                const plRes = await API.Playlists.getUserPlaylists(null).catch(() => ({ data: [] }));
                playlists = Array.isArray(plRes?.data) ? plRes.data.filter(p => p.isPosted || p.IsPosted) : [];
            } catch {
                playlists = [];
            }

            const built = buildNodes(artists, playlists, currentZoom);
            setNodes(built);

            // Fetch YouTube results in background
            fetchYoutube(onPlayTrack);
        } catch (e) {
            console.error('[DiscoveryCanvas] fetch error', e);
        } finally {
            setLoading(false);
        }
    }, [buildNodes, currentZoom]);

    useEffect(() => { fetchAll(); }, []);

    // ── Update zoom on all nodes when viewport changes ──
    const handleMove = useCallback((evt, viewport) => {
        const z = viewport?.zoom ?? 1;
        setCurrentZoom(z);
        setNodes(prev => prev.map(n => ({
            ...n,
            data: { ...n.data, zoom: z },
        })));
    }, [setNodes]);

    // ── Filter nodes by sector + search ──
    const filteredNodes = useMemo(() => {
        let n = nodes;

        if (activeSector !== null) {
            const sec = SECTORS[activeSector];
            n = n.filter(node => {
                if (node.type === 'sectorLabel') return node.id === `sector-label-${activeSector}`;
                if (node.type === 'artistNode') return node.data?.sectorColor === sec.color;
                return true; // keep playlists always
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            n = n.filter(node => {
                if (node.type === 'sectorLabel') return true;
                return (node.data?.name || '').toLowerCase().includes(q);
            });
        }

        return n;
    }, [nodes, activeSector, searchQuery]);

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#020202' }}>
            {/* ── Overlay Controls ── */}
            <div style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                zIndex: 100, display: 'flex', alignItems: 'center', gap: 8,
                pointerEvents: 'auto',
            }}>
                {/* Search bar */}
                <AnimatePresence>
                    {searchOpen && (
                        <motion.input
                            key="search"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 220, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            autoFocus
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search artists..."
                            style={{
                                background: 'rgba(10,10,10,0.92)',
                                border: '1px solid rgba(255,0,110,0.4)',
                                borderRadius: 8,
                                color: '#fff',
                                padding: '8px 12px',
                                fontSize: 12,
                                fontFamily: 'monospace',
                                outline: 'none',
                                letterSpacing: '0.05em',
                            }}
                        />
                    )}
                </AnimatePresence>
                <button
                    onClick={() => { setSearchOpen(v => !v); if (searchOpen) setSearchQuery(''); }}
                    style={{
                        background: 'rgba(10,10,10,0.92)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: searchOpen ? '#ff006e' : 'rgba(255,255,255,0.6)',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    {searchOpen ? <X size={14} /> : <Search size={14} />}
                </button>
            </div>

            {/* ── Sector Filter Pills ── */}
            <div style={{
                position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                zIndex: 100,
                display: 'flex', gap: 6, flexWrap: 'nowrap',
                pointerEvents: 'auto',
                overflowX: 'auto',
                maxWidth: 'calc(100vw - 120px)',
                padding: '0 4px',
            }}>
                <button
                    onClick={() => setActiveSector(null)}
                    style={{
                        background: activeSector === null ? '#ff006e' : 'rgba(10,10,10,0.85)',
                        border: '1px solid rgba(255,0,110,0.3)',
                        borderRadius: 20,
                        color: activeSector === null ? '#fff' : 'rgba(255,255,255,0.5)',
                        padding: '5px 12px',
                        fontSize: 10,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}
                >
                    ALL
                </button>
                {SECTORS.map(sec => (
                    <button
                        key={sec.id}
                        onClick={() => setActiveSector(activeSector === sec.id ? null : sec.id)}
                        style={{
                            background: activeSector === sec.id ? sec.color : 'rgba(10,10,10,0.85)',
                            border: `1px solid ${sec.color}60`,
                            borderRadius: 20,
                            color: activeSector === sec.id ? '#000' : sec.color,
                            padding: '5px 12px',
                            fontSize: 10,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        {sec.name}
                    </button>
                ))}
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(2,2,2,0.85)',
                    flexDirection: 'column', gap: 12,
                }}>
                    <div style={{
                        width: 40, height: 40, border: '3px solid #ff006e',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <div style={{
                        color: '#ff006e', fontFamily: 'monospace',
                        fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase',
                    }}>
                        TUNING FREQUENCIES...
                    </div>
                </div>
            )}

            {/* ── React Flow Canvas ── */}
            <ReactFlow
                nodes={filteredNodes}
                edges={[]}
                onNodesChange={onNodesChange}
                nodeTypes={nodeTypes}
                onMove={handleMove}
                minZoom={0.1}
                maxZoom={2.5}
                defaultViewport={{ x: 0, y: 0, zoom: 0.35 }}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnScroll={false}
                zoomOnScroll={true}
                zoomOnPinch={true}
                panOnDrag={true}
                proOptions={{ hideAttribution: true }}
                style={{ background: '#020202' }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={28}
                    size={1}
                    color="rgba(255,0,110,0.08)"
                />
                <Controls
                    style={{
                        bottom: 60,
                        right: 12,
                        background: 'rgba(10,10,10,0.9)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                    }}
                    showInteractive={false}
                />
                <MiniMap
                    style={{
                        background: 'rgba(6,6,6,0.9)',
                        border: '1px solid rgba(255,0,110,0.2)',
                        borderRadius: 10,
                        bottom: 60,
                    }}
                    nodeColor={node => {
                        if (node.type === 'artistNode') return node.data?.sectorColor || '#ff006e';
                        if (node.type === 'playlistNode') return 'rgba(255,255,255,0.3)';
                        return 'transparent';
                    }}
                    maskColor="rgba(2,2,2,0.7)"
                />
            </ReactFlow>

            {/* ── Playlist Preview Panel ── */}
            <PlaylistPreviewPanel
                playlist={selectedPlaylist}
                onClose={() => setSelectedPlaylist(null)}
                onPlayTrack={onPlayTrack}
                onPlayPlaylist={onPlayPlaylist}
            />

            {/* ── Community Modals ── */}
            {selectedCommunity && (
                <CommunityDetailsModal
                    community={selectedCommunity}
                    onClose={() => setSelectedCommunity(null)}
                    user={user}
                    followedCommunities={followedCommunities}
                    onFollowUpdate={onFollowUpdate}
                    onCommunityUpdate={onCommunityUpdate}
                />
            )}
            {isCreatingCommunity && (
                <CreateCommunityModal
                    onClose={() => setIsCreatingCommunity(false)}
                    onCommunityUpdate={onCommunityUpdate}
                    user={user}
                />
            )}

            {/* Spinner keyframes */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .react-flow__controls-button {
                    background: rgba(10,10,10,0.9) !important;
                    border-color: rgba(255,255,255,0.1) !important;
                    color: rgba(255,255,255,0.6) !important;
                    fill: rgba(255,255,255,0.6) !important;
                }
                .react-flow__controls-button:hover {
                    background: rgba(255,0,110,0.15) !important;
                    border-color: rgba(255,0,110,0.4) !important;
                    color: #ff006e !important;
                    fill: #ff006e !important;
                }
                .react-flow__minimap-mask { fill: rgba(2,2,2,0.7); }
            `}</style>
        </div>
    );
};

// ─── Exported component wrapped in provider ──────────────────────────────────
const DiscoveryMapView = (props) => (
    <ReactFlowProvider>
        <DiscoveryCanvas {...props} />
    </ReactFlowProvider>
);

export default React.memo(DiscoveryMapView);
