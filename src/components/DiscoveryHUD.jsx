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

const DiscoveryHUD = ({ user, setView, followedCommunities = [], onFollowUpdate, setUser, navigateToProfile, onPlayTrack, onPlayPlaylist, isPlayerActive, onExpandContent, onPlayStation, isLandscape, setShowGlobalIngest, setIngestMode, onMessageCommunity, onDownload, onTipArtist, onLogout, hasNewMessages, lowSpecMode }) => {
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
    const [guidePage, setGuidePage] = useState(0);
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
    const [isPinterestView, setIsPinterestView] = useState(() => localStorage.getItem('fatale_low_spec') === 'true');
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

    const filteredUserPlaylists = useMemo(() => {
        let base = userPlaylists;
        if (searchQuery) {
            base = base.filter(p => (p.name || p.Name || '').toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return base;
    }, [userPlaylists, searchQuery]);

    const filteredTrendingPlaylists = useMemo(() => {
        let base = trendingPlaylists;
        if (searchQuery) {
            base = base.filter(p => (p.name || p.Name || '').toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return base;
    }, [trendingPlaylists, searchQuery]);



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
                    <div key={item.id || item.Id || `mk-${index}`} className="relative aspect-square border border-colorBorder/30 group cursor-pointer overflow-hidden bg-black" onClick={() => {
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



                        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5 bg-black/70 p-2 backdrop-blur-sm border border-colorBorder/30 group-hover:border-fatale/20 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                            <div className="text-[9px] font-black truncate group-hover:text-fatale uppercase tracking-tight text-colorDataPrimary transition-colors">
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
                            <div className="text-[7px] text-colorLabel uppercase tracking-widest font-mono">
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
                    <div key={item.id || item.Id || `dk-${index}`} className="relative aspect-square border border-colorBorder/30 group cursor-pointer overflow-hidden bg-black" onClick={() => {
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



                        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-0.5 bg-black/70 p-2 backdrop-blur-sm border border-colorBorder/30 group-hover:border-fatale/20 transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                            <div className="text-[9px] font-black truncate group-hover:text-fatale uppercase tracking-tight text-colorDataPrimary transition-colors">
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
                            <div className="text-[7px] text-colorLabel uppercase tracking-widest font-mono">
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
            className="relative w-full h-full overflow-y-auto lg:overflow-hidden bg-[#020202] text-colorDataPrimary font-mono flex flex-col p-4 select-none no-scrollbar"
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
            <div className="z-[1000] flex flex-row items-center justify-between gap-4 mb-4 px-2 relative w-full">

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
                                className="fixed inset-0 bg-black z-[9999] flex items-center justify-center pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)] px-3 md:p-8 pointer-events-auto"
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
                                    <div className="flex justify-between items-center border-b border-colorBorder/30 pb-3 md:pb-4">
                                        <div>
                                            <div className="text-colorLabel text-[8px] md:text-[9px] font-mono mt-0.5 uppercase tracking-widest">USER: {user?.username || 'NEURAL_USER'} · STATUS: ACTIVE</div>
                                        </div>
                                        <button
                                            onClick={() => setShowSkullMenu(false)}
                                            className="text-colorLabel hover:text-fatale transition-colors border border-colorBorder/30 hover:border-fatale/50 px-2 md:px-3 py-1 md:py-1.5 text-[8px] md:text-[9px] font-mono uppercase tracking-widest rounded-sm"
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
                                                className={`group text-left p-2 md:p-4 bg-white/[0.012] border border-colorBorder/30 hover:border-fatale hover:shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.4)] hover:bg-fatale/5 transition-all flex items-center gap-2 md:gap-4 relative overflow-hidden active:scale-[0.98] rounded-sm min-w-0 ${node.id === 'settings' ? 'col-span-2 justify-self-center w-full md:w-[calc(50%-0.5rem)]' : ''}`}
                                            >
                                                <div className="p-1.5 md:p-3 bg-black border border-colorBorder/30 text-colorLabel group-hover:text-fatale group-hover:border-fatale/30 transition-all shrink-0">
                                                    {node.icon}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-white/80 group-hover:text-colorDataPrimary transition-colors flex items-center gap-1.5 truncate">
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
                                    <div className="border-t border-colorBorder/30 pt-3 md:pt-4 flex justify-between items-center">
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
                            className="p-2 text-fatale hover:text-colorDataPrimary transition-colors self-center lg:hidden"
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
                                        className="absolute right-3 text-white/20 hover:text-colorDataPrimary transition-colors"
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
                className={`flex-1 relative flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-6 gap-6 lg:gap-4 pointer-events-none mt-4 ${isPlayerActive ? 'pb-14 lg:pb-16' : 'pb-20 lg:pb-0'} min-h-0`}
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
                        <div className={`absolute inset-0 w-full h-full bg-black/95 backdrop-blur-xl border border-colorBorder/30 p-5 pt-28 overflow-y-auto no-scrollbar transition-all duration-500 pointer-events-auto ${isPinterestView ? 'opacity-100 visible z-20' : 'opacity-0 invisible pointer-events-none -z-10'}`}>
                            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-fatale mb-6 border-b border-fatale/20 pb-2 pl-14 md:pl-16">DISCOVERED_SIGNALS</div>

                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {/* Playlists */}
                                {trendingPlaylists.slice(0, 4).map(p => (
                                    <div key={p.id || p.Id} className="aspect-square bg-black border border-colorBorder/30 hover:border-fatale/40 group cursor-pointer transition-all flex flex-col justify-between p-4 relative overflow-hidden" onClick={() => onPlayTrack(p)}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                        <div className="text-[8px] font-mono text-fatale uppercase tracking-widest">PLAYLIST</div>
                                        <div className="z-10">
                                            <div className="text-xs font-black truncate group-hover:text-fatale uppercase">{p.name || p.Name}</div>
                                            <div className="text-[8px] text-colorDataSecondary uppercase mt-0.5">BY {p.authorName || p.AuthorName || p.userName || p.UserName || "UNKNOWN"}</div>
                                        </div>
                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play size={16} fill="rgb(var(--theme-primary))" className="text-fatale" />
                                        </div>
                                    </div>
                                ))}

                                {/* Tracks */}
                                {trendingTracks.slice(0, 6).map(trk => (
                                    <div key={trk.id} className="aspect-square bg-black border border-colorBorder/30 hover:border-fatale/40 group cursor-pointer transition-all flex flex-col justify-between p-4 relative overflow-hidden" onClick={() => onPlayTrack(trk)}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                        <div className="absolute inset-0">
                                            <img src={getMediaUrl(trk.imageUrl || trk.ImageUrl || trk.coverImageUrl || trk.CoverImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700" />
                                        </div>
                                        <div className="text-[8px] font-mono text-secondary uppercase tracking-widest z-10">SONG</div>
                                        <div className="z-10">
                                            <div className="text-xs font-black truncate group-hover:text-fatale uppercase">{trk.title}</div>
                                            <div className="text-[8px] text-colorDataSecondary uppercase mt-0.5">BY {trk.artist}</div>
                                        </div>
                                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <Play size={16} fill="rgb(var(--theme-primary))" className="text-fatale" />
                                        </div>
                                    </div>
                                ))}

                                {/* Artists */}
                                {trendingArtists.slice(0, 4).map(a => (
                                    <div key={a.id} className="aspect-square bg-black border border-colorBorder/30 hover:border-fatale/40 group cursor-pointer transition-all flex flex-col justify-between p-4 relative overflow-hidden" onClick={() => navigateToProfile(a.userId)}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                        <div className="absolute inset-0">
                                            <img src={getMediaUrl(a.profilePicture || a.ProfilePicture || a.imageUrl || a.ImageUrl)} alt="" className="w-full h-full object-cover grayscale opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700" />
                                        </div>
                                        <div className="text-[8px] font-mono text-[#9d00ff] uppercase tracking-widest z-10">ARTIST</div>
                                        <div className="z-10">
                                            <div className="text-xs font-black truncate group-hover:text-fatale uppercase">{a.name}</div>
                                            <div className="text-[8px] text-colorDataSecondary uppercase mt-0.5">{a.genre || "NATIVE"}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Globe View */}
                        <div className={`w-full h-full ${activeTerminalCommunity ? 'hidden' : 'flex'} items-center justify-center p-4 transition-all duration-500 ${isPinterestView ? 'opacity-0 invisible pointer-events-none -z-10' : 'opacity-100 visible z-10 pointer-events-auto'}`}>
                            {!isPinterestView && (
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
                            )}
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
                className="relative bg-black/96 backdrop-blur-xl border border-colorBorder/30 p-3"
                style={{ width: '220px', boxShadow: '0 0 40px rgba(0,0,0,0.85)' }}
            >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-colorBorder/30" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-colorBorder/30" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-colorBorder/30" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-colorBorder/30" />

                {/* Identity row */}
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-9 h-9 border border-colorBorder/30 overflow-hidden shrink-0 bg-black">
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
                        <div className="text-[10px] font-black uppercase tracking-tight truncate text-colorDataPrimary leading-none">
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
                        className="text-white/20 hover:text-colorDataPrimary transition-colors shrink-0"
                    >
                        <X size={11} />
                    </button>
                </div>

                {/* Single action */}
                {selectedGlobeItem.type === 'artist' && (
                    <button
                        onClick={() => navigateToProfile(selectedGlobeItem.userId || selectedGlobeItem.UserId)}
                        className="w-full border border-colorBorder/30 text-colorLabel hover:border-colorBorder/30 hover:text-colorDataPrimary py-1.5 text-[7px] font-black tracking-[0.3em] uppercase transition-all"
                    >
                        VIEW PROFILE
                    </button>
                )}
                {selectedGlobeItem.type === 'community' && (
                    <button
                        onClick={() => setActiveTerminalCommunity(selectedGlobeItem)}
                        className="w-full border border-colorBorder/30 text-colorLabel hover:border-colorBorder/30 hover:text-colorDataPrimary py-1.5 text-[7px] font-black tracking-[0.3em] uppercase transition-all"
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
                                            className={`flex items-center justify-center w-10 h-10 rounded-sm border transition-all duration-300 ${isGlobeSpinning ? 'bg-[#8c62d1]/10 border-[#8c62d1] text-[#8c62d1] shadow-[0_0_15px_rgba(140,98,209,0.2)]' : 'bg-black/40 border-colorBorder/30 text-colorLabel hover:border-[#8c62d1]/40 hover:text-[#8c62d1]'}`}
                                            title={isGlobeSpinning ? t('PAUSE_SPIN') : t('START_SPIN')}
                                        >
                                            {isGlobeSpinning ? <Pause size={14} /> : <Play size={14} />}
                                        </button>
                                    )}
                                    {!lowSpecMode && (
                                        <button
                                            onClick={() => setIsPinterestView(!isPinterestView)}
                                            className={`flex items-center justify-center w-10 h-10 rounded-sm border transition-all duration-300 ${isPinterestView ? 'bg-fatale/10 border-fatale text-fatale' : 'bg-black/40 border-colorBorder/30 text-colorLabel'}`}
                                            title={isPinterestView ? "View 3D Map" : "View Grid"}
                                        >
                                            {isPinterestView ? <Globe size={14} /> : <Grid size={14} />}
                                        </button>
                                    )}
                                </div>

                                {/* Guide Button - Bottom Left Corner of Globe Terminal */}
                                <div className="absolute bottom-4 left-4 z-50 scale-75 lg:scale-100">
                                    <button
                                        onClick={() => setShowSystemGuide(true)}
                                        className="flex items-center justify-center w-10 h-10 rounded-sm border bg-[#020202] border-[#b39ddb]/30 text-colorLabel hover:border-[#b39ddb] hover:text-[#b39ddb] transition-all duration-300 shadow-[0_0_10px_rgba(179,157,219,0.15)] hover:shadow-[0_0_20px_rgba(179,157,219,0.3)]"
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
                                                className={`flex flex-col items-end gap-1 px-3 py-2 rounded-sm border transition-all duration-300 group ${activeGlobeView === v.id ? 'bg-[#ff7096]/10 border-[#ff7096] text-[#ff7096] shadow-[0_0_15px_rgba(255,112,150,0.25)]' : 'bg-black/40 border-colorBorder/30 text-colorLabel hover:border-[#ff7096]/40 hover:text-colorDataPrimary'}`}
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
                                        <div key={y.id} className="flex items-center gap-4 p-2.5 hover:bg-colorDataPrimary/10 border border-transparent hover:border-colorBorder group cursor-pointer transition-all" onClick={() => {
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
                                            <div className="w-12 h-12 bg-black overflow-hidden relative border border-colorBorder/30 group-hover:border-fatale/40 shadow-lg">
                                                <img
                                                    src={y.thumbnailUrl || y.ThumbnailUrl || y.coverImageUrl || y.CoverImageUrl || (y.id ? `https://img.youtube.com/vi/${y.id}/hqdefault.jpg` : null)}
                                                    alt=""
                                                    className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                                />
                                                <div className="absolute inset-0 bg-fatale/10 mix-blend-overlay group-hover:opacity-0" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-black truncate group-hover:text-colorDataPrimary transition-colors uppercase tracking-tight">{y.title}</div>
                                                <div className="text-[8px] opacity-60 text-colorDataSecondary truncate uppercase font-bold tracking-[0.2em] mt-0.5">{y.author}</div>
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
                                                <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 text-colorLabel">{t('YOUTUBE_CACHE')}</div>
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
                                                    className="text-[7px] font-bold text-colorLabel/60 hover:text-colorDataPrimary transition-all uppercase tracking-wider bg-transparent cursor-pointer"
                                                >
                                                    [ {t('CLEAR')} ]
                                                </button>
                                            </div>
                                            {recentYoutubeTracks.map(y => (
                                                <div key={y.id} className="flex items-center gap-4 p-2.5 hover:bg-colorDataPrimary/10 border border-transparent hover:border-colorBorder group cursor-pointer transition-all" onClick={() => {
                                                    onPlayTrack(y);
                                                }}>
                                                    <div className="w-10 h-10 bg-black overflow-hidden relative border border-colorBorder/30 group-hover:border-colorBorder shadow-lg">
                                                        <img
                                                            src={y.thumbnailUrl || `https://img.youtube.com/vi/${y.id}/hqdefault.jpg`}
                                                            alt=""
                                                            className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-colorDataPrimary transition-colors uppercase tracking-tight">{y.title}</div>
                                                        <div className="text-[8px] opacity-60 text-colorDataSecondary truncate uppercase font-bold tracking-[0.2em] mt-0.5">{y.author}</div>
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
                                                    <Search size={10} className="text-colorLabel group-hover:text-fatale" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase tracking-tight">{s}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full opacity-40 py-10 text-center px-4 group">
                                            <div className="w-8 h-8 border border-colorBorder/30 rounded-full flex items-center justify-center mb-3 group-hover:border-fatale group-hover:text-fatale transition-all animate-pulse">
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
                                icon={selectedPlaylist ? <ChevronLeft size={14} className="cursor-pointer hover:text-colorDataPrimary transition-colors" onClick={() => setSelectedPlaylist(null)} /> : <Music size={14} />}
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
                                    <>
                                        {/* User Playlists */}
                                        <div>
                                            <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2 text-colorLabel">{t('YOUR_PLAYLISTS')}</div>
                                            {filteredUserPlaylists.length > 0 ? filteredUserPlaylists.map(p => (
                                                <div key={p.id || p.Id} className="flex items-center gap-3 p-2.5 hover:bg-colorDataPrimary/10 border border-transparent hover:border-colorBorder group cursor-pointer transition-all" onClick={async () => {
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
                                                    <div className="w-8 h-8 bg-black border border-colorBorder/30 flex items-center justify-center group-hover:border-colorBorder">
                                                        <Layers size={12} className="text-colorLabel group-hover:text-colorDataPrimary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-colorDataPrimary transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                        <div className="text-[8px] opacity-60 truncate uppercase font-bold tracking-[0.2em] mt-0.5 text-colorDataSecondary">{p.tracks?.length || 0} SIGNALS</div>
                                                    </div>
                                                    <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )) : (
                                                <div className="text-[8px] opacity-30 px-2 py-1">{t('NO_PLAYLISTS_CREATED')}</div>
                                            )}
                                        </div>

                                        {/* Recommended Playlists */}
                                        <div>
                                            <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2 text-colorLabel">{t('RECOMMENDED')}</div>
                                            {filteredTrendingPlaylists.length > 0 ? filteredTrendingPlaylists.map(p => (
                                                <div key={p.id || p.Id} className="flex items-center gap-3 p-2.5 hover:bg-colorDataPrimary/10 border border-transparent hover:border-colorBorder group cursor-pointer transition-all" onClick={async () => {
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
                                                    <div className="w-8 h-8 bg-black border border-colorBorder/30 flex items-center justify-center group-hover:border-colorBorder">
                                                        <Layers size={12} className="text-colorLabel group-hover:text-colorDataPrimary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-black truncate group-hover:text-colorDataPrimary transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                        <div className="text-[8px] opacity-60 truncate uppercase font-bold tracking-[0.2em] mt-0.5 text-colorDataSecondary">BY {p.authorName || p.AuthorName || p.userName || p.UserName || "UNKNOWN"}</div>
                                                    </div>
                                                    <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            )) : (
                                                <div className="text-[8px] opacity-30 px-2 py-1">{t('NO_RECOMMENDATIONS_AVAILABLE')}</div>
                                            )}
                                        </div>
                                    </>
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
                                            className="aspect-square bg-black border border-colorBorder/30 relative group cursor-pointer overflow-hidden hover:border-fatale/60 transition-all shadow-xl"
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
                                            className="col-span-full border border-dashed border-colorBorder/30 p-6 flex flex-col items-center justify-center cursor-pointer hover:border-fatale/60 hover:bg-fatale/5 transition-all group"
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
                                            <div className="text-[10px] font-black text-colorLabel group-hover:text-colorDataPrimary tracking-widest uppercase mb-1">{t('EMPTY_JOURNAL')}</div>
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
                                            <div key={c.id || c.stationId} className="group cursor-pointer border-b border-colorBorder/30 pb-2 flex items-center gap-3" onClick={() => {
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
                                        className="flex items-center gap-2 p-2 border border-dashed border-colorBorder/30 hover:border-colorBorder/30 cursor-pointer group transition-all"
                                    >
                                        
                                        <span className="text-[9px] font-black tracking-[0.2em] opacity-40 group-hover:opacity-100">{t('::FOUND_CLIQUE')} [+]</span>
                                    </div>

                                    {isFounding && (
                                        <form onSubmit={handleFoundCommunity} className="p-3 bg-white/5 border border-colorBorder/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1">
                                                <div className="text-[7px] opacity-40 mono">{t('NAME_REQUIRED')}</div>
                                                <input
                                                    value={newClanName}
                                                    onChange={(e) => setNewClanName(e.target.value)}
                                                    placeholder="..."
                                                    className="w-full bg-black/40 border border-colorBorder/30 p-1.5 text-[9px] mono outline-none focus:border-fatale/50"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[7px] opacity-40 mono">{t('SECTOR_ALLOCATION')}</div>
                                                <select
                                                    value={newClanSector !== null ? newClanSector : (activeSector !== null ? activeSector : 0)}
                                                    onChange={(e) => setNewClanSector(parseInt(e.target.value))}
                                                    className="w-full bg-black/40 border border-colorBorder/30 p-1.5 text-[9px] mono outline-none"
                                                >
                                                    {SECTORS.map(s => (
                                                        <option key={s.id} value={s.id} className="bg-black text-[9px]">{s.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={!newClanName.trim()}
                                                className="w-full bg-fatale/80 hover:bg-fatale text-colorDataPrimary text-[8px] font-black py-1.5 rounded-sm transition-all disabled:opacity-20"
                                            >
                                                {t('ESTABLISH_SIGNAL')}
                                            </button>
                                        </form>
                                    )}

                                    <div className="space-y-3">
                                        {filteredCommunities.map(c => {
                                            const isJoined = (user?.communityId || user?.CommunityId) === c.id;
                                            return (
                                                <div key={c.id} className="flex items-center gap-3 p-2 hover:bg-white/5 border border-transparent hover:border-colorBorder/30 transition-all group cursor-pointer" onClick={() => {
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
                            <div className="space-y-6 mb-8 border-b border-colorBorder/30 pb-6">
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
                                                            : 'text-colorLabel hover:text-colorDataPrimary hover:bg-white/5 border border-colorBorder/30'
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
                                                            <div className="text-[10px] font-black text-colorDataPrimary uppercase tracking-wider truncate">{topResult.author}</div>
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
                                                            className="flex-1 border border-colorBorder/30 text-colorDataPrimary font-black text-[7px] py-1 px-2 transition-all uppercase tracking-widest flex items-center justify-center gap-1"
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
                                                    <div className="text-[8px] font-black text-colorLabel uppercase tracking-[0.3em] mb-1 px-1">:: {t('SONGS')} ::</div>
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
                                                        <div className="w-10 h-10 bg-black overflow-hidden relative border border-colorBorder/30 shrink-0">
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
                                                    <div className="text-[8px] font-black text-colorLabel uppercase tracking-[0.3em] mb-2 px-1">:: {t('ALBUMS')} ::</div>
                                                )}
                                                <div className="grid grid-cols-2 gap-2">
                                                    {uniqueAlbums.map((a, idx) => (
                                                        <div key={idx} className="hud-panel p-1.5 border border-colorBorder/30 bg-black/40 hover:border-fatale/40 cursor-pointer group transition-all" onClick={() => {
                                                            const albumTrack = youtubeResults.find(trk => (trk.originalTrack?.album || t.originalTrack?.Album || "").toLowerCase() === a.title.toLowerCase());
                                                            if (albumTrack) {
                                                                onPlayTrack(albumTrack);
                                                                setMobileViewMode('globe');
                                                            }
                                                        }}>
                                                            <div className="aspect-square w-full bg-black overflow-hidden relative border border-colorBorder/30 mb-1">
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
                                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-colorBorder/30 shrink-0">
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
                        <div className="space-y-2 border-b border-colorBorder/[0.03] pb-2">
                            <div 
                                className="text-[10px] font-black tracking-[0.2em] uppercase text-fatale mb-2 px-1 pb-1 border-b border-fatale/30 flex items-center justify-between cursor-pointer select-none"
                                onClick={() => setCollapsedSections(prev => ({ ...prev, playlists: !prev.playlists }))}
                            >
                                <div className="flex items-center gap-2">
                                    {selectedPlaylist ? <ChevronLeft size={14} className="cursor-pointer hover:text-colorDataPrimary transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedPlaylist(null); }} /> : <Music size={14} />}
                                    <span>{selectedPlaylist ? `${t('DESC_PL')}: ${(selectedPlaylist.name || selectedPlaylist.Name || '').toUpperCase()}` : "[ PLAYLISTS ]"}</span>
                                    {!selectedPlaylist && !collapsedSections.playlists && (
                                        <ArrowUpRight 
                                            size={12} 
                                            className="text-fatale/60 hover:text-colorDataPrimary transition-all cursor-pointer ml-1 animate-pulse" 
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
                                                    <div className="text-[8px] opacity-40 text-center py-4">{t('NO_SIGNALS_FOUND')}</div>
                                                )}
                                            </div>
                                        )
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in duration-500">
                                            {/* User Playlists */}
                                            <div>
                                                <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2">{t('YOUR_PLAYLISTS')}</div>
                                                {filteredUserPlaylists.slice(0, 15).length > 0 ? filteredUserPlaylists.slice(0, 15).map(p => (
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
                                                        <div className="w-8 h-8 bg-black border border-colorBorder/30 flex items-center justify-center group-hover:border-fatale/40">
                                                            <Layers size={12} className="text-colorLabel group-hover:text-fatale" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                            <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">{p.tracks?.length || 0} SIGNALS</div>
                                                        </div>
                                                        <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )) : (
                                                    <div className="text-[8px] opacity-30 px-2 py-1">{t('NO_PLAYLISTS_CREATED')}</div>
                                                )}
                                            </div>

                                            {/* Recommended Playlists */}
                                            <div>
                                                <div className="text-[8px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2 px-2">{t('RECOMMENDED')}</div>
                                                {filteredTrendingPlaylists.slice(0, 15).length > 0 ? filteredTrendingPlaylists.slice(0, 15).map(p => (
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
                                                        <div className="w-8 h-8 bg-black border border-colorBorder/30 flex items-center justify-center group-hover:border-fatale/40">
                                                            <Layers size={12} className="text-colorLabel group-hover:text-fatale" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] font-black truncate group-hover:text-fatale transition-colors uppercase tracking-tight">{p.name || p.Name}</div>
                                                            <div className="text-[8px] opacity-30 truncate uppercase font-bold tracking-[0.2em] mt-0.5">BY {p.authorName || p.AuthorName || p.userName || p.UserName || "UNKNOWN"}</div>
                                                        </div>
                                                        <Play size={10} className="text-fatale opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )) : (
                                                    <div className="text-[8px] opacity-30 px-2 py-1">{t('NO_RECOMMENDATIONS_AVAILABLE')}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Feed (Visuals) */}
                        <div className="space-y-2 border-b border-colorBorder/[0.03] pb-2">
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
                                            className="text-fatale/60 hover:text-colorDataPrimary transition-all cursor-pointer ml-1 animate-pulse" 
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
                                            className="aspect-square bg-black border border-colorBorder/30 relative group cursor-pointer overflow-hidden hover:border-fatale/60 transition-all shadow-xl"
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
                                            className="col-span-full border border-dashed border-colorBorder/30 p-6 flex flex-col items-center justify-center cursor-pointer hover:border-fatale/60 hover:bg-fatale/5 transition-all group"
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
                        <div className="space-y-2 border-b border-colorBorder/[0.03] pb-2">
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
                                            className="text-fatale/60 hover:text-colorDataPrimary transition-all cursor-pointer ml-1 animate-pulse" 
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
                                            <div key={c.id || c.stationId} className="group cursor-pointer border-b border-colorBorder/30 pb-2 flex items-center gap-3" onClick={() => {
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
                        <div className="space-y-2 border-b border-colorBorder/[0.03] pb-2">
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
                                            className="text-fatale/60 hover:text-colorDataPrimary transition-all cursor-pointer ml-1 animate-pulse" 
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
                        <div className="space-y-2 border-b border-colorBorder/[0.03] pb-2">
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
                                            className="text-fatale/60 hover:text-colorDataPrimary transition-all cursor-pointer ml-1 animate-pulse" 
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
                        <div className="space-y-2 border-b border-colorBorder/[0.03] pb-2">
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
                                            className="text-fatale/60 hover:text-colorDataPrimary transition-all cursor-pointer ml-1 animate-pulse" 
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
                                            <div key={c.id} className="flex items-center gap-3 p-2 hover:bg-white/5 border border-transparent hover:border-colorBorder/30 transition-all group cursor-pointer" onClick={() => {
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
                        <div className="space-y-2 border-b border-colorBorder/[0.03] pb-2">
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
                                            className="text-fatale/60 hover:text-colorDataPrimary transition-all cursor-pointer ml-1 animate-pulse" 
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
                {showSystemGuide && (() => {
                    return (
                        <motion.div
                            key="guide-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)] px-4 md:p-8 pointer-events-auto"
                            onClick={() => setShowSystemGuide(false)}
                        >
                            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-10" />

                            <motion.div
                                initial={{ scale: 0.97, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.97, opacity: 0, y: 10 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                                className="w-full max-w-3xl max-h-[90vh] bg-[#020202] border border-[#b39ddb]/60 relative flex flex-col z-20 shadow-[0_0_60px_rgba(179,157,219,0.2)]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Corner accents */}
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#b39ddb]" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#b39ddb]" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#b39ddb]" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#b39ddb]" />

                                {/* Header */}
                                <div className="flex justify-between items-center p-5 md:p-6 border-b border-[#b39ddb]/20 shrink-0">
                                    <div>
                                        <div className="text-[9px] font-black text-[#b39ddb] tracking-[0.35em] font-mono">// FATALE SYSTEM GUIDE</div>
                                        <div className="text-white font-black text-base md:text-lg tracking-[0.15em] font-mono uppercase mt-0.5">user manual</div>
                                    </div>
                                    <button
                                        onClick={() => setShowSystemGuide(false)}
                                        className="text-white/40 hover:text-[#b39ddb] transition-colors border border-white/10 hover:border-[#b39ddb]/50 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest"
                                    >
                                        [ CLOSE ]
                                    </button>
                                </div>

                                {/* Single scrollable document */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <div className="p-5 md:p-8 space-y-10 text-[11px] leading-relaxed font-sans">

                                        {/* ── SECTION 1: WELCOME ── */}
                                        <section>
                                            <div className="text-[9px] font-black text-[#b39ddb]/40 tracking-[0.35em] font-mono mb-1">01 —</div>
                                            <h2 className="text-white font-black text-sm tracking-[0.2em] font-mono uppercase mb-3">hey, welcome to FATALE ♥</h2>
                                            <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3 mb-5">
                                                FATALE is a space built for independent artists — a place where you can share music, write your story, broadcast live, and build a real community around your art. Think of it like a studio, a stage, and a social space all in one.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {[
                                                    { label: 'DISCOVERY HUD', desc: 'Your main home screen — see what\'s trending, browse artists, check journals and visual posts all in one place.' },
                                                    { label: 'LIVE BROADCAST', desc: 'Go live to your community whenever you want. Fans can tune in, chat with you, and request songs in real time.' },
                                                    { label: 'DJ MIXER', desc: 'A full two-deck mixer — load tracks, blend them with a crossfader, and broadcast your mix live.' },
                                                    { label: 'ARTIST PROFILES', desc: 'Your own page on FATALE — music releases, your journal, your gallery, your community. All yours.' },
                                                    { label: 'LOG / JOURNAL', desc: 'A personal diary that your followers can read. Write anything — thoughts, updates, stories, or just drop some photos.' },
                                                    { label: 'PUBLICATIONS & SERIES', desc: 'Want to write something longer? Create a serialized novel, comic, or picture journal. Chapter by chapter, like a real book.' },
                                                    { label: 'SIGNAL FEED', desc: 'Everything from artists you follow in one scrollable stream — posts, photos, videos, journal updates, new chapters.' },
                                                    { label: 'WALLET & CREDITS', desc: 'Send tips to artists you love, buy tracks, and unlock exclusive content. Artists get paid in real time.' },
                                                ].map(item => (
                                                    <div key={item.label} className="flex gap-3 p-3 border border-[#b39ddb]/10 hover:border-[#b39ddb]/30 transition-colors">
                                                        <span className="text-[#b39ddb] font-mono text-[8px] mt-0.5 shrink-0">▸</span>
                                                        <div>
                                                            <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-wider mb-1">{item.label}</div>
                                                            <div className="text-white/50 text-[10px]">{item.desc}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <div className="border-t border-[#b39ddb]/10" />

                                        {/* ── SECTION 2: KEYBOARD SHORTCUTS ── */}
                                        <section>
                                            <div className="text-[9px] font-black text-[#b39ddb]/40 tracking-[0.35em] font-mono mb-1">02 —</div>
                                            <h2 className="text-white font-black text-sm tracking-[0.2em] font-mono uppercase mb-3">keyboard shortcuts</h2>
                                            <p className="text-white/50 text-[10px] mb-4">On desktop, you can jump to any section of FATALE instantly using your function keys. No clicking around — just press and go.</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {[
                                                    { key: 'F1', label: 'Signal Feed', desc: 'Opens your personalized social feed.' },
                                                    { key: 'F2', label: 'Music Player', desc: 'Opens the full audio player view.' },
                                                    { key: 'F3', label: 'DJ Mixer', desc: 'Opens the dual-deck DJ mixing interface.' },
                                                    { key: 'F4', label: 'Messages', desc: 'Opens direct messages and community chat.' },
                                                    { key: 'F5', label: 'Profile', desc: 'Takes you to your artist profile.' },
                                                    { key: 'F6', label: 'Wallet', desc: 'Opens your credits and transaction history.' },
                                                    { key: 'F7', label: 'Communities', desc: 'Browse and manage your communities.' },
                                                    { key: 'F8', label: 'Live', desc: 'Opens the live broadcast and streaming view.' },
                                                    { key: 'F9', label: 'Exit / Close', desc: 'Closes any open modal or overlay.' },
                                                ].map(item => (
                                                    <div key={item.key} className="flex gap-3 items-center p-2.5 border border-white/5 hover:border-[#b39ddb]/20 transition-colors">
                                                        <div className="shrink-0 w-8 h-8 border border-[#b39ddb]/40 flex items-center justify-center font-mono text-[9px] font-black text-[#b39ddb]">{item.key}</div>
                                                        <div>
                                                            <div className="text-white/80 font-mono text-[9px] font-black uppercase tracking-wide">{item.label}</div>
                                                            <div className="text-white/35 text-[9px]">{item.desc}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <div className="border-t border-[#b39ddb]/10" />

                                        {/* ── SECTION 3: DISCOVERY HUD ── */}
                                        <section>
                                            <div className="text-[9px] font-black text-[#b39ddb]/40 tracking-[0.35em] font-mono mb-1">03 —</div>
                                            <h2 className="text-white font-black text-sm tracking-[0.2em] font-mono uppercase mb-3">the discovery hud</h2>
                                            <p className="text-white/50 text-[10px] mb-5">This is the first screen you see when you open FATALE — a live grid of everything happening on the platform right now. Artists, music, journals, visuals, communities — all updating in real time. You can type in the search bar at the top to filter every panel simultaneously.</p>
                                            <div className="space-y-5">
                                                {[
                                                    { panel: 'YT FREQ SCAN', desc: 'The search bar at the top of the HUD. Type any song title or artist name and results stream in instantly from the full music catalog. Click anything to start playing it right away.' },
                                                    { panel: 'NATIVE ARTISTS', desc: 'A grid of artists who release their music directly on FATALE. These are the artists who call this platform home. Click any of them to visit their full profile.' },
                                                    { panel: 'PLAYLISTS', desc: 'Your personal playlists and community-curated ones are shown here side by side. Click any playlist to preview the tracks inside it, or jump straight to the Player to queue it up.' },
                                                    { panel: 'STUDIO TRANSMISSIONS', desc: 'Photos and videos posted by artists — displayed as a square visual grid. Click any tile to open it full-size with comments. This is where visual artists and photographers tend to live.' },
                                                    { panel: '[ JOURNAL ]', desc: 'Text posts and log entries written by artists you follow. Think of these as short notes, diary entries, or longer essays. Click any one to read the full piece in a clean reader view.' },
                                                    { panel: 'MARKETPLACE', desc: 'Merch, digital collectibles, samples, and curated links from artists. Think of it as a storefront window into what artists are selling. Click any item to explore and purchase.' },
                                                    { panel: 'LIVE!', desc: 'A live feed of who\'s currently streaming. Each entry shows the artist name and session title. Click any live session to tune in and join the live chat.' },
                                                    { panel: 'COMMUNITIES', desc: 'Fan groups organized by genre or location. You can browse what\'s happening inside each one, join a community, or create your own.' },
                                                ].map(item => (
                                                    <div key={item.panel} className="flex gap-4 items-start">
                                                        <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                        <div>
                                                            <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-wide underline underline-offset-2 decoration-[#b39ddb]/40 mb-1">{item.panel}</div>
                                                            <p className="text-white/55 text-[10px]">{item.desc}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-5 p-3 bg-[#b39ddb]/5 border border-[#b39ddb]/20 text-[10px] text-white/50 font-mono">
                                                tip: typing in the search bar filters every single panel on the page at once — super useful when you're looking for something specific.
                                            </div>
                                        </section>

                                        <div className="border-t border-[#b39ddb]/10" />

                                        {/* ── SECTION 4: THE GLOBE ── */}
                                        <section>
                                            <div className="text-[9px] font-black text-[#b39ddb]/40 tracking-[0.35em] font-mono mb-1">04 —</div>
                                            <h2 className="text-white font-black text-sm tracking-[0.2em] font-mono uppercase mb-3">the interactive globe</h2>
                                            <p className="text-white/55 text-[10px] mb-3">
                                                Sitting at the center of the Discovery screen is a rotating 3D globe that maps real-time activity across the entire FATALE network. Every glowing dot on the globe represents something happening right now — an artist who's active, a track being played, a community gathering, or a live stream in progress.
                                            </p>
                                            <p className="text-white/55 text-[10px] mb-5">
                                                The globe is organized into color-coded sectors. Content from a given sector glows in that sector's color across all the HUD panels too, so everything stays visually connected. Think of it as a living map of the platform.
                                            </p>
                                            <div className="space-y-3 mb-5">
                                                {[
                                                    { key: 'Drag to Spin', desc: 'Click and drag on the globe to rotate it in any direction. Explore artists and communities from different regions of the world.' },
                                                    { key: 'Click a Node', desc: 'Tap any glowing dot on the globe to see what it is — an artist, a track, a live stream, or a community. A popup will appear with details.' },
                                                    { key: 'View Filters', desc: 'The filter buttons on the side of the globe let you control what types of dots are shown — Tracks, Artists, Communities, Live, and more. Toggle them on and off freely.' },
                                                    { key: 'Global vs. Local', desc: 'Switch between Global View (all nodes on Earth) and Local View (content near your detected location). Great for discovering what\'s happening in your own area.' },
                                                    { key: 'Pause Spin', desc: 'The globe auto-rotates by default. Hit PAUSE_SPIN if you want to freeze it and examine a specific region without it moving away.' },
                                                ].map(item => (
                                                    <div key={item.key} className="flex gap-3 items-start">
                                                        <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">▸</span>
                                                        <div><strong className="text-white/70 font-sans text-[10px]">{item.key} — </strong><span className="text-white/45 text-[10px]">{item.desc}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-[#b39ddb]/5 border border-[#b39ddb]/20 text-[10px] text-white/50 font-mono">
                                                tip: on mobile the globe switches to a scrollable grid layout so it's much easier to tap through everything on a small screen.
                                            </div>
                                        </section>

                                        <div className="border-t border-[#b39ddb]/10" />

                                        {/* ── SECTION 5: MUSIC PLAYER ── */}
                                        <section>
                                            <div className="text-[9px] font-black text-[#b39ddb]/40 tracking-[0.35em] font-mono mb-1">05 —</div>
                                            <h2 className="text-white font-black text-sm tracking-[0.2em] font-mono uppercase mb-3">music player</h2>
                                            <p className="text-white/55 text-[10px] mb-6">
                                                FATALE has three different ways to experience music — the Mini Player for quick casual listening, the DJ Mixer for mixing and live broadcasting, and the iPod-style Player for a clean full-screen listening experience. They all share the same library and queue.
                                            </p>

                                            {/* Mini Player */}
                                            <div className="mb-6">
                                                <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest pb-2 border-b border-[#b39ddb]/20 mb-3 underline underline-offset-2 decoration-[#b39ddb]/40">mini player (bottom bar)</div>
                                                <p className="text-white/50 text-[10px] mb-3">The mini player lives at the very bottom of your screen at all times. It's always accessible no matter where you are in the app — just glance down and your current track is right there.</p>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: 'PLAY / PAUSE', desc: 'Tap to start or pause the track that\'s currently loaded.' },
                                                        { key: 'SKIP', desc: 'Jump forward or backward through your queue.' },
                                                        { key: 'LIKE ♥', desc: 'Save the track to your Favorites so you can find it again later.' },
                                                        { key: '+ (QUEUE)', desc: 'Add the current track to the end of your play queue.' },
                                                        { key: 'VOLUME', desc: 'Drag the slider to adjust how loud it plays.' },
                                                        { key: '$ (TIP)', desc: 'Send some credits straight to the artist while their track is playing — no need to go to their profile.' },
                                                    ].map(item => (
                                                        <div key={item.key} className="flex gap-3 items-start">
                                                            <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                            <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/55 text-[10px]">{item.desc}</span></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* DJ Mixer */}
                                            <div className="mb-6">
                                                <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest pb-2 border-b border-[#b39ddb]/20 mb-3 underline underline-offset-2 decoration-[#b39ddb]/40">dj mixer & live broadcast (F3)</div>
                                                <p className="text-white/50 text-[10px] mb-3">The DJ Mixer is a full professional two-deck setup. Load a track on Deck A and another on Deck B, then blend them together with the crossfader. When you're ready to share your mix, you can go live and your followers hear everything in real time.</p>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: 'SIGNAL CRATE', desc: 'Your music library lives here. Browse all your tracks, favorites, purchased music, by artist, or by playlist. Search to find anything fast.' },
                                                        { key: 'LOAD A / B', desc: 'Each track in the crate has an A and a B chip next to it. Click one to load that track onto that deck.' },
                                                        { key: 'CROSSFADER', desc: 'The horizontal slider at the bottom. Slide left for Deck A, right for Deck B, or blend them anywhere in between.' },
                                                        { key: 'BPM SYNC', desc: 'Each deck shows the track\'s tempo. Use the pitch controls to match BPMs before you blend so the transition sounds smooth.' },
                                                        { key: 'EQ CONTROLS', desc: 'High, Mid, and Low knobs on each deck — shape how each track sounds independently before you mix them.' },
                                                        { key: 'CREATE PLAYLIST', desc: 'Go to the Playlists tab inside the Signal Crate and hit the + button to build a new playlist from your library.' },
                                                        { key: 'LIVE BROADCAST', desc: 'When you go live, everything coming out of the mixer is what your listeners hear. They\'re in the room with you.' },
                                                        { key: 'NEURAL CHAT', desc: 'While you\'re broadcasting, fans can chat with you and send track requests right in the stream.' },
                                                    ].map(item => (
                                                        <div key={item.key} className="flex gap-3 items-start">
                                                            <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                            <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/55 text-[10px]">{item.desc}</span></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* iPod Player */}
                                            <div>
                                                <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest pb-2 border-b border-[#b39ddb]/20 mb-3 underline underline-offset-2 decoration-[#b39ddb]/40">full player view (F2)</div>
                                                <p className="text-white/50 text-[10px] mb-3">Hit F2 or tap the player icon to open the full-screen listening view — a clean, immersive interface centered around the track that's playing. Think of it like the classic iPod screen but built for FATALE's aesthetic. Great for when you just want to sit back and listen.</p>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: 'ALBUM ART', desc: 'The cover art fills the screen. If the artist uploaded artwork for the track or album, it displays here large and beautiful.' },
                                                        { key: 'TRACK INFO', desc: 'Title, artist name, and album shown clearly below the art.' },
                                                        { key: 'PROGRESS BAR', desc: 'Drag it to scrub through the track to any point.' },
                                                        { key: 'QUEUE VIEW', desc: 'Scroll down to see what\'s coming up next in your queue. Reorder or remove tracks from here.' },
                                                        { key: 'LIKE & TIP', desc: 'Like the track to save it, or tip the artist — both available in this view.' },
                                                    ].map(item => (
                                                        <div key={item.key} className="flex gap-3 items-start">
                                                            <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                            <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/55 text-[10px]">{item.desc}</span></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </section>

                                        <div className="border-t border-[#b39ddb]/10" />

                                        {/* ── SECTION 6: MESSAGES ── */}
                                        <section>
                                            <div className="text-[9px] font-black text-[#b39ddb]/40 tracking-[0.35em] font-mono mb-1">06 — F4</div>
                                            <h2 className="text-white font-black text-sm tracking-[0.2em] font-mono uppercase mb-3">messages</h2>
                                            <p className="text-white/55 text-[10px] mb-4">
                                                Messages (F4) is where your direct conversations and community chats live. You can message any artist or fan directly, or participate in community group chats tied to a specific community you've joined.
                                            </p>
                                            <div className="space-y-3">
                                                {[
                                                    { key: 'Direct Messages', desc: 'Start a private one-on-one conversation with any user on FATALE. Click the compose icon or visit someone\'s profile to open a DM.' },
                                                    { key: 'Community Chat', desc: 'Each community has its own group chat. When you join a community, you get access to the chat automatically. Great for discussions, announcements, and hanging out.' },
                                                    { key: 'Live Chat (during streams)', desc: 'When an artist is broadcasting live, a chat panel opens alongside the stream. This is separate from DMs and is visible to all viewers of that stream.' },
                                                    { key: 'Notifications', desc: 'New messages show as a notification badge on the Messages icon. You\'ll also get alerts based on your notification settings.' },
                                                ].map(item => (
                                                    <div key={item.key} className="flex gap-3 items-start">
                                                        <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">▸</span>
                                                        <div><strong className="text-white/70 font-sans text-[10px]">{item.key} — </strong><span className="text-white/45 text-[10px]">{item.desc}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <div className="border-t border-[#b39ddb]/10" />

                                        {/* ── SECTION 7: MARKETPLACE ── */}
                                        <section>
                                            <div className="text-[9px] font-black text-[#b39ddb]/40 tracking-[0.35em] font-mono mb-1">07 — F7</div>
                                            <h2 className="text-white font-black text-sm tracking-[0.2em] font-mono uppercase mb-3">marketplace</h2>
                                            <p className="text-white/55 text-[10px] mb-4">
                                                The Marketplace is where artists sell things beyond just music. You'll find digital collectibles, physical merch, sample packs, exclusive content, and curated links from artists on FATALE. It's a direct connection between creator and buyer.
                                            </p>
                                            <div className="space-y-3">
                                                {[
                                                    { key: 'Browse Items', desc: 'Scroll through items listed by artists. Each listing shows the price, a description, and who it\'s from. Click any item to open the full detail view.' },
                                                    { key: 'Purchase', desc: 'Buy items using your credit balance. Once purchased, digital items are added to your library and physical items are handled through the artist\'s listed process.' },
                                                    { key: 'Artist Listings', desc: 'Artists can create listings directly from their profile. If you\'re an artist, head to your profile and look for the Marketplace or Shop section to add your own items.' },
                                                    { key: 'Discovery HUD Panel', desc: 'The Marketplace panel on the HUD shows a quick preview of recent and trending listings from artists you follow and beyond.' },
                                                ].map(item => (
                                                    <div key={item.key} className="flex gap-3 items-start">
                                                        <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">▸</span>
                                                        <div><strong className="text-white/70 font-sans text-[10px]">{item.key} — </strong><span className="text-white/45 text-[10px]">{item.desc}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <div className="border-t border-[#b39ddb]/10" />

                                        {/* ── SECTION 8: WALLET ── */}
                                        <section>
                                            <div className="text-[9px] font-black text-[#b39ddb]/40 tracking-[0.35em] font-mono mb-1">08 — F6</div>
                                            <h2 className="text-white font-black text-sm tracking-[0.2em] font-mono uppercase mb-3">wallet & credits</h2>
                                            <p className="text-white/55 text-[10px] mb-4">
                                                FATALE has its own credit system. Credits are how fans support artists directly — no middleman, no waiting around. You can tip, buy tracks, purchase marketplace items, and unlock premium features, all using credits.
                                            </p>
                                            <div className="space-y-3 mb-4">
                                                {[
                                                    { key: 'YOUR BALANCE', desc: 'Your credit total is always shown in the Wallet section. Credits are purchased with real money and live in your account ready to use.' },
                                                    { key: 'TIPPING AN ARTIST', desc: 'Send credits to any artist from a post, a track page, or directly from their profile. As much or as little as you want — they receive it instantly.' },
                                                    { key: 'BUYING TRACKS', desc: 'Some artists sell their music. Purchase a track to download it or unlock an exclusive version that isn\'t available for free streaming.' },
                                                    { key: 'TRANSACTION HISTORY', desc: 'Every credit you send or receive is logged in the Wallet section so you always know exactly where it went.' },
                                                    { key: 'EARNINGS (ARTISTS)', desc: 'If you\'re an artist, your earnings panel shows total tips received, track sales, and your running balance. You can also see individual transaction details.' },
                                                    { key: 'SUBSCRIPTION', desc: 'Going premium unlocks higher upload limits, advanced mixer features, and more. Head to Wallet to see current subscription options.' },
                                                ].map(item => (
                                                    <div key={item.key} className="flex gap-3 items-start">
                                                        <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                        <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/55 text-[10px]">{item.desc}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-[#b39ddb]/5 border border-[#b39ddb]/20 text-[10px] text-white/50 font-mono">
                                                tip: artists receive tips the moment you send them — no delay, no processing time. instant.
                                            </div>
                                        </section>

                                        <div className="border-t border-[#b39ddb]/10" />

                                        {/* ── SECTION 9: SETTINGS ── */}
                                        <section>
                                            <div className="text-[9px] font-black text-[#b39ddb]/40 tracking-[0.35em] font-mono mb-1">09 —</div>
                                            <h2 className="text-white font-black text-sm tracking-[0.2em] font-mono uppercase mb-3">settings</h2>
                                            <p className="text-white/55 text-[10px] mb-4">
                                                Settings is where you control everything about your account and how you appear on the platform. Get there by clicking the skull icon in the top left corner and selecting Settings, or pressing the SYS_CONF link in the HUD.
                                            </p>
                                            <div className="space-y-3 mb-4">
                                                {[
                                                    { key: 'IDENTITY', desc: 'Change your display name, write your bio, swap your profile photo, update your banner image, and pick your theme color. This is how you appear to everyone on the platform.' },
                                                    { key: 'SECURITY', desc: 'Update your password and manage your account security from here.' },
                                                    { key: 'NOTIFICATIONS', desc: 'Choose which things send you alerts — new followers, tips received, messages, comments, and more. Customize it down to what actually matters to you.' },
                                                    { key: 'LANGUAGE', desc: 'Switch the whole interface between English, Spanish, Japanese, and Russian. Takes effect immediately.' },
                                                    { key: 'FORCE UPDATE', desc: 'If something feels off — the globe is acting weird, visuals look out of sync — hit Force Update to reset and re-calibrate the interface.' },
                                                    { key: 'LOGOUT', desc: 'Sign out of your account from here or from the skull menu in the top left.' },
                                                ].map(item => (
                                                    <div key={item.key} className="flex gap-3 items-start">
                                                        <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                        <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/55 text-[10px]">{item.desc}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-4 bg-[#b39ddb]/5 border border-[#b39ddb]/30">
                                                <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest mb-2">skull menu quick links</div>
                                                <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-white/40">
                                                    {['PROFILE','WALLET','MESSAGES','MARKETPLACE','SETTINGS','LOGOUT'].map(k => (
                                                        <div key={k} className="border border-white/5 px-2 py-1">▸ {k}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        </section>

                                        <div className="border-t border-[#b39ddb]/10" />

                                        {/* ── SECTION 10: PROFILE / JOURNAL / SERIES ── */}
                                        <section>
                                            <div className="text-[9px] font-black text-[#b39ddb]/40 tracking-[0.35em] font-mono mb-1">10 — F5</div>
                                            <h2 className="text-white font-black text-sm tracking-[0.2em] font-mono uppercase mb-3">your profile, log & publications</h2>
                                            <p className="text-white/55 text-[10px] mb-6">
                                                Your profile is your home on FATALE — it's where everything you make lives. Music, journal entries, visual posts, your series, your community. Fans who follow you can see all of it here. Press F5 or tap the Profile icon to visit it anytime.
                                            </p>

                                            {/* Profile basics */}
                                            <div className="mb-6">
                                                <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest pb-2 border-b border-[#b39ddb]/20 mb-3 underline underline-offset-2 decoration-[#b39ddb]/40">profile basics</div>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: 'MUSIC RELEASES', desc: 'Upload your albums, singles, and tracks. Set prices, organize your catalog, and watch your play counts grow.' },
                                                        { key: 'GALLERY', desc: 'A visual grid of every photo and video you\'ve posted — like your own portfolio page.' },
                                                        { key: 'COMMUNITIES', desc: 'Create your own fan community or join one that already exists. A great way to bring your followers together in one place.' },
                                                        { key: 'HARDWARE RACK', desc: 'Show off your gear and instruments. Fans love seeing the setup behind the music.' },
                                                        { key: 'FOLLOWING / FOLLOWERS', desc: 'Follow other artists to see their content in your feed. Click anyone\'s name anywhere on the platform to visit their profile.' },
                                                        { key: 'MODIFY IDENTITY', desc: 'On your own profile, hit the Modify Identity button to edit how you appear on FATALE.' },
                                                    ].map(item => (
                                                        <div key={item.key} className="flex gap-3 items-start">
                                                            <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                            <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/55 text-[10px]">{item.desc}</span></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Journal / Log */}
                                            <div className="mb-6">
                                                <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest pb-2 border-b border-[#b39ddb]/20 mb-3 underline underline-offset-2 decoration-[#b39ddb]/40">log / journal — your artist diary</div>
                                                <p className="text-white/50 text-[10px] mb-3">
                                                    The Log is basically your artist diary — a place to write whatever's on your mind and share it with your followers. Could be a thought, an update, a poem, an illustrated piece, anything. No rules. No caption required.
                                                </p>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: 'WRITING AN ENTRY', desc: 'Go to your profile, open the Studio / Journal tab, and hit New Entry. You\'ll get a full rich-text editor — bold, italic, headings, lists. Write as much or as little as you want.' },
                                                        { key: 'ADDING IMAGES OR VIDEOS', desc: 'Drop photos and videos right inside your entry using the toolbar. Great for illustrated journals, photo diaries, or purely visual posts.' },
                                                        { key: 'STANDALONE ENTRY', desc: 'A standalone entry is a single post on its own — not connected to any series. Perfect for one-off thoughts or updates.' },
                                                        { key: 'LINKING TO A SERIES', desc: 'If you\'re working on something longer, link the entry to a Series and set the chapter number so readers can follow in order.' },
                                                        { key: 'COVER IMAGE', desc: 'You can add a cover image to any entry. It shows up as a thumbnail on your profile and in the feed — makes it way more eye-catching.' },
                                                        { key: 'PUBLISHING', desc: 'Nothing goes live until you publish it. If you\'re not done, save as a draft and come back later. When you\'re ready, hit Transmit.' },
                                                    ].map(item => (
                                                        <div key={item.key} className="flex gap-3 items-start">
                                                            <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                            <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/55 text-[10px]">{item.desc}</span></div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-3 p-3 bg-[#b39ddb]/5 border border-[#b39ddb]/20 text-[10px] text-white/50 font-mono">
                                                    tip: you can post a quick log entry from anywhere using the [ NEW TRANSMISSION ] button — just pick "Journal / Log" as the type.
                                                </div>
                                            </div>

                                            {/* Publications & Series */}
                                            <div>
                                                <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest pb-2 border-b border-[#b39ddb]/20 mb-3 underline underline-offset-2 decoration-[#b39ddb]/40">publications & series — write your book</div>
                                                <p className="text-white/50 text-[10px] mb-3">
                                                    Series let you publish longer, multi-part work right on FATALE. A novel, a comic, a picture journal, a zine — anything you want to tell chapter by chapter. Your followers can read it like a real book. Cover art is key — it's what readers see first in the feed.
                                                </p>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: 'CREATE A SERIES', desc: 'From the Studio / Journal tab, click "New Series". Give it a name, a short description, and upload a cover image — that cover is what everyone sees.' },
                                                        { key: 'COVER ART', desc: 'This is the front of your book. It shows up as a large card in the feed and on your profile. Make it something that draws people in.' },
                                                        { key: 'ADDING CHAPTERS', desc: 'Write journal entries and link them to the series. Set the chapter number and they stack in order automatically for readers.' },
                                                        { key: 'HOW IT LOOKS IN THE FEED', desc: 'Series appear as book-style cards — big cover art, title, description, and a [ READ ] button. Readers tap that to start from Chapter 1.' },
                                                        { key: 'PICTURE NOVELS & COMICS', desc: 'No text required at all. Make entirely visual chapters by embedding images in the editor. Perfect for comics, manga, photo essays.' },
                                                        { key: 'THE READING EXPERIENCE', desc: 'Readers see a chapter list and can jump to any chapter or read in order. Each chapter opens in a clean full-screen reader.' },
                                                    ].map(item => (
                                                        <div key={item.key} className="flex gap-3 items-start">
                                                            <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                            <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/55 text-[10px]">{item.desc}</span></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </section>

                                        {/* Footer stamp */}
                                        <div className="border-t border-[#b39ddb]/10 pt-6 pb-2 text-center">
                                            <div className="text-[#b39ddb]/20 font-mono text-[8px] tracking-[0.4em] uppercase">FATALE // END OF MANUAL</div>
                                        </div>

                                    </div>
                                </div>

                                {/* Footer — just close button */}
                                <div className="shrink-0 border-t border-[#b39ddb]/20 p-4 flex items-center justify-between">
                                    <div className="text-[8px] font-mono text-white/15 tracking-widest">scroll to read · all sections included</div>
                                    <button
                                        onClick={() => setShowSystemGuide(false)}
                                        className="px-4 py-1.5 border border-[#b39ddb]/30 text-[#b39ddb] hover:bg-[#b39ddb]/10 transition-all text-[10px] font-mono font-black uppercase tracking-widest"
                                    >
                                        [ CLOSE GUIDE ]
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
                    const pages = [
                        {
                            id: 'WELCOME',
                            title: 'hey, welcome to FATALE ♥',
                            subtitle: '// glad you made it',
                            content: (
                                <div className="space-y-5 text-white/80 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/60 font-mono text-[10px] tracking-widest border-l-2 border-[#b39ddb]/50 pl-3">
                                        FATALE is a space built for independent artists — a place where you can share music, write your story, broadcast live, and build a real community around your art. Think of it like a studio, a stage, and a social space all in one.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        {[
                                            { label: 'DISCOVERY HUD', desc: 'Your main home screen — see what\'s trending, browse artists, check journals and visual posts all in one place.' },
                                            { label: 'LIVE BROADCAST', desc: 'Go live to your community whenever you want. Fans can tune in, chat with you, and request songs in real time.' },
                                            { label: 'DJ MIXER', desc: 'A full two-deck mixer — load tracks, blend them with a crossfader, and broadcast your mix live.' },
                                            { label: 'ARTIST PROFILES', desc: 'Your own page on FATALE — music releases, your journal, your gallery, your community. All yours.' },
                                            { label: 'LOG / JOURNAL', desc: 'A personal diary that your followers can read. Write anything — thoughts, updates, stories, or just drop some photos.' },
                                            { label: 'PUBLICATIONS & SERIES', desc: 'Want to write something longer? Create a serialized novel, comic, or picture journal. Chapter by chapter, like a real book.' },
                                            { label: 'SIGNAL FEED', desc: 'Everything from artists you follow in one scrollable stream — posts, photos, videos, journal updates, new chapters.' },
                                            { label: 'WALLET & CREDITS', desc: 'Send tips to artists you love, buy tracks, and unlock exclusive content. Artists get paid in real time.' },
                                        ].map(item => (
                                            <div key={item.label} className="flex gap-3 p-3 border border-[#b39ddb]/10 hover:border-[#b39ddb]/30 transition-colors">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-0.5 shrink-0">▸</span>
                                                <div>
                                                    <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-wider mb-1">{item.label}</div>
                                                    <div className="text-white/50 text-[10px]">{item.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-white/30 font-mono text-[9px] tracking-widest text-center pt-2">tap the arrows below to flip through this guide →</p>
                                </div>
                            )
                        },
                        {
                            id: 'DISCOVERY',
                            title: 'the discovery hud',
                            subtitle: '// your home base',
                            content: (
                                <div className="space-y-4 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3">This is the first thing you see when you open FATALE — a live grid of everything happening on the platform. Artists, music, journals, visuals, communities — all updating in real time.</p>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'YT FREQ SCAN', desc: 'The search bar at the top. Type any song or artist name and results stream in instantly. Click anything to start playing.' },
                                            { key: 'NATIVE ARTISTS', desc: 'Artists who release their music directly on FATALE. Click any of them to visit their profile.' },
                                            { key: 'PLAYLISTS', desc: 'Your playlists and community ones too. Click any playlist to preview the tracks inside.' },
                                            { key: 'STUDIO TRANSMISSIONS', desc: 'Photos and videos posted by artists — shown as a visual grid. Click any tile to see it full-size with comments.' },
                                            { key: '[ JOURNAL ]', desc: 'Text posts and log entries from artists you follow. Click any one to read the full thing.' },
                                            { key: 'MARKETPLACE', desc: 'Merch, digital collectibles, and curated links from artists. Click to explore.' },
                                            { key: 'LIVE!', desc: 'Who\'s streaming right now. Click any live session to tune in and join the chat.' },
                                            { key: 'COMMUNITIES', desc: 'Fan groups by genre or location. You can join one or browse what\'s happening inside each.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex gap-3 items-start">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/60">{item.desc}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-[#b39ddb]/5 border border-[#b39ddb]/20 text-[10px] text-white/50 font-mono">
                                        tip: typing in the search bar filters every single panel on the page at once — super useful when you're looking for something specific.
                                    </div>
                                </div>
                            )
                        },
                        {
                            id: 'GLOBE',
                            title: 'the globe',
                            subtitle: '// the world, literally',
                            content: (
                                <div className="space-y-4 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3">The 3D globe in the middle of the Discovery screen shows you where activity is happening across the FATALE network in real time. Every glowing dot is an artist, a track, or a community pinned to a place in the world.</p>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'DRAG TO SPIN', desc: 'Click and drag the globe to rotate it — explore any region of the world.' },
                                            { key: 'CLICK A NODE', desc: 'Click any glowing dot to see what it is — an artist, a track, a live stream, or a community.' },
                                            { key: 'VIEW FILTERS', desc: 'The buttons on the side let you filter what types of dots show up — Tracks, Artists, Communities, Live streams, etc.' },
                                            { key: 'SECTOR COLORS', desc: 'Different areas of the globe glow in different colors. Posts and content from those areas use the same color across the whole HUD.' },
                                            { key: 'GLOBAL / LOCAL', desc: 'Toggle between seeing the whole world or just content near your location.' },
                                            { key: 'PAUSE SPIN', desc: 'The globe rotates on its own by default. Hit PAUSE_SPIN if you want to stop it and look at a specific region.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex gap-3 items-start">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/60">{item.desc}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-[#b39ddb]/5 border border-[#b39ddb]/20 text-[10px] text-white/50 font-mono">
                                        tip: on mobile the globe turns into a scrollable grid so it's way easier to tap through everything.
                                    </div>
                                </div>
                            )
                        },
                        {
                            id: 'PLAYER',
                            title: 'music player',
                            subtitle: '// just hit play',
                            content: (
                                <div className="space-y-4 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3">There are two ways to listen on FATALE — the mini player that lives at the bottom of the screen for casual listening, and the full DJ Mixer when you want serious control. Here's the mini player.</p>
                                    <div className="space-y-1 mb-4">
                                        <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest pb-2 border-b border-[#b39ddb]/20">the mini player (bottom bar)</div>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'PLAY / PAUSE', desc: 'Tap to start or pause the track that\'s currently loaded.' },
                                            { key: 'SKIP', desc: 'Jump forward or backward through your queue.' },
                                            { key: 'LIKE ♥', desc: 'Save the track to your Favorites so you can find it again later.' },
                                            { key: '+ (QUEUE)', desc: 'Add the current track to the end of your queue.' },
                                            { key: 'VOLUME', desc: 'Drag the slider to adjust how loud it plays.' },
                                            { key: '$ (TIP)', desc: 'Send some credits straight to the artist while their track is playing.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex gap-3 items-start">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/60">{item.desc}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-1 mt-4 mb-2">
                                        <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest pb-2 border-b border-[#b39ddb]/20">keyboard shortcuts (desktop only)</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                                        {['F1 FEED','F2 PLAYER','F3 PLAYER','F4 MESSAGES','F5 PROFILE','F6 WALLET','F7 COMMS','F8 LIVE','F9 EXIT'].map(k => (
                                            <div key={k} className="text-white/40 border border-white/10 px-2 py-1">{k}</div>
                                        ))}
                                    </div>
                                </div>
                            )
                        },
                        {
                            id: 'DJMIXER',
                            title: 'dj mixer',
                            subtitle: '// two decks, one vibe',
                            content: (
                                <div className="space-y-4 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3">The DJ Mixer is a full professional two-deck setup. Load a track on Deck A and another on Deck B, blend them together with the crossfader, and if you want — broadcast the whole mix live to your followers.</p>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'SIGNAL CRATE', desc: 'Your music library lives here. Browse all your tracks, favorites, purchased music, by artist, or by playlist. Search to find anything fast.' },
                                            { key: 'LOAD A / B', desc: 'Each track in the crate has an A and a B chip next to it. Click one to load that track onto that deck.' },
                                            { key: 'CROSSFADER', desc: 'The horizontal slider at the bottom. Slide it left to hear Deck A, right to hear Deck B, or anywhere in between to blend them.' },
                                            { key: 'BPM SYNC', desc: 'Each deck shows the tempo of the track. Use the pitch controls to match tempos before you blend.' },
                                            { key: 'EQ CONTROLS', desc: 'High, Mid, and Low knobs on each deck so you can shape how each track sounds individually.' },
                                            { key: 'CREATE PLAYLIST', desc: 'Go to the Playlists tab inside the Signal Crate and hit the + button to build a new playlist from your library.' },
                                            { key: 'LIVE BROADCAST', desc: 'When you go live, everything coming out of the mixer is what your listeners hear. They\'re in the room with you.' },
                                            { key: 'NEURAL CHAT', desc: 'While you\'re broadcasting, fans can chat with you and send track requests right in the stream.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex gap-3 items-start">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/60">{item.desc}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        },
                        {
                            id: 'PROFILE',
                            title: 'your profile',
                            subtitle: '// your space, your rules',
                            content: (
                                <div className="space-y-4 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3">Your profile is your home on FATALE — it's where everything you make lives. Music, journal entries, visual posts, your series, your community. Fans who follow you can see all of it here.</p>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'MUSIC RELEASES', desc: 'Upload your albums, singles, and tracks. You can set prices, organize your catalog, and watch your play counts grow.' },
                                            { key: 'STUDIO / JOURNAL', desc: 'Your artist diary. Post quick log entries, drop photos and videos, or write long illustrated pieces. Followers see everything in their feed.' },
                                            { key: 'PUBLICATIONS & SERIES', desc: 'For longer work — novels, comics, picture journals. Create a series, upload a cover, and publish chapter by chapter. Readers can browse and follow along from your profile.' },
                                            { key: 'GALLERY', desc: 'A visual grid of every photo and video you\'ve posted — like your own portfolio page.' },
                                            { key: 'COMMUNITIES', desc: 'Create your own fan community or join one that already exists. A great way to bring your followers together.' },
                                            { key: 'BIO & IDENTITY', desc: 'Edit your name, bio, profile photo, banner image, and your theme color from Settings → Identity.' },
                                            { key: 'HARDWARE RACK', desc: 'Show off what gear and instruments you use. Fans love seeing the setup behind the music.' },
                                            { key: 'FOLLOWING / FOLLOWERS', desc: 'Follow other artists to see their content in your feed. Click anyone\'s username anywhere on the platform to visit their profile.' },
                                            { key: 'MODIFY IDENTITY', desc: 'On your own profile, hit the Modify Identity button to edit anything about how you appear on FATALE.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex gap-3 items-start">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/60">{item.desc}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        },
                        {
                            id: 'FEED',
                            title: 'signal feed',
                            subtitle: '// what\'s happening right now',
                            content: (
                                <div className="space-y-4 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3">The feed is your personal stream — everything posted by artists you follow shows up here in order. Scroll through it like a timeline. It's the easiest way to stay up with everyone you care about.</p>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'WHAT SHOWS UP', desc: 'Journal entries, photos, videos, music releases, live stream announcements, and series updates — all in one place.' },
                                            { key: 'OPEN A POST', desc: 'Tap any card in the feed to open it fully — you\'ll see the full media, all the comments, and action buttons.' },
                                            { key: 'LEAVE A COMMENT', desc: 'Inside any post you can type a comment and hit send. The artist and other fans will see it.' },
                                            { key: 'SHARE A POST', desc: 'Hit the Share button inside any post to copy a link directly to that piece of content.' },
                                            { key: 'TIP THE ARTIST', desc: 'See something you love? Send the artist some credits directly from the post — they get it instantly.' },
                                            { key: 'POSTING YOURSELF', desc: 'Hit the [ NEW TRANSMISSION ] button to post your own content — a photo, a video, a journal entry, or a new chapter for your series.' },
                                            { key: 'SERIES CARDS', desc: 'When an artist posts or updates a series, it shows up as a big book-style card with cover art and a [ READ ] button. Tap it to start reading from Chapter 1.' },
                                            { key: 'FILTERING', desc: 'The search bar on the Discovery screen filters the feed too — useful for finding posts from a specific artist fast.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex gap-3 items-start">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/60">{item.desc}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-[#b39ddb]/5 border border-[#b39ddb]/20 text-[10px] text-white/50 font-mono">
                                        tip: comments show the commenter's username so everyone knows who said what.
                                    </div>
                                </div>
                            )
                        },
                        {
                            id: 'WALLET',
                            title: 'wallet & credits',
                            subtitle: '// support your artists',
                            content: (
                                <div className="space-y-4 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3">FATALE has its own credit system. Credits are how fans support artists directly — no middleman, no waiting. You can tip, buy tracks, and unlock premium stuff, all with credits.</p>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'YOUR BALANCE', desc: 'Your credit total shows in the Wallet section. You buy credits with real money and they live in your account ready to use.' },
                                            { key: 'TIPPING AN ARTIST', desc: 'Send credits to any artist from a post, a track page, or their profile. As much or as little as you want.' },
                                            { key: 'BUYING TRACKS', desc: 'Some artists sell their music. Purchase a track to download it or unlock an exclusive version.' },
                                            { key: 'TRANSACTION HISTORY', desc: 'Every credit you send or receive is logged in the Wallet section so you always know where it went.' },
                                            { key: 'EARNINGS (ARTISTS)', desc: 'If you\'re an artist, your earnings panel shows total tips received, track sales, and your running balance.' },
                                            { key: 'SUBSCRIPTION', desc: 'Going premium unlocks higher upload limits, advanced mixer features, and more. Worth it if you\'re creating a lot.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex gap-3 items-start">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/60">{item.desc}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-[#b39ddb]/5 border border-[#b39ddb]/20 text-[10px] text-white/50 font-mono">
                                        tip: artists receive tips the moment you send them — no delay, no processing time. instant.
                                    </div>
                                </div>
                            )
                        },
                        {
                            id: 'JOURNAL',
                            title: 'log / journal',
                            subtitle: '// your artist diary',
                            content: (
                                <div className="space-y-4 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3">The Log is basically your artist diary — a place to write whatever's on your mind and share it with your followers. Could be a thought, a behind-the-scenes update, a poem, an illustrated piece, anything. No rules.</p>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'WRITING AN ENTRY', desc: 'Go to your profile, open the Studio / Journal tab, and hit New Entry. You\'ll get a full rich-text editor — bold, italic, headings, lists, the works. Write as much or as little as you want.' },
                                            { key: 'ADDING IMAGES OR VIDEOS', desc: 'You can drop photos and videos right inside your entry using the toolbar. Great for illustrated journals, photo diaries, or anything visual.' },
                                            { key: 'STANDALONE ENTRY', desc: 'A standalone entry is just a single post on its own — it doesn\'t belong to any series. Perfect for one-off thoughts or updates.' },
                                            { key: 'LINKING TO A SERIES', desc: 'If you\'re working on something longer — a story, a novel, an ongoing journal — you can link each entry to a series and set the chapter number. Readers can then follow in order.' },
                                            { key: 'COVER IMAGE', desc: 'You can add a cover image to any entry. It shows up as a thumbnail on your profile and in the feed — makes it way more eye-catching.' },
                                            { key: 'CAPTION (OPTIONAL)', desc: 'You can write a caption but you definitely don\'t have to. If your art speaks for itself, let it. Totally fine to post with just images and no words.' },
                                            { key: 'PUBLISHING', desc: 'Nothing goes live until you publish it. If you\'re not done, just leave it — it\'ll save as a draft. When you\'re ready, hit Transmit and it goes out to your followers.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex gap-3 items-start">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/60">{item.desc}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-[#b39ddb]/5 border border-[#b39ddb]/20 text-[10px] text-white/50 font-mono">
                                        tip: you can also post a quick journal entry from anywhere using the [ NEW TRANSMISSION ] button — just pick "Journal / Log" as the type. no need to go to your profile first.
                                    </div>
                                </div>
                            )
                        },
                        {
                            id: 'SERIES',
                            title: 'publications & series',
                            subtitle: '// write your book',
                            content: (
                                <div className="space-y-4 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3">Series let you publish longer, multi-part work right here on FATALE. Think of it like self-publishing — a novel, a comic, a picture journal, a zine, anything you want to tell chapter by chapter. Your followers can read it like a real book.</p>
                                    <div className="space-y-1 mb-4">
                                        <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest pb-2 border-b border-[#b39ddb]/20">how to get started</div>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'CREATE A SERIES', desc: 'Head to the Studio / Journal tab on your profile and click "New Series". Give it a name, a short description, and upload a cover image. That cover is what readers will see in the feed.' },
                                            { key: 'COVER ART', desc: 'This is the most important part — it\'s like the front of your book. It shows up as a big card in the feed and on your profile. Make it something that pulls people in.' },
                                            { key: 'ADDING CHAPTERS', desc: 'After the series exists, write journal entries and link them to it. Set the chapter number and they\'ll automatically stack in order for readers.' },
                                            { key: 'HOW IT LOOKS IN THE FEED', desc: 'Series show up as book-style cards — big cover art, the title, a little description, and a [ READ ] button. Readers just tap that to start from Chapter 1.' },
                                            { key: 'PICTURE NOVELS & COMICS', desc: 'No text required at all — you can make entirely visual chapters by just embedding images in the editor. Perfect for comics, manga, photo essays, or drawn journals.' },
                                            { key: 'THE READING EXPERIENCE', desc: 'When someone opens your series, they see a chapter list. They can jump to any chapter or read in order. Each chapter opens in a clean full-screen reader.' },
                                            { key: 'ON YOUR PROFILE', desc: 'All your active series are displayed on your profile with their cover art. Visitors can browse and start reading directly from there.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex gap-3 items-start">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/60">{item.desc}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-[#b39ddb]/5 border border-[#b39ddb]/20 text-[10px] text-white/50 font-mono">
                                        tip: when you use [ NEW TRANSMISSION ] and pick "Journal / Log", you can link that post directly to an existing series and set the chapter — no need to go to your profile first.
                                    </div>
                                </div>
                            )
                        },
                        {
                            id: 'SETTINGS',
                            title: 'settings',
                            subtitle: '// make it yours',
                            content: (
                                <div className="space-y-4 text-[11px] leading-relaxed font-sans">
                                    <p className="text-white/50 font-mono text-[10px] tracking-wide border-l-2 border-[#b39ddb]/50 pl-3">Settings is where you control everything about your account and how you appear on the platform. You can get there by clicking the skull icon in the top left corner and hitting Settings.</p>
                                    <div className="space-y-3">
                                        {[
                                            { key: 'IDENTITY', desc: 'Change your display name, write your bio, swap your profile photo, update your banner image, and pick your theme color.' },
                                            { key: 'SECURITY', desc: 'Update your password and manage account security from here.' },
                                            { key: 'NOTIFICATIONS', desc: 'Choose which things send you alerts — new followers, tips, messages, and so on. Customize it to what matters to you.' },
                                            { key: 'LANGUAGE', desc: 'Switch the whole interface between English, Spanish, Japanese, and Russian. Picks up instantly.' },
                                            { key: 'FORCE UPDATE', desc: 'If something feels off — the globe is acting weird, visuals look wrong — hit Force Update to reset and re-sync the interface.' },
                                            { key: 'LOGOUT', desc: 'Sign out of your account from here or from the skull menu.' },
                                        ].map(item => (
                                            <div key={item.key} className="flex gap-3 items-start">
                                                <span className="text-[#b39ddb] font-mono text-[8px] mt-1 shrink-0">■</span>
                                                <div><strong className="text-[#b39ddb] font-mono text-[9px] uppercase tracking-wide">{item.key} — </strong><span className="text-white/60">{item.desc}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 p-4 bg-[#b39ddb]/5 border border-[#b39ddb]/30">
                                        <div className="text-[#b39ddb] font-mono text-[9px] font-black uppercase tracking-widest mb-2">skull menu quick links</div>
                                        <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-white/40">
                                            {['PROFILE','WALLET','MESSAGES','MARKETPLACE','SETTINGS','LOGOUT'].map(k => (
                                                <div key={k} className="border border-white/5 px-2 py-1">▸ {k}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        },
                    ];
                    const currentPage = pages[guidePage];
                    const totalPages = pages.length;
                    return (
                        <motion.div
                            key="guide-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)] px-4 md:p-8 pointer-events-auto"
                            onClick={() => setShowSystemGuide(false)}
                        >
                            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-10" />

                            <motion.div
                                key={`guide-page-${guidePage}`}
                                initial={{ scale: 0.97, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.97, opacity: 0, y: 10 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                                className="w-full max-w-3xl max-h-[90vh] bg-[#020202] border border-[#b39ddb]/60 relative flex flex-col z-20 shadow-[0_0_60px_rgba(179,157,219,0.2)]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Corner accents */}
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#b39ddb]" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#b39ddb]" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#b39ddb]" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#b39ddb]" />

                                {/* Header */}
                                <div className="flex justify-between items-center p-5 md:p-6 border-b border-[#b39ddb]/20 shrink-0">
                                    <div>
                                        <div className="text-[9px] font-black text-[#b39ddb] tracking-[0.35em] font-mono">{currentPage.subtitle}</div>
                                        <div className="text-white font-black text-base md:text-lg tracking-[0.15em] font-mono uppercase mt-0.5">{currentPage.title}</div>
                                    </div>
                                    <button
                                        onClick={() => setShowSystemGuide(false)}
                                        className="text-white/40 hover:text-[#b39ddb] transition-colors border border-white/10 hover:border-[#b39ddb]/50 px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest"
                                    >
                                        [ CLOSE ]
                                    </button>
                                </div>

                                {/* Page content */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={guidePage}
                                            initial={{ opacity: 0, x: 15 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -15 }}
                                            transition={{ duration: 0.18 }}
                                        >
                                            {currentPage.content}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Footer navigation */}
                                <div className="shrink-0 border-t border-[#b39ddb]/20 p-4 md:p-5 flex items-center justify-between gap-4">
                                    {/* Page dots */}
                                    <div className="flex gap-1.5 items-center">
                                        {pages.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setGuidePage(i)}
                                                className={`transition-all ${i === guidePage ? 'w-4 h-1.5 bg-[#b39ddb]' : 'w-1.5 h-1.5 bg-white/20 hover:bg-[#b39ddb]/50'}`}
                                            />
                                        ))}
                                    </div>

                                    {/* Page label */}
                                    <div className="text-[8px] font-mono text-white/20 tracking-widest hidden sm:block">
                                        {String(guidePage + 1).padStart(2, '0')} / {String(totalPages).padStart(2, '0')} — {currentPage.id}
                                    </div>

                                    {/* Arrows */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setGuidePage(p => Math.max(0, p - 1))}
                                            disabled={guidePage === 0}
                                            className="px-4 py-1.5 border border-[#b39ddb]/30 text-[#b39ddb] hover:bg-[#b39ddb]/10 transition-all text-[10px] font-mono font-black uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed"
                                        >
                                            ← PREV
                                        </button>
                                        <button
                                            onClick={() => setGuidePage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={guidePage === totalPages - 1}
                                            className="px-4 py-1.5 border border-[#b39ddb]/30 text-[#b39ddb] hover:bg-[#b39ddb]/10 transition-all text-[10px] font-mono font-black uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed"
                                        >
                                            NEXT →
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* --- SCANLINE OVERLAY --- */}
            <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] select-none overflow-hidden h-screen w-screen">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
            </div>
        </div>
    );
};

export default DiscoveryHUD;
