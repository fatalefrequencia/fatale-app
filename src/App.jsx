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
  Frown, Star, Volume2, Plus, Globe, Maximize2, Minimize2
} from 'lucide-react';

import AuthView from './components/AuthView';
import { ProfileView } from './components/Profile';
import { IPodPlayer } from './components/IPodPlayer';
import { MessagesView } from './components/MessagesView';
import DiscoveryMapView from './components/DiscoveryMapView';
import API from './services/api';

// --- BASE DE DATOS MOCK (Sincronizada en toda la app) ---
const TRACKS = [
  { id: 1, title: 'youtsplit', artist: 'menoboy', album: 'digital_void', duration: '2:09', cover: 'O' },
  { id: 2, title: 'glitch_heart', artist: 'cyber_vamp', album: 'neon_night', duration: '3:15', cover: 'V' },
  { id: 3, title: 'thorny_path', artist: 'dark_pixel', album: 'vamp_glitch', duration: '1:45', cover: 'P' },
  { id: 4, title: 'neon_skull', artist: 'retro_void', album: 'system_error', duration: '4:20', cover: 'S' },
  { id: 5, title: 'digital_tear', artist: 'emo_system', album: 'null_life', duration: '2:55', cover: 'E' },
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
export default function App() {
  const [view, setView] = useState('login'); // login, discovery, feed, profile, player
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [user, setUser] = useState(null);
  const [tracks, setTracks] = useState([]);

  // Audio Ref for persistence
  const audioRef = useRef(null);

  const BASE_API_URL = 'http://localhost:5264';
  const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${BASE_API_URL}${path}`;
  };

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setView('player'); // Or discovery/feed based on preference
    }
  }, []);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const response = await API.Tracks.getAllTracks();
        if (response.data && response.data.length > 0) {
          const mappedTracks = response.data.map(t => ({
            ...t,
            title: t.title || t.Title,
            artist: t.album?.artist?.name || 'Unknown Artist',
            album: t.album?.title || 'Unknown Album',
            albumId: t.album?.id,
            artistId: t.album?.artist?.id,
            cover: getMediaUrl(t.coverImageUrl),
            source: getMediaUrl(t.filePath)
          }));
          setTracks(mappedTracks);
        } else {
          setTracks(TRACKS);
        }
      } catch (error) {
        console.error("Failed to fetch tracks", error);
        setTracks(TRACKS);
      }
    };
    fetchTracks();
  }, [user]);

  // --- AUDIO LOGIC ---
  const currentTrack = tracks[currentTrackIndex] || TRACKS[0] || { source: '', title: 'Loading...', artist: 'System' };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    // Auto-play when track changes if already playing
    if (audioRef.current && isPlaying) {
      audioRef.current.play().catch(e => console.error("Playback failed", e));
    }
  }, [currentTrackIndex]);

  const handleNext = () => setCurrentTrackIndex(p => (p + 1) % tracks.length);
  const handlePrev = () => setCurrentTrackIndex(p => (p - 1 + tracks.length) % tracks.length);
  const togglePlay = () => setIsPlaying(!isPlaying);

  const handlePlayPlaylist = (newTracks, startIndex = 0) => {
    setTracks(newTracks);
    setCurrentTrackIndex(startIndex);
    setIsPlaying(true);
  };

  // Fetch User Profile & Credits
  // Fetch User Profile & Credits
  // Fetch User Profile & Credits
  const fetchUserProfile = async (notify = false) => {
    try {
      const res = await API.Users.getProfile();
      console.log("Profile Refreshed:", res.data);
      if (res.data) {
        // Map backend 'creditsBalance' to frontend 'credits'
        const userData = {
          ...res.data,
          credits: res.data.creditsBalance !== undefined ? res.data.creditsBalance : res.data.credits
        };

        setUser(prev => ({ ...prev, ...userData }));

        // Success notification (optional)
        if (notify) {
          alert(`VERIFICACIÓN SERVIDOR: \n\nSaldo sincronizado: ${userData.credits} CRD`);
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (notify) {
        let report = `Status: ${error.response?.status || 'Active (Network Error)'}\n`;
        report += `URL: ${error.config?.url || 'Unknown'}\n`;
        if (error.response?.data) {
          const d = error.response.data;
          report += `Response Data: ${typeof d === 'object' ? JSON.stringify(d, null, 2) : d}\n`;
        } else {
          report += `Message: ${error.message}\n`;
        }
        alert(`ERROR DE VERIFICACIÓN:\n\n${report}`);
      }
    }
  };

  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchUserProfile();
    }
  }, []);



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

  const handlePurchase = async (track) => {
    try {
      await API.Purchases.purchaseTrack(track.id);
      // Refresh profile to get new balance
      await fetchUserProfile();
      // Ideally also mark track as purchased in state
      alert("Purchase successful! - Créditos descontados.");
    } catch (error) {
      console.error("Purchase failed:", error);
      const errMsg = error.response?.data?.message || error.response?.data || error.message;
      alert(`ERROR DE COMPRA: ${errMsg}`); // Exact error for user
    }
  };

  const addCreditsDebug = async () => {
    try {
      const userId = user?.id || 1;
      const payload = { userId, amount: 100 };

      // CONFIRMATION DEBUG
      console.log("Sending payload:", payload);
      await API.Economy.add(100, userId);

      // OPTIMISTIC UPDATE: Update UI immediately so user sees +100
      setUser(prev => ({ ...prev, credits: (prev?.credits || 0) + 100 }));

      await fetchUserProfile();
      alert("SUCCESS: +100 Créditos añadidos correctamente.");
    } catch (error) {
      console.error("Failed to add credits:", error);

      let report = `Status: ${error.response?.status || 'Active (Network Error)'}\n`;
      report += `URL: ${error.config?.url}\n`;

      if (error.response?.data) {
        const d = error.response.data;
        report += `Response Data: ${typeof d === 'object' ? JSON.stringify(d, null, 2) : d}\n`;
      } else {
        report += `Message: ${error.message}\n`;
      }

      alert(`DETAILED ERROR REPORT:\n\n${report}`);
    }
  };

  const handleAuthSuccess = (authData) => {
    if (authData.token) localStorage.setItem('token', authData.token);
    if (authData.user) {
      localStorage.setItem('user', JSON.stringify(authData.user));
      // Set initial user but immediately fetch full profile to sync credits
      setUser(authData.user);
    }
    fetchUserProfile();
    setView('discovery');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setView('login');
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-[#ff006e] font-mono selection:bg-[#ff006e] selection:text-black overflow-hidden">

      {/* PERSISTENT AUDIO ELEMENT */}
      <audio
        ref={audioRef}
        src={currentTrack.source}
        onEnded={handleNext}
      />

      <AnimatePresence mode="wait">
        {view === 'login' ? (
          <AuthView onLoginSuccess={handleAuthSuccess} />
        ) : (
          <Dashboard
            activeView={view}
            setView={setView}
            currentTrackIndex={currentTrackIndex}
            setCurrentTrackIndex={setCurrentTrackIndex}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            onLogout={handleLogout}
            user={user}
            tracks={tracks}
            // Pass controls down
            togglePlay={togglePlay}
            handleNext={handleNext}
            handlePrev={handlePrev}
            handlePlayPlaylist={handlePlayPlaylist}
            onPurchase={handlePurchase}
            onAddCredits={addCreditsDebug}
            onRefreshProfile={() => fetchUserProfile(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

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

// --- DASHBOARD (LAYOUT RESPONSIVO) ---
const Dashboard = ({ activeView, setView, onLogout, currentTrackIndex, setCurrentTrackIndex, isPlaying, setIsPlaying, user, tracks, togglePlay, handleNext, handlePrev, handlePlayPlaylist, onPurchase, onAddCredits, onRefreshProfile }) => {
  const currentTrack = tracks[currentTrackIndex] || TRACKS[0] || { title: 'Loading...', artist: 'System' };

  return (
    <div className="flex h-screen w-full overflow-hidden relative">

      {/* SIDEBAR (Escritorio) */}
      {/* SIDEBAR (Escritorio) */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#ff006e]/10 bg-[#050505] p-6 space-y-8 z-30 shrink-0">
        <div className="text-2xl font-black italic text-white flex items-center gap-2">
          <Zap size={24} className="text-[#ff006e]" /> SYSTEM
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarLink icon={<Radio size={20} />} label="Discovery" active={activeView === 'discovery'} onClick={() => setView('discovery')} />
          <SidebarLink icon={<Hash size={20} />} label="Feed" active={activeView === 'feed'} onClick={() => setView('feed')} />
          <SidebarLink icon={<User size={20} />} label="Profile" active={activeView === 'profile'} onClick={() => setView('profile')} />
          <SidebarLink icon={<Play size={20} />} label="Player" active={activeView === 'player'} onClick={() => setView('player')} />
          <SidebarLink icon={<MessageSquare size={20} />} label="Messages" active={activeView === 'messages'} onClick={() => setView('messages')} />
        </nav>
        <button onClick={onLogout} className="text-left text-[10px] text-[#ff006e]/30 hover:text-[#ff006e] uppercase tracking-widest font-bold">Log_Out_System</button>
      </aside>

      {/* ÁREA DE CONTENIDO DINÁMICO */}
      <main className="flex-1 flex flex-col h-full bg-[#020202] relative overflow-hidden">
        {/* TOP NAV (Móvil) */}
        <header className="lg:hidden flex items-center justify-center p-4 border-b border-[#ff006e]/10 bg-black/90 backdrop-blur-md z-40 relative">
          <div className="flex gap-4">
            <NavButton icon={<Radio size={18} />} active={activeView === 'discovery'} onClick={() => setView('discovery')} />
            <NavButton icon={<Hash size={18} />} active={activeView === 'feed'} onClick={() => setView('feed')} />
            <NavButton icon={<Play size={18} />} active={activeView === 'player'} onClick={() => setView('player')} />
            <NavButton icon={<MessageSquare size={18} />} active={activeView === 'messages'} onClick={() => setView('messages')} />
            <NavButton icon={<User size={18} />} active={activeView === 'profile'} onClick={() => setView('profile')} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative pb-24"> {/* Added pb-24 for MiniPlayer space */}
          <AnimatePresence mode="wait">
            {activeView === 'discovery' && (
              <DiscoveryMapView
                key="discovery"
                allTracks={tracks}
                onPlayPlaylist={handlePlayPlaylist}
              />
            )}
            {activeView === 'feed' && <FeedContent key="feed" />}
            {activeView === 'profile' && <ProfileView key="profile" user={user} onLogout={onLogout} onAddCredits={onAddCredits} onRefreshProfile={onRefreshProfile} />}
            {activeView === 'player' && <PlayerContent
              key="player"
              setView={setView}
              currentTrackIndex={currentTrackIndex}
              setCurrentTrackIndex={setCurrentTrackIndex}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              tracks={tracks}
              user={user}
              onPurchase={onPurchase}
              onAddCredits={onAddCredits}
            />}
            {activeView === 'messages' && <MessagesView key="messages" />}
          </AnimatePresence>
        </div>
      </main>

      {/* MINI PLAYER (Todas las vistas excepto Player) */}
      <AnimatePresence>
        {activeView !== 'player' && (
          <MiniPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onNext={handleNext}
            onPrev={handlePrev}
            onExpand={() => setView('player')}
            activeView={activeView}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MINI PLAYER COMPONENT ---
const MiniPlayer = ({ track, isPlaying, onTogglePlay, onNext, onPrev, onExpand, activeView }) => {
  const isMessages = activeView === 'messages';

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`absolute bottom-4 left-4 right-4 lg:left-72 lg:right-8 backdrop-blur-xl border p-3 rounded-2xl flex items-center gap-4 z-50 shadow-2xl ${isMessages
        ? 'bg-black border-black/10 shadow-[0_0_30px_rgba(255,0,110,0.4)]'
        : 'bg-[#0a0a0a]/90 border-[#ff006e]/20 border-t-[#ff006e]/40 shadow-[0_0_30px_rgba(0,0,0,0.5)]'
        }`}
    >
      {/* Track Info (Click to expand) */}
      <div className="flex items-center gap-4 flex-1 cursor-pointer group" onClick={onExpand}>
        <div className={`w-12 h-12 rounded-lg border flex items-center justify-center relative overflow-hidden shrink-0 ${isMessages ? 'bg-[#111] border-[#333]' : 'bg-[#111] border-[#ff006e]/20'}`}>
          <Music size={20} className={`transition-colors ${isMessages ? 'text-[#ff006e]' : 'text-[#ff006e]/40 group-hover:text-[#ff006e]'}`} />
          {isPlaying && <div className={`absolute inset-0 animate-pulse ${isMessages ? 'bg-[#ff006e]/10' : 'bg-[#ff006e]/10'}`} />}
        </div>
        <div className="overflow-hidden">
          <h4 className={`text-xs font-black uppercase truncate transition-colors ${isMessages ? 'text-white' : 'text-white group-hover:text-[#ff006e]'}`}>{track?.title || 'No Track'}</h4>
          <p className={`text-[10px] font-bold uppercase truncate ${isMessages ? 'text-[#ff006e]' : 'text-[#ff006e]/50'}`}>{track?.artist || 'Unknown'}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 px-4">
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className={`transition-colors ${isMessages ? 'text-[#ff006e]/60 hover:text-[#ff006e]' : 'text-[#ff006e]/60 hover:text-white'}`}>
          <SkipBack size={20} fill="currentColor" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-lg ${isMessages ? 'bg-[#ff006e] text-black shadow-[0_0_15px_#ff006e]' : 'bg-[#ff006e] text-black shadow-[0_0_15px_#ff006e]'}`}
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className={`transition-colors ${isMessages ? 'text-[#ff006e]/60 hover:text-[#ff006e]' : 'text-[#ff006e]/60 hover:text-white'}`}>
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>

      {/* Extra Actions */}
      <div className={`hidden sm:flex items-center gap-3 px-2 border-l ${isMessages ? 'border-[#ff006e]/10' : 'border-[#ff006e]/10'}`}>
        <Heart size={16} className={`cursor-pointer ${isMessages ? 'text-[#ff006e]/40 hover:text-[#ff006e]' : 'text-[#ff006e]/40 hover:text-[#ff006e]'}`} />
        <Volume2 size={16} className={`cursor-pointer ${isMessages ? 'text-[#ff006e]/40 hover:text-[#ff006e]' : 'text-[#ff006e]/40 hover:text-[#ff006e]'}`} />
        <button onClick={(e) => { e.stopPropagation(); onExpand(); }} className={`hover:text-white transition-colors ${isMessages ? 'text-[#ff006e]' : 'text-[#ff006e]/60'}`}>
          <Maximize2 size={18} />
        </button>
      </div>
    </motion.div>
  );
};

