import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../contexts/NotificationContext';
import {
    Play, Pause, SkipBack, SkipForward, Music,
    ChevronRight, Zap, Minimize2, Download as DownloadIcon, Heart,
    Wifi, Disc, User, List, DollarSign, Search
} from 'lucide-react';

const MENU_ITEMS = [
    { id: 'NOW_PLAYING', label: 'Now Playing' },
    { id: 'SONGS', label: 'Music' },
    { id: 'PLAYLISTS', label: 'Playlists' },
    { id: 'ARTISTS', label: 'Artists' },
    { id: 'SETTINGS', label: 'Settings' }
];

export const IPodPlayer = ({
    tracks,
    currentTrackIndex,
    setCurrentTrackIndex,
    isPlaying,
    setIsPlaying,
    onMinimize,
    user,
    onPurchase,
    onDownload,
    onLike,
    onAddCredits,
    currentTime,
    duration,
    onSeek,
    onPrev,
    onNext,
    togglePlay,
    navigateToProfile,
    onCache,
    onPlayPlaylist,
    initialScreen = 'MAIN',
    forceNowPlaying // Receiving the timestamp prop
}) => {
    const { showNotification } = useNotification();
    const [screen, setScreen] = useState(forceNowPlaying ? 'NOW_PLAYING' : (initialScreen || 'MAIN'));
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [playlists, setPlaylists] = useState([]);
    const [playlistTracks, setPlaylistTracks] = useState([]);
    const [activePlaylistName, setActivePlaylistName] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Debug logging
    console.log("[IPodPlayer] Render. Screen:", screen, "Force:", forceNowPlaying, "Initial:", initialScreen);

    useEffect(() => {
        console.log("[IPodPlayer] Effect Triggered. Force:", forceNowPlaying);
        if (forceNowPlaying) {
            console.log("[IPodPlayer] EXECUTING REDIRECT TO NOW_PLAYING");
            setScreen('NOW_PLAYING');
        } else if (initialScreen && initialScreen !== screen) {
            // Only reset if forced or different? 
            // Be careful not to loop
            // setScreen(initialScreen);
        }
    }, [initialScreen, forceNowPlaying]);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Fetch Playlists
    useEffect(() => {
        const fetchPlaylists = async () => {
            if (!user) return;
            try {
                const API = await import('../services/api').then(m => m.default);
                const res = await API.Playlists.getUserPlaylists(user.id || user.Id);
                const normalized = (res.data || []).map(p => ({
                    ...p,
                    id: p.id || p.Id,
                    name: p.name || p.Name,
                    imageUrl: p.imageUrl || p.ImageUrl,
                    isPublic: p.isPublic !== undefined ? p.isPublic : p.IsPublic
                }));
                setPlaylists(normalized);
            } catch (e) {
                console.error("Failed to fetch playlists for iPod", e);
            }
        };
        fetchPlaylists();
    }, [user]);

    // Wheel Logic Refs
    const wheelRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const lastAngle = useRef(null);
    const accumulatedRotation = useRef(0);

    const rawTrack = (currentTrackIndex >= 0 && tracks[currentTrackIndex]) ? tracks[currentTrackIndex] : {
        title: 'NO TRACK', artist: 'SELECT MUSIC', duration: '0:00', cover: null, price: 0, isLocked: true, isOwned: false
    };

    const currentTrack = {
        ...rawTrack,
        // Ensure we prioritize the raw object's properties if they exist
        id: rawTrack.user_id || rawTrack.id || rawTrack.Id,
        title: rawTrack.title || rawTrack.Title || 'Untitled',
        artist: rawTrack.artist || rawTrack.ArtistName || 'Unknown Artist',
        source: rawTrack.source || rawTrack.Source,
        cover: rawTrack.cover || rawTrack.coverImageUrl || rawTrack.CoverImageUrl,
        isLocked: rawTrack.isLocked !== undefined ? rawTrack.isLocked : (rawTrack.IsLocked !== undefined ? rawTrack.IsLocked : false),
        isOwned: rawTrack.isOwned !== undefined ? rawTrack.isOwned : (rawTrack.IsOwned !== undefined ? rawTrack.IsOwned : true)
    };

    const isLocked = currentTrack.isLocked && !currentTrack.isOwned;

    // Use total track duration in seconds (fallback to 180 if 0)
    const trackDurationSec = duration || 180;

    // Format seconds to text (M:SS)
    const formatTime = (secs) => {
        if (isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Helper to get current menu items
    const getCurrentItems = () => {
        if (isSearching) {
            if (!searchQuery) return [{ id: 'INFO', label: 'Type to search...' }];
            const lowerQ = searchQuery.toLowerCase();
            const results = tracks.map((t, i) => ({ ...t, originalIndex: i }))
                .filter(t => (t.title || t.Title || '').toLowerCase().includes(lowerQ) ||
                    (t.artist || t.ArtistName || '').toLowerCase().includes(lowerQ));

            if (results.length === 0) return [{ id: 'INFO', label: 'No results' }];
            return results.map(t => ({ id: t.originalIndex, label: t.title || t.Title || 'Untitled Track', originalTrack: t }));
        }

        if (screen === 'MAIN') return MENU_ITEMS;
        if (screen === 'SONGS' || screen === 'MUSIC') {
            return [
                { id: 'BACK', label: '.. Back' },
                { id: 'SONGS_PURCHASED', label: 'Purchased' },
                { id: 'SONGS_ALL', label: 'All Tracks' }
            ];
        }

        if (screen === 'SONGS_LIKED' || screen === 'SONGS_PURCHASED' || screen === 'SONGS_ALL') {
            const getFiltered = () => {
                if (screen === 'SONGS_LIKED') return tracks.map((t, i) => ({ ...t, originalIndex: i })).filter(t => t.isLiked);
                if (screen === 'SONGS_PURCHASED') return tracks.map((t, i) => ({ ...t, originalIndex: i })).filter(t => t.isCached);
                return tracks.map((t, i) => ({ ...t, originalIndex: i }));
            };
            const filtered = getFiltered();

            return [
                { id: 'BACK_SM', label: '.. Back' },
                { id: 'PLAY_ALL_FILTERED', label: 'Play All', tracks: filtered, action: true },
                { id: 'SHUFFLE_ALL_FILTERED', label: 'Shuffle All', tracks: filtered, action: true },
                ...filtered.map(t => ({ id: t.originalIndex, label: t.title || t.Title }))
            ];
        }

        if (screen === 'PLAYLISTS') {
            return [
                { id: 'BACK', label: '.. Back' },
                ...playlists.map((p, i) => {
                    const pid = p.id || p.Id;
                    return { id: `PL_${pid}`, label: p.name || p.Name || 'Untitled Playlist', playlistId: pid, type: 'PLAYLIST' };
                })
            ];
        }

        if (screen === 'PLAYLIST_DETAILS') {
            return [
                { id: 'BACK_PL', label: '.. Back' },
                { id: 'PLAY_PLAYLIST', label: 'Play', action: true },
                { id: 'SHUFFLE_PLAYLIST', label: 'Shuffle', action: true },
                ...playlistTracks.map((t, i) => ({ id: i, label: t.title || t.Title || 'Untitled Track', originalTrack: t }))
            ];
        }

        if (screen === 'ARTISTS') {
            return [
                { id: 'BACK', label: '.. Back' },
                { id: 'MOCK', label: `Empty ${screen}` }
            ];
        }
        if (screen === 'SETTINGS') return [
            { id: 'CREDITS', label: `Credits: ${user?.credits || 0}` },
            { id: 'ADD_CREDITS', label: 'Add 100 Credits (DEBUG)' }
        ];
        if (screen === 'ACTION_MENU') {
            return [
                { id: 'BACK_NP', label: '.. Back to Track' },
                { id: 'GOTO_ADD_PLAYLIST', label: 'Add to Playlist' },
                { id: 'GOTO_TIP', label: 'Tip Artist' },
                ...(currentTrack.source && currentTrack.source.startsWith('youtube:')
                    ? [{ id: 'CACHE_TRACK', label: currentTrack.isCached ? 'Remove Cache' : 'Download Cache' }]
                    : []
                ),
                ...(currentTrack.isOwned
                    ? [{ id: 'DOWNLOAD_FILE', label: 'Download File' }]
                    : [{ id: 'PURCHASE_FILE', label: `Purchase (${currentTrack.price || 0} CRD)` }]
                )
            ];
        }
        if (screen === 'SELECT_PLAYLIST') {
            return [
                { id: 'BACK_AM', label: '.. Back' },
                ...playlists.map(p => {
                    const pid = p.id || p.Id;
                    return { id: `ADD_TO_${pid}`, label: p.name || p.Name, playlistId: pid, type: 'SELECT_PLAYLIST_ITEM' };
                })
            ];
        }
        if (screen === 'TIP_MENU') {
            return [
                { id: 'BACK_AM', label: '.. Back to Options' },
                { id: 'TIP_10', label: 'Tip 10 Credits' },
                { id: 'TIP_25', label: 'Tip 25 Credits' },
                { id: 'TIP_50', label: 'Tip 50 Credits' },
                { id: 'TIP_100', label: 'Tip 100 Credits' },
                { id: 'TIP_CUSTOM', label: 'Custom Amount...' }
            ];
        }
        if (screen === 'PURCHASE_CONFIRM') {
            return [
                { id: 'CONFIRM_PURCHASE', label: 'YES' },
                { id: 'BACK_AM', label: 'NO' }
            ];
        }
        return [
            { id: 'BACK', label: '.. Back' },
            { id: 'MOCK', label: `Empty ${screen}` }
        ];
    };

    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubValue, setScrubValue] = useState(0);
    const lastSeekTime = useRef(0);
    const visualTime = isScrubbing ? scrubValue : currentTime;

    const handleWheelRotation = (angleDelta) => {
        // High Filter: Ignore movements below 0.8 degrees
        if (Math.abs(angleDelta) < 0.8) return;

        accumulatedRotation.current += angleDelta;

        // --- NOW PLAYING SCRUBBING (ULTRA-STABLE) ---
        if (screen === 'NOW_PLAYING' && !isLocked) {
            if (!isScrubbing) {
                setIsScrubbing(true);
                setScrubValue(currentTime);
            }

            // Ultra-Stability Mapping (35 deg = 1 sec)
            const degreesPerSecond = 35;
            const timeDelta = angleDelta / degreesPerSecond;

            setScrubValue(prev => {
                const next = Math.max(0, Math.min(prev + timeDelta, trackDurationSec));

                // Throttled hardware sync (250ms)
                const now = Date.now();
                if (now - lastSeekTime.current > 250) {
                    onSeek && onSeek(next);
                    lastSeekTime.current = now;
                }
                return next;
            });

            setRotation(prev => prev + angleDelta);
            return;
        }

        // --- MENU NAVIGATION ---
        const threshold = 15;
        if (Math.abs(accumulatedRotation.current) >= threshold) {
            const direction = accumulatedRotation.current > 0 ? 1 : -1;
            const items = getCurrentItems();

            if (items.length > 0) {
                setSelectedIndex(prev => {
                    const next = prev + direction;
                    if (next < 0) return items.length - 1;
                    if (next >= items.length) return 0;
                    return next;
                });
            }
            accumulatedRotation.current = 0;
        }
        setRotation(prev => prev + angleDelta);
    };

    const handleCenterClick = (e, targetItem = null) => {
        e?.stopPropagation();

        const items = getCurrentItems();
        const item = targetItem || items[selectedIndex];

        // --- SEARCH HANDLING ---
        if (isSearching) {
            // If it's a track result
            if (item.originalTrack) {
                const mainIndex = tracks.findIndex(t => t.id === item.originalTrack.id);
                if (mainIndex !== -1) {
                    setCurrentTrackIndex(mainIndex);
                    setIsPlaying(true);
                    setScreen('NOW_PLAYING');
                    setIsSearching(false); // Close search on play
                    setSearchQuery('');
                }
            }
            return;
        }

        // --- PRIORITY: NOW PLAYING PAUSE ---
        if (screen === 'NOW_PLAYING' && !targetItem) {
            if (isLocked) {
                setScreen('PURCHASE_CONFIRM');
                setSelectedIndex(0);
            } else {
                togglePlay && togglePlay();
            }
            return;
        }

        if (!item) return;

        // --- UNIVERSAL BACK / MAIN NAVIGATION ---
        if (item.id === 'BACK') {
            setScreen('MAIN');
            setSelectedIndex(0);
            return;
        }

        if (screen === 'MAIN') {
            setScreen(item.id);
            setSelectedIndex(0);
            return;
        }

        // --- MUSIC / SONGS CATEGORIES ---
        if (screen === 'SONGS' || screen === 'MUSIC') {
            if (item.id === 'SONGS_LIKED' || item.id === 'SONGS_PURCHASED' || item.id === 'SONGS_ALL') {
                setScreen(item.id);
                setSelectedIndex(0);
            }
            return;
        }

        // --- FILTERED LIBRARY VIEWS ---
        if (screen === 'SONGS_LIKED' || screen === 'SONGS_PURCHASED' || screen === 'SONGS_ALL') {
            if (item.id === 'BACK_SM') {
                setScreen('SONGS');
                setSelectedIndex(0);
            } else if (item.id === 'PLAY_ALL_FILTERED') {
                if (item.tracks.length > 0) {
                    setCurrentTrackIndex(item.tracks[0].originalIndex);
                    setIsPlaying(true);
                    setScreen('NOW_PLAYING');
                }
            } else if (item.id === 'SHUFFLE_ALL_FILTERED') {
                if (item.tracks.length > 0) {
                    const rand = Math.floor(Math.random() * item.tracks.length);
                    setCurrentTrackIndex(item.tracks[rand].originalIndex);
                    setIsPlaying(true);
                    setScreen('NOW_PLAYING');
                }
            } else if (typeof item.id === 'number') {
                setCurrentTrackIndex(item.id);
                setScreen('NOW_PLAYING');
                const targetTrack = tracks[item.id];
                if (!targetTrack?.isLocked || targetTrack?.isOwned) {
                    setIsPlaying(true);
                }
            }
            return;
        }

        // --- PLAYLISTS / ARTISTS SUBMENU ---
        // --- PLAYLISTS / ARTISTS SUBMENU ---
        if (screen === 'PLAYLISTS') {
            if (item.type === 'PLAYLIST') {
                // Set name immediately for snappier UI
                setActivePlaylistName(item.label);

                // Fetch details
                const loadPlaylist = async () => {
                    try {
                        const API = await import('../services/api').then(m => m.default);
                        const res = await API.Playlists.getById(item.playlistId);
                        const plData = res.data;
                        const tracks = plData.tracks || plData.Tracks || [];
                        const normalizedTracks = tracks.map(t => ({
                            ...t,
                            id: t.id || t.Id,
                            title: t.title || t.Title,
                            artistName: t.artistName || t.ArtistName,
                            coverImageUrl: t.coverImageUrl || t.CoverImageUrl,
                            source: t.source || t.Source
                        }));
                        const name = plData.name || plData.Name || item.label;

                        setPlaylistTracks(normalizedTracks.map(t => ({ ...t, isOwned: true })));
                        setActivePlaylistName(name);
                    } catch (e) { console.error(e); }
                };
                loadPlaylist();
                setScreen('PLAYLIST_DETAILS');
                setSelectedIndex(0);
                return;
            }
        }

        if (screen === 'PLAYLIST_DETAILS') {
            if (item.id === 'BACK_PL') {
                setScreen('PLAYLISTS');
                setSelectedIndex(0);
                return;
            }
            if (item.id === 'PLAY_PLAYLIST') {
                if (playlistTracks.length > 0) {
                    if (onPlayPlaylist) {
                        onPlayPlaylist(playlistTracks, 0);
                        setScreen('NOW_PLAYING');
                    } else {
                        // Fallback fallback
                        const firstTrackId = playlistTracks[0].id;
                        const mainIndex = tracks.findIndex(t => t.id === firstTrackId);
                        if (mainIndex !== -1) {
                            setCurrentTrackIndex(mainIndex);
                            setIsPlaying(true);
                            setScreen('NOW_PLAYING');
                        }
                    }
                }
                return;
            }
            if (item.id === 'SHUFFLE_PLAYLIST') {
                if (playlistTracks.length > 0) {
                    const shuffled = [...playlistTracks].sort(() => Math.random() - 0.5);
                    if (onPlayPlaylist) {
                        onPlayPlaylist(shuffled, 0);
                        setScreen('NOW_PLAYING');
                    }
                }
                return;
            }
            // Play individual track
            if (item.originalTrack) {
                if (onPlayPlaylist) {
                    // We want to play the whole playlist but start at this track
                    onPlayPlaylist(playlistTracks, item.id); // 'id' in this menu is the index
                    setScreen('NOW_PLAYING');
                } else {
                    const mainIndex = tracks.findIndex(t => t.id === item.originalTrack.id);
                    if (mainIndex !== -1) {
                        setCurrentTrackIndex(mainIndex);
                        setIsPlaying(true);
                        setScreen('NOW_PLAYING');
                    }
                }
                return;
            }
        }

        if (screen === 'ARTISTS') {
            if (item.id === 'PLAY_ALL' || item.id === 'SHUFFLE_ALL') {
                const rand = Math.floor(Math.random() * tracks.length);
                setCurrentTrackIndex(rand);
                setIsPlaying(true);
                setScreen('NOW_PLAYING');
            }
            return;
        }

        // --- SETTINGS ---
        if (screen === 'SETTINGS') {
            if (item.id === 'ADD_CREDITS') onAddCredits && onAddCredits();
            return;
        }

        // --- ACTION MENU ---
        if (screen === 'ACTION_MENU') {
            if (item.id === 'BACK_NP') setScreen('NOW_PLAYING');
            if (item.id === 'GOTO_ADD_PLAYLIST') {
                setScreen('SELECT_PLAYLIST');
                setSelectedIndex(0);
            }
            if (item.id === 'GOTO_TIP') {
                setScreen('TIP_MENU');
                setSelectedIndex(0);
            }
            if (item.id === 'DOWNLOAD_FILE') {
                onDownload && onDownload(currentTrack);
                setScreen('NOW_PLAYING');
            }
            if (item.id === 'PURCHASE_FILE') {
                setScreen('PURCHASE_CONFIRM');
                setSelectedIndex(0);
            }
            if (item.id === 'CACHE_TRACK') {
                onCache && onCache(currentTrack);
                setScreen('NOW_PLAYING');
            }
            return;
        }

        if (screen === 'SELECT_PLAYLIST') {
            if (item.id === 'BACK_AM') {
                setScreen('ACTION_MENU');
                setSelectedIndex(0);
                return;
            }

            if (item.type === 'SELECT_PLAYLIST_ITEM') {
                const addTrack = async () => {
                    try {
                        const API = await import('../services/api').then(m => m.default);
                        let targetTrackId = currentTrack.id || currentTrack.Id;

                        // HANDLE YOUTUBE VIRTUAL TRACKS
                        const isYoutube = currentTrack.category === 'YouTube' || (currentTrack.source && currentTrack.source.startsWith('youtube:'));

                        if (isYoutube) {
                            const isNumeric = !isNaN(parseInt(targetTrackId)) && String(targetTrackId).indexOf('-') === -1 && !String(targetTrackId).startsWith('youtube:');

                            if (!isNumeric) {
                                console.log("[IPodPlayer] Virtual or YouTube track detected. Syncing to database...");
                                let videoId = targetTrackId;
                                if (String(videoId).includes(':')) videoId = videoId.split(':').pop();
                                if (currentTrack.source?.includes(':')) videoId = currentTrack.source.split(':').pop();

                                const trackData = {
                                    youtubeId: (videoId || "").trim(),
                                    title: currentTrack.title || "Unknown Track",
                                    channelTitle: currentTrack.artist || "Unknown Artist",
                                    thumbnailUrl: currentTrack.cover || currentTrack.img || currentTrack.thumbnail || currentTrack.coverImageUrl || "",
                                    viewCount: parseInt(currentTrack.playCount || currentTrack.viewCount || 0),
                                    duration: 0
                                };
                                const savedTrackRes = await API.Youtube.saveTrack(trackData);
                                targetTrackId = savedTrackRes.data.id || savedTrackRes.data.Id || savedTrackRes.data.trackId;
                            }
                        }

                        await API.Playlists.addTrack(item.playlistId, targetTrackId);
                        showNotification("SIGNAL_SYNCED", `Added to ${item.label}`, "success");
                        setScreen('NOW_PLAYING');
                    } catch (e) {
                        console.error(e);
                        showNotification("SIGNAL_ERROR", e.response?.data?.message || e.response?.data || "Failed to add track", "error");
                    }
                };
                addTrack();
                return;
            }
            return;
        }

        if (screen === 'PURCHASE_CONFIRM') {
            if (item.id === 'BACK_AM') {
                setScreen('ACTION_MENU');
                setSelectedIndex(0);
                return;
            }
            if (item.id === 'CONFIRM_PURCHASE') {
                onPurchase && onPurchase(currentTrack);
                setScreen('NOW_PLAYING');
                return;
            }
            return;
        }

        // --- TIP MENU ---
        if (screen === 'TIP_MENU') {
            if (item.id === 'BACK_AM') {
                setScreen('ACTION_MENU');
                setSelectedIndex(0);
                return;
            }
            if (item.id === 'TIP_CUSTOM') {
                const val = window.prompt("Enter tip amount (Credits):", "25");
                const amount = parseInt(val);
                if (!isNaN(amount) && amount > 0) {
                    onPurchase && onPurchase(currentTrack, true, amount);
                    setScreen('NOW_PLAYING');
                }
                return;
            }
            const amount = parseInt(item.id.split('_')[1]);
            if (!isNaN(amount)) {
                onPurchase && onPurchase(currentTrack, true, amount);
                setScreen('NOW_PLAYING');
            }
            return;
        }
    };

    const handleMenuClick = (e) => {
        e?.stopPropagation();

        // --- HIERARCHICAL BACK LOGIC FOR MENU BUTTON ---
        if (screen === 'SONGS_LIKED' || screen === 'SONGS_PURCHASED' || screen === 'SONGS_ALL') {
            setScreen('SONGS');
            setSelectedIndex(0);
        } else if (screen === 'ACTION_MENU' || screen === 'SELECT_PLAYLIST') {
            setScreen('NOW_PLAYING');
            setSelectedIndex(0);
        } else if (screen === 'TIP_MENU' || screen === 'PURCHASE_CONFIRM') {
            setScreen('ACTION_MENU');
            setSelectedIndex(0);
        } else if (screen === 'PLAYLIST_DETAILS') {
            setScreen('PLAYLISTS');
            setSelectedIndex(0);
        } else if (screen !== 'MAIN') {
            setScreen('MAIN');
            setSelectedIndex(0);
        }
    };

    const getAngle = (clientX, clientY) => {
        if (!wheelRef.current) return 0;
        const rect = wheelRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    };

    const onStart = (e) => {
        // CRITICAL: Ignore if clicking any button (Pause, Skip, Menu)
        if (e.target.closest('button')) return;

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
        const onEnd = () => {
            setIsDragging(false);
            lastAngle.current = null;
            setIsScrubbing(false);
        };
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
    }, [isDragging]);

    return (
        <div className="w-full h-full flex items-center justify-center p-4">

            {/* We will render it conditionally below via a helper or direct import if defined at top */}

            {/* ... Existing JSX ... */}
            {/* LARGE PREMIUM FRAME - REDUCED BORDER */}
            <div className="relative w-full max-w-[400px] h-[700px] bg-[#000] rounded-[55px] border-[6px] border-[#333] shadow-[0_50px_120px_rgba(255,0,110,0.2),inset_0_2px_10px_rgba(255,0,110,0.1)] flex flex-col items-center p-8 select-none shrink-0 border-t-[#333] border-l-[#222] scale-100 sm:scale-110">
                {/* ... */}

                {/* SCREEN CONTAINER */}
                <div className="w-full h-[320px] bg-black rounded-2xl border-4 border-[#f00060]/20 overflow-hidden relative shadow-[inset_0_0_50px_rgba(255,0,110,0.1)] flex flex-col">

                    {/* STATUS BAR */}
                    <div className="h-7 bg-[#111] border-b border-[#f00060]/20 flex justify-between items-center px-4 z-20">
                        <div className="flex items-center gap-2">
                            {isPlaying ? <Play size={10} className="text-[#f00060] fill-[#f00060]" /> : <Pause size={10} className="text-[#f00060] fill-[#f00060]" />}
                            <span className="text-[10px] font-black text-white font-mono tracking-widest uppercase">CYBER_POD</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#f00060] font-mono">23:42</span>
                            {currentTrack.isCached && <Zap size={10} className="text-green-500 fill-green-500" />}
                            <Wifi size={12} className={isOnline ? "text-[#f00060]" : "text-gray-600"} />
                        </div>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="flex-1 bg-[#050505] relative overflow-hidden">
                        {screen === 'NOW_PLAYING' ? (
                            // --- NOW PLAYING (THE SLEEK LOOK) ---
                            <div className="flex flex-col h-full bg-[#050505] text-white p-3 pt-1">
                                {/* COVER ART - CENTERED */}
                                <div className="flex items-center justify-center py-1 flex-shrink-0">
                                    <div className="w-36 h-36 bg-black border-2 border-[#f00060]/30 shadow-[0_0_40px_rgba(255,0,110,0.15)] flex items-center justify-center relative overflow-hidden rounded-xl group/cover">
                                        {currentTrack.cover ? (
                                            <img src={currentTrack.cover} alt="Cover" className={`w-full h-full object-cover transition-all duration-500 ${isLocked ? 'blur-md grayscale opacity-40 scale-110' : 'group-hover/cover:scale-105'}`} />
                                        ) : (
                                            <Zap size={50} className="text-[#f00060] animate-pulse" />
                                        )}

                                        {isLocked && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40">
                                                <div className="bg-[#f00060] text-black font-black text-[11px] px-3 py-1 rounded-sm leading-none mb-1 shadow-[0_0_15px_#f00060]">LOCKED</div>
                                                <div className="text-white font-bold text-[10px] tracking-[0.2em]">{currentTrack.price} CRD</div>
                                            </div>
                                        )}
                                        <div className="absolute -inset-10 border border-[#f00060]/5 rotate-45 pointer-events-none" />
                                    </div>
                                </div>

                                {/* TRACK INFO - BELOW COVER */}
                                <div className="flex-1 flex flex-col justify-start min-h-0 space-y-1.5 pt-1 px-2 text-center">
                                    <div>
                                        <h3 className="text-sm font-black text-white truncate tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{currentTrack.title}</h3>
                                        <p
                                            className="text-[10px] font-bold text-[#f00060] truncate tracking-[0.2em] cursor-pointer hover:underline hover:text-white transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const targetId = currentTrack.artistUserId;
                                                if (targetId && navigateToProfile) navigateToProfile(targetId);
                                            }}
                                        >
                                            {currentTrack.artist}
                                        </p>
                                    </div>

                                    {/* ACTION BUTTONS (LIKE/DOWNLOAD) - BELOW TITLE */}
                                    <div className="flex justify-center gap-6 py-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onLike && onLike(currentTrack); }}
                                            className="text-[#f00060]/50 hover:text-[#f00060] transition-colors p-1"
                                        >
                                            <Heart size={18} fill={currentTrack.isLiked ? "#f00060" : "transparent"} strokeWidth={3} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setScreen('ACTION_MENU');
                                                setSelectedIndex(0);
                                            }}
                                            className="text-[#f00060]/50 hover:text-[#f00060] transition-colors p-1"
                                        >
                                            <DownloadIcon size={18} strokeWidth={3} />
                                        </button>
                                    </div>

                                    {/* PROGRESS BAR - AT THE BOTTOM OF AREA */}
                                    <div className="mt-auto space-y-1 pb-1">
                                        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-[#f00060]/20 relative">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-[#f00060] to-[#c70055] shadow-[0_0_15px_#f00060]"
                                                animate={{ width: `${(visualTime / trackDurationSec) * 100}%` }}
                                                transition={{ type: "spring", bounce: 0, duration: 0.05 }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[9px] font-mono text-[#f00060]/60 font-black tracking-widest">
                                            <span>{formatTime(visualTime)}</span>
                                            <span>-{formatTime(Math.max(0, trackDurationSec - visualTime))}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // --- MENU SYSTEM ---
                            <div className="flex flex-col h-full bg-[#050505]">
                                <div className="p-3 border-b border-[#f00060]/20 bg-[#111] flex items-center justify-between h-[42px]">
                                    {
                                        isSearching ? (
                                            <div className="flex items-center w-full gap-2" >
                                                <Search size={12} className="text-[#f00060] animate-pulse" />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search..."
                                                    className="bg-transparent border-none outline-none text-[10px] font-mono text-white w-full uppercase tracking-widest placeholder:text-[#333]"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && getCurrentItems().length > 0) {
                                                            const first = getCurrentItems()[0];
                                                            if (first.id !== 'INFO') handleCenterClick(e, first);
                                                        }
                                                        if (e.key === 'Escape') {
                                                            setIsSearching(false);
                                                            setSearchQuery('');
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <h2 className={`text-[11px] font-black text-[#f00060] tracking-[0.3em] font-mono ${screen === 'PLAYLIST_DETAILS' ? '' : 'uppercase'} truncate max-w-[180px]`}>
                                                {screen === 'MAIN' ? 'SYSTEM' :
                                                    screen === 'ACTION_MENU' ? 'OPTIONS' :
                                                        screen === 'TIP_MENU' ? 'SELECT TIP' :
                                                            screen === 'SONGS' ? 'MUSIC' :
                                                                screen === 'SONGS_LIKED' ? 'LIKED' :
                                                                    screen === 'SONGS_PURCHASED' ? 'PURCHASED' :
                                                                        screen === 'SONGS_ALL' ? 'ALL TRACKS' :
                                                                            screen === 'PURCHASE_CONFIRM' ? 'PURCHASE?' :
                                                                                screen === 'PLAYLIST_DETAILS' ? activePlaylistName :
                                                                                    screen}
                                            </h2>
                                        )}
                                    <button
                                        onClick={() => {
                                            if (isSearching) {
                                                setIsSearching(false);
                                                setSearchQuery('');
                                            } else {
                                                setIsSearching(true);
                                                setSelectedIndex(0);
                                            }
                                        }}
                                        className={`transition-colors ${isSearching ? 'text-white hover:text-red-500' : 'text-[#f00060] hover:text-[#f00060]/80'}`}
                                    >
                                        {isSearching ? <Minimize2 size={12} /> : <Search size={12} />}
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-1 py-3 scrollbar-hide">
                                    {getCurrentItems().map((item, idx) => {
                                        const isAction = ['BACK', 'BACK_SM', 'BACK_AM', 'BACK_NP', 'PLAY_ALL_FILTERED', 'SHUFFLE_ALL_FILTERED', 'PLAY_PLAYLIST', 'SHUFFLE_PLAYLIST'].includes(item.id);
                                        const track = typeof item.id === 'number' ? tracks[item.id] : null;
                                        const isDisabled = !isOnline && track && !track.isOwned;

                                        return (
                                            <div
                                                key={item.id + idx}
                                                className={`flex items-center justify-between px-5 py-3 rounded-lg mb-1.5 transition-all cursor-pointer 
                                                    ${idx === selectedIndex
                                                        ? 'bg-[#f00060] text-black shadow-[0_0_20px_rgba(255,0,110,0.6)] font-black'
                                                        : isDisabled
                                                            ? 'text-[#666] opacity-50 cursor-not-allowed'
                                                            : isAction ? 'text-red-500 font-black' : 'text-[#f00060]/90 hover:text-[#f00060]'
                                                    }`}
                                                onClick={(e) => {
                                                    if (isDisabled) return;
                                                    e.stopPropagation();
                                                    setSelectedIndex(idx);
                                                    handleCenterClick(e, item);
                                                }}
                                            >
                                                <span className="text-[11px] tracking-widest truncate font-bold">{item.label}</span>
                                                <ChevronRight size={14} className={idx === selectedIndex ? 'text-black' : isDisabled ? 'text-transparent' : 'text-[#f00060]/60'} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* SCREEN OVERLAYS: SCANLINES & GLOSS */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-40 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-50" />
                    </div>
                </div>

                {/* CLICK WHEEL SECTION */}
                <div className="flex-1 w-full flex items-center justify-center relative pt-10 pb-6">
                    <div
                        ref={wheelRef}
                        onMouseDown={onStart}
                        onTouchStart={onStart}
                        className="w-64 h-64 rounded-full bg-[#111] border-2 border-[#333] shadow-[0_15px_60px_rgba(0,0,0,1),inset_0_2px_10px_rgba(255,255,255,0.05)] relative flex items-center justify-center cursor-pointer active:scale-[0.99] transition-transform group"
                    >
                        {/* WHEEL BUTTONS */}
                        <button onClick={handleMenuClick} className="absolute top-6 text-xs font-black text-[#666] hover:text-[#f00060] tracking-widest transition-colors font-mono uppercase z-50">MENU</button>
                        <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className="absolute bottom-6 text-[#666] hover:text-white transition-colors z-50"><Minimize2 size={24} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-6 text-[#666] hover:text-white transition-colors active:text-[#f00060] z-50"><SkipBack size={28} fill="currentColor" /></button>
                        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-6 text-[#666] hover:text-white transition-colors active:text-[#f00060] z-50"><SkipForward size={28} fill="currentColor" /></button>

                        {/* CENTER "SELECT" BUTTON */}
                        <button
                            onClick={handleCenterClick}
                            className="w-24 h-24 rounded-full bg-[#080808] border-2 border-[#222] shadow-[0_0_30px_rgba(0,0,0,1)] flex items-center justify-center active:bg-[#f00060] transition-all group/select overflow-hidden relative z-50"
                        >
                            <AnimatePresence mode="wait">
                                {isLocked && screen === 'NOW_PLAYING' ? (
                                    <motion.div
                                        key="buy"
                                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex flex-col items-center"
                                    >
                                        <span className="text-2xl font-black text-[#f00060] group-active/select:text-black">$</span>
                                        <span className="text-[8px] font-black text-[#f00060] group-active/select:text-black font-mono">PURCHASE</span>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="play"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    >
                                        {isPlaying ? (
                                            <Pause size={32} fill="#f00060" className="text-[#f00060] group-active/select:fill-black group-active/select:text-black transition-colors" />
                                        ) : (
                                            <Play size={32} fill="#f00060" className="text-[#f00060] ml-1 group-active/select:fill-black group-active/select:text-black transition-colors" />
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
