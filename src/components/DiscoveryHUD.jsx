import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Music, Disc, User, Users, Play, Pause, Heart, Layers, Radio, BookOpen, Camera, Zap, Share2, Activity, Globe, X, Star, ChevronLeft, Shuffle, MessageSquare, Grid, Plus } from 'lucide-react';
import API from '../services/api';
import { SECTORS, getMediaUrl } from '../constants';
import { useNotification } from '../contexts/NotificationContext';
import HUDWidget from './discovery/HUDWidget';
import InteractiveGlobe from './discovery/InteractiveGlobe';
import CommunityTerminal from './discovery/CommunityTerminal';
import { useLanguage } from '../contexts/LanguageContext';
import TrackActionsDropdown from './TrackActionsDropdown';

const hashStr = (s) => {
    if (!s) return 0;
    let h = 0;
    const str = s.toString();
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

const DiscoveryHUD = ({ user, setView, followedCommunities = [], onFollowUpdate, setUser, navigateToProfile, onPlayTrack, onPlayPlaylist, isPlayerActive, onExpandContent, onPlayStation, isLandscape, setShowGlobalIngest, setIngestMode, onMessageCommunity }) => {
    const { t } = useLanguage();
    const { showNotification } = useNotification();
    const [searchQuery, setSearchQuery] = useState('');
    const [conversations, setConversations] = useState([]);
    const [activeSector, setActiveSector] = useState(null);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await API.Messages.getConversations();
                setConversations(res.data || []);
            } catch (err) {
                console.error("Failed to fetch conversations in DiscoveryHUD:", err);
            }
        };
        fetchConversations();
    }, []);
    const [isFounding, setIsFounding] = useState(false);
    const [newClanName, setNewClanName] = useState('');
    const [newClanDesc, setNewClanDesc] = useState('');
    const [newClanSector, setNewClanSector] = useState(null);
    const [activeTerminalCommunity, setActiveTerminalCommunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBooting, setIsBooting] = useState(true);
    const [mobileViewMode, setMobileViewMode] = useState('globe'); // 'globe', 'data', 'search'

    const resolveThumbnail = (vis) => {
        // Handle PascalCase and camelCase variants from backend
        const thumb = vis.thumbnailUrl || vis.ThumbnailUrl || vis.coverImageUrl || vis.CoverImageUrl;
        const img = vis.imageUrl || vis.ImageUrl;

        // If we have a dedicated thumbnail, ALWAYS use it first (especially for videos)
        if (thumb) return getMediaUrl(thumb);

        // If it's a photo, the main image URL is the thumbnail
        if (img && (vis.mediaType || vis.MediaType || '').toLowerCase() !== 'video') {
            return getMediaUrl(img);
        }

        // Try to resolve from video source (YouTube detection)
        const videoUrl = vis.videoUrl || vis.VideoUrl || vis.source || vis.Source;
        if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.startsWith('youtube:'))) {
            let id = null;
            if (videoUrl.startsWith('youtube:')) {
                id = videoUrl.split(':')[1];
            } else {
                const match = videoUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                id = (match && match[2].length === 11) ? match[2] : null;
            }
            if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
        }

        // If it's a photo and we somehow missed it above
        if (img) return getMediaUrl(img);

        return null;
    };
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Data states for panels
    const [trendingTracks, setTrendingTracks] = useState([]);
    const [trendingArtists, setTrendingArtists] = useState([]);
    const [trendingPlaylists, setTrendingPlaylists] = useState([]);
    const [visualUploads, setVisualUploads] = useState([]);
    const [journalEntries, setJournalEntries] = useState([]);
    const [communities, setCommunities] = useState([]);
    const [stations, setStations] = useState([]);
    const [youtubeResults, setYoutubeResults] = useState([]);
    const [recentYoutubeTracks, setRecentYoutubeTracks] = useState([]);
    const [recentYoutubeSearches, setRecentYoutubeSearches] = useState([]);
    const [marketplaceItems, setMarketplaceItems] = useState([]);
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [activeRightPanelTab, setActiveRightPanelTab] = useState('objects'); // 'objects', 'playlists'
    const [playlistTracks, setPlaylistTracks] = useState([]);
    const [loadingPlaylist, setLoadingPlaylist] = useState(false);
    const [selectedGlobeItem, setSelectedGlobeItem] = useState(null);
    const [activeGlobeView, setActiveGlobeView] = useState(null);
    const [isGlobeSpinning, setIsGlobeSpinning] = useState(true);
    const [isPinterestView, setIsPinterestView] = useState(false);
    const [selectedSearchCategory, setSelectedSearchCategory] = useState('ALL');

    // ── Centralized native-track detection (catches ALL casing variants from API) ──
    const isNativeTrack = useCallback((t) => {
        const src = (t.source || t.Source || t.filePath || t.FilePath || "").toLowerCase();
        const artistName = (t.artist || t.artistName || t.ArtistName || t.Artist || "").toLowerCase();
        const genre = (t.genre || t.Genre || "").toLowerCase();
        const albumTitle = (t.albumTitle || t.AlbumTitle || "").toLowerCase();

        const isYt = src.startsWith('youtube:') || src.includes('youtube.com') || src.includes('youtu.be') || genre === 'youtube';
        const isArchive = artistName === 'the archive' || albumTitle.includes('youtube signals') || t.isArchive || t.IsArchive;

        return !isYt && !isArchive;
    }, []);
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [tracksRes, artistsRes, commsRes, playlistsRes, feedRes, stationsRes, studioRes] = await Promise.all([
                API.Tracks.getAllTracks({ sort: 'trending' }).catch(() => ({ data: [] })),
                API.Artists.getAll().catch(() => ({ data: [] })),
                API.Communities.getAll().catch(() => ({ data: [] })),
                API.Playlists.getAll().catch(() => ({ data: [] })),
                API.Feed.getGlobalFeed().catch(() => ({ data: [] })),
                API.Stations.getAll().catch(() => ({ data: [] })),
                API.Studio.getAllPosted().catch(() => ({ data: [] })),
            ]);

            setTrendingTracks(Array.isArray(tracksRes?.data) ? tracksRes.data : []);
            setTrendingArtists(Array.isArray(artistsRes?.data) ? artistsRes.data : []);
            setCommunities(Array.isArray(commsRes?.data) ? commsRes.data : []);
            setTrendingPlaylists(Array.isArray(playlistsRes?.data) ? playlistsRes.data : []);
            setStations(Array.isArray(stationsRes?.data) ? stationsRes.data : []);
            let marketplaceList = [];
            let standardStudioList = [];

            if (Array.isArray(studioRes?.data)) {
                const isUrl = (str) => {
                    if (!str) return false;
                    const trimmed = str.trim().toLowerCase();
                    return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('www.');
                };

                standardStudioList = studioRes.data.filter(item => !isUrl(item.description || item.Description));
                marketplaceList = studioRes.data.filter(item => isUrl(item.description || item.Description));

                const mappedVisuals = standardStudioList.map(item => ({
                    ...item,
                    id: item.id || item.Id,
                    Id: item.id || item.Id,
                    type: 'studio',
                    Type: 'studio',
                    artist: item.artist || item.Artist || item.user?.username || 'UNKNOWN_SIGNAL',
                    Artist: item.artist || item.Artist || item.user?.username || 'UNKNOWN_SIGNAL',
                    artistUserId: item.userId || item.UserId,
                    ArtistUserId: item.userId || item.UserId,
                    imageUrl: item.url || item.Url,
                    ImageUrl: item.url || item.Url,
                    mediaType: (item.type || item.Type || '').toUpperCase(),
                    MediaType: (item.type || item.Type || '').toUpperCase(),
                    thumbnailUrl: item.thumbnailUrl || item.ThumbnailUrl,
                    ThumbnailUrl: item.thumbnailUrl || item.ThumbnailUrl,
                    createdAt: item.createdAt || item.CreatedAt,
                    CreatedAt: item.createdAt || item.CreatedAt,
                }));
                setVisualUploads(mappedVisuals.slice(0, 12));
            }
            setMarketplaceItems(marketplaceList);

            if (Array.isArray(feedRes?.data)) {
                // Fetch my journal entries and merge with feed
                try {
                    const myJournalRes = await API.Journal.getMyJournal();
                    const myJournals = Array.isArray(myJournalRes?.data) ? myJournalRes.data : [];
                    const feedJournals = feedRes.data.filter(i => i.type === 'journal' || i.Type === 'journal');

                    // Combine and remove duplicates based on ID
                    const combined = [...myJournals];
                    feedJournals.forEach(fj => {
                        if (!combined.some(mj => (mj.id || mj.Id) === (fj.id || fj.Id))) {
                            combined.push(fj);
                        }
                    });

                    setJournalEntries(combined.slice(0, 8));
                } catch (e) {
                    console.error("Failed to fetch my journal in HUD:", e);
                    setJournalEntries(feedRes.data.filter(i => i.type === 'journal' || i.Type === 'journal').slice(0, 8));
                }
            }
        } catch (err) {
            console.error("Discovery HUD Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        // Boot sequence
        const buildId = 'TELEMETRY_SIGNAL_v2.0.260422_HARDENED';
        console.log(`[HUD] Established Signal: ${buildId}`);
        const bootTimer = setTimeout(() => setIsBooting(false), 1500);
        return () => clearTimeout(bootTimer);
    }, [fetchAll]);

    // Spotify Search logic (debounced) - Replaces legacy noisy YouTube search for ultra clean search results!
    useEffect(() => {
        if (searchQuery.length < 3) {
            setYoutubeResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const res = await API.Spotify.search(searchQuery).catch(() => null);
                const tracks = res && Array.isArray(res.data) ? res.data.slice(0, 10) : [];

                // Map Spotify tracks to the UI results
                const mapped = tracks.map(t => ({
                    id: t.id,
                    title: t.title,
                    author: t.artist,
                    artist: t.artist,
                    thumbnailUrl: t.coverImageUrl,
                    coverImageUrl: t.coverImageUrl,
                    cover: t.coverImageUrl,
                    imageUrl: t.coverImageUrl,
                    source: `spotify:${t.id}`,
                    duration: t.durationSeconds,
                    originalTrack: t
                }));

                setYoutubeResults(mapped);

                // Save search query to history
                const searches = JSON.parse(localStorage.getItem('recent_youtube_searches') || '[]');
                const filtered = searches.filter(s => s !== searchQuery);
                filtered.unshift(searchQuery);
                localStorage.setItem('recent_youtube_searches', JSON.stringify(filtered.slice(0, 5)));
            } catch (err) { /* ignore */ }
        }, 1000);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch recent YouTube searches and tracks when search is empty (from localStorage)
    useEffect(() => {
        if (searchQuery.length < 3) {
            try {
                const searches = JSON.parse(localStorage.getItem('recent_youtube_searches') || '[]');
                setRecentYoutubeSearches(searches);

                const tracks = JSON.parse(localStorage.getItem('recent_youtube_tracks') || '[]');
                setRecentYoutubeTracks(tracks);
            } catch {
                setRecentYoutubeSearches([]);
                setRecentYoutubeTracks([]);
            }
        }
    }, [searchQuery]);

    // Fetch user playlists on mount and when user changes
    useEffect(() => {
        const fetchUserPlaylists = async () => {
            if (user && (user.id || user.Id)) {
                try {
                    const res = await API.Playlists.getUserPlaylists(user.id || user.Id);
                    setUserPlaylists(res.data || []);
                } catch (err) {
                    console.error("Failed to fetch user playlists in DiscoveryHUD:", err);
                }
            }
        };
        fetchUserPlaylists();
    }, [user]);

    // Utility to check if an item matches the active sector
    const matchesSector = useCallback((item) => {
        if (activeSector === null) return true;
        const s = SECTORS.find(sec => sec.id === activeSector);
        if (!s) return true;

        const genre = (item.genre || item.Genre || "").toLowerCase();
        if (!genre) return false;

        // Check main genre or subgenres
        return s.name.toLowerCase().includes(genre) ||
            s.subgenres.some(sub => sub.toLowerCase() === genre || genre.includes(sub.toLowerCase()));
    }, [activeSector]);



    const albums = useMemo(() => {
        const map = new Map();
        trendingTracks.forEach(t => {
            const title = t.albumTitle || t.AlbumTitle;
            if (title && title !== '#' && title !== 'Unknown Album') {
                if (!map.has(title)) {
                    map.set(title, {
                        id: hashStr(title),
                        title,
                        artist: t.artist || t.artistName || t.ArtistName || 'Unknown Artist',
                        type: 'album'
                    });
                }
            }
        });
        return Array.from(map.values());
    }, [trendingTracks]);



    const filteredArtists = useMemo(() => {
        let base = trendingArtists.filter(a => {
            const name = (a.name || a.Name || "").toLowerCase();
            return name && !name.includes('placeholder') && name.length > 1 && name !== 'the archive' && name !== 'youtube' && !a.isArchive;
        });
        if (activeSector !== null) base = base.filter(matchesSector);
        if (searchQuery) {
            base = base.filter(a => (a.name || a.Name || '').toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return base;
    }, [trendingArtists, searchQuery, matchesSector, activeSector]);



    const filteredCommunities = useMemo(() => {
        let base = communities.filter(c => {
            const name = c.name || c.Name;
            // Strict check for real communities
            return name && !name.toLowerCase().includes('placeholder') && name.length > 2;
        });

        // Filter out system node (FATALE_CORE)
        base = base.filter(c =>
            !c.isSystem &&
            !c.IsSystem &&
            c.id !== 4 &&
            c.Id !== 4 &&
            c.name?.toUpperCase() !== 'FATALE_CORE' &&
            c.Name?.toUpperCase() !== 'FATALE_CORE'
        );

        if (activeSector !== null) base = base.filter(matchesSector);

        // Sort Joined community to top (Formal Membership)
        const userCommunityId = user?.communityId || user?.CommunityId;
        if (userCommunityId) {
            base = [...base].sort((a, b) => {
                if (String(a.id || a.Id) === String(userCommunityId)) return -1;
                if (String(b.id || b.Id) === String(userCommunityId)) return 1;
                return 0;
            });
        }

        if (activeSector !== null) base = base.filter(matchesSector);
        if (searchQuery) {
            base = base.filter(c => (c.name || c.Name || '').toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return base;
    }, [communities, searchQuery, matchesSector, activeSector, user]);

    const tracksWithColor = useMemo(() => {
        return trendingTracks
            .filter(isNativeTrack)
            .map(t => {
                const artist = trendingArtists.find(a => 
                    (t.artistUserId || t.ArtistUserId) ? String(a.userId || a.UserId) === String(t.artistUserId || t.ArtistUserId) :
                    (t.artistId || t.ArtistId) ? String(a.id || a.Id) === String(t.artistId || t.ArtistId) :
                    (a.name || a.Name || '').toLowerCase() === (t.artistName || t.ArtistName || t.artist || t.Artist || '').toLowerCase()
                );
                const sector = artist ? SECTORS.find(s => s.id === (artist.sectorId || artist.SectorId)) : null;
                return { 
                    ...t, 
                    artistId: artist ? (artist.id || artist.Id) : null,
                    artist: artist ? (artist.name || artist.Name) : (t.artistName || t.ArtistName),
                    color: sector ? sector.color : "#ffffff" 
                };
            });
    }, [trendingTracks, trendingArtists, isNativeTrack]);

    const artistsForGlobe = useMemo(() => {
        return trendingArtists.filter(a => {
            const name = (a.name || a.Name || "").toLowerCase();
            return name !== 'the archive' && name !== 'youtube' && !a.isArchive;
        });
    }, [trendingArtists]);



    const filteredVisuals = useMemo(() => {
        let base = visualUploads.filter(v => {
            const src = (v.source || v.Source || v.videoUrl || v.VideoUrl || "").toLowerCase();
            const artist = (v.artist || v.Artist || "").toLowerCase();
            const isYt = src.startsWith('youtube:') || src.includes('youtube.com') || src.includes('youtu.be');
            const isArchive = artist === 'the archive' || v.isArchive || v.IsArchive;
            return !isYt && !isArchive;
        });
        if (activeSector !== null) base = base.filter(matchesSector);

        if (!searchQuery) return base.slice(0, 9);
        return base.filter(v =>
            v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.artist?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [visualUploads, searchQuery, matchesSector, activeSector]);

    const filteredJournals = useMemo(() => {
        let base = journalEntries.filter(j => {
            const artist = (j.artist || j.Artist || "").toLowerCase();
            return artist !== 'the archive' && artist !== 'archive' && !j.isArchive && !j.IsArchive;
        });
        if (activeSector !== null) base = base.filter(matchesSector);

        if (!searchQuery) return base.slice(0, 6);
        return base.filter(j =>
            j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            j.artist?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [journalEntries, searchQuery, matchesSector, activeSector, user]);

    // Calculate dynamic theme color based on active sector
    const activeSectorColor = useMemo(() => {
        if (activeSector === null) return null;
        const s = SECTORS.find(sec => sec.id === activeSector);
        if (!s) return null;
        // Special case: Club (id: 0) gets a brighter pink to differentiate from the base theme
        if (s.id === 0) return "#ff33aa";
        return s.color;
    }, [activeSector]);

    const handleFoundCommunity = async (e) => {
        e.preventDefault();
        if (!newClanName.trim()) return;
        try {
            await API.Communities.create({
                name: newClanName,
                description: newClanDesc,
                sectorId: newClanSector !== null ? newClanSector : (activeSector !== null ? activeSector : 0)
            });
            showNotification("CLIQUE_ESTABLISHED", `Neural link locked for ${newClanName}.`, "success");
            setIsFounding(false);
            setNewClanName('');
            setNewClanDesc('');
            // Trigger a refresh of the discovery data
            if (onFollowUpdate) onFollowUpdate();
            // In a real app, we'd refetch all communities here. For now, we'll wait for the next periodic sync or event.
        } catch (e) {
            console.error('[FOUND_COMMUNITY_ERROR]', e);
            showNotification("FOUND_FAILURE", "Failed to establish community signal.", "error");
        }
    };

    return (
        <div className="relative w-full h-full overflow-y-auto lg:overflow-hidden bg-[#020202] text-white font-mono flex flex-col p-4 select-none no-scrollbar">
            {/* Global Style Inject for Total Scrollbar Invisibility */}
            <style dangerouslySetInnerHTML={{
                __html: `
                * {
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                }
                *::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
            `}} />

            {/* Terminal Boot Sequence Overlay */}
            <AnimatePresence>
                {isBooting && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: "circIn" }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-10 overflow-hidden"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="max-w-md w-full space-y-4"
                        >
                            <div className="text-[10px] text-[#ff006e] font-black tracking-[0.5em] mb-8 animate-pulse">{t('INITIATING_LINK')}</div>
                            <div className="space-y-1 font-mono text-[8px] opacity-40">
                                <div>[SYS] {t('BOOTING_KERNEL')}... OK</div>
                                <div>[SYS] {t('CALIBRATING_SENSORS')}... OK</div>
                                <div>[SYS] {t('ESTABLISHING_SIGNAL')}... OK</div>
                                <div>[SYS] {t('LOADING_MAP')}... OK</div>
                            </div>
                            <div className="h-1 w-full bg-[#ff006e]/20 relative overflow-hidden">
                                <motion.div
                                    initial={{ left: '-100%' }}
                                    animate={{ left: '0%' }}
                                    transition={{ duration: 1.2, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-[#ff006e]/80"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top scanning lines effect */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#ff006e]/10 z-[60] shadow-[0_0_20px_#ff006e]" />

            {/* --- TOP HUD BAR --- */}
            <div className="z-[80] flex flex-col lg:flex-row items-center justify-between gap-4 mb-4 px-2 relative">
                {/* LEFT: KERNEL PULSE */}
                <div className="flex-1 flex justify-start w-full lg:w-auto">
                    <div className="flex items-center gap-4 self-start lg:self-auto">
                        <div className="flex items-center gap-2">
                            <Activity size={14} className="text-[#ff006e] animate-pulse" />
                            <div className="text-[#ff006e] text-[10px] font-black tracking-widest opacity-70">
                                {t('KERNEL_PULSE')}: <span className="text-green-500">{t('SYNC_OK')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTER: SEARCH */}
                <div className="w-full lg:w-[450px] flex justify-center relative">
                    {isMobile && mobileViewMode !== 'search' && !searchQuery ? (
                        <button
                            onClick={() => setMobileViewMode('search')}
                            className="p-2 text-[#ff006e] hover:text-white transition-colors self-center lg:hidden"
                        >
                            <Search size={20} />
                        </button>
                    ) : (
                        <div className="relative group w-full">
                            <div
                                className="absolute -inset-1 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200"
                                style={{ backgroundColor: activeSectorColor || '#ff006e', opacity: activeSectorColor ? 0.3 : 0 }}
                            ></div>
                            <div className="relative flex items-center">
                                <div className="absolute left-3 flex items-center pointer-events-none">
                                    <Search
                                        size={16}
                                        className="group-focus-within:opacity-100 transition-opacity"
                                        style={{ color: activeSectorColor || '#ff006e', opacity: activeSector ? 1 : 0.4 }}
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('SEARCH_SIGNAL')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                    className="w-full bg-black/60 border rounded px-10 py-2.5 text-xs tracking-[0.2em] focus:outline-none focus:ring-1 transition-all placeholder:text-[#ff006e]/20"
                                    style={{
                                        borderColor: activeSectorColor ? `${activeSectorColor}99` : 'rgba(255,0,110,0.3)',
                                        focusBorderColor: activeSectorColor || '#ff006e',
                                        color: activeSectorColor || 'white',
                                        '--tw-ring-color': activeSectorColor ? `${activeSectorColor}33` : 'rgba(255,0,110,0.2)'
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        onTouchStart={(e) => { e.stopPropagation(); setSearchQuery(''); }}
                                        onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }}
                                        className="absolute right-3 text-white/20 hover:text-white transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: DATE / LOCATION */}
                <div className="flex-1 hidden lg:flex items-center justify-end gap-6 text-[10px] text-white/40 tracking-tighter">
                    <div className="hidden xl:flex items-center gap-2">
                        <span className="opacity-30">{t('LOC')}:</span>
                        <span
                            className="transition-all duration-500 font-black tracking-widest"
                            style={{ color: activeSectorColor || '#ff006e' }}
                        >
                            {activeSector !== null ? SECTORS.find(s => s.id === activeSector)?.name : t('GLOBAL_SIGNAL')}
                        </span>
                    </div>
                    <div className="w-[1px] h-3 bg-white/10" />
                    <div className="tabular-nums">{new Date().toISOString().split('T')[0]}</div>
                </div>

                {/* MOBILE VIEW TOGGLE - BELOW SEARCH ON MOBILE */}
                {isMobile && (
                    <div
                        className="mt-4 flex bg-black/40 border border-[#ff006e]/20 rounded-sm p-1 gap-1 pointer-events-auto relative z-[90] w-full"
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchEnd={(e) => e.stopPropagation()}
                    >

                        <button
                            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setMobileViewMode('globe'); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileViewMode('globe'); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black tracking-widest transition-all ${mobileViewMode === 'globe' ? 'border border-[#ff006e] text-[#ff006e] shadow-[0_0_15px_rgba(255,0,110,0.3)]' : 'text-[#ff006e]/40 border border-transparent hover:bg-[#ff006e]/10'}`}
                        >
                            <Globe size={12} /> {t('GLOBE_SENSE')}
                        </button>
                        <button
                            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setMobileViewMode('data'); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileViewMode('data'); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black tracking-widest transition-all ${mobileViewMode === 'data' ? 'border border-[#ff006e] text-[#ff006e] shadow-[0_0_15px_rgba(255,0,110,0.3)]' : 'text-[#ff006e]/40 border border-transparent hover:bg-[#ff006e]/10'}`}
                        >
                            <Activity size={12} /> {t('DATA_STREAM')}
                        </button>
                    </div>
                )}

                {/* Small frequency indicator below switch/search */}
                {!isMobile && (
                    <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-[2px]">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{ height: [2, 8, 2, 4, 2] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.05 }}
                                className="w-[2px] transition-colors duration-500"
                                style={{ backgroundColor: activeSectorColor ? `${activeSectorColor}66` : 'rgba(255, 0, 110, 0.3)' }}
                            />
                        ))}
                    </div>
                )}
            </div>


            {/* --- MAIN DASHBOARD GRID --- */}
            <motion.div
                layout
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className={`flex-1 relative flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-6 gap-6 lg:gap-4 pointer-events-none mt-4 ${isPlayerActive ? 'pb-24 lg:pb-28' : 'pb-20 lg:pb-0'} min-h-0`}
                style={{ gridTemplateRows: 'repeat(6, 1fr)' }}
            >

                {/* --- CENTER: THE GLOBE OR COMMUNITY TERMINAL --- */}
                {(!isMobile || mobileViewMode === 'globe') && (
                    <div className={`${isMobile ? 'flex-1' : 'h-[400px] lg:h-full'} lg:col-span-6 lg:row-span-4 lg:col-start-4 lg:row-start-1 pointer-events-auto flex items-center justify-center relative transition-all duration-300`}>
                        {isPinterestView ? (
                            <div className="w-full h-full bg-black/90 backdrop-blur-xl border border-white/10 p-6 pt-20 overflow-y-auto no-scrollbar animate-in fade-in duration-500 pointer-events-auto">
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ff006e] mb-6 border-b border-[#ff006e]/20 pb-2">SEÑALES_DESCUBIERTAS</div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    {/* Playlists */}
                                    {trendingPlaylists.slice(0, 4).map(p => (
                                        <div key={p.id || p.Id} className="aspect-square bg-black border border-white/5 hover:border-[#ff006e]/40 group cursor-pointer transition-all flex flex-col justify-between p-4 relative overflow-hidden" onClick={() => onPlayTrack(p)}>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                            <div className="text-[8px] font-mono text-[#ff006e] uppercase tracking-widest">PLAYLIST</div>
                                            <div className="z-10">
                                                <div className="text-xs font-black truncate group-hover:text-[#ff006e] uppercase">{p.name || p.Name}</div>
                                                <div className="text-[8px] opacity-40 uppercase mt-0.5">BY {p.userName || "UNKNOWN"}</div>
                                            </div>
                                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Play size={16} fill="#ff006e" className="text-[#ff006e]" />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Tracks */}
                                    {trendingTracks.slice(0, 6).map(t => (
                                        <div key={t.id} className="aspect-square bg-black border border-white/5 hover:border-[#ff006e]/40 group cursor-pointer transition-all flex flex-col justify-between p-4 relative overflow-hidden" onClick={() => onPlayTrack(t)}>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                            <div className="absolute inset-0">
                                                <img src={getMediaUrl(t.imageUrl || t.ImageUrl || t.coverImageUrl || t.CoverImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700" />
                                            </div>
                                            <div className="text-[8px] font-mono text-[#00ffff] uppercase tracking-widest z-10">CANCIÓN</div>
                                            <div className="z-10">
                                                <div className="text-xs font-black truncate group-hover:text-[#ff006e] uppercase">{t.title}</div>
                                                <div className="text-[8px] opacity-40 uppercase mt-0.5">BY {t.artist}</div>
                                            </div>
                                            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Play size={16} fill="#ff006e" className="text-[#ff006e]" />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Artists */}
                                    {trendingArtists.slice(0, 4).map(a => (
                                        <div key={a.id} className="aspect-square bg-black border border-white/5 hover:border-[#ff006e]/40 group cursor-pointer transition-all flex flex-col justify-between p-4 relative overflow-hidden" onClick={() => navigateToProfile(a.userId)}>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                            <div className="absolute inset-0">
                                                <img src={getMediaUrl(a.profilePicture || a.ProfilePicture || a.imageUrl || a.ImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700" />
                                            </div>
                                            <div className="text-[8px] font-mono text-[#9d00ff] uppercase tracking-widest z-10">ARTISTA</div>
                                            <div className="z-10">
                                                <div className="text-xs font-black truncate group-hover:text-[#ff006e] uppercase">{a.name}</div>
                                                <div className="text-[8px] opacity-40 uppercase mt-0.5">{a.genre || "NATIVE"}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={`w-full h-full ${activeTerminalCommunity ? 'hidden' : 'flex'} items-center justify-center p-4 transition-all duration-300`}>
                                <InteractiveGlobe
                                    searchQuery={searchQuery}
                                    communities={communities}
                                    artists={artistsForGlobe}
                                    tracks={tracksWithColor}
                                    playlists={trendingPlaylists}
                                    albums={albums}
                                    activeSector={activeSector}
                                    selectedId={selectedGlobeItem ? (selectedGlobeItem.isSystem ? 'system-fatale_core' : `${selectedGlobeItem.type}-${selectedGlobeItem.id || selectedGlobeItem.Id}`) : (activeTerminalCommunity?.isSystem ? 'system-fatale_core' : null)}
                                    activeView={activeGlobeView}
                                    isGlobeSpinning={isGlobeSpinning}
                                    onSectorClick={(secId) => {
                                        setActiveSector(activeSector === secId ? null : secId);
                                    }}
                                    onArtistClick={(artist) => {
                                        const prevId = selectedGlobeItem?.id || selectedGlobeItem?.Id;
                                        const currId = artist.id || artist.Id;
                                        if (prevId === currId) {
                                            setSelectedGlobeItem(null);
                                        } else {
                                            setSelectedGlobeItem({ ...artist, type: 'artist' });
                                        }
                                    }}
                                    onCommunityClick={(comm) => {
                                        // System nodes open the terminal directly
                                        if (comm.isSystem) {
                                            setActiveTerminalCommunity({ ...comm, type: 'community' });
                                            return;
                                        }
                                        const prevId = selectedGlobeItem?.id || selectedGlobeItem?.Id;
                                        const currId = comm.id || comm.Id;
                                        if (prevId === currId) {
                                            setSelectedGlobeItem(null);
                                        } else {
                                            setSelectedGlobeItem({ ...comm, type: 'community' });
                                        }
                                    }}
                                    onTrackClick={(track) => {
                                        const prevId = selectedGlobeItem?.id || selectedGlobeItem?.Id;
                                        const currId = track.id || track.Id;
                                        if (prevId === currId) {
                                            setSelectedGlobeItem(null);
                                        } else {
                                            setSelectedGlobeItem({ ...track, type: 'track' });
                                        }
                                    }}
                                    onSelectItem={(id) => {
                                        if (id === null) setSelectedGlobeItem(null);
                                    }}
                                />
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {activeTerminalCommunity && (
                                <motion.div
                                    key="terminal-view"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="absolute inset-0 z-10"
                                >
                                    <CommunityTerminal
                                        community={activeTerminalCommunity}
                                        user={user}
                                        followedCommunities={followedCommunities}
                                        onFollowUpdate={onFollowUpdate}
                                        setUser={setUser}
                                        onBack={() => setActiveTerminalCommunity(null)}
                                        sectorColor={activeSectorColor}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Globe Detail Card - Premium Glassmorphism */}
                        <AnimatePresence>
                            {selectedGlobeItem && !activeTerminalCommunity && (
                                <motion.div
                                    initial={isMobile ? { y: "100%" } : { y: 300, opacity: 0 }}
                                    animate={isMobile ? { y: 0 } : { y: 0, opacity: 1 }}
                                    exit={isMobile ? { y: "100%" } : { y: 300, opacity: 0 }}
                                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                    className={`absolute z-50 pointer-events-auto ${isMobile ? 'bottom-0 left-0 right-0' : 'bottom-4 left-4 right-4'}`}
                                >
                                    <div className={`bg-black/95 backdrop-blur-3xl border-t border-x border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.9)] overflow-hidden relative group mx-auto ${isMobile ? 'rounded-t-[32px] p-5 pb-10' : `border px-6 py-4 shadow-[0_0_80px_rgba(0,0,0,0.9)] ${selectedGlobeItem.type === 'track' ? 'max-w-md' : 'max-w-4xl'}`}`}>
                                        {/* Mobile Swipe Handle */}
                                        {isMobile && (
                                            <div className="flex justify-center mb-3">
                                                <div className="w-12 h-1 bg-white/10 rounded-full" />
                                            </div>
                                        )}

                                        {/* Corner Brackets (Desktop Only for clarity) */}
                                        {!isMobile && (
                                            <>
                                                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#ff006e]/30 group-hover:border-[#ff006e]/60 transition-colors" />
                                                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#ff006e]/30 group-hover:border-[#ff006e]/60 transition-colors" />
                                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#ff006e]/30 group-hover:border-[#ff006e]/60 transition-colors" />
                                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#ff006e]/30 group-hover:border-[#ff006e]/60 transition-colors" />
                                            </>
                                        )}

                                        <div className={`relative z-10 grid grid-cols-1 gap-4 items-center ${selectedGlobeItem.type === 'track' ? '' : 'md:grid-cols-12'}`}>
                                            {/* Header Section */}
                                            <div className={`${selectedGlobeItem.type === 'track' ? 'md:col-span-1 text-center' : 'md:col-span-5 border-r border-white/5 pr-6'}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-16 h-16 rounded-sm bg-black border border-white/10 overflow-hidden shrink-0 shadow-2xl relative">
                                                                <img
                                                                    src={getMediaUrl(selectedGlobeItem.profilePicture || selectedGlobeItem.ProfilePicture || selectedGlobeItem.imageUrl || selectedGlobeItem.ImageUrl || selectedGlobeItem.coverImageUrl || selectedGlobeItem.CoverImageUrl)}
                                                                    alt=""
                                                                    className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                                                />
                                                                <div className="absolute inset-0 border border-white/5 pointer-events-none" />
                                                            </div>
                                                            <div className={`truncate flex flex-col justify-center ${selectedGlobeItem.type === 'track' && 'items-center text-center'}`}>
                                                                <div className="text-[16px] font-black tracking-tight text-white uppercase leading-none truncate">
                                                                    {selectedGlobeItem.name || selectedGlobeItem.title || selectedGlobeItem.Title}
                                                                </div>
                                                                {selectedGlobeItem.type === 'track' && (
                                                                    <div className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase mt-1">
                                                                        {selectedGlobeItem.artist || selectedGlobeItem.artistName || selectedGlobeItem.ArtistName || 'UNKNOWN_ARTIST'}
                                                                    </div>
                                                                )}
                                                                <div className="text-[8px] text-[#ff006e] font-bold tracking-[0.4em] uppercase mt-1.5 flex items-center gap-2 whitespace-nowrap">
                                                                    <Activity size={10} />
                                                                    <span className="leading-none">
                                                                        {selectedGlobeItem.type === 'track' ? 'SIGNAL_BROADCAST_v2' :
                                                                            selectedGlobeItem.type === 'community' ? 'NEURAL_CLUSTER' :
                                                                                'ARTIST_IDENTITY'}
                                                                    </span>
                                                                </div>
                                                                {/* Cool Info */}
                                                                {selectedGlobeItem.type === 'community' && (
                                                                    <div className="text-[8px] text-[#00ffff] font-bold mt-1 uppercase tracking-widest">
                                                                        POPULATION: {selectedGlobeItem.memberCount || 0} _UNITS
                                                                    </div>
                                                                )}
                                                                {selectedGlobeItem.type === 'artist' && (
                                                                    <div className="text-[8px] text-[#00ffff] font-bold mt-1 uppercase tracking-widest">
                                                                        GENRE: {(selectedGlobeItem.genre || "NATIVE").toUpperCase()}
                                                                    </div>
                                                                )}
                                                                {selectedGlobeItem.type === 'track' && (
                                                                    <div className="text-[8px] text-[#00ffff] font-bold mt-1 uppercase tracking-widest">
                                                                        STATUS: STREAMING_ACTIVE
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedGlobeItem(null); }}
                                                        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedGlobeItem(null); }}
                                                        className="p-2 text-white/20 hover:text-white transition-all scale-125 cursor-pointer relative z-[100]"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    {selectedGlobeItem.type === 'artist' && (
                                                        <button
                                                            onClick={() => navigateToProfile(selectedGlobeItem.userId || selectedGlobeItem.UserId)}
                                                            className="w-full bg-transparent border border-white/20 text-white/80 hover:border-white hover:text-white py-2.5 text-[10px] font-black tracking-[0.3em] uppercase transition-all relative group/btn"
                                                        >
                                                            <div className="absolute inset-0 border border-white/5 transform scale-95 group-hover/btn:scale-100 transition-transform pointer-events-none" />
                                                            {t('VISIT_IDENTITY')}
                                                        </button>
                                                    )}
                                                    {selectedGlobeItem.type === 'community' && (
                                                        <button
                                                            onClick={() => setActiveTerminalCommunity(selectedGlobeItem)}
                                                            className="w-full bg-transparent border border-white/20 text-white/80 hover:border-white hover:text-white py-2.5 text-[10px] font-black tracking-[0.3em] uppercase transition-all relative group/btn"
                                                        >
                                                            <div className="absolute inset-0 border border-white/5 transform scale-95 group-hover/btn:scale-100 transition-transform pointer-events-none" />
                                                            {t('ENTER_PORTAL')}
                                                        </button>
                                                    )}
                                                    {selectedGlobeItem.type === 'track' && (
                                                        <button
                                                            onClick={() => { onPlayTrack(selectedGlobeItem); setSelectedGlobeItem(null); }}
                                                            className="w-full bg-transparent border border-[#ff006e]/60 text-[#ff006e] hover:bg-[#ff006e]/10 py-2.5 text-[10px] font-black tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-3 relative group/btn"
                                                        >
                                                            <div className="absolute inset-0 border border-[#ff006e]/20 transform scale-95 group-hover/btn:scale-100 transition-transform pointer-events-none" />
                                                            <Play size={12} fill="currentColor" /> {t('PLAY_TRACK')}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Dynamic Membership / Signal Section - Only for Hubs and Artists */}
                                            {selectedGlobeItem.type !== 'track' && (
                                                <div className="md:col-span-7">
                                                    <div className="text-[8px] text-white/40 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        {selectedGlobeItem.type === 'community' ? (
                                                            <><Users size={10} /> {t('ARTIST_MEMBERS')}</>
                                                        ) : (
                                                            <><Zap size={10} /> {t('SIGNAL_SHARES')}</>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                                                        {selectedGlobeItem.type === 'community' ? (
                                                            // COMMUNITY: Show Member Artists
                                                            trendingArtists.filter(a => String(a.communityId || a.CommunityId) === String(selectedGlobeItem.id)).slice(0, 8).map((a, i) => (
                                                                <div key={i} className="flex flex-col items-center gap-2 shrink-0 group/member cursor-pointer" onClick={() => navigateToProfile(a.userId || a.UserId)}>
                                                                    <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden group-hover/member:border-[#ff006e] transition-colors bg-white/5">
                                                                        <img src={getMediaUrl(a.profilePicture || a.ProfilePicture || a.imageUrl || a.ImageUrl)} alt="" className="w-full h-full object-cover grayscale group-hover/member:grayscale-0 transition-all" />
                                                                    </div>
                                                                    <span className="text-[7px] font-bold text-white/60 tracking-wider uppercase group-hover/member:text-white">{a.name || a.Name}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            // ARTIST: Show Signal Previews
                                                            visualUploads.filter(v => {
                                                                const artistId = selectedGlobeItem.type === 'track'
                                                                    ? (selectedGlobeItem.artistId || selectedGlobeItem.ArtistId)
                                                                    : (selectedGlobeItem.userId || selectedGlobeItem.UserId || selectedGlobeItem.id || selectedGlobeItem.Id);

                                                                const uploadArtistId = v.userId || v.UserId || v.artistId || v.ArtistId;

                                                                const artistName = (selectedGlobeItem.type === 'track'
                                                                    ? (selectedGlobeItem.artist || selectedGlobeItem.artistName)
                                                                    : (selectedGlobeItem.name || selectedGlobeItem.Name)) || '';

                                                                const uploadArtistName = (v.artist || v.Artist || '').toLowerCase();

                                                                // Strict matching: If names are present and different, don't show
                                                                if (artistName && uploadArtistName && artistName.toLowerCase() !== uploadArtistName) return false;

                                                                return (String(uploadArtistId) === String(artistId)) || (artistName && artistName.toLowerCase() === uploadArtistName);
                                                            }).slice(0, 5).map((v, i) => (
                                                                <div key={i} className="w-32 h-20 bg-black border border-white/10 shrink-0 relative group/img overflow-hidden rounded-sm">
                                                                    <img src={resolveThumbnail(v)} alt="" className="w-full h-full object-cover opacity-60 group-hover/img:opacity-100 transition-opacity" />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60" />
                                                                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                                                                        <span className="text-[7px] font-black truncate uppercase leading-none">{v.title}</span>
                                                                        <div className="p-1 bg-white/10 rounded-full"><Camera size={8} /></div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}

                                                        {/* Edge Case Fallbacks */}
                                                        {selectedGlobeItem.type === 'community' && trendingArtists.filter(a => String(a.communityId || a.CommunityId) === String(selectedGlobeItem.id)).length === 0 && (
                                                            <div className="text-[9px] text-white/10 font-bold tracking-[0.2em] italic uppercase py-6">{t('NO_SIGNALS_DETECTED')}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Globe Controls - Premium Mirror Layout */}
                        {!activeTerminalCommunity && (
                            <>
                                <div className="absolute top-10 left-4 z-50 scale-75 lg:scale-100 flex flex-col gap-2">
                                    {!isPinterestView && (
                                        <button
                                            onClick={() => setIsGlobeSpinning(!isGlobeSpinning)}
                                            className={`flex items-center justify-center w-10 h-10 rounded-sm border transition-all duration-300 ${isGlobeSpinning ? 'bg-[#00ffff]/10 border-[#00ffff] text-[#00ffff]' : 'bg-black/40 border-white/5 text-white/40'}`}
                                            title={isGlobeSpinning ? t('PAUSE_SPIN') : t('START_SPIN')}
                                        >
                                            {isGlobeSpinning ? <Pause size={14} /> : <Play size={14} />}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsPinterestView(!isPinterestView)}
                                        className={`flex items-center justify-center w-10 h-10 rounded-sm border transition-all duration-300 ${isPinterestView ? 'bg-[#ff006e]/10 border-[#ff006e] text-[#ff006e]' : 'bg-black/40 border-white/5 text-white/40'}`}
                                        title={isPinterestView ? "View 3D Map" : "View Grid"}
                                    >
                                        {isPinterestView ? <Globe size={14} /> : <Grid size={14} />}
                                    </button>
                                </div>

                                {!isPinterestView && (
                                    <div className="absolute top-10 right-4 flex flex-col gap-3 z-50 scale-95 lg:scale-100">

                                        {[
                                            { id: 'ARTISTS', icon: <User size={12} />, label: 'Artistas', desc: 'Filtrar Artistas' },
                                            { id: 'COMMUNITIES', icon: <Globe size={12} />, label: 'Comunidades', desc: 'Filtrar Comunidades' },
                                            { id: 'PLAYLISTS', icon: <Music size={12} />, label: 'Playlists', desc: 'Filtrar Playlists' },
                                            { id: 'TRACKS', icon: <Play size={12} />, label: 'Canciones', desc: 'Filtrar Canciones' }
                                        ].map(v => (
                                            <button
                                                key={v.id}
                                                onClick={() => setActiveGlobeView(activeGlobeView === v.id ? null : v.id)}
                                                className={`flex flex-col items-end gap-1 px-3 py-2 rounded-sm border transition-all duration-300 group ${activeGlobeView === v.id ? 'bg-[#ff006e]/10 border-[#ff006e] text-[#ff006e] shadow-[0_0_15px_rgba(255,0,110,0.2)]' : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20 hover:text-white'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {v.icon}
                                                    <span className={`text-[10px] font-black tracking-[0.2em] transition-all uppercase ${activeGlobeView === v.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto overflow-hidden'}`}>{v.label}</span>
                                                </div>
                                                {activeGlobeView === v.id && (
                                                    <div className="text-[6px] opacity-60 font-bold tracking-tighter uppercase">{v.desc}</div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}



                    </div>
                )}

                {/* --- LEFT COLUMN: AUDIO & ARTISTS --- */}
                {!isMobile && (
                    <>
                        <div className="col-span-3 row-span-2 col-start-1 row-start-1 pointer-events-auto">
                            <HUDWidget title={t('YT_FREQ_SCAN')} icon={<Search size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="space-y-4">
                                    {youtubeResults.length > 0 ? youtubeResults.map(y => (
                                        <div key={y.id} className="flex items-center gap-4 p-2.5 hover:bg-[#ff006e]/10 border border-transparent hover:border-[#ff006e]/20 group cursor-pointer transition-all" onClick={() => {
                                            onPlayTrack(y);
                                            // Save to local storage history
                                            try {
                                                const history = JSON.parse(localStorage.getItem('recent_youtube_tracks') || '[]');
                                                // Remove if already exists
                                                const filtered = history.filter(item => item.id !== y.id);
                                                // Add to front
                                                filtered.unshift({
                                                    id: y.id,
                                                    title: y.title,
                                                    author: y.author || "Unknown",
                                                    artist: y.artist || y.author || "Unknown",
                                                    thumbnailUrl: y.thumbnailUrl,
                                                    cover: y.cover || y.thumbnailUrl,
                                                    imageUrl: y.imageUrl || y.thumbnailUrl,
                                                    coverImageUrl: y.coverImageUrl || y.thumbnailUrl,
                                                    source: y.source
                                                });
                                                // Keep only last 10
                                                localStorage.setItem('recent_youtube_tracks', JSON.stringify(filtered.slice(0, 10)));
                                                // Update state
                                                setRecentYoutubeTracks(filtered.slice(0, 10));
                                            } catch (err) {
                                                console.error("Failed to save to local storage:", err);
                                            }
                                        }}>
                                            <div className="w-12 h-12 bg-black overflow-hidden relative border border-white/5 group-hover:border-[#ff006e]/40 shadow-lg">
                                                <img
                                                    src={y.thumbnailUrl || y.ThumbnailUrl || y.coverImageUrl || y.CoverImageUrl || (y.id ? `https://img.youtube.com/vi/${y.id}/hqdefault.jpg` : null)}
                                                    alt=""
                                                    className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                                />
                                                <div className="absolute inset-0 bg-[#ff006e]/10 mix-blend-overlay group-hover:opacity-0" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-black truncate group-hover:text-[#ff006e] transition-colors uppercase tracking-tight">{y.title}</div>
                                                <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">{y.author}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Play size={10} className="text-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <TrackActionsDropdown
                                                        track={{ ...y, category: 'YouTube' }}
                                                        playlists={userPlaylists}
                                                        onRefreshPlaylists={async () => {
                                                            if (user && (user.id || user.Id)) {
                                                                try {
                                                                    const res = await API.Playlists.getUserPlaylists(user.id || user.Id);
                                                                    setUserPlaylists(res.data || []);
                                                                } catch (err) {
                                                                    console.error("Failed to fetch user playlists:", err);
                                                                }
                                                            }
                                                        }}
                                                        onLike={(track) => {
                                                            try {
                                                                const likes = JSON.parse(localStorage.getItem('liked_youtube_tracks') || '[]');
                                                                const isLiked = likes.some(l => l.id === track.id);
                                                                let newLikes = [];
                                                                if (isLiked) {
                                                                    newLikes = likes.filter(l => l.id !== track.id);
                                                                } else {
                                                                    newLikes = [...likes, track];
                                                                }
                                                                localStorage.setItem('liked_youtube_tracks', JSON.stringify(newLikes));
                                                            } catch (err) {
                                                                console.error("Failed to save likes:", err);
                                                            }
                                                        }}
                                                        isLikedInitial={(() => {
                                                            try {
                                                                const likes = JSON.parse(localStorage.getItem('liked_youtube_tracks') || '[]');
                                                                return likes.some(l => l.id === y.id);
                                                            } catch { return false; }
                                                        })()}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )) : recentYoutubeTracks && recentYoutubeTracks.length > 0 ? (
                                        <div className="space-y-2">
                                            <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2">CACHÉ_YOUTUBE</div>
                                            {recentYoutubeTracks.map(y => (
                                                <div key={y.id} className="flex items-center gap-4 p-2.5 hover:bg-[#ff006e]/10 border border-transparent hover:border-[#ff006e]/20 group cursor-pointer transition-all" onClick={() => {
                                                    onPlayTrack(y);
                                                }}>
                                                    <div className="w-10 h-10 bg-black overflow-hidden relative border border-white/5 group-hover:border-[#ff006e]/40 shadow-lg">
                                                        <img
                                                            src={y.thumbnailUrl || `https://img.youtube.com/vi/${y.id}/hqdefault.jpg`}
                                                            alt=""
                                                            className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-[#ff006e] transition-colors uppercase tracking-tight">{y.title}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">{y.author}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Play size={10} className="text-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <TrackActionsDropdown
                                                                track={{ ...y, category: 'YouTube' }}
                                                                playlists={userPlaylists}
                                                                onRefreshPlaylists={async () => {
                                                                    if (user && (user.id || user.Id)) {
                                                                        try {
                                                                            const res = await API.Playlists.getUserPlaylists(user.id || user.Id);
                                                                            setUserPlaylists(res.data || []);
                                                                        } catch (err) {
                                                                            console.error("Failed to fetch user playlists:", err);
                                                                        }
                                                                    }
                                                                }}
                                                                onLike={(track) => {
                                                                    try {
                                                                        const likes = JSON.parse(localStorage.getItem('liked_youtube_tracks') || '[]');
                                                                        const isLiked = likes.some(l => l.id === track.id);
                                                                        let newLikes = [];
                                                                        if (isLiked) {
                                                                            newLikes = likes.filter(l => l.id !== track.id);
                                                                        } else {
                                                                            newLikes = [...likes, track];
                                                                        }
                                                                        localStorage.setItem('liked_youtube_tracks', JSON.stringify(newLikes));
                                                                    } catch (err) {
                                                                        console.error("Failed to save likes:", err);
                                                                    }
                                                                }}
                                                                isLikedInitial={(() => {
                                                                    try {
                                                                        const likes = JSON.parse(localStorage.getItem('liked_youtube_tracks') || '[]');
                                                                        return likes.some(l => l.id === y.id);
                                                                    } catch { return false; }
                                                                })()}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : recentYoutubeSearches.length > 0 ? (
                                        <div className="space-y-2">
                                            <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2">BÚSQUEDAS_RECIENTES</div>
                                            {recentYoutubeSearches.map(s => (
                                                <div key={s} className="flex items-center gap-4 p-2.5 hover:bg-[#ff006e]/10 border border-transparent hover:border-[#ff006e]/20 group cursor-pointer transition-all" onClick={() => setSearchQuery(s)}>
                                                    <Search size={10} className="text-white/40 group-hover:text-[#ff006e]" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-[#ff006e] transition-colors uppercase tracking-tight">{s}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full opacity-40 py-10 text-center px-4 group">
                                            <div className="w-8 h-8 border border-white/20 rounded-full flex items-center justify-center mb-3 group-hover:border-[#ff006e] group-hover:text-[#ff006e] transition-all animate-pulse">
                                                <Search size={14} />
                                            </div>
                                            <div className="text-[10px] font-black tracking-widest uppercase mb-1">RADAR_YOUTUBE_ESPERANDO</div>
                                            <div className="text-[7px] tracking-[0.2em] uppercase opacity-60">INGRESA UNA FRECUENCIA EN LA BARRA SUPERIOR PARA INTERCEPTAR SEÑALES</div>
                                        </div>
                                    )}
                                </div>
                            </HUDWidget>
                        </div>


                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-1 lg:row-start-3 pointer-events-auto">
                            <HUDWidget
                                title={selectedPlaylist ? `${t('DESC_PL')}: ${(selectedPlaylist.name || selectedPlaylist.Name || '').toUpperCase()}` : "[ PLAYLISTS ]"}
                                icon={selectedPlaylist ? <ChevronLeft size={14} className="cursor-pointer hover:text-white transition-colors" onClick={() => setSelectedPlaylist(null)} /> : <Music size={14} />}
                                searchQuery={searchQuery}
                                activeColor={activeSectorColor}
                            >
                                {selectedPlaylist ? (
                                    loadingPlaylist ? (
                                        <div className="text-[8px] opacity-40 text-center py-4">LOADING...</div>
                                    ) : (
                                        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                                            {playlistTracks.length > 0 ? playlistTracks.map(t => (
                                                <div key={t.id} className="flex items-center gap-3 p-2 hover:bg-[#ff006e]/10 cursor-pointer group" onClick={() => onPlayTrack(t)}>
                                                    <Play size={10} className="text-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-[#ff006e] uppercase">{t.title}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase">{t.artist}</div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-[8px] opacity-40 text-center py-4">NO_SIGNALS_FOUND</div>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="space-y-4 animate-in fade-in duration-500">
                                        {/* User Playlists */}
                                        <div>
                                            <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2">TUS_PLAYLISTS</div>
                                            {userPlaylists.length > 0 ? userPlaylists.map(p => (
                                                <div key={p.id || p.Id} className="flex items-center gap-3 p-2.5 hover:bg-[#ff006e]/10 border border-transparent hover:border-[#ff006e]/20 group cursor-pointer transition-all" onClick={async () => {
                                                    setSelectedPlaylist(p);
                                                    setLoadingPlaylist(true);
                                                    try {
                                                        const res = await API.Playlists.getById(p.id || p.Id);
                                                        setPlaylistTracks(res.data?.tracks || []);
                                                    } catch (err) {
                                                        console.error("Failed to fetch playlist tracks:", err);
                                                    } finally {
                                                        setLoadingPlaylist(false);
                                                    }
                                                }}>
                                                    <div className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center group-hover:border-[#ff006e]/40">
                                                        <Layers size={12} className="text-white/40 group-hover:text-[#ff006e]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-[#ff006e] transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">{p.tracks?.length || 0} SIGNALS</div>
                                                    </div>
                                                    <Play size={10} className="text-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )) : (
                                                <div className="text-[8px] opacity-30 px-2 py-1">NO_PLAYLISTS_CREATED</div>
                                            )}
                                        </div>

                                        {/* Recommended Playlists */}
                                        <div>
                                            <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2">RECOMENDADAS</div>
                                            {trendingPlaylists.length > 0 ? trendingPlaylists.map(p => (
                                                <div key={p.id || p.Id} className="flex items-center gap-3 p-2.5 hover:bg-[#ff006e]/10 border border-transparent hover:border-[#ff006e]/20 group cursor-pointer transition-all" onClick={async () => {
                                                    setSelectedPlaylist(p);
                                                    setLoadingPlaylist(true);
                                                    try {
                                                        const res = await API.Playlists.getById(p.id || p.Id);
                                                        setPlaylistTracks(res.data?.tracks || []);
                                                    } catch (err) {
                                                        console.error("Failed to fetch playlist tracks:", err);
                                                    } finally {
                                                        setLoadingPlaylist(false);
                                                    }
                                                }}>
                                                    <div className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center group-hover:border-[#ff006e]/40">
                                                        <Layers size={12} className="text-white/40 group-hover:text-[#ff006e]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-[#ff006e] transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">BY {p.userName || p.UserName || "UNKNOWN"}</div>
                                                    </div>
                                                    <Play size={10} className="text-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )) : (
                                                <div className="text-[8px] opacity-30 px-2 py-1">NO_RECOMMENDATIONS_AVAILABLE</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </HUDWidget>
                        </div>

                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-1 lg:row-start-5 pointer-events-auto">
                            <HUDWidget title={t('ARTIST_NODES')} icon={<User size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-2 pt-2">
                                    {filteredArtists.map(a => (
                                        <div key={a.id} className="flex flex-col items-center gap-3 group cursor-pointer" onClick={() => navigateToProfile(a.userId)}>
                                            <div className="relative w-14 h-14">
                                                {/* Radar Node Circle */}
                                                <div className="absolute inset-0 rounded-full border border-[#ff006e]/20 group-hover:border-[#ff006e]/60 transition-colors" />
                                                <div className="absolute inset-[-4px] rounded-full border border-dashed border-[#ff006e]/10 group-hover:ring-1 group-hover:ring-[#ff006e]/20 group-hover:animate-spin transition-all duration-[3000ms]" />

                                                <div className="absolute inset-[4px] rounded-full overflow-hidden border-2 border-black z-10 bg-black">
                                                    <img src={getMediaUrl(a.profilePicture || a.ProfilePicture || a.imageUrl || a.ImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all scale-110 group-hover:scale-100" />
                                                </div>

                                                {/* Scan sweep line */}
                                                <div className="absolute inset-0 z-20 pointer-events-none rounded-full bg-gradient-to-tr from-[#ff006e]/30 via-transparent to-transparent animate-spin opacity-0 group-hover:opacity-100" style={{ animationDuration: '2s' }} />
                                            </div>
                                            <span className="text-[8px] text-center truncate w-full uppercase font-black tracking-widest opacity-40 group-hover:opacity-100 group-hover:text-[#ff006e] transition-all">{a.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </HUDWidget>
                        </div>

                        {/* --- RIGHT COLUMN: PLAYLISTS, VISUALS, JOURNALS --- */}
                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-10 lg:row-start-1 pointer-events-auto">
                            <HUDWidget title="[ MARKETPLACE ]" icon={<Layers size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                {marketplaceItems.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-500">
                                        {marketplaceItems.map(item => (
                                            <div key={item.id || item.Id} className="relative aspect-square border border-white/5 group cursor-pointer overflow-hidden bg-black" onClick={() => {
                                                const desc = item.description || item.Description;
                                                if (desc && desc !== "#") {
                                                    window.open(desc, '_blank');
                                                }
                                            }}>
                                                {((item.type || item.Type) || '').toLowerCase() === 'video' ? (
                                                    <video src={getMediaUrl(item.url || item.Url)} className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" muted loop autoPlay playsInline />
                                                ) : (
                                                    <img src={getMediaUrl(item.url || item.Url)} alt="" className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                                <div className="absolute inset-0 border border-[#ff006e]/0 group-hover:border-[#ff006e]/40 transition-all" />

                                                {/* Tag / Label */}
                                                <div className="absolute top-2 left-2 z-10">
                                                    <span className="text-[7px] font-mono text-[#ff006e]/80 bg-black/80 px-1.5 py-0.5 border border-[#ff006e]/30 uppercase tracking-widest">OBJ_FOUND</span>
                                                </div>

                                                {/* Content Bar */}
                                                <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5 bg-black/70 p-2 backdrop-blur-sm border border-white/5 group-hover:border-[#ff006e]/20 transition-all">
                                                    <div className="text-[9px] font-black truncate group-hover:text-[#ff006e] uppercase tracking-tight text-white transition-colors">
                                                        {(item.description || item.Description) ? (item.description || item.Description) : ((item.title || item.Title) && !(item.title || item.Title).includes(' ') && (item.title || item.Title).length > 20 ? 'UNTITLED' : (item.title || item.Title))}
                                                    </div>
                                                    <div className="text-[7px] text-white/40 uppercase tracking-widest font-mono">
                                                        LOC: SEC_{hashStr(item.id || item.Id) % 99} // ID: {String(item.id || item.Id).substring(0, 6)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-20">
                                        <Layers size={16} className="mb-2" />
                                        <div className="text-[8px] tracking-widest uppercase text-center px-4">SIN_TIENDAS_DISPONIBLES</div>
                                    </div>
                                )}
                            </HUDWidget>
                        </div>

                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-10 lg:row-start-3 pointer-events-auto">
                            <HUDWidget title={<span className="cursor-pointer hover:text-[#ff006e] transition-colors" onClick={() => setView && setView('feed')}>{t('STUDIO_TRANS')}</span>} icon={<Camera size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                    {filteredVisuals.length > 0 ? filteredVisuals.map(vis => (
                                        <div
                                            key={vis.id}
                                            className="aspect-square bg-black border border-white/5 relative group cursor-pointer overflow-hidden hover:border-[#ff006e]/60 transition-all shadow-xl"
                                            onClick={() => onExpandContent(
                                                vis,
                                                (vis.mediaType || '').toLowerCase() === 'video' ? 'video' : 'photo',
                                                { themeColor: '#9d00ff', backgroundColor: '#000000' }
                                            )}
                                        >
                                            {(vis.mediaType || vis.MediaType || '').toLowerCase() === 'video' ? (
                                                <video src={getMediaUrl(vis.imageUrl || vis.ImageUrl)} className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" muted loop autoPlay playsInline />
                                            ) : (
                                                <img src={resolveThumbnail(vis)} alt="" className="w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-1000" />
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff006e] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                            {(vis.mediaType || vis.MediaType || '').toLowerCase() === 'video' && (
                                                <div className="absolute top-1 right-1">
                                                    <Play size={8} className="text-[#ff006e]" />
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <div
                                            onClick={() => setShowGlobalIngest && setShowGlobalIngest(true)}
                                            className="col-span-full border border-dashed border-white/20 p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#ff006e]/60 hover:bg-[#ff006e]/5 transition-all group"
                                        >
                                            <Camera size={20} className="opacity-40 group-hover:text-[#ff006e] group-hover:opacity-100 mb-2 transition-all" />
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 group-hover:text-[#ff006e] group-hover:opacity-100">SIN_TRANSMISIONES_VISUALES</span>
                                            <span className="text-[7px] uppercase tracking-[0.2em] opacity-40 mt-1">[ INICIAR_TRANSMISIÓN ]</span>
                                        </div>
                                    )}
                                </div>
                            </HUDWidget>
                        </div>

                        <div className="col-span-3 row-span-2 col-start-10 row-start-5 pointer-events-auto">
                            <HUDWidget title={t('FREQ_JOURNAL')} icon={<BookOpen size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="space-y-4">
                                    {filteredJournals.length > 0 ? filteredJournals.map(j => (
                                        <div
                                            key={j.id}
                                            className="border-l border-[#ff006e]/10 pl-4 py-2 relative group cursor-pointer hover:bg-white/[0.02] transition-all"
                                            onClick={() => onExpandContent(j, 'journal', { themeColor: '#9d00ff', backgroundColor: '#000000' })}
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-[#ff006e] scale-y-0 group-hover:scale-y-100 transition-transform" />
                                            <div className="text-[10px] font-black truncate group-hover:text-[#ff006e] transition-colors uppercase mb-1 tracking-tight">{j.title}</div>
                                            <div className="text-[8px] opacity-30 line-clamp-2 italic font-light leading-relaxed">{j.content?.substring(0, 80)}...</div>
                                            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="text-[7px] text-[#ff006e] font-black uppercase">{t('READ_SIGNAL')} {">"}{">"}</div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div
                                            onClick={() => { if (setIngestMode) setIngestMode('JOURNAL'); if (setShowGlobalIngest) setShowGlobalIngest(true); }}
                                            className="border-l-2 border-[#ff006e]/20 pl-4 py-4 cursor-pointer hover:border-[#ff006e] group transition-all"
                                        >
                                            <div className="text-[10px] font-black text-white/60 group-hover:text-white tracking-widest uppercase mb-1">BITÁCORA_VACÍA</div>
                                            <div className="text-[8px] opacity-40 group-hover:text-[#ff006e] transition-colors">[+] AÑADIR_NUEVA_ENTRADA</div>
                                        </div>
                                    )}
                                </div>
                            </HUDWidget>
                        </div>

                        {/* --- BOTTOM CENTER: MESSAGES --- */}
                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-4 lg:row-start-5 pointer-events-auto">
                            <HUDWidget title={t('MSG_SYNC')} icon={<MessageSquare size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="space-y-4">
                                    {conversations.length > 0 ? conversations.map(c => (
                                        <div key={c.conversationId || c.id} className="group cursor-pointer border-b border-white/5 pb-2 flex items-center gap-3" onClick={() => {
                                            navigateToProfile(c.userId || c.UserId, 'messages');
                                        }}>
                                            <div className="w-6 h-6 bg-black border border-white/10 rounded-full overflow-hidden shrink-0">
                                                <img src={getMediaUrl(c.profileImageUrl || c.ProfileImageUrl || c.profilePictureUrl || c.ProfilePictureUrl || c.imageUrl || c.ImageUrl)} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=USER'; }} alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <div className="text-[10px] font-black group-hover:text-[#ff006e] transition-colors uppercase tracking-tight truncate flex-1">{c.username || c.Username}</div>
                                                    {c.unreadCount > 0 && (
                                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#ff006e] animate-pulse" />
                                                            <span className="text-[7px] font-black text-[#ff006e]">{c.unreadCount} NEW</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-[8px] opacity-30 truncate uppercase tracking-widest">{c.lastMessage || 'No messages yet'}</div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex flex-col items-center justify-center py-6 opacity-20">
                                            <MessageSquare size={16} className="mb-2" />
                                            <div className="text-[8px] tracking-widest uppercase text-center px-4">{t('EMPTY') || 'NO_NEW_MESSAGES'}</div>
                                        </div>
                                    )}
                                </div>
                            </HUDWidget>
                        </div>

                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-7 lg:row-start-5 pointer-events-auto">
                            <HUDWidget title={t('SECTOR_CLIQUES')} icon={<Globe size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="space-y-4">
                                    {/* Create Clique Trigger */}
                                    <div
                                        onClick={() => {
                                            setIsFounding(!isFounding);
                                            setNewClanSector(activeSector);
                                        }}
                                        className="flex items-center gap-2 p-2 border border-dashed border-white/10 hover:border-white/30 cursor-pointer group transition-all"
                                    >
                                        <Zap size={10} className="text-[#ff006e] group-hover:animate-pulse" />
                                        <span className="text-[9px] font-black tracking-[0.2em] opacity-40 group-hover:opacity-100">{t('FOUND_CLIQUE')} [+]</span>
                                    </div>

                                    {isFounding && (
                                        <form onSubmit={handleFoundCommunity} className="p-3 bg-white/5 border border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1">
                                                <div className="text-[7px] opacity-40 mono">{t('NAME_REQUIRED')}</div>
                                                <input
                                                    value={newClanName}
                                                    onChange={(e) => setNewClanName(e.target.value)}
                                                    placeholder="..."
                                                    className="w-full bg-black/40 border border-white/10 p-1.5 text-[9px] mono outline-none focus:border-[#ff006e]/50"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[7px] opacity-40 mono">{t('SECTOR_ALLOCATION')}</div>
                                                <select
                                                    value={newClanSector !== null ? newClanSector : (activeSector !== null ? activeSector : 0)}
                                                    onChange={(e) => setNewClanSector(parseInt(e.target.value))}
                                                    className="w-full bg-black/40 border border-white/10 p-1.5 text-[9px] mono outline-none"
                                                >
                                                    {SECTORS.map(s => (
                                                        <option key={s.id} value={s.id} className="bg-black text-[9px]">{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={!newClanName.trim()}
                                                className="w-full bg-[#ff006e]/80 hover:bg-[#ff006e] text-white text-[8px] font-black py-1.5 rounded-sm transition-all disabled:opacity-20"
                                            >
                                                {t('ESTABLISH_SIGNAL')}
                                            </button>
                                        </form>
                                    )}

                                    <div className="space-y-3">
                                        {filteredCommunities.map(c => {
                                            const isJoined = (user?.communityId || user?.CommunityId) === c.id;
                                            return (
                                                <div key={c.id} className="flex items-center gap-3 p-2 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group cursor-pointer" onClick={() => {
                                                    if (isMobile) {
                                                        onMessageCommunity && onMessageCommunity(c);
                                                    } else {
                                                        setActiveTerminalCommunity(c);
                                                    }
                                                }}>
                                                    <div className="w-8 h-8 rounded-sm bg-[#ff006e]/10 border border-[#ff006e]/20 flex items-center justify-center shrink-0 relative overflow-hidden">
                                                        {(c.imageUrl || c.ImageUrl || c.profilePicture || c.ProfilePicture) ? (
                                                            <img src={getMediaUrl(c.imageUrl || c.ImageUrl || c.profilePicture || c.ProfilePicture)} alt="" className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                                                        ) : (
                                                            <Globe size={12} className="text-[#ff006e] opacity-40 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                        {(isJoined || followedCommunities.includes(c.id)) && (
                                                            <div className="absolute top-0.5 right-0.5">
                                                                <Star size={10} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[10px] font-black group-hover:text-[#ff006e] transition-colors uppercase tracking-tight truncate flex items-center gap-2">
                                                            {c.name}
                                                            {isJoined && <span className="text-[7px] text-yellow-400/60 mono font-normal border border-yellow-400/20 px-1">{t('HOME')}</span>}
                                                        </div>
                                                        <div className="text-[7px] opacity-30 tracking-[0.2em] font-light uppercase mt-0.5">{c.memberCount || 0} {t('CLIQUE_AGENTS')}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </HUDWidget>
                        </div>
                    </>
                )}

                {isMobile && mobileViewMode === 'search' && (
                    <div className="flex-1 pointer-events-auto flex flex-col p-4 bg-black/90 border border-[#ff006e]/20 rounded-sm mt-4 overflow-y-auto no-scrollbar">
                        {/* NATIVE RESULTS INTEGRATION */}
                        {searchQuery.length >= 2 && (
                            <div className="space-y-6 mb-8 border-b border-white/10 pb-6">
                                {/* Artists */}
                                {filteredArtists.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-[#00ffaa] mb-3 tracking-widest flex items-center justify-between">
                                            <span>:: ARTIST_NODES ::</span>
                                            <span className="text-[8px] opacity-60">{filteredArtists.length} FOUND</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {filteredArtists.slice(0, 4).map(a => (
                                                <div key={a.id} className="flex items-center gap-2 p-2 bg-[#00ffaa]/5 border border-[#00ffaa]/10 rounded-sm"
                                                    onTouchStart={(e) => e.stopPropagation()}
                                                    onClick={() => navigateToProfile(a.userId)}
                                                >
                                                    <div className="w-8 h-8 rounded-full border border-[#00ffaa]/30 overflow-hidden bg-black shrink-0">
                                                        <img src={getMediaUrl(a.profilePicture || a.ProfilePicture || a.imageUrl || a.ImageUrl)} className="w-full h-full object-cover grayscale" />
                                                    </div>
                                                    <div className="text-[8px] font-black uppercase truncate leading-none">{a.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Communities */}
                                {filteredCommunities.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-[#ffaa00] mb-3 tracking-widest flex items-center justify-between">
                                            <span>:: NEURAL_CLUSTERS ::</span>
                                            <span className="text-[8px] opacity-60">{filteredCommunities.length} FOUND</span>
                                        </div>
                                        <div className="space-y-2">
                                            {filteredCommunities.slice(0, 3).map(c => (
                                                <div key={c.id} className="flex items-center gap-3 p-2 bg-[#ffaa00]/5 border border-[#ffaa00]/10 rounded-sm"
                                                    onTouchStart={(e) => e.stopPropagation()}
                                                    onClick={() => {
                                                        if (onMessageCommunity) onMessageCommunity(c);
                                                        else setActiveTerminalCommunity(c);
                                                    }}
                                                >
                                                    <div className="w-6 h-6 rounded-sm bg-[#ffaa00]/10 border border-[#ffaa00]/30 flex items-center justify-center shrink-0">
                                                        <Globe size={10} className="text-[#ffaa00]" />
                                                    </div>
                                                    <div className="text-[9px] font-black uppercase truncate">{c.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {filteredArtists.length === 0 && filteredCommunities.length === 0 && (
                                    <div className="text-[8px] opacity-30 italic text-center py-2 uppercase tracking-widest">No native signals detected for this frequency</div>
                                )}
                            </div>
                        )}

                        <div className="text-[10px] font-black uppercase text-[#ff006e] mb-4 tracking-widest flex items-center justify-between">
                            <span>:: SEARCH_SIGNAL_DENSITY ::</span>
                            <span className="text-[8px] opacity-60">{youtubeResults.length} FOUND</span>
                        </div>
                        <div className="space-y-4 flex-1">
                            {youtubeResults.length > 0 ? (() => {
                                const uniqueAlbums = [];
                                const albumTracker = new Set();
                                youtubeResults.forEach(r => {
                                    const albName = r.originalTrack?.album || r.originalTrack?.Album || "Single Release";
                                    if (!albumTracker.has(albName.toLowerCase())) {
                                        albumTracker.add(albName.toLowerCase());
                                        uniqueAlbums.push({
                                            title: albName,
                                            artist: r.author,
                                            thumbnailUrl: r.thumbnailUrl
                                        });
                                    }
                                });

                                const uniqueArtists = [];
                                const artistTracker = new Set();
                                youtubeResults.forEach(r => {
                                    const artName = r.author || "Unknown";
                                    if (!artistTracker.has(artName.toLowerCase())) {
                                        artistTracker.add(artName.toLowerCase());
                                        uniqueArtists.push({
                                            name: artName,
                                            thumbnailUrl: r.thumbnailUrl
                                        });
                                    }
                                });

                                return (
                                    <>
                                        {/* Subtabs Filter Bar */}
                                        <div className="flex gap-1 border-b border-[#ff006e]/10 pb-2 overflow-x-auto scrollbar-none" onTouchStart={(e) => e.stopPropagation()}>
                                            {['ALL', 'SONGS', 'ALBUMS', 'ARTISTS'].map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setSelectedSearchCategory(cat)}
                                                    className={`text-[7px] font-black uppercase tracking-[0.1em] px-2 py-1 transition-all shrink-0 ${
                                                        selectedSearchCategory === cat 
                                                            ? 'bg-[#ff006e] text-black shadow-[0_0_10px_#ff006e]' 
                                                            : 'text-white/40 hover:text-white hover:bg-white/5 border border-white/5'
                                                    }`}
                                                >
                                                    {cat === 'ALL' ? 'TODO' : cat === 'SONGS' ? 'CANCIONES' : cat === 'ALBUMS' ? 'ÁLBUMES' : 'ARTISTAS'}
                                                </button>
                                            ))}
                                        </div>

                                        {/* TOP ARTIST PROFILE CARD */}
                                        {(selectedSearchCategory === 'ALL' || selectedSearchCategory === 'ARTISTS') && (() => {
                                            const topResult = youtubeResults[0];
                                            return (
                                                <div className="hud-panel p-3 border border-[#ff006e]/20 bg-black/60 relative overflow-hidden" onTouchStart={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <div className="w-12 h-12 rounded-full overflow-hidden border border-[#ff006e] shadow-[0_0_10px_#ff006e50] shrink-0 relative bg-black">
                                                            <img 
                                                                src={topResult.thumbnailUrl} 
                                                                className="w-full h-full object-cover"
                                                                alt=""
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-black text-white uppercase tracking-wider truncate">{topResult.author}</div>
                                                            <div className="text-[6px] font-bold text-[#ff006e] mono mt-0.5 tracking-widest uppercase">
                                                                NEURAL EMITTER ACTIVE
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 mt-3 relative z-10">
                                                        <button 
                                                            onClick={() => {
                                                                const artistTracks = youtubeResults.filter(t => t.author === topResult.author);
                                                                if (artistTracks.length > 0) {
                                                                    const randomTrack = artistTracks[Math.floor(Math.random() * artistTracks.length)];
                                                                    onPlayTrack(randomTrack);
                                                                    setMobileViewMode('globe');
                                                                }
                                                            }}
                                                            className="flex-1 bg-white text-black font-black text-[7px] py-1 px-2 transition-all uppercase tracking-widest flex items-center justify-center gap-1"
                                                        >
                                                            <Shuffle size={8} /> ALEATORIO
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                onPlayTrack(topResult);
                                                                setMobileViewMode('globe');
                                                            }}
                                                            className="flex-1 border border-white/20 text-white font-black text-[7px] py-1 px-2 transition-all uppercase tracking-widest flex items-center justify-center gap-1"
                                                        >
                                                            <Radio size={8} className="text-[#ff006e]" /> RADIO
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* SONGS SECTION */}
                                        {(selectedSearchCategory === 'ALL' || selectedSearchCategory === 'SONGS') && (
                                            <div className="space-y-2" onTouchStart={(e) => e.stopPropagation()}>
                                                {selectedSearchCategory === 'ALL' && (
                                                    <div className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em] mb-1 px-1">:: CANCIONES ::</div>
                                                )}
                                                {(selectedSearchCategory === 'SONGS' ? youtubeResults : youtubeResults.slice(0, 5)).map(y => (
                                                    <div key={y.id} className="flex items-center gap-3 p-2 hover:bg-[#ff006e]/10 border border-transparent hover:border-[#ff006e]/20 group cursor-pointer transition-all" onClick={() => {
                                                        onPlayTrack(y);
                                                        setMobileViewMode('globe');
                                                        try {
                                                            const history = JSON.parse(localStorage.getItem('recent_youtube_tracks') || '[]');
                                                            const filtered = history.filter(item => item.id !== y.id);
                                                            filtered.unshift({
                                                                id: y.id,
                                                                title: y.title,
                                                                author: y.author || "Unknown",
                                                                artist: y.artist || y.author || "Unknown",
                                                                thumbnailUrl: y.thumbnailUrl,
                                                                cover: y.cover || y.thumbnailUrl,
                                                                imageUrl: y.imageUrl || y.thumbnailUrl,
                                                                coverImageUrl: y.coverImageUrl || y.thumbnailUrl,
                                                                source: y.source
                                                            });
                                                            localStorage.setItem('recent_youtube_tracks', JSON.stringify(filtered.slice(0, 10)));
                                                            setRecentYoutubeTracks(filtered.slice(0, 10));
                                                        } catch (err) { console.error(err); }
                                                    }}>
                                                        <div className="w-10 h-10 bg-black overflow-hidden relative border border-white/5 shrink-0">
                                                             <img 
                                                                src={y.thumbnailUrl || `https://img.youtube.com/vi/${y.id}/hqdefault.jpg`} 
                                                                alt="" 
                                                                className="w-full h-full object-cover grayscale opacity-40" 
                                                              />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[9px] font-black truncate uppercase tracking-tight">{y.title}</div>
                                                            <div className="text-[7px] opacity-30 truncate uppercase font-bold tracking-wider mt-0.5">{y.author}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* ALBUMS SECTION */}
                                        {(selectedSearchCategory === 'ALL' || selectedSearchCategory === 'ALBUMS') && uniqueAlbums.length > 0 && (
                                            <div className="mt-3" onTouchStart={(e) => e.stopPropagation()}>
                                                {selectedSearchCategory === 'ALL' && (
                                                    <div className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 px-1">:: ÁLBUMES ::</div>
                                                )}
                                                <div className="grid grid-cols-2 gap-2">
                                                    {uniqueAlbums.map((a, idx) => (
                                                        <div key={idx} className="hud-panel p-1.5 border border-white/5 bg-black/40 hover:border-[#ff006e]/40 cursor-pointer group transition-all" onClick={() => {
                                                            const albumTrack = youtubeResults.find(t => (t.originalTrack?.album || t.originalTrack?.Album || "").toLowerCase() === a.title.toLowerCase());
                                                            if (albumTrack) {
                                                                onPlayTrack(albumTrack);
                                                                setMobileViewMode('globe');
                                                            }
                                                        }}>
                                                            <div className="aspect-square w-full bg-black overflow-hidden relative border border-white/5 mb-1">
                                                                <img 
                                                                    src={a.thumbnailUrl} 
                                                                    className="w-full h-full object-cover grayscale opacity-50"
                                                                    alt=""
                                                                />
                                                            </div>
                                                            <div className="text-[8px] font-black truncate uppercase tracking-wider">{a.title}</div>
                                                            <div className="text-[6px] opacity-40 truncate uppercase font-bold tracking-widest mt-0.5">{a.artist}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* ARTISTS SECTION */}
                                        {selectedSearchCategory === 'ARTISTS' && uniqueArtists.length > 0 && (
                                            <div className="space-y-2 mt-1" onTouchStart={(e) => e.stopPropagation()}>
                                                {uniqueArtists.map((art, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 p-2 hover:bg-[#ff006e]/10 border border-transparent hover:border-[#ff006e]/20 group cursor-pointer transition-all" onClick={() => {
                                                        const artistTrack = youtubeResults.find(t => t.author.toLowerCase() === art.name.toLowerCase());
                                                        if (artistTrack) {
                                                            onPlayTrack(artistTrack);
                                                            setMobileViewMode('globe');
                                                        }
                                                    }}>
                                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                                                            <img 
                                                                src={art.thumbnailUrl} 
                                                                className="w-full h-full object-cover" 
                                                                alt="" 
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[9px] font-black truncate uppercase tracking-tight">{art.name}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                );
                            })() : (
                                <div className="text-[8px] opacity-40 text-center py-4">SCANNING_FREQUENCIES...</div>
                            )}
                        </div>
                    </div>
                )}

                {isMobile && mobileViewMode === 'data' && (
                    <div className="flex flex-col gap-6 pointer-events-auto mt-4 overflow-y-auto no-scrollbar max-h-[70vh]">
                        <div className="space-y-2">
                            <div className="text-[10px] font-black tracking-[0.2em] uppercase text-[#ff006e] mb-2 px-1 flex items-center gap-2">
                                {selectedPlaylist ? <ChevronLeft size={14} className="cursor-pointer hover:text-white transition-colors" onClick={() => setSelectedPlaylist(null)} /> : <Music size={14} />}
                                {selectedPlaylist ? `${t('DESC_PL')}: ${(selectedPlaylist.name || selectedPlaylist.Name || '').toUpperCase()}` : "[ PLAYLISTS ]"}
                            </div>
                            <div className="space-y-2">
                                {selectedPlaylist ? (
                                    loadingPlaylist ? (
                                        <div className="text-[8px] opacity-40 text-center py-4">LOADING...</div>
                                    ) : (
                                        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                                            {playlistTracks.length > 0 ? playlistTracks.map(t => (
                                                <div key={t.id} className="flex items-center gap-3 p-2 hover:bg-[#ff006e]/10 cursor-pointer group" onClick={() => onPlayTrack(t)}>
                                                    <Play size={10} className="text-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-[#ff006e] uppercase">{t.title}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase">{t.artist}</div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-[8px] opacity-40 text-center py-4">NO_SIGNALS_FOUND</div>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="space-y-4 animate-in fade-in duration-500">
                                        {/* User Playlists */}
                                        <div>
                                            <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2">TUS_PLAYLISTS</div>
                                            {userPlaylists.length > 0 ? userPlaylists.map(p => (
                                                <div key={p.id || p.Id} className="flex items-center gap-3 p-2.5 hover:bg-[#ff006e]/10 border border-transparent hover:border-[#ff006e]/20 group cursor-pointer transition-all" onClick={async () => {
                                                    setSelectedPlaylist(p);
                                                    setLoadingPlaylist(true);
                                                    try {
                                                        const res = await API.Playlists.getById(p.id || p.Id);
                                                        setPlaylistTracks(res.data?.tracks || []);
                                                    } catch (err) {
                                                        console.error("Failed to fetch playlist tracks:", err);
                                                    } finally {
                                                        setLoadingPlaylist(false);
                                                    }
                                                }}>
                                                    <div className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center group-hover:border-[#ff006e]/40">
                                                        <Layers size={12} className="text-white/40 group-hover:text-[#ff006e]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-[#ff006e] transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">{p.tracks?.length || 0} SIGNALS</div>
                                                    </div>
                                                    <Play size={10} className="text-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )) : (
                                                <div className="text-[8px] opacity-30 px-2 py-1">NO_PLAYLISTS_CREATED</div>
                                            )}
                                        </div>

                                        {/* Recommended Playlists */}
                                        <div>
                                            <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2">RECOMENDADAS</div>
                                            {trendingPlaylists.length > 0 ? trendingPlaylists.map(p => (
                                                <div key={p.id || p.Id} className="flex items-center gap-3 p-2.5 hover:bg-[#ff006e]/10 border border-transparent hover:border-[#ff006e]/20 group cursor-pointer transition-all" onClick={async () => {
                                                    setSelectedPlaylist(p);
                                                    setLoadingPlaylist(true);
                                                    try {
                                                        const res = await API.Playlists.getById(p.id || p.Id);
                                                        setPlaylistTracks(res.data?.tracks || []);
                                                    } catch (err) {
                                                        console.error("Failed to fetch playlist tracks:", err);
                                                    } finally {
                                                        setLoadingPlaylist(false);
                                                    }
                                                }}>
                                                    <div className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center group-hover:border-[#ff006e]/40">
                                                        <Layers size={12} className="text-white/40 group-hover:text-[#ff006e]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-[#ff006e] transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">BY {p.userName || p.UserName || "UNKNOWN"}</div>
                                                    </div>
                                                    <Play size={10} className="text-[#ff006e] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )) : (
                                                <div className="text-[8px] opacity-30 px-2 py-1">NO_RECOMMENDATIONS_AVAILABLE</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Feed (Visuals) */}
                        <div className="space-y-2">
                            <div className="text-[10px] font-black tracking-[0.2em] uppercase text-[#ff006e] mb-2 px-1 flex items-center gap-2">
                                <Camera size={14} />
                                <span className="cursor-pointer hover:text-[#ff006e] transition-colors" onClick={() => setView && setView('feed')}>{t('STUDIO_TRANS')}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {/* New Post/Track Button */}
                                <div
                                    onClick={() => { if (setIngestMode) setIngestMode('ALL'); if (setShowGlobalIngest) setShowGlobalIngest(true); }}
                                    className="aspect-square border border-dashed border-[#ff006e]/40 flex flex-col items-center justify-center cursor-pointer hover:border-[#ff006e] hover:bg-[#ff006e]/5 transition-all group"
                                >
                                    <Plus size={16} className="text-[#ff006e] opacity-60 group-hover:opacity-100 mb-1 transition-all" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-[#ff006e] opacity-60 group-hover:opacity-100">PUBLICAR</span>
                                </div>

                                {filteredVisuals.length > 0 ? filteredVisuals.map(vis => (
                                    <div
                                        key={vis.id}
                                        className="aspect-square bg-black border border-white/5 relative group cursor-pointer overflow-hidden hover:border-[#ff006e]/60 transition-all shadow-xl"
                                        onClick={() => onExpandContent(
                                            vis,
                                            (vis.mediaType || '').toLowerCase() === 'video' ? 'video' : 'photo',
                                            { themeColor: '#9d00ff', backgroundColor: '#000000' }
                                        )}
                                    >
                                        {(vis.mediaType || vis.MediaType || '').toLowerCase() === 'video' ? (
                                            <video src={getMediaUrl(vis.imageUrl || vis.ImageUrl)} className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" muted loop autoPlay playsInline />
                                        ) : (
                                            <img src={resolveThumbnail(vis)} alt="" className="w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-1000" />
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff006e] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                        {(vis.mediaType || vis.MediaType || '').toLowerCase() === 'video' && (
                                            <div className="absolute top-1 right-1">
                                                <Play size={8} className="text-[#ff006e]" />
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div
                                        onClick={() => setShowGlobalIngest && setShowGlobalIngest(true)}
                                        className="col-span-full border border-dashed border-white/20 p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#ff006e]/60 hover:bg-[#ff006e]/5 transition-all group"
                                    >
                                        <Camera size={20} className="opacity-40 group-hover:text-[#ff006e] group-hover:opacity-100 mb-2 transition-all" />
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 group-hover:text-[#ff006e] group-hover:opacity-100">SIN_TRANSMISIONES_VISUALES</span>
                                        <span className="text-[7px] uppercase tracking-[0.2em] opacity-40 mt-1">[ INICIAR_TRANSMISIÓN ]</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Artists */}
                        <div className="space-y-2">
                            <div className="text-[10px] font-black tracking-[0.2em] uppercase text-[#ff006e] mb-2 px-1 flex items-center gap-2">
                                <User size={14} />
                                {t('ARTIST_NODES')}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-2 pt-2">
                                {filteredArtists.map(a => (
                                    <div key={a.id} className="flex flex-col items-center gap-3 group cursor-pointer" onClick={() => navigateToProfile(a.userId)}>
                                        <div className="relative w-14 h-14">
                                            <div className="absolute inset-0 rounded-full border border-[#ff006e]/20 group-hover:border-[#ff006e]/60 transition-colors" />
                                            <div className="absolute inset-[-4px] rounded-full border border-dashed border-[#ff006e]/10 group-hover:ring-1 group-hover:ring-[#ff006e]/20 group-hover:animate-spin transition-all duration-[3000ms]" />

                                            <div className="absolute inset-[4px] rounded-full overflow-hidden border-2 border-black z-10 bg-black">
                                                <img src={getMediaUrl(a.profilePicture || a.ProfilePicture || a.imageUrl || a.ImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all scale-110 group-hover:scale-100" />
                                            </div>

                                            <div className="absolute inset-0 z-20 pointer-events-none rounded-full bg-gradient-to-tr from-[#ff006e]/30 via-transparent to-transparent animate-spin opacity-0 group-hover:opacity-100" style={{ animationDuration: '2s' }} />
                                        </div>
                                        <span className="text-[8px] text-center truncate w-full uppercase font-black tracking-widest opacity-40 group-hover:opacity-100 group-hover:text-[#ff006e] transition-all">{a.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>


                    </div>
                )}
            </motion.div>

            {/* --- SCANLINE OVERLAY --- */}
            <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] select-none overflow-hidden h-screen w-screen">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
            </div>
        </div>
    );
};

export default DiscoveryHUD;
