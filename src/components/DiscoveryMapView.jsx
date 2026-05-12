import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    Controls,

    Background,
    BackgroundVariant,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

import API from '../services/api';
import { SECTORS, getMediaUrl } from '../constants';
import { useNotification } from '../contexts/NotificationContext';
import { CommunityDetailsModal, CreateCommunityModal } from './CommunityModals';

import ArtistNode from './discovery/ArtistNode';
import PlaylistNode from './discovery/PlaylistNode';
import SectorLabel from './discovery/SectorLabel';
import YoutubeNode from './discovery/YoutubeNode';
import PlaylistPreviewPanel from './discovery/PlaylistPreviewPanel';
import SectorHubNode from './discovery/SectorHubNode';
import SectorHubPanel from './discovery/SectorHubPanel';
import CommunityNode from './discovery/CommunityNode';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, SimpleBezierEdge } from '@xyflow/react';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
const spiral = (index, cx, cy, startRadius = 280, spacing = 120) => {
    const angle = index * 2.39996;
    const radius = startRadius + Math.sqrt(index) * spacing;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius * 0.9 };
};

// --- Node types registered outside component to avoid recreation ---
const nodeTypes = {
    artistNode: ArtistNode,
    playlistNode: PlaylistNode,
    sectorLabel: SectorLabel,
    youtubeNode: YoutubeNode,
    sectorHubNode: SectorHubNode,
    communityNode: CommunityNode,
};

