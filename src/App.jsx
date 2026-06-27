// Deployment Trigger: 2026-05-05T02:50:00-04:00
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Heart,
  Search, User, Radio, Hash, LogIn, Bell,
  Flame, Zap, Settings, Share2, List,
  Music, ChevronRight, ChevronLeft, Menu as MenuIcon, X,
  MapPin, Calendar, Users, Edit3, Library,
  ChevronDown, Camera, Video, PenTool, BookOpen,
  MessageSquare, Repeat, MoreHorizontal, RefreshCw,
  Frown, Star, Volume2, VolumeX, Plus, Minus, Globe, Maximize2, Minimize2, LogOut, Wallet, ShoppingBag, ExternalLink
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
import TipArtistModal from './components/TipArtistModal';
import TrackActionsDropdown from './components/TrackActionsDropdown';
import TrackEconomyModal from './components/TrackEconomyModal';
import PlaylistSelectModal from './components/PlaylistSelectModal';
import JournalEditor from './components/JournalEditor';
import SeriesManager from './components/SeriesManager';
import TermsView from './components/TermsView';
import PrivacyView from './components/PrivacyView';


import { SECTORS, API_BASE_URL, getMediaUrl, getUserId } from './constants';
import DJMixerPlayer from './components/DJMixerPlayer';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { initSignalR, joinStation, leaveStation, syncTrack, sendMessage, requestTrack, onBroadcastSync, registerHost, unregisterHost, onListenerJoined, disconnectSignalR, onStationWentLive, onStationEnded, onListenerCount } from './services/signalr';
import { useBroadcastSync } from './hooks/useBroadcastSync';
import { useWebRTCBroadcast } from './hooks/useWebRTCBroadcast';
import { useWebRTCListener } from './hooks/useWebRTCListener';

const ShoppingView = React.lazy(() => 
  import('./components/ShoppingView').catch((err) => {
    console.error("Failed to load ShoppingView", err);
    window.location.reload();
    return { default: () => <div>Loading...</div> };
  })
);





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
  const id = track.youtubeId || track.YoutubeId || track.videoId || track.VideoId || track.resolvedYoutubeId || track.ResolvedYoutubeId || track.id || track.Id;
  
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

