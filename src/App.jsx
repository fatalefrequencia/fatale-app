// Deployment Trigger: 2026-05-05T02:50:00-04:00
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
  Frown, Star, Volume2, VolumeX, Plus, Minus, Globe, Maximize2, Minimize2, LogOut, Wallet, ShoppingBag
} from 'lucide-react';
import YouTube from 'react-youtube';



import skullImg from './assets/skull_neon_fuscia.png';
import AuthView from './components/AuthView';
import { useLanguage } from './contexts/LanguageContext';
import { ProfileView } from './components/Profile';
import UploadTrackView from './components/UploadTrackView';
import API from './services/api';
import { IPodPlayer } from './components/IPodPlayer';
import { MessagesView } from './components/MessagesView';
import DiscoveryMapView from './components/DiscoveryMapView';
import DiscoveryHUD from './components/DiscoveryHUD';
import TrackUploadView from './components/UploadTrackView';
import WalletView from './components/WalletView';
import ContentModal from './components/ContentModal';
import SettingsView from './components/SettingsView';


import { SECTORS, API_BASE_URL, getMediaUrl, getUserId } from './constants';
import DJMixerPlayer from './components/DJMixerPlayer';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { initSignalR, joinStation, leaveStation, syncTrack, sendMessage, requestTrack } from './services/signalr';

const ShoppingView = React.lazy(() => 
  import('./components/ShoppingView').catch((err) => {
    console.error("Failed to load ShoppingView", err);
    window.location.reload();
    return { default: () => <div>Loading...</div> };
  })
);

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


// --- UTILS ---
const hashStr = (s) => {
  if (!s) return 0;
  let h = 0;
  const str = s.toString();
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
};

// Unified YouTube Detection
const getGlobalYoutubeId = (t) => {
  if (!t) return null;
  // Handle nested track objects if t is a Like or Purchase record
  const track = t.track || t.Track || t;
  const rawSource = track.source || track.Source || track.filePath || track.FilePath || "";
  const id = track.youtubeId || track.YoutubeId || track.videoId || track.VideoId || track.id || track.Id;
  
  if (typeof rawSource === 'string' && rawSource.startsWith('youtube:')) return rawSource.split(':')[1];
  
  if (typeof rawSource === 'string') {
    if (rawSource.includes('youtube.com/watch?v=')) return rawSource.split('v=')[1]?.split('&')[0];
    if (rawSource.includes('youtu.be/')) return rawSource.split('youtu.be/')[1]?.split('?')[0];
  }

  // Check if string ID is actually a YouTube ID (11 chars)
  if (typeof id === 'string' && id.length === 11) return id;
  // Check yt- notation
  if (typeof id === 'string' && id.startsWith('yt-')) return id.replace('yt-', '');
  if (typeof id === 'string' && id.startsWith('youtube:')) return id.split(':')[1];
  
  return null;
};

// Global Orientation State Fallback (Prevents ReferenceErrors in components defined before App)
const GLOBAL_IS_LANDSCAPE = typeof window !== 'undefined' && window.innerWidth > window.innerHeight;

