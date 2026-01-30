import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, SkipBack, SkipForward, List, Music,
    ChevronRight, Disc, User, Zap, Wifi, Minimize2
} from 'lucide-react';

const BASE_ASSET_URL = 'http://localhost:5264/uploads/';
const getAssetUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${BASE_ASSET_URL}${path}`;
};

const MENUS = {
    MAIN: [
        { id: 'PLAYLISTS', label: 'Playlists', img: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&q=80' },
        { id: 'ALBUMS', label: 'Albums', img: 'https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=400&q=80' },
        { id: 'ARTISTS', label: 'Artists', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80' },
        { id: 'SONGS', label: 'Songs', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80' },
        { id: 'NOW_PLAYING', label: 'Now Playing', img: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80' },
        { id: 'SETTINGS', label: 'Settings', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80' }
    ],
    PLAYLISTS: [
        { id: 'pl_1', label: 'Cyberpunk Mix' },
        { id: 'pl_2', label: 'Night Drive' },
    ],
    ALBUMS: [
        { id: 'al_1', label: 'Digital Void' },
        { id: 'al_2', label: 'Neon Night' },
    ],
    ARTISTS: [
        { id: 'art_1', label: 'Slava Kornilov' },
        { id: 'art_2', label: 'Neon Vamp' },
    ],
    SETTINGS: [
        { id: 'CREDITS', label: 'Credits Balance' },
        { id: 'ADD_CREDITS', label: 'DEBUG: Add 100 Credits' },
        { id: 'ACCOUNT', label: 'Account Info' }
    ]
};

export const IPodPlayer = ({ tracks, currentTrackIndex, setCurrentTrackIndex, isPlaying, setIsPlaying, onMinimize, user, onPurchase, onAddCredits }) => {
    const [screen, setScreen] = useState('MAIN');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [rotation, setRotation] = useState(0);

    // Wheel Logic Refs
    const wheelRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const lastAngle = useRef(null);
    const accumulatedRotation = useRef(0);

    const currentTrack = tracks[currentTrackIndex] || tracks[0] || { source: '', title: 'Loading...', artist: 'System', duration: '0:00' };

    // Helper to get current menu items
    const getCurrentItems = () => {
        if (screen === 'MAIN') return MENUS.MAIN;
        if (screen === 'PLAYLISTS') return MENUS.PLAYLISTS;
        if (screen === 'ALBUMS') return MENUS.ALBUMS;
        if (screen === 'ARTISTS') return MENUS.ARTISTS;
        if (screen === 'SETTINGS') return MENUS.SETTINGS;
        if (screen === 'SONGS') return tracks.map((t, i) => ({ id: i, label: t.title }));
        return [];
    };

    // Get preview image for current selection in MAIN menu
    const getPreviewImage = () => {
        if (screen === 'MAIN') {
            return MENUS.MAIN[selectedIndex]?.img;
        }
        return null;
    };

    const handleWheelRotation = (angleDelta) => {
        accumulatedRotation.current += angleDelta;
        const threshold = 25;

        if (Math.abs(accumulatedRotation.current) >= threshold) {
            const direction = accumulatedRotation.current > 0 ? 1 : -1;

            if (screen === 'NOW_PLAYING') {
                // Volume control or seek simulation
            } else {
                const items = getCurrentItems();
                if (items.length > 0) {
                    setSelectedIndex(prev => {
                        const next = prev + direction;
                        if (next < 0) return items.length - 1;
                        if (next >= items.length) return 0;
                        return next;
                    });
                }
            }
            accumulatedRotation.current = 0;
        }
        setRotation(prev => prev + angleDelta);
    };

    const handleCenterClick = (e) => {
        e?.stopPropagation();

        if (screen === 'NOW_PLAYING') {
            setIsPlaying(!isPlaying);
            return;
        }

        const items = getCurrentItems();
        const selectedItem = items[selectedIndex];

        if (screen === 'MAIN') {
            if (MENUS[selectedItem.id]) {
                setScreen(selectedItem.id);
                setSelectedIndex(0);
            } else if (selectedItem.id === 'SONGS') {
                setScreen('SONGS');
                setSelectedIndex(0);
            } else if (selectedItem.id === 'NOW_PLAYING') {
                setScreen('NOW_PLAYING');
            }
        }
        else if (screen === 'SETTINGS') {
            if (selectedItem.id === 'ADD_CREDITS') {
                onAddCredits && onAddCredits();
            }
        }
        else if (screen === 'SONGS') {
            setCurrentTrackIndex(selectedItem.id);
            setScreen('NOW_PLAYING');
            setIsPlaying(true);

            // Purchase logic could go here or require a confirmation
            // For now, assume selection plays it, but maybe we trigger purchase if locked?
            // Simplified: Playing it is the goal. Purchase usually happens before.
            // Let's add a "Purchase" option contextually or just a button in Now Playing?
            // User requirement: "Configura el handlePurchase para enviar el POST... cuando el usuario seleccione una canción no comprada."
            // So calling onPurchase here might be appropriate if we knew it was unpurchased.
            if (onPurchase) onPurchase(tracks[selectedItem.id]);
        }
        else {
            // Deep navigation mock
            setScreen('NOW_PLAYING');
        }
    };

    const handleMenuClick = (e) => {
        e?.stopPropagation();
        if (screen === 'MAIN') return;
        if (screen === 'NOW_PLAYING') {
            setScreen('MAIN');
        } else {
            setScreen('MAIN');
            setSelectedIndex(0);
        }
    };

    // Wheel Event Listeners
    const getAngle = (clientX, clientY) => {
        if (!wheelRef.current) return 0;
        const rect = wheelRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    };

    const onStart = (e) => {
        setIsDragging(true);
        const pos = e.touches ? e.touches[0] : e;
        lastAngle.current = getAngle(pos.clientX, pos.clientY);
    };

    const onMove = (e) => {
        if (!isDragging) return;
        const pos = e.touches ? e.touches[0] : e;
        const currentAngle = getAngle(pos.clientX, pos.clientY);
        if (lastAngle.current !== null) {
            let delta = currentAngle - lastAngle.current;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            handleWheelRotation(delta);
        }
        lastAngle.current = currentAngle;
    };

    useEffect(() => {
        const onEnd = () => { setIsDragging(false); lastAngle.current = null; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onEnd);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [isDragging, screen]);

    return (
        <div className="relative w-full max-w-[400px] h-[700px] bg-[#000] rounded-[55px] border-[12px] border-[#333] shadow-[0_50px_120px_rgba(255,0,110,0.2),inset_0_2px_10px_rgba(255,0,110,0.1)] flex flex-col items-center p-8 select-none shrink-0 border-t-[#333] border-l-[#222] scale-100 sm:scale-110">


            {/* SCREEN CONTAINER */}
            <div className="w-full h-[320px] bg-black rounded-xl border-4 border-[#ff006e]/20 overflow-hidden relative shadow-[inset_0_0_50px_rgba(255,0,110,0.1)] flex flex-col">
                {/* Top Status Bar (Pink/Black) */}
                <div className="h-6 bg-[#111] border-b border-[#ff006e]/20 flex justify-between items-center px-3 z-20">
                    <div className="flex items-center gap-2">
                        {isPlaying ? <Play size={10} className="text-[#ff006e] fill-[#ff006e]" /> : <Pause size={10} className="text-[#ff006e] fill-[#ff006e]" />}
                        <span className="text-[10px] font-black text-white font-mono tracking-widest">CYBER_POD</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#ff006e] font-mono">23:42</span>
                        <Wifi size={12} className="text-[#ff006e]" />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-[#050505] relative overflow-hidden">
                    {screen === 'NOW_PLAYING' ? (
                        // --- NOW PLAYING SCREEN ---
                        <div className="flex flex-col h-full bg-[#050505] text-white p-4">
                            <div className="flex items-center justify-center p-4">
                                <div className="w-32 h-32 bg-black border-2 border-[#ff006e]/50 shadow-[0_0_30px_#ff006e30] flex items-center justify-center relative overflow-hidden rounded-lg group">
                                    {currentTrack.cover ? (
                                        <img src={currentTrack.cover} alt="Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Zap size={40} className="text-[#ff006e] animate-pulse" />
                                            <div className="absolute inset-0 bg-gradient-to-tr from-[#ff006e]/20 to-transparent" />
                                        </>
                                    )}
                                    <div className="absolute -inset-10 border border-[#ff006e]/20 rotate-45" />
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-end space-y-3 pb-2 text-center">
                                <div>
                                    <h3 className="font-black text-lg leading-tight truncate uppercase tracking-tighter text-white drop-shadow-[0_0_10px_#ff006e]">{currentTrack.title}</h3>
                                    <p className="text-xs font-bold text-[#ff006e] truncate uppercase tracking-widest">{currentTrack.artist}</p>
                                </div>

                                <div className="space-y-1">
                                    <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#ff006e]/20">
                                        <motion.div
                                            className="h-full bg-[#ff006e] shadow-[0_0_15px_#ff006e]"
                                            initial={{ width: '0%' }}
                                            animate={{ width: isPlaying ? '45%' : '45%' }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[8px] font-mono text-[#ff006e]/50">
                                        <span>1:23</span>
                                        <span>-{currentTrack.duration}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // --- MENU LIST SCREEN ---
                        <div className="flex h-full">
                            {/* Left Side (Menu) */}
                            <div className="w-1/2 flex flex-col border-r border-[#ff006e]/10 bg-black">
                                <div className="bg-[#111] p-2 border-b border-[#ff006e]/20">
                                    <h2 className="text-xs font-black text-[#ff006e] truncate text-center font-mono tracking-widest">
                                        {screen === 'MAIN' ? 'SYSTEM' : screen}
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-hidden bg-black py-1">
                                    {getCurrentItems().map((item, idx) => (
                                        <div
                                            key={item.id}
                                            onMouseEnter={() => setSelectedIndex(idx)} // Dynamic Hover
                                            className={`px-3 py-2 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all ${idx === selectedIndex ? 'bg-[#ff006e] text-black shadow-[0_0_15px_#ff006e]' : 'text-[#ff006e]/60'}`}
                                        >
                                            <span className="truncate">
                                                {item.label}
                                                {item.id === 'CREDITS' && user?.credits !== undefined && ` : ${user.credits}`}
                                            </span>
                                            <ChevronRight size={10} className={idx === selectedIndex ? 'text-black' : 'text-[#ff006e]/30'} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Right Side (Preview / Image) */}
                            <div className="w-1/2 bg-[#020202] relative overflow-hidden flex items-center justify-center">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={screen + selectedIndex}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="text-center opacity-100 w-full h-full flex items-center justify-center"
                                    >
                                        {getPreviewImage() ? (
                                            <img src={getPreviewImage()} alt="Preview" className="w-full h-full object-cover opacity-60 mix-blend-screen" />
                                        ) : (
                                            screen === 'PLAYLISTS' ? <List size={50} className="text-[#ff006e] drop-shadow-[0_0_20px_#ff006e]" /> :
                                                screen === 'ALBUMS' ? <Disc size={50} className="text-[#ff006e] drop-shadow-[0_0_20px_#ff006e]" /> :
                                                    screen === 'ARTISTS' ? <User size={50} className="text-[#ff006e] drop-shadow-[0_0_20px_#ff006e]" /> :
                                                        screen === 'SETTINGS' ? <Zap size={50} className="text-[#ff006e] drop-shadow-[0_0_20px_#ff006e]" /> :
                                                            <Music size={60} className="text-[#ff006e] drop-shadow-[0_0_20px_#ff006e]" />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                                {/* CRT Effect */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Screen Gloss */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-30 rounded-lg" />
            </div>

            {/* CLICK WHEEL */}
            <div className="flex-1 w-full flex items-center justify-center pt-10 pb-4 relative">
                <div
                    ref={wheelRef}
                    onMouseDown={onStart}
                    onTouchStart={onStart}
                    className="relative w-64 h-64 bg-[#111] rounded-full border border-[#333] shadow-[0_5px_30px_rgba(0,0,0,1),inset_0_2px_5px_rgba(255,0,110,0.1)] flex items-center justify-center cursor-pointer active:scale-[0.99] transition-transform"
                >
                    {/* Wheel Buttons */}
                    <button
                        onClick={handleMenuClick}
                        className="absolute top-6 font-black text-[#ff006e]/50 text-[12px] tracking-[0.2em] hover:text-[#ff006e] transition-colors font-mono"
                    >
                        MENU
                    </button>
                    {/* Bottom Button: Now MINIMIZE */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onMinimize && onMinimize(); }}
                        className="absolute bottom-6 flex gap-4 text-[#ff006e]/50 hover:text-[#ff006e]"
                    >
                        <Minimize2 size={18} />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); setIsPlaying(false); }}
                        className="absolute left-6 text-[#ff006e]/50 hover:text-[#ff006e]"
                    >
                        <SkipBack size={24} fill="currentColor" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleCenterClick(); }} // Alternative select
                        className="absolute right-6 text-[#ff006e]/50 hover:text-[#ff006e]"
                    >
                        <SkipForward size={24} fill="currentColor" />
                    </button>

                    {/* Center Button: Now PLAY */}
                    <div
                        onClick={handleCenterClick}
                        className="w-24 h-24 bg-[#0a0a0a] rounded-full border border-[#333] shadow-[0_0_15px_rgba(255,0,110,0.1)] flex items-center justify-center z-10 active:bg-[#ff006e] transition-colors group"
                    >
                        {/* Play Icon in Center */}
                        {isPlaying ? <Pause size={32} fill="#ff006e" className="text-[#ff006e] group-active:fill-black group-active:text-black transition-colors" /> : <Play size={32} fill="#ff006e" className="text-[#ff006e] group-active:fill-black group-active:text-black transition-colors" />}
                    </div>
                </div>
            </div>

        </div>
    );
};
