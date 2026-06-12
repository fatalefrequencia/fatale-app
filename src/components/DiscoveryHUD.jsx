import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Music, Disc, User, Users, Play, Pause, Heart, Layers, Radio, BookOpen, Camera, Zap, Share2, Activity, Globe, X, Star, ChevronLeft, Shuffle, MessageSquare, Grid, Hash, Plus, Wallet, ShoppingBag, Settings, LogOut, HelpCircle, ArrowUpRight } from 'lucide-react';
import API from '../services/api';
import { SECTORS, getMediaUrl } from '../constants';
import { useNotification } from '../contexts/NotificationContext';
import HUDWidget from './discovery/HUDWidget';
import InteractiveGlobe from './discovery/InteractiveGlobe';
import CommunityTerminal from './discovery/CommunityTerminal';
import { useLanguage } from '../contexts/LanguageContext';
import TrackActionsDropdown from './TrackActionsDropdown';
import skullImg from '../assets/skull_neon_fuscia.png';

const hashStr = (s) => {
    if (!s) return 0;
    let h = 0;
    const str = s.toString();
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h);
};

const LAST_DEPLOY_FALLBACK = '2026-06-11 @ 12:23 UTC';

const getFunMessages = () => [
    
    "HAS ANYONE SEEN THE MOON?",
    "the stars fallen and dancing along ribbons of satire",
    
    "FATALE NETWORK ONLINE.",
    "xx.",
   
];

const buildLEDString = (deployInfo) => {
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    }).toUpperCase();
    const currentTime = now.toISOString().slice(11, 16) + ' UTC';

    return [
        `LAST_DEPLOY: ${deployInfo?.lastDeploy || LAST_DEPLOY_FALLBACK}`,
        deployInfo?.version ? `BUILD: ${deployInfo.version}` : null,
        `DATE: ${currentDate}`,
        `TIME: ${currentTime}`,
        ...getFunMessages()
    ].filter(Boolean).join('  //  ');
};