// --- COMPONENTE PRINCIPAL ---
function App() {
  const [activeView, setViewOriginal] = useState(() => localStorage.getItem('activeView') || 'login');
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
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    const val = localStorage.getItem('currentTrackIndex');
    return val !== null ? parseInt(val) : -1;
  });
  const [isPlaying, setIsPlaying] = useState(false); // Never auto-play on load to respect browser policies
  const [redirectTrigger, setRedirectTrigger] = useState(null); // Refactored to fix RefError
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    const userLang = user?.preferredLanguage || user?.PreferredLanguage;
    if (userLang && userLang !== language) {
      setLanguage(userLang);
    }
  }, [user?.preferredLanguage, user?.PreferredLanguage, setLanguage]);

  const currentUserId = getUserId(user);
  const [tracks, setTracks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tracks') || '[]'); } catch { return []; }
  });
  const [libraryTracks, setLibraryTracks] = useState([]);
  const [postText, setPostText] = useState('');
  const [postFile, setPostFile] = useState(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Real-time Audio State
  const [currentTime, setCurrentTime] = useState(() => {
    const val = localStorage.getItem('currentTime');
    return val !== null ? parseFloat(val) : 0;
  });
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1); // 0 to 1
  const [isMiniPlayerMinimized, setIsMiniPlayerMinimized] = useState(() => {
    return localStorage.getItem('isMiniPlayerMinimized') === 'true';
  });
  const [globalPlaybackRate, setGlobalPlaybackRate] = useState(1);
  const [keyLockA, setKeyLockA] = useState(false);

  // Live Radio State
  const [followingMap, setFollowingMap] = useState({});
  const [favoriteStations, setFavoriteStations] = useState([]);
  const [liveStations, setLiveStations] = useState(RADIO_STATIONS);
  const [activeStation, setActiveStation] = useState(null);
  const [stationChat, setStationChat] = useState([]);
  const [stationQueue, setStationQueue] = useState([]);
  const [showMixer, setShowMixer] = useState(false);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const isMobile = window.innerWidth < 1024;
  const [feedBackgroundImage, setFeedBackgroundImage] = useState(localStorage.getItem('feedBackgroundImage') || '');

  // EQ / Filter State
  const audioCtx = useRef(null);
  const sourceNode = useRef(null);
  const filters = useRef({ low: null, mid: null, high: null });
  const [analyserA, setAnalyserA] = useState(null);
  const analyser = useRef(null); // Keep ref for internal logic but use state for props

  const initAudioCtx = () => {
    if (!audioCtx.current && audioRef.current) {
        audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        
        analyser.current = audioCtx.current.createAnalyser();
        analyser.current.fftSize = 256;
        setAnalyserA(analyser.current);

        filters.current.low = audioCtx.current.createBiquadFilter();
        filters.current.low.type = 'lowshelf';
        filters.current.low.frequency.value = 200;
        
        filters.current.mid = audioCtx.current.createBiquadFilter();
        filters.current.mid.type = 'peaking';
        filters.current.mid.frequency.value = 1000;
        filters.current.mid.Q.value = 1;
        
        filters.current.high = audioCtx.current.createBiquadFilter();
        filters.current.high.type = 'highshelf';
        filters.current.high.frequency.value = 4000;

        sourceNode.current = audioCtx.current.createMediaElementSource(audioRef.current);
        sourceNode.current.connect(filters.current.low);
        filters.current.low.connect(filters.current.mid);
        filters.current.mid.connect(filters.current.high);
        filters.current.high.connect(analyser.current);
        analyser.current.connect(audioCtx.current.destination);
    }
  };

  const handleEqChange = (type, val) => {
    initAudioCtx();
    const ctx = audioCtx.current;
    if (ctx?.state === 'suspended') ctx.resume();
    
    if (filters.current[type]) {
        // Use setTargetAtTime for smoother, more noticeable analog-style transition
        const now = ctx.currentTime;
        filters.current[type].gain.setTargetAtTime(val, now, 0.02);
    }
  };

  const handlePlaybackRateChange = (newRate) => {
    setGlobalPlaybackRate(newRate);
    if (audioRef.current) {
        audioRef.current.preservesPitch = keyLockA;
        audioRef.current.playbackRate = newRate;
    }
    if (youtubePlayer && typeof youtubePlayer.setPlaybackRate === 'function') {
        try {
            youtubePlayer.setPlaybackRate(newRate);
        } catch(e) { console.warn("YT setRate fail", e); }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.preservesPitch = keyLockA;
    }
  }, [keyLockA]);

  const onEqA = (type, val) => handleEqChange(type, val);

  const handleBackgroundChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFeedBackgroundImage(reader.result);
        localStorage.setItem('feedBackgroundImage', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      isLiked: raw.isLiked ?? (raw.IsLiked ?? false),
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
    try {
      const saved = localStorage.getItem('liked_youtube_ids');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {
      console.error("[Persistence] Failed to restore likedYouTubeIds", e);
    }
    return new Set();
  });
  const [subscription, setSubscription] = useState(null);
  const [cachedTrackIds, setCachedTrackIds] = useState(new Set());
  const [followedCommunities, setFollowedCommunities] = useState(() => {
    try { return JSON.parse(localStorage.getItem('followed_communities') || '[]'); } catch { return []; }
  });

  // --- GLOBAL ACTION STATES (Terminal Redirection Fix) ---
  const [showGlobalGoLive, setShowGlobalGoLive] = useState(false);
  const [showGlobalUpload, setShowGlobalUpload] = useState(false);
  const [showGlobalIngest, setShowGlobalIngest] = useState(false);
  const [ingestMode, setIngestMode] = useState('ALL'); // 'ALL' or 'JOURNAL'
  // Force reload to fix cache issue with setIngestMode

  const [goLiveFormData, setGoLiveFormData] = useState({ sessionTitle: '', description: '', isChatEnabled: true, isQueueEnabled: true });
  
  // --- GLOBAL MODAL STATE ---
  const [globalExpandedContent, setGlobalExpandedContent] = useState(null);
  const [globalExpandedType, setGlobalExpandedType] = useState('JOURNAL');
  const [globalExpandedTheme, setGlobalExpandedTheme] = useState(null);

  const handleGlobalGoLive = async (sessionTitle, description) => {
    const title = sessionTitle || goLiveFormData.sessionTitle;
    const desc = description || goLiveFormData.description;

    if (!title) {
      showNotification("BROADCAST_ERROR", t('NAME_REQUIRED'), "error");
      return;
    }

    try {
      await API.Stations.goLive({
        SessionTitle: title,
        Description: desc || null,
        IsChatEnabled: goLiveFormData.isChatEnabled,
        IsQueueEnabled: goLiveFormData.isQueueEnabled
      });

      showNotification("BROADCAST_ACTIVE", t('ESTABLISH_SIGNAL'), "success");
      setShowGlobalGoLive(false);
      setGoLiveFormData({ sessionTitle: '', description: '', isChatEnabled: true, isQueueEnabled: true });

      // After starting, briefly navigate to profile to show the broadcast interface
      navigateToProfile(user?.id, 'broadcast');
    } catch (e) {
      console.error("Failed to go live global:", e);
      showNotification("BROADCAST_FAILURE", t('SYNC_FAILURE'), "error");
    }
  };

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
    setDuration(audioRef.current.duration);
    // Apply active playback rate to new signal
    audioRef.current.playbackRate = globalPlaybackRate;
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
            // Capture time immediately on play to prevent jumps/stutter
            if (typeof youtubePlayer.getCurrentTime === 'function') {
              const time = youtubePlayer.getCurrentTime();
              const dur = youtubePlayer.getDuration();
              if (dur && dur > 0 && dur !== duration) setDuration(dur);
              setCurrentTime(time);
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
      }, 250);
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
    };
    window.addEventListener('tuneIn', handleTuneIn);
    return () => window.removeEventListener('tuneIn', handleTuneIn);
  }, []);

  // Ensure the current user (including broadcasters) joins their station SignalR group
  useEffect(() => {
    if (activeStation) {
      const sId = activeStation.id || activeStation.Id;
      joinStation(sId);
    }
  }, [activeStation]);

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
        setStationChat(prev => {
          // Skip duplicates: if we already added this message optimistically, don't add the server echo
          const alreadyExists = prev.some(
            m => m.isLocal && m.message === (msg.message || msg.content) && m.username === (msg.username || msg.userName)
          );
          if (alreadyExists) {
            // Replace the optimistic copy with the canonical server copy (removes isLocal flag)
            return prev.map(m =>
              m.isLocal && m.message === (msg.message || msg.content) && m.username === (msg.username || msg.userName)
                ? { ...msg, isLocal: false }
                : m
            );
          }
          return [...prev, msg].slice(-50);
        });
      });

      conn.on("TrackRequested", (req) => {
        setStationQueue(prev => [...prev, req].slice(-20));
      });

      conn.on("StationEnded", (data) => {
        setActiveStation(prev => {
          if (prev && (prev.id === data.stationId || prev.Id === data.stationId)) {
            showNotification("BROADCAST_ENDED", t('SIGNAL_LOST'), "info");
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

  // --- PERSISTENCE LOOPS ---
  useEffect(() => {
    if (activeView && activeView !== 'login') {
      localStorage.setItem('activeView', activeView);
    }
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem('currentTrackIndex', currentTrackIndex);
  }, [currentTrackIndex]);

  useEffect(() => {
    localStorage.setItem('tracks', JSON.stringify(tracks));
  }, [tracks]);

  useEffect(() => {
    // Only save time periodically to avoid excessive storage writes
    const interval = setInterval(() => {
      if (isPlaying && currentTime > 0) {
        localStorage.setItem('currentTime', currentTime);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTime]);

  useEffect(() => {
    localStorage.setItem('liked_youtube_ids', JSON.stringify(Array.from(likedYoutubeIds)));
  }, [likedYoutubeIds]);

  // Restoration Seek Effect
  useEffect(() => {
    if (currentTime > 0 && (audioRef.current || youtubePlayer)) {
      console.log(`[Persistence] Restoring playback to: ${currentTime}s`);
      handleSeek(currentTime);
    }
  }, [currentTrack?.id, !!youtubePlayer]);

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

  const onRefreshProfile = async () => {
    try {
      await fetchUserProfile(false);
      console.log("[App] Profiler refreshed via common handler");
    } catch (e) {
      console.error("[App] Failed to refresh profile", e);
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
      onRefreshProfile(); // Get latest DB profile including communityId
    }
  }, [currentUserId]);

  // Fetch Tracks, Purchases, Likes (Local & YouTube), Subscription
  const fetchTracks = async () => {
    try {
      const uid = currentUserId;
      if (!uid) return;
      console.log("[App] Fetching tracks for user:", uid);

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

      const localLikedYtIds = new Set(likes
        .filter(t => t && (t.source || t.Source)?.startsWith('youtube:'))
        .map(t => (t.source || t.Source).split(':')[1])
        .filter(Boolean)
      );

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

      if (tracksRes.data && Array.isArray(tracksRes.data)) {
        tracksRes.data.forEach(t => {
          const trackId = String(t.trackId || t.TrackId || t.id || t.Id);
          const artistUserId = t.artistUserId || t.ArtistUserId || t.album?.artist?.userId || t.Album?.Artist?.UserId;
          const isMine = artistUserId && String(artistUserId) === String(uid);

          const yId = getGlobalYoutubeId(t);
          const isYT = !!yId;
          const rawSource = t.source || t.Source || t.filePath || t.FilePath || "";
          const resolvedSource = isYT ? `youtube:${yId}` : (rawSource ? (rawSource.startsWith('http') ? rawSource : getMediaUrl(rawSource)) : null);

          if (!resolvedSource || resolvedSource === API_BASE_URL || resolvedSource === `${API_BASE_URL}/`) return;

          const artistName = t.album?.artist?.name || t.Album?.Artist?.Name || '';
          if (artistName === 'The Archive') return;

          const isLiked = likedTrackIds.has(trackId);
          if (isYT && isLiked) localLikedYtIds.add(yId);

          const mappedTrack = {
            ...t,
            id: trackId,
            title: t.title || t.Title || 'Unknown Title',
            artist: artistName || 'Unknown Artist',
            album: t.album?.title || t.Album?.Title || 'Unknown Album',
            duration: t.duration || t.Duration || '3:00',
            cover: isYT ? (t.thumbnailUrl || t.ThumbnailUrl || `https://img.youtube.com/vi/${yId}/hqdefault.jpg`) : getMediaUrl(t.coverImageUrl || t.CoverImageUrl),
            source: resolvedSource,
            isOwned: ownedTrackIds.has(trackId) || isMine,
            isLiked: isLiked,
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
        likes.forEach(lik => {
          const yId = getGlobalYoutubeId(lik);
          if (yId) {
            localLikedYtIds.add(yId);
            const sourceKey = `youtube:${yId}`;
            if (uniqueTracksMap.has(sourceKey)) {
              const existing = uniqueTracksMap.get(sourceKey);
              uniqueTracksMap.set(sourceKey, { ...existing, isLiked: true });
              return;
            }
            const mappedYt = {
              id: String(lik.id || lik.Id || `yt-${yId}`),
              videoId: yId,
              title: lik.title || lik.Title,
              artist: lik.channelTitle || lik.artist || "Unknown Artist",
              source: sourceKey,
              isLiked: true,
              isOwned: false,
              isLocked: false,
              isCached: cachedIds.has(lik.id) || cachedIds.has(lik.Id)
            };
            uniqueTracksMap.set(sourceKey, mappedYt);
          }
        });
      }
      
      setLikedYoutubeIds(localLikedYtIds);

      const allTracks = Array.from(uniqueTracksMap.values());
      const finalTracks = allTracks.length > 0 ? allTracks : (uid ? [] : TRACKS);
      setLibraryTracks(finalTracks);
      setTracks(prev => {
        const isMock = prev.length > 0 && String(prev[0].id).startsWith('mock-');
        if (prev.length === 0 || isMock) return finalTracks;
        
        // --- DEEP RE-SYNC: Ensure current queue reflects latest social state ---
        return prev.map(t => {
          const tId = String(t.trackId || t.TrackId || t.id || t.Id);
          const yId = getGlobalYoutubeId(t);
          
          let isLiked = yId ? localLikedYtIds.has(yId) : likedTrackIds.has(tId);
          // If not found by primary keys, try matching libraryTracks meta (fallthrough)
          if (!isLiked) {
             const matched = finalTracks.find(ft => ft.id === tId || (yId && getGlobalYoutubeId(ft) === yId));
             if (matched) isLiked = matched.isLiked;
          }

          const isOwned = ownedTrackIds.has(tId) || t.isOwned || t.IsOwned || (uid && String(t.artistUserId) === String(uid));
          
          return { ...t, isLiked, isOwned };
        });
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

  useEffect(() => {
    const handleFollowChange = () => {
      setFollowedCommunities(API.Communities.getFollowed());
    };
    window.addEventListener('communityFollowChanged', handleFollowChange);
    return () => window.removeEventListener('communityFollowChanged', handleFollowChange);
  }, []);

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
      
      // Play silent audio on native element to keep background session alive on mobile
      const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
      if (audio.getAttribute('data-playing-src') !== 'silent') {
        audio.src = silentSrc;
        audio.loop = true;
        audio.setAttribute('data-playing-src', 'silent');
        audio.load();
      }
      
      if (isPlaying) {
        if (audio.paused) {
          audio.play().catch(err => console.warn("[PLAYER] Failed to play silent audio", err));
        }
      } else {
        if (!audio.paused) {
          audio.pause();
        }
      }
    } else {
      if (isYoutubeMode) setIsYoutubeMode(false);

      // Handle Local Audio Source Change
      const currentSrc = audio.getAttribute('data-playing-src');
      if (trackSource && (currentSrc !== trackSource)) {
        console.log(`[PLAYER] Loading new local source: ${trackSource}`);
        audio.src = trackSource;
        audio.loop = false; // Ensure it doesn't loop so onEnded fires
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

  const playNext = async () => {
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
            isLiked: rec.trackType === 'youtube' ? likedYoutubeIds.has(rec.trackId) : libraryTracks.some(lt => String(lt.id || lt.Id) === String(rec.trackId) && lt.isLiked),
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

  // --- MEDIA SESSION API (Background Audio Support) ---
  useEffect(() => {
    if ('mediaSession' in navigator) {
      const displayTitle = activeStation ? (activeStation.name || activeStation.Name) : (currentTrack?.title || "Fatale Signal");
      const displayArtist = activeStation ? (activeStation.artistName || activeStation.ArtistName || "Live DJ") : (currentTrack?.artist || "System Node");
      const displayCover = activeStation?.imageUrl || currentTrack?.cover || skullImg;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: displayTitle,
        artist: displayArtist,
        album: activeStation ? "Fatale Live Radio" : (currentTrack?.album || "Fatale Digital"),
        artwork: [
          { src: displayCover, sizes: '512x512', type: 'image/png' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
        if (isYoutubeMode && youtubePlayer) youtubePlayer.playVideo();
        else if (audioRef.current) audioRef.current.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
        if (isYoutubeMode && youtubePlayer) youtubePlayer.pauseVideo();
        else if (audioRef.current) audioRef.current.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (currentTrackIndex > 0) setCurrentTrackIndex(prev => prev - 1);
      });
      navigator.mediaSession.setActionHandler('nexttrack', playNext);

      // Sync playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [currentTrack?.id, isPlaying, isYoutubeMode, youtubePlayer, activeStation?.id, activeStation?.Id]);

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

  const playPrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % (tracks.length || 1));
    setIsPlaying(true);
  };

  const togglePlay = () => {
    initAudioCtx();
    if (audioCtx.current?.state === 'suspended') {
      audioCtx.current.resume().catch(e => console.warn("AudioContext resume failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  // Modified to use main library tracks for correct Like status
  const handlePlayPlaylist = (playlistTracksRaw, startIndex = 0, shouldRedirect = true) => {
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

      // Unified YouTube Resolution
      const pureYtId = getGlobalYoutubeId(pTrack);
      const isYoutube = !!pureYtId;
      const isDiscoveryAbsolute = isYoutube || (pTrack.source || pTrack.Source || "").startsWith('http');

      // Resolve Like Status
      const isLiked = isYoutube ? likedYoutubeIds.has(pureYtId) : (pTrack.isLiked || pTrack.IsLiked || found?.isLiked || found?.IsLiked);

      // Resolve Cover
      const rawCover = pTrack.cover || pTrack.CoverImageUrl || pTrack.coverImageUrl || pTrack.imageUrl || pTrack.ImageUrl || found?.cover || found?.CoverImageUrl || found?.imageUrl;
      const resolvedCover = isYoutube 
        ? (rawCover || `https://img.youtube.com/vi/${pureYtId}/hqdefault.jpg`)
        : (rawCover ? (rawCover.startsWith('http') ? rawCover : getMediaUrl(rawCover)) : null);

      if (found) {
        return {
          ...found,
          id: pId || found.id || found.Id,
          source: isYoutube ? `youtube:${pureYtId}` : (isDiscoveryAbsolute ? (pTrack.source || pTrack.Source) : (found.source || found.Source || pTrack.source || pTrack.Source)),
          cover: resolvedCover,
          isLiked,
          isOwned: true,
          isLocked: false
        };
      }
      return {
        ...pTrack,
        id: pId,
        source: isYoutube ? `youtube:${pureYtId}` : (pTrack.source || pTrack.Source),
        cover: resolvedCover,
        isLiked,
        isOwned: true,
        isLocked: false
      };
    });

    console.log("[App] Playing Playlist via Enriched Queue. Count:", enrichedQueue.length);

    // 3. Set states
    const firstTrack = enrichedQueue[startIndex];
    const isYT = (firstTrack?.source || firstTrack?.Source)?.startsWith('youtube:');

    setTracks(enrichedQueue);
    setCurrentTrackIndex(startIndex);
    setIsPlaying(true);
    if (isYT) setIsYoutubeMode(true);

    if (shouldRedirect && typeof setRedirectTrigger === 'function') {
      setRedirectTrigger(Date.now());
      setView('player');
    }
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
          monitorImageUrl: getMediaUrl(rawData?.monitorImageUrl || rawData?.MonitorImageUrl) || user?.monitorImageUrl,
          monitorBackgroundColor: rawData?.monitorBackgroundColor || rawData?.MonitorBackgroundColor || user?.monitorBackgroundColor || '#000000',
          monitorIsGlass: rawData?.monitorIsGlass !== undefined ? rawData?.monitorIsGlass : (rawData?.MonitorIsGlass !== undefined ? rawData?.MonitorIsGlass : (user?.monitorIsGlass || false)),
          themeColor: rawData?.themeColor || rawData?.ThemeColor || user?.themeColor || '#ff006e',
          textColor: rawData?.textColor || rawData?.TextColor || user?.textColor || '#ffffff',
          backgroundColor: rawData?.backgroundColor || rawData?.BackgroundColor || user?.backgroundColor || '#000000',
          isGlass: rawData?.isGlass !== undefined ? rawData?.isGlass : (rawData?.IsGlass !== undefined ? rawData?.IsGlass : (user?.isGlass || false)),
          communityId: rawData?.communityId || rawData?.CommunityId || user?.communityId,
          communityName: rawData?.communityName || rawData?.CommunityName || user?.communityName,
          communityColor: rawData?.communityColor || rawData?.CommunityColor || user?.communityColor,
          preferredLanguage: rawData?.preferredLanguage || rawData?.PreferredLanguage || user?.preferredLanguage || 'en'
        };

        setUser(prev => {
          const updated = { ...userData };
          try { localStorage.setItem('user', JSON.stringify(updated)); } catch (e) { }
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

  const handleFetchPlaylistTracks = async (playlistId) => {
    try {
      const res = await API.Playlists.getById(playlistId);
      // Backend returns { playlist: ..., tracks: [...] } or just tracks
      return res.data.Tracks || res.data.tracks || res.data.playlistTracks || [];
    } catch (e) {
      console.error("Failed to fetch playlist tracks", e);
      return [];
    }
  };

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

    // FIX: Use ONLY source-based detection. typeof trackId === 'string' was too broad
    // because JSON deserializes numeric DB IDs as strings (e.g., "42"), falsely
    // triggering YouTube logic for local tracks that were saved to DB.
    const isYoutube = track.source?.startsWith('youtube:');
    const isLiking = !track.isLiked;

    // FIX: Always derive pureYoutubeId from track.source, never from trackId
    let pureYoutubeId = null;
    if (isYoutube) {
      pureYoutubeId = track.source.split(':')[1];
    }

    console.log(`[handleLike] ${isLiking ? 'LIKE' : 'UNLIKE'} | Type: ${isYoutube ? 'YouTube' : 'Local'} | trackId: ${trackId} | ytId: ${pureYoutubeId}`);

    // Optimistic Update Tracks State
    setTracks(prev => prev.map(t => {
      const isMatch = String(t.id || t.Id) === String(trackId) || 
                      (pureYoutubeId && getGlobalYoutubeId(t) === pureYoutubeId);
      return isMatch ? { ...t, isLiked: isLiking } : t;
    }));

    // Optimistic Update Liked Set for YouTube
    if (isYoutube && pureYoutubeId) {
      setLikedYoutubeIds(prev => {
        const next = new Set(prev);
        if (isLiking) next.add(pureYoutubeId);
        else next.delete(pureYoutubeId);
        // Persist immediately
        localStorage.setItem('liked_youtube_ids', JSON.stringify(Array.from(next)));
        return next;
      });
    }

    try {
      // Resolve the numeric database ID needed for the Social API
      let dbId = Number.isInteger(Number(trackId)) ? Number(trackId) : null;

      if (isYoutube && !dbId) {
        // YouTube track without a numeric DB ID — save it to DB first
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
        console.log(`[handleLike] YouTube track saved to DB with id: ${dbId}`);

        // FIX: Backfill the new DB ID into the queue so future operations use it
        setTracks(prev => prev.map(t => {
          if (pureYoutubeId && getGlobalYoutubeId(t) === pureYoutubeId) {
            return { ...t, id: String(dbId) };
          }
          return t;
        }));
      } else if (!isYoutube) {
        // Local track — trackId is already the DB ID
        dbId = Number(trackId);
      }

      // Use unified social endpoints with the numeric DB ID
      if (isLiking) {
        await API.Social.likeTrack(dbId);
      } else {
        await API.Social.unlikeTrack(dbId);
      }
      console.log(`[handleLike] Track ${dbId} ${isLiking ? 'liked' : 'unliked'} and persisted.`);

      // Refresh library tracks from server to ensure everything is perfectly in sync with DB
      await fetchTracks();

      // Also update tracks state to ensure hearts stay filled/unfilled
      setTracks(prev => prev.map(t => {
        const isMatch = String(t.id || t.Id) === String(trackId) || 
                        String(t.id || t.Id) === String(dbId) ||
                        (pureYoutubeId && getGlobalYoutubeId(t) === pureYoutubeId);
        return isMatch ? { ...t, isLiked: isLiking } : t;
      }));
    } catch (error) {
      console.error("[handleLike] Failed to sync like status:", error);
      // Rollback on error
      setTracks(prev => prev.map(t => {
        const isMatch = String(t.id || t.Id) === String(trackId) || 
                        (pureYoutubeId && getGlobalYoutubeId(t) === pureYoutubeId);
        return isMatch ? { ...t, isLiked: !isLiking } : t;
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
    localStorage.removeItem('activeView');
    localStorage.removeItem('currentTrackIndex');
    localStorage.removeItem('tracks');
    localStorage.removeItem('currentTime');
    localStorage.removeItem('liked_youtube_ids');

    // 4. Update UI state
    setUser(null);
    setTracks([]); // Clear tracks to prevent stale keys
    setLibraryTracks([]); // Clear library tracks
    setLikedYoutubeIds(new Set()); // Clear local likes
    setGlobalStats(null); // Clear stats
    setViewOriginal('login'); // Use raw setter to bypass persistence loop if needed
    setViewingUserId(null);
    setYoutubePlayer(null);
  };

  const navigateToProfile = (id, initialModal = null) => {
    console.log(`[NAV_PROTOCOL] Navigating to: ${id || 'SELF'} | Trigger: ${initialModal}`);
    console.trace('[NAV_TRACE]');
    setViewingUserId(id);
    setProfileInitialModal(initialModal);
    if (activeView !== 'profile' && activeView !== 'login') {
      setPreviousView(activeView);
    }
    setViewOriginal('profile');
  };

  const handleSendMessage = (message) => {
    if (!message || !message.trim()) return;
    const username = user?.username || user?.Username || 'ANON_NODE';
    // Optimistic update: add message locally immediately so it shows up for the sender
    const localMsg = {
      username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      isLocal: true,
    };
    setStationChat(prev => [...prev, localMsg].slice(-50));
    // Also broadcast via SignalR if in a live station
    if (activeStation) {
      const sId = activeStation.id || activeStation.Id;
      sendMessage(sId, message.trim(), username);
    }
  };

  const handleRequestTrack = (trackData) => {
    if (!activeStation) return;
    const sId = activeStation.id || activeStation.Id;
    requestTrack(sId, trackData, user?.username || user?.Username || 'ANON_NODE');
  };

  const handleGlobalIngestFile = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'CORE_LOG') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result;
        const title = file.name.split('.')[0];
        try {
          await API.Journal.create({
            Title: title,
            Content: content,
            IsPosted: true,
            IsPinned: false
          });
          showNotification("INGEST_COMPLETE", `Journal [${title}] ingested into core archive.`, "success");
          setShowGlobalIngest(false);
          // Optional: Refresh if needed
        } catch (err) {
          console.error("Failed to commit log", err);
          showNotification("INGEST_FAILURE", "Failed to ingest journal log.", "error");
        }
      };
      reader.readAsText(file);
    } else if (type === 'VISUAL_DATA' || type === 'SIGNAL_FEED') {
      const contentType = type === 'VISUAL_DATA' ? 'PHOTO' : 'VIDEO';
      const formData = new FormData();
      formData.append('File', file);
      formData.append('Type', contentType);
      formData.append('Title', file.name.split('.')[0]);
      formData.append('IsPosted', true);

      try {
        console.log(`[GLOBAL_INGEST] Starting ${contentType} upload:`, file.name);
        await API.Studio.upload(formData);
        showNotification("INGEST_COMPLETE", `${contentType} [${file.name.split('.')[0]}] ingested successfully.`, "success");
        setShowGlobalIngest(false);
      } catch (err) {
        console.error("Failed to ingest media", err);
        showNotification("INGEST_FAILURE", `Failed to ingest ${contentType}.`, "error");
      }
    }
  };

  const handleNewPostSubmit = async () => {
    if (!postText.trim()) return;
    setIsSubmittingPost(true);
    try {
      if (postFile) {
        const formData = new FormData();
        formData.append('File', postFile);
        formData.append('Type', postFile.type.startsWith('video') ? 'VIDEO' : 'PHOTO');
        formData.append('Title', postText.slice(0, 20));
        formData.append('Description', postText);
        formData.append('IsPosted', true);
        
        await API.Studio.upload(formData);
        showNotification("INGEST_COMPLETE", "Visual post transmitted successfully.", "success");
      } else {
        await API.Journal.create({
          Title: postText.slice(0, 20),
          Content: postText,
          IsPosted: true,
          IsPinned: false
        });
        showNotification("INGEST_COMPLETE", "Journal post transmitted successfully.", "success");
      }
      setShowGlobalIngest(false);
      setPostText('');
      setPostFile(null);
      window.location.reload();
    } catch (error) {
      console.error("Post failed:", error);
      showNotification("INGEST_FAILURE", "Failed to transmit post.", "error");
    } finally {
      setIsSubmittingPost(false);
    }
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
    <div className="h-[100dvh] flex bg-[#020202] text-[#ff006e] font-mono selection:bg-[#ff006e] selection:text-black overflow-hidden">
      {/* Hidden Global Ingest Inputs */}
      <input
        id="global-ingest-log"
        type="file"
        accept=".txt,.log,.md"
        className="hidden"
        onChange={(e) => {
          handleGlobalIngestFile(e, 'CORE_LOG');
          e.target.value = '';
        }}
      />
      <input
        id="global-ingest-visual"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleGlobalIngestFile(e, 'VISUAL_DATA');
          e.target.value = '';
        }}
      />
      <input
        id="global-ingest-signal"
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          handleGlobalIngestFile(e, 'SIGNAL_FEED');
          e.target.value = '';
        }}
      />

      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onEnded={playNext}
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
                    e.target.setPlaybackRate(globalPlaybackRate);
                  } catch (err) { console.warn("YT Play onReady failure:", err); }
                }
              }}
              onStateChange={(e) => {
                console.log("[YOUTUBE] State Change:", e.data);
                if (e.data === 0) playNext();
                if (e.data === 1 && !isPlaying) setIsPlaying(true);
                if (e.data === 2 && isPlaying) setIsPlaying(false);
              }}
              onError={(e) => {
                console.error("[YOUTUBE] Error detected:", e.data);
                // Handle private/deleted videos by skipping
                if (isPlaying) playNext();
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
          <AuthView onLoginSuccess={handleAuthSuccess} onBackToOrbit={() => setView('discovery')} />
        ) : (
          <>
            {console.log("[App] Rendering Dashboard. Redirect Trigger:", redirectTrigger)}
           <Dashboard
               keyLockA={keyLockA}
               setKeyLockA={setKeyLockA}
               activeView={activeView}
               setView={setView}
               onLogout={handleLogout}
               currentTrackIndex={currentTrackIndex}
               setCurrentTrackIndex={setCurrentTrackIndex}
               setTracks={setTracks}
               isPlaying={isPlaying}
               setIsPlaying={setIsPlaying}
               user={user}
               tracks={tracks}
               libraryTracks={libraryTracks}
               togglePlay={togglePlay}
               handleNext={playNext}
               handlePrev={playPrev}
               handlePlayPlaylist={handlePlayPlaylist}
               onQueueTrack={(track) => setTracks(prev => [...prev, track])}
               onPurchase={handlePurchase}
               onDownload={handleDownload}
               onLike={handleLike}
               onCache={handleCache}
               onAddCredits={addCreditsDebug}
               onRefreshProfile={onRefreshProfile}
               onRefreshTracks={fetchTracks}
               currentTime={currentTime}
               duration={duration}
               onSeek={handleSeek}
               globalStats={globalStats}
               hasNewMessages={hasNewMessages}
               navigateToProfile={navigateToProfile}
               viewingUserId={viewingUserId}
               likedYoutubeIds={likedYoutubeIds}
               subscription={subscription}
               cachedTrackIds={cachedTrackIds}
               playlists={userPlaylists}
               onRefreshPlaylists={fetchPlaylists}
               redirectTrigger={redirectTrigger}
               setRedirectTrigger={setRedirectTrigger}
               profileInitialModal={profileInitialModal}
               setProfileInitialModal={setProfileInitialModal}
               favoriteStations={favoriteStations}
               liveStations={liveStations}
               activeStation={activeStation}
               stationChat={stationChat}
               stationQueue={stationQueue}
               onExitProfile={() => setViewOriginal(previousView)}
               activeMessageUser={activeMessageUser}
               setActiveMessageUser={setActiveMessageUser}
               isMuted={isMuted}
               onToggleMute={() => setIsMuted(!isMuted)}
               followedCommunities={followedCommunities}
               onFollowUpdate={() => {
                 const updated = API.Communities.getFollowed();
                 setFollowedCommunities(updated);
               }}
               setShowGlobalGoLive={setShowGlobalGoLive}
               setShowGlobalUpload={setShowGlobalUpload}
               setShowGlobalIngest={setShowGlobalIngest}
               setIngestMode={setIngestMode}
               setActiveStation={setActiveStation}
               sendMessage={handleSendMessage}
               requestTrack={handleRequestTrack}
               setUser={setUser}
               onExpandContent={(content, type, themeData) => {
                 setGlobalExpandedContent(content);
                 setGlobalExpandedType(type);
                 setGlobalExpandedTheme(themeData);
               }}
               volume={volume}
               setVolume={setVolume}
               isMiniPlayerMinimized={isMiniPlayerMinimized}
               setIsMiniPlayerMinimized={setIsMiniPlayerMinimized}
               onFetchPlaylistTracks={handleFetchPlaylistTracks}
               onPlaybackRateChange={handlePlaybackRateChange}
               onEqA={onEqA}
               analyserA={analyserA}
               station={activeStation}
               isLandscape={isLandscape}
           />
          </>
        )}
      </AnimatePresence>

      {/* ─── GLOBAL MODALS ─── */}
      <AnimatePresence>
        {globalExpandedContent && (
          <ContentModal
            content={globalExpandedContent}
            onClose={() => { setGlobalExpandedContent(null); setGlobalExpandedTheme(null); }}
            type={globalExpandedType}
            user={user}
            hasMiniPlayer={currentTrackIndex >= 0 && activeView !== 'player'}
            themeColor={globalExpandedTheme?.themeColor || '#9d00ff'}
            monitorBackgroundColor={globalExpandedTheme?.backgroundColor || '#000000'}
            isGlass={globalExpandedTheme?.isGlass}
            monitorImageUrl={globalExpandedTheme?.monitorImageUrl}
          />
        )}
      </AnimatePresence>

      {/* ─── GLOBAL ACTION OVERLAY LAYER ─── */}
      <AnimatePresence>
        {/* ─── Go Live Modal ─── */}
        {showGlobalGoLive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/98 backdrop-blur-md" onClick={() => setShowGlobalGoLive(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-[#000000] border border-white/10 p-8 shadow-[0_0_100px_rgba(0,0,0,1)] rounded-sm">
              {/* HUD Elements */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-white/5 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-white/5 pointer-events-none" />

              <div className="flex justify-between items-start mb-10">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-white/5 border border-white/10 rounded-sm">
                    <div className="w-1 h-1 rounded-full bg-[#ff006e] animate-pulse shadow-[0_0_8px_#ff006e]" />
                    <span className="text-[8px] mono font-black text-white/40 tracking-[0.4em] uppercase">SIGNAL_BROADCAST_INIT</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowGlobalGoLive(false)}
                  className="text-white/20 hover:text-[#ff006e] hover:rotate-90 transition-all duration-300 transform active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">signal_metadata // title</label>
                  <input
                    type="text"
                    value={goLiveFormData.sessionTitle}
                    onChange={e => setGoLiveFormData(p => ({ ...p, sessionTitle: e.target.value }))}
                    className="w-full bg-[#050505] border border-white/5 p-4 text-white font-black outline-none focus:border-[#ff006e]/40 tracking-widest text-xs transition-all placeholder:text-white/5"
                    placeholder="establish_session_id..."
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">transmission_log // description</label>
                  <textarea
                    value={goLiveFormData.description}
                    onChange={e => setGoLiveFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-[#050505] border border-white/5 p-4 text-white font-medium outline-none focus:border-[#ff006e]/20 min-h-[100px] text-[10px] resize-none transition-all placeholder:text-white/5"
                    placeholder="Optional signal details..."
                  />
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => handleGlobalGoLive()}
                    disabled={!goLiveFormData.sessionTitle.trim()}
                    className="w-full py-4 border border-[#ff006e] bg-[#ff006e]/10 text-[#ff006e] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#ff006e] hover:text-black hover:shadow-[0_0_40px_rgba(255,0,110,0.4)] disabled:opacity-50 disabled:shadow-none"
                  >
                    Init_Broadcast
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── Upload Modal ─── */}
        {showGlobalUpload && (
          <UploadTrackView
            onClose={() => setShowGlobalUpload(false)}
            onRefreshTracks={async () => {
              const res = await API.Tracks.getAllTracks();
              setTracks(res.data);
              showNotification("SYNC_COMPLETE", "Tracks verified and updated.", "success");
            }}
          />
        )}

        {/* ─── Ingest Choice Modal (NEW_POST) ─── */}
        {showGlobalIngest && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => { setShowGlobalIngest(false); setIngestMode('ALL'); }} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-xl text-center space-y-8 bg-black p-8 border border-white/10">
              <button onClick={() => { setShowGlobalIngest(false); setIngestMode('ALL'); }} className="absolute top-4 right-4 p-2 text-[#ff006e]/40 hover:text-[#ff006e] hover:rotate-90 transition-all duration-300">
                <X size={20} />
              </button>
              <div className="space-y-4">
                <p className="text-[10px] text-[#ff006e] mono uppercase tracking-[0.6em] animate-pulse">
                    {ingestMode === 'JOURNAL' ? '/ New Journal Entry /' : '/ New Transmission /'}
                </p>
                <div className="flex items-center gap-3 justify-center">
                    <div className="w-10 h-10 bg-black border border-white/10 rounded-full overflow-hidden shrink-0">
                        <img src={getMediaUrl(user?.profilePictureUrl || user?.profileImageUrl || user?.ProfilePictureUrl)} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=USER'; }} alt="" />
                    </div>
                    <span className="text-[12px] text-white font-black uppercase tracking-tighter">{user?.username || 'ANON'}</span>
                </div>
              </div>

              <div className="space-y-6 text-left">
                  <div className="space-y-2">
                      <label className="text-[10px] text-[#ff006e]/60 uppercase tracking-widest">Post Content (Required)</label>
                      <textarea 
                          value={postText}
                          onChange={(e) => setPostText(e.target.value)}
                          className="w-full bg-[#050505] border border-white/5 p-4 text-white text-xs outline-none focus:border-[#ff006e]/40 min-h-[120px] resize-none font-sans"
                          placeholder="What's on your mind?..."
                      />
                  </div>
                  {ingestMode !== 'JOURNAL' && (
                      <div className="space-y-2">
                          <label className="text-[10px] text-[#ff006e]/60 uppercase tracking-widest">Attach Media (Optional)</label>
                          <input 
                              type="file"
                              accept="image/*,video/*"
                              onChange={(e) => setPostFile(e.target.files[0])}
                              className="w-full bg-[#050505] border border-white/5 p-4 text-white text-xs outline-none focus:border-[#ff006e]/40 font-sans"
                          />
                      </div>
                  )}
                  <button
                      onClick={handleNewPostSubmit}
                      disabled={!postText.trim() || isSubmittingPost}
                      className="w-full py-4 bg-[#ff006e]/10 border border-[#ff006e] text-[#ff006e] text-[10px] font-black uppercase tracking-widest hover:bg-[#ff006e] hover:text-black transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                      {isSubmittingPost ? 'TRANSMITTING...' : 'TRANSMIT_SIGNAL'}
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMixer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="fixed inset-0 z-[2000]"
          >
            {/* Landscape Prompt for Mobile */}
            {!isLandscape && window.innerWidth < 1024 && (
              <div className="fixed inset-0 bg-black/90 z-[2100] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 border-2 border-[var(--theme-color)] rounded-lg animate-bounce mb-6 flex items-center justify-center">
                  <RotateCw className="text-[var(--theme-color)]" />
                </div>
                <h2 className="mono font-black text-xs uppercase tracking-widest text-white mb-2">ROTATE_FOR_TRANSMISSION</h2>
                <p className="text-[8px] opacity-40 uppercase tracking-tight">Signal console requires landscape orientation for optimal neural sync.</p>
              </div>
            )}
            
            <DJMixerPlayer 
              isMobile={isMobile}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPlayPause={togglePlay}
              onNext={playNext}
              onPrev={playPrev}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              volume={volume}
              onVolumeChange={setVolume}
              station={activeStation}
              isBroadcaster={activeStation?.artistUserId === currentUserId}
              onClose={() => setShowMixer(false)}
              chatMessages={stationChat}
              requests={stationQueue}
              tracks={tracks}
              libraryTracks={libraryTracks}
              userPlaylists={playlists}
              onLike={onLike}
              onPurchase={onPurchase}
              onPlayPlaylist={onPlayPlaylist}
              onFetchPlaylistTracks={handleFetchPlaylistTracks}
              onPlaybackRateChange={handlePlaybackRateChange}
              onEqA={onEqA}
              analyserA={analyserA}
              keyLockA={keyLockA}
              onKeyLockAChange={setKeyLockA}
              setTracks={setTracks}
              setCurrentTrackIndex={setCurrentTrackIndex}
              onPlayTrack={(track) => {
                const tId = track.id || track.Id;
                const rawSource = track.source || track.Source || track.filePath || track.FilePath || "";
                const pureYtId = getGlobalYoutubeId(track);
                const isYoutube = !!pureYtId;
                const sourceStr = isYoutube ? `youtube:${pureYtId}` : (rawSource || "");
                const enriched = {
                  ...track,
                  id: tId,
                  source: isYoutube ? sourceStr : (rawSource ? (rawSource.startsWith('http') ? rawSource : getMediaUrl(rawSource)) : null),
                  isLiked: isYoutube ? likedYoutubeIds.has(pureYtId) : (track.isLiked || track.IsLiked),
                  isOwned: true,
                  isLocked: false
                };
                setTracks([enriched]);
                setCurrentTrackIndex(0);
                setIsPlaying(true);
                if (isYoutube) setIsYoutubeMode(true);
              }}
            />
            
            {/* Close Mixer Toggle */}
            <button 
              onClick={() => setShowMixer(false)}
              className="fixed top-6 right-6 z-[2001] w-10 h-10 bg-black/40 border border-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center rounded-full backdrop-blur-md"
            >
              <X size={18} />
            </button>
          </motion.div>
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
const Dashboard = React.memo(({ 
  keyLockA,
  setKeyLockA,
  activeView,
  setView,
  onLogout, 
  currentTrackIndex, 
  setCurrentTrackIndex, 
  setTracks,
  isPlaying, 
  setIsPlaying, 
  user, 
  tracks, 
  libraryTracks, 
  togglePlay, 
  handleNext, 
  handlePrev, 
  handlePlayPlaylist, 
  onQueueTrack,
  onPurchase, 
  onDownload, 
  onLike, 
  onCache, 
  onAddCredits, 
  onRefreshProfile, 
  onRefreshTracks, 
  currentTime, 
  duration, 
  onSeek, 
  globalStats, 
  hasNewMessages, 
  navigateToProfile, 
  viewingUserId, 
  likedYoutubeIds, 
  subscription, 
  cachedTrackIds, 
  playlists, 
  onRefreshPlaylists, 
  redirectTrigger, 
  setRedirectTrigger, 
  profileInitialModal, 
  setProfileInitialModal, 
  favoriteStations, 
  liveStations, 
  activeStation, 
  stationChat, 
  stationQueue, 
  onExitProfile, 
  activeMessageUser, 
  setActiveMessageUser, 
  isMuted, 
  onToggleMute, 
  followedCommunities, 
  onFollowUpdate, 
  setActiveStation, 
  sendMessage, 
  requestTrack, 
  setUser, 
  setShowGlobalGoLive,
  setShowGlobalUpload,
  setShowGlobalIngest,
  setIngestMode,
  onExpandContent,
  volume,
  setVolume,
  isMiniPlayerMinimized,
  setIsMiniPlayerMinimized,
  onFetchPlaylistTracks,
  onPlaybackRateChange,
  onEqA,
  analyserA,
  isLandscape
}) => {
  const { t } = useLanguage();
  const currentTrack = currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar when leaving Discovery view
  useEffect(() => {
    if (activeView !== 'discovery') {
      setIsSidebarCollapsed(true);
    }
  }, [activeView]);

  const handleNav = (viewName, isProfile = false, userId = null) => {
    setIsSidebarCollapsed(true);
    if (isProfile) {
      navigateToProfile(userId);
    } else {
      setView(viewName);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (activeView === 'profile') {
      // Profile handles its own theme via onThemeChange
    } else {
      root.style.setProperty('--theme-color', '#ff006e');
      root.style.setProperty('--theme-color-rgb', '255, 0, 110');
      root.style.setProperty('--text-color', '#ff006e');
      root.style.setProperty('--text-color-rgb', '255, 0, 110');
    }
  }, [activeView]);

  const handleProfileThemeChange = (hex) => {
    if (activeView !== 'profile') return;
    const root = document.documentElement;
    root.style.setProperty('--theme-color', hex);
    root.style.setProperty('--text-color', hex);
    
    // Simple RGB conversion
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (!isNaN(r)) {
      root.style.setProperty('--theme-color-rgb', `${r}, ${g}, ${b}`);
      root.style.setProperty('--text-color-rgb', `${r}, ${g}, ${b}`);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden relative bg-black bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#1a1a1a] via-[#050505] to-[#000000]">
      {/* Global Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0" />

      {/* SIDEBAR (Escritorio) */}
      <motion.aside 
        layout
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className={`hidden lg:flex flex-col border-r border-white/5 bg-black/20 backdrop-blur-2xl z-30 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)] ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div
          className={`cursor-pointer flex flex-col justify-center items-center transition-all group ${isSidebarCollapsed ? 'p-4' : 'p-6'}`}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          <div 
            className={`relative transition-all duration-500 flex items-center justify-center animate-subsystem-pulse ${isSidebarCollapsed ? 'w-10 h-10 p-1' : 'w-20 h-20 p-2'}`}
            style={{ 
              boxShadow: `0 0 15px rgba(var(--theme-color-rgb), 0.25)`,
              borderRadius: '4px',
              border: `1px solid rgba(var(--theme-color-rgb), 0.3)`,
              background: `rgba(0, 0, 0, 0.15)`
            }}
          >
            {/* The Tinted Skull System */}
            <div className={`relative w-full h-full flex items-center justify-center`}>
              <img
                src={skullImg}
                alt="System Kernel"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ 
                  filter: 'grayscale(1) brightness(8) contrast(1.5)', 
                }}
              />
              {/* Theme Color Multiply Layer */}
              <div 
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ 
                  backgroundColor: 'var(--theme-color)',
                  mixBlendMode: 'multiply',
                  opacity: 0.95
                }}
              />
            </div>
          </div>
          
          {/* Ambient Glow - Resizes to stay within sidebar boundaries */}
          <div 
            className="absolute pointer-events-none transition-all duration-1000 rounded-full"
            style={{ 
              backgroundColor: 'var(--theme-color)',
              opacity: 0.15,
              filter: 'blur(20px)',
              transform: 'scale(1.15)',
              zIndex: -1,
              width: isSidebarCollapsed ? '60px' : '100px',
              height: isSidebarCollapsed ? '60px' : '100px'
            }}
          />
        </div>

        <nav className="flex-1 space-y-3 p-4">
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Radio size={isSidebarCollapsed ? 18 : 22} />} label={t('DSC_SCAN')} active={activeView === 'discovery'} onClick={() => handleNav('discovery')} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Hash size={isSidebarCollapsed ? 18 : 22} />} label={t('FEED_LNK')} active={activeView === 'feed'} onClick={() => handleNav('feed')} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<User size={isSidebarCollapsed ? 18 : 22} />} label={t('USR_LINK')} active={activeView === 'profile' && (!viewingUserId || String(viewingUserId) === String(user?.id || user?.Id))} onClick={() => handleNav('profile', true)} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Play size={isSidebarCollapsed ? 18 : 22} />} label={t('PLY_CORE')} active={activeView === 'player'} onClick={() => handleNav('player')} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<MessageSquare size={isSidebarCollapsed ? 18 : 22} />} label={t('MSG_SYNC')} active={activeView === 'messages'} onClick={() => handleNav('messages')} hasNotification={hasNewMessages} />
          <SidebarLink collapsed={isSidebarCollapsed} icon={<ShoppingBag size={isSidebarCollapsed ? 18 : 22} />} label={t('SHOP_LNK')} active={activeView === 'shopping'} onClick={() => handleNav('shopping')} />

          <div className="my-6 border-t border-white/5 opacity-50" />
          {/* <SidebarLink collapsed={isSidebarCollapsed} icon={<Wallet size={isSidebarCollapsed ? 18 : 22} />} label={t('WAL_BASE')} active={activeView === 'wallet'} onClick={() => handleNav('wallet')} /> */}
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Settings size={isSidebarCollapsed ? 18 : 22} />} label={t('SYS_CONF')} active={activeView === 'settings'} onClick={() => handleNav('settings')} />
        </nav>

        <div className={`p-6 ${isSidebarCollapsed ? 'text-center' : 'text-left'}`}>
          <button onClick={onLogout} className="text-[10px] text-[var(--theme-color)]/30 hover:text-[var(--theme-color)] uppercase tracking-widest font-bold">
            {isSidebarCollapsed ? <LogOut size={20} /> : t('LOGOUT_SYS')}
          </button>
        </div>
      </motion.aside>

      {/* ÁREA DE CONTENIDO DINÁMICO */}
      <motion.main 
        layout
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden z-10"
      >
        {/* TOP NAV (Móvil) */}
        <header className="lg:hidden flex items-center justify-center p-4 border-b border-[var(--theme-color)]/10 bg-black/90 backdrop-blur-md z-40 relative">
          <div className="flex gap-2">
            <NavButton icon={<Radio size={20} />} active={activeView === 'discovery'} onClick={() => setView('discovery')} />
            <NavButton icon={<Hash size={20} />} active={activeView === 'feed'} onClick={() => setView('feed')} />
            <NavButton icon={<Play size={20} />} active={activeView === 'player'} onClick={() => setView('player')} />
            <NavButton icon={<ShoppingBag size={20} />} active={activeView === 'shopping'} onClick={() => setView('shopping')} />
            <NavButton icon={<MessageSquare size={20} />} active={activeView === 'messages'} onClick={() => setView('messages')} hasNotification={hasNewMessages} />
            <NavButton icon={<User size={20} />} active={activeView === 'profile' && (!viewingUserId || String(viewingUserId) === String(user?.id || user?.Id))} onClick={() => navigateToProfile(null)} />
            <NavButton icon={<Settings size={20} />} active={activeView === 'settings'} onClick={() => setView('settings')} />
          </div>
        </header>

        <div className={`flex-1 relative ${activeView === 'discovery' ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar pb-24'}`}>
          <AnimatePresence mode="wait" initial={false}>
            {activeView === 'discovery' && (
              <motion.div
                key="discovery-wrapper"
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full h-full"
              >
                <DiscoveryHUD
                  key="discovery"
                  user={user}
                  setView={setView}
                  isLandscape={isLandscape}
                  followedCommunities={followedCommunities}
                  onFollowUpdate={() => {
                    const updated = API.Communities.getFollowed();
                    setFollowedCommunities(updated);
                  }}
                  navigateToProfile={navigateToProfile}
                  onMessageCommunity={(c) => { setActiveMessageUser({...c, isCommunity: true}); setView('messages'); }}
                  onPlayTrack={(track) => {
                    const tId = track.id || track.Id;
                    const rawSource = track.source || track.Source || track.filePath || track.FilePath || "";
                    
                    // Unified YouTube Resolution
                    const pureYtId = getGlobalYoutubeId(track);
                    const isYoutube = !!pureYtId;
                    const sourceStr = isYoutube ? `youtube:${pureYtId}` : (rawSource || "");

                    // --- DEEP RECONCILIATION: Inherit State from Library ---
                    const libraryMatch = libraryTracks.find(lt => 
                      String(lt.id || lt.Id) === String(tId) || 
                      (lt.source && lt.source === sourceStr)
                    );

                    const isLiked = isYoutube 
                      ? likedYoutubeIds.has(pureYtId) 
                      : (libraryMatch ? libraryMatch.isLiked : (track.isLiked || track.IsLiked));
                    
                    const isOwned = (libraryMatch ? libraryMatch.isOwned : track.isOwned) || true;

                    const rawCover = track.coverImageUrl || track.CoverImageUrl || track.imageUrl || track.ImageUrl || track.thumbnailUrl || track.ThumbnailUrl || track.cover || track.Cover || libraryMatch?.cover;

                    const enriched = {
                      ...track,
                      id: tId,
                      source: isYoutube ? sourceStr : (rawSource ? (rawSource.startsWith('http') ? rawSource : getMediaUrl(rawSource)) : null),
                      cover: isYoutube ? (rawCover || `https://img.youtube.com/vi/${pureYtId}/hqdefault.jpg`) : (rawCover ? (rawCover.startsWith('http') ? rawCover : getMediaUrl(rawCover)) : null),
                      isLiked,
                      isOwned,
                      isLocked: false
                    };
                    
                    setTracks([enriched]);
                    setCurrentTrackIndex(0);
                    setIsPlaying(true);
                    if (isYoutube) setIsYoutubeMode(true);
                  }}
                  onPlayPlaylist={(list, startIdx = 0) => handlePlayPlaylist(list, startIdx, false)}
                  onExpandContent={onExpandContent}
                  setUser={setUser}
                  onPlayStation={(station) => {
                    setActiveStation(station);
                    joinStation(station.id || station.Id);
                    showNotification({ 
                      title: 'RADIO_LINK_ESTABLISHED', 
                      message: `SIGNAL_LOCKED: ${station.name}`, 
                      type: 'success' 
                    });
                  }}
                  isPlayerActive={currentTrackIndex >= 0 && !isMiniPlayerMinimized}
                  setShowGlobalIngest={setShowGlobalIngest}
                  setIngestMode={setIngestMode}
                />
              </motion.div>
            )}
            {activeView === 'shopping' && (
              <motion.div
                key="shopping-wrapper"
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full h-full"
              >
                <React.Suspense fallback={<div className="w-full h-full bg-black animate-pulse" />}>
                  <ShoppingView />
                </React.Suspense>
              </motion.div>
            )}
            {activeView === 'wallet' && <WalletView user={user} onRefreshProfile={onRefreshProfile} />}
            {activeView === 'settings' && (
              <motion.div
                key="settings-wrapper"
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full h-full"
              >
                <SettingsView user={user} setUser={setUser} />
              </motion.div>
            )}
            {activeView === 'feed' && (
              <motion.div
                key="feed-wrapper"
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full h-full"
              >
                <FeedContent 
                  key="feed" 
                  setView={setView} 
                  isLandscape={isLandscape}
                  onPlayPlaylist={handlePlayPlaylist} 
                  navigateToProfile={navigateToProfile} 
                  user={user} 
                  favoriteStations={favoriteStations} 
                  liveStations={liveStations} 
                  setActiveStation={setActiveStation} 
                  activeStation={activeStation} 
                  stationChat={stationChat} 
                  stationQueue={stationQueue} 
                  followedCommunities={followedCommunities} 
                  setShowGlobalGoLive={setShowGlobalGoLive}
                  setShowGlobalUpload={setShowGlobalUpload}
                  setShowGlobalIngest={setShowGlobalIngest}
                  onExpandContent={onExpandContent}
                  libraryTracks={libraryTracks}
                />
              </motion.div>
             )}
            {activeView === 'profile' && (
              <motion.div
                key={viewingUserId || 'me'}
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full h-full"
              >
                  <ProfileView
                    key={viewingUserId || 'me'}
                    targetUserId={viewingUserId}
                    user={user}
                    isLandscape={isLandscape}
                    tracks={tracks}
                    currentTrack={currentTrack}
                    setTracks={setTracks}
                  onLogout={onLogout}
                  onAddCredits={onAddCredits}
                  setUser={setUser}
                  onRefreshProfile={onRefreshProfile}
                  onRefreshTracks={onRefreshTracks}
                  onLike={onLike}
                  navigateToProfile={navigateToProfile}
                  onPlayPlaylist={handlePlayPlaylist}
                  onPlayTrack={(track) => {
                    const tId = track.id || track.Id;
                    const rawSource = track.source || track.Source || track.filePath || track.FilePath || "";
                    const pureYtId = getGlobalYoutubeId(track);
                    const isYoutube = !!pureYtId;
                    const sourceStr = isYoutube ? `youtube:${pureYtId}` : (rawSource || "");
                    const enriched = {
                      ...track,
                      id: tId,
                      source: isYoutube ? sourceStr : (rawSource ? (rawSource.startsWith('http') ? rawSource : getMediaUrl(rawSource)) : null),
                      isLiked: isYoutube ? likedYoutubeIds.has(pureYtId) : (track.isLiked || track.IsLiked),
                      isOwned: true,
                      isLocked: false
                    };
                    setTracks([enriched]);
                    setCurrentTrackIndex(0);
                    setIsPlaying(true);
                    if (isYoutube) setIsYoutubeMode(true);
                  }}
                  activeStation={activeStation}
                  stationChat={stationChat}
                  stationQueue={stationQueue}
                  isPlaying={isPlaying}
                  onExitProfile={() => setView('discovery')}
                  onMessageUser={(u) => { setActiveMessageUser(u); setView('messages'); }}
                  setActiveStation={setActiveStation}
                  setShowGlobalGoLive={setShowGlobalGoLive}
                  setShowGlobalUpload={setShowGlobalUpload}
                  setShowGlobalIngest={setShowGlobalIngest}
                  onExpandContent={onExpandContent}
                  onThemeChange={handleProfileThemeChange}
                  hasMiniPlayer={currentTrackIndex >= 0}
                />
              </motion.div>
            )}
            {activeView === 'player' && (
              <motion.div
                key="player-wrapper"
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full h-full"
              >
                <PlayerContent
                  initialScreen={redirectTrigger ? 'NOW_PLAYING' : 'MAIN'}
                  forceNowPlaying={redirectTrigger}
                  setView={setView}
                  currentTrackIndex={currentTrackIndex}
                  setCurrentTrackIndex={setCurrentTrackIndex}
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  tracks={tracks}
                  setTracks={setTracks}
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
                  isLandscape={isLandscape}
                  togglePlay={togglePlay}
                  navigateToProfile={navigateToProfile}
                  onPlayPlaylist={handlePlayPlaylist}
                  libraryTracks={libraryTracks}
                  activeStation={activeStation}
                  stationChat={stationChat}
                  stationQueue={stationQueue}
                  onSendMessage={sendMessage}
                  onRequestTrack={requestTrack}
                  volume={volume}
                  setVolume={setVolume}
                  userPlaylists={playlists}
                  onFetchPlaylistTracks={onFetchPlaylistTracks}
                  onPlaybackRateChange={onPlaybackRateChange}
                  onEqA={onEqA}
                  analyserA={analyserA}
                  keyLockA={keyLockA}
                  setKeyLockA={setKeyLockA}
                />
              </motion.div>
            )}
            {activeView === 'messages' && <MessagesView key="messages" user={user} navigateToProfile={navigateToProfile} initialChatUser={activeMessageUser} />}

          </AnimatePresence>
        </div>
      </motion.main>



      {/* MINI PLAYER (Todas las vistas excepto Player, y solo si hay track) */}
      <AnimatePresence>
        {activeView !== 'player' && currentTrackIndex >= 0 && (
          // Hide mini player on mobile if viewing profile to avoid crowding
          !(window.innerWidth < 1024 && activeView === 'profile') && (
            <MiniPlayer
              key={isMiniPlayerMinimized ? 'minimized' : 'expanded'}
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
              currentTime={currentTime}
              duration={duration}
              isSidebarCollapsed={isSidebarCollapsed}
              volume={volume}
              setVolume={setVolume}
              isMinimized={isMiniPlayerMinimized}
              onToggleMinimize={() => {
                const newState = !isMiniPlayerMinimized;
                setIsMiniPlayerMinimized(newState);
                localStorage.setItem('isMiniPlayerMinimized', newState);
              }}
              onOpenMixer={() => {
                initAudioCtx();
                if (audioCtx.current?.state === 'suspended') {
                  audioCtx.current.resume();
                }
                setShowMixer(true);
              }}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
});

// --- MINI PLAYER COMPONENT ---
const MiniPlayer = ({ track, isPlaying, onTogglePlay, onNext, onPrev, onLike, onExpand, activeView, isMuted, onToggleMute, currentTime, duration, isSidebarCollapsed, volume, setVolume, isMinimized, onToggleMinimize, isBroadcasting, onOpenMixer }) => {
  const isMessages = activeView === 'messages';

  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className={`fixed bottom-0 lg:bottom-4 right-0 lg:right-4 p-4 lg:p-2 cursor-pointer group/min z-[100] transition-all`}
        onClick={onToggleMinimize}
        title="EXPAND_PLAYER"
      >
        {/* Subtle HUD bracket holding the crosshair */}
        <div className="absolute bottom-2 right-2 lg:bottom-1 lg:right-1 w-4 h-4 border-b border-r border-[#ff006e]/20 group-hover/min:border-[#ff006e]/60 transition-colors pointer-events-none" />
        
        {/* The minimal plus crosshair */}
        <Plus size={16} strokeWidth={2.5} className="relative z-10 text-[#ff006e]/40 group-hover/min:text-[#ff006e] group-hover/min:drop-shadow-[0_0_8px_#ff006e] transition-all group-active/min:scale-90" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`fixed bottom-0 lg:bottom-4 transition-[left] duration-500 left-0 right-0 ${isSidebarCollapsed ? 'lg:left-[6rem]' : 'lg:left-[17rem]'} lg:right-4 backdrop-blur-3xl p-1.5 lg:p-3 pb-3 lg:pb-3 flex items-center gap-3 z-[100] ${isMessages
        ? 'bg-black/95 border-t border-white/5 lg:border lg:rounded-sm lg:shadow-none'
        : 'bg-[#020202]/95 border-t border-white/5 lg:border-white/5 lg:rounded-md shadow-[0_-15px_50px_rgba(0,0,0,0.8)] lg:shadow-[0_10px_60px_-15px_rgba(255,0,110,0.15)]'
        } group/player overflow-hidden`}
    >
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-fixed mix-blend-screen" />

      {/* Cyberpunk HUD Corner Brackets (Desktop) */}
      <div className="hidden lg:block absolute top-0 left-0 w-3 h-3 border-t border-l border-[#ff006e]/40 pointer-events-none" />
      <div className="hidden lg:block absolute top-0 right-0 w-3 h-3 border-t border-r border-[#ff006e]/40 pointer-events-none" />
      <div className="hidden lg:block absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#ff006e]/40 pointer-events-none" />
      <div className="hidden lg:block absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#ff006e]/40 pointer-events-none" />

      {/* --- MINIMIZE TOGGLE (Top Right) --- */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}
        className="absolute top-1 right-2 z-50 p-1 text-white/20 hover:text-[#ff006e] transition-all group/minitoggle scale-75 lg:scale-100"
        title="MINIMIZE_PLAYER"
      >
        <Minus size={14} className="group-hover/minitoggle:translate-y-0.5 transition-transform" />
      </button>

      {/* Track Info (Click to expand) */}
      <div className="flex items-center gap-3 lg:gap-4 flex-1 cursor-pointer group/info min-w-0 z-10 relative" onClick={onExpand}>
        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-sm border flex items-center justify-center relative overflow-hidden shrink-0 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.5)] ${isMessages ? 'bg-black border-white/5' : 'bg-[#0a0a0a] border-white/10 group-hover/info:border-[#ff006e]/50 group-hover/info:shadow-[0_0_20px_rgba(255,0,110,0.2)]'}`}>
          {track?.cover || track?.thumbnail ? (
            <img src={track.cover || track.thumbnail} alt="Cover" className="w-full h-full object-cover filter brightness-[0.7] contrast-[1.2] saturate-[0.8] group-hover/info:filter-none transition-all duration-500 z-10 relative" />
          ) : (
            <Music size={18} className={`transition-all duration-500 z-10 relative ${isMessages ? 'text-white/50' : 'text-[#ff006e]/40 group-hover/info:text-[#ff006e] group-hover/info:drop-shadow-[0_0_8px_#ff006e]'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col justify-center gap-0.5">
          <h4 className={`text-[11px] lg:text-[13px] font-black uppercase truncate transition-colors leading-none tracking-wide ${isMessages ? 'text-white' : 'text-white group-hover/info:text-transparent group-hover/info:bg-clip-text group-hover/info:bg-gradient-to-r group-hover/info:from-white group-hover/info:to-[#ff006e]'}`}>{track?.title || 'No Track'}</h4>
          <p className={`text-[9px] lg:text-[10px] font-bold uppercase truncate tracking-widest leading-none ${isMessages ? 'text-white/40' : 'text-[#ff006e]/50 group-hover/info:text-[#ff006e]/90'}`}>{track?.artist || 'Unknown'}</p>
        </div>
      </div>

      {/* Controls - Hollow Geometric Grid */}
      <div className="flex items-center gap-4 lg:gap-8 px-2 lg:px-6 shrink-0 z-10 relative">
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="text-white/30 hover:text-white hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all">
          <SkipBack size={18} fill="currentColor" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className={`w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-sm border transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.4)] ${isMessages 
            ? 'bg-transparent border-white/20 text-white hover:border-white/60' 
            : 'bg-black/60 border-white/10 text-[#ff006e] hover:bg-[#ff006e]/10 hover:border-[#ff006e]/50 hover:shadow-[0_0_20px_rgba(255,0,110,0.2)]'}`}
        >
          {isPlaying ? (
            <Pause size={18} fill="currentColor" className="drop-shadow-[0_0_8px_currentColor]" />
          ) : (
            <Play size={18} fill="currentColor" className="drop-shadow-[0_0_8px_currentColor]" />
          )}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-white/30 hover:text-white hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all">
          <SkipForward size={18} fill="currentColor" />
        </button>

        {isBroadcasting && (
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenMixer(); }}
            className="ml-2 p-2 bg-[#ff006e]/10 border border-[#ff006e]/30 text-[#ff006e] rounded-sm hover:bg-[#ff006e] hover:text-black transition-all shadow-[0_0_15px_rgba(255,0,110,0.2)]"
            title="OPEN_MIXER_CONSOLE"
          >
            <Radio size={16} className="animate-pulse" />
          </button>
        )}
      </div>

      {/* Extra Actions - Desktop/Side Panel */}
      <div className={`flex items-center gap-5 lg:gap-8 px-4 lg:pl-8 z-10 relative`}>
        <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        
        <button
          className="group/tip relative w-8 h-8 flex items-center justify-center rounded-sm bg-black border border-white/10 hover:border-[#00ff00]/60 transition-all duration-300 font-mono font-black overflow-hidden shadow-lg"
          title="Tip Artist"
          onClick={(e) => { e.stopPropagation(); /* Future Stripe Integration */ alert("Tip functionality initializing..."); }}
        >
          <div className="absolute inset-0 bg-[#00ff00]/10 opacity-0 group-hover/tip:opacity-100 transition-opacity" />
          <span className="text-white/40 group-hover/tip:text-[#00ff00] group-hover/tip:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all relative z-10 text-xs pl-0.5">$</span>
        </button>

        <Heart
          size={18}
          className={`cursor-pointer transition-all duration-300 ${track?.isLiked ? 'text-[#ff006e] fill-[#ff006e] drop-shadow-[0_0_8px_rgba(255,0,110,0.8)]' : 'text-white/20 hover:text-[#ff006e] hover:drop-shadow-[0_0_8px_rgba(255,0,110,0.5)]'}`}
          onClick={(e) => { e.stopPropagation(); onLike && onLike(track); }}
        />

        <div className="flex items-center gap-3 group/vol pr-2 relative">
          <div onClick={(e) => { e.stopPropagation(); onToggleMute && onToggleMute(); }} className="cursor-pointer py-2">
            {isMuted || volume === 0 ? (
              <VolumeX size={18} className="text-[#ff006e] drop-shadow-[0_0_8px_rgba(255,0,110,0.5)]" />
            ) : (
              <Volume2 size={18} className="text-white/30 group-hover/vol:text-[#ff006e] group-hover/vol:drop-shadow-[0_0_8px_rgba(255,0,110,0.6)] transition-all duration-300" />
            )}
          </div>
          <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-500 ease-in-out opacity-0 group-hover/vol:opacity-100 flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : (volume || 0)}
              onChange={(e) => { 
                e.stopPropagation(); 
                const newVol = parseFloat(e.target.value);
                setVolume && setVolume(newVol); 
                if (newVol > 0 && isMuted) { onToggleMute && onToggleMute(); } 
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-[3px] bg-white/10 rounded-full appearance-none cursor-pointer accent-[#ff006e] outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- RECURSIVE COMMENT NODE ---
const CommentNode = ({ comment, depth = 0, setReplyingToComment, onDelete, currentUserId, user }) => {
  const resolvedUserId = getUserId(comment);
  const isOwner = (resolvedUserId && currentUserId && String(resolvedUserId) === String(currentUserId)) ||
    (String(comment.Username || comment.username || "").toLowerCase() === String(user?.username || user?.Username || "").toLowerCase() && (comment.Username || comment.username));
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef(null);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowActions(prev => !prev);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  return (
    <div className={`group/node relative ${depth > 0 ? 'ml-3 sm:ml-6 mt-3 sm:mt-4 pl-3 sm:pl-4 border-l border-[#ff006e]/20' : ''}`}>
      {depth > 0 && (
        <div className="absolute top-5 left-0 w-2 sm:w-4 h-[1px] bg-[#ff006e]/20 -translate-x-full" />
      )}

      <div className="space-y-3">
        <div
          onClick={() => !showActions && setReplyingToComment(comment)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={(e) => { e.preventDefault(); setShowActions(!showActions); }}
          className="group/comment relative cursor-pointer active:opacity-70 transition-opacity"
        >
          <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-[7px] font-mono text-white/30 uppercase mb-1">
            <span className={depth > 0 ? 'text-[#00ffff]' : 'text-[#ff006e] font-black'}>
              [PKT_{hashStr(comment.Id).toString().substr(0, 4)}]
              {depth > 0 && '_RE'}
              {isOwner && <span className="text-[#00ff00] ml-1 opacity-80 brightness-125 select-none">[OWNER]</span>}
            </span>
            {comment.IsOperator && (
              <span className="text-amber-400 font-bold bg-amber-400/10 px-1 border border-amber-400/20 animate-pulse">
                [V_OPERATOR]
              </span>
            )}
            <span>SIG: 100%</span>
            <span>SRC: {comment.Username}</span>
            <div className="ml-auto flex items-center gap-3">
              {(isOwner && (showActions || window.innerWidth >= 640)) && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete && onDelete(comment.Id); }}
                  className="text-red-500 hover:text-red-500 transition-colors opacity-100 font-black animate-pulse"
                >
                  [ DISPOSE ]
                </button>
              )}
              {(showActions || window.innerWidth >= 640) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setReplyingToComment(comment); }}
                  className="text-[#ff006e] hover:text-white transition-colors opacity-100 font-black"
                >
                  [ REPLY ]
                </button>
              )}
            </div>
          </div>

          <div className={`border bg-black/40 group-hover/comment:border-[#ff006e]/40 transition-colors p-3 relative ${comment.IsOperator ? 'border-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.05)]' : 'border-white/10'}`}>
            <div className="absolute top-0 right-0 p-1 text-[7px] text-white/10 tabular-nums">
              {new Date(comment.CreatedAt).toLocaleTimeString('en-GB', { hour12: false })}
            </div>
            <p className={`text-[10px] leading-relaxed font-mono whitespace-pre-wrap ${comment.IsOperator ? 'text-amber-100/90' : 'text-white/80'}`}>
              {comment.Content}
            </p>
          </div>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-4">
            {comment.replies.map(r => (
              <CommentNode
                key={r.Id}
                comment={r}
                depth={depth + 1}
                setReplyingToComment={setReplyingToComment}
                onDelete={onDelete}
                currentUserId={currentUserId}
                user={user}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


// --- CONTENIDO: FEED (3 COLUMNAS) ---
const FeedContent = React.memo(({ 
  setView, 
  onPlayPlaylist, 
  navigateToProfile, 
  user, 
  isLandscape,
  favoriteStations, 
  liveStations, 
  setActiveStation, 
  activeStation, 
  stationChat, 
  stationQueue, 
  followedCommunities, 
  setShowGlobalGoLive,
  setShowGlobalUpload,
  setShowGlobalIngest,
  onExpandContent,
  libraryTracks
}) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [allCommunities, setAllCommunities] = useState([]);
  // Mobile slide-up panel
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState('filters'); // 'filters' | 'favorites' | 'stations'

  useEffect(() => {
    API.Communities.getAll().then(res => setAllCommunities(res.data || [])).catch(() => { });
  }, []);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await API.Feed.getGlobalFeed();
      // Normalize all social counts and properties for consistent rendering
      const normalizedFeed = (res.data || []).map(item => ({
        ...item,
        Id: item.id || item.Id,
        CommentCount: item.commentCount ?? item.CommentCount ?? 0,
        LikeCount: item.likeCount ?? item.LikeCount ?? 0,
        RepostCount: item.repostCount ?? item.RepostCount ?? 0,
        IsLiked: item.isLiked ?? item.IsLiked ?? false,
        IsReposted: item.isReposted ?? item.IsReposted ?? false,
        Type: (item.type || item.Type || "").toLowerCase(),
        Artist: item.artist || item.Artist,
        Title: item.title || item.Title,
        Content: item.content || item.Content,
        CreatedAt: item.createdAt || item.CreatedAt,
        ImageUrl: item.imageUrl || item.ImageUrl,
        MediaType: (item.mediaType || item.MediaType || "").toUpperCase(),
        ThumbnailUrl: item.thumbnailUrl || item.ThumbnailUrl,
      }));
      setFeed(normalizedFeed);
    } catch (e) {
      console.error("Feed error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleTrackPlay = (clickedItem) => {
    console.log("[FEED_SIGNAL] INTERCEPTED_TRACK_PLAY_REQUEST:", clickedItem?.Id || clickedItem?.id || clickedItem?.Title || "UNKNOWN");
    if (!clickedItem) return;

    // 1. Identify all track items in the feed for playlist continuity
    const trackFeedItems = feed.filter(item => (item.Type || item.type || "").toLowerCase() === 'track');
    
    const resolveSource = (t) => {
      const raw = t.source || t.Source || t.filePath || t.FilePath || "";
      const pureYtId = getGlobalYoutubeId(t);
      if (pureYtId) return `youtube:${pureYtId}`;
      if (raw) return raw.startsWith('http') ? raw : getMediaUrl(raw);
      return null;
    };

    const playlist = trackFeedItems.map(item => {
      const tId = item.trackId || item.TrackId || item.ItemId || item.itemId;
      const resolvedSrc = resolveSource(item);
      const isYoutube = resolvedSrc?.startsWith('youtube:');
      const pureYtId = isYoutube ? resolvedSrc.split(':')[1] : null;

      // Deep reconciliation with library state
      const libMatch = libraryTracks.find(lt => String(lt.id || lt.Id) === String(tId));

      return {
        ...item,
        id: tId,
        dbId: tId,
        title: item.Title || item.title,
        artist: item.Artist || item.artist,
        source: resolvedSrc,
        cover: isYoutube 
          ? (item.imageUrl || item.ImageUrl || `https://img.youtube.com/vi/${pureYtId}/hqdefault.jpg`) 
          : getMediaUrl(item.ImageUrl || item.imageUrl),
        isLiked: libMatch ? libMatch.isLiked : (item.IsLiked || item.isLiked),
        isOwned: libMatch ? libMatch.isOwned : true,
        isLocked: false
      };
    }).filter(t => t.source);

    // 2. Find starting index
    const targetTrackId = clickedItem.trackId || clickedItem.TrackId || clickedItem.ItemId || clickedItem.itemId;
    let startIndex = playlist.findIndex(t => String(t.dbId) === String(targetTrackId));

    if (startIndex !== -1 && onPlayPlaylist) {
      onPlayPlaylist(playlist, startIndex);
    } else {
      // Fallback: Just play this one track if playlist logic fails
      const resolvedSrc = resolveSource(clickedItem);
      if (resolvedSrc && onPlayPlaylist) {
        const singleTrack = {
          ...clickedItem,
          id: targetTrackId,
          dbId: targetTrackId,
          title: clickedItem.Title || clickedItem.title,
          artist: clickedItem.Artist || clickedItem.artist,
          source: resolvedSrc,
          cover: getMediaUrl(clickedItem.ImageUrl || clickedItem.imageUrl),
          isOwned: true,
          isLocked: false
        };
        onPlayPlaylist([singleTrack], 0);
      }
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
    onExpandContent({
      ...item,
      Url: item.ImageUrl || item.Url,
      Title: item.Title,
      Content: item.Content
    }, (item.mediaType || item.MediaType || item.Type || '').toUpperCase());
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
      setReplyingToComment(null);
      const fetchComments = async () => {
        setLoadingComments(true);
        try {
          const type = replyingTo.Type;
          const itemId = replyingTo.ItemId || replyingTo.itemId;
          const { data } = await API.Social.getFeedComments(type, itemId);

          // Helper to organize comments into a tree
          const organizeThreads = (rawList) => {
            const map = {};
            const roots = [];

            // First pass: normalize and map using string keys for robust matching
            rawList.forEach(c => {
              const id = String(c.id || c.Id);
              const normalized = {
                ...c,
                Id: id,
                UserId: getUserId(c),
                ParentId: c.parentId || c.ParentId ? String(c.parentId || c.ParentId) : null,
                Username: c.username || c.Username,
                Content: c.content || c.Content,
                CreatedAt: c.createdAt || c.CreatedAt,
                IsOperator: c.isOperator ?? c.IsOperator ?? false,
                replies: []
              };
              map[id] = normalized;
            });

            // Second pass: link children
            Object.values(map).forEach(c => {
              const pid = c.ParentId;
              if (pid && map[pid]) {
                map[pid].replies.push(c);
              } else {
                roots.push(c);
              }
            });

            // Sort by date (oldest first for chronological stream)
            const sortByDate = (a, b) => new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime();
            roots.sort(sortByDate);

            // Recursive sort for replies
            const sortDeep = (node) => {
              if (node.replies) {
                node.replies.sort(sortByDate);
                node.replies.forEach(sortDeep);
              }
            };
            roots.forEach(sortDeep);

            return roots;
          };

          const organized = organizeThreads(data || []);
          setComments(organized);

          // Update the main feed count to ensure accuracy
          setFeed(prev => prev.map(f =>
            f.Id === replyingTo.Id ? { ...f, CommentCount: (data || []).length } : f
          ));
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

      // Add to local comment list with correct nesting
      const newComment = {
        Id: String(data.id || data.Id || Date.now()),
        UserId: getUserId(user),
        Username: user?.Username || user?.username || "YOU",
        Content: commentText,
        CreatedAt: new Date().toISOString(),
        ParentId: replyingToComment ? String(replyingToComment.Id) : null,
        IsOperator: false,
        replies: []
      };

      setComments(prev => {
        if (!newComment.ParentId) return [...prev, newComment];

        const addToParent = (list) => list.map(c => {
          if (c.Id === newComment.ParentId) {
            return { ...c, replies: [...(c.replies || []), newComment] };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: addToParent(c.replies) };
          }
          return c;
        });
        return addToParent(prev);
      });
      setCommentText("");
      setReplyingToComment(null);
    } catch (e) {
      console.error("Comment failed", e);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("ARE_YOU_SURE_YOU_WANT_TO_DISPOSE_OF_THIS_SIGNAL_PACKET?")) return;
    try {
      await API.Social.deleteFeedComment(commentId);

      const removeRecursive = (list) => {
        return list.filter(c => String(c.Id) !== String(commentId)).map(c => ({
          ...c,
          replies: c.replies ? removeRecursive(c.replies) : []
        }));
      };
      setComments(prev => removeRecursive(prev));

      if (replyingTo) {
        setFeed(prev => prev.map(f =>
          f.Id === replyingTo.Id ? {
            ...f,
            CommentCount: Math.max(0, (f.CommentCount || 0) - 1)
          } : f
        ));
      }
    } catch (err) {
      console.error("Failed to delete signal", err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col lg:flex-row h-full font-mono relative">

      {/* Izquierda: Acciones */}
      <div className="hidden lg:block w-72 p-6 space-y-6 border-r border-[#ff006e]/5 relative z-20">
        <div className="bg-[#0a0a0a]/50 backdrop-blur-xl border border-[#ff006e]/20 rounded-lg overflow-hidden">
          <div className="p-3 bg-[#ff006e]/5 border-b border-[#ff006e]/10 flex justify-between items-center text-[10px] font-black uppercase text-white">:: TERMINAL_CMDS :: <ChevronDown size={14} /></div>
          <div className="p-4 space-y-1">
            <button onClick={() => setShowGlobalIngest(true)} className="w-full text-left p-2 text-[10px] text-[#ff006e]/80 hover:text-white hover:bg-[#ff006e10] transition-all uppercase tracking-widest">{`> NEW_POST`} </button>
            <button onClick={() => setShowGlobalUpload(true)} className="w-full text-left p-2 text-[10px] text-[#ff006e]/80 hover:text-white hover:bg-[#ff006e10] transition-all uppercase tracking-widest">{`> UPLOAD_TRACK`} </button>
          </div>
        </div>



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
            {(() => {
              const userCommId = user?.communityId || user?.CommunityId;
              const memberIdStr = userCommId ? String(userCommId) : null;
              const followedIds = (followedCommunities || []).map(id => String(id));
              const uniqueLinks = Array.from(new Set([
                ...(memberIdStr ? [memberIdStr] : []),
                ...followedIds
              ])).filter(Boolean);

              const sortedLinks = uniqueLinks.sort((a, b) => {
                if (a === memberIdStr) return -1;
                if (b === memberIdStr) return 1;
                return 0;
              });

              if (sortedLinks.length === 0) {
                return (
                  <div className="px-3 py-4 border border-dashed border-white/5 rounded text-center opacity-20">
                    <div className="text-[8px] uppercase">No Links Established</div>
                  </div>
                );
              }

              return sortedLinks.map((cid) => {
                const comm = allCommunities.find(c => String(c.id) === String(cid));
                if (!comm) return null;
                const sectorColor = SECTORS[comm.sectorId]?.color || '#ffffff';
                const isMemberBadge = String(cid) === memberIdStr;

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
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-1 h-1 rounded-full shadow-[0_0_5px_currentColor] shrink-0" style={{ backgroundColor: sectorColor, color: sectorColor }} />
                      <span className={`text-[9px] font-bold uppercase tracking-widest truncate ${String(selectedCommunityId) === String(cid) ? 'text-white' : 'text-white/40'}`}>
                        {comm.name.replace(' ', '_')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isMemberBadge && (
                        <span className="text-[7px] font-black text-[#00ffff]/60 border border-[#00ffff]/30 px-1 rounded-sm bg-[#00ffff]/5">MEMBER</span>
                      )}
                      {String(selectedCommunityId) === String(cid) && <Zap size={10} className="text-[#00ffff] animate-pulse" />}
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Centro: Terminal Log */}
      <div className="flex-1 flex flex-col h-full bg-[#05050a]/40 relative">

        {loading && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#ff006e]/20 z-50 overflow-hidden" style={{ zIndex: 100 }}>
            <motion.div
              className="h-full bg-[#ff006e] shadow-[0_0_10px_#ff006e]"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            />
          </div>
        )}

        {/* ── MOBILE HEADER / RELOAD CONTAINER ── */}
        <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-[#ff006e]/10 px-4 py-2 flex items-center justify-between gap-4 shrink-0">


          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em]">{`TERMINAL_FEED_STREAM_V3`}</span>
            <div className="w-24 h-px bg-[#ff006e]/10 border-t border-dashed border-[#ff006e]/20" />
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-2">
            <button 
              onClick={() => setShowGlobalIngest(true)} 
              className="px-2 py-1 bg-[#ff006e]/10 text-[#ff006e] border border-[#ff006e]/20 text-[8px] font-black uppercase tracking-widest hover:bg-[#ff006e] hover:text-black transition-all"
            >
              + POST
            </button>
            <button 
              onClick={() => setShowGlobalUpload(true)} 
              className="px-2 py-1 bg-[#ff006e]/10 text-[#ff006e] border border-[#ff006e]/20 text-[8px] font-black uppercase tracking-widest hover:bg-[#ff006e] hover:text-black transition-all"
            >
              + TRACK
            </button>
          </div>

          <div className="bg-black/60 backdrop-blur-sm p-1 rounded-sm border border-[#ff006e]/10 shrink-0">
            <RefreshCw
              size={16}
              className={`text-[#ff006e]/60 hover:text-[#ff006e] cursor-pointer transition-colors ${loading ? 'animate-spin' : ''}`}
              onClick={fetchFeed}
            />
          </div>
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
                  const sectorId = item.sectorId ?? item.SectorId;
                  return sectorId === selectedSector;
                }
                return true;
              }).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                  <div className="text-[10px] text-[#ff006e] uppercase tracking-[0.4em]">
                    {selectedSector !== null ? `-- NO_SIGNALS_IN_SECTOR --` : (selectedCommunityId !== null ? `-- NO_COMMUNITY_SIGNALS --` : `-- NO_SIGNALS_DETECTED --`)}
                  </div>
                </div>
              ) : (
                <>
                  {selectedCommunityId !== null && (
                    <div className="mb-6 p-4 bg-[#00ffff]/5 border border-[#00ffff]/20 rounded flex items-center justify-between">
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
                      const sectorId = item.sectorId ?? item.SectorId;
                      return sectorId === selectedSector;
                    }
                    return true;
                  }).map(item => {
                    const type = item.Type;
                    const artist = item.Artist;
                    const title = item.Title;
                    const content = item.Content;
                    const createdAt = item.CreatedAt;
                    const playCount = item.PlayCount;
                    const mediaType = (item.mediaType || item.MediaType || '').toUpperCase();
                    const isOriginal = item.IsOriginalSignal ?? item.isOriginalSignal ?? true;
                    const repostedBy = item.RepostedBy || item.repostedBy;
                    const imageUrl = getMediaUrl(item.imageUrl || item.ImageUrl);

                    if (type === 'system') {
                      return null;
                    }

                    const sectorColor = SECTORS[item.sectorId || item.SectorId]?.color || '#ff006e';
                    return (
                      <div key={item.Id} className="group transition-colors hover:bg-white/[0.05] py-2 px-3 sm:py-4 sm:px-5 rounded border border-white/5 hover:border-white/10 relative mb-3 sm:mb-6 max-w-2xl mx-auto w-full bg-black/20 flex flex-col max-h-[80vh]" style={{ borderLeft: `2px solid ${sectorColor}` }}>
                        {!isOriginal && repostedBy && (
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <Repeat size={10} className="text-[#ff006e] animate-pulse" />
                            <span className="text-[8px] font-black text-[#ff006e] uppercase tracking-[0.2em] bg-[#ff006e]/5 px-2 border border-[#ff006e]/20">
                              [ RE_SIGNAL_FROM // @{repostedBy} ]
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-black border border-white/10 rounded-full overflow-hidden shrink-0">
                              <img src={getMediaUrl(item.profilePictureUrl || item.ProfilePictureUrl)} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=USER'; }} alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => navigateToProfile(item.ArtistUserId || item.artistUserId)}
                                    className="text-[12px] text-white font-black uppercase tracking-tighter hover:text-[#ff006e] transition-colors"
                                  >
                                    {artist}
                                  </button>
                                  <span className="text-[9px] text-white/40">{getTime(createdAt)}</span>
                              </div>
                              <div className="text-[11px] text-white/90 leading-relaxed mt-0.5">
                                {type === 'track' && `Liked track "${title}"`}
                                {type === 'studio' && (content || title)}
                                {type === 'journal' && (content || title)}
                              </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-4">
                          {type === 'track' && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTrackPlay(item);
                              }}
                              className="bg-black/95 p-3 lg:p-4 flex items-center gap-4 rounded-sm border border-white/5 hover:border-white/10 transition-colors group/track cursor-pointer max-w-md shadow-xl"
                            >
                              <div className="w-12 h-12 bg-black border border-white/10 rounded-sm overflow-hidden shrink-0 flex items-center justify-center relative">
                                {imageUrl ? (
                                  <img src={imageUrl} className="w-full h-full object-cover opacity-80 group-hover/track:opacity-100 transition-opacity" alt="" />
                                ) : (
                                  <Music size={20} className="text-[#ff006e]/40" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-white font-black uppercase truncate group-hover/track:text-[#ff006e] transition-colors">{title}</div>
                              </div>
                              <div className="w-8 h-8 rounded border border-white/10 flex items-center justify-center text-white/40 group-hover/track:bg-white/10 group-hover/track:text-white transition-all shadow-md">
                                <Play size={14} fill="currentColor" className="drop-shadow-[0_0_5px_currentColor]" />
                              </div>
                            </div>
                          )}

                          {type === 'studio' && (
                            <div
                              onClick={() => handleMediaExpand(item)}
                              className="w-full flex-1 bg-black border border-white/5 overflow-hidden group/studio cursor-zoom-in relative active:scale-[0.98] transition-transform flex items-center justify-center max-h-[50vh]"
                            >
                              {mediaType === 'VIDEO' ? (
                                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                                  {item.ThumbnailUrl ? (
                                    <div className="absolute inset-0 z-0">
                                      <img src={getMediaUrl(item.ThumbnailUrl)} className="w-full h-full object-cover opacity-60" alt="" />
                                      {/* Play overlay for video with cover */}
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/studio:bg-black/10 transition-all">
                                        <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center bg-black/40">
                                          <Play size={20} className="text-white ml-1" fill="currentColor" />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <video src={imageUrl} className="w-full h-full object-cover opacity-70" muted loop onMouseEnter={e => e.target.play()} onMouseLeave={e => e.target.pause()} />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover/studio:bg-black/20 transition-all">
                                        <Video size={30} className="text-white/60" />
                                      </div>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <img src={imageUrl} className="max-w-full max-h-full object-contain opacity-90 group-hover/studio:opacity-100 transition-opacity" alt="" />
                              )}
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

                          <div className="flex gap-6 text-[9px] font-black text-white/60 uppercase pt-2">
                            <button
                              onClick={() => handleFeedLike(item)}
                              className={`flex items-center gap-1.5 transition-all group/social ${item.IsLiked ? 'text-[#ff006e]' : 'hover:text-[#ff006e]'}`}
                            >
                              <Heart size={12} fill={item.IsLiked ? "currentColor" : "none"} className={item.IsLiked ? 'scale-110' : 'group-hover/social:scale-110'} />
                              <span className="tracking-tighter">LIKE_{item.LikeCount || 0}</span>
                            </button>
                            <button
                              onClick={() => setReplyingTo(item)}
                              className="flex items-center gap-1.5 hover:text-[#ff006e] transition-colors group/social"
                            >
                              <MessageSquare size={12} className="group-hover/social:scale-110" />
                              <span className="tracking-tighter">REPLY_{item.CommentCount || 0}</span>
                            </button>
                            <button
                              onClick={() => handleFeedRepost(item)}
                              className={`flex items-center gap-1.5 transition-all group/social ${item.IsReposted ? 'text-[#ff006e]' : 'hover:text-[#ff006e]'}`}
                            >
                              <Repeat size={12} className={item.IsReposted ? 'animate-pulse' : 'group-hover/social:scale-110'} />
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-2xl hud-panel border border-[#ff006e]/30 rounded-sm overflow-hidden shadow-[0_0_100px_rgba(255,0,110,0.1)] relative"
              >
                {/* Animated Scanline Overlay */}
                <style>{`
                  @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100vh); }
                  }
                  .animate-scanline {
                    animation: scanline 4s linear infinite;
                  }
                `}</style>
                <div className="absolute inset-0 pointer-events-none z-[110] opacity-[0.03] overflow-hidden">
                  <div className="w-full h-[2px] bg-white animate-scanline shadow-[0_0_10px_white]" />
                </div>

                {/* HUD Brackets Decor */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#ff006e]/40 z-[105]" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#ff006e]/40 z-[105]" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#ff006e]/40 z-[105]" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#ff006e]/40 z-[105]" />

                {/* Diagnostic Corners (Hidden on Mobile) */}
                <div className="hidden sm:flex absolute top-12 left-2 flex-col gap-1 z-[105] opacity-20 pointer-events-none font-mono">
                  <div className="text-[5px] text-[#ff006e]">LAT: 35.6895° N</div>
                  <div className="text-[5px] text-[#ff006e]">LNG: 139.6917° E</div>
                  <div className="text-[5px] text-[#ff006e]">ENC: RSA-4096</div>
                </div>
                <div className="hidden sm:flex absolute top-12 right-2 flex-col items-end gap-1 z-[105] opacity-20 pointer-events-none font-mono">
                  <div className="text-[5px] text-[#ff006e]">PKT_LOSS: 0.00%</div>
                  <div className="text-[5px] text-[#ff006e]">BUFFER: 1024KB</div>
                  <div className="text-[5px] text-[#ff006e]">SYNC: ESTABLISHED</div>
                </div>

                <div className="px-5 py-3 border-b border-[#ff006e]/20 flex justify-between items-center bg-[#ff006e]/10 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff006e] animate-pulse shadow-[0_0_15px_#ff006e]" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-white tracking-[0.4em] drop-shadow-[0_0_8px_#ff006e]">SIGNAL_INTERCEPT_V2.5</span>
                      <span className="text-[6px] font-mono text-[#ff006e]/60 tracking-[0.2em] -mt-0.5">UPLINK_STABLE // PORT_AUTH_8080</span>
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-[#ff006e]/40 hover:text-[#ff006e] transition-all hover:rotate-90">
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 relative max-h-[85vh] overflow-y-auto no-scrollbar">
                  {/* Target Signal Header */}
                  <div className="bg-[#050505] border-l-2 border-[#ff006e] p-4 relative group/target">
                    <div className="absolute top-0 right-0 p-1 px-3 text-[7px] font-black uppercase tracking-[0.2em] bg-[#ff006e]/10 text-[#ff006e]">SOURCE_NODE_CAPTURED</div>
                    <div className="text-[9px] text-[#ff006e]/80 font-black uppercase mb-1 tracking-widest">{replyingTo.Artist}</div>
                    <div className="text-[11px] text-white/90 leading-relaxed font-mono italic">
                      "{replyingTo.Title || replyingTo.Content}"
                    </div>
                  </div>

                  {/* Packet Stream (Comment Thread) */}
                  <div className="space-y-8 pb-4">
                    {loadingComments ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-4 border border-white/5 bg-white/[0.02]">
                        <RefreshCw className="animate-spin text-[#ff006e]" size={24} />
                        <span className="text-[10px] text-[#ff006e] animate-pulse tracking-[0.5em]">HANDSHAKING_ENCRYPTED_SIGNAL...</span>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-white/5 rounded">
                        <span className="text-[9px] text-white/10 uppercase tracking-[0.3em]">-- NO_PACKETS_DETECTED --</span>
                      </div>
                    ) : (
                      comments.map(c => (
                        <CommentNode
                          key={c.Id}
                          comment={c}
                          setReplyingToComment={setReplyingToComment}
                          onDelete={handleDeleteComment}
                          currentUserId={getUserId(user)}
                          user={user}
                        />
                      ))
                    )}
                    <div ref={commentsEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="sticky bottom-0 bg-[#0a0a0a] pt-4 border-t border-white/5 space-y-4">
                    <div className="flex justify-between items-center text-[7px] text-white/30 font-mono uppercase">
                      {replyingToComment ? (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400">:: RE_SIGNAL_TO //</span>
                          <span className="text-white/60">@{replyingToComment.Username}</span>
                          <button onClick={() => setReplyingToComment(null)} className="text-[#ff006e] hover:text-white ml-2 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span>:: INPUT_BUFFER_READY ::</span>
                      )}
                      <span>BYTES_STORED: {commentText.length}/280</span>
                    </div>

                    <div className="relative group/input">
                      <textarea
                        autoFocus
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value.substring(0, 280))}
                        placeholder="Enter raw signal content..."
                        className="w-full h-24 bg-black border border-white/10 focus:border-[#ff006e]/50 p-4 text-[11px] text-white outline-none resize-none font-mono placeholder:text-white/5 transition-all"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      {/* Input Area Diagnostics (Hidden on Mobile) */}
                      <div className="hidden sm:flex flex-between items-center gap-4 flex-1">
                        <div className="flex flex-col gap-1">
                          <span className="text-[7px] text-[#ff006e]/60 font-mono">ENCRYPTION: AES-256-GCM_V2</span>
                          <span className="text-[7px] text-white/20 font-mono">SIG_ID: {replyingTo.Id} // PKT_TYPE: {replyingTo.Type?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 border-b border-[#ff006e]/10 border-dashed mx-4 mb-2" />
                      </div>

                      <button
                        onClick={submitComment}
                        disabled={isSubmittingComment || !commentText.trim()}
                        className="w-full sm:w-auto px-8 py-2.5 bg-[#ff006e]/10 border border-[#ff006e]/40 text-[#ff006e] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[#ff006e] hover:text-black hover:shadow-[0_0_30px_rgba(255,0,110,0.3)] transition-all disabled:opacity-20 text-center"
                      >
                        {isSubmittingComment ? 'TRANSMITTING...' : '[ BROADCAST_PAYLOAD ]'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scanline overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-fixed" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Scanline Overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(rgba(255,0,110,0.1)_0px,transparent_1px,rgba(255,0,110,0.1)_2px)] bg-[length:100%_3px]" />
        </div>
      </div>

      {/* ── MOBILE SLIDE-UP PANEL ── */}
      <AnimatePresence>
        {mobilePanelOpen && (
          <motion.div
            id="feed-mobile-panel"
            key="mobile-feed-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="lg:hidden fixed inset-x-0 bottom-0 z-[200] bg-black border-t-2 border-[#ff006e]/30 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] max-h-[70vh] flex flex-col"
          >
            {/* Drag handle + header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#ff006e]/10 shrink-0">
              <div className="flex gap-3">
                {[['filters', <Zap size={10} key="z" />, 'FILTERS']].map(([tab, icon, label]) => (
                  <button
                    key={tab}
                    onClick={() => setMobilePanelTab(tab)}
                    className={`flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-widest border rounded-sm transition-all ${mobilePanelTab === tab
                      ? 'border-[#ff006e]/50 bg-[#ff006e]/10 text-[#ff006e]'
                      : 'border-white/5 text-white/30 hover:text-white/60'
                      }`}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMobilePanelOpen(false)}
                className="text-[#ff006e]/40 hover:text-[#ff006e] hover:rotate-90 transition-all duration-300 p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable panel content */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">

              {/* ── TAB: FILTERS ── */}
              {mobilePanelTab === 'filters' && (
                <div className="space-y-5">
                  {/* Quick actions */}
                  <div className="bg-black border border-[#ff006e]/20 rounded-lg overflow-hidden">
                    <div className="p-2.5 bg-[#ff006e]/5 border-b border-[#ff006e]/10 text-[9px] font-black uppercase text-white tracking-widest">:: TERMINAL_CMDS ::</div>
                    <div className="p-3 space-y-1">
                      <button onClick={() => { setShowGlobalIngest(true); setMobilePanelOpen(false); }} className="w-full text-left p-2 text-[9px] text-[#ff006e]/80 hover:text-white hover:bg-[#ff006e]/10 transition-all uppercase tracking-widest">{`> NEW_POST`}</button>
                      <button onClick={() => { setShowGlobalUpload(true); setMobilePanelOpen(false); }} className="w-full text-left p-2 text-[9px] text-[#ff006e]/80 hover:text-white hover:bg-[#ff006e]/10 transition-all uppercase tracking-widest">{`> UPLOAD_TRACK`}</button>
                    </div>
                  </div>

                  {/* Sector filter */}
                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black uppercase text-[#ff006e] tracking-widest">:: SECTORES Y LIVES ::</h3>
                    <div className="p-4 border border-dashed border-white/5 text-center opacity-40 text-[9px] uppercase tracking-widest">
                      [ EN DESARROLLO / PENDIENTE ]
                    </div>
                  </div>

                  {/* Community filter */}
                  {(() => {
                    const userCommId = user?.communityId || user?.CommunityId;
                    const memberIdStr = userCommId ? String(userCommId) : null;
                    const followedIds = (followedCommunities || []).map(id => String(id));
                    const uniqueLinks = Array.from(new Set([...(memberIdStr ? [memberIdStr] : []), ...followedIds])).filter(Boolean);
                    if (uniqueLinks.length === 0) return null;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="text-[9px] font-black uppercase text-[#00ffff] tracking-widest">:: COMMUNITY_LINKS ::</h3>
                          {selectedCommunityId !== null && (
                            <button onClick={() => { setSelectedCommunityId(null); setMobilePanelOpen(false); }} className="text-[8px] text-[#00ffff]/40 hover:text-[#00ffff] uppercase tracking-tighter">[ RESET ]</button>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {uniqueLinks.map(cid => {
                            const comm = allCommunities.find(c => String(c.id) === String(cid));
                            if (!comm) return null;
                            const sectorColor = SECTORS[comm.sectorId]?.color || '#ffffff';
                            const isMember = String(cid) === memberIdStr;
                            return (
                              <button
                                key={`mob-comm-${cid}`}
                                onClick={() => { setSelectedCommunityId(String(selectedCommunityId) === String(cid) ? null : cid); setSelectedSector(null); setMobilePanelOpen(false); }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded border text-[9px] transition-all ${String(selectedCommunityId) === String(cid)
                                  ? 'bg-[#00ffff]/10 border-[#00ffff]/30 text-white'
                                  : 'bg-black/20 border-white/5 text-white/40 hover:border-[#00ffff]/20'
                                  }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sectorColor }} />
                                  <span className="font-bold uppercase tracking-widest truncate">{comm.name.replace(' ', '_')}</span>
                                </div>
                                {isMember && <span className="text-[7px] font-black text-[#00ffff]/60 border border-[#00ffff]/30 px-1 rounded-sm bg-[#00ffff]/5 shrink-0">MEMBER</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── TAB: FAVORITES ── */}
              {mobilePanelTab === 'favorites' && (
                <div className="space-y-3">
                  <h3 className="text-[9px] font-black uppercase text-[#ff006e] tracking-widest">:: LIVE_FAVORITES ::</h3>
                  <div className="px-3 py-8 border border-dashed border-white/5 rounded text-center opacity-20">
                    <div className="text-[8px] uppercase tracking-widest">MÓDULO PENDIENTE</div>
                  </div>
                </div>
              )}

              {/* ── TAB: LIVE STATIONS ── */}
              {mobilePanelTab === 'stations' && (
                <div className="space-y-3">
                  <h3 className="text-[9px] font-black uppercase text-[#ff006e]/60 tracking-[0.4em]">LIVE_STATIONS</h3>
                  <div className="p-8 border border-dashed border-white/5 text-center opacity-20">
                    <Radio size={24} className="mx-auto mb-2 opacity-50" />
                    <div className="text-[8px] uppercase tracking-widest">MÓDULO PENDIENTE</div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOBILE BACKDROP ── */}
      <AnimatePresence>
        {mobilePanelOpen && (
          <motion.div
            key="mobile-feed-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobilePanelOpen(false)}
            className="lg:hidden fixed inset-0 z-[199] bg-black/90 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Derecha: Radios & Broadcaster Panel */}
      <div className="hidden xl:block w-80 p-6 space-y-8 bg-black border-l border-[#ff006e]/5 relative z-10 overflow-y-auto no-scrollbar">
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


      </div>
    </motion.div>
  );
});

// --- CONTENIDO: PLAYER (PANTALLA COMPLETA) ---
const PlayerContent = ({
  setView,
  keyLockA,
  setKeyLockA,
  currentTrackIndex,
  setCurrentTrackIndex,
  isPlaying,
  setIsPlaying,
  tracks,
  setTracks,
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
  onSendMessage,
  onRequestTrack,
  volume,
  setVolume,
  userPlaylists,
  onFetchPlaylistTracks,
  onPlaybackRateChange,
  onEqA,
  analyserA,
  isLandscape
}) => {
  const isDesktop = window.innerWidth >= 1024;
  const isMobile = !isDesktop;
  const showFullMixer = isDesktop; // Force Cyberpod on mobile

  return (
    <div className="flex items-center justify-center h-full w-full">
      {showFullMixer ? (
        <DJMixerPlayer 
          isMobile={isMobile}
          currentTrack={currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null}
          isPlaying={isPlaying}
          onPlayPause={togglePlay}
          onNext={onNext}
          onPrev={onPrev}
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          volume={volume}
          onVolumeChange={setVolume}
          station={activeStation}
          isBroadcaster={activeStation?.artistUserId === (user?.id || user?.Id)}
          chatMessages={stationChat}
          requests={stationQueue}
          onSendMessage={onSendMessage}
          onClose={() => setView('discovery')}
          tracks={tracks}
          setTracks={setTracks}
          setCurrentTrackIndex={setCurrentTrackIndex}
          libraryTracks={libraryTracks}
          userPlaylists={userPlaylists}
          onLike={onLike}
          onPurchase={onPurchase}
          onPlayPlaylist={onPlayPlaylist}
          onFetchPlaylistTracks={onFetchPlaylistTracks}
          onPlaybackRateChange={onPlaybackRateChange}
          onEqA={onEqA}
          analyserA={analyserA}
          keyLockA={keyLockA}
          onKeyLockAChange={setKeyLockA}
          onPlayTrack={(track) => {
            const tId = track.id || track.Id;
            const rawSource = track.source || track.Source || track.filePath || track.FilePath || "";
            const pureYtId = getGlobalYoutubeId(track);
            const isYoutube = !!pureYtId;
            const sourceStr = isYoutube ? `youtube:${pureYtId}` : (rawSource || "");

            // Enrichment logic for Mixer
            const enriched = {
              ...track,
              id: tId,
              source: isYoutube ? sourceStr : (rawSource ? (rawSource.startsWith('http') ? rawSource : getMediaUrl(rawSource)) : null),
              cover: track.cover || track.imageUrl || track.CoverImageUrl || (isYoutube ? `https://img.youtube.com/vi/${pureYtId}/hqdefault.jpg` : null),
            };

            setTracks([enriched]);
            setCurrentTrackIndex(0);
            setIsPlaying(true);
            if (isYoutube) setIsYoutubeMode(true);
          }}
          user={user}
        />
      ) : (
        <IPodPlayer
          user={user}
          forceNowPlaying={forceNowPlaying}
          isLandscape={isLandscape}
          currentTrackIndex={currentTrackIndex}
          setCurrentTrackIndex={setCurrentTrackIndex}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          tracks={tracks}
          libraryTracks={libraryTracks}
          userPlaylists={userPlaylists}
          onMinimize={() => setView('discovery')}
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          onNext={onNext}
          onPrev={onPrev}
          onLike={onLike}
          togglePlay={togglePlay}
          onPurchase={onPurchase}
          onDownload={onDownload}
          onAddCredits={onAddCredits}
          navigateToProfile={navigateToProfile}
          onPlayPlaylist={onPlayPlaylist}
          activeStation={activeStation}
          stationChat={stationChat}
          stationQueue={stationQueue}
          onSendMessage={onSendMessage}
          onRequestTrack={onRequestTrack}
        />
      )}
    </div>
  );
};
// --- COMPONENTES AUXILIARES ---

const SidebarLink = React.memo(({ icon, label, active, onClick, collapsed, hasNotification }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 ${collapsed ? 'p-2.5' : 'p-3.5'} rounded-sm group relative overflow-hidden outline-none
      ${active ? 'text-white' : 'text-white/30 hover:text-[var(--theme-color)]'} 
      ${collapsed ? 'justify-center' : ''}`}
    title={collapsed ? label : ''}
  >
    {/* Active Background Layer */}
    <div className={`absolute inset-0 hud-panel transition-opacity duration-300 pointer-events-none ${active ? 'opacity-100' : 'opacity-0'}`} />

    {active && (
      <div className="absolute inset-0 pointer-events-none animate-in fade-in duration-500">
        <div className="hud-bracket-tl text-[var(--theme-color)] opacity-80" />
        <div className="hud-bracket-tr text-[var(--theme-color)] opacity-80" />
        <div className="hud-bracket-bl text-[var(--theme-color)] opacity-80" />
        <div className="hud-bracket-br text-[var(--theme-color)] opacity-80" />
      </div>
    )}

    <div className={`relative transition-all duration-300 ${active ? 'scale-110 text-[var(--theme-color)]' : 'opacity-60 group-hover:opacity-100 group-hover:scale-110'}`}>
      {icon}
    </div>
    {!collapsed && (
      <span className={`relative mono text-[10px] font-black uppercase tracking-[0.2em] transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'}`}>
        {label}
      </span>
    )}
    {hasNotification && !active && (
      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[var(--theme-color)] rounded-full shadow-[0_0_8px_var(--theme-color)] animate-pulse" />
    )}
  </button>
));

const NavButton = React.memo(({ icon, active, onClick, hasNotification }) => (
  <button onClick={onClick} className={`relative p-3.5 outline-none group rounded-sm ${active ? 'text-[var(--theme-color)]' : 'text-white/20 hover:text-[var(--theme-color)]'}`}>
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
import { LanguageProvider } from './contexts/LanguageContext';

export default function AppWrapper() {
  return (
    <NotificationProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </NotificationProvider>
  );
}
