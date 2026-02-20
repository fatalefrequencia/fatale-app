
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Heart,
  Search, User, Radio, Hash, LogIn, Bell,
  Flame, Zap, Settings, Share2, List,
  Music, ChevronRight, Menu as MenuIcon, X,
  MapPin, Calendar, Users, Edit3, Library,
  ChevronDown, Camera, Video, PenTool, BookOpen,
  MessageSquare, Repeat, MoreHorizontal, RefreshCw,
  Frown, Star, Volume2, Plus, Globe, Maximize2, Minimize2, LogOut, Wallet,
} from 'lucide-react';
import YouTube from 'react-youtube';



import skullImg from './assets/skull_neon_fuscia.png';
import AuthView from './components/AuthView';
import { ProfileView } from './components/Profile';
import { IPodPlayer } from './components/IPodPlayer';
import { MessagesView } from './components/MessagesView';
import DiscoveryMapView from './components/DiscoveryMapView';
import TrackUploadView from './components/UploadTrackView';
import WalletView from './components/WalletView';

import API from './services/api';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';

// --- BASE DE DATOS MOCK (Sincronizada en toda la app) ---
const TRACKS = [
  { id: 'mock-1', title: 'youtsplit', artist: 'menoboy', album: 'digital_void', duration: '2:09', cover: 'O', artistUserId: 3, price: 0, isLocked: false, playCount: 1450 },
  { id: 'mock-2', title: 'glitch_heart', artist: 'cyber_vamp', album: 'neon_night', duration: '3:15', cover: 'V', artistUserId: 3, price: 5, isLocked: true, playCount: 890 },
  { id: 'mock-3', title: 'thorny_path', artist: 'dark_pixel', album: 'vamp_glitch', duration: '1:45', cover: 'P', artistUserId: 3, price: 2, isLocked: false, playCount: 3200 },
  { id: 'mock-4', title: 'neon_skull', artist: 'retro_void', album: 'system_error', duration: '4:20', cover: 'S', artistUserId: 99, price: 10, isLocked: true, playCount: 120 },
  { id: 'mock-5', title: 'digital_tear', artist: 'emo_system', album: 'null_life', duration: '2:55', cover: 'E', artistUserId: 1, price: 1, isLocked: false, playCount: 5500 },
];

const RADIO_STATIONS = [
  { id: 1, name: 'Rock FM', track: 'Nightmare City', listeners: 234, active: true },
  { id: 2, name: 'Jazz Lounge', track: 'Back at 8 PM EST', listeners: 0, active: false },
  { id: 3, name: 'Techno Void', track: 'Circuit Breaker', listeners: 1205, active: true },
];

const DISCOVERY_GRID = [
  { id: 1, name: 'Radar de Novedades', color: '#ff006e', type: 'Playlist' },
  { id: 2, name: 'It\'s Immaterial', color: '#1a1a1a', type: 'Album' },
  { id: 3, name: 'Descubrimiento Semanal', color: '#ff006e', type: 'Personal' },
  { id: 4, name: 'Blonde', color: '#1a1a1a', type: 'Artist' },
  { id: 5, name: 'tape2', color: '#1a1a1a', type: 'Mix' },
  { id: 6, name: 'Dreamo Mix', color: '#ff006e', type: 'Vibes' },
];