// â”€â”€â”€ Inner canvas (needs ReactFlow context) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DiscoveryCanvas = ({
    navigateToProfile,
    onPlayPlaylist,
    onPlayTrack,
    allTracks = [],
    user,
    onCommunityUpdate,
    followedCommunities = [],
    onFollowUpdate,
    isPlayerActive,
}) => {
    const handleYoutubePlay = useCallback((nodeData) => {
        if (onPlayTrack) {
            onPlayTrack(nodeData);
        } else if (onPlayPlaylist) {
            const track = {
                id: `youtube:${nodeData.id}`,
                title: nodeData.title,
                artist: nodeData.author,
                source: `youtube:${nodeData.id}`,
                cover: nodeData.thumbnailUrl,
                isLocked: false,
                isOwned: true,
                category: 'YouTube'
            };
            onPlayPlaylist([track], 0);
        }
    }, [onPlayTrack, onPlayPlaylist]);
    const { showNotification } = useNotification();
    const { getViewport, setCenter, fitView } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [activeSector, setActiveSector] = useState(null); // null = all
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [communities, setCommunities] = useState([]);
    const [selectedCommunity, setSelectedCommunity] = useState(null);
    const [activeSectorHub, setActiveSectorHub] = useState(null); // { sector, communities }
    const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
    const [creatingSectorId, setCreatingSectorId] = useState(null);
    const [youtubeNodes, setYoutubeNodes] = useState([]);

    // Track current viewport zoom for node visibility
    const [currentZoom, setCurrentZoom] = useState(0.45);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
    const hasFetchedRef = useRef(false);

    // â”€â”€ Build nodes from API data â”€â”€
    const buildNodes = useCallback((artists, playlists, communitiesData, zoom) => {
        const result = [];

        // 1. (REMOVED REDUNDANT SECTOR LABELS)

        // 2. Group artists by sector
        const sectorGroups = {};
        SECTORS.forEach(s => sectorGroups[s.id] = []);

        artists.forEach((a, idx) => {
            const dbSectorId = a.sectorId ?? a.SectorId;
            const secId = (dbSectorId !== null && dbSectorId !== undefined && SECTORS[dbSectorId])
                ? dbSectorId
                : idx % SECTORS.length;
            if (!sectorGroups[secId]) sectorGroups[secId] = [];
            sectorGroups[secId].push(a);
        });

        // 3. Place artist nodes
        Object.entries(sectorGroups).forEach(([secId, group]) => {
            const sec = SECTORS[parseInt(secId)] || SECTORS[0];
            group.forEach((a, idx) => {
                const pos = spiral(idx, sec.x, sec.y, 300, 140);
                // UNIFIED ID LOGIC
                const aId = a.id || a.Id || a.userId || a.UserId || `fallback-${idx}`;
                const id = `a-${aId}`;

                const trackCount = a.trackCount || a.TrackCount || 0;
                const isLive = a.isLive || a.IsLive || false;
                result.push({
                    id,
                    type: 'artistNode',
                    position: pos,
                    data: {
                        name: a.name || a.Name || 'ARTIST',
                        imageUrl: a.imageUrl || a.ImageUrl || a.profileImageUrl || null,
                        sectorColor: '#ff006e', // Fixed color for Individuals
                        sectorId: sec.id, // For filtering
                        isLive,
                        trackCount,
                        userId: a.userId || a.UserId || a.id || a.Id,
                        navigateToProfile,
                        zoom,
                    },
                    zIndex: isLive ? 10 : 1,
                });
            });
        });

        // 3.5. Place Sector Hub Nodes and Individual Community Nodes
        SECTORS.forEach(sec => {
            const sectorCommunities = (communitiesData || []).filter(c => c.sectorId === sec.id);
            const userIsMember = sectorCommunities.some(c =>
                String(c.id) === String(user?.communityId || user?.CommunityId)
            );

            // The main Hub (Landmark) - Hidden as requested
            /*
            result.push({
                id: `sector-hub-${sec.id}`,
                type: 'sectorHubNode',
                position: { x: sec.x - 130, y: sec.y - 130 }, // Centered (260/2)
                data: {
                    name: sec.name,
                    color: sec.color,
                    communityCount: sectorCommunities.length,
                    isMember: userIsMember,
                    zoom,
                    sector: sec,
                    communities: sectorCommunities,
                    onClick: () => setActiveSectorHub({ sector: sec, communities: sectorCommunities })
                },
                zIndex: 5,
            });
            */

            // Individual Community Nodes (Orbiting the hub)
            sectorCommunities.forEach((comm, cidx) => {
                const angle = (cidx / sectorCommunities.length) * 2 * Math.PI;
                const radius = 180; // Denser orbit around the hub
                const pos = {
                    x: sec.x + Math.cos(angle) * radius - 50,
                    y: sec.y + Math.sin(angle) * radius - 50
                };

                result.push({
                    id: `comm-${comm.id}`,
                    type: 'communityNode',
                    position: pos,
                    data: {
                        name: comm.name || 'COMMUNITY',
                        color: '#00ffff', // Fixed color for Communities
                        sectorId: sec.id, // For filtering
                        memberCount: comm.memberCount || 0,
                        imageUrl: comm.imageUrl,
                        zoom,
                        onClick: () => setSelectedCommunity(comm)
                    },
                    zIndex: 10
                });
            });
        });

        // 4. Place playlist nodes (near their owner's sector)
        playlists.forEach((pl, idx) => {
            const ownerId = pl.userId || pl.UserId || pl.ownerId;
            const ownerArtist = artists.find(a => String(a.userId || a.UserId || a.id || a.Id) === String(ownerId));
            const dbSectorId = ownerArtist?.sectorId ?? ownerArtist?.SectorId;
            const h = hashStr((ownerId || idx).toString());
            const secId = (dbSectorId !== null && dbSectorId !== undefined && SECTORS[dbSectorId])
                ? dbSectorId
                : h % SECTORS.length;
            const sec = SECTORS[secId] || SECTORS[0];

            // Place playlists further out from the sector center
            const pos = spiral(idx + 15, sec.x, sec.y, 450, 160);

            result.push({
                id: `pl-${pl.id || pl.Id || idx}`,
                type: 'playlistNode',
                position: pos,
                data: {
                    name: pl.name || pl.Name || 'Playlist',
                    imageUrl: pl.imageUrl || pl.ImageUrl || null,
                    trackCount: pl.trackCount || pl.TrackCount || (pl.tracks?.length ?? 0),
                    creatorName: pl.creatorName || pl.username || null,
                    sectorColor: '#ffff00', // Fixed color for Music
                    sectorId: sec.id, // For filtering
                    zoom,
                    pl, // pass full playlist object for click handler
                },
                zIndex: 2,
            });
        });

        return result;
    }, [navigateToProfile]);

    // ── Fetch YouTube results per sector ──
    const fetchYoutube = useCallback(async () => {
        const results = [];
        const sampledSectors = SECTORS.slice(0, 6);
        await Promise.all(sampledSectors.map(async (sec) => {
            try {
                // Focus query specifically on high-quality professional music content
                const baseQuery = sec.subgenres?.[0] || sec.name;
                const query = `${baseQuery} "music video" official -playlist -relaxing -live`;
                const res = await API.Youtube.getDiscoveryNodes(query, user?.id || user?.Id).catch(() => null);

                // Filter for musical content and remove "noise" results
                const items = (Array.isArray(res?.data) ? res.data : [])
                    .filter(item => {
                        const title = (item.Title || item.title || '').toLowerCase();
                        const channel = (item.Author || item.author || item.ChannelTitle || '').toLowerCase();

                        // Strict filter to ensure professional artist content
                        const isJunk = /vlog|tutorial|review|how to|reaction|unboxing|podcast|news|movie|trailer|meditation|sleep|study|relaxing/i.test(title);
                        const isGeneric = /mix|playlist|best of|compilation|top 10|various/i.test(title) || /mix|playlist|relax/i.test(channel);
                        const isMusic = /movie|audio|official|video|song|lyrics|feat|ft\.|album|track|remix/i.test(title);

                        return !isJunk && !isGeneric && isMusic;
                    })
                    .slice(0, 10); // Cap at 10 high-quality nodes

                items.forEach((item, idx) => {
                    const videoId = item.Id || item.id;
                    if (!videoId) return;

                    results.push({
                        id: `yt-${videoId}-${sec.id}-${idx}`,
                        type: 'youtubeNode',
                        position: spiral(idx + 30, sec.x, sec.y, 500, 120),
                        data: {
                            title: item.Title || item.title || 'YouTube Signal',
                            author: item.Author || item.author || item.album?.artist?.name || item.ChannelTitle || '',
                            thumbnailUrl: item.ThumbnailUrl || item.thumbnailUrl || item.coverImageUrl || item.CoverImageUrl || item.thumbnail || '',
                            id: videoId,
                            sectorColor: '#ffff00', // Fixed color for Music
                            sectorId: sec.id, // For filtering
                            zoom: currentZoom,
                            onPlay: handleYoutubePlay,
                        },
                        zIndex: 3,
                    });
                });
            } catch (err) {
                console.error("Discovery YT Fetch Error:", err);
            }
        }));
        setYoutubeNodes(results);
    }, [handleYoutubePlay]); // Removed currentZoom to avoid frequent re-fetches

    // ── Fetch data ──
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [artistRes, commRes] = await Promise.all([
                API.Artists.getAll().catch(() => ({ data: [] })),
                API.Communities.getAll().catch(() => ({ data: [] })),
            ]);

            const artists = (Array.isArray(artistRes?.data) ? artistRes.data : []).map(a => ({
                ...a,
                id: a.id || a.Id,
                userId: a.userId || a.UserId || a.id || a.Id,
                sectorId: a.sectorId ?? a.SectorId,
                communityId: a.communityId || a.CommunityId,
                name: a.name || a.Name || 'ARTIST',
                imageUrl: a.imageUrl || a.ImageUrl || a.profileImageUrl || null,
                isLive: a.isLive || a.IsLive || false,
                trackCount: a.trackCount || a.TrackCount || 0
            }));

            const comms = (Array.isArray(commRes?.data) ? commRes.data : []).map(c => ({
                ...c,
                id: c.id || c.Id,
                sectorId: c.sectorId ?? c.SectorId,
                founderUserId: c.founderUserId || c.FounderUserId,
                name: c.name || c.Name || 'COMMUNITY',
                memberCount: c.memberCount || c.MemberCount || 0
            }));

            setCommunities(comms);

            // Fetch public playlists from all artists (grab first page)
            let playlists = [];
            try {
                const plRes = await API.Playlists.getAll().catch(() => ({ data: [] }));
                playlists = Array.isArray(plRes?.data) ? plRes.data.filter(p => p.isPosted || p.IsPosted) : [];
            } catch {
                playlists = [];
            }

            const built = buildNodes(artists, playlists, comms, currentZoom);
            setNodes(built);

            // Build Tethers (Edges)
            const builtEdges = [];

            // 1. Artist Connections (Multi-Relational Tracers)
            artists.forEach((a, idx) => {
                // UNIFIED ID LOGIC (Must match buildNodes exactly)
                const aId = a.id || a.Id || a.userId || a.UserId || `fallback-${idx}`;
                const artistNodeId = `a-${aId}`;

                const residentSectorId = a.sectorId ?? a.SectorId ?? (idx % SECTORS.length);
                const residentSec = SECTORS[residentSectorId] || SECTORS[0];

                const memberCommId = a.communityId || a.CommunityId;
                const foundedComms = comms.filter(c => {
                    const fId = c.founderUserId || c.FounderUserId;
                    const thisAId = a.id || a.Id || a.userId || a.UserId;
                    return fId && String(fId) === String(thisAId);
                });

                const linkedCommIds = new Set();
                if (memberCommId) linkedCommIds.add(String(memberCommId));
                foundedComms.forEach(c => {
                    const cId = c.id || c.Id;
                    if (cId) linkedCommIds.add(String(cId));
                });

                if (linkedCommIds.size > 0) {
                    linkedCommIds.forEach(cid => {
                        const commNodeId = `comm-${cid}`;
                        const commObj = comms.find(c => String(c.id || c.Id) === String(cid));
                        const cSectorId = commObj?.sectorId ?? commObj?.SectorId ?? residentSectorId;
                        const edgeColor = SECTORS[cSectorId]?.color || residentSec.color;

                        const isHighlighted = hoveredNodeId === artistNodeId || hoveredNodeId === commNodeId;

                        // Artist -> Community (MEMBERSHIP/FOUNDER TETHER)
                        builtEdges.push({
                            id: `e-c-${artistNodeId}-${commNodeId}`,
                            source: commNodeId,
                            target: artistNodeId,
                            type: 'simplebezier',
                            animated: isHighlighted, // Only animate on hover
                            className: `discovery-edge ${hoveredNodeId ? (isHighlighted ? 'discovery-edge-active' : 'discovery-edge-inactive') : ''}`,
                            style: {
                                stroke: edgeColor,
                                strokeWidth: isHighlighted ? 2.5 : 1.5,
                                opacity: hoveredNodeId ? (isHighlighted ? 0.95 : 0.05) : 0.6,
                                transition: 'all 0.3s ease'
                            },
                        });

                        // High-Precision Sector Hub Tracer (Artist -> Hub) - Hidden
                        /*
                        const hubId = `sector-hub-${cSectorId}`;
                        const isHubHighlighted = hoveredNodeId === artistNodeId || hoveredNodeId === hubId;
                        builtEdges.push({
                            id: `e-h-${artistNodeId}-${hubId}`,
                            source: hubId,
                            target: artistNodeId,
                            type: 'simplebezier',
                            animated: true,
                            className: `discovery-edge ${hoveredNodeId ? (isHubHighlighted ? 'discovery-edge-active' : 'discovery-edge-inactive') : ''}`,
                            style: {
                                stroke: edgeColor,
                                strokeWidth: isHubHighlighted ? 1.5 : 0.8,
                                opacity: hoveredNodeId ? (isHubHighlighted ? 0.6 : 0.03) : 0.15
                            },
                        });
                        */
                    });
                } else {
                    // Unaffiliated Artist -> Resident Hub link (Subtle spatial context) - Hidden
                    /*
                    const hubId = `sector-hub-${residentSec.id}`;
                    builtEdges.push({
                        id: `e-direct-${artistNodeId}-${hubId}`,
                        source: hubId,
                        target: artistNodeId,
                        type: 'simplebezier',
                        style: { stroke: residentSec.color, strokeWidth: 0.5, opacity: 0.1, strokeDasharray: '4 4' },
                    });
                    */
                }
            });

            // 2. Community -> Hub Connections - Hidden
            /*
            comms.forEach(c => {
                const commNodeId = `comm-${c.id}`;
                const sec = SECTORS[c.sectorId] || SECTORS[0];
                const hubId = `sector-hub-${sec.id}`;
                const isHighlighted = hoveredNodeId === commNodeId || hoveredNodeId === hubId;

                builtEdges.push({
                    id: `e-${commNodeId}-${hubId}`,
                    source: hubId,
                    target: commNodeId,
                    type: 'simplebezier',
                    animated: true,
                    className: `discovery-edge ${hoveredNodeId ? (isHighlighted ? 'discovery-edge-active' : 'discovery-edge-inactive') : ''}`,
                    style: { stroke: sec.color, strokeWidth: isHighlighted ? 3 : 2, opacity: hoveredNodeId ? (isHighlighted ? 1 : 0.1) : 0.4 },
                });
            });
            */

            setEdges(builtEdges);

            console.log(`[DiscoveryCanvas] fetchAll complete. Artists: ${artists.length}, Comms: ${comms.length}, Playlists: ${playlists.length}, Edges: ${builtEdges.length}`);
        } catch (e) {
            console.error('[DiscoveryCanvas] fetch error', e);
        } finally {
            setLoading(false);
        }
    }, [buildNodes, user]); // Removed communities and currentZoom to avoid circular/excessive re-triggers

    useEffect(() => {
        if (!hasFetchedRef.current) {
            fetchAll();
            fetchYoutube();
            hasFetchedRef.current = true;
        }
    }, [fetchAll, fetchYoutube]);

    // ── Update zoom on all nodes when viewport changes ──
    const handleMove = useCallback((evt, viewport) => {
        const z = viewport?.zoom ?? 1;
        setCurrentZoom(z);
        // Avoid bulk setNodes here to keep performance high and prevent blanking
    }, []);

    // â”€â”€ Central Node Click Handler â”€â”€
    const handleNodeClick = useCallback((event, node) => {
        if (node.type === 'artistNode') {
            const uid = node.data?.userId;
            if (uid && navigateToProfile) {
                navigateToProfile(uid);
            }
        } else if (node.type === 'playlistNode') {
            if (node.data?.pl) {
                setSelectedPlaylist(node.data.pl);
            }
        } else if (node.type === 'youtubeNode') {
            if (node.data?.onPlay) {
                node.data.onPlay(node.data);
            }
        } else if (node.type === 'sectorHubNode') {
            if (node.data?.onClick) {
                node.data.onClick();
            } else {
                setActiveSectorHub({
                    sector: node.data.sector,
                    communities: node.data.communities
                });
            }
        } else if (node.type === 'communityNode') {
            if (node.data?.onClick) node.data.onClick();
        }
    }, [navigateToProfile]);
    // --- Helper for genre categorization ---
    const getSectorByMetadata = (title, author) => {
        const text = `${title} ${author}`.toLowerCase();
        for (const sec of SECTORS) {
            if (text.includes(sec.name.toLowerCase())) return sec;
            for (const sub of (sec.subgenres || [])) {
                if (text.includes(sub.toLowerCase())) return sec;
            }
        }
        return null;
    };

    // â”€â”€ YouTube search: trigger on query change (debounced) â”€â”€
    const ytSearchRef = useRef(null);
    useEffect(() => {
        const query = searchQuery.trim();
        if (query.length < 3) {
            // Clear search results if query is too short
            setYoutubeNodes(prev => prev.filter(n => !n.id.startsWith('yt-search-')));
            return;
        }

        if (ytSearchRef.current) clearTimeout(ytSearchRef.current);

        ytSearchRef.current = setTimeout(async () => {
            try {
                // Refine search query for music quality
                const refinedQuery = `${query} music artist official`;
                const res = await API.Youtube.getDiscoveryNodes(refinedQuery, user?.id || user?.Id).catch(err => {
                    if (err.response?.status === 403 || err.response?.data?.includes('quota')) {
                        showNotification('YouTube API quota exceeded. Try again tomorrow.', 'warning');
                    }
                    return null;
                });

                // Filter results to ensure they are music-related
                const items = (Array.isArray(res?.data) ? res.data : [])
                    .filter(item => {
                        const title = (item.Title || item.title || '').toLowerCase();
                        const isJunk = /vlog|tutorial|review|how to|reaction|unboxing|podcast|news/i.test(title);
                        return !isJunk;
                    })
                    .slice(0, 15);
                const searchResults = items.map((item, idx) => {
                    const videoId = item.Id || item.id;
                    const title = item.Title || item.title || 'YouTube Signal';
                    const author = item.Author || item.author || item.album?.artist?.name || '';

                    const matchedSector = getSectorByMetadata(title, author);

                    // If matched, spiral near sector hub. Else, spiral near center (4000, 3000)
                    const centerX = matchedSector ? matchedSector.x : 4000;
                    const centerY = matchedSector ? matchedSector.y : 3000;
                    const color = matchedSector ? matchedSector.color : '#ffffff';

                    const pos = spiral(idx + 5, centerX, centerY, 250, 140);

                    return {
                        id: `yt-search-${videoId}-${idx}`,
                        type: "youtubeNode",
                        position: pos,
                        data: {
                            title,
                            author,
                            thumbnailUrl: item.ThumbnailUrl || item.thumbnailUrl || item.coverImageUrl || item.CoverImageUrl || '',
                            id: videoId,
                            sectorColor: '#ffff00', // Fixed color for Music
                            sectorId: matchedSector ? matchedSector.id : null,
                            zoom: currentZoom,
                            onPlay: handleYoutubePlay,
                        },
                        zIndex: 15,
                    };
                });

                setYoutubeNodes(prev => {
                    const bg = prev.filter(n => !n.id.startsWith('yt-search-'));
                    return [...bg, ...searchResults];
                });
            } catch { }
        }, 1200); // 1.2s debounce to be very conservative with quota

        return () => clearTimeout(ytSearchRef.current);
    }, [searchQuery, currentZoom, onPlayTrack, showNotification]);

    // â”€â”€ Filter nodes by sector + search â”€â”€
    const filteredNodes = useMemo(() => {
        let n = [...nodes, ...youtubeNodes];

        if (activeSector !== null) {
            const sec = SECTORS[activeSector];
            n = n.filter(node => {
                // Structural nodes
                if (node.type === 'sectorLabel') return node.id === `sector-label-${activeSector}`;
                if (node.type === 'sectorHubNode') return node.id === `sector-hub-${activeSector}`;

                // Content nodes (match by sectorId)
                return node.data?.sectorId === sec.id;
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            n = n.filter(node => {
                // Always keep landmarks visible (unless sector-filtered)
                if (node.type === 'sectorHubNode' || node.type === 'sectorLabel') return true;

                // Match name or title
                const contentName = (node.data?.name || node.data?.title || '').toLowerCase();
                return contentName.includes(q);
            });
        }

        return n;
    }, [nodes, youtubeNodes, activeSector, searchQuery]);

    // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#020202' }}>
            {/* â”€â”€ Overlay Controls â”€â”€ */}
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
                            placeholder={t('SEARCH_ARTISTS')}
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
                <button
                    onClick={() => { fetchAll(); showNotification(t('SYNCING_FREQS'), 'info'); }}
                    style={{
                        background: 'rgba(10,10,10,0.92)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: 'rgba(255,255,255,0.6)',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                    title={t('REFRESH_MAP')}
                >
                    <motion.div whileTap={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                        <Filter size={14} />
                    </motion.div>
                </button>
            </div>



            {/* â”€â”€ Loading â”€â”€ */}
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
                        {t('TUNING_FREQS')}
                    </div>
                </div>
            )}

            {/* â”€â”€ React Flow Canvas â”€â”€ */}
            <ReactFlow
                nodes={filteredNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
                onNodeMouseLeave={() => setHoveredNodeId(null)}
                nodeTypes={nodeTypes}
                onMove={handleMove}
                minZoom={0.02}
                maxZoom={2.5}
                defaultViewport={{ x: 0, y: 0, zoom: 0.05 }}
                fitView
                fitViewOptions={{ padding: 3.0 }}
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
                <Controls position="bottom-left" style={{ bottom: isPlayerActive ? 150 : 60, background: "rgba(10,10,10,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }} showInteractive={false} />

            </ReactFlow>

            {/* â”€â”€ Playlist Preview Panel â”€â”€ */}
            <PlaylistPreviewPanel
                playlist={selectedPlaylist}
                onClose={() => setSelectedPlaylist(null)}
                onPlayTrack={onPlayTrack}
                onPlayPlaylist={onPlayPlaylist}
            />

            {/* â”€â”€ Community Modals â”€â”€ */}
            <AnimatePresence>
                {activeSectorHub && (
                    <SectorHubPanel
                        sector={activeSectorHub?.sector}
                        communities={activeSectorHub?.communities || []}
                        onClose={() => setActiveSectorHub(null)}
                        onOpenCommunity={(comm) => {
                            setSelectedCommunity(comm);
                            setActiveSectorHub(null);
                        }}
                        onCreateCommunity={(sid) => {
                            setCreatingSectorId(sid);
                            setIsCreatingCommunity(true);
                            setActiveSectorHub(null);
                        }}
                        currentUser={user}
                    />
                )}
            </AnimatePresence>

            {selectedCommunity && (
                <CommunityDetailsModal
                    community={selectedCommunity}
                    onClose={() => setSelectedCommunity(null)}
                    currentUser={user}
                    onJoin={async (id) => {
                        await API.Communities.join(id);
                        fetchAll();
                        onCommunityUpdate?.();
                    }}
                    onLeave={async (id) => {
                        await API.Communities.leave(id);
                        fetchAll();
                        onCommunityUpdate?.();
                    }}
                    isFollowed={followedCommunities.includes(selectedCommunity.id)}
                    onFollow={async (id) => {
                        await API.Communities.follow(id);
                        // No need for fetchAll here as state syncs via event/props
                    }}
                    onUnfollow={async (id) => {
                        await API.Communities.unfollow(id);
                    }}
                    navigateToProfile={navigateToProfile}
                />
            )}
            {isCreatingCommunity && (
                <CreateCommunityModal
                    onClose={() => {
                        setIsCreatingCommunity(false);
                        setCreatingSectorId(null);
                    }}
                    onSubmit={async (dto) => {
                        await API.Communities.create(dto);
                        setIsCreatingCommunity(false);
                        setCreatingSectorId(null);
                        fetchAll();
                        onCommunityUpdate?.();
                        showNotification('Community founded successfully!', 'success');
                    }}
                    preselectedSectorId={creatingSectorId}
                    user_credits={user?.creditsBalance || user?.CreditsBalance || 0}
                />
            )}

            {/* Spinner keyframes */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
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

// â”€â”€â”€ Exported component wrapped in provider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DiscoveryMapView = (props) => (
    <ReactFlowProvider>
        <DiscoveryCanvas {...props} />
    </ReactFlowProvider>
);

export default React.memo(DiscoveryMapView);