// --- CONTENIDO: DISCOVERY (TIPO SPOTIFY) ---
const DiscoveryContent = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 space-y-12">
    <div className="flex gap-4">
      {['Todo', 'Música', 'Podcasts'].map(f => (
        <button key={f} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${f === 'Todo' ? 'bg-[#ff006e] text-black' : 'bg-[#1a1a1a] text-white hover:bg-[#333]'}`}>{f}</button>
      ))}
    </div>

    <section className="space-y-6">
      <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Acceso Rápido</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DISCOVERY_GRID.map(item => (
          <div key={item.id} className="bg-[#111] hover:bg-[#1a1a1a] flex items-center rounded-lg overflow-hidden group cursor-pointer border border-[#ff006e]/5 hover:border-[#ff006e]/30 transition-all">
            <div className={`w-20 h-20 shrink-0 ${item.color === '#ff006e' ? 'bg-[#ff006e]' : 'bg-[#333]'} flex items-center justify-center shadow-2xl`}>
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
    <div className="hidden lg:block w-72 p-6 space-y-6 border-r border-[#ff006e]/5">
      <div className="bg-[#0a0a0a] border border-[#ff006e]/20 rounded-2xl overflow-hidden">
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
          <div key={i} className="flex items-center gap-3 p-2 hover:bg-[#111] rounded-lg cursor-pointer">
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
        <h3 className="text-[10px] font-black uppercase text-[#ff006e]/30 px-2 tracking-[0.3em]">Radio Stations</h3>
        {RADIO_STATIONS.map(radio => (
          <div key={radio.id} className={`p-4 rounded-2xl border ${radio.active ? 'bg-green-950/20 border-green-500/30' : 'bg-black/60 border-[#ff006e]/10 opacity-60'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${radio.active ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-xs font-black text-white uppercase">{radio.name}</span>
            </div>
            <p className="text-[10px] text-white/50 mb-4 italic truncate">{radio.active ? `Now Playing: ${radio.track}` : 'Currently Offline'}</p>
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
const PlayerContent = ({ setView, currentTrackIndex, setCurrentTrackIndex, isPlaying, setIsPlaying, tracks }) => {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <IPodPlayer
        currentTrackIndex={currentTrackIndex}
        setCurrentTrackIndex={setCurrentTrackIndex}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        tracks={tracks}
        onMinimize={() => setView('discovery')}
      />
    </div>
  );
};
// --- COMPONENTES AUXILIARES ---

const SidebarLink = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${active ? 'bg-[#ff006e] text-black shadow-[0_0_25px_#ff006e60] scale-105' : 'text-[#ff006e]/60 hover:bg-[#ff006e05] hover:text-[#ff006e]'}`}
  >
    {icon}
    <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const NavButton = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-2 transition-all ${active ? 'text-white scale-125' : 'text-[#ff006e]/40 hover:text-[#ff006e]'}`}>{icon}</button>
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