// --- COMPONENTE PRINCIPAL ---
function App() {
  const [activeView, setView] = useState('discovery');
  const [viewingUserId, setViewingUserId] = useState(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const { showNotification } = useNotification();
  // login, discovery, feed, profile, player
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [redirectTrigger, setRedirectTrigger] = useState(null); // Refactored to fix RefError
  const [user, setUser] = useState(null);
  const [tracks, setTracks] = useState([]);

  // Real-time Audio State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Audio Ref for persistence
  const audioRef = useRef(null);

  // YouTube Player State
  const [youtubePlayer, setYoutubePlayer] = useState(null);
  const [isYoutubeMode, setIsYoutubeMode] = useState(false);

  // Discovery Analytics State
  const [globalStats, setGlobalStats] = useState(null);
  const [likedYoutubeIds, setLikedYoutubeIds] = useState(new Set());
  const [subscription, setSubscription] = useState(null);
  const [cachedTrackIds, setCachedTrackIds] = useState(new Set());
  const [userPlaylists, setUserPlaylists] = useState([]);


  const BASE_API_URL = 'http://localhost:5264';
  const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${BASE_API_URL}${path}`;
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (newTime) => {
    try {
      if (isYoutubeMode && youtubePlayer && typeof youtubePlayer.seekTo === 'function') {
        youtubePlayer.seekTo(newTime, true);
        setCurrentTime(newTime);
      } else if (audioRef.current) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    } catch (e) {
      console.warn("YouTube Seek Error (Suppressed):", e);
    }
  };

  // YouTube Time Polling & Cleanup
  useEffect(() => {
    let interval;
    if (isYoutubeMode && isPlaying && youtubePlayer) {
      interval = setInterval(() => {
        try {
          // Extra safety: check if player and its internal API are still valid
          if (youtubePlayer && typeof youtubePlayer.getCurrentTime === 'function') {
            const time = youtubePlayer.getCurrentTime();
            const dur = youtubePlayer.getDuration();
            if (dur && dur > 0 && dur !== duration) setDuration(dur);
            setCurrentTime(time);
          }
        } catch (e) {
          console.warn("YouTube Polling Error (Suppressed during unmount):", e);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
      // Don't null the player ref here, let the component handle its own lifecycle
    };
  }, [isYoutubeMode, isPlaying, youtubePlayer]);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setView('player'); // Or discovery/feed based on preference
    }
  }, []);

  const fetchPlaylists = async () => {
    try {
      if (user) {
        const userId = user.id || user.Id;
        const res = await API.Playlists.getUserPlaylists(userId);
        const validPlaylists = (res.data || []).filter(p => p && (p.id || p.Id));
        setUserPlaylists(validPlaylists);
      }
    } catch (err) {
      console.error("App: Fatal error syncing playlists", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPlaylists();
    }
  }, [user]);

  // Fetch Tracks, Purchases, Likes (Local & YouTube), Subscription
  const fetchTracks = async () => {
    try {
      const currentUserId = user?.id || user?.Id || user?.userId || user?.UserId;
      if (currentUserId) {
        console.log("[App] Syncing tracks for User:", currentUserId, "Full User Object:", user);
        // Parallel Fetch for efficiency and avoiding race conditions
        const [tracksRes, purchasesRes, likesRes, subRes, cachedRes] = await Promise.all([
          API.Tracks.getAllTracks().catch(e => { console.error("[App] Tracks fetch failed:", e); return { data: [] }; }),
          API.Purchases.getMyPurchases().catch(e => { console.error("[App] Purchases fetch failed:", e); return { data: [] }; }),
          API.Likes.getMyLikes().catch(e => { console.error("[App] Likes fetch failed:", e); return { data: [] }; }),
          API.Subscriptions.getStatus().catch(e => { console.error("[App] SubStatus fetch failed:", e); return { data: { isActive: false } }; }),
          API.YoutubeCache.getMyCachedTracks().catch(e => { console.error("[App] Cache fetch failed:", e); return { data: [] }; })
        ]);

        const purchases = (purchasesRes.data || []).filter(p => p && (p.trackId || p.TrackId || p.id || p.Id));
        const likes = (likesRes.data || []).filter(l => l && (l.id || l.Id));
        const cachedTracks = cachedRes.data || [];

        setSubscription(subRes.data);

        // Update Liked YouTube IDs Set from unified likes
        const ytIds = new Set(likes
          .filter(t => t && (t.source || t.Source)?.startsWith('youtube:'))
          .map(t => (t.source || t.Source).split(':')[1])
          .filter(Boolean)
        );
        setLikedYoutubeIds(ytIds);

        // Update Cached Track IDs Set
        const cachedIds = new Set(cachedTracks.map(t => t.youtubeTrackId || t.YoutubeTrackId));
        setCachedTrackIds(cachedIds);

        console.log("[App] Synced Liked YouTube IDs:", ytIds.size, Array.from(ytIds));
        console.log("[App] Synced Cached Tracks:", cachedIds.size);
        console.log("[App] Unified Likes List:", likes.length);
        if (likes.length > 0) console.table(likes.map(l => ({ id: l.id || l.Id, title: l.title || l.Title, source: l.source || l.Source })));

        // Normalize IDs
        const ownedTrackIds = new Set(purchases.map(p => String(p.trackId || p.TrackId || p.id || p.Id)));
        const likedTrackIds = new Set(likes.map(l => String(l.trackId || l.TrackId || l.id || l.Id)));


        // Helper for formatting duration
        const formatDuration = (seconds) => {
          if (!seconds) return '0:00';
          const m = Math.floor(seconds / 60);
          const s = seconds % 60;
          return `${m}:${s < 10 ? '0' : ''}${s} `;
        };

        // 221. Deduplication Maps
        const uniqueTracksMap = new Map(); // Key -> Track
        const titleArtistMap = new Map();  // "Artist - Title" -> Key

        // Helper to generate a robust unique key
        const getUniqueKey = (t) => {
          const src = t.source || t.Source;
          if (src && src.startsWith('youtube:')) return src;
          if (src) return src;
          return String(t.id || t.Id);
        };

        const getMetaKey = (t) => {
          const title = (t.title || t.Title || "").toLowerCase().trim();
          const artist = (t.artist || t.ArtistName || t.album?.artist?.name || "").toLowerCase().trim();
          if (!title) return null;
          return `${artist} - ${title}`;
        };

        // 1. Process Local/DB Tracks
        if (tracksRes.data && tracksRes.data.length > 0) {
          tracksRes.data.forEach((t, idx) => {
            const trackId = String(t.id || t.Id || "");
            if (!trackId || trackId === "undefined") return;

            const rawPrice = t.price !== undefined ? t.price : (t.Price !== undefined ? t.Price : 0);
            const rawIsLocked = t.isLocked !== undefined ? t.isLocked : (t.IsLocked !== undefined ? t.IsLocked : false);
            const artistUserId = t.artistUserId || t.ArtistUserId ||
              t.album?.artist?.userId || t.Album?.Artist?.UserId ||
              t.album?.artist?.UserId || t.Album?.Artist?.userId;

            if (idx < 5) console.log(`[App] Track ${trackId} (${t.title}) -> artistUserId: ${artistUserId}`);

            const isMine = artistUserId !== undefined && artistUserId !== null && String(artistUserId) === String(currentUserId);

            const trackSource = t.source || t.Source;
            const isYT = trackSource?.startsWith('youtube:');

            const mappedTrack = {
              ...t,
              id: trackId,
              title: t.title || t.Title || 'Unknown Title',
              artist: t.album?.artist?.name || t.Album?.Artist?.Name || 'Unknown Artist',
              album: t.album?.title || t.Album?.Title || 'Unknown Album',
              albumId: t.album?.id || t.Album?.Id,
              artistId: t.album?.artist?.id || t.Album?.Artist?.Id || t.artistId,
              artistUserId: artistUserId,
              duration: t.duration || t.Duration || '3:00',
              cover: getMediaUrl(t.coverImageUrl || t.CoverImageUrl),
              source: isYT ? trackSource : getMediaUrl(t.filePath || t.FilePath),
              price: rawPrice,
              isLocked: rawIsLocked,
              isOwned: ownedTrackIds.has(trackId) || isMine,
              isLiked: likedTrackIds.has(trackId),
              playCount: t.playCount || t.PlayCount || 0,
              isCached: cachedIds.has(Number(trackId)) || cachedIds.has(trackId)
            };

            const key = getUniqueKey(mappedTrack);
            const metaKey = getMetaKey(mappedTrack);

            if (!uniqueTracksMap.has(key)) {
              // If checking meta key, ensure we don't accidentally squash different versions if desired?
              // For now, assume strict dedupe by name is preferred for cleaner library.
              if (metaKey && titleArtistMap.has(metaKey)) {
                // We already have this song (by name), maybe from a previous loop? 
                // Local loop runs 1st, so this is just handling duplicate locals if any.
                console.log(`[DUPE] Skipping duplicate local: ${metaKey}`);
              } else {
                uniqueTracksMap.set(key, mappedTrack);
                if (metaKey) titleArtistMap.set(metaKey, key);
              }
            }
          });
        }

        // 2. Process YouTube Likes (Merge or Add)
        if (likes.length > 0) {
          likes
            .filter(yt => (yt.source || yt.Source)?.startsWith('youtube:'))
            .forEach(yt => {
              const yId = (yt.source || yt.Source).split(':')[1];
              const sourceKey = `youtube:${yId}`;

              const dbId = String(yt.id || yt.Id || "");

              // 2a. Check Key (Exact Source Match)
              if (uniqueTracksMap.has(sourceKey)) {
                const existing = uniqueTracksMap.get(sourceKey);
                uniqueTracksMap.set(sourceKey, { ...existing, isLiked: true });
                return;
              }

              // 2b. Check Meta Key (Artist - Title Match)
              const tempObj = {
                title: yt.title || yt.Title,
                artist: (yt.album?.artist?.name || yt.Album?.Artist?.Name) || yt.channelTitle
              };
              const metaKey = getMetaKey(tempObj);

              if (metaKey && titleArtistMap.has(metaKey)) {
                const existingKey = titleArtistMap.get(metaKey);
                const existing = uniqueTracksMap.get(existingKey);
                // Merge: Update the existing local track to be liked!
                console.log(`[DUPE MERGE] Merging YouTube Like into Local: ${metaKey}`);
                uniqueTracksMap.set(existingKey, { ...existing, isLiked: true });
                return;
              }

              // Find cache info
              const cachedVersion = cachedTracks.find(c => c.youtubeId === yId || c.youtubeTrackId === yt.id);

              const mappedYt = {
                id: dbId || `yt-${yId}`,
                videoId: yId,
                title: yt.title || yt.Title,
                artist: (yt.album?.artist?.name || yt.Album?.Artist?.Name) || yt.channelTitle || "Unknown Artist",
                album: (yt.album?.title || yt.Album?.Title) || 'YouTube Library',
                cover: yt.thumbnailUrl || yt.ThumbnailUrl || yt.coverImageUrl || yt.CoverImageUrl,
                duration: yt.duration || yt.Duration || '0:00',
                source: sourceKey,
                isLiked: true,
                isOwned: false,
                isLocked: false,
                price: 0,
                artistUserId: null,
                playCount: yt.playCount || yt.PlayCount || 0,
                isCached: cachedIds.has(yt.id),
                cachedAt: cachedVersion?.cachedAt
              };

              uniqueTracksMap.set(sourceKey, mappedYt);
              if (metaKey) titleArtistMap.set(metaKey, sourceKey);
            });
        }

        const allTracks = Array.from(uniqueTracksMap.values());

        setTracks(allTracks.length > 0 ? allTracks : TRACKS);

      } else {
        // Fallback for non-logged in (shouldn't happen often in this view)
        setTracks(TRACKS);
      }
    } catch (error) {
      console.error("Failed to fetch tracks", error);
      setTracks(TRACKS);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [user]);

  // Fetch Global Stats for Discovery Hub
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.Discovery.getStats();
        if (res.data) {
          // Flatten/Normalize stats to ensure reliable key access
          const normalizedStats = {
            ...res.data,
            topTracks: (res.data.topTracks || res.data.TopTracks || []).filter(t => t && (t.id || t.Id)),
            activeUsers: res.data.activeUsers || res.data.ActiveUsers || 0
          };
          setGlobalStats(normalizedStats);
        }
      } catch (e) {
        console.error("Failed to fetch global stats", e);
      }
    };

    fetchStats();
    // Refresh every 30 seconds if in discovery view
    const interval = setInterval(() => {
      if (activeView === 'discovery') fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [activeView]);

  // --- AUDIO LOGIC (Unified Manager) ---
  // --- AUDIO LOGIC (Unified Manager) ---
  const rawTrack = (currentTrackIndex >= 0 && tracks[currentTrackIndex]) ? tracks[currentTrackIndex] : (TRACKS[0] || { source: '', title: 'Loading...', artist: 'System' });
  const currentTrack = {
    ...rawTrack,
    id: rawTrack.id || rawTrack.Id,
    title: rawTrack.title || rawTrack.Title,
    artist: rawTrack.artist || rawTrack.ArtistName || rawTrack.Artist || 'Unknown Artist',
    source: rawTrack.source || rawTrack.Source,
    cover: rawTrack.cover || rawTrack.coverImageUrl || rawTrack.CoverImageUrl,
    isLocked: rawTrack.isLocked !== undefined ? rawTrack.isLocked : (rawTrack.IsLocked !== undefined ? rawTrack.IsLocked : false),
    isOwned: rawTrack.isOwned !== undefined ? rawTrack.isOwned : (rawTrack.IsOwned !== undefined ? rawTrack.IsOwned : true)
  };

  // --- TRACKING LOGIC (Discovery Analytics) ---
  const lastTrackLogged = useRef(null);
  useEffect(() => {
    if (isPlaying && currentTrack?.id && lastTrackLogged.current !== currentTrack.id) {
      const isLocked = currentTrack.isLocked && !currentTrack.isOwned;
      // Ensure ID is a number before sending to backend (skips 'mock-1', 'yt-video-id', etc.)
      const isDatabaseTrack = !isNaN(currentTrack.id) && Number.isInteger(Number(currentTrack.id));

      if (!isLocked && isDatabaseTrack) {
        console.log(`[DISCOVERY] Recording play for track: ${currentTrack.id} `);
        API.Discovery.recordPlay(currentTrack.id).catch(e => console.error("Failed to record play", e));
        lastTrackLogged.current = currentTrack.id;
      }
    }
  }, [currentTrack?.id, isPlaying, currentTrack?.isLocked, currentTrack?.isOwned]);

  // Efecto para manejar el audio
  useEffect(() => {
    if (!audioRef.current || currentTrackIndex < 0) return;

    const audio = audioRef.current;
    const track = tracks[currentTrackIndex];
    if (!track) return;

    // Normalizing properties for potential PascalCase from server or mixed types
    const trackSource = track.source || track.Source;
    const trackIsLocked = track.isLocked !== undefined ? track.isLocked : (track.IsLocked !== undefined ? track.IsLocked : false);
    const trackIsOwned = track.isOwned !== undefined ? track.isOwned : (track.IsOwned !== undefined ? track.IsOwned : true);

    const isLocked = trackIsLocked && !trackIsOwned;
    const isYT = trackSource && trackSource.startsWith('youtube:');

    console.log(`[PLAYER] Sync: Track=${track.title || track.Title}, Index=${currentTrackIndex}, isYT=${isYT}, isYoutubeMode=${isYoutubeMode}, isPlaying=${isPlaying}`);
    console.log(`[PLAYER] Source: ${trackSource}`);

    // 1. Mode Switching & Source Setting
    if (isYT) {
      if (!isYoutubeMode) {
        setIsYoutubeMode(true);
        audio.pause();
        audio.removeAttribute('src'); // Stop local audio
        audio.setAttribute('data-playing-src', '');
      }
      // YouTube component handles videoId change via props
    } else {
      if (isYoutubeMode) {
        setIsYoutubeMode(false);
        try {
          if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
            youtubePlayer.pauseVideo();
          }
        } catch (e) {
          console.warn("YouTube Pause Error (Suppressed):", e);
        }
      }

      // Handle Local Audio Source Change
      if (track.source && audio.getAttribute('data-playing-src') !== track.source) {
        audio.src = track.source;
        audio.setAttribute('data-playing-src', track.source);
        audio.load();
        setCurrentTime(0);
      }
    }

    // 2. Playback State Sync
    if (isPlaying && !isLocked) {
      if (isYT) {
        try {
          if (youtubePlayer && typeof youtubePlayer.getPlayerState === 'function' && typeof youtubePlayer.playVideo === 'function') {
            if (youtubePlayer.getPlayerState() !== 1) {
              youtubePlayer.playVideo();
            }
          }
        } catch (e) {
          console.warn("YouTube Play Error (Suppressed):", e);
        }
      } else {
        // Local
        if (audio.paused && audio.src) {
          audio.play().catch(e => console.warn("Auto-play blocked", e));
        }
      }
    } else {
      // Paused
      if (isYT) {
        try {
          if (youtubePlayer && typeof youtubePlayer.getPlayerState === 'function' && typeof youtubePlayer.pauseVideo === 'function') {
            if (youtubePlayer.getPlayerState() === 1) {
              youtubePlayer.pauseVideo();
            }
          }
        } catch (e) {
          console.warn("YouTube Pause Error (Suppressed):", e);
        }
      } else {
        if (!audio.paused) audio.pause();
      }
    }

  }, [currentTrackIndex, tracks, isPlaying, isYoutubeMode, youtubePlayer]); // removed extensive dependencies for cleaner logic

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % (tracks.length || 1));
    setIsPlaying(true);
  };

  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % (tracks.length || 1));
    setIsPlaying(true);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  // Modified to use main library tracks for correct Like status
  const handlePlayPlaylist = (playlistTracksRaw, startIndex = 0) => {
    // 1. Create a lookup map of all known tracks (with correct isLiked status)
    // Key: ID or Source
    const libraryMap = new Map();
    tracks.forEach(t => {
      libraryMap.set(String(t.id || t.Id), t);
      if (t.source) libraryMap.set(t.source, t);
    });

    // 2. Map the playlist tracks to the library versions if possible
    const enrichedQueue = playlistTracksRaw.map(pTrack => {
      const pId = String(pTrack.id || pTrack.Id);
      const pSource = pTrack.source || pTrack.Source;

      // Try to find in library by Source (best) or ID
      let found = libraryMap.get(pSource);
      if (!found) found = libraryMap.get(pId);

      // Return library version if found, else original (fallback)
      return found || pTrack;
    });

    console.log("[App] Playing Playlist via Enriched Queue. Count:", enrichedQueue.length);
    setTracks(enrichedQueue);
    setCurrentTrackIndex(startIndex);
    setIsPlaying(true);
  };

  // Fetch User Profile & Credits
  const fetchUserProfile = async (notify = false) => {
    try {
      const res = await API.Users.getProfile();
      console.log("Profile Refreshed:", res.data);
      if (res.data) {
        const userData = {
          ...res.data,
          id: res.data.id || res.data.Id || res.data.userId || res.data.UserId,
          credits: res.data.creditsBalance !== undefined ? res.data.creditsBalance : (res.data.CreditsBalance !== undefined ? res.data.CreditsBalance : (res.data.credits || 0)),
          biography: res.data.biography || res.data.Biography || res.data.bio || res.data.Bio,
          profileImageUrl: res.data.profileImageUrl || res.data.ProfilePictureUrl || res.data.imageUrl || res.data.ImageUrl,
          residentSectorId: res.data.residentSectorId !== undefined ? res.data.residentSectorId : (res.data.ResidentSectorId !== undefined ? res.data.ResidentSectorId : 0),
          isLive: res.data.isLive || res.data.IsLive || false,
          featuredTrackId: res.data.featuredTrackId || res.data.FeaturedTrackId,
          bannerUrl: res.data.bannerUrl || res.data.BannerUrl,
          themeColor: res.data.themeColor || res.data.ThemeColor || '#ff006e',
          textColor: res.data.textColor || res.data.TextColor || '#ffffff',
          backgroundColor: res.data.backgroundColor || res.data.BackgroundColor || '#000000',
          isGlass: res.data.isGlass || res.data.IsGlass || false
        };
        setUser(prev => {
          const updated = { ...prev, ...userData };
          localStorage.setItem('user', JSON.stringify(updated));
          return updated;
        });
        if (notify) {
          // alert(`VERIFICACIÓN SERVIDOR: \n\nSaldo sincronizado: ${ userData.credits } CRD`);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchUserProfile();

      // Initial Heartbeat
      API.Discovery.heartbeat().catch(e => console.error("Heartbeat failed", e));

      // Periodic Heartbeat loop (every 30s) to keep online status active
      const interval = setInterval(() => {
        if (localStorage.getItem('token')) {
          API.Discovery.heartbeat().catch(e => console.error("Heartbeat loop failed", e));
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, []);

  // Update likedYoutubeIds when handleLike adds/removes
  // handled in fetchTracks and handleLike now.

  // Update likedYoutubeIds when handleLike adds/removes
  // Modified handleLike to update this state too?
  // Actually handleLike calls API, so we can re-fetch or optimistically update.
  // Let's add optimistic update in handleLike for this set too.

  const checkNewMessages = async () => {
    if (activeView === 'messages') {
      setHasNewMessages(false);
      return;
    }
    try {
      const res = await API.Messages.getConversations();
      const hasUnread = res.data?.some(conv => conv.unreadCount > 0);
      if (hasUnread) setHasNewMessages(true);
    } catch (err) {
      console.error("Failed to check notifications", err);
    }
  };

  useEffect(() => {
    if (user) {
      checkNewMessages();
      const interval = setInterval(checkNewMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [user, activeView]);

  useEffect(() => {
    if (activeView === 'messages') {
      setHasNewMessages(false);
    }
  }, [activeView]);

  // Global Keydown Listener for Spacebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable) return;
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePurchase = async (track, isTip = false, amount = 0) => {
    try {
      if (isTip) {
        const tipAmount = amount || 50;
        if (confirm(`Send a ${tipAmount} Credit tip to ${track.artist}?`)) {
          const res = await API.Economy.tipArtist(track.artistId || 1, tipAmount);
          const message = res.data?.message || "Tip sent! <3";

          const balance = res.data?.newBalance !== undefined ? res.data.newBalance : (res.data?.NewBalance !== undefined ? res.data.NewBalance : undefined);

          if (balance !== undefined) {
            setUser(prev => ({ ...prev, credits: balance }));
          } else {
            setUser(prev => ({ ...prev, credits: (prev.credits || 0) - tipAmount }));
          }

          showNotification("SIGNAL_CONFIRMED", message, "success");
          await fetchUserProfile();
        }
        return;
      }

      // Standard Purchase Logic
      const res = await API.Purchases.purchaseTrack(track.id);
      const balance = res.data?.newBalance !== undefined ? res.data.newBalance : (res.data?.NewBalance !== undefined ? res.data.NewBalance : undefined);

      if (balance !== undefined) {
        setUser(prev => ({ ...prev, credits: balance }));
      } else {
        // Fallback optimistic update
        setUser(prev => ({ ...prev, credits: (prev.credits || 0) - (track.price || 10) }));
      }

      // Update track ownership state
      setTracks(prev => prev.map(t =>
        t.id === track.id ? { ...t, isOwned: true, isLocked: false } : t
      ));

      await fetchUserProfile(); // Double check sync
      showNotification("TRANSACTION_COMPLETE", "Purchase successful! - Download Unlocked.", "success");
    } catch (error) {
      console.error("Purchase/Tip failed:", error);
      showNotification("CONNECTION_ERROR", error.response?.data?.message || "Transaction failed", "error");
    }
  };


  const handleDownload = async (track) => {
    if (!track.isOwned) {
      showNotification("ACCESS_DENIED", "You must own this track to download it.", "error");
      return;
    }
    if (!track.source) return;
    try {
      const response = await fetch(track.source);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${track.artist} - ${track.title}.mp3`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed, using fallback:", error);
      const link = document.createElement('a');
      link.href = track.source;
      link.download = `${track.artist} - ${track.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const fetchLikes = async () => {
    try {
      const res = await API.Likes.getMyLikes();
      const normalized = (res.data || []).map(t => ({
        ...t,
        id: t.id || t.Id,
        source: t.source || t.Source
      }));
      const ytIds = new Set(normalized
        .filter(t => t.source?.startsWith('youtube:'))
        .map(t => t.source.split(':')[1])
      );
      setLikedYoutubeIds(ytIds);
    } catch (err) {
      console.error("Failed to fetch likes", err);
    }
  };

  const handleLike = async (track) => {
    const trackId = track.id || track.Id;
    if (!trackId) {
      console.error("Cannot like track: ID is missing", track);
      return;
    }

    const isYoutube = track.source?.startsWith('youtube:') || typeof trackId === 'string'; // YouTube IDs are strings
    const isLiking = !track.isLiked;

    console.log(`Attempting to ${isLiking ? 'like' : 'unlike'} ${isYoutube ? 'YouTube' : 'Local'} track: `, trackId);

    // Optimistic Update Tracks State
    setTracks(prev => prev.map(t => {
      const tId = t.id || t.Id;
      return String(tId) === String(trackId) ? { ...t, isLiked: isLiking } : t;
    }));

    // Optimistic Update Liked Set for YouTube
    if (isYoutube) {
      const videoId = typeof trackId === 'string' ? trackId : track.source?.split(':')[1];
      if (videoId) {
        setLikedYoutubeIds(prev => {
          const next = new Set(prev);
          if (isLiking) next.add(String(videoId));
          else next.delete(String(videoId));
          return next;
        });
      }
    }

    try {
      if (isYoutube) {
        let dbId = typeof trackId === 'number' ? trackId : null;

        // 1. Ensure track exists in DB if we only have string ID
        if (!dbId) {
          const trackData = {
            youtubeId: trackId, // It's a string videoId here
            title: track.title,
            channelTitle: track.artist || track.channelTitle || "Unknown",
            thumbnailUrl: track.cover || track.thumbnail || "",
            viewCount: track.viewCount || 0,
            duration: String(track.duration || "0:00")
          };
          const savedTrackRes = await API.Youtube.saveTrack(trackData);
          dbId = savedTrackRes.data.id || savedTrackRes.data.Id;
        }

        // Use unified social endpoints
        if (isLiking) {
          await API.Social.likeTrack(dbId);
        } else {
          await API.Social.unlikeTrack(dbId);
        }
      } else {
        // Local Track
        if (isLiking) {
          await API.Social.likeTrack(trackId);
        } else {
          await API.Social.unlikeTrack(trackId);
        }
      }
      console.log(`Track ${trackId} ${isLiking ? 'liked' : 'unliked'} and persisted.`);

      // Refresh likes from server to ensure Set is perfectly in sync with DB
      await fetchLikes();

      // Also update tracks state to ensure hearts stay filled/unfilled
      setTracks(prev => prev.map(t => {
        const tId = t.id || t.Id;
        const tSource = t.source || t.Source;
        const isThisTrack = String(tId) === String(trackId) || (tSource === `youtube:${trackId}`);
        return isThisTrack ? { ...t, isLiked: isLiking } : t;
      }));
    } catch (error) {
      console.error("Failed to sync like status:", error);
      // Rollback on error
      setTracks(prev => prev.map(t => {
        const tId = t.id || t.Id;
        return String(tId) === String(trackId) ? { ...t, isLiked: !isLiking } : t;
      }));
    }
  };

  const addCreditsDebug = async () => {
    try {
      const userId = user?.id || 1;
      await API.Economy.add(100, userId);
      setUser(prev => ({ ...prev, credits: (prev?.credits || 0) + 100 }));
      await fetchUserProfile();
      showNotification("CREDITS_ADDED", "SUCCESS: +100 Créditos añadidos correctamente.", "success");
    } catch (error) {
      console.error("Failed to add credits:", error);
    }
  };

  const handleAuthSuccess = (authData) => {
    if (authData.token) localStorage.setItem('token', authData.token);
    if (authData.user) {
      localStorage.setItem('user', JSON.stringify(authData.user));
      setUser(authData.user);
    }
    fetchUserProfile();
    setView('discovery');
  };

  const handleLogout = () => {
    console.log("[App] Initiating safe logout...");

    // 1. Reset Playback States First to stop polling and effects
    setIsPlaying(false);
    setIsYoutubeMode(false);
    setCurrentTrackIndex(-1);
    setCurrentTime(0);

    // 2. Stop local audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.removeAttribute('src');
    }

    // 3. Clear session data
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // 4. Update UI state
    setUser(null);
    setTracks([]); // Clear tracks to prevent stale keys
    setGlobalStats(null); // Clear stats
    setView('login');
    setViewingUserId(null);
    setYoutubePlayer(null);
  };

  const navigateToProfile = (id) => {
    setViewingUserId(id);
    setView('profile');
  };

  const handleCache = async (track) => {
    if (!subscription?.isActive) {
      showNotification("SUBSCRIPTION_REQUIRED", "Please upgrade to cache tracks.", "warning");
      return;
    }

    const isCached = cachedTrackIds.has(track.dbId);
    const apiCall = isCached ? API.YoutubeCache.uncacheTrack : API.YoutubeCache.cacheTrack;

    // Optimistic Update
    const trackDbId = track.dbId; // Must use DB ID for cache operations
    if (!trackDbId) {
      showNotification("SYSTEM_ERROR", "Track ID missing for cache operation.", "error");
      return;
    }

    setCachedTrackIds(prev => {
      const next = new Set(prev);
      if (isCached) next.delete(trackDbId);
      else next.add(trackDbId);
      return next;
    });

    setTracks(prev => prev.map(t =>
      t.dbId === trackDbId ? { ...t, isCached: !isCached } : t
    ));

    try {
      await apiCall(trackDbId);
      console.log(`Track ${track.title} ${isCached ? 'uncached' : 'cached'} `);
      // Refresh to ensure sync (optional, optimistic usually enough)
      await fetchTracks();
    } catch (error) {
      console.error("Cache operation failed", error);
      showNotification("CACHE_FAILURE", error.response?.data?.message || "Cache failed", "error");
      // Rollback
      setCachedTrackIds(prev => {
        const next = new Set(prev);
        if (isCached) next.add(trackDbId);
        else next.delete(trackDbId);
        return next;
      });
      setTracks(prev => prev.map(t =>
        t.dbId === trackDbId ? { ...t, isCached: isCached } : t
      ));
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-[#ff006e] font-mono selection:bg-[#ff006e] selection:text-black overflow-hidden">
      <audio
        ref={audioRef}
        onEnded={handleNext}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* PERSISTENT YOUTUBE PLAYER */}
      {isYoutubeMode && (
        <div className="absolute top-0 left-0 w-1 h-1 overflow-hidden opacity-0 pointer-events-none">
          <YouTube
            videoId={currentTrack?.source?.startsWith('youtube:') ? currentTrack.source.split(':')[1].trim() : ''}
            onReady={(e) => {
              console.log("[YOUTUBE] Player Ready");
              setYoutubePlayer(e.target);
            }}
            onStateChange={(e) => {
              console.log("[YOUTUBE] State Change:", e.data);
              // 0 = Ended, 1 = Playing, 2 = Paused
              if (e.data === 0) handleNext();
              if (e.data === 1 && !isPlaying) setIsPlaying(true);
              if (e.data === 2 && isPlaying) setIsPlaying(false);
            }}
            opts={{
              height: '0',
              width: '0',
              playerVars: {
                autoplay: isPlaying ? 1 : 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                modestbranding: 1,
              },
            }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeView === 'login' ? (
          <AuthView onLoginSuccess={handleAuthSuccess} />
        ) : (
          <>
            {console.log("[App] Rendering Dashboard. Redirect Trigger:", redirectTrigger)}
            <Dashboard
              activeView={activeView}
              setView={setView}
              hasNewMessages={hasNewMessages}
              currentTrackIndex={currentTrackIndex}
              setCurrentTrackIndex={setCurrentTrackIndex}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              onLogout={handleLogout}
              user={user}
              subscription={subscription} // PASS SUB
              tracks={tracks}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              onLike={handleLike}
              onCache={handleCache} // PASS CACHE HANDLER
              togglePlay={togglePlay}
              handleNext={handleNext}
              handlePrev={handlePrev}
              handlePlayPlaylist={handlePlayPlaylist}
              onPurchase={handlePurchase}
              onDownload={handleDownload}
              onAddCredits={addCreditsDebug}
              onRefreshProfile={() => fetchUserProfile(true)}
              onRefreshTracks={fetchTracks}
              globalStats={globalStats}
              navigateToProfile={navigateToProfile}
              viewingUserId={viewingUserId}
              likedYoutubeIds={likedYoutubeIds}
              cachedTrackIds={cachedTrackIds} // PASS CACHED IDS
              playlists={userPlaylists}
              onRefreshPlaylists={fetchPlaylists}
              redirectTrigger={redirectTrigger} // Pass the redirect signal
              setRedirectTrigger={setRedirectTrigger} // PASS THE SETTER
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
// --- VISTA: LOGIN (ESTILO HACKER) ---
const LoginView = ({ onLogin }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
    className="h-screen flex flex-col items-center justify-center p-6 relative"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ff006e15_0%,_transparent_70%)] animate-pulse" />
    <div className="z-10 text-center space-y-12">
      <h1 className="text-7xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_#ff006e]">
        CYBER<span className="text-[#ff006e]">GOTH</span>
      </h1>
      <div className="bg-black/40 p-8 border border-[#ff006e]/20 backdrop-blur-xl rounded-2xl space-y-4">
        <button onClick={onLogin} className="w-full bg-[#ff006e] text-black font-black py-4 px-12 rounded-sm hover:bg-white transition-all shadow-[0_0_30px_#ff006e50] uppercase italic tracking-tighter">
          ENTRAR AL SISTEMA
        </button>
      </div>
    </div>
  </motion.div>
);

const Dashboard = ({ activeView, setView, onLogout, currentTrackIndex, setCurrentTrackIndex, isPlaying, setIsPlaying, user, tracks, togglePlay, handleNext, handlePrev, handlePlayPlaylist, onPurchase, onDownload, onLike, onCache, onAddCredits, onRefreshProfile, onRefreshTracks, currentTime, duration, onSeek, globalStats, hasNewMessages, navigateToProfile, viewingUserId, likedYoutubeIds, subscription, cachedTrackIds, playlists, onRefreshPlaylists, redirectTrigger, setRedirectTrigger }) => {
  const currentTrack = currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  return (
    <div className="flex h-screen w-full overflow-hidden relative bg-black bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#1a1a1a] via-[#050505] to-[#000000]">
      {/* Global Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0" />

      {/* SIDEBAR (Escritorio) */}
      <aside className={`hidden lg:flex flex-col border-r border-white/5 bg-black/20 backdrop-blur-2xl transition-all duration-300 z-30 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)] ${isSidebarCollapsed ? 'w-24' : 'w-64'}`}>
        <div
          className={`cursor-pointer flex justify-center items-center hover:opacity-80 transition-all ${isSidebarCollapsed ? 'p-4' : 'p-6'}`}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          <img
            src={skullImg}
            alt="Toggle Sidebar"
            className={`transition-all duration-300 pointer-events-none select-none animate-beat-pulse ${isSidebarCollapsed ? 'w-20 h-20' : 'w-24 h-24'}`}
            style={{
              mixBlendMode: 'screen'
            }}
          />
        </div>

        <nav className="flex-1 space-y-2 p-4">
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Radio size={20} />} label="Discovery" active={activeView === 'discovery'} onClick={() => setView('discovery')} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Hash size={20} />} label="Feed" active={activeView === 'feed'} onClick={() => setView('feed')} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<User size={20} />} label="Profile" active={activeView === 'profile' && (!viewingUserId || String(viewingUserId) === String(user?.id || user?.Id))} onClick={() => navigateToProfile(null)} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Play size={20} />} label="Player" active={activeView === 'player'} onClick={() => setView('player')} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<MessageSquare size={20} />} label="Messages" active={activeView === 'messages'} onClick={() => setView('messages')} hasNotification={hasNewMessages} />

          <div className="my-4 border-t border-white/10" />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Wallet size={20} />} label="Wallet" active={activeView === 'wallet'} onClick={() => setView('wallet')} />
        </nav>

        <div className={`p-6 ${isSidebarCollapsed ? 'text-center' : 'text-left'}`}>
          <button onClick={onLogout} className="text-[10px] text-[#ff006e]/30 hover:text-[#ff006e] uppercase tracking-widest font-bold">
            {isSidebarCollapsed ? <LogOut size={20} /> : 'Log_Out_System'}
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO DINÁMICO */}
      <main className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden z-10">
        {/* TOP NAV (Móvil) */}
        <header className="lg:hidden flex items-center justify-center p-4 border-b border-[#ff006e]/10 bg-black/90 backdrop-blur-md z-40 relative">
          <div className="flex gap-4">
            <NavButton icon={<Radio size={18} />} active={activeView === 'discovery'} onClick={() => setView('discovery')} />
            <NavButton icon={<Hash size={18} />} active={activeView === 'feed'} onClick={() => setView('feed')} />
            <NavButton icon={<Play size={18} />} active={activeView === 'player'} onClick={() => setView('player')} />
            <NavButton icon={<MessageSquare size={18} />} active={activeView === 'messages'} onClick={() => setView('messages')} hasNotification={hasNewMessages} />
            <NavButton icon={<User size={18} />} active={activeView === 'profile' && (!viewingUserId || String(viewingUserId) === String(user?.id || user?.Id))} onClick={() => navigateToProfile(null)} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative pb-24"> {/* Added pb-24 for MiniPlayer space */}
          <AnimatePresence mode="wait">
            {activeView === 'discovery' && (
              <DiscoveryMapView
                key="discovery"
                allTracks={tracks}
                onPlayPlaylist={handlePlayPlaylist}
                onLike={onLike}
                onCache={onCache} // PASS CACHE
                stats={globalStats}
                user={user}
                navigateToProfile={navigateToProfile}
                likedYoutubeIds={likedYoutubeIds}
                cachedTrackIds={cachedTrackIds} // PASS IDS
                playlists={playlists}
                onRefreshPlaylists={onRefreshPlaylists}
              />
            )}
            {activeView === 'wallet' && <WalletView user={user} onRefreshProfile={onRefreshProfile} />}
            {activeView === 'feed' && <FeedContent key="feed" />}
            {activeView === 'profile' && (
              <ProfileView
                key={viewingUserId || 'me'}
                targetUserId={viewingUserId}
                user={user}
                tracks={tracks}
                onLogout={onLogout}
                onAddCredits={onAddCredits}
                onRefreshProfile={onRefreshProfile}
                onRefreshTracks={onRefreshTracks}
                navigateToProfile={navigateToProfile}
                playlists={playlists}
                onRefreshPlaylists={onRefreshPlaylists}
                onPlayPlaylist={handlePlayPlaylist}
              />
            )}
            {activeView === 'player' && <PlayerContent
              key="player"
              initialScreen={redirectTrigger ? 'NOW_PLAYING' : 'MAIN'}
              forceNowPlaying={redirectTrigger}
              setView={setView}
              currentTrackIndex={currentTrackIndex}
              setCurrentTrackIndex={setCurrentTrackIndex}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              tracks={tracks}
              user={user}
              onPurchase={onPurchase}
              onDownload={onDownload}
              onAddCredits={onAddCredits}
              currentTime={currentTime}
              duration={duration}
              onSeek={onSeek}
              onNext={handleNext}
              onPrev={handlePrev}
              onLike={onLike}
              onCache={onCache}
              togglePlay={togglePlay}
              navigateToProfile={navigateToProfile}
              onPlayPlaylist={handlePlayPlaylist}
            />}
            {activeView === 'messages' && <MessagesView key="messages" user={user} navigateToProfile={navigateToProfile} />}
            {activeView === 'settings' && (
              <div key="settings" className="flex items-center justify-center h-full text-white/50 uppercase tracking-widest text-xs">
                Settings Module Offline
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MINI PLAYER (Todas las vistas excepto Player, y solo si hay track) */}
      <AnimatePresence>
        {activeView !== 'player' && currentTrackIndex >= 0 && (
          <MiniPlayer
            track={tracks[currentTrackIndex]}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onNext={handleNext}
            onPrev={handlePrev}
            onLike={onLike}
            onExpand={() => {
              console.log("[App] MiniPlayer expanded. Triggering redirect...", typeof setRedirectTrigger);
              if (typeof setRedirectTrigger === 'function') {
                setRedirectTrigger(Date.now());
                setView('player');
              } else {
                console.error("setRedirectTrigger is NOT a function!", setRedirectTrigger);
              }
            }}
            activeView={activeView}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MINI PLAYER COMPONENT ---
const MiniPlayer = ({ track, isPlaying, onTogglePlay, onNext, onPrev, onLike, onExpand, activeView }) => {
  const isMessages = activeView === 'messages';

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`absolute bottom-20 left-4 right-4 lg:bottom-4 lg:left-72 lg:right-8 backdrop-blur-xl border p-3 rounded-2xl flex items-center gap-4 z-[100] shadow-lg ${isMessages
        ? 'bg-black border-black/10 shadow-[0_0_10px_rgba(255,0,110,0.2)]'
        : 'bg-[#0a0a0a]/90 border-[#ff006e]/10 border-t-[#ff006e]/20 shadow-[0_0_15px_rgba(0,0,0,0.3)]'
        } `}
    >
      {/* Track Info (Click to expand) */}
      <div className="flex items-center gap-4 flex-1 cursor-pointer group" onClick={onExpand}>
        <div className={`w-12 h-12 rounded-lg border flex items-center justify-center relative overflow-hidden shrink-0 ${isMessages ? 'bg-[#111] border-[#333]' : 'bg-[#111] border-[#ff006e]/10'} `}>
          {track?.cover || track?.thumbnail ? (
            <img src={track.cover || track.thumbnail} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <Music size={20} className={`transition - colors ${isMessages ? 'text-[#ff006e]' : 'text-[#ff006e]/40 group-hover:text-[#ff006e]'} `} />
          )}
          {isPlaying && (!track?.cover && !track?.thumbnail) && <div className={`absolute inset - 0 animate - pulse ${isMessages ? 'bg-[#ff006e]/10' : 'bg-[#ff006e]/10'} `} />}
        </div>
        <div className="overflow-hidden">
          <h4 className={`text - xs font - black uppercase truncate transition - colors ${isMessages ? 'text-white' : 'text-white group-hover:text-[#ff006e]'} `}>{track?.title || 'No Track'}</h4>
          <p className={`text - [10px] font - bold uppercase truncate ${isMessages ? 'text-[#ff006e]' : 'text-[#ff006e]/50'} `}>{track?.artist || 'Unknown'}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 px-4">
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className={`transition - colors ${isMessages ? 'text-[#ff006e]/60 hover:text-[#ff006e]' : 'text-[#ff006e]/60 hover:text-white'} `}>
          <SkipBack size={20} fill="currentColor" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className={`w-10 h-10 flex items-center justify-center transition-transform hover:scale-105 ${isMessages ? 'text-[#ff006e]' : 'text-[#ff006e]'} `}
        >
          {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className={`transition - colors ${isMessages ? 'text-[#ff006e]/60 hover:text-[#ff006e]' : 'text-[#ff006e]/60 hover:text-white'} `}>
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>

      {/* Extra Actions */}
      <div className={`hidden sm:flex items-center gap-6 px-2 border-l pl-6 ${isMessages ? 'border-[#ff006e]/10' : 'border-[#ff006e]/10'} `}>
        <Heart
          size={20}
          className={`cursor-pointer transition-colors ${track?.isLiked ? 'text-[#ff006e] fill-[#ff006e]' : 'text-[#ff006e]/40 hover:text-[#ff006e]'} `}
          onClick={(e) => { e.stopPropagation(); onLike && onLike(track); }}
        />
        <Volume2 size={20} className={`cursor-pointer ${isMessages ? 'text-[#ff006e]/40 hover:text-[#ff006e]' : 'text-[#ff006e]/40 hover:text-[#ff006e]'} `} />
      </div>
    </motion.div>
  );
};

// --- CONTENIDO: DISCOVERY (TIPO SPOTIFY) ---
const DiscoveryContent = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-12">
    <div className="flex gap-4">
      {['Todo', 'Música', 'Podcasts'].map(f => (
        <button key={f} className={`px - 5 py - 2 rounded - full text - [10px] font - black uppercase tracking - widest ${f === 'Todo' ? 'bg-[#ff006e] text-black' : 'bg-[#1a1a1a] text-white hover:bg-[#333]'} `}>{f}</button>
      ))}
    </div>

    <section className="space-y-6">
      <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Acceso Rápido</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DISCOVERY_GRID.map(item => (
          <div key={item.id} className="bg-[#111] hover:bg-[#1a1a1a] flex items-center rounded-lg overflow-hidden group cursor-pointer border border-[#ff006e]/5 hover:border-[#ff006e]/30 transition-all">
            <div className={`w - 20 h - 20 shrink - 0 ${item.color === '#ff006e' ? 'bg-[#ff006e]' : 'bg-[#333]'} flex items - center justify - center shadow - 2xl`}>
              <Music size={28} className="text-black/50" />
            </div>
            <div className="p-4 flex-1 text-xs font-black text-white uppercase truncate">{item.name}</div>
            <div className="px-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 bg-[#ff006e] rounded-full flex items-center justify-center shadow-[0_0_15px_#ff006e]"><Play size={16} fill="black" /></div>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-6">
      <div className="flex justify-between items-end">
        <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Lanzamientos de Viernes</h2>
        <button className="text-[10px] font-bold text-[#ff006e] hover:underline uppercase">Ver todo</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#0a0a0a] border border-[#ff006e]/10 p-4 rounded-2xl hover:bg-[#111] group transition-all cursor-pointer">
            <div className="aspect-square bg-black border border-[#ff006e]/20 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-[#ff006e20] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Music size={50} className="text-[#ff006e]/10 group-hover:text-[#ff006e]/30" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase truncate">Friday_Sect_{i}</h3>
            <p className="text-[9px] text-[#ff006e]/40 uppercase mt-1">Vamp_Studio_Records</p>
          </div>
        ))}
      </div>
    </section>
  </motion.div>
);

// --- CONTENIDO: FEED (3 COLUMNAS) ---
const FeedContent = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row h-full">
    {/* Izquierda: Acciones */}
    <div className="hidden lg:block w-72 p-6 space-y-6 border-r border-[#ff006e]/5 relative z-20">
      <div className="bg-[#0a0a0a]/50 backdrop-blur-xl border border-[#ff006e]/20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <div className="p-4 bg-[#ff006e]/5 border-b border-[#ff006e]/10 flex justify-between items-center text-[10px] font-black uppercase text-white">Quick Actions <ChevronDown size={14} /></div>
        <div className="p-4 space-y-2">
          {['New Post', 'Upload Track', 'Live Stream'].map(a => (
            <button key={a} className="w-full text-left p-2 text-[10px] font-bold text-[#ff006e]/50 hover:text-white hover:bg-[#ff006e10] rounded transition-all uppercase tracking-tighter">{a}</button>
          ))}
        </div>
      </div>
      <div className="space-y-4 px-2">
        <h3 className="text-[10px] font-black uppercase text-[#ff006e]/30 tracking-widest px-2">People to Follow</h3>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 hover:bg-[#ff006e]/5 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-[#ff006e]/10">
            <div className="w-8 h-8 rounded-full border border-[#ff006e]/30 flex items-center justify-center text-[10px] font-bold">V</div>
            <div className="flex-1 overflow-hidden">
              <div className="text-[10px] font-black text-white uppercase">User_Goth_{i}</div>
              <div className="text-[8px] text-[#ff006e]/40 truncate">@vamp_user_{i}</div>
            </div>
            <button className="text-[9px] font-black text-[#ff006e]">FOLLOW</button>
          </div>
        ))}
      </div>
    </div>

    {/* Centro: El Muro */}
    <div className="flex-1 p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter">Feed</h2>
        <RefreshCw size={24} className="opacity-40 hover:opacity-100 cursor-pointer" />
      </div>
      {FEED_POSTS.map(post => (
        <div key={post.id} className="bg-[#0a0a0a] border border-[#ff006e]/10 p-6 rounded-3xl space-y-4 shadow-2xl hover:border-[#ff006e]/30 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#ff006e]/40 flex items-center justify-center font-black text-white group-hover:border-[#ff006e]">{post.user[0]}</div>
            <div>
              <h3 className="text-xs font-black text-white uppercase">{post.user}</h3>
              <p className="text-[10px] text-[#ff006e]/40 font-bold">{post.handle} • {post.time}</p>
            </div>
          </div>
          {post.type === 'text' && <p className="text-sm italic text-white/90 leading-relaxed">"{post.content}"</p>}
          {post.type === 'track' && (
            <div className="bg-black/80 border border-[#ff006e]/20 p-5 rounded-2xl flex items-center gap-4 group/track cursor-pointer hover:bg-[#ff006e10]">
              <div className="w-10 h-10 bg-[#ff006e] rounded-full flex items-center justify-center shadow-[0_0_15px_#ff006e]"><Play size={18} fill="black" /></div>
              <div>
                <div className="text-[9px] text-[#ff006e] font-black uppercase">Shared Track</div>
                <div className="text-sm font-bold text-white uppercase">{post.track}</div>
              </div>
            </div>
          )}
          {post.type === 'image' && <div className="rounded-2xl overflow-hidden border border-[#ff006e]/10 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100"><img src={post.image} className="w-full h-auto" /></div>}
          <div className="flex gap-8 pt-4 border-t border-[#ff006e]/5 text-[10px] font-bold opacity-40 uppercase">
            <button className="flex items-center gap-2 hover:text-white"><Heart size={14} /> {post.likes}</button>
            <button className="flex items-center gap-2 hover:text-white"><MessageSquare size={14} /> Reply</button>
            <button className="flex items-center gap-2 hover:text-white"><Repeat size={14} /> {post.reposts}</button>
          </div>
        </div>
      ))}
    </div>

    {/* Derecha: Radios & Recomendados */}
    <div className="hidden xl:block w-80 p-6 space-y-8 bg-black/40 border-l border-[#ff006e]/5">
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-[#ff006e]/30 px-2 tracking-[0.3em] Radio Stations">Radio Stations</h3>
        {RADIO_STATIONS.map(radio => (
          <div key={radio.id} className={`p - 4 rounded - 2xl border ${radio.active ? 'bg-green-950/20 border-green-500/30' : 'bg-black/60 border-[#ff006e]/10 opacity-60'} `}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w - 2 h - 2 rounded - full ${radio.active ? 'bg-green-500 animate-pulse' : 'bg-gray-600'} `} />
              <span className="text-xs font-black text-white uppercase">{radio.name}</span>
            </div>
            <p className="text-[10px] text-white/50 mb-4 italic truncate">{radio.active ? `Now Playing: ${radio.track} ` : 'Currently Offline'}</p>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black opacity-30 uppercase">{radio.listeners} listening</span>
              {radio.active && <button className="px-3 py-1 bg-transparent border border-green-500 text-green-500 text-[9px] font-black rounded hover:bg-green-500 hover:text-black transition-all">Tune In</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);