// Premium Borderless Electron Window Control Titlebar
const ElectronTitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track fullscreen changes natively
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isElectron = window.electron || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
    if (!isElectron) return;

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (typeof window === 'undefined') return null;

  const isElectron = window.electron || (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'));
  if (!isElectron) return null;

  const handleMinimize = () => {
    if (window.electron) {
      window.electron.minimize();
    } else {
      console.log("Minimize requested on legacy client.");
    }
  };

  const handleMaximize = () => {
    if (window.electron) {
      window.electron.maximize();
      setIsMaximized(prev => !prev);
    } else {
      handleFullscreenToggle();
    }
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleClose = () => {
    if (window.electron) {
      window.electron.close();
    } else {
      if (window.confirm("Do you want to exit the application?")) {
        window.close();
      }
    }
  };

  return (
    <div 
      className="h-[28px] bg-[#020202] border-b border-fatale/15 flex items-center justify-between px-3 select-none pointer-events-auto relative z-[999999] shrink-0" 
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-fatale animate-pulse" />
        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-fatale/80 select-none">
          [ FATALE DESKTOP SHELL v1.0.0 ]
        </span>
      </div>

      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' }}>
        <button 
          onClick={handleFullscreenToggle}
          title="Toggle Fullscreen Mode"
          className="w-8 h-5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all rounded cursor-pointer"
        >
          {isFullscreen ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
        </button>
        <button 
          onClick={handleMaximize}
          title="Maximize Window"
          className="w-8 h-5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all rounded cursor-pointer"
        >
          <Globe size={10} />
        </button>
        <button 
          onClick={handleMinimize}
          title="Minimize Window"
          className="w-8 h-5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all rounded cursor-pointer"
        >
          <Minus size={10} />
        </button>
        <button 
          onClick={handleClose}
          title="Exit Application"
          className="w-8 h-5 flex items-center justify-center text-white/40 hover:text-fatale hover:bg-fatale/10 transition-all rounded cursor-pointer"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
};
// --- COMPONENTE PRINCIPAL ---
function App() {
  const [activeView, setViewOriginal] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'terms' || hash === 'privacy') return hash;

    // Session Guard: If no session, always start on login
    const hasSession = localStorage.getItem('token') && localStorage.getItem('user');
    if (!hasSession) return 'login';

    const validViews = ['discovery', 'feed', 'profile', 'player', 'messages', 'shopping', 'settings', 'wallet', 'terms', 'privacy'];
    if (validViews.includes(hash)) return hash;
    return localStorage.getItem('activeView') || 'login';
  });
  const [previousView, setPreviousView] = useState('discovery');
  const [viewingUserId, setViewingUserId] = useState(null);
  const [tippingArtist, setTippingArtist] = useState(null);
  const [economyTrack, setEconomyTrack] = useState(null);
  const [playlistTrackToAdd, setPlaylistTrackToAdd] = useState(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const { showNotification } = useNotification();
  const [zoomState, setZoomState] = useState(100);



  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

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

  const [appThemeColor, setAppThemeColor] = useState(() => {
    return localStorage.getItem('appThemeColor') || (user?.themeColor || user?.ThemeColor) || '#ffffff';
  });
  const [appBackgroundColor, setAppBackgroundColor] = useState(() => {
    return localStorage.getItem('appBackgroundColor') || (user?.backgroundColor || user?.BackgroundColor) || '#000000';
  });

  const [lowSpecMode, setLowSpecMode] = useState(() => {
    return localStorage.getItem('fatale_low_spec') === 'true';
  });

  useEffect(() => {
    if (lowSpecMode) {
      document.documentElement.classList.add('low-spec');
    } else {
      document.documentElement.classList.remove('low-spec');
    }
    localStorage.setItem('fatale_low_spec', String(lowSpecMode));
  }, [lowSpecMode]);

  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const userLang = user?.preferredLanguage || user?.PreferredLanguage;
    if (userLang && userLang !== language) {
      setLanguage(userLang);
    }
    if (user) {
      setAppThemeColor(user.themeColor || user.ThemeColor || '#ffffff');
      setAppBackgroundColor(user.backgroundColor || user.BackgroundColor || '#000000');
    }
  }, [user?.preferredLanguage, user?.PreferredLanguage, setLanguage, user]);

  useEffect(() => {
    const hexToRgbVals = (hex) => {
      if (!hex || !hex.startsWith('#')) return null;
      try {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
        return { space: `${r} ${g} ${b}`, comma: `${r}, ${g}, ${b}` };
      } catch (e) {
        return null;
      }
    };

    const applyThemeColor = (cssVar, hexValue, defaultSpace, defaultComma) => {
      const vals = hexToRgbVals(hexValue) || { space: defaultSpace, comma: defaultComma };
      document.documentElement.style.setProperty(cssVar, vals.space);
      document.documentElement.style.setProperty(cssVar + '-rgb', vals.comma);
    };

    if (user) {
      applyThemeColor('--theme-primary', appThemeColor, '255 255 255', '255, 255, 255'); 
      applyThemeColor('--theme-secondary', appThemeColor, '255 255 255', '255, 255, 255'); 
      applyThemeColor('--theme-bg', appBackgroundColor, '0 0 0', '0, 0, 0'); 
      applyThemeColor('--theme-text', appThemeColor, '255 255 255', '255, 255, 255'); 
      applyThemeColor('--color-border', user?.colorBorder || user?.ColorBorder || '#ff006e', '255 0 110', '255, 0, 110');
      applyThemeColor('--color-label', user?.colorLabel || user?.ColorLabel || '#ff00ff', '255 0 255', '255, 0, 255');
      applyThemeColor('--color-data-primary', user?.colorDataPrimary || user?.ColorDataPrimary || '#00ffff', '0 255 255', '0, 255, 255');
      applyThemeColor('--color-data-secondary', user?.colorDataSecondary || user?.ColorDataSecondary || '#00ff00', '0 255 0', '0, 255, 0');
    } else {
      document.documentElement.style.setProperty('--theme-primary', '255 255 255');
      document.documentElement.style.setProperty('--theme-primary-rgb', '255, 255, 255');
      document.documentElement.style.setProperty('--theme-secondary', '255 255 255');
      document.documentElement.style.setProperty('--theme-secondary-rgb', '255, 255, 255');
      document.documentElement.style.setProperty('--theme-bg', '0 0 0');
      document.documentElement.style.setProperty('--theme-bg-rgb', '0, 0, 0');
      document.documentElement.style.setProperty('--theme-text', '255 255 255');
      document.documentElement.style.setProperty('--theme-text-rgb', '255, 255, 255');
      document.documentElement.style.setProperty('--color-border', '255 0 110');
      document.documentElement.style.setProperty('--color-border-rgb', '255, 0, 110');
      document.documentElement.style.setProperty('--color-label', '255 0 255');
      document.documentElement.style.setProperty('--color-label-rgb', '255, 0, 255');
      document.documentElement.style.setProperty('--color-data-primary', '0 255 255');
      document.documentElement.style.setProperty('--color-data-primary-rgb', '0, 255, 255');
      document.documentElement.style.setProperty('--color-data-secondary', '0 255 0');
      document.documentElement.style.setProperty('--color-data-secondary-rgb', '0, 255, 0');
    }
  }, [user, appThemeColor, appBackgroundColor, activeView]);


  // Escape listener was moved below handleLogout definition to prevent reference errors.

  const currentUserId = getUserId(user);
  const [tracks, setTracks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tracks') || '[]'); } catch { return []; }
  });
  const [libraryTracks, setLibraryTracks] = useState([]);
  const [postText, setPostText] = useState('');
  const [postFiles, setPostFiles] = useState([]);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Real-time Audio State
  const [currentTime, setCurrentTime] = useState(0);
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
  const [liveStations, setLiveStations] = useState([]);
  const [activeStation, setActiveStation] = useState(null);
  const [stationChat, setStationChat] = useState([]);
  const [stationQueue, setStationQueue] = useState([]);
  const [showMixer, setShowMixer] = useState(false);
  const [mixerDeckB, setMixerDeckB] = useState(null);
  const [mixerIsPlayingB, setMixerIsPlayingB] = useState(false);
  const [mixerCurrentTimeB, setMixerCurrentTimeB] = useState(0);
  const [mixerCrossfader, setMixerCrossfader] = useState(-100);
  const [mixerFaderA, setMixerFaderA] = useState(1);
  const [mixerFaderB, setMixerFaderB] = useState(1);
  const [mixerPitchA, setMixerPitchA] = useState(0);
  const [mixerPitchB, setMixerPitchB] = useState(0);
  const [mixerBpmA, setMixerBpmA] = useState(null);
  const [mixerBpmB, setMixerBpmB] = useState(null);
  const [broadcastTrack, setBroadcastTrack] = useState(null);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const isMobile = window.innerWidth < 1024;
  const [feedBackgroundImage, setFeedBackgroundImage] = useState(localStorage.getItem('feedBackgroundImage') || '');

  // EQ / Filter State
  const audioCtx = useRef(null);
  const sourceNode = useRef(null);
  const filters = useRef({ low: null, mid: null, high: null });
  const [analyserA, setAnalyserA] = useState(null);
  const analyser = useRef(null); // Keep ref for internal logic but use state for props
  const broadcastDestRef = useRef(null);

  const initAudioCtx = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || navigator.vendor || window.opera);
    if (isMobile) {
      console.log("[PLAYER] Mobile environment detected. Bypassing Web Audio API Graph to preserve background native playback thread.");
      return;
    }
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

        broadcastDestRef.current = audioCtx.current.createMediaStreamDestination();
        analyser.current.connect(broadcastDestRef.current);
    }
  };

  const onOpenMixer = () => {
    initAudioCtx();
    if (audioCtx.current?.state === 'suspended') {
      audioCtx.current.resume().catch(e => console.warn("Failed to resume AudioContext on open mixer:", e));
    }
    setShowMixer(true);
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
  const extractArtistName = (t) => {
    if (!t) return '';
    if (t.artistName) return t.artistName;
    if (t.ArtistName) return t.ArtistName;
    if (t.artist) {
      if (typeof t.artist === 'string') return t.artist;
      if (typeof t.artist === 'object') {
        if (t.artist.name) return t.artist.name;
        if (t.artist.Name) return t.artist.Name;
      }
    }
    if (t.Artist) {
      if (typeof t.Artist === 'string') return t.Artist;
      if (typeof t.Artist === 'object') {
        if (t.Artist.name) return t.Artist.name;
        if (t.Artist.Name) return t.Artist.Name;
      }
    }
    if (t.album?.artist) {
      if (t.album.artist.name) return t.album.artist.name;
      if (t.album.artist.Name) return t.album.artist.Name;
    }
    if (t.Album?.Artist) {
      if (t.Album.Artist.name) return t.Album.Artist.name;
      if (t.Album.Artist.Name) return t.Album.Artist.Name;
    }
    if (t.author) return t.author;
    if (t.Author) return t.Author;
    if (t.channelTitle) return t.channelTitle;
    if (t.ChannelTitle) return t.ChannelTitle;
    return '';
  };

  const isHost = activeStation
  ? String(activeStation.artistUserId || activeStation.ArtistUserId) === String(currentUserId)
  : false;

  const currentTrack = React.useMemo(() => {
    // ── Broadcast mode: listener follows station, not local queue ──
    if (activeStation && !isHost) {
      if (broadcastTrack) {
        return {
          ...broadcastTrack,
          id:       broadcastTrack.youtubeId || broadcastTrack.source || 'broadcast',
          isLiked:  false,
          isLocked: false,
          isOwned:  true,
        };
      }
      // Tuning in — waiting for first broadcast sync. Return a station placeholder
      // so we NEVER accidentally surface a local track (and its isLiked state).
      return {
        id:       `station-${activeStation.id || activeStation.Id}`,
        title:    activeStation.sessionTitle || activeStation.SessionTitle || 'LIVE SIGNAL',
        artist:   activeStation.artistName || activeStation.ArtistName || 'Live DJ',
        source:   null,
        cover:    activeStation.imageUrl || activeStation.ImageUrl || null,
        isLiked:  false,
        isLocked: false,
        isOwned:  true,
      };
    }
  
    // ── Normal local queue mode ────────────────────────────────────
    const raw = (currentTrackIndex >= 0 && tracks[currentTrackIndex])
      ? tracks[currentTrackIndex]
      : null;
  
    if (!raw) return {
      id: null, title: null, artist: null,
      source: null, cover: null,
      isLiked: false, isLocked: false, isOwned: true
    };
  
    return {
      ...raw,
      id:      raw.id || raw.Id,
      title:   raw.title || raw.Title,
      artist:  extractArtistName(raw) || 'Unknown Artist',
      source:  raw.source || raw.Source,
      cover:   raw.cover || raw.coverImageUrl || raw.CoverImageUrl,
      isLiked: raw.isLiked ?? (raw.IsLiked ?? false),
      isLocked: raw.isLocked ?? (raw.IsLocked ?? false),
      isOwned:  raw.isOwned ?? (raw.IsOwned ?? true),
    };
  }, [currentTrackIndex, tracks, activeStation, broadcastTrack, isHost]);
  // Audio Ref for persistence
  const audioRef = useRef(null);

  // Organic Intelligence Event Tracker
  const listenEventRef = useRef({ id: null, startTime: null });

  // YouTube Player State
  const [youtubePlayer, setYoutubePlayer] = useState(null);
  const [isYoutubeMode, setIsYoutubeMode] = useState(false);
  const [vibeFeatures, setVibeFeatures] = useState(null);
  const lastLoadedYtId = useRef(null);
  const hasStartedPlayingYt = useRef(false);
  const lastPlayRequestTime = useRef(0);
  const activeStationRef = useRef(null);
  const lastSyncTimeRef = useRef(0);

  const currentYtId = useMemo(() => {
    const track = (activeStation && !isHost) ? broadcastTrack : currentTrack;
    return getGlobalYoutubeId(track);
  }, [currentTrack, activeStation, isHost, broadcastTrack]);

  // Dynamic Spotify track resolver (resolves Spotify metadata to YouTube video ID under the hood)
  useEffect(() => {
    const resolveSpotifyTrack = async () => {
      const track = tracks[currentTrackIndex];
      if (!track) return;
      const source = track.source || track.Source;
      if (source && source.startsWith('spotify:') && !track.resolvedYoutubeId) {
        try {
          const spotifyId = source.split(':')[1]?.trim();
          if (spotifyId && spotifyId.length === 11) {
            track.resolvedYoutubeId = spotifyId;
            setTracks([...tracks]);
            console.log(`[SPOTIFY_RESOLVER] Directly resolved 11-char YouTube ID from source: ${spotifyId}`);
            return;
          }
          console.log(`[SPOTIFY_RESOLVER] Resolving: "${track.artist} - ${track.title}" to YouTube...`);
          const res = await API.Youtube.search(`${track.artist} - ${track.title} audio`);
          if (res.data && res.data.length > 0) {
            const nonShorts = res.data.filter(item => {
              const title = (item.title || item.Title || '').toLowerCase();
              const url = (item.url || item.Url || '').toLowerCase();
              const duration = item.duration || item.Duration || item.durationSeconds || 0;
              return !((duration > 0 && duration <= 60) || title.includes('shorts') || title.includes('#shorts') || url.includes('shorts'));
            });
            const bestResult = nonShorts.length > 0 ? nonShorts[0] : res.data[0];
            const ytId = bestResult.id || bestResult.Id || bestResult.videoId;
            track.resolvedYoutubeId = ytId;
            // Force re-trigger play
            setTracks([...tracks]); 
            console.log(`[SPOTIFY_RESOLVER] Resolved successfully to YouTube ID: ${ytId} (Filtered Shorts: ${nonShorts.length}/${res.data.length} main video selected)`);
          }
        } catch (err) {
          console.error("[SPOTIFY_RESOLVER] Failed to resolve Spotify track:", err);
        }
      }
    };
    resolveSpotifyTrack();
  }, [currentTrackIndex, tracks]);

  // Helper to trigger autoplay, with a fallback to muted autoplay if browser blocks playback
  const playYtVideo = (player) => {
    if (!player) return;
    try {
      player.playVideo();
      const checkTime = Date.now();
      lastPlayRequestTime.current = checkTime;
      
      setTimeout(() => {
        if (lastPlayRequestTime.current === checkTime) {
          const state = player.getPlayerState ? player.getPlayerState() : -1;
          // If the player is not playing (1) or buffering (3), trigger muted autoplay fallback
          if (state !== 1 && state !== 3) {
            console.log("[YOUTUBE_AUTOPLAY] Autoplay blocked, falling back to muted play");
            player.mute();
            player.playVideo();
          }
        }
      }, 350);
    } catch (e) {
      console.warn("[YOUTUBE_AUTOPLAY] Error starting YouTube video:", e);
    }
  };

  const playSilentAudioIfNecessary = () => {
    if (!audioRef.current) return;
    const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    const currentSrc = audioRef.current.getAttribute('data-playing-src') || audioRef.current.src;
    if (currentSrc !== silentSrc && currentSrc !== 'silent') {
      console.log("[PLAYER] Transitioning to silent audio stream for YouTube playback");
      audioRef.current.src = silentSrc;
      audioRef.current.loop = true;
      audioRef.current.setAttribute('data-playing-src', 'silent');
      try {
        audioRef.current.load();
        audioRef.current.play().catch(e => console.warn("[PLAYER] Failed to play silent audio:", e));
      } catch (e) {
        console.warn("[PLAYER] Failed to load/play silent audio:", e);
      }
    }
  };

  // ── YouTube player ready-recovery for broadcast LISTENERS ───────────────────
  // When the YT player first becomes available (non-null), if we're a listener in
  // YouTube broadcast mode with a track ready, trigger playback immediately.
  // This rescues the case where the first BroadcastSync arrives before the player
  // initializes (ytPlayer was null at the time, so it was skipped).
  useEffect(() => {
    if (!youtubePlayer) return;
    if (!activeStation || isHost) return; // Only for listeners
    if (!isYoutubeMode || !currentYtId) return;

    const ytId = currentYtId;
    console.log('[BROADCAST_LISTENER] YouTube player now ready — loading broadcast track:', ytId);
    try {
      youtubePlayer.loadVideoById({ videoId: ytId, startSeconds: currentTime || 0 });
      youtubePlayer.setVolume(volume * 100);
      if (!isPlaying) {
        setTimeout(() => { try { youtubePlayer.pauseVideo(); } catch (e) {} }, 300);
      }
    } catch (e) {
      console.warn('[BROADCAST_LISTENER] YouTube ready-recovery failed:', e);
    }
  // Only fire when player first becomes ready (youtubePlayer changing from null to instance)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubePlayer]);

  // Effect to load and play YouTube track when it changes
  useEffect(() => {
    if (!youtubePlayer) return;
    if (activeStation && !isHost) return; // Skip local YouTube player control in broadcast mode for listeners!

    const ytId = currentYtId;

    if (isYoutubeMode && ytId) {
      try {
        let loadedThisTick = false;
        if (lastLoadedYtId.current !== ytId) {
          console.log(`[YOUTUBE] Programmatic load of video ID: ${ytId}`);
          lastLoadedYtId.current = ytId;
          hasStartedPlayingYt.current = false;
          youtubePlayer.loadVideoById({
            videoId: ytId,
            startSeconds: 0
          });
          youtubePlayer.setVolume(volume * 100);
          youtubePlayer.setPlaybackRate(globalPlaybackRate);
          loadedThisTick = true;
        }
        
        // Ensure play state is synchronized without redundant calls that cause audio stutters
        const ytState = youtubePlayer.getPlayerState ? youtubePlayer.getPlayerState() : null;
        if (isPlaying) {
          if (!loadedThisTick && ytState !== 1 && ytState !== 3) {
            playYtVideo(youtubePlayer);
          }
        } else {
          if (ytState !== 2) {
            youtubePlayer.pauseVideo();
          }
        }
      } catch (err) {
        console.warn("[YOUTUBE] Programmatic track change play/load failed (retrying on ready/state):", err);
      }
    } else {
      lastLoadedYtId.current = null;
      if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
        try {
          youtubePlayer.pauseVideo();
        } catch (err) {}
      }
    }
  }, [currentYtId, isYoutubeMode, youtubePlayer, isPlaying, volume, globalPlaybackRate]);

  // Fetch Spotify Vibe Features or generate mock features for other tracks
  useEffect(() => {
    const fetchVibes = async () => {
      if (!currentTrack || (!currentTrack.id && !currentTrack.title)) {
        setVibeFeatures(null);
        return;
      }
      
      const trackSource = currentTrack.source || currentTrack.Source;
      if (trackSource && trackSource.startsWith('spotify:')) {
        const spotifyId = trackSource.split(':')[1]?.trim();
        if (spotifyId) {
          try {
            console.log(`[VIBES] Fetching Spotify Audio Features for: ${currentTrack.title}...`);
            const res = await API.Spotify.getAudioFeatures(spotifyId);
            if (res.data) {
              setVibeFeatures(res.data);
              return;
            }
          } catch (err) {
            console.warn("[VIBES] Failed to fetch Spotify features, falling back to mock:", err);
          }
        }
      }

      // Generate consistent beautiful mock features for non-Spotify tracks
      const title = currentTrack.title || 'Unknown Signal';
      let hash = 0;
      for (let i = 0; i < title.length; i++) {
        hash = title.charCodeAt(i) + ((hash << 5) - hash);
      }
      const seededRandom = (seed) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };
      
      const valence = Math.round((seededRandom(hash) * 0.9 + 0.05) * 1000) / 1000;
      const energy = Math.round((seededRandom(hash + 1) * 0.9 + 0.05) * 1000) / 1000;
      const danceability = Math.round((seededRandom(hash + 2) * 0.8 + 0.1) * 1000) / 1000;
      const tempo = Math.round((seededRandom(hash + 3) * 80 + 75) * 10) / 10;
      const acousticness = Math.round(seededRandom(hash + 4) * 1000) / 1000;

      setVibeFeatures({
        valence,
        energy,
        danceability,
        tempo,
        acousticness,
        key: Math.abs(hash) % 12,
        mode: Math.abs(hash + 1) % 2
      });
    };
    
    fetchVibes();
  }, [currentTrack?.id, currentTrack?.title]);

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
  const [showF10Menu, setShowF10Menu] = useState(false);
  const [mediaTypeSelection, setMediaTypeSelection] = useState('PHOTO');
  const [ingestMode, setIngestMode] = useState('ALL'); // 'ALL' or 'JOURNAL'
  const [globalSeriesList, setGlobalSeriesList] = useState([]);

  useEffect(() => {
    if (showGlobalIngest && user && ingestMode === 'JOURNAL') {
      API.JournalSeries.getMySeries()
        .then(res => setGlobalSeriesList(res.data || []))
        .catch(err => console.error("Failed to load series for global ingest", err));
    }
  }, [showGlobalIngest, user, ingestMode]);

  const [goLiveFormData, setGoLiveFormData] = useState({ sessionTitle: '', description: '', isChatEnabled: true, isQueueEnabled: true, sectorId: null, sourceType: 'app' });
  const [broadcastSourceType, setBroadcastSourceType] = useState('app');
  const [micStream, setMicStream] = useState(null); // MediaStream from hardware input
  const [appAudioDevices, setAppAudioDevices] = useState([]);
  const [selectedAppDeviceId, setSelectedAppDeviceId] = useState('');

  useEffect(() => {
    if (showGlobalGoLive && goLiveFormData.sourceType === 'hardware') {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
          return navigator.mediaDevices.enumerateDevices();
        })
        .catch(err => {
          console.warn("Microphone permission denied or prompt ignored:", err);
          return navigator.mediaDevices.enumerateDevices();
        })
        .then(devices => {
          const audioInputs = devices.filter(d => d.kind === 'audioinput');
          setAppAudioDevices(audioInputs);
          if (audioInputs.length > 0 && !selectedAppDeviceId) {
            setSelectedAppDeviceId(audioInputs[0].deviceId);
          }
        })
        .catch(e => console.warn('Device enumeration failed', e));
    }
  }, [showGlobalGoLive, goLiveFormData.sourceType, selectedAppDeviceId]);
  
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

    let hardwareStream = null;
    if (goLiveFormData.sourceType === 'hardware') {
      try {
        const constraints = {
          audio: selectedAppDeviceId ? { deviceId: { exact: selectedAppDeviceId } } : true
        };
        hardwareStream = await navigator.mediaDevices.getUserMedia(constraints);
        setMicStream(hardwareStream);
      } catch (err) {
        console.error("Failed to acquire hardware mic stream:", err);
        showNotification("HARDWARE_ERROR", "Could not capture selected audio hardware. Verify device permissions.", "error");
        return;
      }
    }

    try {
      await API.Stations.goLive({
        SessionTitle: title,
        Description: desc || null,
        IsChatEnabled: goLiveFormData.isChatEnabled,
        IsQueueEnabled: goLiveFormData.isQueueEnabled,
        SectorId: goLiveFormData.sectorId ?? null
      });

      if (currentUserId) {
        const stationRes = await API.Stations.getByUserId(currentUserId).catch(e => {
          console.error("Failed to fetch host station:", e);
          return null;
        });
        if (stationRes && stationRes.data) {
          setActiveStation(stationRes.data);
          const sid = stationRes.data.id || stationRes.data.Id;
          if (sid) {
            // Join our own station group so BroadcastSync reaches listeners in the group
            await joinStation(String(sid)).catch(e => console.warn('[HOST] joinStation failed:', e));
            // Register as host so hub knows our connectionId for ListenerJoined routing
            await registerHost(String(sid)).catch(e => console.warn('[HOST] registerHost failed:', e));
          }
        }
      }

      showNotification("BROADCAST_ACTIVE", t('ESTABLISH_SIGNAL'), "success");
      setBroadcastSourceType(goLiveFormData.sourceType);
      if (goLiveFormData.sourceType === 'hardware') {
        setIsPlaying(true);
      } else {
        initAudioCtx();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current.removeAttribute('src');
          audioRef.current.srcObject = null;
        }
        if (youtubePlayer) {
          try { youtubePlayer.stopVideo(); } catch (e) {}
        }
        setTracks([]);
        setCurrentTrackIndex(-1);
        setIsPlaying(false);
        setMixerDeckB(null);
        setMixerIsPlayingB(false);
        setMixerCurrentTimeB(0);
        setMixerCrossfader(-100);
        setView('player');
      }
      setShowGlobalGoLive(false);
      setGoLiveFormData({ sessionTitle: '', description: '', isChatEnabled: true, isQueueEnabled: true, sectorId: null, sourceType: 'app' });

      // After starting, keep user on feed page for hardware mode
      if (goLiveFormData.sourceType === 'hardware') {
        setView('feed');
      }
    } catch (e) {
      console.error("Failed to go live global:", e);
      if (hardwareStream) {
        hardwareStream.getTracks().forEach(track => track.stop());
        setMicStream(null);
      }
      showNotification("BROADCAST_FAILURE", t('SYNC_FAILURE'), "error");
    }
  };

  const handleEndBroadcast = async () => {
    try {
      await API.Stations.endLive();
      setActiveStation(null);
      setBroadcastTrack(null);
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        setMicStream(null);
      }
      showNotification("BROADCAST_TERMINATED", "The transmission has been terminated.", "success");
      fetchLiveStations();
      setShowGlobalGoLive(false);
    } catch (e) {
      console.error("Failed to end broadcast:", e);
      showNotification("ERROR", "Failed to terminate broadcast.", "error");
    }
  };

  useEffect(() => {
    activeStationRef.current = activeStation;
  }, [activeStation]);



  useBroadcastSync({
    activeStation,
    audioRef,
    youtubePlayer,
    isHost,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setBroadcastTrack,
    setIsYoutubeMode,
    setBroadcastSourceType,
    showNotification,
    joinStation,
    onBroadcastSync,
  });

  // ── WebRTC: Host broadcaster (hardware audio → listeners) ──────────────────
  useWebRTCBroadcast({
    stationId: activeStation ? String(activeStation.id || activeStation.Id) : null,
    micStream: broadcastSourceType === 'hardware' ? micStream : (broadcastDestRef.current ? broadcastDestRef.current.stream : null),
    isHost,
    isBroadcasting: isHost && !!activeStation,
    isPlaying,
    broadcastSourceType,
  });

  // ── WebRTC: Listener (receive live audio from host) ────────────────────────
  const { isReceivingLiveAudio } = useWebRTCListener({
    activeStation,
    isHost,
    broadcastSourceType,
    mainAudioRef: audioRef,
  });

  // Sync Audio Volume & Mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = volume;
    }
    if (youtubePlayer && typeof youtubePlayer.mute === 'function') {
      try {
        if (isMuted) youtubePlayer.mute();
        else {
          youtubePlayer.unMute();
          youtubePlayer.setVolume(volume * 100);
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
      if (res.data) {
        const liveOnly = res.data.filter(s => s.isLive || s.IsLive);
        setLiveStations(liveOnly);

        // Auto-sync host's activeStation
        const currentUserId = user?.id || user?.Id;
        if (currentUserId && !activeStation) {
          const myStation = liveOnly.find(s =>
            String(s.artistUserId || s.ArtistUserId) === String(currentUserId)
          );
          if (myStation) {
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
      // ── Ensure it's actually playing if the state suggests it
      try {
        if (typeof youtubePlayer.getPlayerState === 'function') {
          const state = youtubePlayer.getPlayerState();
          if (state !== 1 && state !== 3) { // 1=playing, 3=buffering
            playYtVideo(youtubePlayer);
          }
          // Capture time immediately on play to prevent jumps/stutter
          if (typeof youtubePlayer.getCurrentTime === 'function') {
            const time = youtubePlayer.getCurrentTime();
            const dur = youtubePlayer.getDuration();
            if (dur && dur > 0 && dur !== duration) setDuration(dur);
            setCurrentTime(time);
          }
        }
      } catch (e) { console.warn("YouTube PlayVideo Error:", e); }

      interval = setInterval(() => {
        try {
          if (youtubePlayer && typeof youtubePlayer.getCurrentTime === 'function') {
            const time = youtubePlayer.getCurrentTime();
            const dur = youtubePlayer.getDuration();
            if (dur && dur > 0 && dur !== duration) setDuration(dur);
            setCurrentTime(time);
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
      activeStationRef.current = station;
      setActiveStation(station);
      setIsPlaying(true); // Auto-play the station immediately
  
      // Join the SignalR room — useBroadcastSync takes it from here.
      // Do NOT touch tracks, currentTrackIndex, or isYoutubeMode here.
      // The hook will set everything once the first BroadcastSync arrives.
  
      // Only reset broadcastTrack so UI shows "Tuning in..." until first sync
      setBroadcastTrack(null);
  
      // ── Mobile Gesture Unlock ──────────────────────────────────────────────
      // On iOS/Android, we MUST call .play() synchronously in the click/touch
      // handler before any async work. Loading a silent WAV carrier unlocks the
      // <audio> element so that WebRTC's srcObject assignment can auto-play later.
      const SILENT = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      if (audioRef.current) {
        // Always clear WebRTC stream first
        if (audioRef.current.srcObject) {
          audioRef.current.srcObject = null;
        }
        // Force-reload silent carrier regardless of what was previously loaded
        // (the attribute guard was preventing mobile from re-unlocking)
        audioRef.current.src = SILENT;
        audioRef.current.loop = true;
        audioRef.current.setAttribute('data-playing-src', 'silent');
        audioRef.current.load();
        audioRef.current.play().catch((err) => {
          console.warn('[TUNE_IN] Silent carrier play blocked (expected on desktop):', err.message);
        });
      }
      
      // Stop any local youtube video
      if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
        try { youtubePlayer.pauseVideo(); } catch(err){}
      }
    };
  
    window.addEventListener('tuneIn', handleTuneIn);
    return () => window.removeEventListener('tuneIn', handleTuneIn);
  }, [youtubePlayer]);

  // ── Reusable tune-in handler for direct onClick calls ──────────────────────
  // (The tuneIn CustomEvent above only fires from DiscoveryHUD which uses it.
  //  All other views call setActiveStation directly — we wire them to this instead
  //  so mobile gesture unlock always fires in the synchronous click context.)
  const handleTuneInStation = React.useCallback((station) => {
    if (!station) {
      activeStationRef.current = null;
      setActiveStation(null);
      setBroadcastTrack(null);
      return;
    }
    activeStationRef.current = station;
    setActiveStation(station);
    setIsPlaying(true);
    setBroadcastTrack(null);
    joinStation(station.id || station.Id);

    const SILENT = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    if (audioRef.current) {
      if (audioRef.current.srcObject) audioRef.current.srcObject = null;
      audioRef.current.src = SILENT;
      audioRef.current.loop = true;
      audioRef.current.setAttribute('data-playing-src', 'silent');
      audioRef.current.load();
      audioRef.current.play().catch((err) => {
        console.warn('[TUNE_IN_STATION] Silent carrier blocked (expected on desktop):', err.message);
      });
    }
    if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
      try { youtubePlayer.pauseVideo(); } catch(e) {}
    }
  }, [youtubePlayer, joinStation]);


  // --- PERSISTENCE & ROUTING LOOPS ---
  useEffect(() => {
    if (activeView && activeView !== 'login' && activeView !== 'terms' && activeView !== 'privacy') {
      localStorage.setItem('activeView', activeView);
    }
    
    if (activeView && activeView !== 'login') {
      // Sync state to URL hash for browser history & back button support
      if (window.location.hash !== `#${activeView}`) {
        window.location.hash = activeView;
      }
    } else if (activeView === 'login') {
      if (window.location.hash && window.location.hash !== '#terms' && window.location.hash !== '#privacy') {
        window.location.hash = '';
      }
    }
  }, [activeView]);

  // URL Hash Listener for browser back/forward buttons navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'terms' || hash === 'privacy') {
        setViewOriginal(hash);
        return;
      }

      const hasSession = localStorage.getItem('token') && localStorage.getItem('user');
      if (!hasSession) {
        setViewOriginal('login');
        return;
      }

      const validViews = ['discovery', 'feed', 'profile', 'player', 'messages', 'shopping', 'settings', 'wallet', 'terms', 'privacy'];
      if (validViews.includes(hash)) {
        setViewOriginal(hash);
      } else if (!hash && activeView !== 'login') {
        setViewOriginal('discovery');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem('currentTrackIndex', currentTrackIndex);
  }, [currentTrackIndex]);

  useEffect(() => {
    localStorage.setItem('tracks', JSON.stringify(tracks));
  }, [tracks]);



  useEffect(() => {
    localStorage.setItem('liked_youtube_ids', JSON.stringify(Array.from(likedYoutubeIds)));
  }, [likedYoutubeIds]);


  const handleMixerStateChange = React.useCallback((state) => {
    setMixerDeckB(state.deckB);
    setMixerIsPlayingB(state.isPlayingB);
    setMixerCurrentTimeB(state.currentTimeB);
    setMixerCrossfader(state.crossfader);
    if (typeof state.faderA === 'number') setMixerFaderA(state.faderA);
    if (typeof state.faderB === 'number') setMixerFaderB(state.faderB);
    if (typeof state.pitchA === 'number') setMixerPitchA(state.pitchA);
    if (typeof state.pitchB === 'number') setMixerPitchB(state.pitchB);
    if (state.bpmA != null) setMixerBpmA(state.bpmA);
    if (state.bpmB != null) setMixerBpmB(state.bpmB);
  }, []);

  // Helper to determine the active broadcast state (Deck A vs Deck B)
  const getActiveBroadcastState = React.useCallback(() => {
    if (broadcastSourceType === 'hardware') {
      return {
        trackToSync: {
          title: '🎙 LIVE INPUT',
          artist: user?.username || 'Hardware Source',
          source: 'hardware',
          sourceType: 'hardware'
        },
        timeToSync: 0,
        playingToSync: isPlaying,
        isDeckBActive: false
      };
    }
    let isDeckBActive = false;
    if (mixerDeckB) {
      // Deck B is active if it's the only one playing, OR crossfader is right of center (>= 0)
      if (mixerIsPlayingB && !isPlaying) {
        isDeckBActive = true;
      } else if (isPlaying && !mixerIsPlayingB) {
        isDeckBActive = false;
      } else if (mixerIsPlayingB) {
        // Both playing: crossfader >= 0 → deck B; < 0 → deck A
        isDeckBActive = mixerCrossfader >= 0;
      }
    }
    const trackToSync    = isDeckBActive ? mixerDeckB : currentTrack;
    const timeToSync     = isDeckBActive ? mixerCurrentTimeB : currentTime;
    const playingToSync  = isDeckBActive ? mixerIsPlayingB : isPlaying;
    const volumeToSync   = isDeckBActive ? mixerFaderB : mixerFaderA;
    const pitchToSync    = isDeckBActive ? mixerPitchB : mixerPitchA;
    const bpmToSync      = isDeckBActive ? mixerBpmB : mixerBpmA;
    return {
      trackToSync, timeToSync, playingToSync, isDeckBActive,
      crossfader: mixerCrossfader,
      volume: volumeToSync,
      pitch: pitchToSync,
      bpm: bpmToSync,
    };
  }, [mixerCrossfader, mixerDeckB, currentTrack, mixerCurrentTimeB, currentTime,
      mixerIsPlayingB, isPlaying, broadcastSourceType, user?.username,
      mixerFaderA, mixerFaderB, mixerPitchA, mixerPitchB, mixerBpmA, mixerBpmB]);

  // --- HOST BROADCASTING LOGIC ---
  useEffect(() => {
    if (!isHost || !activeStation) return;
    const { trackToSync, timeToSync, playingToSync, crossfader } = getActiveBroadcastState();
    if (!trackToSync?.title) return;
    const stationId = activeStation.id || activeStation.Id;
  
    // Guard: ensure signalR is ready before syncing
    const timer = setTimeout(() => {
      lastSyncTimeRef.current = Date.now();
      const enrichedTrack = {
        ...trackToSync,
        sourceType: broadcastSourceType,
        crossfader,
        broadcastVolume: volume,
        broadcastPitch:  pitch,
        broadcastBpm:    bpm,
      };
      if (broadcastSourceType === 'hardware') {
        enrichedTrack.title  = '🎙 LIVE INPUT';
        enrichedTrack.artist = user?.username || 'Hardware Source';
      }
      syncTrack(stationId, enrichedTrack, timeToSync, playingToSync);
    }, 0);
  
    return () => clearTimeout(timer);
  }, [
    currentTrack?.id, currentTrack?.Id, currentTrack?.source, currentTrack?.title, isPlaying, isHost, activeStation?.id,
    showMixer, mixerCrossfader, mixerDeckB?.id, mixerDeckB?.Id, mixerDeckB?.source, mixerDeckB?.title, mixerIsPlayingB
  ]);
  
  // Periodic currentTime sync throttle (every 3 seconds)
  useEffect(() => {
    if (!isHost || !activeStation) return;
    const { trackToSync, timeToSync, playingToSync, crossfader, volume, pitch, bpm } = getActiveBroadcastState();
    if (!trackToSync?.title) return;
    const stationId = activeStation.id || activeStation.Id;
  
    const now = Date.now();
    if (now - lastSyncTimeRef.current >= 3000) {
      lastSyncTimeRef.current = now;
      const enrichedTrack = {
        ...trackToSync,
        sourceType: broadcastSourceType,
        crossfader,
        broadcastVolume: volume,
        broadcastPitch:  pitch,
        broadcastBpm:    bpm,
      };
      if (broadcastSourceType === 'hardware') {
        enrichedTrack.title  = '🎙 LIVE INPUT';
        enrichedTrack.artist = user?.username || 'Hardware Source';
      }
      syncTrack(stationId, enrichedTrack, timeToSync, playingToSync);
    }
  }, [
    currentTime, mixerCurrentTimeB, isHost, activeStation?.id, isPlaying,
    mixerIsPlayingB, broadcastSourceType, getActiveBroadcastState
  ]);

  // Sync immediately when a listener joins
  useEffect(() => {
    if (!isHost || !activeStation) return;
    const { trackToSync, timeToSync, playingToSync } = getActiveBroadcastState();
    if (!trackToSync?.title) return;
    const stationId = activeStation.id || activeStation.Id;

    const unsub = onListenerJoined(({ listenerConnectionId }) => {
      console.log(`[HOST] Listener ${listenerConnectionId} joined, syncing track immediately`);
      lastSyncTimeRef.current = Date.now();
      // Re-read live state so the listener-join sync is always current
      const {
        trackToSync: liveTrack,
        timeToSync: liveTime,
        playingToSync: livePlaying,
        crossfader: liveFader,
        volume: liveVol,
        pitch: livePitch,
        bpm: liveBpm,
      } = getActiveBroadcastState();
      if (!liveTrack?.title) return;
      const enrichedTrack = {
        ...liveTrack,
        sourceType: broadcastSourceType,
        crossfader: liveFader,
        broadcastVolume: liveVol,
        broadcastPitch:  livePitch,
        broadcastBpm:    liveBpm,
      };
      if (broadcastSourceType === 'hardware') {
        enrichedTrack.title  = '🎙 LIVE INPUT';
        enrichedTrack.artist = user?.username || 'Hardware Source';
      }
      syncTrack(stationId, enrichedTrack, liveTime, livePlaying);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isHost, activeStation?.id, currentTrack?.id, currentTrack?.source, currentTime, isPlaying, broadcastSourceType]);

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

  useEffect(() => {
    const unsubLive = onStationWentLive((payload) => {
      console.log("[App] Real-time: Station went live", payload);
      fetchLiveStations();
    });
    const unsubEnd = onStationEnded((payload) => {
      console.log("[App] Real-time: Station ended", payload);
      fetchLiveStations();
      if (activeStationRef.current) {
        const endedId = String(payload?.stationId || payload?.StationId || payload);
        const currentId = String(activeStationRef.current.id || activeStationRef.current.Id);
        if (endedId === currentId) {
          console.log("[App] Active station ended by host. Tuning out.");
          setActiveStation(null);
          activeStationRef.current = null;
          setBroadcastTrack(null);
          setIsPlaying(false);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current.srcObject = null;
          }
          showNotification('Station ended by the broadcaster.');
        }
      }
    });
    const unsubCount = onListenerCount((count) => {
      console.log("[App] Real-time: Listener count updated", count);
      setActiveStation(prev => {
        if (!prev) return null;
        return { ...prev, listenerCount: count };
      });
    });
    return () => {
      if (typeof unsubLive === 'function') unsubLive();
      if (typeof unsubEnd === 'function') unsubEnd();
      if (typeof unsubCount === 'function') unsubCount();
    };
  }, []);

  // Unified Play Track handler with full deep reconciliation (artist & artistName)
  const handlePlayTrack = React.useCallback((track) => {
    if (!track) return;
  
    if (activeStation && !isHost) {
      setActiveStation(null);
      activeStationRef.current = null;
      setBroadcastTrack(null);
    }

    const tId = track.id || track.Id;
    const rawSource = track.source || track.Source || track.filePath || track.FilePath || "";

    // Unified YouTube Resolution
    const pureYtId = getGlobalYoutubeId(track);
    const isCached = pureYtId && cachedTrackIds.has(pureYtId);
    const isYoutube = !!pureYtId && !isCached;
    const sourceStr = isCached
      ? `${API_BASE_URL}cache/${currentUserId}_${pureYtId}.mp3`
      : (isYoutube ? `youtube:${pureYtId}` : (rawSource || ""));

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

    const artist = libraryMatch ? (libraryMatch.artist || extractArtistName(libraryMatch)) : (track.artist || extractArtistName(track) || 'Unknown Artist');
    const artistName = libraryMatch ? (libraryMatch.artistName || libraryMatch.ArtistName || extractArtistName(libraryMatch)) : (track.artistName || track.ArtistName || extractArtistName(track) || 'Unknown Artist');

    const enriched = {
      ...track,
      id: tId,
      source: sourceStr,
      cover: (isYoutube || isCached) ? (rawCover || `https://img.youtube.com/vi/${pureYtId}/hqdefault.jpg`) : (rawCover ? (rawCover.startsWith('http') ? rawCover : getMediaUrl(rawCover)) : null),
      isLiked,
      isOwned,
      isLocked: false,
      artist,
      artistName,
      isCached
    };

    // Synchronous mobile gesture unblocking:
    if (audioRef.current) {
      // Always clear WebRTC stream before playing local audio
      if (audioRef.current.srcObject) {
        audioRef.current.srcObject = null;
      }
      initAudioCtx();
      if (audioCtx.current && audioCtx.current.state === 'suspended') {
        audioCtx.current.resume().catch(e => console.warn("[MOBILE GESTURE] Resume AudioContext blocked:", e));
      }
      if (isYoutube) {
        playSilentAudioIfNecessary();
      } else {
        const rawSource = enriched.source;
        const resolvedSrc = rawSource ? (rawSource.startsWith('http') ? rawSource : (typeof getMediaUrl === 'function' ? getMediaUrl(rawSource) : rawSource)) : "";
        
        // If the track is cached locally, load from Cache API and play via Blob Object URL to guarantee offline access without service worker
        if (enriched.isCached && 'caches' in window) {
          caches.open('fatale-audio-cache')
            .then(cache => cache.match(rawSource))
            .then(response => {
              if (response) {
                return response.blob().then(blob => {
                  const objectUrl = URL.createObjectURL(blob);
                  if (audioRef.current) {
                    audioRef.current.src = objectUrl;
                    audioRef.current.loop = false;
                    audioRef.current.load();
                    audioRef.current.play().catch(e => console.warn("[OFFLINE PLAYBACK] Object URL play failed:", e));
                  }
                });
              } else {
                throw new Error("Not found in cache");
              }
            })
            .catch(err => {
              console.warn("[OFFLINE PLAYBACK] Cache match failed, falling back to network source:", err);
              if (audioRef.current) {
                audioRef.current.src = resolvedSrc;
                audioRef.current.loop = false;
                audioRef.current.load();
                audioRef.current.play().catch(e => console.warn("[MOBILE GESTURE] Play failed:", e));
              }
            });
        } else {
          audioRef.current.src = resolvedSrc;
          audioRef.current.loop = false;
          audioRef.current.load();
          audioRef.current.play().catch(e => console.warn("[MOBILE GESTURE] Play failed:", e));
        }
      }
    }

    setTracks([enriched]);
    setCurrentTrackIndex(0);
    setIsPlaying(true);
    if (isYoutube) setIsYoutubeMode(true);
    else setIsYoutubeMode(false);
  }, [libraryTracks, likedYoutubeIds, currentUserId, cachedTrackIds]);

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
        .map(t => getGlobalYoutubeId(t))
        .filter(Boolean)
      );

      const localCachedKey = `cached_native_${uid || 'anon'}`;
      const cachedNative = JSON.parse(localStorage.getItem(localCachedKey) || "[]");
      const cachedNativeIds = new Set(cachedNative.map(String));
      const cachedIds = new Set([
        ...cachedTracks.map(t => String(t.youtubeId)),
        ...cachedTracks.map(t => String(t.youtubeTrackId || t.YoutubeTrackId)),
        ...cachedNative.map(String)
      ]);
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
        const artist = (t.artist || t.artistName || t.ArtistName || t.album?.artist?.name || "").toLowerCase().trim();
        return title ? `${artist} - ${title}` : null;
      };

      if (tracksRes.data && Array.isArray(tracksRes.data)) {
        tracksRes.data.forEach(t => {
          const trackId = String(t.trackId || t.TrackId || t.id || t.Id);
          const artistUserId = t.artistUserId || t.ArtistUserId || t.album?.artist?.userId || t.Album?.Artist?.UserId;
          const isMine = artistUserId && String(artistUserId) === String(uid);

          const yId = getGlobalYoutubeId(t);
          const isCached = yId && cachedIds.has(String(yId));
          const isYT = !!yId && !isCached;
          const rawSource = t.source || t.Source || t.filePath || t.FilePath || "";
          const resolvedSource = isCached
            ? `${API_BASE_URL}cache/${uid}_${yId}.mp3`
            : (isYT ? `youtube:${yId}` : (rawSource ? (rawSource.startsWith('http') ? rawSource : getMediaUrl(rawSource)) : null));

          if (!resolvedSource || resolvedSource === API_BASE_URL || resolvedSource === `${API_BASE_URL}/`) return;

          const artistName = extractArtistName(t);
          if (!yId && artistName === 'The Archive') return;

          const isLiked = likedTrackIds.has(trackId);

          // Skip native (non-YouTube) tracks that the user has no relationship with.
          // Without this guard all public posted tracks enter libraryTracks and their
          // artists bleed into the ARTISTS crate even when nothing is saved.
          if (!isYT && !isLiked && !isMine && !ownedTrackIds.has(trackId)) return;
          if (isYT && isLiked) localLikedYtIds.add(yId);

          const mappedTrack = {
            ...t,
            id: trackId,
            youtubeId: yId || undefined,
            videoId: yId || undefined,
            category: yId ? 'YouTube' : (t.category || t.Category || t.genre || t.Genre),
            title: t.title || t.Title || 'Unknown Title',
            artist: artistName || 'Unknown Artist',
            album: t.album?.title || t.Album?.Title || 'Unknown Album',
            duration: t.duration || t.Duration || '3:00',
            cover: (isYT || isCached) ? (t.thumbnailUrl || t.ThumbnailUrl || `https://img.youtube.com/vi/${yId}/hqdefault.jpg`) : getMediaUrl(t.coverImageUrl || t.CoverImageUrl),
            source: resolvedSource,
            isOwned: ownedTrackIds.has(trackId) || isMine,
            isLiked: isLiked,
            isCached: yId 
              ? (isCached || cachedIds.has(Number(trackId)) || cachedIds.has(trackId)) 
              : (cachedNativeIds.has(trackId) || cachedNativeIds.has(Number(trackId))),
          };

          const key = getUniqueKey(mappedTrack);
          const metaKey = getMetaKey(mappedTrack);

          if (!uniqueTracksMap.has(key)) {
            uniqueTracksMap.set(key, mappedTrack);
            if (metaKey) titleArtistMap.set(metaKey, key);
          }
        });
      }

      // Merge purchased tracks (including delisted/deleted ones) into uniqueTracksMap to guarantee lifetime access
      if (purchases && Array.isArray(purchases)) {
        purchases.forEach(p => {
          const t = p.track || p.Track;
          if (!t) return;
          const trackId = String(t.trackId || t.TrackId || t.id || t.Id);

          const artistUserId = t.artistUserId || t.ArtistUserId || t.album?.artist?.userId || t.Album?.Artist?.UserId;
          const isMine = artistUserId && String(artistUserId) === String(uid);

          const yId = getGlobalYoutubeId(t);
          const isCached = yId && cachedIds.has(String(yId));
          const isYT = !!yId && !isCached;
          const rawSource = t.source || t.Source || t.filePath || t.FilePath || "";
          const resolvedSource = isCached
            ? `${API_BASE_URL}cache/${uid}_${yId}.mp3`
            : (isYT ? `youtube:${yId}` : (rawSource ? (rawSource.startsWith('http') ? rawSource : getMediaUrl(rawSource)) : null));

          if (!resolvedSource || resolvedSource === API_BASE_URL || resolvedSource === `${API_BASE_URL}/`) return;

          const artistName = extractArtistName(t);
          if (!yId && artistName === 'The Archive') return;

          const isLiked = likedTrackIds.has(trackId);

          const mappedTrack = {
            ...t,
            id: trackId,
            youtubeId: yId || undefined,
            videoId: yId || undefined,
            category: yId ? 'YouTube' : (t.category || t.Category || t.genre || t.Genre),
            title: t.title || t.Title || 'Unknown Title',
            artist: artistName || 'Unknown Artist',
            album: t.album?.title || t.Album?.Title || 'Unknown Album',
            duration: t.duration || t.Duration || '3:00',
            cover: (isYT || isCached) ? (t.thumbnailUrl || t.ThumbnailUrl || `https://img.youtube.com/vi/${yId}/hqdefault.jpg`) : getMediaUrl(t.coverImageUrl || t.CoverImageUrl),
            source: resolvedSource,
            isOwned: true,
            isLiked: isLiked,
            isCached: yId 
              ? (isCached || cachedIds.has(Number(trackId)) || cachedIds.has(trackId)) 
              : (cachedNativeIds.has(trackId) || cachedNativeIds.has(Number(trackId))),
          };

          const key = getUniqueKey(mappedTrack);
          const metaKey = getMetaKey(mappedTrack);

          if (!uniqueTracksMap.has(key)) {
            uniqueTracksMap.set(key, mappedTrack);
            if (metaKey) titleArtistMap.set(metaKey, key);
          } else {
            // Ensure isOwned is set to true for existing tracks in the map
            const existing = uniqueTracksMap.get(key);
            uniqueTracksMap.set(key, { ...existing, isOwned: true });
          }
        });
      }

      if (likes.length > 0) {
        likes.forEach(lik => {
          const yId = getGlobalYoutubeId(lik);
          if (yId) {
            localLikedYtIds.add(yId);
            const isCached = cachedIds.has(String(yId));
            const sourceKey = isCached ? `${API_BASE_URL}cache/${uid}_${yId}.mp3` : `youtube:${yId}`;
            if (uniqueTracksMap.has(sourceKey)) {
              const existing = uniqueTracksMap.get(sourceKey);
              uniqueTracksMap.set(sourceKey, { ...existing, isLiked: true });
              return;
            }
            const mappedYt = {
              id: String(lik.id || lik.Id || `yt-${yId}`),
              videoId: yId,
              youtubeId: yId,
              category: 'YouTube',
              title: lik.title || lik.Title,
              artist: lik.channelTitle || lik.artistName || lik.ArtistName || lik.artist || "Unknown Artist",
              source: sourceKey,
              isLiked: true,
              isOwned: false,
              isLocked: false,
              isCached: isCached || cachedIds.has(lik.id) || cachedIds.has(lik.Id)
            };
            uniqueTracksMap.set(sourceKey, mappedYt);
          }
        });
      }
      
      setLikedYoutubeIds(localLikedYtIds);

      const allTracks = Array.from(uniqueTracksMap.values());
      const finalTracks = allTracks.length > 0 ? allTracks : [];
      setLibraryTracks(finalTracks);
      setTracks(prev => {
        const isMock = prev.length > 0 && String(prev[0].id).startsWith('mock-');
        if (prev.length === 0 || isMock) return finalTracks;
        
        // --- DEEP RE-SYNC: Ensure current queue reflects latest social state ---
        return prev.map(t => {
          const tId = String(t.trackId || t.TrackId || t.id || t.Id);
          const yId = getGlobalYoutubeId(t);
          const matched = finalTracks.find(ft => String(ft.id) === tId || (yId && getGlobalYoutubeId(ft) === yId));
          const isCached = matched 
            ? matched.isCached 
            : (yId ? (yId && cachedIds.has(String(yId))) : (cachedNativeIds.has(tId) || cachedNativeIds.has(Number(tId))));
          
          let isLiked = yId ? localLikedYtIds.has(yId) : likedTrackIds.has(tId);
          // If not found by primary keys, try matching libraryTracks meta (fallthrough)
          if (!isLiked && matched) {
             isLiked = matched.isLiked;
          }

          const isOwned = ownedTrackIds.has(tId) || t.isOwned || t.IsOwned || (uid && String(t.artistUserId) === String(uid));
          
          // Ensure correct artist and artistName mapping to get rid of "Unknown Artist" saved in queue/local storage
          const artist = matched ? (matched.artist || extractArtistName(matched)) : (t.artist || extractArtistName(t) || 'Unknown Artist');
          const artistName = matched ? (matched.artistName || matched.ArtistName || extractArtistName(matched)) : (t.artistName || t.ArtistName || extractArtistName(t) || 'Unknown Artist');
          
          const resolvedSource = isCached
            ? `${API_BASE_URL}cache/${uid}_${yId}.mp3`
            : (yId ? `youtube:${yId}` : (t.source || t.Source));

          return { ...t, isLiked, isOwned, artist, artistName, source: resolvedSource, isCached };
        });
      });
    } catch (error) {
      console.error("Failed to fetch tracks", error);
      setLibraryTracks([]);
      setTracks(prev => prev.length === 0 ? [] : prev);
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

  // Reset current time immediately whenever the active track/index changes (prevents inheriting previous track's time offset)
  useEffect(() => {
    setCurrentTime(0);
  }, [currentTrackIndex]);

  // Auto-play/initialize index to 0 if playback is enabled but no track is selected
  useEffect(() => {
    if (activeStationRef.current) return;  
    if (isPlaying && currentTrackIndex < 0 && tracks.length > 0) {
      setCurrentTrackIndex(0);
    }
  }, [isPlaying, currentTrackIndex, tracks]);

  // Efecto para manejar el audio
  useEffect(() => {
    if (!audioRef.current || currentTrackIndex < 0) return;
    // Hard stop for station listeners — useBroadcastSync owns the audio element when tuned in
    if (activeStationRef.current && !isHost) {
      return;
    }
    const audio = audioRef.current;

    const track = tracks[currentTrackIndex];
    if (!track) return;

    const trackSource = track.source || track.Source;
    const isLocked = (track.isLocked ?? false) && !(track.isOwned ?? true);
    const isYT = !!getGlobalYoutubeId(track) && !track.isCached;

    // 1. Mode Switching
    if (isYT) {
      if (!isYoutubeMode) setIsYoutubeMode(true);
      
      // Clear any lingering WebRTC stream before using src-based audio
      if (audio.srcObject) {
        audio.srcObject = null;
      }

      // Play silent audio on native element to keep background session alive on mobile
      const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
      if (audio.src !== silentSrc && audio.getAttribute('data-playing-src') !== 'silent') {
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

      // Ensure YouTube is paused when switching to native
      if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
        try {
          youtubePlayer.pauseVideo();
        } catch (e) {}
      }

      // Clear any lingering WebRTC stream so local src can play through
      if (audio.srcObject) {
        audio.srcObject = null;
      }

      // Handle Local Audio Source Change
      const currentSrc = audio.getAttribute('data-playing-src') || audio.src;
      const targetSrc = trackSource ? (trackSource.startsWith('http') ? trackSource : (typeof getMediaUrl === 'function' ? getMediaUrl(trackSource) : trackSource)) : "";
      const isAlreadyLoaded = audio.src && (audio.src === targetSrc || audio.src.endsWith(trackSource) || currentSrc === targetSrc || currentSrc === trackSource);
      if (trackSource && !isAlreadyLoaded) {
        console.log(`[PLAYER] Loading new local source: ${targetSrc}`);
        audio.src = targetSrc;
        audio.loop = false; // Ensure it doesn't loop so onEnded fires
        audio.setAttribute('data-playing-src', targetSrc);
        audio.load();
        setCurrentTime(0);
      }
    }

    // 2. Playback State Sync
    if (isPlaying && !isLocked) {
      // Ensure AudioContext is initialized and active for seamless playback on any interaction
      initAudioCtx();
      if (audioCtx.current && audioCtx.current.state === 'suspended') {
        audioCtx.current.resume().catch(e => console.warn("[PLAYER] Resume AudioContext blocked:", e));
      }

      if (isYT) {
        if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
          try {
            const state = youtubePlayer.getPlayerState();
            if (state !== 1 && state !== 3) playYtVideo(youtubePlayer);
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
  }, [
    currentTrackIndex,
    currentTrack?.source,
    currentTrack?.Source,
    currentTrack?.isLocked,
    currentTrack?.isOwned,
    isPlaying,
    isYoutubeMode,
    youtubePlayer
  ]);

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
      const pureYtId = getGlobalYoutubeId(track);
      const isYT = !!pureYtId;
      const trackId = isYT ? pureYtId : (track.id || track.Id);

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
    if (activeStationRef.current) return;
    if (tracks.length === 0) return;

    const nextIndex = currentTrackIndex + 1;

    if (nextIndex < tracks.length) {
      // Synchronous mobile unblocking:
      if (audioRef.current) {
        const nextTrack = tracks[nextIndex];
        const isYTTrack = !!getGlobalYoutubeId(nextTrack) && !nextTrack.isCached;
        if (isYTTrack) {
          playSilentAudioIfNecessary();
        } else {
          const trackSource = nextTrack?.source || nextTrack?.Source;
          const resolvedSrc = trackSource ? (trackSource.startsWith('http') ? trackSource : (typeof getMediaUrl === 'function' ? getMediaUrl(trackSource) : trackSource)) : "";
          if (audioRef.current.srcObject) {
            audioRef.current.srcObject = null;
          }
          audioRef.current.src = resolvedSrc;
          audioRef.current.loop = false;
          audioRef.current.load();
          audioRef.current.play().catch(e => console.warn("Next play failed:", e));
        }
      }

      setCurrentTrackIndex(nextIndex);
      setIsPlaying(true);
    } else {
      console.log("[ORGANIC] Queue exhausted. Fetching recommendations...");
      try {
        const lastTrack = tracks[currentTrackIndex];
        const lastVideoId = getGlobalYoutubeId(lastTrack);
        const isYT = !!lastVideoId;

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
        if (isYoutubeMode && youtubePlayer) playYtVideo(youtubePlayer);
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
    if (tracks.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;

    // Synchronous mobile unblocking:
    if (audioRef.current) {
      const prevTrack = tracks[prevIndex];
      const isYTTrack = !!getGlobalYoutubeId(prevTrack) && !prevTrack.isCached;
      if (isYTTrack) {
        playSilentAudioIfNecessary();
      } else {
        const trackSource = prevTrack?.source || prevTrack?.Source;
        const resolvedSrc = trackSource ? (trackSource.startsWith('http') ? trackSource : (typeof getMediaUrl === 'function' ? getMediaUrl(trackSource) : trackSource)) : "";
        if (audioRef.current.srcObject) {
          audioRef.current.srcObject = null;
        }
        audioRef.current.src = resolvedSrc;
        audioRef.current.loop = false;
        audioRef.current.load();
        audioRef.current.play().catch(e => console.warn("Prev play failed:", e));
      }
    }

    setCurrentTrackIndex(prevIndex);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    initAudioCtx();
    if (audioCtx.current?.state === 'suspended') {
      audioCtx.current.resume().catch(e => console.warn("AudioContext resume failed:", e));
    }
    
    if (currentTrackIndex < 0 && tracks.length > 0) {
      handlePlayTrackAtIndex(0);
      return;
    }
    
    if (isYoutubeMode && youtubePlayer) {
      try {
        const ytState = typeof youtubePlayer.getPlayerState === 'function' ? youtubePlayer.getPlayerState() : -1;
        // ytState 1 is PLAYING, 3 is BUFFERING. If it's loaded but paused/cued/unstarted:
        if (ytState !== 1 && ytState !== 3) {
          playYtVideo(youtubePlayer);
          setIsPlaying(true);
          return;
        }
      } catch (e) { console.warn("Failed checking YT state in togglePlay:", e); }
    }

    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    
    if (nextPlaying) {
      if (isYoutubeMode && youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
        try {
          playYtVideo(youtubePlayer);
        } catch (e) { console.warn("Sync YT play failed:", e); }
      } else if (!isYoutubeMode && audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(e => console.warn("Sync audio play failed:", e));
      }
    } else {
      if (isYoutubeMode && youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
        try {
          youtubePlayer.pauseVideo();
        } catch (e) { }
      } else if (!isYoutubeMode && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  };

  const handlePlayTrackAtIndex = (index) => {
    if (index < 0 || index >= tracks.length) return;
    
    // If a listener (not the host) starts playing their own track, exit the station
    if (activeStation && !isHost) {
      setActiveStation(null);
      activeStationRef.current = null;
      setBroadcastTrack(null);
    }

    initAudioCtx();
    if (audioCtx.current && audioCtx.current.state === 'suspended') {
      audioCtx.current.resume().catch(e => console.warn("[MOBILE GESTURE] Resume AudioContext blocked:", e));
    }
    
    const track = tracks[index];
    const isYTTrack = !!getGlobalYoutubeId(track) && !track.isCached;
    
    if (audioRef.current) {
      if (isYTTrack) {
        playSilentAudioIfNecessary();
      } else {
        const trackSource = track.source || track.Source;
        const resolvedSrc = trackSource ? (trackSource.startsWith('http') ? trackSource : (typeof getMediaUrl === 'function' ? getMediaUrl(trackSource) : trackSource)) : "";
        if (audioRef.current.srcObject) {
          audioRef.current.srcObject = null;
        }
        audioRef.current.src = resolvedSrc;
        audioRef.current.loop = false;
        audioRef.current.load();
        audioRef.current.play().catch(e => console.warn("[MOBILE GESTURE] Play index failed:", e));
      }
    }
    
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    if (isYTTrack) setIsYoutubeMode(true);
  };

  // Modified to use main library tracks for correct Like status
  const handlePlayPlaylist = (playlistTracksRaw, startIndex = 0, shouldRedirect = true) => {
    // If a listener (not the host) starts playing their own track/playlist, exit the station
    if (activeStation && !isHost) {
      setActiveStation(null);
      activeStationRef.current = null;
      setBroadcastTrack(null);
    }

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
      const isCached = pureYtId && cachedTrackIds.has(pureYtId);
      const isYoutube = !!pureYtId && !isCached;
      const isDiscoveryAbsolute = isYoutube || (pTrack.source || pTrack.Source || "").startsWith('http');

      // Resolve Like Status
      const isLiked = isYoutube ? likedYoutubeIds.has(pureYtId) : (pTrack.isLiked || pTrack.IsLiked || found?.isLiked || found?.IsLiked);

      // Resolve Cover
      const rawCover = pTrack.cover || pTrack.CoverImageUrl || pTrack.coverImageUrl || pTrack.imageUrl || pTrack.ImageUrl || found?.cover || found?.CoverImageUrl || found?.imageUrl;
      const resolvedCover = (isYoutube || isCached)
        ? (rawCover || `https://img.youtube.com/vi/${pureYtId}/hqdefault.jpg`)
        : (rawCover ? (rawCover.startsWith('http') ? rawCover : getMediaUrl(rawCover)) : null);

      const resolvedSource = isCached
        ? `${API_BASE_URL}cache/${currentUserId}_${pureYtId}.mp3`
        : (isYoutube ? `youtube:${pureYtId}` : (isDiscoveryAbsolute ? (pTrack.source || pTrack.Source) : (found?.source || found?.Source || pTrack.source || pTrack.Source)));

      if (found) {
        return {
          ...found,
          id: pId || found.id || found.Id,
          source: resolvedSource,
          cover: resolvedCover,
          isLiked,
          isOwned: true,
          isLocked: false,
          isCached
        };
      }
      return {
        ...pTrack,
        id: pId,
        source: resolvedSource,
        cover: resolvedCover,
        isLiked,
        isOwned: true,
        isLocked: false,
        isCached
      };
    });

    console.log("[App] Playing Playlist via Enriched Queue. Count:", enrichedQueue.length);

    // 3. Set states
    const firstTrack = enrichedQueue[startIndex];
    const isYT = !!getGlobalYoutubeId(firstTrack) && !firstTrack.isCached;

    // Synchronous mobile gesture unblocking:
    if (audioRef.current) {
      initAudioCtx();
      if (audioCtx.current && audioCtx.current.state === 'suspended') {
        audioCtx.current.resume().catch(e => console.warn("[MOBILE GESTURE] Resume AudioContext blocked:", e));
      }
      const isYTTrack = isYT;
      if (isYTTrack) {
        playSilentAudioIfNecessary();
      } else {
        const trackSource = firstTrack?.source || firstTrack?.Source;
        const resolvedSrc = trackSource ? (trackSource.startsWith('http') ? trackSource : (typeof getMediaUrl === 'function' ? getMediaUrl(trackSource) : trackSource)) : "";
        if (audioRef.current.srcObject) {
          audioRef.current.srcObject = null;
        }
        audioRef.current.src = resolvedSrc;
        audioRef.current.loop = false;
        audioRef.current.load();
        audioRef.current.play().catch(e => console.warn("[MOBILE GESTURE] Play failed:", e));
      }
    }

    setTracks(enrichedQueue);
    setCurrentTrackIndex(startIndex);
    setIsPlaying(true);
    if (isYT) setIsYoutubeMode(true);
    else setIsYoutubeMode(false);

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
          themeColor: rawData?.themeColor || rawData?.ThemeColor || user?.themeColor || 'rgb(var(--theme-primary))',
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

      await Promise.all([fetchUserProfile(), fetchTracks()]); // Double check sync and library tracks
      showNotification("TRANSACTION_COMPLETE", "Purchase successful! - Download Unlocked.", "success");
    } catch (error) {
      console.error("Purchase/Tip failed:", error);
      showNotification("CONNECTION_ERROR", error.response?.data?.message || "Transaction failed", "error");
    }
  };

  const handleTipArtist = (track) => {
    const artistId = track.artistId || track.ArtistId || track.userId || track.UserId;
    const artistName = track.artist || track.Artist || track.artistName || track.ArtistName || "Unknown Artist";
    if (!artistId) {
      showNotification("SYSTEM_ERROR", "Cannot identify artist for tipping transmission.", "error");
      return;
    }
    setTippingArtist({ id: artistId, name: artistName });
  };

  const handleDownload = async (track) => {
    if (!track.isOwned) {
      showNotification("ACCESS_DENIED", "You must own this track to download it.", "error");
      return;
    }
    if (!track.source) return;

    // Check if YouTube track
    const isYoutube = !!getGlobalYoutubeId(track);
    if (isYoutube) {
      await handleCache(track);
      return;
    }

    const trackDbId = track.dbId || track.id || track.Id;
    const uid = user?.id || user?.Id || 'anon';
    const localCachedKey = `cached_native_${uid}`;
    let cachedNative = JSON.parse(localStorage.getItem(localCachedKey) || "[]");

    // REMOVE CACHE IF ALREADY CACHED
    if (track.isCached) {
      showNotification("REMOVING", `Removing "${track.title}" from offline cache...`, "info");
      try {
        if ('caches' in window) {
          const audioCache = await caches.open('fatale-audio-cache');
          await audioCache.delete(track.source);
        }
        
        cachedNative = cachedNative.filter(id => String(id) !== String(trackDbId));
        localStorage.setItem(localCachedKey, JSON.stringify(cachedNative));

        setCachedTrackIds(prev => {
          const next = new Set(prev);
          if (trackDbId) next.delete(String(trackDbId));
          return next;
        });

        setTracks(prev => prev.map(t => {
          const tId = t.dbId || t.id || t.Id;
          return String(tId) === String(trackDbId) ? { ...t, isCached: false } : t;
        }));

        setLibraryTracks(prev => prev.map(t => {
          const tId = t.dbId || t.id || t.Id;
          return String(tId) === String(trackDbId) ? { ...t, isCached: false } : t;
        }));

        showNotification("REMOVED", `"${track.title}" removed from offline storage.`, "success");
        await fetchTracks();
      } catch (err) {
        console.error("Failed to delete offline cache:", err);
        showNotification("SYSTEM_ERROR", "Failed to clear offline cached track.", "error");
      }
      return;
    }

    // DOWNLOAD & CACHE DIRECTLY IN-APP SHELL
    showNotification("DOWNLOADING", `Downloading "${track.title}" directly into offline app shell...`, "info");

    try {
      // 1. Fetch file to get audio blob
      const response = await fetch(track.source);
      const blob = await response.blob();
      
      // 2. Put fetched response directly into the browser PWA Cache Storage!
      if ('caches' in window) {
        const audioCache = await caches.open('fatale-audio-cache');
        await audioCache.put(track.source, new Response(blob, {
          headers: {
            'Content-Type': blob.type || 'audio/mpeg',
            'Content-Length': String(blob.size)
          }
        }));
      }

      // 3. Persist cached status locally in localStorage
      if (trackDbId && !cachedNative.includes(String(trackDbId))) {
        cachedNative.push(String(trackDbId));
        localStorage.setItem(localCachedKey, JSON.stringify(cachedNative));
      }

      // 4. Update frontend states in real-time
      setCachedTrackIds(prev => {
        const next = new Set(prev);
        if (trackDbId) next.add(String(trackDbId));
        return next;
      });

      setTracks(prev => prev.map(t => {
        const tId = t.dbId || t.id || t.Id;
        return String(tId) === String(trackDbId) ? { ...t, isCached: true } : t;
      }));

      setLibraryTracks(prev => prev.map(t => {
        const tId = t.dbId || t.id || t.Id;
        return String(tId) === String(trackDbId) ? { ...t, isCached: true } : t;
      }));

      showNotification("DOWNLOAD_COMPLETE", `"${track.title}" is now saved in your app shell! Access it offline anytime.`, "success");
      await fetchTracks();
    } catch (error) {
      console.error("In-app download & cache failed:", error);
      showNotification("DOWNLOAD_ERROR", "Failed to cache track for offline access.", "error");
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
        .map(t => getGlobalYoutubeId(t))
        .filter(Boolean)
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

    // FIX: Use getGlobalYoutubeId to robustly detect YouTube tracks, even if source prefix is missing (e.g. search results)
    const pureYoutubeId = getGlobalYoutubeId(track);
    const isYoutube = !!pureYoutubeId;
    const isLiking = !track.isLiked;

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

    if (authData.token) {
      localStorage.setItem('token', authData.token);
      initSignalR().catch(e => console.warn('[App] Failed to init SignalR on login:', e));
    }

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
    disconnectSignalR().catch(e => console.warn('[App] Failed to disconnect SignalR on logout:', e));
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

  // Global Key Listener for App-level Modals, Navigation, and Hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape close
      if (e.key === 'Escape') {
        if (tippingArtist) { setTippingArtist(null); return; }
        if (economyTrack) { setEconomyTrack(null); return; }
        if (playlistTrackToAdd) { setPlaylistTrackToAdd(null); return; }
        if (activeView !== 'login' && activeView !== 'discovery') {
          setView('discovery');
        }
        return;
      }

      // Check if user is typing in a text field
      const isTyping = document.activeElement && (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' || 
        document.activeElement.isContentEditable
      );

      if (isTyping) return;

      // Function keys F1-F8 and Number keys 1-8 for routing (exclude F5 for browser reload)
      const routingMap = {
        '1': 'discovery', 'F1': 'discovery',
        '2': 'feed', 'F2': 'feed',
        '3': 'player', 'F3': 'player',
        '4': 'messages', 'F4': 'messages',
        '5': 'shopping', // Do not hijack F5 to allow page reload
        '6': 'wallet', 'F6': 'wallet',
        '7': 'settings', 'F7': 'settings',
        '8': 'profile', 'F8': 'profile',
      };

      const matchedView = routingMap[e.key];
      if (matchedView && activeView !== 'login') {
        e.preventDefault();
        if (matchedView === 'profile') {
          navigateToProfile(null);
        } else {
          setView(matchedView);
        }
      } else if ((e.key === '9' || e.key === 'F9') && activeView !== 'login') {
        e.preventDefault();
        const confirmExit = window.confirm("Disconnect terminal session?");
        if (confirmExit) {
          handleLogout();
        }
      } else if (e.key === 'F10' && activeView !== 'login') {
        e.preventDefault();
        setShowF10Menu(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tippingArtist, economyTrack, playlistTrackToAdd, activeView, handleLogout, navigateToProfile, setView, setShowF10Menu]);

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
    const hasFiles = postFiles && postFiles.length > 0;
    if (!hasFiles && !postText.trim()) return;
    setIsSubmittingPost(true);
    try {
      if (hasFiles) {
        const firstFile = postFiles[0];
        
        // Upload additional slides if any (indices 1 to 11)
        const additionalUrls = [];
        if (postFiles.length > 1) {
          for (let i = 1; i < postFiles.length; i++) {
            const fileData = new FormData();
            fileData.append('file', postFiles[i]);
            const uploadRes = await API.Files.upload(fileData);
            if (uploadRes && uploadRes.data && uploadRes.data.path) {
              additionalUrls.push(uploadRes.data.path);
            }
          }
        }
        
        // Package the description. If multiple slides, use JSON structure
        const finalDescriptionText = postFiles.length > 1 
          ? JSON.stringify({ text: postText, slides: additionalUrls })
          : postText;

        const defaultTitle = postText.trim() ? postText.slice(0, 20) : `VISUAL_SIGNAL_${Math.floor(Math.random() * 9000 + 1000)}`;

        const formData = new FormData();
        formData.append('File', firstFile);
        formData.append('Type', firstFile.type.startsWith('video') ? 'VIDEO' : 'PHOTO');
        formData.append('Title', defaultTitle);
        formData.append('Description', finalDescriptionText);
        formData.append('IsPosted', true);
        
        await API.Studio.upload(formData);
        showNotification("INGEST_COMPLETE", `Visual post with ${postFiles.length} slide(s) transmitted successfully.`, "success");
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
      setPostFiles([]);
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
    <div className="h-[100dvh] flex flex-col bg-[#020202] text-fatale font-mono selection:bg-fatale selection:text-black overflow-hidden">
      <ElectronTitleBar />
      <div className="flex-1 flex overflow-hidden relative">
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
        playsInline={true}
      />

      {/* PERSISTENT YOUTUBE PLAYER */}
      {/* We only render the player if we have a valid videoId to prevent internal iframe API crashes (this.g is null) */}
      <div
        style={{
          position: 'fixed',
          left: -9999,
          top: -9999,
          width: 200,
          height: 200,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        {(() => {
          const ytId = currentYtId;
          const activeYtId = ytId || "7wtfhZwyrcc";

          return (
            <YouTube
              key="global-youtube-player"
              videoId="7wtfhZwyrcc"
              onReady={(e) => {
                console.log("[YOUTUBE] Player Ready");
                setYoutubePlayer(e.target);
                if (isYoutubeMode && ytId) {
                  try {
                    e.target.setVolume(volume * 100);
                    e.target.setPlaybackRate(globalPlaybackRate);
                    const startTime = (activeStation && !isHost) ? (currentTime || 0) : 0;
                    if (isPlaying) {
                      e.target.loadVideoById({ videoId: ytId, startSeconds: startTime });
                      lastLoadedYtId.current = ytId;
                    } else {
                      e.target.cueVideoById({ videoId: ytId, startSeconds: startTime });
                      lastLoadedYtId.current = ytId;
                    }
                  } catch (err) { console.warn("YT Play onReady failure:", err); }
                }
              }}
              onStateChange={(e) => {
                console.log("[YOUTUBE] State Change:", e.data);
                // Listener in broadcast mode: useBroadcastSync owns YouTube control
                const isBroadcastListener = !!(activeStation && !isHost);
                if (e.data === 0 && !isBroadcastListener) playNext();
                if (e.data === 1) {
                  hasStartedPlayingYt.current = true;
                  // Auto-unmute if we started muted to bypass autoplay policy
                  if (e.target.isMuted && e.target.isMuted() && !isMuted) {
                    try {
                      e.target.unMute();
                      e.target.setVolume(volume * 100);
                    } catch (err) {
                      console.warn("[YOUTUBE_AUTOPLAY] Failed to unmute:", err);
                    }
                  }
                }
                // Only auto-play from state transitions in host/normal mode
                // Listeners are driven entirely by useBroadcastSync to prevent stale-track loops
                if (!isBroadcastListener && isPlaying && (e.data === 5 || e.data === -1 || (e.data === 2 && !hasStartedPlayingYt.current))) {
                  try {
                    playYtVideo(e.target);
                  } catch (err) { console.warn("Failed to autoplay on state change:", err); }
                }
              }}
              onError={(e) => {
                console.error("[YOUTUBE] Error detected:", e.data);
                // Handle private/deleted videos by skipping — only in host/normal mode
                const isBroadcastListener = !!(activeStation && !isHost);
                if (!isBroadcastListener && isPlaying && ytId) playNext();
              }}
              opts={{
                height: '1',
                width: '1',
                playerVars: {
                  autoplay: 0,
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
        {activeView === 'terms' ? (
          <TermsView
            onBack={() => {
              const hasSession = localStorage.getItem('token') && localStorage.getItem('user');
              setViewOriginal(hasSession ? 'discovery' : 'login');
            }}
          />
        ) : activeView === 'privacy' ? (
          <PrivacyView
            onBack={() => {
              const hasSession = localStorage.getItem('token') && localStorage.getItem('user');
              setViewOriginal(hasSession ? 'discovery' : 'login');
            }}
          />
        ) : activeView === 'login' ? (
          <AuthView 
             onLoginSuccess={handleAuthSuccess} 
             onBackToOrbit={() => setView('discovery')} 
             deferredPrompt={deferredPrompt}
             onInstall={handleInstallApp}
           />
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
               onTipArtist={handleTipArtist}
               onEconomyClick={setEconomyTrack}
               onPlaylistAddClick={setPlaylistTrackToAdd}
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
               appThemeColor={appThemeColor}
               setAppThemeColor={setAppThemeColor}
               appBackgroundColor={appBackgroundColor}
               setAppBackgroundColor={setAppBackgroundColor}
               setShowGlobalUpload={setShowGlobalUpload}
               setShowGlobalIngest={setShowGlobalIngest}
               setShowF10Menu={setShowF10Menu}
               setIngestMode={setIngestMode}
               setActiveStation={handleTuneInStation}
               sendMessage={handleSendMessage}
               requestTrack={handleRequestTrack}
               setUser={setUser}
               onPlayTrack={handlePlayTrack}
               onPlayTrackAtIndex={handlePlayTrackAtIndex}
               onOpenMixer={onOpenMixer}
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
               vibeFeatures={vibeFeatures}
               isHost={isHost}
               isReceivingLiveAudio={isReceivingLiveAudio}
               onEndBroadcast={handleEndBroadcast}
               onMixerStateChange={handleMixerStateChange}
               audioCtx={audioCtx.current}
               broadcastDest={broadcastDestRef.current}
               lowSpecMode={lowSpecMode}
               setLowSpecMode={setLowSpecMode}
               zoomState={zoomState}
               setZoomState={setZoomState}
               broadcastSourceType={broadcastSourceType}
               appAudioDevices={appAudioDevices}
               selectedAppDeviceId={selectedAppDeviceId}
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

      <TipArtistModal
        isOpen={!!tippingArtist}
        onClose={() => setTippingArtist(null)}
        artist={tippingArtist || {}}
        userBalance={user?.credits || 0}
        onTipSuccess={async (newBalance) => {
          if (newBalance !== undefined) {
            setUser(prev => ({ ...prev, credits: newBalance }));
          } else {
            await fetchUserProfile();
          }
        }}
        showNotification={showNotification}
      />

      <TrackEconomyModal
        isOpen={!!economyTrack}
        onClose={() => setEconomyTrack(null)}
        track={economyTrack}
        isLiveBroadcast={!!activeStation}
        userBalance={user?.credits || 0}
        onTipSuccess={async (newBalance) => {
          if (newBalance !== undefined) {
            setUser(prev => ({ ...prev, credits: newBalance }));
          } else {
            await fetchUserProfile();
          }
        }}
        onPurchase={handlePurchase}
        onDownload={handleDownload}
        showNotification={showNotification}
      />

      <PlaylistSelectModal
        isOpen={!!playlistTrackToAdd}
        onClose={() => setPlaylistTrackToAdd(null)}
        track={playlistTrackToAdd}
        playlists={userPlaylists || []}
        onRefreshPlaylists={() => fetchPlaylists()}
        showNotification={showNotification}
      />

      {/* ─── GLOBAL ACTION OVERLAY LAYER ─── */}
      <AnimatePresence>
        {/* ─── Go Live Modal ─── */}
        {showGlobalGoLive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/98 backdrop-blur-md" onClick={() => setShowGlobalGoLive(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-lg bg-systemBg border border-white/10 p-8 shadow-[0_0_100px_rgba(0,0,0,1)] rounded-sm">
              {/* HUD Elements */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-white/5 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-white/5 pointer-events-none" />

              <div className="flex justify-between items-start mb-10">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-white/5 border border-white/10 rounded-sm">
                    <div className="w-1 h-1 rounded-full bg-fatale animate-pulse shadow-[0_0_8px_rgb(var(--theme-primary))]" />
                    <span className="text-[8px] mono font-black text-white/40 tracking-[0.4em] uppercase">SIGNAL_BROADCAST_INIT</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowGlobalGoLive(false)}
                  className="text-white/20 hover:text-fatale hover:rotate-90 transition-all duration-300 transform active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>

              {activeStation && String(activeStation.artistUserId || activeStation.ArtistUserId) === String(user?.id || user?.Id) ? (
                <div className="space-y-6 text-center py-6">
                  <div className="text-[10px] font-black uppercase text-fatale tracking-widest animate-pulse">
                    [ TRANSMISSION_ACTIVE ]
                  </div>
                  <div className="text-xs font-mono text-white/80">
                    Your station is currently live: <span className="text-fatale font-black">{activeStation.sessionTitle || activeStation.SessionTitle}</span>
                  </div>
                  <div className="pt-6">
                    <button
                      onClick={handleEndBroadcast}
                      className="w-full py-4 border border-red-500 bg-red-950/20 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500 hover:text-black hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]"
                    >
                      [ END_BROADCAST ]
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">signal_metadata // title</label>
                    <input
                      type="text"
                      value={goLiveFormData.sessionTitle}
                      onChange={e => setGoLiveFormData(p => ({ ...p, sessionTitle: e.target.value }))}
                      className="w-full bg-[#050505] border border-white/5 p-4 text-white font-black outline-none focus:border-fatale/40 tracking-widest text-xs transition-all placeholder:text-white/5"
                      placeholder="establish_session_id..."
                    />
                  </div>
                  {/* Sector Allocation */}
                  <div className="space-y-1.5">
                    <div className="text-[7px] opacity-40 font-mono uppercase tracking-widest ml-1">TRANSMISSION_SECTOR // ALLOCATION</div>
                    <div className="relative">
                      <select
                        value={goLiveFormData.sectorId ?? ''}
                        onChange={e => setGoLiveFormData(p => ({ ...p, sectorId: e.target.value === '' ? null : Number(e.target.value) }))}
                        className="w-full bg-black/60 border border-fatale/20 hover:border-fatale/50 focus:border-fatale/60 p-3 text-[9px] font-mono outline-none text-white uppercase tracking-widest appearance-none cursor-pointer transition-all"
                      >
                        <option value="">ALL_SECTORS // UNALLOCATED</option>
                        {SECTORS.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDown size={12} className="text-fatale/40" />
                      </div>
                      {goLiveFormData.sectorId !== null && goLiveFormData.sectorId !== '' && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-0.5 pointer-events-none"
                          style={{ backgroundColor: SECTORS[goLiveFormData.sectorId]?.color || 'rgb(var(--theme-primary))', boxShadow: `0 0 8px ${SECTORS[goLiveFormData.sectorId]?.color || 'rgb(var(--theme-primary))'}` }}
                        />
                      )}
                    </div>
                    {goLiveFormData.sectorId !== null && goLiveFormData.sectorId !== '' && (
                      <div className="text-[7px] font-mono tracking-widest opacity-40 ml-1" style={{ color: SECTORS[goLiveFormData.sectorId]?.color }}>
                        {SECTORS[goLiveFormData.sectorId]?.desc}
                      </div>
                    )}
                  </div>

                  {/* Source Selection */}
                  <div className="space-y-1.5">
                    <div className="text-[7px] opacity-40 font-mono uppercase tracking-widest ml-1">TRANSMISSION_SOURCE // HARDWARE_LINK</div>
                    <div className="relative">
                      <select
                        value={goLiveFormData.sourceType}
                        onChange={e => setGoLiveFormData(p => ({ ...p, sourceType: e.target.value }))}
                        className="w-full bg-black/60 border border-fatale/20 hover:border-fatale/50 focus:border-fatale/60 p-3 text-[9px] font-mono outline-none text-white uppercase tracking-widest appearance-none cursor-pointer transition-all"
                      >
                        <option value="app">Direct App Deck Sync</option>
                        <option value="hardware">External Audio (Line-In/Mics/Hardware)</option>
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDown size={12} className="text-fatale/40" />
                      </div>
                    </div>
                    {goLiveFormData.sourceType === 'hardware' && (
                      <div className="space-y-1.5 mt-2">
                        <div className="text-[7px] opacity-40 font-mono uppercase tracking-widest ml-1">AUDIO_INPUT_DEVICE // CAPTURE</div>
                        <div className="relative">
                          <select
                            value={selectedAppDeviceId}
                            onChange={e => setSelectedAppDeviceId(e.target.value)}
                            className="w-full bg-black/60 border border-fatale/20 hover:border-fatale/50 focus:border-fatale/60 p-3 text-[9px] font-mono outline-none text-white uppercase tracking-widest appearance-none cursor-pointer transition-all"
                          >
                            {appAudioDevices.length === 0 ? (
                              <option value="">NO_DEVICES_FOUND // REQUESTING_PERMISSION</option>
                            ) : (
                              appAudioDevices.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>
                                  {d.label || `Device (${d.deviceId.slice(0, 5)}...)`}
                                </option>
                              ))
                            )}
                          </select>
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                            <ChevronDown size={12} className="text-fatale/40" />
                          </div>
                        </div>
                        <div className="text-[7px] font-mono tracking-widest text-fatale ml-1 mt-1 animate-pulse">
                          WARNING: EXTERNAL AUDIO SOURCE WILL CAPTURE SELECTED INPUT DEVICE
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">transmission_log // description</label>
                    <textarea
                      value={goLiveFormData.description}
                      onChange={e => setGoLiveFormData(p => ({ ...p, description: e.target.value }))}
                      className="w-full bg-[#050505] border border-white/5 p-4 text-white font-medium outline-none focus:border-fatale/20 min-h-[100px] text-[10px] resize-none transition-all placeholder:text-white/5"
                      placeholder="Optional signal details..."
                    />
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={() => handleGlobalGoLive()}
                      disabled={!goLiveFormData.sessionTitle.trim()}
                      className="w-full py-4 border border-fatale bg-fatale/10 text-fatale text-[10px] font-black uppercase tracking-widest transition-all hover:bg-fatale hover:text-black hover:shadow-[0_0_40px_rgba(var(--theme-primary-rgb),0.4)] disabled:opacity-50 disabled:shadow-none"
                    >
                      Init_Broadcast
                    </button>
                  </div>
                </div>
              )}
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

        {showGlobalIngest && ingestMode === 'JOURNAL' && (
          <JournalEditor
            entry={null}
            seriesList={globalSeriesList}
            onSave={async (saved) => {
              setShowGlobalIngest(false);
              setIngestMode('ALL');
              showNotification("LOG_COMMITTED", "Creative log entry committed successfully.", "success");
              window.location.reload();
            }}
            onClose={() => {
              setShowGlobalIngest(false);
              setIngestMode('ALL');
            }}
          />
        )}

        {/* ─── Ingest Choice Modal (NEW_POST) ─── */}
        {showGlobalIngest && ingestMode !== 'JOURNAL' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[500] flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/95 backdrop-blur-sm"
          >
            <div className="absolute inset-0" onClick={() => { setShowGlobalIngest(false); setIngestMode('ALL'); }} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="relative w-full max-w-xl text-center space-y-6 bg-black p-6 sm:p-8 border border-white/10 my-8"
            >
              <button onClick={() => { setShowGlobalIngest(false); setIngestMode('ALL'); }} className="absolute top-4 right-4 p-2 text-fatale/40 hover:text-fatale hover:rotate-90 transition-all duration-300">
                <X size={20} />
              </button>
              <div className="space-y-4">
                <p className="text-[10px] text-fatale mono uppercase tracking-[0.6em] animate-pulse">
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
                  {ingestMode !== 'JOURNAL' && (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <label className="text-[10px] text-fatale/60 uppercase tracking-widest">Media Type</label>
                              <div className="flex gap-2">
                                  <button
                                      type="button"
                                      onClick={() => { setMediaTypeSelection('PHOTO'); setPostFiles([]); }}
                                      className={`px-3 py-1 text-[8px] font-black tracking-widest border transition-all cursor-pointer ${mediaTypeSelection === 'PHOTO' ? 'border-fatale text-fatale' : 'border-white/10 text-white/40'}`}
                                  >
                                      PHOTO / SLIDESHOW
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => { setMediaTypeSelection('VIDEO'); setPostFiles([]); }}
                                      className={`px-3 py-1 text-[8px] font-black tracking-widest border transition-all cursor-pointer ${mediaTypeSelection === 'VIDEO' ? 'border-fatale text-fatale' : 'border-white/10 text-white/40'}`}
                                  >
                                      VIDEO
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => { setIngestMode('JOURNAL'); }}
                                      className="px-3 py-1 text-[8px] font-black tracking-widest border border-white/10 text-white/40 hover:border-fatale hover:text-fatale transition-all cursor-pointer"
                                  >
                                      JOURNAL / LOG
                                  </button>
                              </div>
                          </div>
                          
                          <div className="space-y-2">
                              <label className="text-[10px] text-fatale/60 uppercase tracking-widest">
                                  {mediaTypeSelection === 'PHOTO' ? 'Attach Photo Slides (Max 12)' : 'Attach Video (Single)'}
                              </label>
                              <div 
                                  onClick={() => document.getElementById('new-post-file-input').click()}
                                  className="w-full bg-[#050505] border border-dashed border-white/10 hover:border-fatale/40 p-6 text-center text-white text-xs outline-none font-mono cursor-pointer transition-all hover:bg-fatale/5 flex flex-col items-center justify-center gap-2"
                              >
                                  <Camera size={20} className="text-white/40 group-hover:text-fatale" />
                                  <span className="text-[10px] tracking-wider text-white/60">
                                      {mediaTypeSelection === 'PHOTO' ? 'ADD PHOTO SLIDE (MAX 12)' : 'SELECT VIDEO FILE'}
                                  </span>
                                  <span className="text-[8px] text-white/30">
                                      {postFiles.length > 0 ? `${postFiles.length} file(s) selected` : 'CLICK TO BROWSE FILES'}
                                  </span>
                              </div>
                              <input 
                                  id="new-post-file-input"
                                  type="file"
                                  multiple={mediaTypeSelection === 'PHOTO'}
                                  accept={mediaTypeSelection === 'PHOTO' ? 'image/*' : 'video/*'}
                                  onChange={(e) => {
                                      const selectedFiles = Array.from(e.target.files);
                                      if (mediaTypeSelection === 'VIDEO') {
                                          setPostFiles(selectedFiles.slice(0, 1));
                                      } else {
                                          setPostFiles(prev => {
                                              const combined = [...prev, ...selectedFiles];
                                              if (combined.length > 12) {
                                                  showNotification("LIMIT_EXCEEDED", "Maximum of 12 slides allowed.", "error");
                                                  return combined.slice(0, 12);
                                              }
                                              return combined;
                                          });
                                      }
                                      e.target.value = ''; // Reset so the same file can be selected again
                                  }}
                                  className="hidden"
                              />
                              
                              {/* Display Thumbnails */}
                              {postFiles.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                      <div className="text-[9px] text-fatale/60 uppercase tracking-widest font-mono">
                                          Selected Files ({postFiles.length})
                                      </div>
                                      <div className="grid grid-cols-4 gap-2">
                                          {postFiles.map((file, idx) => {
                                              const isImg = file.type.startsWith('image/');
                                              return (
                                                  <div key={idx} className="aspect-square bg-black/60 border border-white/10 relative overflow-hidden flex items-center justify-center">
                                                      {isImg ? (
                                                          <img 
                                                              src={URL.createObjectURL(file)} 
                                                              alt="" 
                                                              className="w-full h-full object-cover" 
                                                          />
                                                      ) : (
                                                          <div className="text-[8px] mono text-white/40 p-1 text-center">
                                                              VIDEO
                                                          </div>
                                                      )}
                                                      <button 
                                                          type="button"
                                                          onClick={(e) => {
                                                              e.stopPropagation();
                                                              setPostFiles(prev => prev.filter((_, i) => i !== idx));
                                                          }}
                                                          className="absolute top-1 right-1 bg-black/80 text-white hover:text-fatale p-0.5 rounded-sm z-10 cursor-pointer flex items-center justify-center w-4 h-4"
                                                      >
                                                          <X size={10} />
                                                      </button>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  <div className="space-y-2">
                      <label className="text-[10px] text-fatale/60 uppercase tracking-widest">Caption (Optional)</label>
                      <textarea 
                          value={postText}
                          onChange={(e) => setPostText(e.target.value)}
                          className="w-full bg-[#050505] border border-white/5 p-4 text-white text-xs outline-none focus:border-fatale/40 min-h-[120px] resize-none font-sans"
                          placeholder="What's on your mind?..."
                      />
                  </div>

                  <button
                      onClick={handleNewPostSubmit}
                      disabled={isSubmittingPost || postFiles.length === 0}
                      className="w-full py-4 bg-fatale/10 border border-fatale text-fatale text-[10px] font-black uppercase tracking-widest hover:bg-fatale hover:text-black transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                      {isSubmittingPost ? 'TRANSMITTING...' : 'TRANSMIT_SIGNAL'}
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── F10 Shortcut Selector Modal ─── */}
        {showF10Menu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setShowF10Menu(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-black border border-white/10 p-8 text-center space-y-6 rounded-sm shadow-[0_0_50px_rgba(var(--theme-primary-rgb),0.15)]">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-fatale" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-fatale" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-fatale" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-fatale" />

              <button onClick={() => setShowF10Menu(false)} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors">
                <X size={16} />
              </button>

              <div className="space-y-2">
                <p className="text-[10px] text-fatale/60 mono uppercase tracking-[0.4em]">:: SYSTEM_NAVIGATION ::</p>
                <h3 className="text-white font-black text-sm uppercase tracking-wider">SELECT ACTION SIGNAL</h3>
              </div>

              <div className="bg-[#0a0a0a]/50 backdrop-blur-xl border border-fatale/20 rounded-lg overflow-hidden text-left mt-4">
                <div className="p-3 bg-fatale/5 border-b border-fatale/10 flex justify-between items-center text-[10px] font-black uppercase text-white">:: TERMINAL_CMDS ::</div>
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => {
                      setShowF10Menu(false);
                      setIngestMode('ALL');
                      setShowGlobalIngest(true);
                    }}
                    className="w-full text-left p-3 text-[10px] text-fatale/80 hover:text-white hover:bg-fatale/10 border border-transparent hover:border-fatale/20 transition-all uppercase tracking-widest cursor-pointer"
                  >
                    {`> NEW_POST`}
                  </button>
                  <button
                    onClick={() => {
                      setShowF10Menu(false);
                      setShowGlobalUpload(true);
                    }}
                    className="w-full text-left p-3 text-[10px] text-fatale/80 hover:text-white hover:bg-fatale/10 border border-transparent hover:border-fatale/20 transition-all uppercase tracking-widest cursor-pointer"
                  >
                    {`> UPLOAD_TRACK`}
                  </button>
                  <button
                    onClick={() => {
                      setShowF10Menu(false);
                      setShowGlobalGoLive(true);
                    }}
                    className="w-full text-left p-3 text-[10px] text-fatale/80 hover:text-white hover:bg-fatale/10 border border-transparent hover:border-fatale/20 transition-all uppercase tracking-widest flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-fatale animate-pulse shadow-[0_0_6px_rgb(var(--theme-primary))] shrink-0" />
                    {`> GO_LIVE`}
                  </button>
                </div>
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
              broadcastSourceType={broadcastSourceType}
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
              userPlaylists={userPlaylists}
              onLike={handleLike}
              onPurchase={handlePurchase}
              onPlayPlaylist={handlePlayPlaylist}
              onFetchPlaylistTracks={handleFetchPlaylistTracks}
              onPlaybackRateChange={handlePlaybackRateChange}
              onEqA={onEqA}
              analyserA={analyserA}
              keyLockA={keyLockA}
              onKeyLockAChange={setKeyLockA}
              setTracks={setTracks}
              setCurrentTrackIndex={setCurrentTrackIndex}
              onPlayTrack={handlePlayTrack}
              user={user}
              onMicStream={setMicStream}
              onMixerStateChange={handleMixerStateChange}
              audioCtx={audioCtx.current}
              broadcastDest={broadcastDestRef.current}
              zoomState={zoomState}
              setZoomState={setZoomState}
            />

          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

// --- VISTA: LOGIN (ESTILO HACKER) ---
const LoginView = ({ onLogin }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
    className="h-screen flex flex-col items-center justify-center p-6 relative"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgb(var(--theme-primary))15_0%,_transparent_70%)] animate-pulse" />
    <div className="z-10 text-center space-y-12">
      <h1 className="text-7xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgb(var(--theme-primary))]">
        CYBER<span className="text-fatale">GOTH</span>
      </h1>
      <div className="bg-black/40 p-8 border border-fatale/20 backdrop-blur-xl rounded-2xl space-y-4">
        <button onClick={onLogin} className="w-full bg-fatale text-black font-black py-4 px-12 rounded-sm hover:bg-white transition-all shadow-[0_0_30px_rgb(var(--theme-primary))50] uppercase italic tracking-tighter">
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
  vibeFeatures,
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
  onTipArtist,
  onEconomyClick,
  onPlaylistAddClick,
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
  setShowF10Menu,
  setIngestMode,
  onExpandContent,
  appThemeColor,
  setAppThemeColor,
  appBackgroundColor,
  setAppBackgroundColor,
  volume,
  setVolume,
  isMiniPlayerMinimized,
  setIsMiniPlayerMinimized,
  onFetchPlaylistTracks,
  onPlaybackRateChange,
  onEqA,
  analyserA,
  isLandscape,
  onPlayTrack,
  onPlayTrackAtIndex,
  onOpenMixer,
  isHost,
  isReceivingLiveAudio,
  onEndBroadcast,
  onMixerStateChange,
  audioCtx,
  broadcastDest,
  lowSpecMode,
  setLowSpecMode,
  zoomState,
  setZoomState,
  broadcastSourceType,
  appAudioDevices,
  selectedAppDeviceId
}) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const currentTrack = currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // --- TUI Stats & Clock State ---
  const [cpuLoad, setCpuLoad] = useState(6);
  const [memLoad, setMemLoad] = useState(34.1);
  const [bwDownload, setBwDownload] = useState(0.04);
  const [bwUpload, setBwUpload] = useState(0.02);
  const [timeString, setTimeString] = useState('');

  // Clock effect
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeString(d.toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulated metrics reacting to play state
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuLoad(prev => {
        const targetMin = isPlaying ? 15 : 4;
        const targetMax = isPlaying ? 32 : 10;
        return Math.floor(Math.random() * (targetMax - targetMin + 1)) + targetMin;
      });

      setMemLoad(prev => {
        const offset = (Math.random() * 0.4) - 0.2;
        return parseFloat((Math.max(33.5, Math.min(35.5, prev + offset))).toFixed(1));
      });

      setBwDownload(prev => {
        if (isPlaying) {
          return parseFloat((110 + Math.random() * 110).toFixed(1));
        } else {
          return parseFloat((0.02 + Math.random() * 0.08).toFixed(2));
        }
      });

      setBwUpload(prev => {
        if (isPlaying) {
          return parseFloat((1.5 + Math.random() * 1.8).toFixed(1));
        } else {
          return parseFloat((0.01 + Math.random() * 0.03).toFixed(2));
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const buildMeter = (pct, slots = 10) => {
    const filled = Math.round((pct / 100) * slots);
    const empty = slots - filled;
    return `[${'|'.repeat(filled)}${'.'.repeat(empty)}]`;
  };


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
      root.style.setProperty('--theme-color', 'rgb(var(--theme-primary-rgb))');
      root.style.setProperty('--theme-color-rgb', 'var(--theme-primary-rgb)');
      root.style.setProperty('--text-color', 'rgb(var(--theme-primary-rgb))');
      root.style.setProperty('--text-color-rgb', 'var(--theme-primary-rgb)');
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
    <div 
      className="flex flex-col h-screen h-full w-full overflow-hidden relative tui-crt"
      style={{ backgroundColor: 'rgb(var(--theme-bg-rgb))' }}
    >


      {/* Noise Texture & Scanlines */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-0 mix-blend-screen" />
      <div className="tui-scanlines z-[1]" />

      {/* TUI Status Bar Header */}
      <div 
        className="bg-black/95 border-b border-[rgba(var(--theme-primary-rgb),0.25)] text-[10px] font-mono pb-2 px-4 flex items-center justify-between text-[var(--theme-color)]/80 shrink-0 z-45 select-none"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)'
        }}
      >
        <div className="flex items-center gap-4">
          <span className="font-black uppercase text-white tracking-widest animate-pulse">■ FATALE_SYS_v2.1</span>
          <span className="opacity-50 font-bold hidden sm:inline">|</span>
          <span className="font-bold text-[var(--theme-color)]/95 hidden sm:inline">{user?.username || 'GUEST'}@fatale.fm</span>
        </div>
        
        {/* Health Stats */}
        <div className="flex items-center gap-6 font-bold flex-wrap justify-end sm:justify-start">
          <div className="flex items-center gap-1.5">
            <span className="text-white/40 uppercase text-[8px] sm:text-[10px]">CPU</span>
            <span className="text-[var(--theme-color)] tracking-tight hidden xs:inline">{buildMeter(cpuLoad, 8)}</span>
            <span className="text-white/95 w-8 text-right text-[9px] sm:text-[10px]">{cpuLoad}%</span>
          </div>
          <div className="flex items-center gap-1.5 hidden xs:flex">
            <span className="text-white/40 uppercase text-[8px] sm:text-[10px]">MEM</span>
            <span className="text-[var(--theme-color)] tracking-tight">{buildMeter(memLoad, 8)}</span>
            <span className="text-white/95 w-8 text-right">{memLoad}%</span>
          </div>
          <div className="flex items-center gap-3 hidden sm:flex text-white/50 text-[9px]">
            <span>▲ {bwUpload} K/s</span>
            <span>▼ {bwDownload} K/s</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-white/80 font-black tracking-widest text-[9px] sm:text-[10px]">{timeString}</span>
        </div>
      </div>

      {/* Multiplexer Grid: Sidebar + Main view in TuiWindow */}
      <div className="flex-1 flex overflow-hidden relative z-10 w-full">

      {/* SIDEBAR (Escritorio) */}
      <motion.aside 
        layout
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className={`hidden ${activeView === 'discovery' ? 'lg:hidden' : 'lg:flex'} flex-col border-r border-white/5 bg-black/20 backdrop-blur-2xl z-30 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.4)] ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
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
          <SidebarLink collapsed={isSidebarCollapsed} icon={<Wallet size={isSidebarCollapsed ? 18 : 22} />} label={t('WAL_BASE')} active={activeView === 'wallet'} onClick={() => handleNav('wallet')} />
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
        <header 
          className={`lg:hidden ${activeView === 'discovery' ? 'hidden' : 'flex'} items-center justify-center px-1 border-b border-[var(--theme-color)]/10 bg-black/90 backdrop-blur-md z-40 relative`}
          style={{ 
            paddingTop: '12px',
            paddingBottom: '12px'
          }}
        >
          {activeView === 'messages' && activeMessageUser ? (
            <div className="w-full flex items-center justify-between px-4 py-3">
              <button 
                onClick={() => {
                  setActiveMessageUser(null);
                }} 
                className="p-1.5 border border-[var(--theme-color)]/20 text-white/50 hover:text-[var(--theme-color)] hover:border-[var(--theme-color)] transition-all flex items-center justify-center bg-black/40"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex flex-col items-center flex-1 mx-4 min-w-0">
                <span className="text-[10px] text-white font-black tracking-widest uppercase mono truncate max-w-full">
                  :: {activeMessageUser.isCommunity ? (activeMessageUser.name || activeMessageUser.Name) : (activeMessageUser.username || activeMessageUser.Username || activeMessageUser.title || activeMessageUser.Title)} ::
                </span>
                <span className="text-[6px] text-green-500 uppercase tracking-widest mono mt-0.5 truncate">
                  ■ {activeMessageUser.isCommunity ? 'ESTABLECIENDO CONEXIÓN' : t('STABLE_CONNECTION')}
                </span>
              </div>
              <div className="w-8" />
            </div>
          ) : (
            <div className="flex gap-[3px] sm:gap-2">
              <NavButton icon={<Radio size={20} />} active={activeView === 'discovery'} onClick={() => setView('discovery')} />
              <NavButton icon={<Hash size={20} />} active={activeView === 'feed'} onClick={() => setView('feed')} />
              <NavButton icon={<Play size={20} />} active={activeView === 'player'} onClick={() => setView('player')} />
              <NavButton icon={<ShoppingBag size={20} />} active={activeView === 'shopping'} onClick={() => setView('shopping')} />
              <NavButton icon={<MessageSquare size={20} />} active={activeView === 'messages'} onClick={() => setView('messages')} hasNotification={hasNewMessages} />
              <NavButton icon={<Wallet size={20} />} active={activeView === 'wallet'} onClick={() => setView('wallet')} />
              <NavButton icon={<User size={20} />} active={activeView === 'profile' && (!viewingUserId || String(viewingUserId) === String(user?.id || user?.Id))} onClick={() => navigateToProfile(null)} />
              <NavButton icon={<Settings size={20} />} active={activeView === 'settings'} onClick={() => setView('settings')} />
            </div>
          )}
        </header>

        {/* TUI Window Frame Wrapper */}
        <div className="flex-1 flex flex-col p-2 lg:p-3 overflow-hidden relative">
          <div className="flex-1 flex flex-col tui-panel relative overflow-hidden">
            {/* ASCII Corner Brackets */}
            <div className="absolute top-0 left-0 text-[var(--theme-color)]/60 font-mono text-[10px] select-none pointer-events-none z-50 leading-none">┌</div>
            <div className="absolute top-0 right-0 text-[var(--theme-color)]/60 font-mono text-[10px] select-none pointer-events-none z-50 leading-none">┐</div>
            <div className="absolute bottom-0 left-0 text-[var(--theme-color)]/60 font-mono text-[10px] select-none pointer-events-none z-50 leading-none">└</div>
            <div className="absolute bottom-0 right-0 text-[var(--theme-color)]/60 font-mono text-[10px] select-none pointer-events-none z-50 leading-none">┘</div>

            {/* TUI Window Header */}
            <div className="w-full border-b border-[rgba(var(--theme-primary-rgb),0.25)] bg-black/60 px-3 py-1 flex items-center justify-between text-[9px] font-mono text-[var(--theme-color)]/70 select-none shrink-0">
              <div className="flex items-center gap-1">
                <span>[</span>
                <span className="font-bold text-[var(--theme-color)] uppercase tracking-wider">
                  {activeView === 'discovery' ? 'DISCOVERY_HUD_v2.1' :
                   activeView === 'feed' ? 'FATALE_JOURNAL_FEED' :
                   activeView === 'player' ? 'LIVE_FREQUENCIES_MIXER' :
                   activeView === 'messages' ? 'ENCRYPTED_MESSAGE_SYNC' :
                   activeView === 'shopping' ? 'SUPPLY_DEPOT_MARKET' :
                   activeView === 'wallet' ? 'CREDIT_WALLET_LEDGER' :
                   activeView === 'settings' ? 'SYSTEM_CONFIGURATION' :
                   activeView === 'profile' ? 'USER_PROFILE_NODE' : 'FATALE_NODE'}
                </span>
                <span>]</span>
              </div>
              {(activeView === 'player' || activeView === 'feed') && (
                <div className="flex items-center gap-1.5 border border-[rgba(var(--theme-primary-rgb),0.3)] px-2 py-0.5 rounded bg-black/40 text-[9px] font-mono text-[var(--theme-color)] pointer-events-auto shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.1)]">
                  <span className="opacity-40 uppercase tracking-widest text-[8px] mr-1">ZOOM:</span>
                  <button 
                    type="button" 
                    onClick={() => setZoomState(z => Math.max(50, z - 10))} 
                    className="text-[var(--theme-color)]/60 hover:text-[var(--theme-color)] px-1 font-bold transition-all cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-[var(--theme-color)] font-black">{zoomState}%</span>
                  <button 
                    type="button" 
                    onClick={() => setZoomState(z => Math.min(120, z + 10))} 
                    className="text-[var(--theme-color)]/60 hover:text-[var(--theme-color)] px-1 font-bold transition-all cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* Main content viewport */}
            <div className={`flex-1 relative ${activeView === 'discovery' || activeView === 'feed' ? 'overflow-hidden' : activeView === 'messages' ? (currentTrackIndex >= 0 && !isMiniPlayerMinimized ? 'overflow-hidden lg:pb-24 pb-[60px]' : 'overflow-hidden pb-0') : activeView === 'shopping' ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar pb-24'}`}>
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
                  onFollowUpdate={onFollowUpdate}
                  navigateToProfile={navigateToProfile}
                  onMessageCommunity={(c) => { setActiveMessageUser({...c, isCommunity: true}); setView('messages'); }}
                  onPlayTrack={onPlayTrack}
                  onPlayPlaylist={(list, startIdx = 0) => handlePlayPlaylist(list, startIdx, false)}
                  onExpandContent={onExpandContent}
                  setUser={setUser}
                  onPlayStation={(station) => {
                    setActiveStation(station);
                    showNotification("RADIO_LINK_ESTABLISHED", `SIGNAL_LOCKED: ${station.sessionTitle || station.SessionTitle || station.name}`, "success");
                  }}
                  isPlayerActive={currentTrackIndex >= 0 && !isMiniPlayerMinimized}
                  setShowGlobalIngest={setShowGlobalIngest}
                  setShowF10Menu={setShowF10Menu}
                  setIngestMode={setIngestMode}
                  onLogout={onLogout}
                  hasNewMessages={hasNewMessages}
                  lowSpecMode={lowSpecMode}
                />
              </motion.div>
            )}
            {activeView === 'shopping' && (
              <motion.div
                key="shopping-wrapper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className={`w-full h-full ${currentTrackIndex >= 0 && !isMiniPlayerMinimized ? 'pb-[100px] lg:pb-24' : 'pb-0'}`}
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
                <SettingsView 
                  user={user} 
                  setUser={setUser} 
                  appThemeColor={appThemeColor} 
                  setAppThemeColor={setAppThemeColor} 
                  appBackgroundColor={appBackgroundColor} 
                  setAppBackgroundColor={setAppBackgroundColor} 
                  lowSpecMode={lowSpecMode}
                  setLowSpecMode={setLowSpecMode}
                />
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
                  onSendMessage={sendMessage}
                  activeStation={activeStation} 
                  stationChat={stationChat} 
                  stationQueue={stationQueue} 
                  followedCommunities={followedCommunities} 
                  setShowGlobalGoLive={setShowGlobalGoLive}
                  setShowGlobalUpload={setShowGlobalUpload}
                  setShowGlobalIngest={setShowGlobalIngest}
                  setShowF10Menu={setShowF10Menu}
                  onExpandContent={onExpandContent}
                  libraryTracks={libraryTracks}
                  onEndBroadcast={onEndBroadcast}
                  zoomState={zoomState}
                  broadcastSourceType={broadcastSourceType}
                  appAudioDevices={appAudioDevices}
                  selectedAppDeviceId={selectedAppDeviceId}
                  isPlaying={isPlaying}
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
                  onDownload={onDownload}
                  onTipArtist={onTipArtist}
                  navigateToProfile={navigateToProfile}
                  onPlayPlaylist={handlePlayPlaylist}
                  onPlayTrack={onPlayTrack}
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
                  currentTrack={currentTrack}
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
                  vibeFeatures={vibeFeatures}
                  onPlayTrack={onPlayTrack}
                  onPlayTrackAtIndex={onPlayTrackAtIndex}
                  onMixerStateChange={onMixerStateChange}
                  audioCtx={audioCtx}
                  broadcastDest={broadcastDest}
                  zoomState={zoomState}
                  setZoomState={setZoomState}
                />
              </motion.div>
            )}
            {activeView === 'messages' && (
              <MessagesView 
                key="messages" 
                user={user} 
                navigateToProfile={navigateToProfile} 
                initialChatUser={activeMessageUser} 
                isMiniPlayerActive={currentTrackIndex >= 0 && !isMiniPlayerMinimized} 
                onChatChange={setActiveMessageUser}
              />
            )}

          </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.main>
      </div>



      {/* MINI PLAYER (Todas las vistas excepto Player, y solo si hay track o station) */}
      <AnimatePresence>
        {activeView !== 'player' && (currentTrackIndex >= 0 || activeStation) && (
          // Hide mini player on mobile if viewing profile to avoid crowding/overlap
          !(window.innerWidth < 1024 && activeView === 'profile') && (
            <MiniPlayer
              key={isMiniPlayerMinimized ? 'minimized' : 'expanded'}
              track={currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null}
              activeStation={activeStation}
              isHost={isHost}
              isPlaying={isPlaying}
              onTogglePlay={togglePlay}
              onNext={handleNext}
              onPrev={handlePrev}
              onLike={onLike}
              onTipArtist={onTipArtist}
              onEconomyClick={onEconomyClick}
              onPlaylistAddClick={onPlaylistAddClick}
              user={user}
              playlists={playlists}
              onDownload={onDownload}
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
              onOpenMixer={onOpenMixer}
              isReceivingLiveAudio={isReceivingLiveAudio}
            />
          )
        )}
      </AnimatePresence>



      {/* TUI Footer Legend */}
      <div className="bg-black/95 border-t border-[rgba(var(--theme-primary-rgb),0.25)] text-[9px] font-mono p-1 px-4 flex items-center justify-between text-[var(--theme-color)]/60 select-none shrink-0 z-45 h-6">
        <div className="flex items-center gap-1 sm:gap-3 overflow-x-auto no-scrollbar">
          <span className="cursor-pointer hover:text-white" onClick={() => handleNav('discovery')}><span className="text-[var(--theme-color)] font-bold">F1</span>:SCAN</span>
          <span className="text-white/20">|</span>
          <span className="cursor-pointer hover:text-white" onClick={() => handleNav('feed')}><span className="text-[var(--theme-color)] font-bold">F2</span>:FEED</span>
          <span className="text-white/20">|</span>
          <span className="cursor-pointer hover:text-white" onClick={() => handleNav('player')}><span className="text-[var(--theme-color)] font-bold">F3</span>:PLAYER</span>
          <span className="text-white/20">|</span>
          <span className="cursor-pointer hover:text-white" onClick={() => handleNav('messages')}><span className="text-[var(--theme-color)] font-bold">F4</span>:MESSAGES</span>
          <span className="text-white/20">|</span>
          <span className="cursor-pointer hover:text-white" onClick={() => handleNav('shopping')}><span className="text-[var(--theme-color)] font-bold">F5</span>:DEPOT</span>
          <span className="text-white/20">|</span>
          <span className="cursor-pointer hover:text-white" onClick={() => handleNav('wallet')}><span className="text-[var(--theme-color)] font-bold">F6</span>:WALLET</span>
          <span className="text-white/20">|</span>
          <span className="cursor-pointer hover:text-white" onClick={() => handleNav('settings')}><span className="text-[var(--theme-color)] font-bold">F7</span>:CONFIG</span>
          <span className="text-white/20">|</span>
          <span className="cursor-pointer hover:text-white" onClick={() => handleNav('profile', true)}><span className="text-[var(--theme-color)] font-bold">F8</span>:USER</span>
          <span className="text-white/20">|</span>
          <span className="cursor-pointer hover:text-white" onClick={onLogout}><span className="text-[var(--theme-color)] font-bold">F9</span>:EXIT</span>
          <span className="text-white/20">|</span>
          <span className="cursor-pointer hover:text-white" onClick={() => { setIngestMode('ALL'); setShowGlobalIngest(true); }}><span className="text-[var(--theme-color)] font-bold">F10</span>:POST</span>
        </div>
        <div className="hidden md:block text-[8px] text-white/30 tracking-widest font-black uppercase">
          FATALE CORE NODE v2.1
        </div>
      </div>
    </div>
  );
});

// --- MINI PLAYER COMPONENT ---
const MiniPlayer = ({ track, activeStation, isHost, isPlaying, onTogglePlay, onNext, onPrev, onLike, onTipArtist, onExpand, activeView, isMuted, onToggleMute, currentTime, duration, isSidebarCollapsed, volume, setVolume, isMinimized, onToggleMinimize, isBroadcasting, onOpenMixer, isReceivingLiveAudio, user, playlists, onDownload, onEconomyClick, onPlaylistAddClick }) => {
  const isMessages = activeView === 'messages';

  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] lg:bottom-8 right-4 lg:right-4 p-4 lg:p-2 cursor-pointer group/min z-[100] transition-all`}
        onClick={onToggleMinimize}
        title="EXPAND_PLAYER"
      >
        {/* Subtle HUD bracket holding the crosshair */}
        <div className="absolute bottom-2 right-2 lg:bottom-1 lg:right-1 w-4 h-4 border-b border-r border-fatale/20 group-hover/min:border-fatale/60 transition-colors pointer-events-none" />
        
        {/* The minimal plus crosshair */}
        <Plus size={16} strokeWidth={2.5} className="relative z-10 text-fatale group-hover/min:drop-shadow-[0_0_8px_rgb(var(--theme-primary))] transition-all group-active/min:scale-90" />
      </motion.div>
    );
  }

  const isMobile = window.innerWidth < 1024;
  const sidebarWidthClass = activeView === 'discovery'
    ? 'lg:left-4'
    : (isSidebarCollapsed ? 'lg:left-[6.5rem]' : 'lg:left-[17.5rem]');

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`fixed bottom-0 lg:bottom-8 transition-all duration-500 backdrop-blur-3xl z-[100] ${isMessages
        ? 'border-t border-white/5 lg:border lg:border-white/10 lg:rounded-sm lg:shadow-none'
        : `border-t border-white/5 lg:border lg:border-white/10 shadow-[0_-15px_50px_rgba(0,0,0,0.8)] lg:shadow-[0_10px_60px_-15px_rgba(var(--theme-primary-rgb),0.15)] ${
            activeView === 'discovery' 
              ? 'lg:left-1/2 lg:-translate-x-1/2 lg:right-auto lg:w-full lg:max-w-[700px] lg:rounded-full' 
              : `left-0 right-0 ${sidebarWidthClass} lg:right-4 lg:rounded-md`
          }`
        } group/player overflow-hidden flex ${isMobile ? 'flex-col gap-2.5 p-3' : `flex-row items-center gap-3 p-1.5 lg:py-1.5 ${activeView === 'discovery' ? 'lg:pl-8 lg:pr-14' : 'lg:px-3'}`}`}
      style={{
        backgroundColor: 'rgba(var(--theme-bg-rgb), 0.95)',
        paddingBottom: isMobile ? 'calc(10px + env(safe-area-inset-bottom, 12px))' : undefined,
        bottom: isMobile ? '0px' : undefined
      }}
    >
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-fixed mix-blend-screen" />

      {/* Cyberpunk HUD Corner Brackets (Desktop) */}
      {activeView !== 'discovery' && (
        <>
          <div className="hidden lg:block absolute top-0 left-0 w-3 h-3 border-t border-l border-fatale/40 pointer-events-none" />
          <div className="hidden lg:block absolute top-0 right-0 w-3 h-3 border-t border-r border-fatale/40 pointer-events-none" />
          <div className="hidden lg:block absolute bottom-0 left-0 w-3 h-3 border-b border-l border-fatale/40 pointer-events-none" />
          <div className="hidden lg:block absolute bottom-0 right-0 w-3 h-3 border-b border-r border-fatale/40 pointer-events-none" />
        </>
      )}

      {/* --- MINIMIZE TOGGLE (Top Right) --- */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}
        className={`absolute z-50 p-1 text-white/80 hover:text-fatale transition-all group/minitoggle scale-75 lg:scale-100 ${
          activeView === 'discovery' ? 'top-1/2 -translate-y-1/2 right-6' : 'top-1 right-2'
        }`}
        title="MINIMIZE_PLAYER"
      >
        <Minus size={14} className="group-hover/minitoggle:translate-y-0.5 transition-transform" />
      </button>

      {/* Track Info (Click to expand) */}
      <div className={`flex items-center gap-3 lg:gap-3 flex-1 cursor-pointer group/info min-w-0 z-10 relative ${isMobile ? 'w-full pr-6' : ''}`} onClick={onExpand}>
        <div className={`w-10 h-10 lg:w-8 lg:h-8 rounded-sm border flex items-center justify-center relative overflow-hidden shrink-0 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.5)] ${isMessages ? 'bg-black border-white/5' : 'bg-[#0a0a0a] border-white/10 group-hover/info:border-fatale/50 group-hover/info:shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.2)]'}`}>
          {activeStation ? (
            <Radio size={14} className={`transition-all duration-500 z-10 relative text-fatale`} />
          ) : track?.cover || track?.thumbnail ? (
            <img src={track.cover || track.thumbnail} alt="Cover" className="w-full h-full object-cover filter brightness-[0.7] contrast-[1.2] saturate-[0.8] group-hover/info:filter-none transition-all duration-500 z-10 relative" />
          ) : (
            <Music size={14} className={`transition-all duration-500 z-10 relative ${isMessages ? 'text-white/50' : 'text-fatale/40 group-hover/info:text-fatale group-hover/info:drop-shadow-[0_0_8px_rgb(var(--theme-primary))]'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col justify-center gap-0.5">
          <h4 className={`text-[11px] lg:text-[11px] font-black uppercase truncate transition-colors leading-none tracking-wide ${isMessages ? 'text-white' : 'text-white group-hover/info:text-transparent group-hover/info:bg-clip-text group-hover/info:bg-gradient-to-r group-hover/info:from-white group-hover/info:to-fatale'}`}>
            {activeStation ? activeStation.stationName || `Station ${activeStation.stationId}` : track?.title || 'No Track'}
          </h4>
          <p className={`text-[9px] lg:text-[9px] font-bold uppercase truncate tracking-widest leading-none flex items-center gap-2 ${isMessages ? 'text-white/40' : 'text-fatale/50 group-hover/info:text-fatale/90'}`}>
            {activeStation ? (
              <>
                {isReceivingLiveAudio ? (
                  <span className="text-[8px] px-1 py-[1px] bg-fatale text-black rounded-sm animate-pulse whitespace-nowrap font-black">
                    ▶ LIVE AUDIO
                  </span>
                ) : (
                  <span className="text-[8px] px-1 py-[1px] bg-fatale/20 text-fatale rounded-sm animate-pulse whitespace-nowrap">
                    [ TUNED_IN ]
                  </span>
                )}
                <span className="truncate">LIVE: {activeStation.hostName || activeStation.artistName || activeStation.ArtistName || 'Host'}</span>
              </>
            ) : (
              track?.artist || track?.artistName || track?.ArtistName || 'Unknown'
            )}
          </p>
          {!activeStation && track?.isBroadcast && (
            <span className="text-[7px] font-black text-fatale border border-fatale/30
                            px-1 uppercase tracking-widest animate-pulse ml-1 w-max mt-0.5">
              LIVE
            </span>
          )}
        </div>
      </div>

      {isMobile ? (
        <div className="flex items-center justify-between w-full z-10 relative px-1 border-t border-white/5 pt-2">
          {/* Controls */}
          <div className="flex items-center gap-5 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="text-white/70 hover:text-white hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all">
              <SkipBack size={16} fill="currentColor" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
              className={`w-9 h-9 flex items-center justify-center rounded-sm border transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.4)] ${isMessages 
                ? 'bg-transparent border-white/40 text-white hover:border-white/80' 
                : 'bg-white/10 border-white/30 text-white hover:bg-fatale/20 hover:border-fatale/70'}`}
            >
              {isPlaying ? (
                <Pause size={15} fill="currentColor" className="drop-shadow-[0_0_8px_currentColor]" />
              ) : (
                <Play size={15} fill="currentColor" className="drop-shadow-[0_0_8px_currentColor]" />
              )}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-white/70 hover:text-white hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all">
              <SkipForward size={16} fill="currentColor" />
            </button>

            {isBroadcasting && (
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenMixer(); }}
                className="p-1.5 bg-fatale/10 border border-fatale/30 text-fatale rounded-sm hover:bg-fatale hover:text-black transition-all"
                title="OPEN_MIXER_CONSOLE"
              >
                <Radio size={14} className="animate-pulse" />
              </button>
            )}
          </div>

          {/* Extra Actions */}
          <div className="flex items-center gap-5 shrink-0">
            <button
              className="group/tip relative w-8 h-8 flex items-center justify-center rounded-sm bg-black border border-white/10 hover:border-[#00ff00]/60 transition-all duration-300 font-mono font-black overflow-hidden shadow-lg"
              title="Economy Terminal"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (activeStation) {
                  onEconomyClick?.({
                    title: activeStation.stationName || `Station ${activeStation.stationId}`,
                    artist: activeStation.hostName || activeStation.artistName || activeStation.ArtistName || 'Host',
                    artistId: activeStation.hostUserId || activeStation.HostUserId || activeStation.hostId || activeStation.HostId || activeStation.artistId || activeStation.ArtistId || activeStation.userId || activeStation.UserId,
                  });
                } else if (track) {
                  onEconomyClick?.(track);
                } else {
                  alert("No active track is currently playing.");
                }
              }}
            >
              <div className="absolute inset-0 bg-[#00ff00]/10 opacity-0 group-hover/tip:opacity-100 transition-opacity" />
              <span className="text-white/40 group-hover/tip:text-[#00ff00] group-hover/tip:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all relative z-10 text-xs pl-0.5">$</span>
            </button>

            <Heart
              size={16}
              className={`cursor-pointer transition-all duration-300 ${track?.isLiked ? 'text-fatale fill-fatale drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.8)]' : 'text-white/20 hover:text-fatale hover:drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.5)]'}`}
              onClick={(e) => { e.stopPropagation(); onLike && onLike(track); }}
            />

            {track && !activeStation && (
              <button
                className="group/add relative w-8 h-8 flex items-center justify-center rounded-sm bg-black border border-white/10 hover:border-fatale/60 transition-all duration-300 font-mono font-black overflow-hidden shadow-lg"
                title="Add to Playlist"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onPlaylistAddClick?.(track);
                }}
              >
                <div className="absolute inset-0 bg-fatale/10 opacity-0 group-hover/add:opacity-100 transition-opacity" />
                <Plus size={15} className="text-white/40 group-hover/add:text-fatale group-hover/add:drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.8)] transition-all relative z-10" />
              </button>
            )}

            <div onClick={(e) => { e.stopPropagation(); onToggleMute && onToggleMute(); }} className="cursor-pointer py-1">
              {isMuted || volume === 0 ? (
                <VolumeX size={17} className="text-fatale drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.5)]" />
              ) : (
                <Volume2 size={17} className="text-white/30 hover:text-fatale hover:drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.6)] transition-all duration-300" />
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Controls - Desktop */}
          <div className="flex items-center gap-3 lg:gap-4 px-2 lg:px-4 shrink-0 z-10 relative">
            <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="text-white/70 hover:text-white hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all">
              <SkipBack size={14} fill="currentColor" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
              className={`w-8 h-8 lg:w-8 lg:h-8 flex items-center justify-center rounded-sm border transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.4)] ${isMessages 
                ? 'bg-transparent border-white/40 text-white hover:border-white/80' 
                : 'bg-white/10 border-white/30 text-white hover:bg-fatale/20 hover:border-fatale/70 hover:shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.3)]'}`}
            >
              {isPlaying ? (
                <Pause size={14} fill="currentColor" className="drop-shadow-[0_0_8px_currentColor]" />
              ) : (
                <Play size={14} fill="currentColor" className="drop-shadow-[0_0_8px_currentColor]" />
              )}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-white/70 hover:text-white hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all">
              <SkipForward size={14} fill="currentColor" />
            </button>

            {isBroadcasting && (
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenMixer(); }}
                className="ml-2 p-1.5 bg-fatale/10 border border-fatale/30 text-fatale rounded-sm hover:bg-fatale hover:text-black transition-all shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.2)]"
                title="OPEN_MIXER_CONSOLE"
              >
                <Radio size={14} className="animate-pulse" />
              </button>
            )}
          </div>

          {/* Extra Actions - Desktop */}
          <div className="flex items-center gap-5 lg:gap-8 px-4 lg:pl-8 z-10 relative">
            <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            
            <button
              className="group/tip relative w-8 h-8 flex items-center justify-center rounded-sm bg-black border border-white/10 hover:border-[#00ff00]/60 transition-all duration-300 font-mono font-black overflow-hidden shadow-lg"
              title="Economy Terminal"
              onClick={(e) => { 
                e.stopPropagation(); 
                if (activeStation) {
                  onEconomyClick?.({
                    title: activeStation.stationName || `Station ${activeStation.stationId}`,
                    artist: activeStation.hostName || activeStation.artistName || activeStation.ArtistName || 'Host',
                    artistId: activeStation.hostUserId || activeStation.HostUserId || activeStation.hostId || activeStation.HostId || activeStation.artistId || activeStation.ArtistId || activeStation.userId || activeStation.UserId,
                  });
                } else if (track) {
                  onEconomyClick?.(track);
                } else {
                  alert("No active track is currently playing.");
                }
              }}
            >
              <div className="absolute inset-0 bg-[#00ff00]/10 opacity-0 group-hover/tip:opacity-100 transition-opacity" />
              <span className="text-white/40 group-hover/tip:text-[#00ff00] group-hover/tip:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all relative z-10 text-xs pl-0.5">$</span>
            </button>

            <Heart
              size={18}
              className={`cursor-pointer transition-all duration-300 ${track?.isLiked ? 'text-fatale fill-fatale drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.8)]' : 'text-white/20 hover:text-fatale hover:drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.5)]'}`}
              onClick={(e) => { e.stopPropagation(); onLike && onLike(track); }}
            />

            {track && !activeStation && (
              <button
                className="group/add relative w-8 h-8 flex items-center justify-center rounded-sm bg-black border border-white/10 hover:border-fatale/60 transition-all duration-300 font-mono font-black overflow-hidden shadow-lg"
                title="Add to Playlist"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onPlaylistAddClick?.(track);
                }}
              >
                <div className="absolute inset-0 bg-fatale/10 opacity-0 group-hover/add:opacity-100 transition-opacity" />
                <Plus size={16} className="text-white/40 group-hover/add:text-fatale group-hover/add:drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.8)] transition-all relative z-10" />
              </button>
            )}

            <div className="flex items-center gap-3 group/vol pr-2 relative">
              <div onClick={(e) => { e.stopPropagation(); onToggleMute && onToggleMute(); }} className="cursor-pointer py-2">
                {isMuted || volume === 0 ? (
                  <VolumeX size={18} className="text-fatale drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.5)]" />
                ) : (
                  <Volume2 size={18} className="text-white/30 group-hover/vol:text-fatale group-hover/vol:drop-shadow-[0_0_8px_rgba(var(--theme-primary-rgb),0.6)] transition-all duration-300" />
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
                  className="w-full h-[3px] bg-white/10 rounded-full appearance-none cursor-pointer accent-fatale outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                />
              </div>
            </div>
          </div>
        </>
      )}
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
    <div className={`group/node relative ${depth > 0 ? 'ml-3 sm:ml-6 mt-3 sm:mt-4 pl-3 sm:pl-4 border-l border-fatale/20' : ''}`}>
      {depth > 0 && (
        <div className="absolute top-5 left-0 w-2 sm:w-4 h-[1px] bg-fatale/20 -translate-x-full" />
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
            <span className={depth > 0 ? 'text-secondary' : 'text-fatale font-black'}>
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
                  className="text-fatale hover:text-white transition-colors opacity-100 font-black"
                >
                  [ REPLY ]
                </button>
              )}
            </div>
          </div>

          <div className={`border bg-black/40 group-hover/comment:border-fatale/40 transition-colors p-3 relative ${comment.IsOperator ? 'border-amber-400/30 shadow-[0_0_15px_rgba(251,191,36,0.05)]' : 'border-white/10'}`}>
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
  setShowF10Menu,
  onExpandContent,
  libraryTracks,
  onEndBroadcast,
  onSendMessage,
  zoomState = 100,
  broadcastSourceType,
  appAudioDevices,
  selectedAppDeviceId,
  isPlaying
}) => {
  const { language } = useLanguage();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [allCommunities, setAllCommunities] = useState([]);
  // Mobile slide-up panel
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState('filters'); // 'filters' | 'favorites' | 'stations'
  const [feedFilter, setFeedFilter] = useState('ALL');
  const [expandedAlbums, setExpandedAlbums] = useState({});
  const [carouselIndices, setCarouselIndices] = useState({});
  const [sidebarSector, setSidebarSector] = useState(null);
  const [listenerChatInput, setListenerChatInput] = useState('');

  useEffect(() => {
    API.Communities.getAll().then(res => setAllCommunities(res.data || [])).catch(() => { });
  }, []);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = feedFilter === 'FOLLOWING'
        ? await API.Feed.getFollowingFeed()
        : await API.Feed.getGlobalFeed();
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
        SeriesId: item.seriesId ?? item.SeriesId,
        ChapterNumber: item.chapterNumber ?? item.ChapterNumber,
        SeriesTitle: item.seriesTitle || item.SeriesTitle,
        SeriesCoverImagePath: item.seriesCoverImagePath || item.SeriesCoverImagePath,
        ContentFormat: item.contentFormat || item.ContentFormat,
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
  }, [feedFilter]);

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
      case 'track': return 'text-fatale';
      case 'studio': return 'text-secondary';
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
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="flex flex-col lg:flex-row h-full font-mono relative"
      style={{
        zoom: zoomState ? zoomState / 100 : 1,
        transition: 'zoom 0.15s ease-out'
      }}
    >

      {/* Izquierda: Acciones */}
      <div className="hidden lg:block w-72 p-6 space-y-6 border-r border-fatale/5 relative z-20">
        <div className="bg-[#0a0a0a]/50 backdrop-blur-xl border border-fatale/20 rounded-lg overflow-hidden">
          <div className="p-3 bg-fatale/5 border-b border-fatale/10 flex justify-between items-center text-[10px] font-black uppercase text-white">:: TERMINAL_CMDS :: <ChevronDown size={14} /></div>
          <div className="p-4 space-y-1">
            <button onClick={() => setShowGlobalIngest(true)} className="w-full text-left p-2 text-[10px] text-fatale/80 hover:text-white hover:bg-[rgb(var(--theme-primary))10] transition-all uppercase tracking-widest">{`> NEW_POST`} </button>
            <button onClick={() => setShowGlobalUpload(true)} className="w-full text-left p-2 text-[10px] text-fatale/80 hover:text-white hover:bg-fatale/5 transition-all uppercase tracking-widest">{`> UPLOAD_TRACK`} </button>
            <button onClick={() => setShowGlobalGoLive(true)} className="w-full text-left p-2 text-[10px] text-fatale/80 hover:text-white hover:bg-fatale/5 transition-all uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-fatale animate-pulse shadow-[0_0_6px_rgb(var(--theme-primary))] shrink-0" />
              {`> GO_LIVE`}
            </button>
          </div>
        </div>



        <div className="space-y-4 px-2">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black uppercase text-secondary tracking-widest">:: COMMUNITY_LINKS ::</h3>
            {selectedCommunityId !== null && (
              <button
                onClick={() => setSelectedCommunityId(null)}
                className="text-[8px] text-secondary/40 hover:text-secondary uppercase tracking-tighter blink"
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
                      ? 'bg-secondary/10 border-secondary/30'
                      : 'bg-black/20 border-white/5 hover:border-secondary/20'}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-1 h-1 rounded-full shadow-[0_0_5px_currentColor] shrink-0" style={{ backgroundColor: sectorColor, color: sectorColor }} />
                      <span className={`text-[9px] font-bold uppercase tracking-widest truncate ${String(selectedCommunityId) === String(cid) ? 'text-white' : 'text-white/40'}`}>
                        {comm.name.replace(' ', '_')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isMemberBadge && (
                        <span className="text-[7px] font-black text-secondary/60 border border-secondary/30 px-1 rounded-sm bg-secondary/5">MEMBER</span>
                      )}
                      {String(selectedCommunityId) === String(cid) && <Zap size={10} className="text-secondary animate-pulse" />}
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
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-fatale/20 z-50 overflow-hidden" style={{ zIndex: 100 }}>
            <motion.div
              className="h-full bg-fatale shadow-[0_0_10px_rgb(var(--theme-primary))]"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            />
          </div>
        )}

        {/* ── MOBILE HEADER / RELOAD CONTAINER ── */}
        <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-fatale/10 px-4 py-2 flex items-center justify-between gap-4 shrink-0">


          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em]">{`TERMINAL_FEED_STREAM_V3`}</span>
            <div className="w-24 h-px bg-fatale/10 border-t border-dashed border-fatale/20" />
          </div>

          <div className="flex items-center gap-1">
            {['ALL', 'FOLLOWING'].map(f => (
              <button
                key={f}
                onClick={() => setFeedFilter(f)}
                className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest border transition-all ${
                  feedFilter === f
                    ? 'border-fatale/60 bg-fatale/10 text-fatale'
                    : 'border-white/5 text-white/20 hover:text-white/40'
                }`}
              >
                [{f}]
              </button>
            ))}
          </div>
         {/* Mobile Actions */}
<div className="flex lg:hidden items-center gap-1 ml-auto">
  <button
    onClick={() => { setMobilePanelTab('actions'); setMobilePanelOpen(true); }}
    className="w-7 h-7 flex items-center justify-center border border-white/10 text-white/40 hover:text-fatale hover:border-fatale/40 transition-all rounded-sm"
    title="Quick Actions"
  >
    <Plus size={16} />
  </button>
  {(liveStations || []).length > 0 && (
    <button
      onClick={() => { setMobilePanelTab('stations'); setMobilePanelOpen(true); }}
      className="flex items-center gap-1 px-2 py-1 border bg-fatale/10 border-fatale/40 text-fatale text-[8px] font-black uppercase tracking-widest transition-all"
    >
      <span className="w-1 h-1 rounded-full bg-fatale animate-pulse shrink-0" />
      {liveStations.length} LIVE
    </button>
  )}
</div>

<div className="bg-black/60 backdrop-blur-sm p-1 rounded-sm border border-fatale/10 shrink-0">
  <RefreshCw
    size={16}
    className={`text-fatale/60 hover:text-fatale cursor-pointer transition-colors ${loading ? 'animate-spin' : ''}`}
    onClick={fetchFeed}
  />
</div>
</div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-1 flex flex-col justify-start pb-32">
          {/* ── MOBILE LIVE STATIONS STRIP (horizontal scroll, only when live) ── */}
          {(liveStations || []).length > 0 && (
            <div className="lg:hidden -mx-6 px-4 mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1 h-1 rounded-full bg-fatale animate-pulse" />
                <span className="text-[8px] font-black text-fatale/60 uppercase tracking-widest">LIVE_FREQ</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {(liveStations || []).map((station, idx) => {
                  const sc = SECTORS[station.sectorId ?? station.SectorId]?.color || 'rgb(var(--theme-primary))';
                  const isActive = activeStation && String(activeStation.id || activeStation.Id) === String(station.id || station.Id);
                  return (
                    <button
                      key={station.id || idx}
                      onClick={() => setActiveStation(station)}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-sm shrink-0 transition-all ${
                        isActive
                          ? 'border-fatale/60 bg-fatale/10'
                          : 'border-white/10 bg-black/40 hover:border-white/30'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: sc, boxShadow: `0 0 5px ${sc}` }} />
                      <div className="text-left min-w-0">
                        <div className="text-[9px] font-black uppercase text-white truncate max-w-[110px]">{station.sessionTitle || station.SessionTitle}</div>
                        <div className="text-[7px] font-mono text-white/30 uppercase truncate max-w-[110px]">{station.artistName || station.ArtistName}</div>
                      </div>
                      {isActive && <Radio size={9} className="text-fatale animate-pulse shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedSector !== null && (
            <div className="mb-6 p-4 bg-fatale/5 border border-fatale/20 rounded flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-fatale shadow-[0_0_10px_rgb(var(--theme-primary))] animate-pulse" />
                <div>
                  <div className="text-[10px] font-black text-fatale tracking-[0.3em] uppercase">FREQ // {SECTORS[selectedSector].name.replace(' ', '_')}</div>
                  <div className="text-[8px] text-white/30 uppercase tracking-widest">{SECTORS[selectedSector].desc}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSector(null)}
                className="px-3 py-1 border border-fatale/30 text-fatale text-[8px] font-black uppercase hover:bg-fatale hover:text-black transition-all"
              >
                DISCONNECT_LINK
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <div className="text-[10px] text-fatale blink uppercase tracking-[0.4em]">Deciphering Signal Packets...</div>
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
                  <div className="text-[10px] text-fatale uppercase tracking-[0.4em]">
                    {selectedSector !== null ? `-- NO_SIGNALS_IN_SECTOR --` : (selectedCommunityId !== null ? `-- NO_COMMUNITY_SIGNALS --` : `-- NO_SIGNALS_DETECTED --`)}
                  </div>
                </div>
              ) : (
                <>
                  {selectedCommunityId !== null && (
                    <div className="mb-6 p-4 bg-secondary/5 border border-secondary/20 rounded flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_10px_rgb(var(--theme-secondary))] animate-pulse" />
                        <div>
                          <div className="text-[10px] font-black text-secondary tracking-[0.3em] uppercase">LINK // {allCommunities.find(c => String(c.id) === String(selectedCommunityId))?.name.toUpperCase().replace(' ', '_')}</div>
                          <div className="text-[8px] text-white/30 uppercase tracking-widest">Community signal link established.</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCommunityId(null)}
                        className="px-3 py-1 border border-secondary/30 text-secondary text-[8px] font-black uppercase hover:bg-secondary hover:text-black transition-all"
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

                    const isUrl = (str) => {
                      if (!str) return false;
                      const trimmed = str.trim().toLowerCase();
                      const checkStr = trimmed.includes('|') ? trimmed.split('|')[0] : trimmed;
                      return checkStr.startsWith('http://') || checkStr.startsWith('https://') || checkStr.startsWith('www.');
                    };

                    const isMarketplace = type === 'studio' && isUrl(content);

                    const getPostAccent = () => {
                      if (isMarketplace) return { color: '#ffaa00', glow: 'rgba(255, 170, 0, 0.18)' };
                      if (type === 'track' || type === 'album') return { color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.18)' };
                      if (type === 'studio') return { color: 'rgb(var(--theme-primary))', glow: 'rgba(var(--theme-primary-rgb), 0.18)' };
                      if (type === 'journal') return { color: '#9d00ff', glow: 'rgba(157, 0, 255, 0.18)' };
                      return { color: '#ffffff', glow: 'rgba(255, 255, 255, 0.08)' };
                    };
                    const accent = getPostAccent();

                    // Parse name, price, link, desc
                    let parsedName = title || '';
                    let parsedPrice = null;
                    let parsedLink = '';
                    let parsedDesc = '';
                    let itemSlides = [imageUrl].filter(Boolean);
                    let studioText = content || title || '';

                    if (isMarketplace) {
                      const rawTitle = title || '';
                      const priceMatch = rawTitle.match(/(.*)\s*\[([^\]]+)\]$/);
                      if (priceMatch) {
                        parsedName = priceMatch[1].trim();
                        parsedPrice = priceMatch[2].trim();
                      }
                      
                      const desc = content || '';
                      let rawDescText = desc;
                      if (desc.includes('|')) {
                        const parts = desc.split('|');
                        parsedLink = parts[0].trim();
                        rawDescText = parts.slice(1).join('|').trim();
                      } else {
                        parsedLink = desc.trim();
                        rawDescText = '';
                      }
                      
                      try {
                        if (rawDescText.trim().startsWith('{')) {
                          const parsed = JSON.parse(rawDescText);
                          parsedDesc = parsed.text || '';
                          if (parsed.slides && Array.isArray(parsed.slides)) {
                            itemSlides = [imageUrl, ...parsed.slides].filter(Boolean);
                          }
                        } else {
                          parsedDesc = rawDescText;
                        }
                      } catch (e) {
                        parsedDesc = rawDescText;
                      }
                    } else if (type === 'studio') {
                      const descriptionTextRaw = content || '';
                      try {
                        if (descriptionTextRaw.trim().startsWith('{')) {
                          const parsed = JSON.parse(descriptionTextRaw);
                          studioText = parsed.text || '';
                          if (parsed.slides && Array.isArray(parsed.slides)) {
                            itemSlides = [imageUrl, ...parsed.slides].filter(Boolean);
                          }
                        }
                      } catch (e) {
                        // ignore
                      }
                    }

                    const formatPriceDisplay = (p) => {
                      if (!p) return '';
                      const cleaned = p.replace(/[\[\]]/g, '').trim();
                      if (cleaned.toUpperCase() === 'FREE' || cleaned.toUpperCase() === 'GRATIS') {
                        return cleaned.toUpperCase();
                      }
                      if (!isNaN(cleaned) && !cleaned.startsWith('$') && !cleaned.startsWith('€') && !cleaned.startsWith('£')) {
                        return `$${cleaned}`;
                      }
                      return cleaned;
                    };

                    if (isMarketplace) {
                      return (
                        <div key={item.Id} className="group hover:-translate-y-1 transition-all duration-300 hover:bg-white/[0.05] py-2 px-3 sm:py-4 sm:px-5 rounded border border-white/5 hover:border-white/10 relative mb-3 sm:mb-6 max-w-2xl mx-auto w-full bg-black/20 flex flex-col max-h-[80vh]" style={{ boxShadow: `0 12px 24px -4px ${accent.glow}` }}>
                          {!isOriginal && repostedBy && (
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <Repeat size={10} className="text-fatale animate-pulse" />
                              <span className="text-[8px] font-black text-fatale uppercase tracking-[0.2em] bg-fatale/5 px-2 border border-fatale/20">
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
                                      className="text-[12px] text-white font-black uppercase tracking-tighter hover:text-fatale transition-colors"
                                    >
                                      {artist}
                                    </button>
                                    <span className="text-[9px] text-white/40">{getTime(createdAt)}</span>
                                    <span className="text-[7px] text-[#00f0ff] uppercase tracking-wider font-mono px-1.5 py-0.5 bg-[#00f0ff]/5 border border-[#00f0ff]/20 rounded-sm">
                                      {language === 'es' ? 'PRODUCTO' : 'PRODUCT'}
                                    </span>
                                </div>
                                <div className="text-[11px] text-white/90 leading-relaxed mt-1 flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white uppercase">{parsedName}</span>
                                  {parsedPrice && (
                                    <span className="text-[#00f0ff] font-mono text-[9px]">
                                      [{formatPriceDisplay(parsedPrice)}]
                                    </span>
                                  )}
                                </div>
                            </div>
                          </div>

                          <div className="mt-1 space-y-3">
                            {parsedDesc && (
                              <div className="text-[11px] text-white/80 leading-relaxed font-mono px-1">
                                {parsedDesc}
                              </div>
                            )}

                            <div
                              onClick={() => handleMediaExpand(item)}
                              className="w-full flex-1 bg-black border border-white/5 overflow-hidden group/studio cursor-zoom-in relative active:scale-[0.98] transition-transform flex items-center justify-center max-h-[45vh] rounded-sm"
                            >
                              {mediaType === 'VIDEO' ? (
                                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden w-full h-full">
                                  {item.ThumbnailUrl ? (
                                    <div className="absolute inset-0 z-0">
                                      <img src={getMediaUrl(item.ThumbnailUrl)} className="w-full h-full object-cover opacity-60" alt="" />
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

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (parsedLink) {
                                  let cleanLink = parsedLink.trim();
                                  if (!cleanLink.startsWith('http://') && !cleanLink.startsWith('https://')) {
                                    cleanLink = 'https://' + cleanLink;
                                  }
                                  window.open(cleanLink, '_blank');
                                }
                              }}
                              className="w-full bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/10 hover:border-white/20 py-2 text-[9px] font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-1.5 rounded-sm cursor-pointer"
                            >
                              <ExternalLink size={10} />
                              {language === 'es' ? 'IR A LA TIENDA' : 'VISIT STORE'}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={item.Id} className="group hover:-translate-y-1 transition-all duration-300 hover:bg-white/[0.05] py-2 px-3 sm:py-4 sm:px-5 rounded border border-white/5 hover:border-white/10 relative mb-3 sm:mb-6 max-w-2xl mx-auto w-full bg-black/20 flex flex-col max-h-[80vh]" style={{ boxShadow: `0 12px 24px -4px ${accent.glow}` }}>
                        {!isOriginal && repostedBy && (
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <Repeat size={10} className="text-fatale animate-pulse" />
                            <span className="text-[8px] font-black text-fatale uppercase tracking-[0.2em] bg-fatale/5 px-2 border border-fatale/20">
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
                                    className="text-[12px] text-white font-black uppercase tracking-tighter hover:text-fatale transition-colors"
                                  >
                                    {artist}
                                  </button>
                                  <span className="text-[9px] text-white/40">{getTime(createdAt)}</span>
                              </div>
                              <div className="text-[11px] text-white/90 leading-relaxed mt-0.5">
                                {type === 'track' && `Uploaded track "${title}"`}
                                {type === 'album' && <>Released album <span className="text-[#00f0ff] font-black">{title}</span></>}
                                {type === 'studio' && (studioText || title)}
                                {type === 'journal' && (
                                  item.SeriesTitle ? (
                                    <>Released Chapter {item.ChapterNumber || 1} of <span className="text-[#9b5de5] font-black">{item.SeriesTitle.toUpperCase()}</span></>
                                  ) : (
                                    title ? `Logged entry: "${title}"` : 'Logged a new entry'
                                  )
                                )}
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
                                  <Music size={20} className="text-fatale/40" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-white font-black uppercase truncate group-hover/track:text-fatale transition-colors">{title}</div>
                              </div>
                              <div className="w-8 h-8 rounded border border-white/10 flex items-center justify-center text-white/40 group-hover/track:bg-white/10 group-hover/track:text-white transition-all shadow-md">
                                <Play size={14} fill="currentColor" className="drop-shadow-[0_0_5px_currentColor]" />
                              </div>
                            </div>
                          )}

                          {type === 'album' && (() => {
                            const albumKey = item.Id;
                            const isExpanded = !!expandedAlbums[albumKey];
                            const albumColor = '#00f0ff';
                            const albumImageUrl = getMediaUrl(item.imageUrl || item.ImageUrl || item.tracks?.[0]?.coverImageUrl || item.tracks?.[0]?.CoverImageUrl || item.tracks?.[0]?.imageUrl || item.tracks?.[0]?.ImageUrl);
                            return (
                              <div className="rounded-sm border border-[#00f0ff]/20 overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.05)] max-w-md">
                                {/* Album cover + header */}
                                <div className="flex items-center gap-3 p-3 bg-black/60 border-b border-[#00f0ff]/10">
                                  <div className="w-14 h-14 rounded-sm overflow-hidden shrink-0 border border-[#00f0ff]/20 flex items-center justify-center bg-black">
                                    {albumImageUrl ? (
                                      <img src={albumImageUrl} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                      <Music size={22} className="text-[#00f0ff]/40" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[8px] font-mono text-[#00f0ff]/50 uppercase tracking-widest mb-0.5">ALBUM // {item.tracks?.length || 0} TRACKS</div>
                                    <div className="text-[12px] font-black uppercase text-white truncate leading-tight">{title}</div>
                                    <div className="text-[9px] text-[#00f0ff]/60 uppercase tracking-widest truncate">{item.Artist || item.artist}</div>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setExpandedAlbums(prev => ({ ...prev, [albumKey]: !prev[albumKey] })); }}
                                    className="w-8 h-8 flex items-center justify-center border border-[#00f0ff]/20 text-[#00f0ff]/60 hover:border-[#00f0ff]/60 hover:text-[#00f0ff] transition-all rounded-sm shrink-0"
                                    title={isExpanded ? 'COLLAPSE' : 'EXPAND'}
                                  >
                                    <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                  </button>
                                </div>

                                {/* Tracklist dropdown */}
                                {isExpanded && (
                                  <div className="divide-y divide-[#00f0ff]/5 max-h-64 overflow-y-auto no-scrollbar">
                                    {(item.tracks || []).map((track, idx) => {
                                      const tImg = getMediaUrl(track.coverImageUrl || track.CoverImageUrl || track.imageUrl || track.ImageUrl || albumImageUrl);
                                      return (
                                        <div
                                          key={track.Id || track.id || idx}
                                          onClick={(e) => { e.stopPropagation(); handleTrackPlay(track); }}
                                          className="flex items-center gap-3 px-3 py-2.5 bg-black/40 hover:bg-[#00f0ff]/5 cursor-pointer group/titem transition-all"
                                        >
                                          <div className="text-[9px] font-mono text-[#00f0ff]/30 w-4 shrink-0 text-right">{idx + 1}</div>
                                          <div className="w-8 h-8 rounded-sm overflow-hidden shrink-0 border border-white/5 flex items-center justify-center bg-black">
                                            {tImg ? (
                                              <img src={tImg} className="w-full h-full object-cover opacity-70 group-hover/titem:opacity-100 transition-opacity" alt="" />
                                            ) : (
                                              <Music size={12} className="text-[#00f0ff]/30" />
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-black uppercase text-white/90 truncate group-hover/titem:text-[#00f0ff] transition-colors">{track.Title || track.title}</div>
                                          </div>
                                          <div className="w-6 h-6 rounded-sm border border-[#00f0ff]/10 flex items-center justify-center text-[#00f0ff]/30 group-hover/titem:border-[#00f0ff]/50 group-hover/titem:text-[#00f0ff] transition-all">
                                            <Play size={10} fill="currentColor" />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Collapsed preview — first track play */}
                                {!isExpanded && item.tracks?.length > 0 && (
                                  <div
                                    onClick={(e) => { e.stopPropagation(); handleTrackPlay(item.tracks[0]); }}
                                    className="flex items-center gap-3 px-3 py-2 bg-black/20 hover:bg-[#00f0ff]/5 cursor-pointer group/preview transition-all"
                                  >
                                    <Play size={10} fill="currentColor" className="text-[#00f0ff]/40 group-hover/preview:text-[#00f0ff] transition-colors" />
                                    <span className="text-[9px] font-mono text-white/30 group-hover/preview:text-white/60 transition-colors uppercase tracking-widest">
                                      {item.tracks[0]?.Title || item.tracks[0]?.title}
                                      {item.tracks.length > 1 && ` +${item.tracks.length - 1} more`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {type === 'studio' && (
                            <div
                              className="w-full flex-1 bg-black border border-white/5 overflow-hidden group/studio relative flex items-center justify-center max-h-[50vh]"
                            >
                              {mediaType === 'VIDEO' ? (
                                <div onClick={() => handleMediaExpand(item)} className="relative aspect-video bg-black flex items-center justify-center overflow-hidden cursor-zoom-in active:scale-[0.98] transition-transform w-full h-full">
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
                                <div className="relative w-full h-full flex items-center justify-center">
                                  {itemSlides.length > 1 && (
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        const currentIdx = carouselIndices[item.Id] || 0;
                                        setCarouselIndices(prev => ({
                                          ...prev,
                                          [item.Id]: (currentIdx === 0 ? itemSlides.length - 1 : currentIdx - 1)
                                        }));
                                      }}
                                      className="absolute left-2 z-20 p-1 bg-black/60 border border-white/10 hover:border-fatale/60 text-white/70 hover:text-white transition-all flex items-center justify-center rounded-sm cursor-pointer"
                                    >
                                      <ChevronLeft size={12} />
                                    </button>
                                  )}

                                  <img 
                                    onClick={() => handleMediaExpand(item)}
                                    src={getMediaUrl(itemSlides[carouselIndices[item.Id] || 0])} 
                                    className="max-w-full max-h-[50vh] object-contain opacity-90 group-hover/studio:opacity-100 transition-opacity cursor-zoom-in active:scale-[0.98]" 
                                    alt="" 
                                  />

                                  {itemSlides.length > 1 && (
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        const currentIdx = carouselIndices[item.Id] || 0;
                                        setCarouselIndices(prev => ({
                                          ...prev,
                                          [item.Id]: (currentIdx === itemSlides.length - 1 ? 0 : currentIdx + 1)
                                        }));
                                      }}
                                      className="absolute right-2 z-20 p-1 bg-black/60 border border-white/10 hover:border-fatale/60 text-white/70 hover:text-white transition-all flex items-center justify-center rounded-sm cursor-pointer"
                                    >
                                      <ChevronRight size={12} />
                                    </button>
                                  )}

                                  {itemSlides.length > 1 && (
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/85 border border-white/15 px-2 py-0.5 text-[8px] mono text-white/70 z-20 select-none">
                                      [ SLIDE {(carouselIndices[item.Id] || 0) + 1} / {itemSlides.length} ]
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {type === 'journal' && (
                            <div className="border-l-2 border-[#9b5de5]/50 pl-4 pr-4 py-2.5 text-white/95 text-[11px] leading-relaxed max-w-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all rounded-r flex gap-4 items-start">
                              {(item.SeriesCoverImagePath || item.seriesCoverImagePath) ? (
                                <div className="w-14 h-20 bg-black border border-white/10 shrink-0 relative overflow-hidden rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(155,93,229,0.15)] group-hover:border-[#9b5de5]/40 transition-colors">
                                  <img 
                                    src={getMediaUrl(item.SeriesCoverImagePath || item.seriesCoverImagePath)} 
                                    className="w-full h-full object-cover" 
                                    alt="" 
                                  />
                                </div>
                              ) : item.SeriesTitle ? (
                                <div className="w-14 h-20 bg-[#9b5de5]/5 border border-[#9b5de5]/20 shrink-0 relative overflow-hidden rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(155,93,229,0.05)] text-[#9b5de5]/40">
                                  <BookOpen size={20} />
                                </div>
                              ) : null}
                              
                              <div className="flex-1 min-w-0">
                                {title && (
                                  <div className="text-[9px] font-black uppercase tracking-[0.15em] text-[#9b5de5] font-mono mb-2 italic flex items-center justify-between gap-2">
                                    <span>{`// LOG_ENTRY: ${title}`}</span>
                                    {item.ChapterNumber && (
                                      <span className="not-italic text-[7px] bg-[#9b5de5]/10 border border-[#9b5de5]/30 px-1.5 py-0.5 rounded text-[#9b5de5]">
                                        CH. {item.ChapterNumber}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="text-white/90">
                                  {(() => {
                                    const plainText = (content || '').replace(/<[^>]*>/g, ' ').trim();
                                    const previewText = plainText.length > 180 ? `${plainText.substring(0, 180)}...` : plainText;
                                    return (
                                      <>
                                        <span>{previewText}</span>
                                        <button
                                          onClick={() => handleMediaExpand({ ...item, type: 'JOURNAL' })}
                                          className="ml-2 text-[#9b5de5] hover:text-white font-black uppercase text-[9px] tracking-widest transition-colors not-italic font-mono inline-block cursor-pointer"
                                        >
                                          [ READ ]
                                        </button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-6 text-[9px] font-black text-white/60 uppercase pt-2">
                            <button
                              onClick={() => handleFeedLike(item)}
                              className={`flex items-center gap-1.5 transition-all group/social ${item.IsLiked ? 'text-fatale' : 'hover:text-fatale'}`}
                            >
                              <Heart size={12} fill={item.IsLiked ? "currentColor" : "none"} className={item.IsLiked ? 'scale-110' : 'group-hover/social:scale-110'} />
                              <span className="tracking-tighter">LIKE_{item.LikeCount || 0}</span>
                            </button>
                            <button
                              onClick={() => setReplyingTo(item)}
                              className="flex items-center gap-1.5 hover:text-fatale transition-colors group/social"
                            >
                              <MessageSquare size={12} className="group-hover/social:scale-110" />
                              <span className="tracking-tighter">REPLY_{item.CommentCount || 0}</span>
                            </button>
                            <button
                              onClick={() => handleFeedRepost(item)}
                              className={`flex items-center gap-1.5 transition-all group/social ${item.IsReposted ? 'text-fatale' : 'hover:text-fatale'}`}
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
                className="w-full max-w-2xl hud-panel border border-fatale/30 rounded-sm overflow-hidden shadow-[0_0_100px_rgba(var(--theme-primary-rgb),0.1)] relative"
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
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-fatale/40 z-[105]" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-fatale/40 z-[105]" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-fatale/40 z-[105]" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-fatale/40 z-[105]" />

                {/* Diagnostic Corners (Hidden on Mobile) */}
                <div className="hidden sm:flex absolute top-12 left-2 flex-col gap-1 z-[105] opacity-20 pointer-events-none font-mono">
                  <div className="text-[5px] text-fatale">LAT: 35.6895° N</div>
                  <div className="text-[5px] text-fatale">LNG: 139.6917° E</div>
                  <div className="text-[5px] text-fatale">ENC: RSA-4096</div>
                </div>
                <div className="hidden sm:flex absolute top-12 right-2 flex-col items-end gap-1 z-[105] opacity-20 pointer-events-none font-mono">
                  <div className="text-[5px] text-fatale">PKT_LOSS: 0.00%</div>
                  <div className="text-[5px] text-fatale">BUFFER: 1024KB</div>
                  <div className="text-[5px] text-fatale">SYNC: ESTABLISHED</div>
                </div>

                <div className="px-5 py-3 border-b border-fatale/20 flex justify-between items-center bg-fatale/10 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-fatale animate-pulse shadow-[0_0_15px_rgb(var(--theme-primary))]" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-white tracking-[0.4em] drop-shadow-[0_0_8px_rgb(var(--theme-primary))]">SIGNAL_INTERCEPT_V2.5</span>
                      <span className="text-[6px] font-mono text-fatale/60 tracking-[0.2em] -mt-0.5">UPLINK_STABLE // PORT_AUTH_8080</span>
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-fatale/40 hover:text-fatale transition-all hover:rotate-90">
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 relative max-h-[85vh] overflow-y-auto no-scrollbar">
                  {/* Target Signal Header */}
                  <div className="bg-[#050505] border-l-2 border-fatale p-4 relative group/target">
                    <div className="absolute top-0 right-0 p-1 px-3 text-[7px] font-black uppercase tracking-[0.2em] bg-fatale/10 text-fatale">SOURCE_NODE_CAPTURED</div>
                    <div className="text-[9px] text-fatale/80 font-black uppercase mb-1 tracking-widest">{replyingTo.Artist}</div>
                    <div className="text-[11px] text-white/90 leading-relaxed font-mono italic">
                      "{replyingTo.Title || replyingTo.Content}"
                    </div>
                  </div>

                  {/* Packet Stream (Comment Thread) */}
                  <div className="space-y-8 pb-4">
                    {loadingComments ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-4 border border-white/5 bg-white/[0.02]">
                        <RefreshCw className="animate-spin text-fatale" size={24} />
                        <span className="text-[10px] text-fatale animate-pulse tracking-[0.5em]">HANDSHAKING_ENCRYPTED_SIGNAL...</span>
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
                          <button onClick={() => setReplyingToComment(null)} className="text-fatale hover:text-white ml-2 transition-colors">
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
                        className="w-full h-24 bg-black border border-white/10 focus:border-fatale/50 p-4 text-[11px] text-white outline-none resize-none font-mono placeholder:text-white/5 transition-all"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      {/* Input Area Diagnostics (Hidden on Mobile) */}
                      <div className="hidden sm:flex flex-between items-center gap-4 flex-1">
                        <div className="flex flex-col gap-1">
                          <span className="text-[7px] text-fatale/60 font-mono">ENCRYPTION: AES-256-GCM_V2</span>
                          <span className="text-[7px] text-white/20 font-mono">SIG_ID: {replyingTo.Id} // PKT_TYPE: {replyingTo.Type?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 border-b border-fatale/10 border-dashed mx-4 mb-2" />
                      </div>

                      <button
                        onClick={submitComment}
                        disabled={isSubmittingComment || !commentText.trim()}
                        className="w-full sm:w-auto px-8 py-2.5 bg-fatale/10 border border-fatale/40 text-fatale text-[10px] font-black uppercase tracking-[0.3em] hover:bg-fatale hover:text-black hover:shadow-[0_0_30px_rgba(var(--theme-primary-rgb),0.3)] transition-all disabled:opacity-20 text-center"
                      >
                        {isSubmittingComment ? 'TRANSMITTING...' : '[ POST_COMMENT ]'}
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
          <div className="absolute inset-0 bg-[repeating-linear-gradient(rgba(var(--theme-primary-rgb),0.1)_0px,transparent_1px,rgba(var(--theme-primary-rgb),0.1)_2px)] bg-[length:100%_3px]" />
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
            className="lg:hidden fixed inset-x-0 bottom-0 z-[200] bg-black border-t-2 border-fatale/30 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] max-h-[70vh] flex flex-col"
          >
            {/* Drag handle + header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-fatale/10 shrink-0">
              <div className="flex gap-2">
                {[
                  ['actions', <Plus size={10} key="p" />, 'NEW'],
                  ['stations', <Radio size={10} key="r" />, `LIVE${(liveStations||[]).length > 0 ? ` (${liveStations.length})` : ''}`],
                ].map(([tab, icon, label]) => (
                  <button
                    key={tab}
                    onClick={() => setMobilePanelTab(tab)}
                    className={`flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-widest border rounded-sm transition-all ${mobilePanelTab === tab
                      ? 'border-fatale/50 bg-fatale/10 text-fatale'
                      : 'border-white/5 text-white/30 hover:text-white/60'
                      } ${tab === 'stations' && (liveStations||[]).length > 0 ? 'border-fatale/20' : ''}`}
                  >
                    {tab === 'stations' && (liveStations||[]).length > 0
                      ? <span className="w-1 h-1 rounded-full bg-fatale animate-pulse shrink-0" />
                      : icon}
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setMobilePanelOpen(false)}
                className="text-fatale/40 hover:text-fatale hover:rotate-90 transition-all duration-300 p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable panel content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

             {/* ── TAB: ACTIONS ── */}
{mobilePanelTab === 'actions' && (
  <div className="space-y-3 pt-1">
    <button
      onClick={() => { setShowGlobalIngest(true); setMobilePanelOpen(false); }}
      className="w-full px-4 py-4 border border-white/10 bg-black/20 hover:border-fatale/40 hover:bg-fatale/5 text-white/60 hover:text-white transition-all rounded-sm text-left"
    >
      <div className="text-[10px] font-black uppercase tracking-widest">New Post</div>
      <div className="text-[7px] font-mono text-white/20 uppercase tracking-widest mt-0.5">Journal · Photo · Video</div>
    </button>
    <button
      onClick={() => { setShowGlobalUpload(true); setMobilePanelOpen(false); }}
      className="w-full px-4 py-4 border border-white/10 bg-black/20 hover:border-fatale/40 hover:bg-fatale/5 text-white/60 hover:text-white transition-all rounded-sm text-left"
    >
      <div className="text-[10px] font-black uppercase tracking-widest">Upload Track</div>
      <div className="text-[7px] font-mono text-white/20 uppercase tracking-widest mt-0.5">MP3 · WAV · FLAC</div>
    </button>

    {/* Community filter */}
    {(() => {
      const userCommId = user?.communityId || user?.CommunityId;
      const memberIdStr = userCommId ? String(userCommId) : null;
      const followedIds = (followedCommunities || []).map(id => String(id));
      const uniqueLinks = Array.from(new Set([...(memberIdStr ? [memberIdStr] : []), ...followedIds])).filter(Boolean);
      if (uniqueLinks.length === 0) return null;
      return (
        <div className="space-y-2 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[9px] font-black uppercase text-secondary tracking-widest">:: COMMUNITY_LINKS ::</h3>
            {selectedCommunityId !== null && (
              <button onClick={() => { setSelectedCommunityId(null); setMobilePanelOpen(false); }} className="text-[8px] text-secondary/40 hover:text-secondary uppercase tracking-tighter">[ RESET ]</button>
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
                    ? 'bg-secondary/10 border-secondary/30 text-white'
                    : 'bg-black/20 border-white/5 text-white/40 hover:border-secondary/20'
                    }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sectorColor }} />
                    <span className="font-bold uppercase tracking-widest truncate">{comm.name.replace(' ', '_')}</span>
                  </div>
                  {isMember && <span className="text-[7px] font-black text-secondary/60 border border-secondary/30 px-1 rounded-sm bg-secondary/5 shrink-0">MEMBER</span>}
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
                  <h3 className="text-[9px] font-black uppercase text-fatale tracking-widest">:: LIVE_FAVORITES ::</h3>
                  <div className="px-3 py-8 border border-dashed border-white/5 rounded text-center opacity-20">
                    <div className="text-[8px] uppercase tracking-widest">MÓDULO PENDIENTE</div>
                  </div>
                </div>
              )}

              {/* ── TAB: LIVE STATIONS ── */}
              {mobilePanelTab === 'stations' && (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-[9px] font-black uppercase text-fatale tracking-widest flex items-center gap-1.5">
        <Radio size={10} className="animate-pulse" /> LIVE_STATIONS
      </h3>
      <button
        onClick={() => { setShowGlobalGoLive(true); setMobilePanelOpen(false); }}
        className="flex items-center gap-1 px-2 py-1 bg-fatale/10 border border-fatale/30 text-fatale text-[8px] font-black uppercase tracking-widest hover:bg-fatale hover:text-black transition-all rounded-sm"
      >
        <span className="w-1 h-1 rounded-full bg-current animate-pulse" /> GO_LIVE
      </button>
    </div>

    <div className="space-y-1">
      <div className="text-[7px] font-mono text-white/20 uppercase tracking-widest">TRANSMISSION_SECTOR // FILTER</div>
      <div className="relative">
        <select
          value={selectedSector ?? ''}
          onChange={e => setSelectedSector(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full bg-black/60 border border-fatale/20 hover:border-fatale/40 p-2.5 text-[9px] font-mono outline-none text-white uppercase tracking-widest appearance-none cursor-pointer transition-all"
        >
          <option value="">ALL_SECTORS</option>
          {SECTORS.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
          <ChevronDown size={10} className="text-fatale/40" />
        </div>
      </div>
    </div>

    <div className="space-y-1.5">
      {(() => {
        const filtered = (liveStations || []).filter(s =>
          selectedSector === null || s.sectorId === selectedSector || s.SectorId === selectedSector
        );
        if (filtered.length === 0) return (
          <div className="py-8 border border-dashed border-white/5 text-center">
            <Radio size={20} className="mx-auto mb-2 text-fatale/10" />
            <div className="text-[8px] font-mono uppercase tracking-widest text-white/10">NO_ACTIVE_FREQUENCIES_DETECTED</div>
          </div>
        );
        return filtered.map((station, idx) => {
          const sc = SECTORS[station.sectorId ?? station.SectorId]?.color || 'rgb(var(--theme-primary))';
          const isActive = activeStation && String(activeStation.id || activeStation.Id) === String(station.id || station.Id);
          return (
            <button
              key={station.id || idx}
              onClick={() => { setActiveStation(station); setMobilePanelOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 border text-left transition-all rounded-sm ${isActive ? 'border-fatale/60 bg-fatale/10' : 'border-white/5 bg-black/20 hover:border-white/20'}`}
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: sc, boxShadow: `0 0 6px ${sc}` }} />
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-black uppercase text-white truncate">{station.sessionTitle || station.SessionTitle}</div>
                <div className="text-[7px] font-mono text-white/30 uppercase truncate">{station.artistName || station.ArtistName}</div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                {isActive && <Radio size={10} className="text-fatale animate-pulse" />}
                <span className="text-[6px] font-mono uppercase tracking-widest px-1 border rounded-sm" style={{ color: sc, borderColor: `${sc}30`, backgroundColor: `${sc}10` }}>
                  {SECTORS[station.sectorId ?? station.SectorId]?.name || 'FREQ'}
                </span>
              </div>
            </button>
          );
        });
      })()}
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
      <div className="hidden xl:block w-80 p-6 space-y-8 bg-black border-l border-fatale/5 relative z-10 overflow-y-auto no-scrollbar">
        {activeStation && (String(activeStation.artistUserId || activeStation.ArtistUserId) === String(user?.id || user?.Id)) && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 pb-3 border-b border-fatale/20">
              <div className="w-2 h-2 rounded-full bg-fatale animate-pulse shadow-[0_0_10px_rgb(var(--theme-primary))]" />
              <h3 className="text-[10px] font-black uppercase text-fatale tracking-[0.3em]">BROADCASTING_PANEL</h3>
            </div>

            {broadcastSourceType === 'hardware' && (
              <div className="p-4 border border-fatale/20 bg-black/45 space-y-3 rounded-sm font-mono text-[9px] relative overflow-hidden">
                <div className="absolute top-0 right-0 px-1.5 py-0.5 bg-fatale/10 text-fatale text-[7px] font-bold border-l border-b border-fatale/20 uppercase tracking-widest animate-pulse">
                  MIC_LINK_ACTIVE
                </div>
                <div className="text-white/40 uppercase tracking-wider text-[8px]">HARDWARE_INPUT_STATUS</div>
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-fatale/30 bg-fatale/5 animate-pulse text-fatale shrink-0">
                    <span className="absolute inset-0 rounded-full border border-fatale/10 animate-ping" />
                    🎙
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-white font-bold truncate">
                      {appAudioDevices && selectedAppDeviceId 
                        ? (appAudioDevices.find(d => d.deviceId === selectedAppDeviceId)?.label || 'Selected Input Device')
                        : 'Default Input Interface'}
                    </div>
                    <div className="text-fatale/60 text-[7px] uppercase tracking-widest">
                      STREAM STATUS: {isPlaying ? 'TRANSMITTING' : 'MUTED / PAUSED'}
                    </div>
                  </div>
                </div>
                
                {/* Audio Level Visualizer */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[7px] text-white/30 uppercase tracking-widest">
                    <span>SIGNAL LEVEL</span>
                    <span>{isPlaying ? 'ACTIVE' : 'SILENT'}</span>
                  </div>
                  <div className="h-6 flex items-end gap-[2px] bg-black/80 p-1 border border-fatale/10 rounded-sm overflow-hidden">
                    {/* Animated equalizer bars for the DJ */}
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-fatale transition-all duration-75"
                        style={{
                          height: isPlaying ? `${Math.floor(Math.random() * 85) + 15}%` : '5%',
                          opacity: isPlaying ? 0.8 : 0.2,
                          animation: isPlaying ? `bounceVisualizer ${0.4 + (i % 5) * 0.15}s ease-in-out infinite alternate` : 'none',
                          animationDelay: `${i * 0.03}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mini Chat */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[8px] font-bold text-white/40 uppercase tracking-widest">
                <span>COMM_LINK</span>
                <span className="text-fatale/40">ENCRYPTED</span>
              </div>
              <div className="h-48 bg-black/40 border border-fatale/10 rounded-sm p-3 font-mono text-[9px] overflow-y-auto custom-scrollbar space-y-2">
                {stationChat && stationChat.length > 0 ? stationChat.map((msg, idx) => (
                  <div key={idx} className="break-words">
                    <span className="text-fatale font-bold">[{msg.username}]</span> <span className="text-white/80">{msg.message}</span>
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
                  <div key={idx} className="p-2 border border-fatale/10 bg-black/60 flex justify-between items-center group hover:border-fatale/40 transition-all">
                    <div className="min-w-0">
                      <div className="text-[9px] font-bold text-white truncate">{req.trackTitle}</div>
                      <div className="text-[7px] text-fatale/60 font-mono">FROM: {req.username}</div>
                    </div>
                    <button
                      onClick={() => onPlayPlaylist && onPlayPlaylist([{ id: req.trackId, title: req.trackTitle, artist: 'REQUEST' }], 0)}
                      className="w-6 h-6 rounded-full border border-fatale/20 flex items-center justify-center text-fatale hover:bg-fatale hover:text-black transition-all"
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

            <div className="pt-4 border-t border-fatale/10 space-y-2">
              <button
                onClick={onEndBroadcast}
                className="w-full py-2 bg-red-950/20 border border-red-500/40 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all"
              >
                [ END_BROADCAST ]
              </button>
              <button
                onClick={() => setView('player')}
                className="w-full py-2 bg-fatale/10 border border-fatale/40 text-fatale text-[9px] font-black uppercase tracking-widest hover:bg-fatale hover:text-black transition-all"
              >
                [ OPEN_FULL_DASHBOARD ]
              </button>
            </div>
          </div>
        )}

        {/* ── LISTENER MODE (tuned in, not host) ── */}
        {activeStation && (String(activeStation.artistUserId || activeStation.ArtistUserId) !== String(user?.id || user?.Id)) && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="border border-fatale/30 rounded-sm overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-fatale/10 border-b border-fatale/20">
                <div className="w-1.5 h-1.5 rounded-full bg-fatale animate-pulse shadow-[0_0_8px_rgb(var(--theme-primary))]" />
                <span className="text-[9px] font-black uppercase text-fatale tracking-widest">TUNED_IN</span>
              </div>
              <div className="p-3">
                <div className="text-[12px] font-black uppercase text-white truncate">{activeStation.sessionTitle || activeStation.SessionTitle}</div>
                <div className="text-[9px] font-mono text-fatale/60 uppercase tracking-widest truncate">{activeStation.artistName || activeStation.ArtistName}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest">COMM_LINK</div>
              <div className="h-40 bg-black/40 border border-fatale/10 rounded-sm p-3 font-mono text-[9px] overflow-y-auto custom-scrollbar space-y-2">
                {stationChat && stationChat.length > 0 ? stationChat.map((msg, idx) => (
                  <div key={idx} className="break-words">
                    <span className="text-fatale font-bold">[{msg.username}]</span> <span className="text-white/80">{msg.message}</span>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center opacity-20 italic">LINK_IDLE...</div>
                )}
              </div>
              {typeof onSendMessage === 'function' && (
                <div className="flex gap-2">
                  <input
                    value={listenerChatInput}
                    onChange={e => setListenerChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && listenerChatInput.trim()) { onSendMessage(listenerChatInput); setListenerChatInput(''); } }}
                    placeholder="Send signal..."
                    className="flex-1 bg-black/60 border border-fatale/20 focus:border-fatale/50 px-2 py-1.5 text-[9px] font-mono text-white outline-none placeholder:text-white/10 transition-all"
                  />
                  <button
                    onClick={() => { if (listenerChatInput.trim()) { onSendMessage(listenerChatInput); setListenerChatInput(''); } }}
                    className="px-2 py-1.5 bg-fatale/10 border border-fatale/30 text-fatale text-[8px] font-black uppercase hover:bg-fatale hover:text-black transition-all"
                  >TX</button>
                </div>
              )}
            </div>
            <button
              onClick={() => setActiveStation(null)}
              className="w-full py-2 border border-fatale/30 text-fatale/60 text-[9px] font-black uppercase tracking-widest hover:border-fatale hover:text-fatale transition-all"
            >
              [ DISCONNECT_LINK ]
            </button>
          </div>
        )}

        {/* ── TUNING INTERFACE (not connected to any station) ── */}
        {!activeStation && (() => {
          const filteredStations = (liveStations || []).filter(s =>
            sidebarSector === null || s.sectorId === sidebarSector || s.SectorId === sidebarSector
          );
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-fatale/40 animate-pulse" />
                  <h3 className="text-[10px] font-black uppercase text-fatale/70 tracking-[0.3em]">LIVE_FREQ</h3>
                </div>
                <button
                  onClick={() => setShowGlobalGoLive(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-fatale/10 border border-fatale/30 text-fatale text-[8px] font-black uppercase tracking-widest hover:bg-fatale hover:text-black transition-all rounded-sm"
                >
                  <span className="w-1 h-1 rounded-full bg-current animate-pulse" /> GO_LIVE
                </button>
              </div>

              {/* Sector dropdown */}
              <div className="space-y-1.5">
                <div className="text-[7px] font-mono text-white/20 uppercase tracking-widest">TRANSMISSION_SECTOR // FILTER</div>
                <div className="relative">
                  <select
                    value={sidebarSector ?? ''}
                    onChange={e => setSidebarSector(e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full bg-black/60 border border-fatale/20 hover:border-fatale/50 focus:border-fatale/60 p-2.5 text-[9px] font-mono outline-none text-white uppercase tracking-widest appearance-none cursor-pointer transition-all"
                  >
                    <option value="">ALL_SECTORS</option>
                    {SECTORS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                    <ChevronDown size={10} className="text-fatale/40" />
                  </div>
                  {sidebarSector !== null && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 pointer-events-none transition-colors"
                      style={{ backgroundColor: SECTORS[sidebarSector]?.color, boxShadow: `0 0 6px ${SECTORS[sidebarSector]?.color}` }} />
                  )}
                </div>
                {sidebarSector !== null && (
                  <div className="text-[7px] font-mono tracking-widest opacity-40" style={{ color: SECTORS[sidebarSector]?.color }}>
                    {SECTORS[sidebarSector]?.desc}
                  </div>
                )}
              </div>

              {/* Stations list */}
              <div className="space-y-1.5">
                <div className="text-[7px] font-mono text-white/20 uppercase tracking-widest">ACTIVE_FREQUENCIES [{filteredStations.length}]</div>
                {filteredStations.length === 0 ? (
                  <div className="py-8 border border-dashed border-white/5 text-center">
                    <Radio size={20} className="mx-auto mb-2 text-fatale/10" />
                    <div className="text-[8px] font-mono uppercase tracking-widest text-white/10">NO_ACTIVE_FREQUENCIES_DETECTED</div>
                  </div>
                ) : (
                  filteredStations.map((station, idx) => {
                    const sectorColor = SECTORS[station.sectorId ?? station.SectorId]?.color || 'rgb(var(--theme-primary))';
                    return (
                      <button
                        key={station.id || station.Id || idx}
                        onClick={() => setActiveStation(station)}
                        className="w-full text-left border border-white/5 hover:border-white/20 bg-black/20 hover:bg-white/[0.03] p-3 transition-all group/st rounded-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                            style={{ backgroundColor: sectorColor, boxShadow: `0 0 8px ${sectorColor}` }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black uppercase text-white truncate group-hover/st:text-fatale transition-colors">{station.sessionTitle || station.SessionTitle}</div>
                            <div className="text-[7px] font-mono text-white/30 uppercase tracking-widest truncate">{station.artistName || station.ArtistName}</div>
                          </div>
                          <div className="text-[7px] font-mono text-white/10 group-hover/st:text-fatale/40 transition-colors shrink-0">TUNE_IN ›</div>
                        </div>
                        <div className="mt-1.5 ml-4">
                          <span className="text-[7px] font-mono uppercase tracking-widest px-1 border rounded-sm"
                            style={{ color: sectorColor, borderColor: `${sectorColor}30`, backgroundColor: `${sectorColor}10` }}>
                            {SECTORS[station.sectorId ?? station.SectorId]?.name || 'FREQ'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

      </div>
    </motion.div>
  );
});

// --- CONTENIDO: PLAYER (PANTALLA COMPLETA) ---
const PlayerContent = ({
  currentTrack,
  setView,
  vibeFeatures,
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
  isLandscape,
  onPlayTrack,
  onPlayTrackAtIndex,
  onMixerStateChange,
  audioCtx,
  broadcastDest,
  zoomState,
  setZoomState
}) => {
  const isDesktop = window.innerWidth >= 1024;
  const isMobile = !isDesktop;
  const showFullMixer = isDesktop; // Force Cyberpod on mobile

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-transparent">
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
      {showFullMixer ? (
        <DJMixerPlayer 
          isMobile={isMobile}
          currentTrack={currentTrack}
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
          onPlayTrack={onPlayTrack}
          user={user}
          onMixerStateChange={onMixerStateChange}
          audioCtx={audioCtx}
          broadcastDest={broadcastDest}
          zoomState={zoomState}
          setZoomState={setZoomState}
        />
      ) : (
        <IPodPlayer
          currentTrack={currentTrack}
          onPlayTrack={onPlayTrack}
          onPlayTrackAtIndex={onPlayTrackAtIndex}
          user={user}
          vibeFeatures={vibeFeatures}
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
      {hasNotification && !active && (
        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-fatale rounded-full shadow-[0_0_8px_rgb(var(--theme-primary))] animate-pulse" />
      )}
    </div>
    {!collapsed && (
      <span className={`relative mono text-[10px] font-black uppercase tracking-[0.2em] transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'}`}>
        {label}
      </span>
    )}
  </button>
));

const NavButton = React.memo(({ icon, active, onClick, hasNotification }) => (
  <button onClick={onClick} className={`relative px-2.5 sm:px-3.5 py-3 outline-none group rounded-sm ${active ? 'text-[var(--theme-color)]' : 'text-white/20 hover:text-[var(--theme-color)]'}`}>
    {/* Active Background Layer */}
    <div className={`absolute inset-0 hud-panel transition-opacity duration-300 pointer-events-none ${active ? 'opacity-100' : 'opacity-0'}`} />

    {active && (
      <div className="absolute inset-0 pointer-events-none animate-in fade-in duration-500">
        <div className="hud-bracket-tl text-fatale opacity-80" />
        <div className="hud-bracket-tr text-fatale opacity-80" />
        <div className="hud-bracket-bl text-fatale opacity-80" />
        <div className="hud-bracket-br text-fatale opacity-80" />
      </div>
    )}
    <div className={`relative transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'} `}>{icon}</div>
    {hasNotification && !active && (
      <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-fatale rounded-full shadow-[0_0_5px_rgb(var(--theme-primary))]" />
    )}
  </button>
));

const QuickActionButton = React.memo(({ label, icon }) => (
  <button className="w-full flex items-center justify-between p-3 rounded-lg border border-fatale/10 text-[10px] font-bold text-fatale/60 hover:bg-[rgb(var(--theme-primary))10] hover:text-white transition-all uppercase">{label} {icon}</button>
));


import { LanguageProvider } from './contexts/LanguageContext';

export default function AppWrapper() {
  return (
    <>
      <NotificationProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </NotificationProvider>
    </>
  );
}