const useLEDString = () => {
    const [deployInfo, setDeployInfo] = useState(null);
    const [ledString, setLedString] = useState(() => buildLEDString(null));

    useEffect(() => {
        // Fetch deploy info once on mount
        API.System.getVersion()
            .then(res => {
                setDeployInfo(res.data);
                setLedString(buildLEDString(res.data));
            })
            .catch(() => setLedString(buildLEDString(null)));

        // Tick every 60s to keep date/time live
        const interval = setInterval(() => {
            setLedString(prev => buildLEDString(deployInfo));
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    // Keep interval in sync when deployInfo resolves
    useEffect(() => {
        if (!deployInfo) return;
        setLedString(buildLEDString(deployInfo));
    }, [deployInfo]);

    return ledString;
};

const LEDSign = () => {
    const ledString = useLEDString();

    return (
        <div className="flex items-center gap-2 flex-1 overflow-hidden">
            <div className="text-[8px] font-black tracking-[0.25em] text-fatale border border-fatale/40 px-1.5 py-0.5 opacity-80 shrink-0">
                SYS_LOG
            </div>
            <div className="overflow-hidden flex-1 border border-fatale/15 bg-fatale/[0.03] h-5 relative">
                <div
                    className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-black tracking-[0.25em] text-fatale/80"
                    style={{ animation: 'led-scroll 30s linear infinite' }}
                >
                    {ledString}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{ledString}
                </div>
            </div>
        </div>
    );
};

const MobileLEDBanner = () => {
    const ledString = useLEDString();

    return (
        <div className="w-full overflow-hidden border border-fatale/15 bg-fatale/[0.03] h-5 relative">
            <div
                className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-black tracking-[0.25em] text-fatale/80"
                style={{ animation: 'led-scroll 30s linear infinite' }}
            >
                {ledString}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{ledString}
            </div>
        </div>
    );
};

const DiscoveryHUD = ({ user, setView, followedCommunities = [], onFollowUpdate, setUser, navigateToProfile, onPlayTrack, onPlayPlaylist, isPlayerActive, onExpandContent, onPlayStation, isLandscape, setShowGlobalIngest, setIngestMode, onMessageCommunity, onDownload, onTipArtist, onLogout, hasNewMessages }) => {
    const { t } = useLanguage();
    const { showNotification } = useNotification();
    const [searchQuery, setSearchQuery] = useState('');
    const [liveStations, setLiveStations] = useState([]);
    const [followingIds, setFollowingIds] = useState([]);
    const [activeSector, setActiveSector] = useState(null);

    useEffect(() => {
        const fetchLiveAndFollowing = async () => {
            try {
                // 1. Fetch all live stations
                const stationsRes = await API.Stations.getAll();
                let stations = (stationsRes.data || []).filter(s => s.isLive || s.IsLive);
                
                // 2. Fetch following users to sort them at the top
                const userId = user?.id || user?.Id;
                let fIds = [];
                if (userId) {
                    const followingRes = await API.Users.getFollowing(userId).catch(() => ({ data: [] }));
                    fIds = (followingRes.data || []).map(f => String(f.id || f.Id));
                    setFollowingIds(fIds);
                }
                
                // Sort stations: followed users at the top
                stations.sort((a, b) => {
                    const aFollowed = fIds.includes(String(a.artistUserId || a.ArtistUserId));
                    const bFollowed = fIds.includes(String(b.artistUserId || b.ArtistUserId));
                    if (aFollowed && !bFollowed) return -1;
                    if (!aFollowed && bFollowed) return 1;
                    return 0;
                });
                
                setLiveStations(stations);
            } catch (err) {
                console.error("Failed to fetch live stations in DiscoveryHUD:", err);
            }
        };
        fetchLiveAndFollowing();
        const interval = setInterval(fetchLiveAndFollowing, 5000); // Poll every 5s for live status updates
        return () => clearInterval(interval);
    }, [user]);
    const [isFounding, setIsFounding] = useState(false);
    const [newClanName, setNewClanName] = useState('');
    const [newClanDesc, setNewClanDesc] = useState('');
    const [newClanSector, setNewClanSector] = useState(null);
    const [activeTerminalCommunity, setActiveTerminalCommunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBooting, setIsBooting] = useState(true);
    const [mobileViewMode, setMobileViewMode] = useState('globe'); // 'globe', 'data', 'search'
    const [showSkullMenu, setShowSkullMenu] = useState(false);
    const [showSystemGuide, setShowSystemGuide] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState({
        playlists: true,
        feed: true,
        stations: true,
        marketplace: true,
        journal: true,
        communities: true,
        artists: true
    });

    useEffect(() => {
        if (!showSkullMenu) return;
        const closeMenu = () => setShowSkullMenu(false);
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, [showSkullMenu]);

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
                const mapped = tracks.map(trk => ({
                    id: trk.id,
                    title: trk.title,
                    author: trk.artist,
                    artist: trk.artist,
                    thumbnailUrl: trk.coverImageUrl,
                    coverImageUrl: trk.coverImageUrl,
                    cover: trk.coverImageUrl,
                    imageUrl: trk.coverImageUrl,
                    source: `spotify:${trk.id}`,
                    duration: trk.durationSeconds,
                    originalTrack: trk
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

    // Handle Escape key logic
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showSkullMenu) setShowSkullMenu(false);
                if (showSystemGuide) setShowSystemGuide(false);
                if (selectedGlobeItem) setSelectedGlobeItem(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSkullMenu, showSystemGuide, selectedGlobeItem]);

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
        trendingTracks.forEach(trk => {
            const title = trk.albumTitle || trk.AlbumTitle;
            if (title && title !== '#' && title !== 'Unknown Album') {
                if (!map.has(title)) {
                    map.set(title, {
                        id: hashStr(title),
                        title,
                        artist: trk.artist || trk.artistName || trk.ArtistName || 'Unknown Artist',
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
            .map(trk => {
                const trkArtistId   = trk.artistId   || trk.ArtistId;
                const trkArtistUID  = trk.artistUserId || trk.ArtistUserId;
                const trkArtistName = (trk.artistName || trk.ArtistName || trk.artist || trk.Artist || '').toLowerCase();

                // 1. Exact artistId match — most reliable
                let artist = trkArtistId
                    ? trendingArtists.find(a => String(a.id || a.Id) === String(trkArtistId))
                    : null;

                // 2. artistUserId + name tiebreak — handles multi-profile users (e.g. Yuki / Heavensent)
                if (!artist && trkArtistUID) {
                    const byUID = trendingArtists.filter(a => String(a.userId || a.UserId) === String(trkArtistUID));
                    if (byUID.length === 1) {
                        artist = byUID[0];
                    } else if (byUID.length > 1 && trkArtistName) {
                        artist = byUID.find(a => (a.name || a.Name || '').toLowerCase() === trkArtistName) || null;
                    }
                }

                // 3. Name-only fallback
                if (!artist && trkArtistName) {
                    artist = trendingArtists.find(a => (a.name || a.Name || '').toLowerCase() === trkArtistName);
                }

                const sector = artist ? SECTORS.find(s => s.id === (artist.sectorId || artist.SectorId)) : null;
                return { 
                    ...trk, 
                    artistId: artist ? (artist.id || artist.Id) : null,
                    artist: artist ? (artist.name || artist.Name) : (trk.artistName || trk.ArtistName),
                    color: sector ? sector.color : "#ffffff" 
                };
            });
    }, [trendingTracks, trendingArtists, isNativeTrack]);

    const artistsForGlobe = useMemo(() => {
        return trendingArtists.filter(a => {
            const name = (a.name || a.Name || "").toLowerCase();
            const isArchive = a.isArchive || a.IsArchive;
            if (name === 'the archive' || name === 'youtube' || isArchive) return false;

            const artistIdStr = String(a.id || a.Id);
            const artistUIDStr = String(a.userId || a.UserId);

            // Check if they have tracks
            const hasTracks = trendingTracks.some(t => {
                const trkArtistId = String(t.artistId || t.ArtistId || "");
                const trkArtistUID = String(t.artistUserId || t.ArtistUserId || "");
                return trkArtistId === artistIdStr || trkArtistUID === artistUIDStr;
            });
            if (hasTracks) return true;

            // Check if they have playlists
            const hasPlaylists = trendingPlaylists.some(p => {
                const plArtistId = String(p.artistId || p.ArtistId || "");
                const plUID = String(p.userId || p.UserId || "");
                return plArtistId === artistIdStr || plUID === artistUIDStr;
            });
            if (hasPlaylists) return true;

            // Check if they have visual uploads
            const hasVisuals = visualUploads.some(v => {
                const visUID = String(v.artistUserId || v.ArtistUserId || v.userId || v.UserId || "");
                return visUID === artistUIDStr;
            });
            if (hasVisuals) return true;

            // Check if they have journal entries
            const hasJournals = journalEntries.some(j => {
                const jUID = String(j.userId || j.UserId || j.artistUserId || j.ArtistUserId || "");
                return jUID === artistUIDStr;
            });
            if (hasJournals) return true;

            return false;
        });
    }, [trendingArtists, trendingTracks, trendingPlaylists, visualUploads, journalEntries]);

    // Enrich playlists with a resolved artistId so the globe can draw connections
    // reliably — same multi-profile-aware logic used for tracks.
    const playlistsWithArtist = useMemo(() => {
        return trendingPlaylists.map(pl => {
            const plUserId   = pl.userId   || pl.UserId;
            const plAuthorName = (pl.authorName || pl.AuthorName || pl.userName || pl.UserName || '').toLowerCase();

            // 1. Playlist already carries an artistId (future-proof)
            let artist = (pl.artistId || pl.ArtistId)
                ? trendingArtists.find(a => String(a.id || a.Id) === String(pl.artistId || pl.ArtistId))
                : null;

            // 2. Match on userId — with name tiebreak for multi-profile users
            if (!artist && plUserId) {
                const byUID = trendingArtists.filter(a => String(a.userId || a.UserId) === String(plUserId));
                if (byUID.length === 1) {
                    artist = byUID[0];
                } else if (byUID.length > 1 && plAuthorName) {
                    artist = byUID.find(a => (a.name || a.Name || '').toLowerCase() === plAuthorName) || null;
                }
            }

            // 3. Name-only fallback
            if (!artist && plAuthorName) {
                artist = trendingArtists.find(a => (a.name || a.Name || '').toLowerCase() === plAuthorName);
            }

            return {
                ...pl,
                artistId: artist ? (artist.id || artist.Id) : null,
            };
        });
    }, [trendingPlaylists, trendingArtists]);



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

    const mobileMarketplaceGrid = useMemo(() => {
        const items = marketplaceItems.slice(0, 15);
        if (items.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-6 opacity-20">
                    <Layers size={16} className="mb-2" />
                    <div className="text-[8px] tracking-widest uppercase text-center px-4">SIN_TIENDAS_DISPONIBLES</div>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-2 gap-3">
                {items.map((item, index) => (
                    <div key={item.id || item.Id || `mk-${index}`} className="relative aspect-square border border-white/5 group cursor-pointer overflow-hidden bg-black" onClick={() => {
                        const desc = item.description || item.Description;
                        if (desc && desc !== "#") {
                            const targetUrl = desc.includes('|') ? desc.split('|')[0].trim() : desc;
                            window.open(targetUrl, '_blank');
                        }
                    }}>
                        {((item.type || item.Type) || '').toLowerCase() === 'video' ? (
                            <video src={getMediaUrl(item.url || item.Url)} className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" muted loop autoPlay playsInline />
                        ) : (
                            <img src={getMediaUrl(item.url || item.Url)} alt="" className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                        <div className="absolute inset-0 border border-fatale/0 group-hover:border-fatale/40 transition-all" />



                        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5 bg-black/70 p-2 backdrop-blur-sm border border-white/5 group-hover:border-fatale/20 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                            <div className="text-[9px] font-black truncate group-hover:text-fatale uppercase tracking-tight text-white transition-colors">
                                {(() => {
                                    const desc = item.description || item.Description || '';
                                    if (desc.includes('|')) {
                                        const parts = desc.split('|');
                                        const caption = parts.slice(1).join('|').trim();
                                        const cleanCaption = caption.replace(/\[CAT:[A-Z]+\]/g, '').trim();
                                        if (cleanCaption) return cleanCaption;
                                    }
                                    const title = item.title || item.Title;
                                    if (title && !title.includes(' ') && title.length > 20) {
                                        return 'UNTITLED';
                                    }
                                    return title || 'UNTITLED';
                                })()}
                            </div>
                            <div className="text-[7px] text-white/40 uppercase tracking-widest font-mono">
                                LOC: SEC_{hashStr(item.id || item.Id) % 99}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }, [marketplaceItems]);

    const desktopMarketplaceGrid = useMemo(() => {
        if (marketplaceItems.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-10 opacity-20">
                    <Layers size={16} className="mb-2" />
                    <div className="text-[8px] tracking-widest uppercase text-center px-4">SIN_TIENDAS_DISPONIBLES</div>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-500">
                {marketplaceItems.map((item, index) => (
                    <div key={item.id || item.Id || `dk-${index}`} className="relative aspect-square border border-white/5 group cursor-pointer overflow-hidden bg-black" onClick={() => {
                        const desc = item.description || item.Description;
                        if (desc && desc !== "#") {
                            const targetUrl = desc.includes('|') ? desc.split('|')[0].trim() : desc;
                            window.open(targetUrl, '_blank');
                        }
                    }}>
                        {((item.type || item.Type) || '').toLowerCase() === 'video' ? (
                            <video src={getMediaUrl(item.url || item.Url)} className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" muted loop autoPlay playsInline />
                        ) : (
                            <img src={getMediaUrl(item.url || item.Url)} alt="" className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                        <div className="absolute inset-0 border border-fatale/0 group-hover:border-fatale/40 transition-all" />



                        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5 bg-black/70 p-2 backdrop-blur-sm border border-white/5 group-hover:border-fatale/20 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                            <div className="text-[9px] font-black truncate group-hover:text-fatale uppercase tracking-tight text-white transition-colors">
                                {(() => {
                                    const desc = item.description || item.Description || '';
                                    if (desc.includes('|')) {
                                        const parts = desc.split('|');
                                        const caption = parts.slice(1).join('|').trim();
                                        const cleanCaption = caption.replace(/\[CAT:[A-Z]+\]/g, '').trim();
                                        if (cleanCaption) return cleanCaption;
                                    }
                                    const title = item.title || item.Title;
                                    if (title && !title.includes(' ') && title.length > 20) {
                                        return 'UNTITLED';
                                    }
                                    return title || 'UNTITLED';
                                })()}
                            </div>
                            <div className="text-[7px] text-white/40 uppercase tracking-widest font-mono">
                                LOC: SEC_{hashStr(item.id || item.Id) % 99} // ID: {String(item.id || item.Id).substring(0, 6)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }, [marketplaceItems]);


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
        <div 
            className="relative w-full h-full overflow-y-auto lg:overflow-hidden bg-[#020202] text-white font-mono flex flex-col p-4 select-none no-scrollbar"
            style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 8px)' }}
        >
            {/* Global Style Inject for Premium Scrollbars */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .no-scrollbar {
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                /* Custom Premium Dark Scrollbars */
                ::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }
                ::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.4);
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(var(--theme-primary-rgb), 0.35);
                    border-radius: 2px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(var(--theme-primary-rgb), 0.7);
                    box-shadow: 0 0 10px rgba(var(--theme-primary-rgb), 0.5);
                }
                @keyframes led-scroll {
                    0%   { left: 100%; }
                    100% { left: -200%; }
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
                            <div className="text-[10px] text-fatale font-black tracking-[0.5em] mb-8 animate-pulse">{t('INITIATING_LINK')}</div>
                            <div className="space-y-1 font-mono text-[8px] opacity-40">
                                <div>[SYS] {t('BOOTING_KERNEL')}... OK</div>
                                <div>[SYS] {t('CALIBRATING_SENSORS')}... OK</div>
                                <div>[SYS] {t('ESTABLISHING_SIGNAL')}... OK</div>
                                <div>[SYS] {t('LOADING_MAP')}... OK</div>
                            </div>
                            <div className="h-1 w-full bg-fatale/20 relative overflow-hidden">
                                <motion.div
                                    initial={{ left: '-100%' }}
                                    animate={{ left: '0%' }}
                                    transition={{ duration: 1.2, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-fatale/80"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top scanning lines effect */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-fatale/10 z-[60] shadow-[0_0_20px_rgb(var(--theme-primary))]" />

        
            {/* --- TOP HUD BAR --- */}
            <div className="z-[80] flex flex-row items-center justify-between gap-4 mb-4 px-2 relative w-full">

                {/* LEFT: FLOATING SYSTEM KERNEL (SKULL DROPDOWN) */}
                <div className="relative pointer-events-auto shrink-0 z-[100]">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSkullMenu(!showSkullMenu);
                        }}
                        className="relative w-10 h-10 md:w-12 md:h-12 p-1.5 flex items-center justify-center transition-all rounded-sm active:scale-95 group"
                        style={{
                            boxShadow: `0 0 15px rgba(var(--theme-primary-rgb), 0.35)`,
                            border: `1px solid rgba(var(--theme-primary-rgb), 0.45)`,
                            backgroundColor: '#000000'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.boxShadow = '0 0 22px rgba(var(--theme-primary-rgb), 0.6)';
                            e.currentTarget.style.borderColor = 'rgba(var(--theme-primary-rgb), 0.85)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.boxShadow = '0 0 15px rgba(var(--theme-primary-rgb), 0.35)';
                            e.currentTarget.style.borderColor = 'rgba(var(--theme-primary-rgb), 0.45)';
                        }}
                        title="System Navigation"
                    >
                        <img
                            src={skullImg}
                            alt="System Kernel"
                            className="w-full h-full object-contain filter transition-transform group-hover:scale-105"
                            style={{ 
                                filter: 'grayscale(1) brightness(8) contrast(1.5)', 
                            }}
                        />
                        <div 
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ 
                                backgroundColor: 'var(--theme-color)',
                                mixBlendMode: 'multiply',
                                opacity: 0.95
                            }}
                        />
                    </button>

                    {/* Skull holographic full-screen navigation overlay */}
                    <AnimatePresence>
                        {showSkullMenu && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="fixed inset-0 bg-black z-[9999] flex items-center justify-center p-3 md:p-8 pointer-events-auto"
                            >
                                {/* Scanlines & Noise multiply overlay */}
                                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-10" />

                                <motion.div
                                    initial={{ scale: 0.95, y: 15 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.95, y: 15 }}
                                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                                    className="w-full max-w-2xl max-h-[96vh] overflow-y-auto bg-black border border-fatale/40 p-4 md:p-8 relative rounded-sm flex flex-col gap-4 md:gap-6 z-20 no-scrollbar"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Tech corners */}
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-fatale" />
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-fatale" />
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-fatale" />
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-fatale" />

                                    {/* Header */}
                                    <div className="flex justify-between items-center border-b border-white/5 pb-3 md:pb-4">
                                        <div>
                                            <div className="text-white/40 text-[8px] md:text-[9px] font-mono mt-0.5 uppercase tracking-widest">USER: {user?.username || 'NEURAL_USER'} · STATUS: ACTIVE</div>
                                        </div>
                                        <button
                                            onClick={() => setShowSkullMenu(false)}
                                            className="text-white/40 hover:text-fatale transition-colors border border-white/10 hover:border-fatale/50 px-2 md:px-3 py-1 md:py-1.5 text-[8px] md:text-[9px] font-mono uppercase tracking-widest rounded-sm"
                                        >
                                            [ ESCAPE ]
                                        </button>
                                    </div>

                                    {/* Navigation Grid */}
                                    <div className="grid grid-cols-2 gap-2 md:gap-4 flex-1">
                                        {[
                                            { id: 'feed', icon: <Hash size={15} />, label: t('FEED_LNK') || 'Feed', desc: 'FEED' },
                                            { id: 'profile', icon: <User size={15} />, label: t('USR_LINK') || 'Profile', desc: 'IDENTITY' },
                                            { id: 'player', icon: <Play size={15} />, label: t('PLY_CORE') || 'Player', desc: 'AUDIO' },
                                            { id: 'messages', icon: <MessageSquare size={15} />, label: t('MSG_SYNC') || 'Messages', desc: 'COMMS', badge: hasNewMessages },
                                            { id: 'shopping', icon: <ShoppingBag size={15} />, label: t('SHOP_LNK') || 'Marketplace', desc: 'STORE' },
                                            { id: 'wallet', icon: <Wallet size={15} />, label: t('WAL_BASE') || 'Wallet', desc: 'CREDITS' },
                                            { id: 'settings', icon: <Settings size={15} />, label: t('SYS_CONF') || 'Settings', desc: 'SYSTEM' },
                                        ].map(node => (
                                            <button
                                                key={node.id}
                                                onClick={() => { setView(node.id); setShowSkullMenu(false); }}
                                                className={`group text-left p-2 md:p-4 bg-white/[0.012] border border-white/5 hover:border-fatale hover:shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.4)] hover:bg-fatale/5 transition-all flex items-center gap-2 md:gap-4 relative overflow-hidden active:scale-[0.98] rounded-sm min-w-0 ${node.id === 'settings' ? 'col-span-2 justify-self-center w-full md:w-[calc(50%-0.5rem)]' : ''}`}
                                            >
                                                <div className="p-1.5 md:p-3 bg-black border border-white/10 text-white/40 group-hover:text-fatale group-hover:border-fatale/30 transition-all shrink-0">
                                                    {node.icon}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-white/80 group-hover:text-white transition-colors flex items-center gap-1.5 truncate">
                                                        {node.label}
                                                        {node.badge && <span className="w-1.5 h-1.5 rounded-full bg-fatale animate-pulse shadow-[0_0_8px_rgb(var(--theme-primary))] shrink-0" />}
                                                    </div>
                                                    <div className="text-[6.5px] md:text-[7.5px] font-mono text-white/20 group-hover:text-fatale/40 transition-colors uppercase tracking-wider mt-0.5 truncate">
                                                        {node.desc}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Footer Disconnect */}
                                    <div className="border-t border-white/5 pt-3 md:pt-4 flex justify-between items-center">
                                        <div className="text-[7px] md:text-[8px] text-white/10 font-mono tracking-widest">FATALE_SYSTEMS_v2.0_SECURE</div>
                                        <button
                                            onClick={() => { onLogout && onLogout(); setShowSkullMenu(false); }}
                                            className="px-4 md:px-6 py-2 md:py-2.5 bg-fatale/10 border border-fatale/30 text-fatale hover:bg-fatale/20 hover:border-fatale font-black text-[9px] md:text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 active:scale-95 rounded-sm"
                                        >
                                            <LogOut size={12} /> {t('LOGOUT_SYS') || 'Disconnect'}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* CENTER: SEARCH */}
                <div className="w-full lg:w-[450px] flex justify-center relative">
                    {isMobile && mobileViewMode !== 'search' && !searchQuery ? (
                        <button
                            onClick={() => setMobileViewMode('search')}
                            className="p-2 text-fatale hover:text-white transition-colors self-center lg:hidden"
                        >
                            <Search size={20} />
                        </button>
                    ) : (
                        <div className="relative group w-full">
                            <div
                                className="absolute -inset-1 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200"
                                style={{ backgroundColor: activeSectorColor || 'rgb(var(--theme-primary))', opacity: activeSectorColor ? 0.3 : 0 }}
                            ></div>
                            <div className="relative flex items-center">
                                <div className="absolute left-3 flex items-center pointer-events-none">
                                    <Search
                                        size={16}
                                        className="group-focus-within:opacity-100 transition-opacity"
                                        style={{ color: activeSectorColor || 'rgb(var(--theme-primary))', opacity: activeSector ? 1 : 0.4 }}
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder={t('SEARCH_SIGNAL')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                    className="w-full bg-black/60 border rounded px-10 py-2.5 text-xs tracking-[0.2em] focus:outline-none focus:ring-1 transition-all placeholder:text-fatale/20"
                                    style={{
                                        borderColor: activeSectorColor ? `${activeSectorColor}99` : 'rgba(var(--theme-primary-rgb),0.3)',
                                        focusBorderColor: activeSectorColor || 'rgb(var(--theme-primary))',
                                        color: activeSectorColor || 'white',
                                        '--tw-ring-color': activeSectorColor ? `${activeSectorColor}33` : 'rgba(var(--theme-primary-rgb),0.2)'
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

                {/* RIGHT: LED SIGN — desktop only */}
                <div className="flex-1 hidden lg:flex items-center justify-end">
                    <LEDSign lastUpdated={new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'} />
                </div>

                {/* Small frequency indicator — desktop only */}
                {!isMobile && (
                    <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-[2px]">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{ height: [2, 8, 2, 4, 2] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.05 }}
                                className="w-[2px] transition-colors duration-500"
                                style={{ backgroundColor: activeSectorColor ? `${activeSectorColor}66` : 'rgba(var(--theme-primary-rgb), 0.3)' }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* MOBILE: LED banner — sits below search, above globe/data toggle */}
            {isMobile && (
                <div className="w-full overflow-hidden border border-fatale/15 bg-fatale/[0.03] h-5 relative shrink-0 z-[80]">
                    <div
                        className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-black tracking-[0.25em] text-fatale/80"
                        style={{ animation: 'led-scroll 30s linear infinite' }}
                    >
                        {[`LAST_UPDATE: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, ...getFunMessages()].join('  //  ')}
                    </div>
                </div>
            )}

            {/* MOBILE VIEW TOGGLE */}
            {isMobile && (
                <div
                    className="mt-2 mb-2 flex bg-black/40 border border-fatale/20 rounded-sm p-1 gap-1 pointer-events-auto relative z-[90] w-full shrink-0"
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    <button
                        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setMobileViewMode('globe'); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileViewMode('globe'); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black tracking-widest transition-all ${mobileViewMode === 'globe' ? 'border border-fatale text-fatale shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.3)]' : 'text-fatale/40 border border-transparent hover:bg-fatale/10'}`}
                    >
                        <Globe size={12} /> {t('GLOBE_SENSE')}
                    </button>
                    <button
                        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setMobileViewMode('data'); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMobileViewMode('data'); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black tracking-widest transition-all ${mobileViewMode === 'data' ? 'border border-fatale text-fatale shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.3)]' : 'text-fatale/40 border border-transparent hover:bg-fatale/10'}`}
                    >
                        <Activity size={12} /> {t('DATA_STREAM')}
                    </button>
                </div>
            )}

            {/* --- MAIN DASHBOARD GRID --- */}
            <motion.div
                layout
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className={`flex-1 relative flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-6 gap-6 lg:gap-4 pointer-events-none mt-4 ${isPlayerActive ? 'pb-24 lg:pb-28' : 'pb-20 lg:pb-0'} min-h-0`}
                style={{ gridTemplateRows: 'repeat(6, 1fr)' }}
            >

                {/* --- CENTER: THE GLOBE OR COMMUNITY TERMINAL --- */}
                {(!isMobile || mobileViewMode === 'globe') && (
                    <div 
                        className={`${isMobile ? 'h-[50vh] min-h-[360px] max-h-[460px] w-full bg-transparent border-0' : 'h-[400px] lg:h-full lg:col-span-6 lg:row-span-4 lg:col-start-4 lg:row-start-1 border bg-black/35 backdrop-blur-[2px] rounded-sm'} pointer-events-auto flex items-center justify-center relative transition-all duration-300`}
                        style={(!isMobile && activeSectorColor) ? {
                            borderColor: `${activeSectorColor}99`,
                            boxShadow: `0 0 20px ${activeSectorColor}26`,
                            outline: `1px solid ${activeSectorColor}4D`
                        } : (!isMobile ? { borderColor: 'rgba(var(--theme-primary-rgb),0.30)' } : {})}
                    >
                        {/* Corner Brackets (Desktop only) */}
                        {!isMobile && (
                            <>
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-fatale/55 z-20" style={activeSectorColor ? { borderColor: activeSectorColor } : {}} />
                                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-fatale/55 z-20" style={activeSectorColor ? { borderColor: activeSectorColor } : {}} />
                                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-fatale/55 z-20" style={activeSectorColor ? { borderColor: activeSectorColor } : {}} />
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-fatale/55 z-20" style={activeSectorColor ? { borderColor: activeSectorColor } : {}} />
                            </>
                        )}

                        {/* Pinterest Grid View */}
                        <div className={`absolute inset-0 w-full h-full bg-black/95 backdrop-blur-xl border border-white/10 p-5 pt-28 overflow-y-auto no-scrollbar transition-all duration-500 pointer-events-auto ${isPinterestView ? 'opacity-100 visible z-20' : 'opacity-0 invisible pointer-events-none -z-10'}`}>
                            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-fatale mb-6 border-b border-fatale/20 pb-2 pl-14 md:pl-16">DISCOVERED_SIGNALS</div>

                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {/* Playlists */}
                                {trendingPlaylists.slice(0, 4).map(p => (
                                    <div key={p.id || p.Id} className="aspect-square bg-black border border-white/5 hover:border-fatale/40 group cursor-pointer transition-all flex flex-col justify-between p-4 relative overflow-hidden" onClick={() => onPlayTrack(p)}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                        <div className="text-[8px] font-mono text-fatale uppercase tracking-widest">PLAYLIST</div>
                                        <div className="z-10">
                                            <div className="text-xs font-black truncate group-hover:text-fatale uppercase">{p.name || p.Name}</div>
                                            <div className="text-[8px] opacity-40 uppercase mt-0.5">BY {p.authorName || p.AuthorName || p.userName || p.UserName || "UNKNOWN"}</div>
                                        </div>
                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play size={16} fill="rgb(var(--theme-primary))" className="text-fatale" />
                                        </div>
                                    </div>
                                ))}

                                {/* Tracks */}
                                {trendingTracks.slice(0, 6).map(trk => (
                                    <div key={trk.id} className="aspect-square bg-black border border-white/5 hover:border-fatale/40 group cursor-pointer transition-all flex flex-col justify-between p-4 relative overflow-hidden" onClick={() => onPlayTrack(trk)}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                        <div className="absolute inset-0">
                                            <img src={getMediaUrl(trk.imageUrl || trk.ImageUrl || trk.coverImageUrl || trk.CoverImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700" />
                                        </div>
                                        <div className="text-[8px] font-mono text-secondary uppercase tracking-widest z-10">SONG</div>
                                        <div className="z-10">
                                            <div className="text-xs font-black truncate group-hover:text-fatale uppercase">{trk.title}</div>
                                            <div className="text-[8px] opacity-40 uppercase mt-0.5">BY {trk.artist}</div>
                                        </div>
                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <Play size={16} fill="rgb(var(--theme-primary))" className="text-fatale" />
                                        </div>
                                    </div>
                                ))}

                                {/* Artists */}
                                {trendingArtists.slice(0, 4).map(a => (
                                    <div key={a.id} className="aspect-square bg-black border border-white/5 hover:border-fatale/40 group cursor-pointer transition-all flex flex-col justify-between p-4 relative overflow-hidden" onClick={() => navigateToProfile(a.userId)}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                        <div className="absolute inset-0">
                                            <img src={getMediaUrl(a.profilePicture || a.ProfilePicture || a.imageUrl || a.ImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700" />
                                        </div>
                                        <div className="text-[8px] font-mono text-[#9d00ff] uppercase tracking-widest z-10">ARTIST</div>
                                        <div className="z-10">
                                            <div className="text-xs font-black truncate group-hover:text-fatale uppercase">{a.name}</div>
                                            <div className="text-[8px] opacity-40 uppercase mt-0.5">{a.genre || "NATIVE"}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Globe View */}
                        <div className={`w-full h-full ${activeTerminalCommunity ? 'hidden' : 'flex'} items-center justify-center p-4 transition-all duration-500 ${isPinterestView ? 'opacity-0 invisible pointer-events-none -z-10' : 'opacity-100 visible z-10 pointer-events-auto'}`}>
                            <InteractiveGlobe
                                searchQuery={searchQuery}
                                communities={communities}
                                artists={artistsForGlobe}
                                tracks={tracksWithColor}
                                playlists={playlistsWithArtist}
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
                                onPlaylistClick={async (playlist) => {
                                    const prevId = selectedGlobeItem?.id || selectedGlobeItem?.Id;
                                    const currId = playlist.id || playlist.Id;
                                    if (prevId === currId && selectedGlobeItem?.type === 'playlist') {
                                        setSelectedGlobeItem(null);
                                        setSelectedPlaylist(null);
                                    } else {
                                        setSelectedGlobeItem({ ...playlist, type: 'playlist' });
                                        setSelectedPlaylist(playlist);
                                        setLoadingPlaylist(true);
                                        try {
                                            const res = await API.Playlists.getById(playlist.id || playlist.Id);
                                            setPlaylistTracks(res.data?.tracks || []);
                                        } catch (err) {
                                            console.error("Failed to fetch playlist tracks from globe:", err);
                                        } finally {
                                            setLoadingPlaylist(false);
                                        }
                                    }
                                }}
                                onSelectItem={(id) => {
                                    if (id === null) setSelectedGlobeItem(null);
                                }}
                            />
                        </div>

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
                        <AnimatePresence>
    {selectedGlobeItem && !activeTerminalCommunity && (
        <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{    opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="absolute z-50 pointer-events-auto bottom-4 left-16"
        >
            <div
                className="relative bg-black/96 backdrop-blur-xl border border-white/10 p-3"
                style={{ width: '220px', boxShadow: '0 0 40px rgba(0,0,0,0.85)' }}
            >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />

                {/* Identity row */}
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-9 h-9 border border-white/10 overflow-hidden shrink-0 bg-black">
                        <img
                            src={getMediaUrl(
                                selectedGlobeItem.profilePicture || selectedGlobeItem.ProfilePicture ||
                                selectedGlobeItem.imageUrl       || selectedGlobeItem.ImageUrl       ||
                                selectedGlobeItem.coverImageUrl  || selectedGlobeItem.CoverImageUrl
                            )}
                            alt=""
                            className="w-full h-full object-cover opacity-75"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-tight truncate text-white leading-none">
                            {selectedGlobeItem.name || selectedGlobeItem.title || selectedGlobeItem.Title}
                        </div>
                        {selectedGlobeItem.type === 'track' && (
                            <div className="text-[7px] text-white/35 uppercase tracking-wider truncate mt-0.5">
                                {selectedGlobeItem.artist || selectedGlobeItem.artistName}
                            </div>
                        )}
                        <div
                            className="text-[6px] font-black tracking-[0.3em] uppercase mt-1"
                            style={{
                                color:
                                    selectedGlobeItem.type === 'artist'    ? '#00ffaa' :
                                    selectedGlobeItem.type === 'community' ? '#ffaa00' :
                                    selectedGlobeItem.type === 'playlist'  ? 'rgb(var(--theme-primary))' : '#00aaff'
                            }}
                        >
                            {selectedGlobeItem.type === 'community' ? 'CLUSTER' :
                             selectedGlobeItem.type === 'artist'    ? 'ARTIST'  :
                             selectedGlobeItem.type === 'playlist'  ? 'PLAYLIST': 'TRACK'}
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedGlobeItem(null)}
                        onTouchEnd={(e) => { e.preventDefault(); setSelectedGlobeItem(null); }}
                        className="text-white/20 hover:text-white transition-colors shrink-0"
                    >
                        <X size={11} />
                    </button>
                </div>

                {/* Single action */}
                {selectedGlobeItem.type === 'artist' && (
                    <button
                        onClick={() => navigateToProfile(selectedGlobeItem.userId || selectedGlobeItem.UserId)}
                        className="w-full border border-white/12 text-white/60 hover:border-white/40 hover:text-white py-1.5 text-[7px] font-black tracking-[0.3em] uppercase transition-all"
                    >
                        VIEW PROFILE
                    </button>
                )}
                {selectedGlobeItem.type === 'community' && (
                    <button
                        onClick={() => setActiveTerminalCommunity(selectedGlobeItem)}
                        className="w-full border border-white/12 text-white/60 hover:border-white/40 hover:text-white py-1.5 text-[7px] font-black tracking-[0.3em] uppercase transition-all"
                    >
                        ENTER PORTAL
                    </button>
                )}
                {(selectedGlobeItem.type === 'track' || selectedGlobeItem.type === 'playlist') && (
                    <button
                        onClick={() => {
                            if (selectedGlobeItem.type === 'track') {
                                onPlayTrack(selectedGlobeItem);
                            } else if (playlistTracks?.[0]) {
                                onPlayTrack(playlistTracks[0]);
                            }
                            setSelectedGlobeItem(null);
                        }}
                        className="w-full border border-fatale/30 text-fatale hover:bg-fatale/10 py-1.5 text-[7px] font-black tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-2"
                    >
                        <Play size={8} fill="currentColor" />
                        {selectedGlobeItem.type === 'track' ? 'PLAY TRACK' : 'PLAY PLAYLIST'}
                    </button>
                )}
            </div>
        </motion.div>
    )}
</AnimatePresence>
                        </AnimatePresence>

                        {/* Globe Controls - Premium Mirror Layout */}
                        {!activeTerminalCommunity && (
                            <>
                                <div className="absolute top-10 left-4 z-50 scale-75 lg:scale-100 flex flex-col gap-2">
                                    {!isPinterestView && (
                                        <button
                                            onClick={() => setIsGlobeSpinning(!isGlobeSpinning)}
                                            className={`flex items-center justify-center w-10 h-10 rounded-sm border transition-all duration-300 ${isGlobeSpinning ? 'bg-[#8c62d1]/10 border-[#8c62d1] text-[#8c62d1] shadow-[0_0_15px_rgba(140,98,209,0.2)]' : 'bg-black/40 border-white/5 text-white/40 hover:border-[#8c62d1]/40 hover:text-[#8c62d1]'}`}
                                            title={isGlobeSpinning ? t('PAUSE_SPIN') : t('START_SPIN')}
                                        >
                                            {isGlobeSpinning ? <Pause size={14} /> : <Play size={14} />}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsPinterestView(!isPinterestView)}
                                        className={`flex items-center justify-center w-10 h-10 rounded-sm border transition-all duration-300 ${isPinterestView ? 'bg-fatale/10 border-fatale text-fatale' : 'bg-black/40 border-white/5 text-white/40'}`}
                                        title={isPinterestView ? "View 3D Map" : "View Grid"}
                                    >
                                        {isPinterestView ? <Globe size={14} /> : <Grid size={14} />}
                                    </button>
                                </div>

                                {/* Guide Button - Bottom Left Corner of Globe Terminal */}
                                <div className="absolute bottom-4 left-4 z-50 scale-75 lg:scale-100">
                                    <button
                                        onClick={() => setShowSystemGuide(true)}
                                        className="flex items-center justify-center w-10 h-10 rounded-sm border bg-[#020202] border-[#b39ddb]/30 text-white/50 hover:border-[#b39ddb] hover:text-[#b39ddb] transition-all duration-300 shadow-[0_0_10px_rgba(179,157,219,0.15)] hover:shadow-[0_0_20px_rgba(179,157,219,0.3)]"
                                        title="System Guide"
                                    >
                                        <HelpCircle size={15} />
                                    </button>
                                </div>

                                {!isPinterestView && (
                                    <div className={`absolute right-4 flex flex-col gap-3 z-50 scale-95 lg:scale-100 transition-all duration-300 ${selectedGlobeItem ? 'top-2 opacity-0 pointer-events-none md:top-10 md:opacity-100 md:pointer-events-auto' : 'top-10'}`}>

                                        {[
                                            { id: 'ARTISTS', icon: <User size={12} />, label: t('ARTISTS'), desc: t('ARTISTS') },
                                            { id: 'COMMUNITIES', icon: <Globe size={12} />, label: t('SECTOR_CLIQUES'), desc: t('SECTOR_CLIQUES') },
                                            { id: 'PLAYLISTS', icon: <Music size={12} />, label: t('PLAYLISTS'), desc: t('PLAYLISTS') },
                                            { id: 'TRACKS', icon: <Play size={12} />, label: t('SONGS'), desc: t('SONGS') }
                                        ].map(v => (
                                            <button
                                                key={v.id}
                                                onClick={() => setActiveGlobeView(activeGlobeView === v.id ? null : v.id)}
                                                className={`flex flex-col items-end gap-1 px-3 py-2 rounded-sm border transition-all duration-300 group ${activeGlobeView === v.id ? 'bg-[#ff7096]/10 border-[#ff7096] text-[#ff7096] shadow-[0_0_15px_rgba(255,112,150,0.25)]' : 'bg-black/40 border-white/5 text-white/40 hover:border-[#ff7096]/40 hover:text-white'}`}
                                            >
                                                <div className="flex items-center">
                                                    {v.icon}
                                                    <span className={`text-[10px] font-black tracking-[0.2em] transition-all uppercase inline-block whitespace-nowrap ${
                                                        activeGlobeView === v.id 
                                                            ? 'opacity-100 max-w-[150px] ml-3 w-auto' 
                                                            : 'opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto max-w-0 group-hover:max-w-[150px] overflow-hidden ml-0 group-hover:ml-3'
                                                    }`}>{v.label}</span>
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
                            <HUDWidget title={<span className="cursor-pointer hover:text-fatale transition-colors" onClick={() => setView && setView('player')}>{t('YT_FREQ_SCAN')}</span>} icon={<Search size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="space-y-4">
                                    {youtubeResults.length > 0 ? youtubeResults.map(y => (
                                        <div key={y.id} className="flex items-center gap-4 p-2.5 hover:bg-fatale/10 border border-transparent hover:border-fatale/20 group cursor-pointer transition-all" onClick={() => {
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
                                            <div className="w-12 h-12 bg-black overflow-hidden relative border border-white/5 group-hover:border-fatale/40 shadow-lg">
                                                <img
                                                    src={y.thumbnailUrl || y.ThumbnailUrl || y.coverImageUrl || y.CoverImageUrl || (y.id ? `https://img.youtube.com/vi/${y.id}/hqdefault.jpg` : null)}
                                                    alt=""
                                                    className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                                />
                                                <div className="absolute inset-0 bg-fatale/10 mix-blend-overlay group-hover:opacity-0" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase tracking-tight">{y.title}</div>
                                                <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">{y.author}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                                        onDownload={onDownload}
                                                        onTipArtist={onTipArtist}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )) : recentYoutubeTracks && recentYoutubeTracks.length > 0 ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center mb-2 px-2">
                                                <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40">{t('YOUTUBE_CACHE')}</div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            localStorage.removeItem('recent_youtube_tracks');
                                                            setRecentYoutubeTracks([]);
                                                        } catch (err) {
                                                            console.error("Failed to clear recent tracks:", err);
                                                        }
                                                    }}
                                                    className="text-[7px] font-bold text-fatale/60 hover:text-fatale transition-all uppercase tracking-wider bg-transparent cursor-pointer"
                                                >
                                                    [ {t('CLEAR')} ]
                                                </button>
                                            </div>
                                            {recentYoutubeTracks.map(y => (
                                                <div key={y.id} className="flex items-center gap-4 p-2.5 hover:bg-fatale/10 border border-transparent hover:border-fatale/20 group cursor-pointer transition-all" onClick={() => {
                                                    onPlayTrack(y);
                                                }}>
                                                    <div className="w-10 h-10 bg-black overflow-hidden relative border border-white/5 group-hover:border-fatale/40 shadow-lg">
                                                        <img
                                                            src={y.thumbnailUrl || `https://img.youtube.com/vi/${y.id}/hqdefault.jpg`}
                                                            alt=""
                                                            className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase tracking-tight">{y.title}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">{y.author}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                                                onDownload={onDownload}
                                                                onTipArtist={onTipArtist}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : recentYoutubeSearches.length > 0 ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center mb-2 px-2">
                                                <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40">{t('RECENT_SEARCHES')}</div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            localStorage.removeItem('recent_youtube_searches');
                                                            setRecentYoutubeSearches([]);
                                                        } catch (err) {
                                                            console.error("Failed to clear recent searches:", err);
                                                        }
                                                    }}
                                                    className="text-[7px] font-bold text-fatale/60 hover:text-fatale transition-all uppercase tracking-wider bg-transparent cursor-pointer"
                                                >
                                                    [ {t('CLEAR')} ]
                                                </button>
                                            </div>
                                            {recentYoutubeSearches.map(s => (
                                                <div key={s} className="flex items-center gap-4 p-2.5 hover:bg-fatale/10 border border-transparent hover:border-fatale/20 group cursor-pointer transition-all" onClick={() => setSearchQuery(s)}>
                                                    <Search size={10} className="text-white/40 group-hover:text-fatale" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase tracking-tight">{s}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full opacity-40 py-10 text-center px-4 group">
                                            <div className="w-8 h-8 border border-white/20 rounded-full flex items-center justify-center mb-3 group-hover:border-fatale group-hover:text-fatale transition-all animate-pulse">
                                                <Search size={14} />
                                            </div>
                                            <div className="text-[10px] font-black tracking-widest uppercase mb-1">{t('RADAR_YOUTUBE_ESPERANDO')}</div>
                                            <div className="text-[7px] tracking-[0.2em] uppercase opacity-60">{t('RADAR_YOUTUBE_HELP')}</div>
                                        </div>
                                    )}
                                </div>
                            </HUDWidget>
                        </div>


                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-1 lg:row-start-3 pointer-events-auto">
                            <HUDWidget
                                title={selectedPlaylist ? `${t('DESC_PL')}: ${(selectedPlaylist.name || selectedPlaylist.Name || '').toUpperCase()}` : <span className="cursor-pointer hover:text-fatale transition-colors" onClick={() => setView && setView('player')}>{t('PLAYLISTS')}</span>}
                                icon={selectedPlaylist ? <ChevronLeft size={14} className="cursor-pointer hover:text-white transition-colors" onClick={() => setSelectedPlaylist(null)} /> : <Music size={14} />}
                                searchQuery={searchQuery}
                                activeColor={activeSectorColor}
                            >
                                {selectedPlaylist ? (
                                    loadingPlaylist ? (
                                        <div className="text-[8px] opacity-40 text-center py-4">LOADING...</div>
                                    ) : (
                                        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                                            {playlistTracks.length > 0 ? playlistTracks.map(trk => (
                                                <div key={trk.id} className="flex items-center gap-3 p-2 hover:bg-fatale/10 cursor-pointer group" onClick={() => onPlayTrack(trk)}>
                                                    <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-fatale uppercase">{trk.title}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase">{trk.artist}</div>
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
                                                <div key={p.id || p.Id} className="flex items-center gap-3 p-2.5 hover:bg-fatale/10 border border-transparent hover:border-fatale/20 group cursor-pointer transition-all" onClick={async () => {
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
                                                    <div className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center group-hover:border-fatale/40">
                                                        <Layers size={12} className="text-white/40 group-hover:text-fatale" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">{p.tracks?.length || 0} SIGNALS</div>
                                                    </div>
                                                    <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )) : (
                                                <div className="text-[8px] opacity-30 px-2 py-1">NO_PLAYLISTS_CREATED</div>
                                            )}
                                        </div>

                                        {/* Recommended Playlists */}
                                        <div>
                                            <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2">RECOMENDADAS</div>
                                            {trendingPlaylists.length > 0 ? trendingPlaylists.map(p => (
                                                <div key={p.id || p.Id} className="flex items-center gap-3 p-2.5 hover:bg-fatale/10 border border-transparent hover:border-fatale/20 group cursor-pointer transition-all" onClick={async () => {
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
                                                    <div className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center group-hover:border-fatale/40">
                                                        <Layers size={12} className="text-white/40 group-hover:text-fatale" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                        <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">BY {p.authorName || p.AuthorName || p.userName || p.UserName || "UNKNOWN"}</div>
                                                    </div>
                                                    <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
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
                            <HUDWidget title={<span className="cursor-pointer hover:text-fatale transition-colors" onClick={() => setView && setView('profile')}>NATIVE_ARTISTS</span>} icon={<User size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-2 pt-2">
                                    {filteredArtists.map(a => (
                                        <div key={a.id} className="flex flex-col items-center gap-3 group cursor-pointer" onClick={() => navigateToProfile(a.userId)}>
                                            <div className="relative w-14 h-14">
                                                {/* Radar Node Circle */}
                                                <div className="absolute inset-0 rounded-full border border-fatale/20 group-hover:border-fatale/60 transition-colors" />
                                                <div className="absolute inset-[-4px] rounded-full border border-dashed border-fatale/10 group-hover:ring-1 group-hover:ring-fatale/20 group-hover:animate-spin transition-all duration-[3000ms]" />

                                                <div className="absolute inset-[4px] rounded-full overflow-hidden border-2 border-black z-10 bg-black">
                                                    <img src={getMediaUrl(a.profilePicture || a.ProfilePicture || a.imageUrl || a.ImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all scale-110 group-hover:scale-100" />
                                                </div>

                                                {/* Scan sweep line */}
                                                <div className="absolute inset-0 z-20 pointer-events-none rounded-full bg-gradient-to-tr from-fatale/30 via-transparent to-transparent animate-spin opacity-0 group-hover:opacity-100" style={{ animationDuration: '2s' }} />
                                            </div>
                                            <span className="text-[8px] text-center truncate w-full uppercase font-black tracking-widest opacity-40 group-hover:opacity-100 group-hover:text-fatale transition-all">{a.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </HUDWidget>
                        </div>

                        {/* --- RIGHT COLUMN: PLAYLISTS, VISUALS, JOURNALS --- */}
                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-10 lg:row-start-1 pointer-events-auto">
                            <HUDWidget title={<span className="cursor-pointer hover:text-fatale transition-colors" onClick={() => setView && setView('shopping')}>{t('SHOP_LNK')}</span>} icon={<Layers size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                {desktopMarketplaceGrid}
                            </HUDWidget>
                        </div>

                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-10 lg:row-start-3 pointer-events-auto">
                            <HUDWidget title={<span className="cursor-pointer hover:text-fatale transition-colors" onClick={() => setView && setView('feed')}>{t('STUDIO_TRANS')}</span>} icon={<Camera size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                    {filteredVisuals.length > 0 ? filteredVisuals.map(vis => (
                                        <div
                                            key={vis.id}
                                            className="aspect-square bg-black border border-white/5 relative group cursor-pointer overflow-hidden hover:border-fatale/60 transition-all shadow-xl"
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
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fatale scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                            {(vis.mediaType || vis.MediaType || '').toLowerCase() === 'video' && (
                                                <div className="absolute top-1 right-1">
                                                    <Play size={8} className="text-fatale" />
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <div
                                            onClick={() => setShowGlobalIngest && setShowGlobalIngest(true)}
                                            className="col-span-full border border-dashed border-white/20 p-6 flex flex-col items-center justify-center cursor-pointer hover:border-fatale/60 hover:bg-fatale/5 transition-all group"
                                        >
                                            <Camera size={20} className="opacity-40 group-hover:text-fatale group-hover:opacity-100 mb-2 transition-all" />
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 group-hover:text-fatale group-hover:opacity-100">SIN_TRANSMISIONES_VISUALES</span>
                                            <span className="text-[7px] uppercase tracking-[0.2em] opacity-40 mt-1">[ {t('START_TRANSMISSION')} ]</span>
                                        </div>
                                    )}
                                </div>
                            </HUDWidget>
                        </div>

                        <div className="col-span-3 row-span-2 col-start-10 row-start-5 pointer-events-auto">
                            <HUDWidget title={<span className="cursor-pointer hover:text-fatale transition-colors" onClick={() => setView && setView('feed')}>[ JOURNAL ]</span>} icon={<BookOpen size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="space-y-4">
                                    {filteredJournals.length > 0 ? filteredJournals.map(j => (
                                        <div
                                            key={j.id}
                                            className="border-l border-fatale/10 pl-4 py-2 relative group cursor-pointer hover:bg-white/[0.02] transition-all"
                                            onClick={() => onExpandContent(j, 'journal', { themeColor: '#9d00ff', backgroundColor: '#000000' })}
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-fatale scale-y-0 group-hover:scale-y-100 transition-transform" />
                                            <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase mb-1 tracking-tight">{j.title}</div>
                                            <div className="text-[8px] opacity-30 line-clamp-2 italic font-light leading-relaxed">{j.content?.substring(0, 80)}...</div>
                                            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="text-[7px] text-fatale font-black uppercase">{t('READ_SIGNAL')} {">"}{">"}</div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div
                                            onClick={() => { if (setIngestMode) setIngestMode('JOURNAL'); if (setShowGlobalIngest) setShowGlobalIngest(true); }}
                                            className="border-l-2 border-fatale/20 pl-4 py-4 cursor-pointer hover:border-fatale group transition-all"
                                        >
                                            <div className="text-[10px] font-black text-white/60 group-hover:text-white tracking-widest uppercase mb-1">{t('EMPTY_JOURNAL')}</div>
                                            <div className="text-[8px] opacity-40 group-hover:text-fatale transition-colors">[+] {t('ADD_NEW_ENTRY')}</div>
                                        </div>
                                    )}
                                </div>
                            </HUDWidget>
                        </div>

                        {/* --- BOTTOM CENTER: LIVE STATIONS --- */}
                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-4 lg:row-start-5 pointer-events-auto">
                            <HUDWidget title={<span className="cursor-pointer hover:text-fatale transition-colors" onClick={() => setView && setView('player')}>LIVE!</span>} icon={<Radio size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="space-y-4 max-h-[160px] overflow-y-auto custom-scrollbar-sharp pr-1">
                                    {liveStations.length > 0 ? liveStations.map(c => {
                                        const isFollowed = user && followingIds.includes(String(c.artistUserId || c.ArtistUserId));
                                        return (
                                            <div key={c.id || c.stationId} className="group cursor-pointer border-b border-white/5 pb-2 flex items-center gap-3" onClick={() => {
                                                if (onPlayStation) onPlayStation(c);
                                            }}>
                                                <div className="w-6 h-6 bg-black border border-fatale/30 rounded-full overflow-hidden shrink-0 relative flex items-center justify-center">
                                                    {c.imageUrl || c.ImageUrl ? (
                                                        <img src={getMediaUrl(c.imageUrl || c.ImageUrl)} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=DJ'; }} alt="" />
                                                    ) : (
                                                        <Radio size={12} className="text-fatale" />
                                                    )}
                                                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-black animate-pulse" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <div className="text-[10px] font-black group-hover:text-fatale transition-colors uppercase tracking-tight truncate flex-1">
                                                            {c.artistName || c.ArtistName || c.username || c.Username || 'LIVE DJ'}
                                                        </div>
                                                        {isFollowed && (
                                                            <span className="text-[6px] font-black text-fatale border border-fatale/30 px-1.5 py-[1px] uppercase tracking-widest shrink-0 ml-2 animate-pulse">
                                                                FOLLOWING
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[8px] opacity-30 truncate uppercase tracking-widest">
                                                        {c.sessionTitle || c.SessionTitle || 'LIVE SIGNAL'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="flex flex-col items-center justify-center py-6 opacity-20">
                                            <Radio size={16} className="mb-2 animate-pulse" />
                                            <div className="text-[8px] tracking-widest uppercase text-center px-4">NO_LIVE_TRANSMISSIONS</div>
                                        </div>
                                    )}
                                </div>
                            </HUDWidget>
                        </div>

                        <div className="flex-none lg:col-span-3 lg:row-span-2 lg:col-start-7 lg:row-start-5 pointer-events-auto">
                            <HUDWidget title={<span className="cursor-pointer hover:text-fatale transition-colors" onClick={() => setView && setView('messages')}>COMMUNITIES</span>} icon={<Globe size={14} />} searchQuery={searchQuery} activeColor={activeSectorColor}>
                                <div className="space-y-4">
                                    {/* Create Clique Trigger */}
                                    <div
                                        onClick={() => {
                                            setIsFounding(!isFounding);
                                            setNewClanSector(activeSector);
                                        }}
                                        className="flex items-center gap-2 p-2 border border-dashed border-white/10 hover:border-white/30 cursor-pointer group transition-all"
                                    >
                                        
                                        <span className="text-[9px] font-black tracking-[0.2em] opacity-40 group-hover:opacity-100">{t('::FOUND_CLIQUE')} [+]</span>
                                    </div>

                                    {isFounding && (
                                        <form onSubmit={handleFoundCommunity} className="p-3 bg-white/5 border border-white/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1">
                                                <div className="text-[7px] opacity-40 mono">{t('NAME_REQUIRED')}</div>
                                                <input
                                                    value={newClanName}
                                                    onChange={(e) => setNewClanName(e.target.value)}
                                                    placeholder="..."
                                                    className="w-full bg-black/40 border border-white/10 p-1.5 text-[9px] mono outline-none focus:border-fatale/50"
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
                                                className="w-full bg-fatale/80 hover:bg-fatale text-white text-[8px] font-black py-1.5 rounded-sm transition-all disabled:opacity-20"
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
                                                    <div className="w-8 h-8 rounded-sm bg-fatale/10 border border-fatale/20 flex items-center justify-center shrink-0 relative overflow-hidden">
                                                        {(c.imageUrl || c.ImageUrl || c.profilePicture || c.ProfilePicture) ? (
                                                            <img src={getMediaUrl(c.imageUrl || c.ImageUrl || c.profilePicture || c.ProfilePicture)} alt="" className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                                                        ) : (
                                                            <Globe size={12} className="text-fatale opacity-40 group-hover:opacity-100 transition-opacity" />
                                                        )}
                                                        {(isJoined || followedCommunities.includes(c.id)) && (
                                                            <div className="absolute top-0.5 right-0.5">
                                                                <Star size={10} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[10px] font-black group-hover:text-fatale transition-colors uppercase tracking-tight truncate flex items-center gap-2">
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
                    <div className="flex-1 pointer-events-auto flex flex-col p-4 bg-black/90 border border-fatale/20 rounded-sm mt-4 overflow-y-auto no-scrollbar">
                        {/* NATIVE RESULTS INTEGRATION */}
                        {searchQuery.length >= 2 && (
                            <div className="space-y-6 mb-8 border-b border-white/10 pb-6">
                                {/* Artists */}
                                {filteredArtists.length > 0 && (
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-[#00ffaa] mb-3 tracking-widest flex items-center justify-between">
                                            <span>:: NATIVE_ARTISTS ::</span>
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

                        <div className="text-[10px] font-black uppercase text-fatale mb-4 tracking-widest flex items-center justify-between">
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
                                        <div className="flex gap-1 border-b border-fatale/10 pb-2 overflow-x-auto scrollbar-none" onTouchStart={(e) => e.stopPropagation()}>
                                            {['ALL', 'SONGS', 'ALBUMS', 'ARTISTS'].map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setSelectedSearchCategory(cat)}
                                                    className={`text-[7px] font-black uppercase tracking-[0.1em] px-2 py-1 transition-all shrink-0 ${
                                                        selectedSearchCategory === cat 
                                                            ? 'bg-fatale text-black shadow-[0_0_10px_rgb(var(--theme-primary))]' 
                                                            : 'text-white/40 hover:text-white hover:bg-white/5 border border-white/5'
                                                    }`}
                                                >
                                                    {cat === 'ALL' ? t('ALL') : cat === 'SONGS' ? t('SONGS') : cat === 'ALBUMS' ? t('ALBUMS') : t('ARTISTS')}
                                                </button>
                                            ))}
                                        </div>

                                        {/* TOP ARTIST PROFILE CARD */}
                                        {(selectedSearchCategory === 'ALL' || selectedSearchCategory === 'ARTISTS') && (() => {
                                            const topResult = youtubeResults[0];
                                            return (
                                                <div className="hud-panel p-3 border border-fatale/20 bg-black/60 relative overflow-hidden" onTouchStart={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-3 relative z-10">
                                                        <div className="w-12 h-12 rounded-full overflow-hidden border border-fatale shadow-[0_0_10px_rgb(var(--theme-primary))50] shrink-0 relative bg-black">
                                                            <img 
                                                                src={topResult.thumbnailUrl} 
                                                                className="w-full h-full object-cover"
                                                                alt=""
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-black text-white uppercase tracking-wider truncate">{topResult.author}</div>
                                                            <div className="text-[6px] font-bold text-fatale mono mt-0.5 tracking-widest uppercase">
                                                                NEURAL EMITTER ACTIVE
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 mt-3 relative z-10">
                                                        <button 
                                                            onClick={() => {
                                                                const artistTracks = youtubeResults.filter(trk => trk.author === topResult.author);
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
                                                            <Radio size={8} className="text-fatale" /> RADIO
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* SONGS SECTION */}
                                        {(selectedSearchCategory === 'ALL' || selectedSearchCategory === 'SONGS') && (
                                            <div className="space-y-2" onTouchStart={(e) => e.stopPropagation()}>
                                                {selectedSearchCategory === 'ALL' && (
                                                    <div className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em] mb-1 px-1">:: {t('SONGS')} ::</div>
                                                )}
                                                {(selectedSearchCategory === 'SONGS' ? youtubeResults : youtubeResults.slice(0, 5)).map(y => (
                                                    <div key={y.id} className="flex items-center gap-3 p-2 hover:bg-fatale/10 border border-transparent hover:border-fatale/20 group cursor-pointer transition-all" onClick={() => {
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
                                                    <div className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em] mb-2 px-1">:: {t('ALBUMS')} ::</div>
                                                )}
                                                <div className="grid grid-cols-2 gap-2">
                                                    {uniqueAlbums.map((a, idx) => (
                                                        <div key={idx} className="hud-panel p-1.5 border border-white/5 bg-black/40 hover:border-fatale/40 cursor-pointer group transition-all" onClick={() => {
                                                            const albumTrack = youtubeResults.find(trk => (trk.originalTrack?.album || t.originalTrack?.Album || "").toLowerCase() === a.title.toLowerCase());
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
                                                    <div key={idx} className="flex items-center gap-3 p-2 hover:bg-fatale/10 border border-transparent hover:border-fatale/20 group cursor-pointer transition-all" onClick={() => {
                                                        const artistTrack = youtubeResults.find(trk => trk.author.toLowerCase() === art.name.toLowerCase());
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
                    <div className="flex flex-col gap-6 pointer-events-auto mt-4 flex-1 overflow-y-auto pr-1 pb-16">
                        {/* Playlists */}
                        <div className="space-y-2 border-b border-white/[0.03] pb-2">
                            <div 
                                className="text-[10px] font-black tracking-[0.2em] uppercase text-fatale mb-2 px-1 pb-1 border-b border-fatale/30 flex items-center justify-between cursor-pointer select-none"
                                onClick={() => setCollapsedSections(prev => ({ ...prev, playlists: !prev.playlists }))}
                            >
                                <div className="flex items-center gap-2">
                                    {selectedPlaylist ? <ChevronLeft size={14} className="cursor-pointer hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedPlaylist(null); }} /> : <Music size={14} />}
                                    <span>{selectedPlaylist ? `${t('DESC_PL')}: ${(selectedPlaylist.name || selectedPlaylist.Name || '').toUpperCase()}` : "[ PLAYLISTS ]"}</span>
                                    {!selectedPlaylist && !collapsedSections.playlists && (
                                        <ArrowUpRight 
                                            size={12} 
                                            className="text-fatale/60 hover:text-white transition-all cursor-pointer ml-1 animate-pulse" 
                                            onClick={(e) => { e.stopPropagation(); setView('player'); }} 
                                        />
                                    )}
                                </div>
                                {!selectedPlaylist && (
                                    <span className="text-[8px] opacity-65 font-bold font-mono">{collapsedSections.playlists ? '[ + ]' : '[ - ]'}</span>
                                )}
                            </div>
                            {!collapsedSections.playlists && (
                                <div className="space-y-2">
                                    {selectedPlaylist ? (
                                        loadingPlaylist ? (
                                            <div className="text-[8px] opacity-40 text-center py-4">LOADING...</div>
                                        ) : (
                                            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                                                {playlistTracks.slice(0, 15).length > 0 ? playlistTracks.slice(0, 15).map(trk => (
                                                    <div key={trk.id} className="flex items-center gap-3 p-2 hover:bg-fatale/10 cursor-pointer group" onClick={() => onPlayTrack(trk)}>
                                                        <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-black truncate group-hover:text-fatale uppercase">{trk.title}</div>
                                                            <div className="text-[8px] opacity-30 truncate uppercase">{trk.artist}</div>
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
                                                {userPlaylists.slice(0, 15).length > 0 ? userPlaylists.slice(0, 15).map(p => (
                                                    <div key={p.id || p.Id} className="flex items-center gap-3 p-2.5 hover:bg-fatale/10 border border-transparent hover:border-fatale/20 group cursor-pointer transition-all" onClick={async () => {
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
                                                        <div className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center group-hover:border-fatale/40">
                                                            <Layers size={12} className="text-white/40 group-hover:text-fatale" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                            <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">{p.tracks?.length || 0} SIGNALS</div>
                                                        </div>
                                                        <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )) : (
                                                    <div className="text-[8px] opacity-30 px-2 py-1">NO_PLAYLISTS_CREATED</div>
                                                )}
                                            </div>

                                            {/* Recommended Playlists */}
                                            <div>
                                                <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2">RECOMENDADAS</div>
                                                {trendingPlaylists.slice(0, 15).length > 0 ? trendingPlaylists.slice(0, 15).map(p => (
                                                    <div key={p.id || p.Id} className="flex items-center gap-3 p-2.5 hover:bg-fatale/10 border border-transparent hover:border-fatale/20 group cursor-pointer transition-all" onClick={async () => {
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
                                                        <div className="w-8 h-8 bg-black border border-white/10 flex items-center justify-center group-hover:border-fatale/40">
                                                            <Layers size={12} className="text-white/40 group-hover:text-fatale" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                            <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">BY {p.authorName || p.AuthorName || p.userName || p.UserName || "UNKNOWN"}</div>
                                                        </div>
                                                        <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )) : (
                                                    <div className="text-[8px] opacity-30 px-2 py-1">NO_RECOMMENDATIONS_AVAILABLE</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Feed (Visuals) */}
                        <div className="space-y-2 border-b border-white/[0.03] pb-2">
                            <div 
                                className="text-[10px] font-black tracking-[0.2em] uppercase text-fatale mb-2 px-1 pb-1 border-b border-fatale/30 flex items-center justify-between cursor-pointer select-none"
                                onClick={() => setCollapsedSections(prev => ({ ...prev, feed: !prev.feed }))}
                            >
                                <div className="flex items-center gap-2">
                                    <Camera size={14} />
                                    <span className="hover:text-fatale transition-colors">{t('STUDIO_TRANS')}</span>
                                    {!collapsedSections.feed && (
                                        <ArrowUpRight 
                                            size={12} 
                                            className="text-fatale/60 hover:text-white transition-all cursor-pointer ml-1 animate-pulse" 
                                            onClick={(e) => { e.stopPropagation(); setView('feed'); }} 
                                        />
                                    )}
                                </div>
                                <span className="text-[8px] opacity-65 font-bold font-mono">{collapsedSections.feed ? '[ + ]' : '[ - ]'}</span>
                            </div>
                            {!collapsedSections.feed && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 animate-in fade-in duration-300">
                                    {/* New Post/Track Button */}
                                    <div
                                        onClick={() => { if (setIngestMode) setIngestMode('ALL'); if (setShowGlobalIngest) setShowGlobalIngest(true); }}
                                        className="aspect-square border border-dashed border-fatale/40 flex flex-col items-center justify-center cursor-pointer hover:border-fatale hover:bg-fatale/5 transition-all group"
                                    >
                                        <Plus size={16} className="text-fatale opacity-60 group-hover:opacity-100 mb-1 transition-all" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-fatale opacity-60 group-hover:opacity-100">PUBLICAR</span>
                                    </div>

                                    {filteredVisuals.slice(0, 15).length > 0 ? filteredVisuals.slice(0, 15).map(vis => (
                                        <div
                                            key={vis.id}
                                            className="aspect-square bg-black border border-white/5 relative group cursor-pointer overflow-hidden hover:border-fatale/60 transition-all shadow-xl"
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
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fatale scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                            {(vis.mediaType || vis.MediaType || '').toLowerCase() === 'video' && (
                                                <div className="absolute top-1 right-1">
                                                    <Play size={8} className="text-fatale" />
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <div
                                            onClick={() => setShowGlobalIngest && setShowGlobalIngest(true)}
                                            className="col-span-full border border-dashed border-white/20 p-6 flex flex-col items-center justify-center cursor-pointer hover:border-fatale/60 hover:bg-fatale/5 transition-all group"
                                        >
                                            <Camera size={20} className="opacity-40 group-hover:text-fatale group-hover:opacity-100 mb-2 transition-all" />
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 group-hover:text-fatale group-hover:opacity-100">SIN_TRANSMISIONES_VISUALES</span>
                                            <span className="text-[7px] uppercase tracking-[0.2em] opacity-40 mt-1">[ {t('START_TRANSMISSION')} ]</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Live Stations */}
                        <div className="space-y-2 border-b border-white/[0.03] pb-2">
                            <div 
                                className="text-[10px] font-black tracking-[0.2em] uppercase text-fatale mb-2 px-1 pb-1 border-b border-fatale/30 flex items-center justify-between cursor-pointer select-none"
                                onClick={() => setCollapsedSections(prev => ({ ...prev, stations: !prev.stations }))}
                            >
                                <div className="flex items-center gap-2">
                                    <Radio size={14} />
                                    <span className="hover:text-fatale transition-colors">LIVE!</span>
                                    {!collapsedSections.stations && (
                                        <ArrowUpRight 
                                            size={12} 
                                            className="text-fatale/60 hover:text-white transition-all cursor-pointer ml-1 animate-pulse" 
                                            onClick={(e) => { e.stopPropagation(); setView('player'); }} 
                                        />
                                    )}
                                </div>
                                <span className="text-[8px] opacity-65 font-bold font-mono">{collapsedSections.stations ? '[ + ]' : '[ - ]'}</span>
                            </div>
                            {!collapsedSections.stations && (
                                <div className="space-y-4 max-h-[240px] overflow-y-auto pr-1 animate-in fade-in duration-300">
                                    {liveStations.slice(0, 15).length > 0 ? liveStations.slice(0, 15).map(c => {
                                        const isFollowed = user && followingIds.includes(String(c.artistUserId || c.ArtistUserId));
                                        return (
                                            <div key={c.id || c.stationId} className="group cursor-pointer border-b border-white/5 pb-2 flex items-center gap-3" onClick={() => {
                                                if (onPlayStation) onPlayStation(c);
                                                setMobileViewMode('globe');
                                            }}>
                                                <div className="w-6 h-6 bg-black border border-fatale/30 rounded-full overflow-hidden shrink-0 relative flex items-center justify-center">
                                                    {c.imageUrl || c.ImageUrl ? (
                                                        <img src={getMediaUrl(c.imageUrl || c.ImageUrl)} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=DJ'; }} alt="" />
                                                    ) : (
                                                        <Radio size={12} className="text-fatale" />
                                                    )}
                                                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-black animate-pulse" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <div className="text-[10px] font-black group-hover:text-fatale transition-colors uppercase tracking-tight truncate flex-1">
                                                            {c.artistName || c.ArtistName || c.username || c.Username || 'LIVE DJ'}
                                                        </div>
                                                        {isFollowed && (
                                                            <span className="text-[6px] font-black text-fatale border border-fatale/30 px-1.5 py-[1px] uppercase tracking-widest shrink-0 ml-2 animate-pulse">
                                                                FOLLOWING
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[8px] opacity-30 truncate uppercase tracking-widest">
                                                        {c.sessionTitle || c.SessionTitle || 'LIVE SIGNAL'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="flex flex-col items-center justify-center py-6 opacity-20">
                                            <Radio size={16} className="mb-2 animate-pulse" />
                                            <div className="text-[8px] tracking-widest uppercase text-center px-4">NO_LIVE_TRANSMISSIONS</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Marketplace */}
                        <div className="space-y-2 border-b border-white/[0.03] pb-2">
                            <div 
                                className="text-[10px] font-black tracking-[0.2em] uppercase text-fatale mb-2 px-1 pb-1 border-b border-fatale/30 flex items-center justify-between cursor-pointer select-none"
                                onClick={() => setCollapsedSections(prev => ({ ...prev, marketplace: !prev.marketplace }))}
                            >
                                <div className="flex items-center gap-2">
                                    <Layers size={14} />
                                    <span className="hover:text-fatale transition-colors">{t('SHOP_LNK')}</span>
                                    {!collapsedSections.marketplace && (
                                        <ArrowUpRight 
                                            size={12} 
                                            className="text-fatale/60 hover:text-white transition-all cursor-pointer ml-1 animate-pulse" 
                                            onClick={(e) => { e.stopPropagation(); setView('shopping'); }} 
                                        />
                                    )}
                                </div>
                                <span className="text-[8px] opacity-65 font-bold font-mono">{collapsedSections.marketplace ? '[ + ]' : '[ - ]'}</span>
                            </div>
                            {!collapsedSections.marketplace && (
                                <div className="animate-in fade-in duration-500">
                                    {mobileMarketplaceGrid}
                                </div>
                            )}
                        </div>

                        {/* Journal */}
                        <div className="space-y-2 border-b border-white/[0.03] pb-2">
                            <div 
                                className="text-[10px] font-black tracking-[0.2em] uppercase text-fatale mb-2 px-1 pb-1 border-b border-fatale/30 flex items-center justify-between cursor-pointer select-none"
                                onClick={() => setCollapsedSections(prev => ({ ...prev, journal: !prev.journal }))}
                            >
                                <div className="flex items-center gap-2">
                                    <BookOpen size={14} />
                                    <span className="hover:text-fatale transition-colors">[ JOURNAL ]</span>
                                    {!collapsedSections.journal && (
                                        <ArrowUpRight 
                                            size={12} 
                                            className="text-fatale/60 hover:text-white transition-all cursor-pointer ml-1 animate-pulse" 
                                            onClick={(e) => { e.stopPropagation(); setView('feed'); }} 
                                        />
                                    )}
                                </div>
                                <span className="text-[8px] opacity-65 font-bold font-mono">{collapsedSections.journal ? '[ + ]' : '[ - ]'}</span>
                            </div>
                            {!collapsedSections.journal && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {filteredJournals.slice(0, 15).length > 0 ? filteredJournals.slice(0, 15).map(j => (
                                        <div
                                            key={j.id}
                                            className="border-l border-fatale/10 pl-4 py-2 relative group cursor-pointer hover:bg-white/[0.02] transition-all"
                                            onClick={() => onExpandContent(j, 'journal', { themeColor: '#9d00ff', backgroundColor: '#000000' })}
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-fatale scale-y-0 group-hover:scale-y-100 transition-transform" />
                                            <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase mb-1 tracking-tight">{j.title}</div>
                                            <div className="text-[8px] opacity-35 line-clamp-2 italic font-light leading-relaxed">{j.content?.substring(0, 80)}...</div>
                                        </div>
                                    )) : (
                                        <div className="border-l-2 border-fatale/20 pl-4 py-4 opacity-40">
                                            <div className="text-[10px] font-black uppercase mb-1">{t('EMPTY_JOURNAL')}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Communities */}
                        <div className="space-y-2 border-b border-white/[0.03] pb-2">
                            <div 
                                className="text-[10px] font-black tracking-[0.2em] uppercase text-fatale mb-2 px-1 pb-1 border-b border-fatale/30 flex items-center justify-between cursor-pointer select-none"
                                onClick={() => setCollapsedSections(prev => ({ ...prev, communities: !prev.communities }))}
                            >
                                <div className="flex items-center gap-2">
                                    <Globe size={14} />
                                    <span className="hover:text-fatale transition-colors">COMMUNITIES</span>
                                    {!collapsedSections.communities && (
                                        <ArrowUpRight 
                                            size={12} 
                                            className="text-fatale/60 hover:text-white transition-all cursor-pointer ml-1 animate-pulse" 
                                            onClick={(e) => { e.stopPropagation(); setView('messages'); }} 
                                        />
                                    )}
                                </div>
                                <span className="text-[8px] opacity-65 font-bold font-mono">{collapsedSections.communities ? '[ + ]' : '[ - ]'}</span>
                            </div>
                            {!collapsedSections.communities && (
                                <div className="space-y-3 animate-in fade-in duration-300">
                                    {filteredCommunities.slice(0, 15).map(c => {
                                        const isJoined = (user?.communityId || user?.CommunityId) === c.id;
                                        return (
                                            <div key={c.id} className="flex items-center gap-3 p-2 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group cursor-pointer" onClick={() => {
                                                if (onMessageCommunity) {
                                                    onMessageCommunity(c);
                                                } else {
                                                    setActiveTerminalCommunity(c);
                                                }
                                            }}>
                                                <div className="w-8 h-8 rounded-sm bg-fatale/10 border border-fatale/20 flex items-center justify-center shrink-0 relative overflow-hidden">
                                                    {(c.imageUrl || c.ImageUrl || c.profilePicture || c.ProfilePicture) ? (
                                                        <img src={getMediaUrl(c.imageUrl || c.ImageUrl || c.profilePicture || c.ProfilePicture)} alt="" className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                                                    ) : (
                                                        <Globe size={12} className="text-fatale opacity-40 group-hover:opacity-100 transition-opacity" />
                                                    )}
                                                    {(isJoined || followedCommunities.includes(c.id)) && (
                                                        <div className="absolute top-0.5 right-0.5">
                                                            <Star size={10} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[10px] font-black group-hover:text-fatale transition-colors uppercase tracking-tight truncate flex items-center gap-2">
                                                        {c.name}
                                                        {isJoined && <span className="text-[7px] text-yellow-400/60 mono font-normal border border-yellow-400/20 px-1">{t('HOME')}</span>}
                                                    </div>
                                                    <div className="text-[7px] opacity-35 tracking-[0.2em] font-light uppercase mt-0.5">{c.memberCount || 0} {t('CLIQUE_AGENTS')}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Artists */}
                        <div className="space-y-2 border-b border-white/[0.03] pb-2">
                            <div 
                                className="text-[10px] font-black tracking-[0.2em] uppercase text-fatale mb-2 px-1 pb-1 border-b border-fatale/30 flex items-center justify-between cursor-pointer select-none"
                                onClick={() => setCollapsedSections(prev => ({ ...prev, artists: !prev.artists }))}
                            >
                                <div className="flex items-center gap-2">
                                    <User size={14} />
                                    <span className="hover:text-fatale transition-colors">NATIVE_ARTISTS</span>
                                    {!collapsedSections.artists && (
                                        <ArrowUpRight 
                                            size={12} 
                                            className="text-fatale/60 hover:text-white transition-all cursor-pointer ml-1 animate-pulse" 
                                            onClick={(e) => { e.stopPropagation(); setView('profile'); }} 
                                        />
                                    )}
                                </div>
                                <span className="text-[8px] opacity-65 font-bold font-mono">{collapsedSections.artists ? '[ + ]' : '[ - ]'}</span>
                            </div>
                            {!collapsedSections.artists && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-2 pt-2 animate-in fade-in duration-300">
                                    {filteredArtists.slice(0, 15).map(a => (
                                        <div key={a.id} className="flex flex-col items-center gap-3 group cursor-pointer" onClick={() => navigateToProfile(a.userId)}>
                                            <div className="relative w-14 h-14">
                                                <div className="absolute inset-0 rounded-full border border-fatale/20 group-hover:border-fatale/60 transition-colors" />
                                                <div className="absolute inset-[-4px] rounded-full border border-dashed border-fatale/10 group-hover:ring-1 group-hover:ring-fatale/20 group-hover:animate-spin transition-all duration-[3000ms]" />

                                                <div className="absolute inset-[4px] rounded-full overflow-hidden border-2 border-black z-10 bg-black">
                                                    <img src={getMediaUrl(a.profilePicture || a.ProfilePicture || a.imageUrl || a.ImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all scale-110 group-hover:scale-100" />
                                                </div>

                                                <div className="absolute inset-0 z-20 pointer-events-none rounded-full bg-gradient-to-tr from-fatale/30 via-transparent to-transparent animate-spin opacity-0 group-hover:opacity-100" style={{ animationDuration: '2s' }} />
                                            </div>
                                            <span className="text-[8px] text-center truncate w-full uppercase font-black tracking-widest opacity-40 group-hover:opacity-100 group-hover:text-fatale transition-all">{a.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>

            <AnimatePresence>
                {showSystemGuide && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center p-4 md:p-8 pointer-events-auto"
                        onClick={() => setShowSystemGuide(false)}
                    >
                        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-10" />

                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="w-full max-w-3xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto bg-[#020202] border border-[#b39ddb]/60 p-5 md:p-8 relative rounded-sm flex flex-col gap-5 md:gap-6 z-20 custom-scrollbar shadow-[0_0_50px_rgba(179,157,219,0.25)]"
                            onClick={(e) => e.stopPropagation()}
                            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 12px))' }}
                        >
                            {/* Tech corners - Lavender */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#b39ddb]" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#b39ddb]" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#b39ddb]" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#b39ddb]" />

                            <div className="flex justify-between items-center border-b border-[#b39ddb]/20 pb-4">
                                <div>
                                    <div className="text-[10px] font-black text-[#b39ddb] tracking-[0.3em] font-mono">// SYSTEM_GUIDE_TERMINAL</div>
                                    <div className="text-white/40 text-[8px] font-mono mt-0.5 uppercase tracking-widest">FATALE CORE // INTERACTION MANUAL</div>
                                </div>
                                <button
                                    onClick={() => setShowSystemGuide(false)}
                                    className="text-white/40 hover:text-[#b39ddb] transition-colors border border-white/10 hover:border-[#b39ddb]/50 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest rounded-sm"
                                >
                                    [ CLOSE ]
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 text-white/90 font-sans text-[11px] leading-relaxed pb-4">
                                <div className="space-y-5">
                                    <div className="border-b border-white/5 pb-1">
                                        <span className="text-[#8c62d1] font-black font-mono uppercase tracking-wider">// CORE HUD INTERFACE</span>
                                    </div>
                                    <ul className="space-y-3.5 list-none pl-0">
                                        <li className="flex gap-2">
                                            <span className="text-[#b39ddb] shrink-0 font-mono">■</span>
                                            <div>
                                                <strong className="text-[#b39ddb] font-mono uppercase tracking-wide mr-1 underline underline-offset-[3px] decoration-[#b39ddb]/50">YT FREQ SCAN:</strong> Search and play any song directly from YouTube.
                                            </div>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[#b39ddb] shrink-0 font-mono">■</span>
                                            <div>
                                                <strong className="text-[#b39ddb] font-mono uppercase tracking-wide mr-1 underline underline-offset-[3px] decoration-[#b39ddb]/50">NATIVE_ARTISTS:</strong> View profiles of artists who upload and release music directly on the platform.
                                            </div>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[#b39ddb] shrink-0 font-mono">■</span>
                                            <div>
                                                <strong className="text-[#b39ddb] font-mono uppercase tracking-wide mr-1 underline underline-offset-[3px] decoration-[#b39ddb]/50">[ MARKETPLACE ]:</strong> Buy digital collectibles, browse online stores, and explore artist gear.
                                            </div>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[#b39ddb] shrink-0 font-mono">■</span>
                                            <div>
                                                <strong className="text-[#b39ddb] font-mono uppercase tracking-wide mr-1 underline underline-offset-[3px] decoration-[#b39ddb]/50">STUDIO TRANSMISSIONS:</strong> Explore photos, videos, and studio updates shared by artists.
                                            </div>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[#b39ddb] shrink-0 font-mono">■</span>
                                            <div>
                                                <strong className="text-[#b39ddb] font-mono uppercase tracking-wide mr-1 underline underline-offset-[3px] decoration-[#b39ddb]/50">[ JOURNAL ]:</strong> Read blog posts, personal logs, and text updates from artists.
                                            </div>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[#b39ddb] shrink-0 font-mono">■</span>
                                            <div>
                                                <strong className="text-[#b39ddb] font-mono uppercase tracking-wide mr-1 underline underline-offset-[3px] decoration-[#b39ddb]/50">LIVE!:</strong> Tune in and listen to active live streams and DJ broadcasts.
                                            </div>
                                        </li>
                                    </ul>
                                </div>

                                <div className="space-y-5">
                                    <div className="border-b border-white/5 pb-1">
                                        <span className="text-[#8c62d1] font-black font-mono uppercase tracking-wider">// SIGNAL NAVIGATION</span>
                                    </div>
                                    <ul className="space-y-3.5 list-none pl-0">
                                        <li className="flex gap-2">
                                            <span className="text-[#b39ddb] shrink-0 font-mono">■</span>
                                            <div>
                                                <strong className="text-[#b39ddb] font-mono uppercase tracking-wide mr-1 underline underline-offset-[3px] decoration-[#b39ddb]/50">INTERACTIVE GLOBE:</strong> Drag to spin the 3D globe. Click colored nodes to view tracks, artists, or groups. Use the filters on the right to toggle what you see.
                                            </div>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[#b39ddb] shrink-0 font-mono">■</span>
                                            <div>
                                                <strong className="text-[#b39ddb] font-mono uppercase tracking-wide mr-1 underline underline-offset-[3px] decoration-[#b39ddb]/50">COMMUNITIES:</strong> Find fan groups or start your own in your current sector.
                                            </div>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-[#b39ddb] shrink-0 font-mono">■</span>
                                            <div>
                                                <strong className="text-[#b39ddb] font-mono uppercase tracking-wide mr-1 underline underline-offset-[3px] decoration-[#b39ddb]/50">SKULL MENU:</strong> Click the skull icon in the top-left to open the main menu to view your Profile, Wallet balance, Messages, and Settings, etc.
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="border-t border-white/5 pt-4 text-[7px] text-white/20 font-mono tracking-widest flex justify-between">
                                <span>SEC_LOG_VER_4.19</span>
                                <span>FATALE NETWORKS // SYSTEM ONLINE</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- SCANLINE OVERLAY --- */}
            <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] select-none overflow-hidden h-screen w-screen">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
            </div>
        </div>
    );
};

export default DiscoveryHUD;