// --- CONTENIDO: PLAYER (PANTALLA COMPLETA) ---
const PlayerContent = ({
  setView,
  currentTrackIndex,
  setCurrentTrackIndex,
  isPlaying,
  setIsPlaying,
  tracks,
  currentTime,
  duration,
  onSeek,
  user,
  onPurchase,
  onDownload,
  onAddCredits,
  onNext,
  onPrev,
  onLike,
  togglePlay,
  navigateToProfile,
  onPlayPlaylist,
  forceNowPlaying
}) => {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <IPodPlayer
        forceNowPlaying={forceNowPlaying}
        currentTrackIndex={currentTrackIndex}
        setCurrentTrackIndex={setCurrentTrackIndex}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        tracks={tracks}
        onMinimize={() => setView('discovery')}
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        onNext={onNext}
        onPrev={onPrev}
        onLike={onLike}
        togglePlay={togglePlay}
        user={user}
        onPurchase={onPurchase}
        onDownload={onDownload}
        onAddCredits={onAddCredits}
        navigateToProfile={navigateToProfile}
        onPlayPlaylist={onPlayPlaylist}
      />
    </div>
  );
};
// --- COMPONENTES AUXILIARES ---

const SidebarLink = ({ icon, label, active, onClick, collapsed, hasNotification }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 group border relative
      ${active
        ? 'bg-[#ff006e]/10 text-white/90 border-[#ff006e]/50 shadow-[0_0_15px_rgba(255,0,110,0.25)]'
        : 'text-[#ff006e]/60 border-transparent hover:bg-[#ff006e]/5 hover:text-[#ff006e] hover:border-[#ff006e]/20'
      } ${collapsed ? 'justify-center' : ''}`}
    title={collapsed ? label : ''}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-105 drop-shadow-[0_0_8px_#ff006e]' : 'group-hover:scale-105'}`}>
      {icon}
    </div>
    {!collapsed && <span className={`text-[11px] font-black uppercase tracking-widest transition-opacity ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>}
    {hasNotification && !active && (
      <div className="absolute top-2 right-2 w-2 h-2 bg-[#ff006e] rounded-full shadow-[0_0_8px_#ff006e] animate-pulse" />
    )}
  </button>
);

const NavButton = ({ icon, active, onClick, hasNotification }) => (
  <button onClick={onClick} className="relative p-2 transition-all group">
    <div className={`${active ? 'text-white scale-125' : 'text-[#ff006e]/40 hover:text-[#ff006e]'} `}>{icon}</div>
    {hasNotification && !active && (
      <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#ff006e] rounded-full shadow-[0_0_5px_#ff006e]" />
    )}
  </button>
);

const QuickActionButton = ({ label, icon }) => (
  <button className="w-full flex items-center justify-between p-3 rounded-lg border border-[#ff006e]/10 text-[10px] font-bold text-[#ff006e]/60 hover:bg-[#ff006e10] hover:text-white transition-all uppercase">{label} {icon}</button>
);

// --- DATOS DEL FEED (ACTUALIZADOS) ---
const FEED_POSTS = [
  { id: 1, user: 'Vamp_Grl', handle: '@vampy', content: 'Escaneando frecuencias prohibidas en el sector Miami. ¿Alguien en sintonía?', type: 'text', likes: 24, reposts: 5, time: '2m' },
  { id: 2, user: 'Neo_Raver', handle: '@neo_r', track: 'GLITCH_MATRIX_404.wav', type: 'track', likes: 150, reposts: 42, time: '15m' },
  { id: 3, user: 'Null_Pointer', handle: '@null_ptr', content: 'Nueva sesión de visuales industriales lista.', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400', type: 'image', likes: 88, reposts: 12, time: '1h' },
];
export default function AppWrapper() {
  return (
    <NotificationProvider>
      <App />
    </NotificationProvider>
  );
}
