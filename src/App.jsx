// Deployment Trigger: 2026-03-19T01:45:00-04:00
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
  Frown, Star, Volume2, VolumeX, Plus, Globe, Maximize2, Minimize2, LogOut, Wallet,
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
import ContentModal from './components/ContentModal';

import API from './services/api';
import { SECTORS, API_BASE_URL, getMediaUrl, getUserId } from './constants';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { initSignalR, joinStation, leaveStation, syncTrack, sendMessage, requestTrack } from './services/signalr';

// --- BASE DE DATOS MOCK (Sincronizada en toda la app) ---
const TRACKS = [
  { id: 'mock-1', title: 'youtsplit', artist: 'menoboy', album: 'digital_void', duration: '2:09', cover: 'O', artistUserId: 3, price: 0, isLocked: false, playCount: 1450, source: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'mock-2', title: 'glitch_heart', artist: 'cyber_vamp', album: 'neon_night', duration: '3:15', cover: 'V', artistUserId: 3, price: 5, isLocked: true, playCount: 890, source: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'mock-3', title: 'thorny_path', artist: 'dark_pixel', album: 'vamp_glitch', duration: '1:45', cover: 'P', artistUserId: 3, price: 2, isLocked: false, playCount: 3200, source: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'mock-4', title: 'neon_skull', artist: 'retro_void', album: 'system_error', duration: '4:20', cover: 'S', artistUserId: 99, price: 10, isLocked: true, playCount: 120, source: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'mock-5', title: 'digital_tear', artist: 'emo_system', album: 'null_life', duration: '2:55', cover: 'E', artistUserId: 1, price: 1, isLocked: false, playCount: 5500, source: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
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


const hashStr = (s) => {
  if (!s) return 0;
  let h = 0;
  const str = s.toString();
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
};

// --- COMPONENTE PRINCIPAL ---
function App() {
  const [activeView, setViewOriginal] = useState('login');
  const [previousView, setPreviousView] = useState('discovery');
  const [viewingUserId, setViewingUserId] = useState(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const { showNotification } = useNotification();

  // Navigation Wrapper
  const setView = (newView) => {
    if (activeView !== newView && activeView !== 'login') {
      setPreviousView(activeView);
    }
    setViewOriginal(newView);
  };

  // login, discovery, feed, profile, player
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [redirectTrigger, setRedirectTrigger] = useState(null); // Refactored to fix RefError
  const [user, setUser] = useState(null);
  
  const currentUserId = getUserId(user);
  const [tracks, setTracks] = useState([]);
  const [libraryTracks, setLibraryTracks] = useState([]);

  // Real-time Audio State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1); // 0 to 1

  // Live Radio State
  const [followingMap, setFollowingMap] = useState({});
  const [favoriteStations, setFavoriteStations] = useState([]);
  const [liveStations, setLiveStations] = useState(RADIO_STATIONS);
  const [activeStation, setActiveStation] = useState(null);
  const [stationChat, setStationChat] = useState([]);
  const [stationQueue, setStationQueue] = useState([]);

  // --- AUDIO LOGIC (Unified Manager) ---
  const currentTrack = React.useMemo(() => {
    const raw = (currentTrackIndex >= 0 && tracks[currentTrackIndex])
      ? tracks[currentTrackIndex]
      : (TRACKS[0] || { source: '', title: 'Loading...', artist: 'System' });

    return {
      ...raw,
      id: raw.id || raw.Id,
      title: raw.title || raw.Title,
      artist: raw.artist || raw.ArtistName || raw.Artist || 'Unknown Artist',
      source: raw.source || raw.Source,
      cover: raw.cover || raw.coverImageUrl || raw.CoverImageUrl,
      isLocked: raw.isLocked ?? (raw.IsLocked ?? false),
      isOwned: raw.isOwned ?? (raw.IsOwned ?? true)
    };
  }, [currentTrackIndex, tracks]);

  // Audio Ref for persistence
  const audioRef = useRef(null);

  // Organic Intelligence Event Tracker
  const listenEventRef = useRef({ id: null, startTime: null });

  // YouTube Player State
  const [youtubePlayer, setYoutubePlayer] = useState(null);
  const [isYoutubeMode, setIsYoutubeMode] = useState(false);

  // Discovery Analytics State
  const [globalStats, setGlobalStats] = useState(null);
  const [likedYoutubeIds, setLikedYoutubeIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('liked_youtube_ids') || '[]')); } catch { return new Set(); }
  });
  const [subscription, setSubscription] = useState(null);
  const [cachedTrackIds, setCachedTrackIds] = useState(new Set());
  const [followedCommunities, setFollowedCommunities] = useState(() => {
    try { return JSON.parse(localStorage.getItem('followed_communities') || '[]'); } catch { return []; }
  });

  // Sync Audio Volume & Mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = volume;
    }
    if (youtubePlayer && typeof youtubePlayer.mute === 'function') {
      try {
        if (youtubePlayer.getIframe?.()) {
          if (isMuted) youtubePlayer.mute();
          else {
            youtubePlayer.unMute();
            youtubePlayer.setVolume(volume * 100);
          }
        }
      } catch (e) {
        console.warn("YouTube Volume Sync Error (Suppressed):", e);
      }
    }
  }, [isMuted, volume, youtubePlayer]);

  const fetchFavoriteStations = async (uid) => {
    try {
      const targetId = uid || user?.id || user?.Id;
      if (!targetId || targetId === 'undefined') {
        // Favorited stations require a user context
        return;
      }
      const res = await API.Stations.getFavorites();
      setFavoriteStations(res.data || []);
    } catch (e) {
      console.error("Failed to fetch favorite stations", e);
    }
  };

  const fetchLiveStations = async () => {
    try {
      const res = await API.Stations.getAll();
      if (res.data && res.data.length > 0) {
        setLiveStations(res.data);
        
        // Auto-sync host's activeStation
        const currentUserId = user?.id || user?.Id;
        if (currentUserId && !activeStation) {
           const myStation = res.data.find(s => 
             String(s.artistUserId || s.ArtistUserId) === String(currentUserId)
           );
           if (myStation && (myStation.isLive || myStation.IsLive)) {
             setActiveStation(myStation);
           }
        }
      }
    } catch (e) {
      console.error("Failed to fetch live stations", e);
    }
  };
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [profileInitialModal, setProfileInitialModal] = useState(null);
  const [activeMessageUser, setActiveMessageUser] = useState(null);





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
        if (youtubePlayer.getIframe?.()) {
          youtubePlayer.seekTo(newTime, true);
          setCurrentTime(newTime);
        }
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
      // ── Ensure it's actually playing if the state suggests it
      try {
        if (typeof youtubePlayer.getPlayerState === 'function') {
          // Safeguard to prevent "this.g is null"
          if (youtubePlayer.getIframe && youtubePlayer.getIframe()) {
            const state = youtubePlayer.getPlayerState();
            if (state !== 1 && state !== 3) { // 1=playing, 3=buffering
              youtubePlayer.playVideo();
            }
          }
        }
      } catch (e) { console.warn("YouTube PlayVideo Error:", e); }

      interval = setInterval(() => {
        try {
          if (youtubePlayer && typeof youtubePlayer.getCurrentTime === 'function') {
            if (youtubePlayer.getIframe && youtubePlayer.getIframe()) {
              const time = youtubePlayer.getCurrentTime();
              const dur = youtubePlayer.getDuration();
              if (dur && dur > 0 && dur !== duration) setDuration(dur);
              setCurrentTime(time);
            }
          }
        } catch (e) {
          console.warn("YouTube Polling Error:", e);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isYoutubeMode, isPlaying, youtubePlayer, currentTrack?.id]);

  useEffect(() => {
    const handleTuneIn = (e) => {
        const station = e.detail;
        setActiveStation(station);
        joinStation(station.id || station.Id);
        // Note: we can use the notification context if we wrap this in a component that has it,
        // but App.jsx uses it. We might need to ensure showNotification is accessible or just let it be silent.
    };
    window.addEventListener('tuneIn', handleTuneIn);
    return () => window.removeEventListener('tuneIn', handleTuneIn);
  }, []);

  useEffect(() => {
    // Check for existing session
    let token = localStorage.getItem('token');
    let savedUser = localStorage.getItem('user');
    
    // Sanitize: sometimes 'undefined' string gets stored if logic is buggy
    if (token === 'undefined' || !token) {
      localStorage.removeItem('token');
      token = null; // Clear token for current session
    }
    
    if (savedUser && savedUser !== 'undefined') {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && (parsed.id || parsed.Id)) {
          setUser(parsed);
          setView('discovery'); // Default to discovery if we have a valid session
        } else {
          console.warn("[App] Corrupt user object in localStorage, clearing.");
          localStorage.removeItem('user');
          savedUser = null; // Clear savedUser for current session
          setUser(null);
        }
      } catch (e) {
        console.error("[App] Failed to parse saved user", e);
        localStorage.removeItem('user');
        savedUser = null; // Clear savedUser for current session
        setUser(null);
      }
    } else if (savedUser === 'undefined') {
      localStorage.removeItem('user');
      savedUser = null; // Clear savedUser for current session
    }

    if (token && savedUser) {
      // Initialize SignalR listener
      const conn = initSignalR(token);

      conn.on("TrackSynced", (trackData, syncTime, hostIsPlaying) => {
        setTracks(prev => {
           const currentTrack = prev[0]; // If listening, queue is handled sequentially
           if (!currentTrack || (currentTrack.id !== trackData.id && currentTrack.Id !== trackData.Id)) {
               const mapped = { ...trackData, isLocked: false, isOwned: true };
               return [mapped];
           }
           return prev;
        });
        setCurrentTrackIndex(0);
        setIsPlaying(hostIsPlaying);
        
        // Use timeout to allow React to render the new track element before playing
        setTimeout(() => {
            if (hostIsPlaying) {
                const isYtLocal = trackData.source?.startsWith('youtube:');
                if (isYtLocal) {
                    // Try to seek youtube player if it exists. Note: youtube player state is hard to access here from effect without deps 
                    // This relies on the useEffect `[isYoutubeMode, isPlaying, youtubePlayer]` picking up the seek and track change later.
                    // But we can trigger handleSeek if accessible
                } else if (audioRef.current) {
                    audioRef.current.currentTime = syncTime;
                }
            }
        }, 100);
      });

      conn.on("ReceiveMessage", (msg) => {
          setStationChat(prev => [...prev, msg].slice(-50));
      });

      conn.on("TrackRequested", (req) => {
          setStationQueue(prev => [...prev, req].slice(-20));
      });

      conn.on("StationEnded", (data) => {
          setActiveStation(prev => {
              if (prev && (prev.id === data.stationId || prev.Id === data.stationId)) {
                  showNotification("BROADCAST_ENDED", "The live radio station has disconnected.", "info");
                  leaveStation(data.stationId);
                  return null;
              }
              return prev;
          });
          fetchLiveStations();
      });

      conn.on("StationWentLive", (data) => {
          fetchLiveStations();
      });
    }
  }, []);

  // --- HOST BROADCASTING LOGIC ---
  useEffect(() => {
      const uid = currentUserId;
      if (uid && currentTrack) {
          API.Stations.getByUserId(uid).then(res => {
              if (res.data) {
                  syncTrack(res.data.id || res.data.Id, currentTrack, currentTime, isPlaying);
              }
          }).catch(e => console.warn("Track sync failed:", e));
      }
   }, [currentTrack?.id, isPlaying, currentUserId]);

  const fetchPlaylists = async (uid) => {
    try {
      const targetId = uid || user?.id || user?.Id;
      if (!targetId || targetId === 'undefined') {
        console.warn("[App] Skipping playlist fetch: invalid target ID", targetId);
        return;
      }
      const res = await API.Playlists.getUserPlaylists(targetId);
      const validPlaylists = (res.data || []).filter(p => p && (p.id || p.Id));
      setUserPlaylists(validPlaylists);
    } catch (err) {
      console.error("App: Fatal error syncing playlists", err);
    }
  };

  useEffect(() => {
    const uid = currentUserId;
    if (uid) {
      console.log("[App] Syncing user data for ID:", uid);
      fetchLikes(uid);
      fetchFavoriteStations(uid);
      fetchLiveStations(uid);
      fetchPlaylists(uid);
    }
  }, [currentUserId]);

  // Fetch Tracks, Purchases, Likes (Local & YouTube), Subscription
  const fetchTracks = async () => {
    try {
      const uid = currentUserId;
      if (!uid) return;
      console.log("[App] Fetching tracks for user:", uid);

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

      const ytIds = new Set(likes
        .filter(t => t && (t.source || t.Source)?.startsWith('youtube:'))
        .map(t => (t.source || t.Source).split(':')[1])
        .filter(Boolean)
      );
      setLikedYoutubeIds(ytIds);

      const cachedIds = new Set(cachedTracks.map(t => t.youtubeTrackId || t.YoutubeTrackId));
      setCachedTrackIds(cachedIds);

      const ownedTrackIds = new Set(purchases.map(p => String(p.trackId || p.TrackId || p.id || p.Id)));
      const likedTrackIds = new Set(likes.map(l => String(l.trackId || l.TrackId || l.id || l.Id)));

      const uniqueTracksMap = new Map();
      const titleArtistMap = new Map();

      const getUniqueKey = (t) => {
        const src = t.source || t.Source;
        if (src && src.startsWith('youtube:')) return src;
        return src || String(t.id || t.Id);
      };

      const getMetaKey = (t) => {
        const title = (t.title || t.Title || "").toLowerCase().trim();
        const artist = (t.artist || t.ArtistName || t.album?.artist?.name || "").toLowerCase().trim();
        return title ? `${artist} - ${title}` : null;
      };

      if (tracksRes.data && tracksRes.data.length > 0) {
        tracksRes.data.forEach((t) => {
          const trackId = String(t.id || t.Id || "");
          if (!trackId || trackId === "undefined") return;

          const artistUserId = t.artistUserId || t.ArtistUserId || t.album?.artist?.userId || t.Album?.Artist?.UserId;
          const isMine = artistUserId && String(artistUserId) === String(uid);

          const trackSource = t.source || t.Source || t.filePath || t.FilePath;
          const isYT = trackSource?.startsWith('youtube:');
          const resolvedSource = isYT ? trackSource : getMediaUrl(trackSource);

          if (!resolvedSource || resolvedSource === API_BASE_URL || resolvedSource === `${API_BASE_URL}/`) return;

          const artistName = t.album?.artist?.name || t.Album?.Artist?.Name || '';
          if (artistName === 'The Archive') return;

          const mappedTrack = {
            ...t,
            id: trackId,
            title: t.title || t.Title || 'Unknown Title',
            artist: artistName || 'Unknown Artist',
            album: t.album?.title || t.Album?.Title || 'Unknown Album',
            duration: t.duration || t.Duration || '3:00',
            cover: getMediaUrl(t.coverImageUrl || t.CoverImageUrl),
            source: resolvedSource,
            isOwned: ownedTrackIds.has(trackId) || isMine,
            isLiked: likedTrackIds.has(trackId),
            isCached: cachedIds.has(Number(trackId)) || cachedIds.has(trackId),
          };

          const key = getUniqueKey(mappedTrack);
          const metaKey = getMetaKey(mappedTrack);

          if (!uniqueTracksMap.has(key)) {
            uniqueTracksMap.set(key, mappedTrack);
            if (metaKey) titleArtistMap.set(metaKey, key);
          }
        });
      }

      if (likes.length > 0) {
        likes.filter(yt => (yt.source || yt.Source)?.startsWith('youtube:')).forEach(yt => {
          const yId = (yt.source || yt.Source).split(':')[1];
          const sourceKey = `youtube:${yId}`;
          if (uniqueTracksMap.has(sourceKey)) {
            const existing = uniqueTracksMap.get(sourceKey);
            uniqueTracksMap.set(sourceKey, { ...existing, isLiked: true });
            return;
          }
          const mappedYt = {
            id: String(yt.id || yt.Id || `yt-${yId}`),
            videoId: yId,
            title: yt.title || yt.Title,
            artist: yt.channelTitle || "Unknown Artist",
            source: sourceKey,
            isLiked: true,
            isOwned: false,
            isLocked: false,
            isCached: cachedIds.has(yt.id)
          };
          uniqueTracksMap.set(sourceKey, mappedYt);
        });
      }

      const allTracks = Array.from(uniqueTracksMap.values());
      const finalTracks = allTracks.length > 0 ? allTracks : (uid ? [] : TRACKS);
      setLibraryTracks(finalTracks);
      setTracks(prev => {
        const isMock = prev.length > 0 && String(prev[0].id).startsWith('mock-');
        return (prev.length === 0 || isMock) ? finalTracks : prev;
      });
    } catch (error) {
      console.error("Failed to fetch tracks", error);
      setLibraryTracks(TRACKS);
      setTracks(prev => prev.length === 0 ? TRACKS : prev);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [currentUserId]);

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

    const trackSource = track.source || track.Source;
    const isLocked = (track.isLocked ?? false) && !(track.isOwned ?? true);
    const isYT = trackSource && trackSource.startsWith('youtube:');

    // 1. Mode Switching
    if (isYT) {
      if (!isYoutubeMode) setIsYoutubeMode(true);
      if (!audio.paused) {
        audio.pause();
        audio.removeAttribute('src');
        audio.setAttribute('data-playing-src', '');
      }
    } else {
      if (isYoutubeMode) setIsYoutubeMode(false);

      // Handle Local Audio Source Change
      const currentSrc = audio.getAttribute('data-playing-src');
      if (trackSource && (currentSrc !== trackSource)) {
        console.log(`[PLAYER] Loading new local source: ${trackSource}`);
        audio.src = trackSource;
        audio.setAttribute('data-playing-src', trackSource);
        audio.load();
        setCurrentTime(0);
      }
    }

    // 2. Playback State Sync
    if (isPlaying && !isLocked) {
      if (isYT) {
        if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
          try {
            const state = youtubePlayer.getPlayerState();
            if (state !== 1 && state !== 3) youtubePlayer.playVideo();
          } catch (e) { }
        }
      } else {
        if (audio.paused && audio.src) {
          audio.play().catch(e => {
            if (e.name !== 'AbortError') console.warn("Auto-play blocked", e);
          });
        }
      }
    } else {
      // Paused
      if (isYT) {
        if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
          try {
            if (youtubePlayer.getPlayerState() === 1) youtubePlayer.pauseVideo();
          } catch (e) { }
        }
      } else {
        if (!audio.paused) audio.pause();
      }
    }
  }, [currentTrackIndex, tracks, isPlaying, isYoutubeMode, youtubePlayer]);

  const finalizeListenEvent = () => {
    if (listenEventRef.current.id && listenEventRef.current.startTime) {
      const duration = Math.floor((Date.now() - listenEventRef.current.startTime) / 1000);
      if (duration > 0) {
        API.Organic.updateEventDuration(listenEventRef.current.id, duration).catch(e => {
          console.warn("[ORGANIC] Failed to finalize duration", e);
        });
        console.log(`[ORGANIC] Finalized duration for event ${listenEventRef.current.id}: ${duration}s`);
      }
      listenEventRef.current = { id: null, startTime: null };
    }
  };

  const logListeningEvent = async (track, source = 'queue') => {
    finalizeListenEvent(); // Cap the previous track if it was skipped/ended

    if (!track || !user) return;
    try {
      const isYT = (track.source || track.Source)?.startsWith('youtube:');
      const trackId = isYT ? (track.source || track.Source).split(':')[1] : (track.id || track.Id);

      const res = await API.Organic.logEvent({
        trackType: isYT ? 'youtube' : 'local',
        trackId: String(trackId),
        trackTitle: track.title || track.Title,
        tags: track.tags || track.Tags || 'general',
        durationSeconds: 0,
        source: source
      });
      listenEventRef.current = { id: res.data.eventId, startTime: Date.now() };
      console.log("[ORGANIC] Listening event started for:", track.title);
    } catch (e) {
      console.warn("[ORGANIC] Failed to start listening event:", e);
    }
  };

  const handleNext = async () => {
    if (tracks.length === 0) return;

    const nextIndex = currentTrackIndex + 1;

    if (nextIndex < tracks.length) {
      setCurrentTrackIndex(nextIndex);
      setIsPlaying(true);
    } else {
      console.log("[ORGANIC] Queue exhausted. Fetching recommendations...");
      try {
        const lastTrack = tracks[currentTrackIndex];
        const isYT = (lastTrack?.source || lastTrack?.Source)?.startsWith('youtube:');
        const lastVideoId = isYT ? (lastTrack.source || lastTrack.Source).split(':')[1] : null;

        const res = await API.Organic.getNextRecommendation(
          lastVideoId || 'COLD_START',
          isYT ? 'youtube' : 'local',
          3
        );

        if (res.data && res.data.length > 0) {
          const rec = res.data[0];
          const mappedRec = {
            id: rec.trackId,
            title: rec.title,
            artist: rec.author || rec.artist || 'Recommended',
            source: rec.trackType === 'youtube' ? `youtube:${rec.trackId}` : rec.trackId,
            cover: rec.thumbnailUrl,
            tags: rec.tags,
            isOwned: true,
            isLocked: false
          };

          // Update tracks first, then index
          const currentCount = tracks.length;
          setTracks(prev => [...prev, mappedRec]);
          setCurrentTrackIndex(currentCount);
          setIsPlaying(true);
          showNotification("SIGNAL_EVOLVED", `Organic Intelligence: "${mappedRec.title}"`, "success");
        } else {
          setCurrentTrackIndex(0);
          setIsPlaying(true);
        }
      } catch (err) {
        console.error("[ORGANIC] Error fetching recommendations:", err);
        setCurrentTrackIndex(0);
      }
    }
  };

  // --- ORGANIC LOGGING EFFECT ---
  useEffect(() => {
    if (isPlaying && currentTrackIndex >= 0 && currentTrack) {
      // Small delay or logic to ensure it's a "real" play
      const timer = setTimeout(() => {
        logListeningEvent(currentTrack, tracks.length > 1 ? 'queue' : 'single');
      }, 2000);
      return () => {
        clearTimeout(timer);
        finalizeListenEvent();
      };
    } else {
      // Finalize if playback stops/pauses
      finalizeListenEvent();
    }
  }, [currentTrack?.id, isPlaying]);

  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % (tracks.length || 1));
    setIsPlaying(true);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  // Modified to use main library tracks for correct Like status
  const handlePlayPlaylist = (playlistTracksRaw, startIndex = 0) => {
    // 1. Create a lookup map of all known tracks
    const libraryMap = new Map();
    libraryTracks.forEach(t => {
      libraryMap.set(String(t.id || t.Id), t);
      if (t.source) libraryMap.set(t.source, t);
    });

    // 2. Map the playlist tracks to the library versions but PRESERVE critical discovery data
    const enrichedQueue = playlistTracksRaw.map(pTrack => {
      const pId = String(pTrack.id || pTrack.Id);
      const pSource = pTrack.source || pTrack.Source;

      let found = libraryMap.get(pSource);
      if (!found) found = libraryMap.get(pId);

      if (found) {
        // PRIORITY: If pTrack (from Discovery) has an absolute URL (http...) or YT protocol, use it.
        // Otherwise fallback to library version (found).
        const isDiscoveryAbsolute = (pTrack.source || pTrack.Source || "").startsWith('http') || (pTrack.source || pTrack.Source || "").startsWith('youtube:');

        return {
          ...found,
          id: pId || found.id || found.Id,
          source: isDiscoveryAbsolute ? (pTrack.source || pTrack.Source) : (found.source || found.Source || pTrack.source || pTrack.Source),
          cover: isDiscoveryAbsolute ? (pTrack.cover || pTrack.CoverImageUrl || pTrack.Cover) : (found.cover || found.CoverImageUrl || found.Cover || pTrack.cover || pTrack.CoverImageUrl || pTrack.Cover),
          isOwned: true,
          isLocked: false
        };
      }
      return pTrack;
    });

    console.log("[App] Playing Playlist via Enriched Queue. Count:", enrichedQueue.length);

    // 3. Set states
    const firstTrack = enrichedQueue[startIndex];
    const isYT = (firstTrack?.source || firstTrack?.Source)?.startsWith('youtube:');

    setTracks(enrichedQueue);
    setCurrentTrackIndex(startIndex);
    setIsPlaying(true);
    if (isYT) setIsYoutubeMode(true);
  };

  // Fetch User Profile & Credits
  const fetchUserProfile = async (notify = false, userOverride = null) => {
    try {
      // Use override if provided (prevents race condition with localStorage)
      const activeUser = userOverride || user;
      const userIdToFetch = activeUser?.id || activeUser?.Id;
      if (!userIdToFetch || userIdToFetch === 'undefined') {
        console.warn("[App] Skipping profile fetch: invalid user ID", userIdToFetch);
        return;
      }
      const res = await API.Users.getProfile(userIdToFetch);
      if (res.data) {
        const rawData = res.data.user || res.data;
        const uid = rawData?.id || rawData?.Id || rawData?.userId || rawData?.UserId || userIdToFetch;
        
        // Deep extraction with previous state fallbacks to prevent "empty profile" glitch
        const userData = {
          id: uid,
          username: rawData?.username || rawData?.Username || user?.username,
          email: rawData?.email || rawData?.Email || user?.email,
          credits: rawData?.creditsBalance !== undefined ? rawData?.creditsBalance : (rawData?.CreditsBalance !== undefined ? rawData?.CreditsBalance : (user?.credits || 0)),
          biography: rawData?.biography || rawData?.Biography || rawData?.bio || rawData?.Bio || user?.biography || '',
          profileImageUrl: getMediaUrl(rawData?.profilePictureUrl || rawData?.profileImageUrl || rawData?.ProfilePictureUrl || rawData?.imageUrl || rawData?.ImageUrl) || user?.profileImageUrl,
          residentSectorId: rawData?.residentSectorId !== undefined ? rawData?.residentSectorId : (rawData?.ResidentSectorId !== undefined ? rawData?.ResidentSectorId : (user?.residentSectorId || 0)),
          isLive: rawData?.isLive !== undefined ? rawData?.isLive : (rawData?.IsLive !== undefined ? rawData?.IsLive : (user?.isLive || false)),
          bannerUrl: getMediaUrl(rawData?.bannerUrl || rawData?.BannerUrl) || user?.bannerUrl,
          wallpaperVideoUrl: getMediaUrl(rawData?.wallpaperVideoUrl || rawData?.WallpaperVideoUrl) || user?.wallpaperVideoUrl,
          themeColor: rawData?.themeColor || rawData?.ThemeColor || user?.themeColor || '#ff006e',
          textColor: rawData?.textColor || rawData?.TextColor || user?.textColor || '#ffffff',
          backgroundColor: rawData?.backgroundColor || rawData?.BackgroundColor || user?.backgroundColor || '#000000',
          isGlass: rawData?.isGlass !== undefined ? rawData?.isGlass : (rawData?.IsGlass !== undefined ? rawData?.IsGlass : (user?.isGlass || false)),
          communityId: rawData?.communityId || rawData?.CommunityId || user?.communityId,
          communityName: rawData?.communityName || rawData?.CommunityName || user?.communityName,
          communityColor: rawData?.communityColor || rawData?.CommunityColor || user?.communityColor
        };

        setUser(prev => {
          const updated = { ...userData };
          try { localStorage.setItem('user', JSON.stringify(updated)); } catch(e) {}
          return updated;
        });
        if (notify) {
          // alert(`VERIFICACIÓN SERVIDOR: \n\nSaldo sincronizado: ${ userData.credits } CRD`);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (error.response?.status === 401) {
        const detail = error.response?.data?.message || error.response?.data?.error || "SESSION_EXPIRED";
        console.warn("[App] Session expired or invalid. Logging out...", detail);
        // On mobile, show a clear alert to diagnose
        if (window.innerWidth < 768) {
          alert(`SYNC_ERROR (401): ${detail}\nUser: ${user?.username || 'None'}`);
        }
        handleLogout();
      }
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

  const fetchLikes = async (uid) => {
    try {
      const targetId = uid || user?.id || user?.Id;
      if (!targetId || targetId === 'undefined') {
        console.warn("[App] Skipping likes fetch: invalid target ID", targetId);
        return;
      }
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
    let trackId = track.id || track.Id;
    if (!trackId) {
      console.error("Cannot like track: ID is missing", track);
      return;
    }

    const isYoutube = track.source?.startsWith('youtube:') || typeof trackId === 'string'; // YouTube IDs are strings
    const isLiking = !track.isLiked;

    let pureYoutubeId = null;
    if (isYoutube) {
      pureYoutubeId = typeof trackId === 'string' && trackId.includes(':')
        ? trackId.split(':')[1]
        : (typeof trackId === 'string' && trackId.startsWith('yt-')
          ? trackId.replace('yt-', '')
          : (track.source?.startsWith('youtube:') ? track.source.split(':')[1] : String(trackId)));

      if (typeof trackId === 'string') trackId = pureYoutubeId; // Fix 'youtube:youtube:...' DB bug
    }

    console.log(`Attempting to ${isLiking ? 'like' : 'unlike'} ${isYoutube ? 'YouTube' : 'Local'} track: `, trackId);

    // Optimistic Update Tracks State
    setTracks(prev => prev.map(t => {
      const tId = t.id || t.Id;
      return String(tId) === String(trackId) || String(tId) === `youtube:${trackId}` || String(tId) === `yt-${trackId}` ? { ...t, isLiked: isLiking } : t;
    }));

    // Optimistic Update Liked Set for YouTube
    if (isYoutube && pureYoutubeId) {
      setLikedYoutubeIds(prev => {
        const next = new Set(prev);
        if (isLiking) next.add(pureYoutubeId);
        else next.delete(pureYoutubeId);
        return next;
      });
    }

    try {
      if (isYoutube) {
        let dbId = typeof trackId === 'number' ? trackId : null;

        // 1. Ensure track exists in DB if we only have string ID
        if (!dbId) {
          const trackData = {
            youtubeId: pureYoutubeId,
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
    console.log("[App] handleAuthSuccess invoked with:", authData);
    
    if (authData.token) localStorage.setItem('token', authData.token);
    
    // Ensure we have a valid user object with an ID before updating state
    const validUser = authData.user && (authData.user.id || authData.user.Id) ? authData.user : null;
    
    if (validUser) {
      localStorage.setItem('user', JSON.stringify(validUser));
      setUser(validUser);
      // Pass validUser directly to prevent race condition
      fetchUserProfile(false, validUser); 
      setView('discovery');
    } else {
      console.error("[App] Login succeeded but user data is missing or invalid!", authData);
      showNotification("AUTH_ERROR", "Login success but identity data is corrupt. Try again.", "error");
    }
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
    setLibraryTracks([]); // Clear library tracks
    setGlobalStats(null); // Clear stats
    setView('login');
    setViewingUserId(null);
    setYoutubePlayer(null);
  };

  const navigateToProfile = (id, initialModal = null) => {
    setViewingUserId(id);
    setProfileInitialModal(initialModal);
    if (activeView !== 'profile' && activeView !== 'login') {
      setPreviousView(activeView);
    }
    setViewOriginal('profile');
  };

  // --- SWIPE NAVIGATION LOGIC ---
  useEffect(() => {
    const VIEWS_SEQUENCE = ['discovery', 'feed', 'messages', 'profile'];
    
    let touchStartX = 0;
    let touchStartY = 0;
    const EDGE_THRESHOLD = 50; // Sensitive area from sides
    const MIN_SWIPE_DISTANCE = 60; // Min drag distance

    const handleTouchStart = (e) => {
      // Don't swipe if we're in login
      if (activeView === 'login') return;
      
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    };

    const handleTouchEnd = (e) => {
      if (activeView === 'login') return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      // Ensure it's a primarily horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > MIN_SWIPE_DISTANCE) {
        const currentIndex = VIEWS_SEQUENCE.indexOf(activeView);
        if (currentIndex === -1) return;

        // SWIPE FROM RIGHT TO LEFT (Next)
        if (deltaX < 0 && touchStartX > window.innerWidth - EDGE_THRESHOLD) {
           if (currentIndex < VIEWS_SEQUENCE.length - 1) {
             const nextView = VIEWS_SEQUENCE[currentIndex + 1];
             if (nextView === 'profile') navigateToProfile(null);
             else setView(nextView);
           }
        } 
        // SWIPE FROM LEFT TO RIGHT (Prev)
        else if (deltaX > 0 && touchStartX < EDGE_THRESHOLD) {
           if (currentIndex > 0) {
             const prevView = VIEWS_SEQUENCE[currentIndex - 1];
             if (prevView === 'profile') navigateToProfile(null);
             else setView(prevView);
           }
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeView, viewingUserId]);

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
        preload="auto"
      />

      {/* PERSISTENT YOUTUBE PLAYER */}
      {/* We only render the player if we have a valid videoId to prevent internal iframe API crashes (this.g is null) */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 1,
          height: 1,
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none',
          visibility: isYoutubeMode ? 'visible' : 'hidden'
        }}
      >
        {(() => {
          const ytId = currentTrack?.source?.startsWith('youtube:') ? currentTrack.source.split(':')[1]?.trim() : null;
          if (!ytId) return null;

          return (
            <YouTube
              key={ytId} // Force fresh instance for new videos to avoid internal state corruption
              videoId={ytId}
              onReady={(e) => {
                console.log("[YOUTUBE] Player Ready");
                setYoutubePlayer(e.target);
                if (isPlaying && isYoutubeMode) {
                  try {
                    e.target.playVideo();
                  } catch (err) { console.warn("YT Play onReady failure:", err); }
                }
              }}
              onStateChange={(e) => {
                console.log("[YOUTUBE] State Change:", e.data);
                if (e.data === 0) handleNext();
                if (e.data === 1 && !isPlaying) setIsPlaying(true);
                if (e.data === 2 && isPlaying) setIsPlaying(false);
              }}
              onError={(e) => {
                console.error("[YOUTUBE] Error detected:", e.data);
                // Handle private/deleted videos by skipping
                if (isPlaying) handleNext();
              }}
              opts={{
                height: '1',
                width: '1',
                playerVars: {
                  autoplay: isPlaying ? 1 : 0,
                  controls: 0,
                  disablekb: 1,
                  fs: 0,
                  iv_load_policy: 3,
                  modestbranding: 1,
                  origin: typeof window !== 'undefined' ? window.location.origin : ''
                },
              }}
            />
          );
        })()}
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'login' ? (
          <AuthView onLoginSuccess={handleAuthSuccess} />
        ) : (
          <>
            {console.log("[App] Rendering Dashboard. Redirect Trigger:", redirectTrigger)}
            <Dashboard
              setUser={setUser}
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
              onRefreshProfile={() => fetchUserProfile(true, user?.id)}
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
              setProfileInitialModal={setProfileInitialModal}
              favoriteStations={favoriteStations}
              liveStations={liveStations}
              activeStation={activeStation}
              stationChat={stationChat}
              stationQueue={stationQueue}
              setActiveStation={setActiveStation}
              sendMessage={sendMessage}
              requestTrack={requestTrack}
              onExitProfile={() => setViewOriginal(previousView)}
              activeMessageUser={activeMessageUser}
              setActiveMessageUser={setActiveMessageUser}
              libraryTracks={libraryTracks}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              followedCommunities={followedCommunities}
              onFollowUpdate={() => {
                const updated = API.Communities.getFollowed();
                setFollowedCommunities(updated);
              }}
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

const Dashboard = React.memo(({ activeView, setView, onLogout, currentTrackIndex, setCurrentTrackIndex, isPlaying, 
setIsPlaying, user, tracks, libraryTracks, togglePlay, handleNext, handlePrev, handlePlayPlaylist, onPurchase, 
onDownload, onLike, onCache, onAddCredits, onRefreshProfile, onRefreshTracks, currentTime, duration, onSeek, 
globalStats, hasNewMessages, navigateToProfile, viewingUserId, likedYoutubeIds, subscription, cachedTrackIds, 
playlists, onRefreshPlaylists, redirectTrigger, setRedirectTrigger, profileInitialModal, setProfileInitialModal, 
favoriteStations, liveStations, activeStation, stationChat, stationQueue, onExitProfile, activeMessageUser, 
setActiveMessageUser, isMuted, onToggleMute, followedCommunities, onFollowUpdate, setActiveStation, sendMessage, 
requestTrack, setUser }) => {
  const currentTrack = currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  return (
    <div className="flex h-screen w-full overflow-hidden relative bg-black bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#1a1a1a] via-[#050505] to-[#000000]">
      {/* Global Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0" />

      {/* SIDEBAR (Escritorio) */}
      <aside className={`hidden lg:flex flex-col border-r border-white/5 bg-black/20 backdrop-blur-2xl transition-all duration-300 z-30 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)] ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div
          className={`cursor-pointer flex flex-col justify-center items-center transition-all group ${isSidebarCollapsed ? 'p-4' : 'p-6'}`}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          <img
            src={skullImg}
            alt="System Kernel"
            className={`transition-all duration-300 pointer-events-none select-none animate-beat-pulse ${isSidebarCollapsed ? 'w-11 h-11' : 'w-20 h-20'}`}
            style={{ mixBlendMode: 'screen', filter: `drop-shadow(0 0 ${isSidebarCollapsed ? '8px' : '12px'} #ff006e)` }}
          />
        </div>

        <nav className="flex-1 space-y-3 p-4">
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Radio size={isSidebarCollapsed ? 18 : 22} />} label="DSC_SCAN" active={activeView === 'discovery'} onClick={() => setView('discovery')} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Hash size={isSidebarCollapsed ? 18 : 22} />} label="FEED_LNK" active={activeView === 'feed'} onClick={() => setView('feed')} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<User size={isSidebarCollapsed ? 18 : 22} />} label="USR_LINK" active={activeView === 'profile' && (!viewingUserId || String(viewingUserId) === String(user?.id || user?.Id))} onClick={() => navigateToProfile(null)} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Play size={isSidebarCollapsed ? 18 : 22} />} label="PLY_CORE" active={activeView === 'player'} onClick={() => setView('player')} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<MessageSquare size={isSidebarCollapsed ? 18 : 22} />} label="MSG_SYNC" active={activeView === 'messages'} onClick={() => setView('messages')} hasNotification={hasNewMessages} />

          <div className="my-6 border-t border-white/5 opacity-50" />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Wallet size={isSidebarCollapsed ? 18 : 22} />} label="WAL_BASE" active={activeView === 'wallet'} onClick={() => setView('wallet')} />
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
          <div className="flex gap-2">
            <NavButton icon={<Radio size={20} />} active={activeView === 'discovery'} onClick={() => setView('discovery')} />
            <NavButton icon={<Hash size={20} />} active={activeView === 'feed'} onClick={() => setView('feed')} />
            <NavButton icon={<Play size={20} />} active={activeView === 'player'} onClick={() => setView('player')} />
            <NavButton icon={<MessageSquare size={20} />} active={activeView === 'messages'} onClick={() => setView('messages')} hasNotification={hasNewMessages} />
            <NavButton icon={<User size={20} />} active={activeView === 'profile' && (!viewingUserId || String(viewingUserId) === String(user?.id || user?.Id))} onClick={() => navigateToProfile(null)} />
          </div>
        </header>

        <div className={`flex-1 relative ${activeView === 'discovery' ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar pb-24'}`}>
          <AnimatePresence mode="wait">
            {activeView === 'discovery' && (
              <DiscoveryMapView
                key="discovery"
                allTracks={libraryTracks}
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
                favoriteStations={favoriteStations}
                followedCommunities={followedCommunities}
                onFollowUpdate={onFollowUpdate}
                onCommunityUpdate={onRefreshProfile} // ADDED TO REFRESH USER/MAP WHEN JOINING COMM
                isPlayerActive={currentTrackIndex >= 0}
              />
            )}
            {activeView === 'wallet' && <WalletView user={user} onRefreshProfile={onRefreshProfile} />}
            {activeView === 'feed' && <FeedContent key="feed" setView={setView} onPlayPlaylist={handlePlayPlaylist} navigateToProfile={navigateToProfile} user={user} favoriteStations={favoriteStations} liveStations={liveStations} setActiveStation={setActiveStation} activeStation={activeStation} stationChat={stationChat} stationQueue={stationQueue} followedCommunities={followedCommunities} />}
            {activeView === 'profile' && (
              <ProfileView
                key={viewingUserId || 'me'}
                targetUserId={viewingUserId}
                user={user}
                tracks={tracks}
                onLogout={onLogout}
                onAddCredits={onAddCredits}
                setUser={setUser}
                onRefreshProfile={onRefreshProfile}
                onRefreshTracks={onRefreshTracks}
                navigateToProfile={navigateToProfile}
                playlists={playlists}
                onRefreshPlaylists={onRefreshPlaylists}
                onPlayPlaylist={handlePlayPlaylist}
                initialModal={profileInitialModal}
                onClearInitialModal={() => setProfileInitialModal(null)}
                activeStation={activeStation}
                stationChat={stationChat}
                stationQueue={stationQueue}
                isPlaying={isPlaying}
                onExitProfile={onExitProfile}
                onMessageUser={(u) => { setActiveMessageUser(u); setView('messages'); }}
                setActiveStation={setActiveStation}
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
              libraryTracks={libraryTracks}
              activeStation={activeStation}
              stationChat={stationChat}
              stationQueue={stationQueue}
              sendMessage={sendMessage}
              requestTrack={requestTrack}
            />}
            {activeView === 'messages' && <MessagesView key="messages" user={user} navigateToProfile={navigateToProfile} initialChatUser={activeMessageUser} />}
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
          // Hide mini player on mobile if viewing profile to avoid crowding
          !(window.innerWidth < 1024 && activeView === 'profile') && (
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
              isMuted={isMuted}
              onToggleMute={onToggleMute}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
});

// --- MINI PLAYER COMPONENT ---
const MiniPlayer = ({ track, isPlaying, onTogglePlay, onNext, onPrev, onLike, onExpand, activeView, isMuted, onToggleMute }) => {
  const isMessages = activeView === 'messages';

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`fixed bottom-0 left-0 right-0 backdrop-blur-3xl border-t p-3 pb-8 lg:pb-3 flex items-center gap-3 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${isMessages
        ? 'bg-black/95 border-white/10'
        : 'bg-[#050505]/90 border-[#ff006e]/30 shadow-[0_0_30px_rgba(255,0,110,0.1)]'
        } `}
    >
      {/* Progress Bar (Decorative/Subtle) */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/5 overflow-hidden">
         <motion.div 
            className="h-full bg-[#ff0060]" 
            initial={{ width: 0 }}
            animate={{ width: '45%' }} // Placeholder progress
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
         />
      </div>

      {/* Track Info (Click to expand) */}
      <div className="flex items-center gap-3 lg:gap-4 flex-1 cursor-pointer group min-w-0" onClick={onExpand}>
        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded border flex items-center justify-center relative overflow-hidden shrink-0 ${isMessages ? 'bg-[#111] border-[#333]' : 'bg-[#111] border-[#ff006e]/10'}`}>
          {track?.cover || track?.thumbnail ? (
            <img src={track.cover || track.thumbnail} alt="Cover" className="w-full h-full object-cover filter brightness-75 group-hover:brightness-100 transition-all" />
          ) : (
            <Music size={18} className={`transition-colors ${isMessages ? 'text-[#ff006e]' : 'text-[#ff006e]/30 group-hover:text-[#ff006e]'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <h4 className={`text-[10px] lg:text-xs font-black uppercase truncate transition-colors leading-none mb-1 ${isMessages ? 'text-white' : 'text-white group-hover:text-[#ff006e]'}`}>{track?.title || 'No Track'}</h4>
          <div className="flex items-center gap-2">
            <p className={`text-[8px] lg:text-[9px] font-bold uppercase truncate tracking-widest ${isMessages ? 'text-[#ff006e]' : 'text-[#ff006e]/40'}`}>{track?.artist || 'Unknown'}</p>
            <div className="w-1 h-1 rounded-full bg-[#ff006e]/20" />
            <span className="text-[7px] text-white/20 uppercase font-mono">SIGNAL_ON</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 lg:gap-6 px-1 lg:px-4 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="text-white/20 hover:text-white transition-colors">
          <SkipBack size={16} fill="currentColor" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${isMessages ? 'bg-[#ff006e]/10 text-[#ff006e]' : 'bg-white/5 border border-white/10 text-white hover:bg-[#ff006e] hover:text-black hover:border-transparent'}`}
        >
          {isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5" />
          )}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-white/20 hover:text-white transition-colors">
          <SkipForward size={16} fill="currentColor" />
        </button>
      </div>

      {/* Extra Actions - Desktop/Side Panel */}
      <div className={`hidden sm:flex items-center gap-4 lg:gap-6 px-2 border-l pl-4 lg:pl-6 border-white/5`}>
        <Heart
          size={18}
          className={`cursor-pointer transition-colors ${track?.isLiked ? 'text-[#ff006e] fill-[#ff006e]' : 'text-white/20 hover:text-[#ff006e]'}`}
          onClick={(e) => { e.stopPropagation(); onLike && onLike(track); }}
        />
        <div onClick={(e) => { e.stopPropagation(); onToggleMute && onToggleMute(); }} className="cursor-pointer">
          {isMuted ? (
            <VolumeX size={18} className="text-[#ff006e]" />
          ) : (
            <Volume2 size={18} className="text-white/20 hover:text-[#ff006e] transition-colors" />
          )}
        </div>
      </div>
    </motion.div>
  );
};



// --- CONTENIDO: FEED (3 COLUMNAS) ---
const FeedContent = React.memo(({ setView, onPlayPlaylist, navigateToProfile, user, favoriteStations, liveStations, setActiveStation, activeStation, stationChat, stationQueue, followedCommunities }) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [allCommunities, setAllCommunities] = useState([]);

  useEffect(() => {
    API.Communities.getAll().then(res => setAllCommunities(res.data || [])).catch(() => {});
  }, []);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await API.Feed.getGlobalFeed();
      setFeed(res.data);
    } catch (e) {
      console.error("Feed error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleTrackPlay = (trackId) => {
    const trackFeedItems = feed.filter(item => (item.type || item.Type) === 'track');
    const playlist = trackFeedItems.map(item => {
      const rawSource = item.source || item.Source;
      const source = rawSource && rawSource.startsWith('/uploads')
        ? getMediaUrl(rawSource)
        : rawSource;

      const rawImg = item.imageUrl || item.ImageUrl;
      const imageUrl = rawImg && rawImg.startsWith('/uploads')
        ? getMediaUrl(rawImg)
        : rawImg;

      return {
        ...item,
        id: item.trackId || item.TrackId,
        title: item.title || item.Title,
        artist: item.artist || item.Artist,
        source: source,
        cover: imageUrl,
        dbId: item.trackId || item.TrackId
      };
    });

    const startIndex = playlist.findIndex(t => String(t.dbId) === String(trackId));
    if (startIndex !== -1 && onPlayPlaylist) {
      onPlayPlaylist(playlist, startIndex);
    }
  };

  const getTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-GB', { hour12: false });
  };

  const getPrefix = (type) => {
    switch (type) {
      case 'track': return 'SIGNAL';
      case 'studio': return 'PULSE';
      case 'journal': return 'DATA';
      case 'system': return 'CORE';
      default: return 'INFO';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'track': return 'text-[#ff006e]';
      case 'studio': return 'text-[#00ffff]';
      case 'journal': return 'text-[#9b5de5]';
      case 'system': return 'text-[#ffc300]';
      default: return 'text-white/60';
    }
  };

  const handleMediaExpand = (item) => {
    setSelectedMedia(item);
  };

  const [replyingTo, setReplyingTo] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const commentsEndRef = useRef(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (comments.length > 0) {
      scrollToBottom();
    }
  }, [comments]);

  useEffect(() => {
    if (replyingTo) {
      setReplyingToComment(null); // Reset nested reply when opening modal
      const fetchComments = async () => {
        setLoadingComments(true);
        try {
          const type = replyingTo.Type || replyingTo.type;
          const itemId = replyingTo.ItemId || replyingTo.itemId;
          const { data } = await API.Social.getFeedComments(type, itemId);
          setComments(data || []);
        } catch (err) {
          console.error("Failed to load comments", err);
        } finally {
          setLoadingComments(false);
        }
      };
      fetchComments();
    } else {
      setComments([]);
      setCommentText("");
    }
  }, [replyingTo]);

  const handleFeedLike = async (item) => {
    try {
      const type = item.Type || item.type;
      const itemId = item.ItemId || item.itemId;
      const { data } = await API.Social.toggleLike(type, itemId);
      // Optimistic update
      setFeed(prev => prev.map(f =>
        f.Id === item.Id ? {
          ...f,
          IsLiked: data.Liked ?? data.liked,
          LikeCount: data.LikeCount ?? data.likeCount
        } : f
      ));
    } catch (e) {
      console.error("Like failed", e);
    }
  };

  const handleFeedRepost = async (item) => {
    try {
      const type = (item.Type || item.type || "").toLowerCase();
      const itemId = item.ItemId || item.itemId;
      const { data } = await API.Social.toggleRepost(type, itemId);

      const isReposted = data.reposted ?? data.Reposted;
      const repostCount = data.repostCount ?? data.RepostCount;

      setFeed(prev => {
        // 1. Update all instances of the same item with new social counts
        const updatedFeed = prev.map(f => {
          const isSameItem = (f.itemId === itemId || f.ItemId === itemId) &&
            (f.type?.toLowerCase() === type || f.Type?.toLowerCase() === type);

          if (isSameItem) {
            return {
              ...f,
              IsReposted: isReposted,
              RepostCount: repostCount
            };
          }
          return f;
        });

        if (isReposted) {
          // 2. Prepend a new optimistic repost item
          const newRepost = {
            ...item,
            Id: `repost-temp-${Date.now()}`,
            ItemId: itemId,
            Type: type,
            CreatedAt: new Date().toISOString(),
            IsOriginalSignal: false,
            RepostedBy: user?.username || user?.Username || "YOU",
            IsReposted: true,
            RepostCount: repostCount,
            IdString: `repost-${type}-${itemId}` // Used for keying or identification
          };
          return [newRepost, ...updatedFeed];
        } else {
          // 3. Remove your own repost of this item from the feed view
          return updatedFeed.filter(f => {
            const isOurRepost = !f.IsOriginalSignal &&
              (f.repostedBy === (user?.username || user?.Username) || f.RepostedBy === (user?.username || user?.Username)) &&
              (f.itemId === itemId || f.ItemId === itemId) &&
              (f.type?.toLowerCase() === type || f.Type?.toLowerCase() === type);
            return !isOurRepost;
          });
        }
      });
    } catch (e) {
      console.error("Repost failed", e);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !replyingTo) return;
    setIsSubmittingComment(true);
    try {
      const type = replyingTo.Type || replyingTo.type;
      const itemId = replyingTo.ItemId || replyingTo.itemId;
      const { data } = await API.Social.addFeedComment(type, itemId, commentText, replyingToComment?.Id);

      // Update local feed count
      setFeed(prev => prev.map(f =>
        f.Id === replyingTo.Id ? {
          ...f,
          CommentCount: (f.CommentCount || 0) + 1
        } : f
      ));

      // Add to local comment list
      const newComment = {
        Id: data.Id || Date.now(),
        Username: user?.Username || user?.username || "YOU",
        Content: commentText,
        CreatedAt: new Date().toISOString(),
        ParentId: replyingToComment?.Id,
        IsOperator: false // Local user is unlikely to be the artist in this view
      };
      setComments(prev => [...prev, newComment]);

      setCommentText("");
      setReplyingToComment(null);
    } catch (e) {
      console.error("Comment failed", e);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row h-full font-mono relative">
      <AnimatePresence>
        {selectedMedia && (
          <ContentModal
            isOpen={!!selectedMedia}
            onClose={() => setSelectedMedia(null)}
            content={{
              ...selectedMedia,
              Url: selectedMedia.imageUrl || selectedMedia.ImageUrl,
              Title: selectedMedia.title || selectedMedia.Title,
              Content: selectedMedia.content || selectedMedia.Content
            }}
            type={(selectedMedia.mediaType || selectedMedia.MediaType || selectedMedia.type || selectedMedia.Type || '').toUpperCase()}
          />
        )}
      </AnimatePresence>

      {/* Izquierda: Acciones */}
      <div className="hidden lg:block w-72 p-6 space-y-6 border-r border-[#ff006e]/5 relative z-20">
        <div className="bg-[#0a0a0a]/50 backdrop-blur-xl border border-[#ff006e]/20 rounded-lg overflow-hidden">
          <div className="p-3 bg-[#ff006e]/5 border-b border-[#ff006e]/10 flex justify-between items-center text-[10px] font-black uppercase text-white">:: TERMINAL_CMDS :: <ChevronDown size={14} /></div>
          <div className="p-4 space-y-1">
            <button onClick={() => navigateToProfile(user?.id, 'studio')} className="w-full text-left p-2 text-[10px] text-[#ff006e]/80 hover:text-white hover:bg-[#ff006e10] transition-all uppercase tracking-widest">{`> NEW_POST`} </button>
            <button onClick={() => navigateToProfile(user?.id, 'upload')} className="w-full text-left p-2 text-[10px] text-[#ff006e]/80 hover:text-white hover:bg-[#ff006e10] transition-all uppercase tracking-widest">{`> UPLOAD_TRACK`} </button>
            <button onClick={() => setView('discovery')} className="w-full text-left p-2 text-[10px] text-[#ff006e]/80 hover:text-white hover:bg-[#ff006e10] transition-all uppercase tracking-widest">{`> LIVE_STREAM`} </button>
          </div>
        </div>

        <div className="space-y-4 px-2">
          <h3 className="text-[10px] font-black uppercase text-[#ff006e] px-2 tracking-widest">:: LIVE_FAVORITES ::</h3>
          <div className="space-y-2">
            {favoriteStations && favoriteStations.filter(s => s.isLive || s.IsLive).slice(0, 5).map(station => (
              <button
                key={`side-fav-${station.id || station.Id}`}
                onClick={() => navigateToProfile(station.artistUserId || station.ArtistUserId)}
                className="w-full flex items-center gap-3 px-3 py-2 bg-[#ff006e]/5 border border-[#ff006e]/20 rounded hover:bg-[#ff006e]/10 transition-all group"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff006e] blink shadow-[0_0_8px_#ff006e]" />
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[9px] font-black text-white uppercase truncate">{station.name || station.Name}</div>
                  <div className="text-[7px] text-[#ff006e]/60 uppercase truncate">LIVE // {station.currentSessionTitle || station.CurrentSessionTitle || 'Broadcasting'}</div>
                </div>
              </button>
            ))}
            {(!favoriteStations || favoriteStations.length === 0) && (
              <div className="px-3 py-4 border border-dashed border-white/5 rounded text-center opacity-20">
                <div className="text-[8px] uppercase">No Signals</div>
              </div>
            )}
            {favoriteStations && favoriteStations.length > 0 && favoriteStations.filter(s => s.isLive || s.IsLive).length === 0 && (
              <div className="px-3 py-2 text-[8px] text-white/20 uppercase italic">All frequencies offline</div>
            )}
          </div>
        </div>

        <div className="space-y-4 px-2">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black uppercase text-[#ff006e] tracking-widest">:: SECTOR_SIGNALS ::</h3>
            {selectedSector !== null && (
              <button
                onClick={() => setSelectedSector(null)}
                className="text-[8px] text-[#ff006e]/40 hover:text-[#ff006e] uppercase tracking-tighter blink"
              >
                [ RESET_LINK ]
              </button>
            )}
          </div>
          <div className="space-y-1">
            {SECTORS.map((sector, idx) => (
              <button
                key={sector.name}
                onClick={() => setSelectedSector(idx)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded transition-all border ${selectedSector === idx
                  ? 'border-opacity-30'
                  : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                style={selectedSector === idx ? { 
                    backgroundColor: `${sector.color}20`, 
                    borderColor: `${sector.color}50` 
                } : {}}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: sector.color, color: sector.color }} />
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${selectedSector === idx ? 'text-white' : 'text-white/40'}`}>
                    {sector.name.replace(' ', '_')}
                  </span>
                </div>
                {selectedSector === idx && <Zap size={10} className="animate-pulse" style={{ color: sector.color }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Community Signals */}
        <div className="space-y-4 px-2">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black uppercase text-[#00ffff] tracking-widest">:: COMMUNITY_LINKS ::</h3>
            {selectedCommunityId !== null && (
              <button
                onClick={() => setSelectedCommunityId(null)}
                className="text-[8px] text-[#00ffff]/40 hover:text-[#00ffff] uppercase tracking-tighter blink"
              >
                [ RESET_LINK ]
              </button>
            )}
          </div>
          <div className="space-y-1">
            {followedCommunities.map((cid) => {
              const comm = allCommunities.find(c => String(c.id) === String(cid));
              if (!comm) return null;
              const sectorColor = SECTORS[comm.sectorId]?.color || '#ffffff';
              return (
                <button
                  key={`comm-link-${cid}`}
                  onClick={() => {
                      setSelectedCommunityId(cid);
                      setSelectedSector(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded transition-all border ${String(selectedCommunityId) === String(cid)
                    ? 'bg-[#00ffff]/10 border-[#00ffff]/30'
                    : 'bg-black/20 border-white/5 hover:border-[#00ffff]/20'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: sectorColor, color: sectorColor }} />
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${String(selectedCommunityId) === String(cid) ? 'text-white' : 'text-white/40'}`}>
                      {comm.name.replace(' ', '_')}
                    </span>
                  </div>
                  {String(selectedCommunityId) === String(cid) && <Zap size={10} className="text-[#00ffff] animate-pulse" />}
                </button>
              );
            })}
            {followedCommunities.length === 0 && (
              <div className="px-3 py-4 border border-dashed border-white/5 rounded text-center opacity-20">
                <div className="text-[8px] uppercase">No Links Established</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Centro: Terminal Log */}
      <div className="flex-1 flex flex-col h-full bg-[#05050a]/40 relative">
        {loading && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#ff006e]/20 z-50 overflow-hidden">
            <motion.div
              className="h-full bg-[#ff006e] shadow-[0_0_10px_#ff006e]"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            />
          </div>
        )}

        {/* Global Loading Indicator (Deciphering) */}
        <div className="absolute top-4 right-6 z-40 bg-black/60 backdrop-blur-sm p-1 rounded-sm border border-[#ff006e]/10">
          <RefreshCw
            size={16}
            className={`text-[#ff006e]/60 hover:text-[#ff006e] cursor-pointer transition-colors ${loading ? 'animate-spin' : ''}`}
            onClick={fetchFeed}
          />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-1 flex flex-col justify-start pb-32">
          {selectedSector !== null && (
            <div className="mb-6 p-4 bg-[#ff006e]/5 border border-[#ff006e]/20 rounded flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-[#ff006e] shadow-[0_0_10px_#ff006e] animate-pulse" />
                <div>
                  <div className="text-[10px] font-black text-[#ff006e] tracking-[0.3em] uppercase">FREQ // {SECTORS[selectedSector].name.replace(' ', '_')}</div>
                  <div className="text-[8px] text-white/30 uppercase tracking-widest">{SECTORS[selectedSector].desc}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSector(null)}
                className="px-3 py-1 border border-[#ff006e]/30 text-[#ff006e] text-[8px] font-black uppercase hover:bg-[#ff006e] hover:text-black transition-all"
              >
                DISCONNECT_LINK
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <div className="text-[10px] text-[#ff006e] blink uppercase tracking-[0.4em]">Deciphering Signal Packets...</div>
            </div>
          ) : (
            <>
              {feed.filter(item => {
                if (selectedCommunityId !== null) {
                  const itemCommId = item.communityId || item.CommunityId;
                  return String(itemCommId) === String(selectedCommunityId);
                }
                if (selectedSector !== null) {
                  const idSource = item.artistUserId || item.ArtistUserId || item.artistId || item.ArtistId;
                  const dbSectorId = item.sectorId ?? item.SectorId;
                  const h = hashStr(idSource);
                  const itemSectorIdx = (dbSectorId !== null && dbSectorId !== undefined) ? dbSectorId : (h % SECTORS.length);
                  return itemSectorIdx === selectedSector;
                }
                return true;
              }).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                  <div className="text-[10px] text-[#ff006e] uppercase tracking-[0.4em]">
                    {selectedSector !== null ? `-- NO_SIGNALS_IN_SECTOR --` : (selectedCommunityId !== null ? `-- NO_COMMUNITY_SIGNALS --` : `-- NO_SIGNALS_DETECTED --`)}
                  </div>
                  <div className="text-[8px] text-white/20 uppercase">Network scanning active...</div>
                </div>
              ) : (
                <>
                  {selectedCommunityId !== null && (
                    <div className="mb-6 p-4 bg-[#00ffff]/5 border border-[#00ffff]/20 rounded flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-[#00ffff] shadow-[0_0_10px_#00ffff] animate-pulse" />
                        <div>
                          <div className="text-[10px] font-black text-[#00ffff] tracking-[0.3em] uppercase">LINK // {allCommunities.find(c => String(c.id) === String(selectedCommunityId))?.name.toUpperCase().replace(' ', '_')}</div>
                          <div className="text-[8px] text-white/30 uppercase tracking-widest">Community signal link established.</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCommunityId(null)}
                        className="px-3 py-1 border border-[#00ffff]/30 text-[#00ffff] text-[8px] font-black uppercase hover:bg-[#00ffff] hover:text-black transition-all"
                      >
                        DISCONNECT_LINK
                      </button>
                    </div>
                  )}

                  {feed.filter(item => {
                    if (selectedCommunityId !== null) {
                      const itemCommId = item.communityId || item.CommunityId;
                      return String(itemCommId) === String(selectedCommunityId);
                    }
                    if (selectedSector !== null) {
                      const idSource = item.artistUserId || item.ArtistUserId || item.artistId || item.ArtistId;
                      const dbSectorId = item.sectorId ?? item.SectorId;
                      const h = hashStr(idSource);
                      const itemSectorIdx = (dbSectorId !== null && dbSectorId !== undefined) ? dbSectorId : (h % SECTORS.length);
                      return itemSectorIdx === selectedSector;
                    }
                    return true;
                  }).map(item => {
                    const typeRaw = item.type || item.Type || "";
                    const type = typeRaw.toLowerCase();
                    const artist = item.artist || item.Artist;
                    const title = item.title || item.Title;
                    const content = item.content || item.Content;
                    const createdAt = item.createdAt || item.CreatedAt;
                    const playCount = item.playCount || item.PlayCount;
                    const mediaType = item.mediaType || item.MediaType;
                    const isOriginal = item.isOriginalSignal ?? item.IsOriginalSignal ?? true;
                    const repostedBy = item.repostedBy || item.RepostedBy;
                    const imageUrl = getMediaUrl(item.imageUrl || item.ImageUrl);

                    if (type === 'system') {
                      return (
                        <div key={item.Id || item.id} className="flex gap-4 p-2 bg-[#ffc300]/5 border-l-2 border-[#ffc300]/30 mb-2">
                          <span className="text-[10px] text-[#ffc300] font-black">{getTime(createdAt)}</span>
                          <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">{title}</span>
                          <span className="text-[10px] text-white/40 uppercase">{content}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={item.Id || item.id} className="group transition-colors hover:bg-white/[0.05] py-2 px-3 rounded border border-transparent hover:border-white/10 relative mb-4">
                        {!isOriginal && repostedBy && (
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <Repeat size={10} className="text-[#ff006e] animate-pulse" />
                            <span className="text-[8px] font-black text-[#ff006e] uppercase tracking-[0.2em] bg-[#ff006e]/5 px-2 border border-[#ff006e]/20">
                              [ RE_SIGNAL_FROM // @{repostedBy} ]
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                          <span className="text-[11px] text-white/80 whitespace-nowrap select-none font-bold">[{getTime(createdAt)}]</span>
                          <span className={`text-[11px] font-bold whitespace-nowrap ${getColor(type)}`}>[{getPrefix(type)}]</span>
                          <button
                            onClick={() => navigateToProfile(item.ArtistUserId || item.artistUserId)}
                            className="text-[11px] text-white font-black uppercase tracking-tighter hover:text-[#ff006e] transition-colors"
                          >
                            ::{artist}::
                          </button>
                          <span className="text-[11px] text-white/90 flex-1 min-w-[200px] leading-relaxed">
                            {type === 'track' && `ULINKED_SIGNAL: "${title}" [${content || 'unknown'}]`}
                            {type === 'studio' && `NODAL_UPDATE: "${title}"`}
                            {type === 'journal' && `DATA_LOG: ${title}`}
                          </span>
                        </div>

                        {/* Expanded Content Area */}
                        <div className="ml-0 sm:ml-40 mt-3 space-y-4">
                          {type === 'track' && (
                            <div
                              onClick={() => handleTrackPlay(item.trackId || item.TrackId)}
                              className="bg-black/90 border border-[#ff006e]/30 p-4 flex items-center gap-4 hover:border-[#ff006e]/60 transition-all group/track cursor-pointer max-w-md shadow-xl"
                            >
                              <div className="w-12 h-12 bg-black border border-[#ff006e]/20 overflow-hidden shrink-0 flex items-center justify-center">
                                {imageUrl ? (
                                  <img src={imageUrl} className="w-full h-full object-cover opacity-80" alt="" />
                                ) : (
                                  <Music size={20} className="text-[#ff006e]/40" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-white font-black uppercase truncate">{title}</div>
                                <div className="text-[8px] text-[#ff006e]/80 font-bold uppercase mt-1 tracking-widest">BIPHATE_ACTIVE // {playCount || 0} SCANS</div>
                              </div>
                              <div className="w-8 h-8 rounded-full border border-[#ff006e]/40 flex items-center justify-center text-[#ff006e] group-hover/track:bg-[#ff006e] group-hover/track:text-black transition-all">
                                <Play size={14} fill="currentColor" />
                              </div>
                            </div>
                          )}

                          {type === 'studio' && (
                            <div
                              onClick={() => handleMediaExpand(item)}
                              className="max-w-md bg-black border border-white/5 overflow-hidden group/studio cursor-zoom-in relative active:scale-[0.98] transition-transform"
                            >
                              {mediaType === 'VIDEO' ? (
                                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                                  <video src={imageUrl} className="w-full h-full object-cover opacity-70" muted loop onMouseEnter={e => e.target.play()} onMouseLeave={e => e.target.pause()} />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover/studio:bg-black/20 transition-all">
                                    <Video size={30} className="text-white/60" />
                                  </div>
                                </div>
                              ) : (
                                <img src={imageUrl} className="w-full h-auto opacity-90 group-hover/studio:opacity-100 transition-opacity" alt="" />
                              )}
                              <div className="absolute top-2 right-2 p-1 bg-black/60 opacity-0 group-hover/studio:opacity-100 transition-opacity">
                                <Maximize2 size={14} className="text-white/60" />
                              </div>
                            </div>
                          )}

                          {type === 'journal' && (
                            <div className="border-l-2 border-[#9b5de5]/50 pl-4 py-1 italic text-white/90 text-[11px] leading-relaxed max-w-xl bg-white/5 rounded-r">
                              {content && content.length > 280 ? (
                                <>
                                  {content.substring(0, 280)}...
                                  <button
                                    onClick={() => handleMediaExpand({ ...item, type: 'JOURNAL' })}
                                    className="ml-2 text-[#9b5de5] hover:text-white font-black uppercase text-[9px] tracking-widest transition-colors not-italic"
                                  >
                                    [ READ_SIGNAL ]
                                  </button>
                                </>
                              ) : (
                                content
                              )}
                            </div>
                          )}

                          {/* Unified Social Buttons */}
                          <div className="flex gap-6 text-[9px] font-black text-white/60 uppercase pt-2">
                            <button
                              onClick={() => handleFeedLike(item)}
                              className={`flex items-center gap-1.5 transition-all group/social ${item.IsLiked ? 'text-[#ff006e] drop-shadow-[0_0_5px_rgba(255,0,110,0.5)]' : 'hover:text-[#ff006e]'}`}
                            >
                              <Heart size={12} fill={item.IsLiked ? "currentColor" : "none"} className={item.IsLiked ? 'scale-110' : 'group-hover/social:scale-110 transition-transform'} />
                              <span className="tracking-tighter">LIKE_{item.LikeCount || 0}</span>
                            </button>
                            <button
                              onClick={() => setReplyingTo(item)}
                              className="flex items-center gap-1.5 hover:text-[#ff006e] transition-all group/social"
                            >
                              <MessageSquare size={12} className="group-hover/social:scale-110 transition-transform" />
                              <span className="tracking-tighter">REPLY_{item.CommentCount || 0}</span>
                            </button>
                            <button
                              onClick={() => handleFeedRepost(item)}
                              className={`flex items-center gap-1.5 transition-all group/social ${item.IsReposted ? 'text-[#ff006e] drop-shadow-[0_0_5px_rgba(255,0,110,0.5)]' : 'hover:text-[#ff006e]'}`}
                            >
                              <Repeat size={12} className={item.IsReposted ? 'animate-pulse' : 'group-hover/social:scale-110 transition-transform'} />
                              <span className="tracking-tighter">RE_SYNC_{item.RepostCount || 0}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        <AnimatePresence>
          {replyingTo && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg bg-[#111] border border-[#ff006e]/30 rounded-sm overflow-hidden shadow-[0_0_50px_rgba(255,0,110,0.3)]"
              >
                <div className="px-4 py-2 border-b border-[#ff006e]/20 flex justify-between items-center bg-[#ff006e]/5 font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[#ff006e] animate-pulse">●</span>
                    <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">SIGNAL_INTERCEPT_MODE // PORT_8080</span>
                  </div>
                </div>

                <div className="p-6 space-y-6 relative">
                  {/* Top ASCII Border decoration */}
                  <div className="absolute top-0 left-6 text-[8px] text-white/10 font-mono select-none">
                    +-------------------------------------------------------------+
                  </div>

                  <div className="bg-black/60 border border-white/5 p-3 relative overflow-hidden group/target">
                    <div className="absolute top-0 right-0 p-1 px-2 text-[7px] text-white/20 font-black uppercase tracking-tighter bg-white/5">TARGET_NODE</div>
                    <div className="text-[9px] text-[#ff006e] font-black uppercase mb-1 tracking-widest">{replyingTo.Artist || replyingTo.artist}</div>
                    <div className="text-[10px] text-white/60 line-clamp-1 italic font-mono select-all">"{replyingTo.Title || replyingTo.title || replyingTo.Content || replyingTo.content}"</div>
                  </div>

                  {/* Comment Thread as Packet Stream */}
                  <div className="max-h-64 overflow-y-auto pr-2 space-y-5 custom-scrollbar-sharp">
                    {loadingComments ? (
                      <div className="text-[9px] text-[#ff006e] animate-pulse py-6 font-mono flex flex-col items-center gap-2 border border-white/5 bg-white/5">
                        <RefreshCw size={14} className="animate-spin" />
                        <span>ESTABLISHING_ENCRYPTED_TUNNEL...</span>
                        <span className="text-[7px] opacity-40">[ ATTEMPTING_HANDSHAKE ]</span>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-[9px] text-white/10 font-mono text-center py-8 border border-dashed border-white/10 uppercase tracking-[0.3em]">
                        -- NO_SIGNALS_FOUND_IN_BUFFER --
                      </div>
                    ) : (
                      comments.map((c, idx) => (
                        <div
                          key={c.Id || idx}
                          className={`space-y-1 group/comment relative transition-all duration-300 ${c.ParentId ? 'ml-6 opacity-80 scale-95 origin-left' : ''}`}
                        >
                          <div className="flex items-center gap-2 text-[7px] font-mono text-white/30 uppercase">
                            <span className="text-[#ff006e] font-black">[PKT_{idx.toString().padStart(3, '0')}]</span>
                            {c.IsOperator && (
                              <span className="text-amber-400 font-bold bg-amber-400/10 px-1 border border-amber-400/20 shadow-[0_0_8px_rgba(251,191,36,0.2)] animate-pulse">
                                [V_OPERATOR]
                              </span>
                            )}
                            <span>SIG: 100%</span>
                            <span>CRC: {(Math.random().toString(16).substr(2, 4)).toUpperCase()}</span>
                            <span>SRC: {c.Username || c.username}</span>
                            <button
                              onClick={() => setReplyingToComment(c)}
                              className="ml-auto text-[#ff006e] hover:text-white transition-colors opacity-0 group-hover/comment:opacity-100"
                            >
                              [ INTERCEPT ]
                            </button>
                          </div>

                          <div className={`border bg-black/40 hover:border-[#ff006e]/40 transition-colors p-3 relative ${c.IsOperator ? 'border-amber-400/30' : 'border-white/10'}`}>
                            <div className="absolute top-0 right-0 p-1 text-[7px] text-white/10 tabular-nums">
                              {new Date(c.CreatedAt || c.createdAt).toLocaleTimeString('en-GB', { hour12: false })}
                            </div>
                            <p className={`text-[10px] leading-relaxed font-mono whitespace-pre-wrap ${c.IsOperator ? 'text-amber-100/90' : 'text-white/80'}`}>
                              {c.Content || c.content}
                            </p>
                          </div>

                          <div className={`absolute -left-2 top-0 bottom-0 w-[1px] transition-colors ${c.ParentId ? 'bg-white/10' : 'bg-white/5'} group-hover/comment:bg-[#ff006e]/30`} />
                        </div>
                      ))
                    )}
                    <div ref={commentsEndRef} />
                  </div>

                  <div className="relative">
                    <div className="text-[7px] text-white/20 font-mono mb-1 flex justify-between">
                      {replyingToComment ? (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400">:: RE_SIGNAL_TO //</span>
                          <span className="text-white/60">@{replyingToComment.Username || replyingToComment.username}</span>
                          <button onClick={() => setReplyingToComment(null)} className="text-[#ff006e] hover:text-white ml-2">[ CANCEL_RE ]</button>
                        </div>
                      ) : (
                        <span>:: INPUT_BUFFER ::</span>
                      )}
                      <span>CHAR_COUNT: {commentText.length} / 280</span>
                    </div>
                    <textarea
                      autoFocus
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value.substring(0, 280))}
                      placeholder="Enter raw signal content..."
                      className="w-full h-20 bg-black/90 border border-white/10 rounded-sm p-3 text-[10px] text-white focus:border-[#ff006e]/50 outline-none resize-none font-mono placeholder:text-white/10"
                    />
                    {isSubmittingComment && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm z-10 border border-[#ff006e]/20">
                        <span className="text-[9px] font-black text-[#ff006e] animate-pulse tracking-[0.4em]">LOADING_DATA_PACKET...</span>
                        <div className="w-32 h-[1px] bg-white/10 mt-2 relative overflow-hidden">
                          <motion.div className="absolute inset-0 bg-[#ff006e]" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1 }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-end gap-3 pt-2">
                    <div className="text-[7px] text-white/10 font-mono italic leading-tight">
                      CAUTION: SIGNALS_ARE_PERMANENT<br />
                      ENCRYPTION: AES-256_ACTIVE
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="px-4 py-2 text-[9px] font-black text-white/20 hover:text-white uppercase tracking-widest border border-transparent hover:border-white/5 transition-all"
                      >
                        [ ABORT ]
                      </button>
                      <button
                        onClick={submitComment}
                        disabled={isSubmittingComment || !commentText.trim()}
                        className="px-6 py-2 bg-[#ff006e]/20 border border-[#ff006e]/50 text-[#ff006e] text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[#ff006e] hover:text-black transition-all shadow-[0_0_15px_rgba(255,0,110,0.2)] disabled:opacity-20"
                      >
                        {isSubmittingComment ? 'TRANSMITTING...' : '[ BROADCAST_SIGNAL ]'}
                      </button>
                    </div>
                  </div>

                  {/* Scanline overlay for modal content */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.05] z-50">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent_0px,transparent_1px,rgba(255,255,255,0.05)_2px)] bg-[length:100%_3px]" />
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(rgba(255,0,110,0.1)_0px,transparent_1px,rgba(255,0,110,0.1)_2px)] bg-[length:100%_3px]" />
        </div>
      </div>

      {/* Derecha: Radios & Broadcaster Panel */}
      <div className="hidden xl:block w-80 p-6 space-y-8 bg-black/40 border-l border-[#ff006e]/5 relative z-10 overflow-y-auto no-scrollbar">
        {activeStation && (String(activeStation.artistUserId || activeStation.ArtistUserId) === String(user?.id || user?.Id)) && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 pb-3 border-b border-[#ff006e]/20">
              <div className="w-2 h-2 rounded-full bg-[#ff006e] animate-pulse shadow-[0_0_10px_#ff006e]" />
              <h3 className="text-[10px] font-black uppercase text-[#ff006e] tracking-[0.3em]">BROADCASTING_PANEL</h3>
            </div>

            {/* Mini Chat */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[8px] font-bold text-white/40 uppercase tracking-widest">
                <span>COMM_LINK</span>
                <span className="text-[#ff006e]/40">ENCRYPTED</span>
              </div>
              <div className="h-48 bg-black/40 border border-[#ff006e]/10 rounded-sm p-3 font-mono text-[9px] overflow-y-auto custom-scrollbar space-y-2">
                {stationChat && stationChat.length > 0 ? stationChat.map((msg, idx) => (
                  <div key={idx} className="break-words">
                    <span className="text-[#ff006e] font-bold">[{msg.username}]</span> <span className="text-white/80">{msg.message}</span>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center opacity-20 italic">LINK_IDLE...</div>
                )}
              </div>
            </div>

            {/* Mini Queue */}
            <div className="space-y-3">
              <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest flex justify-between">
                 <span>REQUEST_QUEUE</span>
                 <span>[{stationQueue?.length || 0}]</span>
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                {stationQueue && stationQueue.length > 0 ? stationQueue.map((req, idx) => (
                  <div key={idx} className="p-2 border border-[#ff006e]/10 bg-black/60 flex justify-between items-center group hover:border-[#ff006e]/40 transition-all">
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold text-white truncate">{req.trackTitle}</div>
                      <div className="text-[7px] text-[#ff006e]/60 font-mono">FROM: {req.username}</div>
                    </div>
                    <button 
                      onClick={() => onPlayPlaylist && onPlayPlaylist([{ id: req.trackId, title: req.trackTitle, artist: 'REQUEST' }], 0)}
                      className="w-6 h-6 rounded-full border border-[#ff006e]/20 flex items-center justify-center text-[#ff006e] hover:bg-[#ff006e] hover:text-black transition-all"
                    >
                      <Play size={10} fill="currentColor" />
                    </button>
                  </div>
                )) : (
                  <div className="p-4 border border-dashed border-white/5 text-center opacity-20 text-[8px] uppercase tracking-widest">
                    Queue Clear
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#ff006e]/10">
               <button 
                onClick={() => setView('player')}
                className="w-full py-2 bg-[#ff006e]/10 border border-[#ff006e]/40 text-[#ff006e] text-[9px] font-black uppercase tracking-widest hover:bg-[#ff006e] hover:text-black transition-all"
               >
                 [ OPEN_FULL_DASHBOARD ]
               </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-[#ff006e]/60 px-2 tracking-[0.4em]">LIVE_STATIONS</h3>
          {liveStations && liveStations.length > 0 ? (
            liveStations.map(station => (
              <div key={station.id || station.Id} className={`p-4 rounded border ${(station.isLive || station.IsLive) ? 'bg-[#ff006e]/5 border-[#ff006e]/20 shadow-[0_0_15px_rgba(255,0,110,0.05)]' : 'bg-black/60 border-white/5 opacity-60'} `}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${(station.isLive || station.IsLive) ? 'bg-[#ff006e] blink shadow-[0_0_8px_#ff006e]' : 'bg-gray-600'} `} />
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">{station.name || station.Name}</span>
                </div>
                <p className="text-[9px] text-white/40 mb-3 italic truncate">
                  {(station.isLive || station.IsLive) ? `Live: ${station.currentSessionTitle || station.CurrentSessionTitle || 'Broadcasting'}` : 'STATUS: OFFLINE'}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-bold text-[#ff006e]/40 uppercase">{(station.listenerCount || station.ListenerCount || 0)} CONNECTED</span>
                  {(station.isLive || station.IsLive) && (
                    <button 
                      onClick={() => {
                        setActiveStation(station);
                        import('./services/signalr').then(m => m.joinStation(station.id || station.Id));
                        if (String(station.artistUserId || station.ArtistUserId) === String(user?.id || user?.Id)) {
                           navigateToProfile(user?.id || user?.Id);
                        } else {
                           setView('player');
                        }
                      }}
                      className="px-2 py-0.5 border border-[#ff006e] text-[#ff006e] text-[8px] font-black rounded hover:bg-[#ff006e] hover:text-black transition-all"
                    >
                      TUNE_IN
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 border border-dashed border-white/5 text-center opacity-20">
              <Radio size={32} className="mx-auto mb-2 opacity-50" />
              <div className="text-[9px] uppercase tracking-widest">No Frequencies Cached</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// --- CONTENIDO: PLAYER (PANTALLA COMPLETA) ---
const PlayerContent = ({
  setView,
  currentTrackIndex,
  setCurrentTrackIndex,
  isPlaying,
  setIsPlaying,
  tracks,
  libraryTracks,
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
  forceNowPlaying,
  activeStation,
  stationChat,
  stationQueue,
  sendMessage,
  requestTrack
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
        libraryTracks={libraryTracks}
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
        activeStation={activeStation}
        stationChat={stationChat}
        stationQueue={stationQueue}
        sendMessage={sendMessage}
        requestTrack={requestTrack}
      />
    </div>
  );
};
// --- COMPONENTES AUXILIARES ---

const SidebarLink = React.memo(({ icon, label, active, onClick, collapsed, hasNotification }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 ${collapsed ? 'p-2.5' : 'p-3.5'} rounded-sm group relative overflow-hidden outline-none
      ${active ? 'text-white' : 'text-white/30 hover:text-[#ff006e]'} 
      ${collapsed ? 'justify-center' : ''}`}
    title={collapsed ? label : ''}
  >
    {/* Active Background Layer */}
    <div className={`absolute inset-0 hud-panel transition-opacity duration-300 pointer-events-none ${active ? 'opacity-100' : 'opacity-0'}`} />
    
    {active && (
      <div className="absolute inset-0 pointer-events-none animate-in fade-in duration-500">
        <div className="hud-bracket-tl text-[#ff006e] opacity-80" />
        <div className="hud-bracket-tr text-[#ff006e] opacity-80" />
        <div className="hud-bracket-bl text-[#ff006e] opacity-80" />
        <div className="hud-bracket-br text-[#ff006e] opacity-80" />
      </div>
    )}
    
    <div className={`relative transition-all duration-300 ${active ? 'scale-110 text-[#ff006e]' : 'opacity-60 group-hover:opacity-100 group-hover:scale-110'}`}>
      {icon}
    </div>
    {!collapsed && (
      <span className={`relative mono text-[10px] font-black uppercase tracking-[0.2em] transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'}`}>
        {label}
      </span>
    )}
    {hasNotification && !active && (
      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#ff006e] rounded-full shadow-[0_0_8px_#ff006e] animate-pulse" />
    )}
  </button>
));

const NavButton = React.memo(({ icon, active, onClick, hasNotification }) => (
  <button onClick={onClick} className={`relative p-3.5 outline-none group rounded-sm ${active ? 'text-[#ff006e]' : 'text-white/20 hover:text-[#ff006e]'}`}>
    {/* Active Background Layer */}
    <div className={`absolute inset-0 hud-panel transition-opacity duration-300 pointer-events-none ${active ? 'opacity-100' : 'opacity-0'}`} />
    
    {active && (
      <div className="absolute inset-0 pointer-events-none animate-in fade-in duration-500">
        <div className="hud-bracket-tl text-[#ff006e] opacity-80" />
        <div className="hud-bracket-tr text-[#ff006e] opacity-80" />
        <div className="hud-bracket-bl text-[#ff006e] opacity-80" />
        <div className="hud-bracket-br text-[#ff006e] opacity-80" />
      </div>
    )}
    <div className={`relative transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'} `}>{icon}</div>
    {hasNotification && !active && (
      <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#ff006e] rounded-full shadow-[0_0_5px_#ff006e]" />
    )}
  </button>
));

const QuickActionButton = React.memo(({ label, icon }) => (
  <button className="w-full flex items-center justify-between p-3 rounded-lg border border-[#ff006e]/10 text-[10px] font-bold text-[#ff006e]/60 hover:bg-[#ff006e10] hover:text-white transition-all uppercase">{label} {icon}</button>
));

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
