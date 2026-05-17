import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
    Play, Pause, SkipBack, SkipForward, Music, ArrowLeft,
    ChevronRight, Zap, Minimize2, Maximize2, Download as DownloadIcon, Heart,
    Wifi, Disc, User, List, DollarSign, Search, Video, Radio as AntennaIcon, RefreshCw,
    Plus, X, Layers
} from 'lucide-react';
import skullImg from '../assets/skull_neon_fuscia.png';

// MENU_ITEMS moved inside component for localization

export const IPodPlayer = ({
    isLandscape,
    tracks,
    vibeFeatures,
    libraryTracks = [], // New prop for full library
    userPlaylists = [], // New prop for playlists
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
    forceNowPlaying, // Receiving the timestamp prop
    activeStation,
    stationChat = [],
    stationQueue = [],
    onSendMessage,
    onRequestTrack
}) => {
    const { showNotification } = useNotification();
    const { t } = useLanguage();

    const MENU_ITEMS = [
        { id: 'NOW_PLAYING', label: t('NOW_PLAYING') },
        { id: 'SONGS', label: t('SONGS') },
        { id: 'SONGS_LIKED', label: t('FAVORITOS') },
        { id: 'PLAYLISTS', label: t('PLAYLISTS') },
        { id: 'ARTISTS', label: t('ARTISTS') },
        { id: 'SETTINGS', label: t('SETTINGS') }
    ];
    const [screen, setScreen] = useState(forceNowPlaying ? 'NOW_PLAYING' : (initialScreen || 'MAIN'));
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [playlists, setPlaylists] = useState([]);
    const [playlistTracks, setPlaylistTracks] = useState([]);
    const [activePlaylistName, setActivePlaylistName] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [recommendedTracks, setRecommendedTracks] = useState([]);

    useEffect(() => {
        const fetchRecommendations = async () => {
            const userId = user?.id || user?.Id;
            const currentTrack = tracks && tracks.length > 0 ? tracks[currentTrackIndex] : null;
            const title = currentTrack?.title || currentTrack?.Title || '';
            const artist = currentTrack?.artist || currentTrack?.ArtistName || '';
            const fallback = title ? `${artist || title} radio`.trim() : '';

                try {
                    const API = await import('../services/api').then(m => m.default);
                    const res = await API.Youtube.getDiscoveryNodes('', userId, fallback).catch(() => null);
                    setRecommendedTracks(Array.isArray(res?.data) ? res.data.slice(0, 10) : []);
                } catch (error) {
                    console.error("Error fetching recommendations:", error);
                }
        };
        fetchRecommendations();
    }, [currentTrackIndex, tracks, user]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchingYoutube, setIsSearchingYoutube] = useState(false);
    const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);
    const [activePlaylistId, setActivePlaylistId] = useState(null);
    const [showResonantStations, setShowResonantStations] = useState(false);
    const [isFullView, setIsFullView] = useState(false);
    const [fullViewTab, setFullViewTab] = useState('playlist'); // 'playlist' | 'library' | 'favorites'
    const [librarySearchQuery, setLibrarySearchQuery] = useState('');
    const [showLibrarySearch, setShowLibrarySearch] = useState(false);
    const [resonantStations, setResonantStations] = useState([]);
    const [resonantTag, setResonantTag] = useState('');
    const [loadingStations, setLoadingStations] = useState(false);
    const fileInputRef = useRef(null);
    const listRef = useRef(null);


    const [isVertical, setIsVertical] = useState(() =>
        typeof window !== 'undefined' ? (window.innerHeight > window.innerWidth || window.innerWidth <= 768) : false
    );

    useEffect(() => {
        const handleResize = () => {
            setIsVertical(typeof window !== 'undefined' && (window.innerHeight > window.innerWidth || window.innerWidth <= 768));
        };
        handleResize(); // ensure correct initial state
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);



    // Debug logging
    console.log("[IPodPlayer] Render. Screen:", screen, "Force:", forceNowPlaying, "Initial:", initialScreen);

    useEffect(() => {
        if (listRef.current && (screen === 'MAIN' || screen.includes('SONGS') || screen.includes('PLAYLIST') || screen.includes('MENU') || isSearching)) {
            const selectedElement = listRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex, screen, isSearching]);

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

    // Spotify Search Effect (Replaces noisy YouTube search for ultra clean metadata & official square covers)
    useEffect(() => {
        if (!isSearching || !searchQuery || searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearchingYoutube(true);
            try {
                const API = await import('../services/api').then(m => m.default);
                const res = await API.Spotify.search(searchQuery);
                const results = (res.data || []).map((item, idx) => {
                    const trackId = item.id || `sp-fb-${idx}`;
                    const title = item.title || 'Unknown Signal';
                    const author = item.artist || 'Resident Neural Core';
                    const thumb = item.coverImageUrl || item.cover;
                    const durationSec = item.durationSeconds || 180;
                    const durationStr = item.duration || '3:00';

                    return {
                        id: `sp-${trackId}`,
                        label: title,
                        artist: author,
                        cover: thumb,
                        type: 'SPOTIFY_SIGNAL',
                        originalTrack: {
                            id: `spotify:${trackId}`,
                            title: title,
                            artist: author,
                            source: `spotify:${trackId}`,
                            cover: thumb,
                            isLocked: false,
                            isOwned: true,
                            category: 'Spotify',
                            duration: durationStr,
                            durationSeconds: durationSec,
                            isLiked: libraryTracks.some(lt => {
                                const ltSource = lt.source || lt.Source;
                                return (ltSource === `spotify:${trackId}`) || (ltSource === `youtube:${trackId}`);
                            })
                        }
                    };
                });
                setSearchResults(results);
            } catch (e) {
                console.error("Spotify Search Error:", e);
            } finally {
                setIsSearchingYoutube(false);
            }
        }, 600);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, isSearching]);

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

    const rawTrack = (currentTrackIndex >= 0 && tracks[currentTrackIndex])
        ? tracks[currentTrackIndex]
        : (tracks[0] || libraryTracks[0] || { title: 'Loading...', artist: 'System' });

    const currentTrack = {
        ...rawTrack,
        id: rawTrack.user_id || rawTrack.id || rawTrack.Id,
        title: rawTrack.title || rawTrack.Title || 'Untitled',
        artist: rawTrack.artist || rawTrack.ArtistName || 'Unknown Artist',
        source: rawTrack.source || rawTrack.Source,
        cover: rawTrack.cover || rawTrack.coverImageUrl || rawTrack.CoverImageUrl,
        isLiked: rawTrack.isLiked !== undefined ? rawTrack.isLiked : (rawTrack.IsLiked !== undefined ? rawTrack.IsLiked : false),
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
                    (t.artist || t.ArtistName || '').toLowerCase().includes(lowerQ))
                .map(t => ({ id: t.originalIndex, label: t.title || t.Title || 'Untitled Track', originalTrack: t }));

            const combined = [...results, ...searchResults];
            if (combined.length === 0) return [{ id: 'INFO', label: isSearchingYoutube ? 'Searching Youtube...' : 'No results' }];
            return combined.map(item => ({ ...item, isFromSearch: true, searchContext: combined }));
        }

        if (screen === 'MAIN') return MENU_ITEMS;
        if (screen === 'SONGS' || screen === 'MUSIC') {
            return [
                { id: 'BACK', label: '.. ' + t('BACK') },
                { id: 'SONGS_PURCHASED', label: t('PURCHASED') },
                { id: 'SONGS_ALL', label: t('ALL_TRACKS') }
            ];
        }

        if (screen === 'SONGS_LIKED' || screen === 'SONGS_PURCHASED' || screen === 'SONGS_ALL') {
            const getFiltered = () => {
                const sourceList = libraryTracks.length > 0 ? libraryTracks : tracks;
                if (screen === 'SONGS_LIKED') {
                    return sourceList.map((t, i) => ({ ...t, originalIndex: i })).filter(t => t.isLiked);
                }
                if (screen === 'SONGS_PURCHASED') return sourceList.map((t, i) => ({ ...t, originalIndex: i })).filter(t => t.isCached);
                return sourceList.map((t, i) => ({ ...t, originalIndex: i }));
            };
            const filtered = getFiltered();

            return [
                { id: 'BACK_SM', label: '.. ' + t('BACK') },
                { id: 'PLAY_ALL_FILTERED', label: t('PLAY_ALL'), tracks: filtered, action: true },
                { id: 'SHUFFLE_ALL_FILTERED', label: t('SHUFFLE_ALL'), tracks: filtered, action: true },
                ...filtered.map(t => ({
                    id: t.originalIndex,
                    label: t.title || t.Title || 'Untitled Track',
                    originalTrack: t
                }))
            ];
        }

        if (screen === 'PLAYLISTS') {
            return [
                { id: 'BACK', label: '.. ' + t('BACK') },
                ...playlists.map((p, i) => {
                    const pid = p.id || p.Id;
                    return { id: `PL_${pid}`, label: p.name || p.Name || 'Untitled Playlist', playlistId: pid, type: 'PLAYLIST' };
                })
            ];
        }

        if (screen === 'PLAYLIST_DETAILS') {
            return [
                { id: 'BACK_PL', label: '.. ' + t('BACK') },
                { id: 'PLAY_PLAYLIST', label: t('PLAY'), action: true },
                { id: 'SHUFFLE_PLAYLIST', label: t('SHUFFLE'), action: true },
                { id: 'UPDATE_PLAYLIST_IMAGE', label: t('UPDATE_IMAGE'), action: true },
                { id: 'DELETE_PLAYLIST', label: t('DELETE_PLAYLIST'), action: true, isDanger: true },
                ...playlistTracks.map((t, i) => ({ id: i, label: t.title || t.Title || 'Untitled Track', originalTrack: t }))
            ];
        }

        if (screen === 'ARTISTS') {
            return [
                { id: 'BACK', label: '.. ' + t('BACK') },
                { id: 'MOCK', label: `${t('EMPTY')} ${screen}` }
            ];
        }
        if (screen === 'SETTINGS') return [
            { id: 'CREDITS', label: `${t('CREDITS')}: ${user?.credits || 0}` },
            { id: 'ADD_CREDITS', label: t('ADD_CREDITS_DEBUG') }
        ];
        if (screen === 'ACTION_MENU') {
            return [
                { id: 'BACK_NP', label: '.. ' + t('BACK_TO_TRACK') },
                ...(activeStation ? [
                    { id: 'STATION_CHAT', label: t('LIVE_CHAT') },
                    { id: 'STATION_QUEUE', label: t('REQUEST_QUEUE') }
                ] : []),
                { id: 'GOTO_ADD_PLAYLIST', label: t('ADD_TO_PLAYLIST') },
                { id: 'GOTO_TIP', label: t('TIP_ARTIST') },
                /*
                // Temporarily hidden for the beta launch
                ...(currentTrack.source && currentTrack.source.startsWith('youtube:')
                    ? [{ id: 'CACHE_TRACK', label: currentTrack.isCached ? t('REMOVE_CACHE') : t('DOWNLOAD_CACHE') }]
                    : []
                ),
                ...(currentTrack.isOwned
                    ? [{ id: 'DOWNLOAD_FILE', label: currentTrack.isCached ? 'REMOVE OFFLINE' : t('DOWNLOAD_FILE') }]
                    : [{ id: 'PURCHASE_FILE', label: `${t('PURCHASE_FILE')} (${currentTrack.price || 0} CRD)` }]
                )
                */
                ...(!currentTrack.isOwned
                    ? [{ id: 'PURCHASE_FILE', label: `${t('PURCHASE_FILE')} (${currentTrack.price || 0} CRD)` }]
                    : []
                )
            ];
        }
        if (screen === 'SELECT_PLAYLIST') {
            return [
                { id: 'BACK_AM', label: '.. ' + t('BACK') },
                ...playlists.map(p => {
                    const pid = p.id || p.Id;
                    return { id: `ADD_TO_${pid}`, label: p.name || p.Name, playlistId: pid, type: 'SELECT_PLAYLIST_ITEM' };
                })
            ];
        }
        if (screen === 'TIP_MENU') {
            return [
                { id: 'BACK_AM', label: '.. ' + t('BACK') },
                { id: 'TIP_10', label: t('TIP_ARTIST') + ' 10' },
                { id: 'TIP_25', label: t('TIP_ARTIST') + ' 25' },
                { id: 'TIP_50', label: t('TIP_ARTIST') + ' 50' },
                { id: 'TIP_100', label: t('TIP_ARTIST') + ' 100' },
                { id: 'TIP_CUSTOM', label: t('CUSTOM_AMOUNT') + '...' }
            ];
        }
        if (screen === 'PURCHASE_CONFIRM') {
            return [
                { id: 'CONFIRM_PURCHASE', label: t('YES') },
                { id: 'BACK_AM', label: t('NO') }
            ];
        }
        if (screen === 'STATION_CHAT') {
            return [
                { id: 'BACK_AM', label: '.. ' + t('BACK') },
                { id: 'SEND_MESSAGE', label: t('SEND_MESSAGE') },
                ...stationChat.slice(-10).reverse().map((msg, i) => ({
                    id: `MSG_${i}`,
                    label: `${msg.username}: ${msg.message}`
                }))
            ];
        }
        if (screen === 'STATION_QUEUE') {
            return [
                { id: 'BACK_AM', label: '.. ' + t('BACK') },
                { id: 'REQUEST_TRACK', label: t('REQUEST_CURRENT_TRACK') },
                ...stationQueue.map((req, i) => ({
                    id: `REQ_${i}`,
                    label: `${req.trackTitle} (${req.username})`
                }))
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
                // Determine source for finding index (prefer tracks queue, fallback to libraryTracks)
                const sourceList = libraryTracks.length > 0 ? libraryTracks : tracks;

                // Determine the context (what list are we playing?)
                const contextList = (item.isFromSearch && item.searchContext)
                    ? item.searchContext.map(i => i.originalTrack)
                    : [item.originalTrack];

                if (item.type === 'YOUTUBE_SIGNAL' || item.type === 'SPOTIFY_SIGNAL') {
                    const ctxIdx = contextList.findIndex(t => t.id === item.originalTrack.id);
                    onPlayPlaylist && onPlayPlaylist(contextList, ctxIdx !== -1 ? ctxIdx : 0);
                    setScreen('NOW_PLAYING');
                    setIsSearching(false);
                    setSearchQuery('');
                } else {
                    const mainIndex = sourceList.findIndex(t => (t.id || t.Id) === (item.originalTrack.id || item.originalTrack.Id));
                    if (mainIndex !== -1) {
                        // If playing from search, treat like a playlist of search results for sequential play
                        if (item.isFromSearch && item.searchContext) {
                            const ctxIdx = contextList.findIndex(t => (t.id || t.Id) === (item.originalTrack.id || item.originalTrack.Id));
                            onPlayPlaylist && onPlayPlaylist(contextList, ctxIdx !== -1 ? ctxIdx : 0);
                        } else {
                            // If it's a direct browse play, we want to play from the source list (All Tracks / Liked etc)
                            onPlayPlaylist && onPlayPlaylist(sourceList, mainIndex);
                        }
                        setScreen('NOW_PLAYING');
                        setIsSearching(false);
                        setSearchQuery('');
                    }
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
                    onPlayPlaylist && onPlayPlaylist(item.tracks.map(t => t.originalTrack || t), 0);
                    setScreen('NOW_PLAYING');
                }
            } else if (item.id === 'SHUFFLE_ALL_FILTERED') {
                if (item.tracks.length > 0) {
                    const shuffled = [...item.tracks].sort(() => Math.random() - 0.5);
                    onPlayPlaylist && onPlayPlaylist(shuffled.map(t => t.originalTrack || t), 0);
                    setScreen('NOW_PLAYING');
                }
            } else if (typeof item.id === 'number') {
                const sourceList = item.isFromSearch && item.searchContext ? item.searchContext : (libraryTracks.length > 0 ? libraryTracks : tracks);
                const filtered = getCurrentItems().filter(i => i.originalTrack).map(i => i.originalTrack);
                const clickedIdxInFiltered = filtered.findIndex(t => (t.id || t.Id) === (item.originalTrack?.id || item.originalTrack?.Id));

                if (onPlayPlaylist) {
                    onPlayPlaylist(filtered, clickedIdxInFiltered !== -1 ? clickedIdxInFiltered : 0);
                } else {
                    setCurrentTrackIndex(item.id);
                    setIsPlaying(true);
                }
                setScreen('NOW_PLAYING');
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
                        setActivePlaylistId(plData.id || plData.Id);
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
            if (item.id === 'DELETE_PLAYLIST') {
                const executeDelete = async () => {
                    try {
                        const API = await import('../services/api').then(m => m.default);
                        await API.Playlists.delete(activePlaylistId);
                        showNotification("PLAYLIST_TERMINATED", "Signal link purged from database.", "success");
                        // Refresh playlists
                        const res = await API.Playlists.getUserPlaylists(user?.id || user?.Id);
                        setPlaylists(res.data || []);
                        setScreen('PLAYLISTS');
                        setSelectedIndex(0);
                    } catch (e) {
                        console.error(e);
                        showNotification("PERMISSION_DENIED", "Unable to terminate signal link.", "error");
                    }
                };
                executeDelete();
                return;
            }
            if (item.id === 'UPDATE_PLAYLIST_IMAGE') {
                fileInputRef.current?.click();
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
            if (item.id === 'STATION_CHAT') {
                setScreen('STATION_CHAT');
                setSelectedIndex(0);
            }
            if (item.id === 'STATION_QUEUE') {
                setScreen('STATION_QUEUE');
                setSelectedIndex(0);
            }
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

        if (screen === 'STATION_CHAT') {
            if (item.id === 'BACK_AM') {
                setScreen('ACTION_MENU');
                setSelectedIndex(0);
                return;
            }
            if (item.id === 'SEND_MESSAGE') {
                const text = window.prompt("Enter message for live chat:");
                if (text && text.trim() && onSendMessage && activeStation) {
                    onSendMessage(text.trim());
                    showNotification("SIGNAL_SENT", "Message broadcasted to comm link.", "success");
                }
            }
            return;
        }

        if (screen === 'STATION_QUEUE') {
            if (item.id === 'BACK_AM') {
                setScreen('ACTION_MENU');
                setSelectedIndex(0);
                return;
            }
            if (item.id === 'REQUEST_TRACK') {
                if (onRequestTrack && activeStation) {
                    onRequestTrack(currentTrack);
                    showNotification("REQ_SUBMITTED", "Track requested in queue.", "success");
                }
            }
            if (item.id.startsWith('REQ_')) {
                // Determine if user is the DJ
                const isHost = activeStation && (activeStation.artistUserId === user?.id || activeStation.ArtistUserId === user?.Id);
                if (isHost) {
                    const reqIdx = parseInt(item.id.split('_')[1]);
                    const req = stationQueue[reqIdx];
                    if (req && req.trackId) {
                        const targetSource = libraryTracks.length > 0 ? libraryTracks : tracks;
                        const matchIdx = targetSource.findIndex(t => t.id === req.trackId || t.Id === req.trackId);
                        if (matchIdx !== -1) {
                            if (onPlayPlaylist) {
                                onPlayPlaylist(targetSource, matchIdx);
                                setScreen('NOW_PLAYING');
                            } else {
                                setCurrentTrackIndex(matchIdx);
                                setIsPlaying(true);
                                setScreen('NOW_PLAYING');
                            }
                        } else {
                            showNotification("TRACK_UNAVAILABLE", "Track not found in current library.", "error");
                        }
                    }
                } else {
                    showNotification("ACCESS_DENIED", "Only the host can accept requests.", "error");
                }
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
        } else if (screen === 'TIP_MENU' || screen === 'PURCHASE_CONFIRM' || screen === 'STATION_CHAT' || screen === 'STATION_QUEUE') {
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

        // Prevent browser scroll/overscroll during wheel interaction
        if (e.type.startsWith('touch')) {
            // passive: false is usually needed for preventDefault in scroll-related events
            // but for React events on components it can vary. 
            // Better to use touch-action: none on the container as well.
            if (e.cancelable) e.preventDefault();
        }

        setIsDragging(true);
        const pos = e.touches ? e.touches[0] : e;
        lastAngle.current = getAngle(pos.clientX, pos.clientY);
    };

    const onMove = (e) => {
        if (!isDragging) return;

        // Prevent browser scroll/overscroll during wheel rotation
        if (e.type.startsWith('touch') && e.cancelable) {
            e.preventDefault();
        }

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
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [isDragging]);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const API = await import('../services/api').then(m => m.default);
            const formData = new FormData();
            formData.append('File', file);

            // We use a temporary upload to get a URL, or the API might support direct update
            // Assuming we need to upload first then update playlist
            const uploadRes = await API.Studio.upload(formData);
            const imageUrl = uploadRes.data.imageUrl || uploadRes.data.ImageUrl;

            await API.Playlists.update(activePlaylistId, { imageUrl });
            showNotification("VISUAL_SYNC", "Playlist pattern updated successfully.", "success");

            // Refresh
            const res = await API.Playlists.getUserPlaylists(user?.id || user?.Id);
            setPlaylists(res.data || []);
            setScreen('PLAYLISTS');
            setSelectedIndex(0);
        } catch (err) {
            console.error(err);
            showNotification("SYNC_ERROR", "Failed to update visual pattern.", "error");
        }
    };

    const getMediaUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        return `${API_URL}${url}`;
    };

    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />

            {/* Standalone Fullscreen Library Overlay (Superimposes everything cleanly) */}
            {createPortal(
                <AnimatePresence>
                    {isFullView && (
                        <motion.div
                            key="full-list"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="fixed inset-0 z-[25] flex flex-col font-mono text-white p-4 sm:p-8 pt-20 lg:pt-8 lg:left-20 select-none overflow-hidden"
                        >
                            {/* Profile Wallpaper Background Video */}
                            {(user?.wallpaperVideoUrl || user?.WallpaperVideoUrl) ? (
                                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                                    <video 
                                        key={user.wallpaperVideoUrl || user.WallpaperVideoUrl}
                                        src={getMediaUrl(user.wallpaperVideoUrl || user.WallpaperVideoUrl)} 
                                        autoPlay 
                                        muted 
                                        loop 
                                        playsInline
                                        className="w-full h-full object-cover opacity-30"
                                    />
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 z-0 pointer-events-none bg-black/90 backdrop-blur-md" style={{ background: 'radial-gradient(circle at 10% 20%, rgba(255, 0, 110, 0.08) 0%, rgba(0, 0, 0, 0.95) 90%)' }} />
                            )}

                            {/* Wireframe Grid Overlay */}
                            <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-[linear-gradient(rgba(240,0,96,0.1)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(240,0,96,0.1)_1px,_transparent_1px)] bg-[size:32px_32px]" />

                            {/* Top Header */}
                            <div className="flex justify-between items-center mb-6 z-10 shrink-0">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setIsFullView(false)} 
                                        className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full hover:border-[#f00060]/50 hover:bg-[#f00060]/10 transition-all text-white/80 hover:text-white"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <h1 className="text-lg sm:text-xl font-black text-white tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(240,0,96,0.3)]">
                                        Tu biblioteca
                                    </h1>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Search Bar Toggle */}
                                    <div className={`flex items-center gap-2 bg-black/40 border transition-all duration-300 rounded px-2 py-1 ${showLibrarySearch ? 'border-[#f00060]/50 w-44 sm:w-64' : 'border-transparent w-10 overflow-hidden'}`}>
                                        <Search 
                                            size={16} 
                                            className="cursor-pointer text-white/60 hover:text-white shrink-0" 
                                            onClick={() => setShowLibrarySearch(!showLibrarySearch)}
                                        />
                                        <input 
                                            type="text"
                                            value={librarySearchQuery}
                                            onChange={(e) => setLibrarySearchQuery(e.target.value)}
                                            placeholder="FILTRAR..."
                                            className="bg-transparent border-none outline-none text-[10px] font-mono text-white w-full uppercase tracking-widest placeholder:text-white/20"
                                        />
                                        {librarySearchQuery && (
                                            <X 
                                                size={12} 
                                                className="cursor-pointer text-white/40 hover:text-white"
                                                onClick={() => setLibrarySearchQuery('')}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Main Workspace */}
                            <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[240px_1fr] lg:gap-8 min-h-0 z-10">
                                
                                {/* LEFT PANEL: Navigation */}
                                <div className="flex lg:flex-col gap-2 mb-4 lg:mb-0 overflow-x-auto no-scrollbar shrink-0 lg:pr-2 border-r lg:border-white/5">
                                    <button 
                                        onClick={() => setFullViewTab('playlist')} 
                                        className={`px-4 py-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-3 w-full border text-left ${fullViewTab === 'playlist' ? 'bg-[#f00060]/10 border-[#f00060] text-white shadow-[0_0_15px_rgba(240,0,96,0.15)] font-black' : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white/80 hover:bg-white/[0.04]'}`}
                                    >
                                        <List size={14} className={fullViewTab === 'playlist' ? 'text-[#f00060]' : ''} />
                                        <span className="flex-1 tracking-wider uppercase">En reproducción</span>
                                        <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-white/60">{tracks.length}</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => setFullViewTab('library')} 
                                        className={`px-4 py-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-3 w-full border text-left ${fullViewTab === 'library' ? 'bg-[#f00060]/10 border-[#f00060] text-white shadow-[0_0_15px_rgba(240,0,96,0.15)] font-black' : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white/80 hover:bg-white/[0.04]'}`}
                                    >
                                        <Layers size={14} className={fullViewTab === 'library' ? 'text-[#f00060]' : ''} />
                                        <span className="flex-1 tracking-wider uppercase">Playlists</span>
                                        <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-white/60">{userPlaylists.length}</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => setFullViewTab('favorites')} 
                                        className={`px-4 py-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-3 w-full border text-left ${fullViewTab === 'favorites' ? 'bg-[#f00060]/10 border-[#f00060] text-white shadow-[0_0_15px_rgba(240,0,96,0.15)] font-black' : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white/80 hover:bg-white/[0.04]'}`}
                                    >
                                        <Heart size={14} className={fullViewTab === 'favorites' ? 'text-[#f00060]' : ''} />
                                        <span className="flex-1 tracking-wider uppercase">Favoritos</span>
                                        <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded font-mono text-white/60">{libraryTracks.filter(t => t.isLiked).length}</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => setFullViewTab('player')} 
                                        className={`px-4 py-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-3 w-full border text-left ${fullViewTab === 'player' ? 'bg-[#f00060]/10 border-[#f00060] text-white shadow-[0_0_15px_rgba(240,0,96,0.15)] font-black' : 'bg-white/[0.02] border-white/5 text-white/50 hover:text-white/80 hover:bg-white/[0.04]'}`}
                                    >
                                        <Disc size={14} className={`${fullViewTab === 'player' ? 'text-[#f00060]' : ''} ${isPlaying && fullViewTab === 'player' ? 'animate-spin' : ''}`} />
                                        <span className="flex-1 tracking-wider uppercase">Reproductor</span>
                                    </button>
                                </div>

                                {/* RIGHT PANEL: List / Deck */}
                                <div className="flex-1 bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-6 flex flex-col min-h-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                                    
                                    {/* Grid Glow Overlay inside panel */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-[#f00060]/5 to-transparent pointer-events-none opacity-20" />
                                    
                                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 z-10 min-h-0 relative">
                                        
                                        {/* Tab: Playlist (Queue) */}
                                        {fullViewTab === 'playlist' && (
                                            <>
                                                {(() => {
                                                    const filteredPlaylist = tracks.filter(t => {
                                                        const title = (t.title || t.Title || '').toLowerCase();
                                                        const artist = (t.artist || t.ArtistName || t.author || t.Author || t.channelTitle || t.ChannelTitle || '').toLowerCase();
                                                        return title.includes(librarySearchQuery.toLowerCase()) || artist.includes(librarySearchQuery.toLowerCase());
                                                    });

                                                    if (filteredPlaylist.length === 0) {
                                                        return (
                                                            <div className="text-center py-12 text-white/30 text-xs">
                                                                [ NINGÚN DISPOSITIVO / PISTA ENCONTRADA ]
                                                            </div>
                                                        );
                                                    }

                                                    return filteredPlaylist.map((t, idx) => {
                                                        const actualIndex = tracks.findIndex(original => original === t);
                                                        const isActive = actualIndex === currentTrackIndex;
                                                        return (
                                                            <div 
                                                                key={idx} 
                                                                className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 group/row cursor-pointer ${isActive ? 'bg-[#f00060]/10 border-[#f00060]/30 shadow-[0_0_15px_rgba(240,0,96,0.05)]' : 'bg-black/20 border-white/5 hover:bg-white/[0.03] hover:border-white/10'}`}
                                                                onClick={() => { setCurrentTrackIndex(actualIndex); setIsPlaying(true); }}
                                                            >
                                                                {/* Cover Art Box with hover overlay */}
                                                                <div className={`w-12 h-12 bg-white/5 flex items-center justify-center rounded-lg overflow-hidden shrink-0 relative border transition-all ${isActive ? 'border-[#f00060]/50 shadow-[0_0_10px_rgba(240,0,96,0.2)]' : 'border-white/10 group-hover/row:border-white/20'}`}>
                                                                    {t.ImageUrl || t.imageUrl || t.cover ? (
                                                                        <img src={getMediaUrl(t.ImageUrl || t.imageUrl || t.cover)} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Music size={16} className="text-white/40" />
                                                                    )}
                                                                    
                                                                    {/* Dynamic soundwave animator if active & playing */}
                                                                    {isActive && isPlaying ? (
                                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-0.5">
                                                                            <div className="w-0.5 h-3 bg-[#f00060] rounded-full animate-[bounce_0.8s_infinite]" style={{ animationDelay: '0.1s' }} />
                                                                            <div className="w-0.5 h-4 bg-[#f00060] rounded-full animate-[bounce_0.8s_infinite]" style={{ animationDelay: '0.3s' }} />
                                                                            <div className="w-0.5 h-2 bg-[#f00060] rounded-full animate-[bounce_0.8s_infinite]" style={{ animationDelay: '0.5s' }} />
                                                                            <div className="w-0.5 h-3.5 bg-[#f00060] rounded-full animate-[bounce_0.8s_infinite]" style={{ animationDelay: '0.2s' }} />
                                                                        </div>
                                                                    ) : isActive ? (
                                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                            <Play size={14} className="text-[#f00060]" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <Play size={14} className="text-white" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Title & Artist details */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className={`text-xs font-bold truncate tracking-wide ${isActive ? 'text-[#f00060]' : 'text-white/90 group-hover/row:text-white'}`}>{t.title || t.Title || 'Untitled'}</div>
                                                                    <div className="text-[10px] text-white/40 truncate mt-0.5 flex items-center gap-1.5 font-mono">
                                                                        {(() => {
                                                                            const artist = t.artist || t.ArtistName || t.author || t.Author || t.channelTitle || t.ChannelTitle;
                                                                            if (artist && artist !== 'YouTube') return <span className="truncate">{artist}</span>;
                                                                            const title = t.title || t.Title || '';
                                                                            if (title.includes(' - ')) return <span className="truncate">{title.split(' - ')[0]}</span>;
                                                                            return <span className="text-red-500 uppercase tracking-widest text-[8px] bg-red-950/20 px-1 border border-red-900/30 rounded-sm">[ YT_SIGNAL ]</span>;
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}

                                                {/* Recommendations section inside Playlist Tab */}
                                                {recommendedTracks && recommendedTracks.length > 0 && !librarySearchQuery && (
                                                    <div className="mt-8 pt-6 border-t border-white/5">
                                                        <h2 className="text-[10px] font-black text-white/50 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <Zap size={10} className="text-[#f00060] animate-pulse" />
                                                            Sugerencias para hoy
                                                        </h2>
                                                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                                            {recommendedTracks.slice(0, 5).map((t, idx) => (
                                                                <div 
                                                                    key={`rec-${idx}`} 
                                                                    className="w-32 shrink-0 cursor-pointer group/card"
                                                                    onClick={() => onPlayPlaylist && onPlayPlaylist(recommendedTracks, idx)}
                                                                >
                                                                    <div className="w-32 h-32 bg-black border border-white/5 flex items-center justify-center rounded-xl overflow-hidden mb-2 relative group-hover/card:border-[#f00060]/30 transition-all">
                                                                        {t.ImageUrl || t.imageUrl ? (
                                                                            <img src={getMediaUrl(t.ImageUrl || t.imageUrl)} alt="" className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
                                                                        ) : (
                                                                            <Music size={24} className="text-[#f00060]/40" />
                                                                        )}
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                                            <Play size={20} className="text-white" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-[11px] font-bold text-white truncate px-1">{t.title || t.Title || 'Untitled'}</div>
                                                                    <div className="text-[9px] text-white/40 truncate mt-0.5 px-1 font-mono">{t.artist || t.ArtistName || 'YouTube'}</div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <h2 className="text-[10px] font-black text-white/50 mb-4 mt-8 uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <Disc size={10} className="text-[#f00060] animate-pulse" />
                                                            Vuelve a tu música
                                                        </h2>
                                                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                                            {tracks.slice(0, 5).map((t, idx) => (
                                                                <div 
                                                                    key={`back-${idx}`} 
                                                                    className="w-32 shrink-0 cursor-pointer group/card"
                                                                    onClick={() => setCurrentTrackIndex(idx)}
                                                                >
                                                                    <div className="w-32 h-32 bg-black border border-white/5 flex items-center justify-center rounded-xl overflow-hidden mb-2 relative group-hover/card:border-[#f00060]/30 transition-all">
                                                                        {t.ImageUrl || t.imageUrl ? (
                                                                            <img src={getMediaUrl(t.ImageUrl || t.imageUrl)} alt="" className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
                                                                        ) : (
                                                                            <Music size={24} className="text-[#f00060]/40" />
                                                                        )}
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                                            <Play size={20} className="text-white" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-[11px] font-bold text-white truncate px-1">{t.title || t.Title || 'Untitled'}</div>
                                                                    <div className="text-[9px] text-white/40 truncate mt-0.5 px-1 font-mono">{t.artist || t.ArtistName || 'YouTube'}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Tab: Playlists */}
                                        {fullViewTab === 'library' && (
                                            <>
                                                {(() => {
                                                    const filteredPlaylists = userPlaylists.filter(p => {
                                                        return (p.name || p.Name || '').toLowerCase().includes(librarySearchQuery.toLowerCase());
                                                    });

                                                    if (filteredPlaylists.length === 0) {
                                                        return (
                                                            <div className="text-center py-12 text-white/30 text-xs">
                                                                [ NINGUNA LISTA ENCONTRADA ]
                                                            </div>
                                                        );
                                                    }

                                                    return filteredPlaylists.map((p, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-black/20 hover:bg-white/[0.03] hover:border-[#f00060]/30 transition-all duration-300 group/row cursor-pointer"
                                                            onClick={() => {
                                                                onPlayPlaylist && onPlayPlaylist(p.tracks || [], 0);
                                                                setFullViewTab('playlist');
                                                            }}
                                                        >
                                                            <div className="w-12 h-12 bg-[#f00060]/10 flex items-center justify-center rounded-lg border border-white/10 group-hover/row:border-[#f00060]/30 transition-all shrink-0">
                                                                <Layers size={20} className="text-[#f00060]" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold text-white group-hover/row:text-[#f00060] transition-colors tracking-wide uppercase">{p.name || p.Name || 'Untitled'}</div>
                                                                <div className="text-[10px] text-white/40 mt-1 font-mono">PLAYLIST // {p.tracks?.length || 0} SEÑALES</div>
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </>
                                        )}

                                        {/* Tab: Favorites */}
                                        {fullViewTab === 'favorites' && (
                                            <>
                                                {(() => {
                                                    const filteredFavs = libraryTracks.filter(t => t.isLiked).filter(t => {
                                                        const title = (t.title || t.Title || '').toLowerCase();
                                                        const artist = (t.artist || t.Artist || '').toLowerCase();
                                                        return title.includes(librarySearchQuery.toLowerCase()) || artist.includes(librarySearchQuery.toLowerCase());
                                                    });

                                                    if (filteredFavs.length === 0) {
                                                        return (
                                                            <div className="text-center py-12 text-white/30 text-xs">
                                                                [ NINGÚN FAVORITO ENCONTRADO ]
                                                            </div>
                                                        );
                                                    }

                                                    return filteredFavs.map((t, idx) => (
                                                        <div 
                                                            key={idx} 
                                                            className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-black/20 hover:bg-white/[0.03] hover:border-[#f00060]/30 transition-all duration-300 group/row cursor-pointer"
                                                            onClick={() => {
                                                                const favorites = libraryTracks.filter(track => track.isLiked);
                                                                const favIndex = favorites.findIndex(original => original === t);
                                                                onPlayPlaylist && onPlayPlaylist(favorites, favIndex >= 0 ? favIndex : 0);
                                                                setFullViewTab('playlist');
                                                            }}
                                                        >
                                                            <div className="w-12 h-12 bg-[#ff006e]/10 flex items-center justify-center rounded-lg border border-white/10 group-hover/row:border-[#ff006e]/30 transition-all shrink-0">
                                                                <Heart size={18} className="text-[#ff006e]" fill="currentColor" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold text-white group-hover/row:text-[#ff006e] transition-colors tracking-wide">{t.title || t.Title || 'Untitled'}</div>
                                                                <div className="text-[10px] text-white/40 mt-1 font-mono">SEÑAL // {t.artist || t.Artist || 'Desconocido'}</div>
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </>
                                        )}

                                        {/* Tab: Playing visualizer deck */}
                                        {fullViewTab === 'player' && (
                                            <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-6 h-full min-h-0">
                                                
                                                {/* GORGEOUS ROTATING VINYL DECK */}
                                                <div className="relative shrink-0 flex items-center justify-center">
                                                    
                                                    {/* Glowing visualizer ring behind record */}
                                                    <div className={`absolute inset-0 rounded-full bg-[#f00060]/10 blur-3xl transition-transform duration-1000 ${isPlaying ? 'scale-125 opacity-100' : 'scale-100 opacity-30'}`} />

                                                    {/* Physical record body */}
                                                    <div 
                                                        className={`w-52 h-52 sm:w-64 sm:h-64 rounded-full border-[6px] border-[#1a1a1a] shadow-[0_15px_40px_rgba(0,0,0,0.8)] bg-gradient-to-tr from-black via-[#0d0d0d] to-black relative flex items-center justify-center transition-all duration-300`}
                                                    >
                                                        {/* Record grooves */}
                                                        <div className="absolute inset-2 rounded-full border border-white/[0.02]" />
                                                        <div className="absolute inset-5 rounded-full border border-white/[0.03]" />
                                                        <div className="absolute inset-8 rounded-full border border-white/[0.02]" />
                                                        <div className="absolute inset-12 rounded-full border border-white/[0.04]" />
                                                        <div className="absolute inset-16 rounded-full border border-white/[0.02]" />
                                                        <div className="absolute inset-20 rounded-full border border-white/[0.03]" />

                                                        {/* Spinning Center Label */}
                                                        <div 
                                                            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#151515] overflow-hidden bg-black flex items-center justify-center ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
                                                        >
                                                            {tracks[currentTrackIndex]?.ImageUrl || tracks[currentTrackIndex]?.imageUrl || tracks[currentTrackIndex]?.cover ? (
                                                                <img src={getMediaUrl(tracks[currentTrackIndex].ImageUrl || tracks[currentTrackIndex].imageUrl || tracks[currentTrackIndex].cover)} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Music size={28} className="text-[#f00060]/50" />
                                                            )}
                                                            
                                                            {/* Spill Spindle Hole */}
                                                            <div className="absolute w-3 h-3 bg-zinc-900 border border-black rounded-full shadow-[inset_0_1px_3px_black]" />
                                                        </div>
                                                    </div>

                                                    {/* Virtual cyber stylus / tone arm */}
                                                    <div 
                                                        className="absolute top-0 right-[-15px] sm:right-[-25px] w-[50px] h-[100px] origin-top transition-transform duration-1000 pointer-events-none"
                                                        style={{ 
                                                            transform: isPlaying ? 'rotate(18deg)' : 'rotate(0deg)',
                                                            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))'
                                                        }}
                                                    >
                                                        <svg width="40" height="90" viewBox="0 0 40 90" fill="none">
                                                            <path d="M5 2 L5 65 L25 80 L32 80" stroke="#444" strokeWidth="2" strokeLinecap="round" />
                                                            <circle cx="5" cy="5" r="4" fill="#666" />
                                                            <rect x="23" y="76" width="12" height="6" rx="1" fill="#f00060" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                
                                                {/* Title, Artist and Progress metadata */}
                                                <div className="text-center max-w-[90%] z-10 shrink-0">
                                                    <h2 className="text-sm sm:text-base font-black text-white tracking-wide truncate">{tracks[currentTrackIndex]?.title || tracks[currentTrackIndex]?.Title || 'Sin título'}</h2>
                                                    <p className="text-[10px] sm:text-xs text-white/50 mt-1.5 uppercase font-mono tracking-widest truncate">
                                                        {(() => {
                                                            const t = tracks[currentTrackIndex];
                                                            if (!t) return 'Desconocido';
                                                            const artist = t.artist || t.ArtistName || t.author || t.Author || t.channelTitle || t.ChannelTitle;
                                                            if (artist && artist !== 'YouTube') return artist;
                                                            const title = t.title || t.Title || '';
                                                            if (title.includes(' - ')) return title.split(' - ')[0];
                                                            return 'YouTube';
                                                        })()}
                                                    </p>
                                                </div>
                                                
                                                {/* Glossy Progress bar deck */}
                                                <div className="w-[90%] max-w-md space-y-2 z-10 shrink-0">
                                                    <div 
                                                        className="relative w-full h-1 bg-white/10 rounded-full cursor-pointer group/seek"
                                                        onClick={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            const percent = (e.clientX - rect.left) / rect.width;
                                                            onSeek(percent * duration);
                                                        }}
                                                    >
                                                        <div className="absolute top-0 left-0 h-full bg-[#f00060] rounded-full shadow-[0_0_10px_#f00060]" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                                                        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg border border-[#f00060]/30 transition-transform scale-70 group-hover/seek:scale-100" style={{ left: `${(currentTime / duration) * 100}%` }}></div>
                                                    </div>
                                                    <div className="flex justify-between text-[9px] text-white/40 font-mono tracking-widest">
                                                        <span>{formatTime(currentTime)}</span>
                                                        <span>{formatTime(duration)}</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Interactive mechanical Deck Controls */}
                                                <div className="flex items-center gap-6 z-10 shrink-0">
                                                    <button className="text-white/30 hover:text-[#f00060] transition-colors p-1">
                                                        <RefreshCw size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setCurrentTrackIndex(prev => Math.max(0, prev - 1))} 
                                                        className="text-white/60 hover:text-white transition-all p-1 hover:scale-110 active:scale-95"
                                                    >
                                                        <SkipBack size={24} />
                                                    </button>
                                                    <button 
                                                        onClick={() => setIsPlaying(!isPlaying)} 
                                                        className="w-14 h-14 bg-white/5 border border-white/10 hover:border-[#f00060]/50 hover:bg-[#f00060]/10 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg relative group/playbtn"
                                                    >
                                                        <div className="absolute inset-[-4px] border border-[#f00060]/20 rounded-full animate-pulse group-hover/playbtn:border-[#f00060]/45" />
                                                        {isPlaying ? <Pause size={20} className="text-[#f00060]" fill="currentColor" /> : <Play size={20} className="ml-1 text-white" fill="currentColor" />}
                                                    </button>
                                                    <button 
                                                        onClick={() => setCurrentTrackIndex(prev => Math.min(tracks.length - 1, prev + 1))} 
                                                        className="text-white/60 hover:text-white transition-all p-1 hover:scale-110 active:scale-95"
                                                    >
                                                        <SkipForward size={24} />
                                                    </button>
                                                    <button className="text-white/30 hover:text-[#f00060] transition-colors p-1">
                                                        <Layers size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* LARGE PREMIUM FRAME - REDUCED BORDER (NEVER DISTORTS WHEN LIBRARY IS OPEN!) */}
            <div className={`relative w-full ${isVertical ? 'max-w-[280px] h-[480px] rounded-[30px] p-4' : 'max-w-[500px] h-[700px] max-h-[95vh] sm:max-h-[700px] rounded-[55px] p-8'} bg-[#000] border-[6px] border-[#333] shadow-[0_50px_120px_rgba(255,0,110,0.2),inset_0_2px_10px_rgba(255,0,110,0.1)] flex flex-col items-center select-none shrink-0 border-t-[#333] border-l-[#222] transition-all duration-500`}>
                <div 
                    onClick={() => {
                        const fileInput = fileInputRef.current;
                        if (fileInput) {
                            fileInput.click();
                        }
                    }} 
                    className="absolute inset-0 bg-transparent cursor-pointer z-0" 
                    title="Haga clic en los bordes para cambiar la calcomanía del iPod"
                />

                {/* STATUS BAR - REDESIGNED */}
                <div className="absolute inset-x-8 top-12 h-6 flex justify-between items-center z-10 select-none pointer-events-none">
                    <span className="text-[10px] font-black text-[#f00060] tracking-widest font-mono">FATALE_FM</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-[#f00060] rounded-full animate-ping" />
                        <span className="text-[10px] font-bold text-white/40 font-mono uppercase">ONLINE</span>
                    </div>
                </div>

                {/* SCREEN CONTAINER */}
                <div className={`w-full ${isVertical ? 'h-[222px]' : 'h-[320px]'} bg-black rounded-2xl border-4 border-[#f00060]/20 overflow-hidden relative shadow-[inset_0_0_50px_rgba(255,0,110,0.1)] flex flex-col transition-all duration-300 z-10`}>

                    {/* STATUS BAR - REDESIGNED */}
                    <div className="h-7 bg-gradient-to-b from-[#1a1a1a] to-black/40 backdrop-blur-md border-b border-[#f00060]/30 flex justify-between items-center px-4 z-20">
                        <div className="flex items-center gap-2">
                            {isPlaying ? <Pause size={12} fill="#ff006e" /> : <Play size={12} fill="#ff006e" />}
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
                        <AnimatePresence mode="wait">
                            {screen === 'NOW_PLAYING' ? (
                                // --- NOW PLAYING (THE SLEEK LOOK) ---
                                <motion.div
                                    key="now-playing"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex ${isVertical ? 'flex-col' : 'flex-row'} h-full bg-[#050505] text-white ${isVertical ? 'p-2.5 pt-1 gap-2' : 'p-3 pt-1 gap-3'} relative`}
                                >
                                    {/* CYBERPUNK EVOLVE BUTTON */}
                                    <motion.button
                                        onClick={(e) => { e.stopPropagation(); onNext && onNext(); }}
                                        className="absolute top-1.5 right-2 z-50 bg-white/[0.03] border border-white/10 px-2 h-4 rounded-sm hover:border-[#f00060]/60 active:scale-95 transition-colors group overflow-hidden"
                                        whileHover={{ boxShadow: "0 0 15px rgba(240,0,96,0.2)" }}
                                        title="Evolve Signal"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f00060]/20 to-transparent w-full h-full -translate-x-full group-hover:animate-[scan_1.5s_infinite] pointer-events-none" />
                                        <motion.span
                                            className="text-[7px] font-black text-white/40 tracking-[0.2em] font-mono group-hover:text-white transition-colors relative z-10 block leading-none"
                                            whileHover={{ x: [0, -1, 1, -1, 0] }}
                                            transition={{ repeat: Infinity, duration: 0.2 }}
                                        >
                                            EVOLVE
                                        </motion.span>
                                    </motion.button>

                                    {/* LEFT/TOP: COVER ART */}
                                    <div className={`${isVertical ? 'w-full flex justify-center py-1' : 'w-[200px] flex-shrink-0 flex items-center justify-center'}`}>
                                        <div className={`${isVertical ? 'w-20 h-20' : 'w-[180px] h-[180px]'} bg-black border-2 border-[#f00060]/30 shadow-[0_0_40px_rgba(255,0,110,0.15)] flex items-center justify-center relative overflow-hidden rounded-xl group/cover transition-all duration-300`}>
                                        {currentTrack.cover ? (
                                            <img src={currentTrack.cover} alt="Cover" className={`w-full h-full object-cover transition-all duration-500 ${isLocked ? 'blur-md grayscale opacity-40 scale-110' : 'group-hover/cover:scale-105'}`} />
                                        ) : (
                                            <div 
                                                className={`system-skull ${isVertical ? 'w-16 h-16' : 'w-32 h-32'} animate-beat-pulse`} 
                                                style={{ 
                                                    WebkitMaskImage: `url(${skullImg})`, 
                                                    maskImage: `url(${skullImg})`,
                                                    filter: `drop-shadow(0 0 12px var(--theme-color))` 
                                                }} 
                                            />
                                        )}
                                        {isLocked && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40">
                                                <div className={`bg-[#f00060] text-black font-black ${isVertical ? 'text-[10px]' : 'text-[12px]'} px-3 py-1 rounded-sm leading-none mb-1 shadow-[0_0_15px_#f00060]`}>LOCKED</div>
                                                <div className={`text-white font-bold ${isVertical ? 'text-[8px]' : 'text-[10px]'} tracking-[0.2em]`}>{currentTrack.price} CRD</div>
                                            </div>
                                        )}
                                        <div className="absolute -inset-10 border border-[#f00060]/5 rotate-45 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* RIGHT/BOTTOM: TRACK INFO & CONTROLS */}
                                    <div className={`flex-1 flex flex-col justify-between ${isVertical ? 'text-center' : 'text-left py-2'} min-w-0`}>
                                        <div className="space-y-1">
                                            <h3 className={`${isVertical ? 'text-[10px]' : 'text-sm'} font-black text-white truncate tracking-tighter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all`}>
                                                {activeStation ? (activeStation.name || activeStation.Name) : currentTrack.title}
                                            </h3>
                                            <p
                                                className={`${isVertical ? 'text-[7px]' : 'text-[10px]'} font-bold text-[#f00060] truncate tracking-[0.2em] cursor-pointer hover:underline hover:text-white transition-all`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const targetId = activeStation ? (activeStation.artistUserId || activeStation.ArtistUserId) : currentTrack.artistUserId;
                                                    if (targetId && navigateToProfile) navigateToProfile(targetId);
                                                }}
                                            >
                                                {activeStation ? `LIVE: ${activeStation.artistName || activeStation.ArtistName || 'HOST'}` : currentTrack.artist}
                                            </p>
                                        </div>

                                        {/* NEURO-COGNITIVE VIBE SCANNER HUD */}
                                        {vibeFeatures && !isVertical && (
                                            <div className="my-1.5 p-1.5 bg-black/40 border border-[#f00060]/10 rounded-sm font-mono text-[6.5px] text-[#f00060]/85 uppercase tracking-[0.05em] space-y-1 select-none">
                                                <div className="flex justify-between items-center text-[7.5px] border-b border-[#f00060]/15 pb-0.5 mb-1 text-white/90">
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-[#f00060] rounded-full animate-ping" />
                                                        NEURAL EMOTIVE VIBE
                                                    </span>
                                                    <span className="text-[7px] text-[#f00060] font-black">
                                                        {vibeFeatures.valence < 0.35 ? 'MELANCHOLIC DEEP SIGNAL' : 
                                                         vibeFeatures.valence >= 0.65 ? 'EUPHORIC NEURAL WAVE' : 'BALANCED AMBIENT PULSE'}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                    <div className="space-y-0.5">
                                                        <div className="flex justify-between text-[6.5px]">
                                                            <span>VALENCE (MOOD)</span>
                                                            <span className="text-white font-bold">{Math.round(vibeFeatures.valence * 100)}%</span>
                                                        </div>
                                                        <div className="w-full bg-white/5 h-1 rounded-sm overflow-hidden border border-white/5">
                                                            <div className="bg-gradient-to-r from-blue-500 to-[#f00060] h-full" style={{ width: `${vibeFeatures.valence * 100}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex justify-between text-[6.5px]">
                                                            <span>ENERGY (INTENSITY)</span>
                                                            <span className="text-white font-bold">{Math.round(vibeFeatures.energy * 100)}%</span>
                                                        </div>
                                                        <div className="w-full bg-white/5 h-1 rounded-sm overflow-hidden border border-white/5">
                                                            <div className="bg-gradient-to-r from-yellow-500 to-red-500 h-full" style={{ width: `${vibeFeatures.energy * 100}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-0.5">
                                                        <span>TEMPO/BPM</span>
                                                        <span className="text-white font-bold">{Math.round(vibeFeatures.tempo)} BPM</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-0.5">
                                                        <span>DANCEABILITY</span>
                                                        <span className="text-white font-bold">{Math.round(vibeFeatures.danceability * 100)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ACTION BUTTONS */}
                                        <div className={`flex ${isVertical ? 'justify-center gap-2' : 'justify-start gap-4'} py-1 transition-all`}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onLike && onLike(currentTrack);
                                                }}
                                                className="text-[#f00060]/50 hover:text-[#f00060] transition-colors p-1"
                                            >
                                                <Heart
                                                    size={isVertical ? 14 : 18}
                                                    fill={currentTrack.isLiked ? "#f00060" : "transparent"}
                                                    strokeWidth={3}
                                                />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setScreen('ACTION_MENU');
                                                    setSelectedIndex(0);
                                                }}
                                                className="text-[#f00060]/50 hover:text-[#f00060] transition-colors p-1"
                                            >
                                                <DownloadIcon size={isVertical ? 14 : 18} strokeWidth={3} />
                                            </button>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setShowResonantStations(true);
                                                    setLoadingStations(true);
                                                    try {
                                                        const API = await import('../services/api').then(m => m.default);
                                                        const trackTags = (currentTrack.tags || currentTrack.Tags || '').toLowerCase();
                                                        const tagGuess = trackTags.split(/[,\s]+/).find(t => t.length > 2) || 'music';
                                                        setResonantTag(tagGuess);
                                                        const res = await API.Pulse.getResonantStations(tagGuess);
                                                        setResonantStations(res.data?.stations || []);
                                                    } catch (err) {
                                                        console.warn('[PULSE] Failed to fetch resonant stations', err);
                                                        setResonantStations([]);
                                                    } finally {
                                                        setLoadingStations(false);
                                                    }
                                                }}
                                                className="text-[#f00060]/50 hover:text-[#f00060] transition-colors p-1 relative"
                                                title="Resonant Stations"
                                            >
                                                <AntennaIcon size={isVertical ? 14 : 18} strokeWidth={3} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsFullView(true);
                                                }}
                                                className="text-[#f00060]/50 hover:text-[#f00060] transition-colors p-1"
                                                title="Full Playlist"
                                            >
                                                <Maximize2 size={isVertical ? 14 : 18} strokeWidth={3} />
                                            </button>
                                        </div>

                                        {/* PROGRESS BAR */}
                                        <div
                                            className="space-y-0.5 pb-0.5 cursor-pointer group/progress"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = e.clientX - rect.left;
                                                const pct = x / rect.width;
                                                const targetTime = pct * trackDurationSec;
                                                onSeek && onSeek(targetTime);
                                            }}
                                        >
                                            <div className={`${isVertical ? 'h-1.5' : 'h-2'} bg-[#1a1a1a] rounded-full overflow-hidden border border-[#f00060]/20 relative transition-all`}>
                                                <motion.div
                                                    className="h-full bg-gradient-to-r from-[#f00060] to-[#c70055] shadow-[0_0_15px_#f00060]"
                                                    animate={{ width: `${(visualTime / trackDurationSec) * 100}%` }}
                                                    transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                                                />
                                            </div>
                                            <div className={`flex justify-between ${isVertical ? 'text-[8px]' : 'text-[9px]'} font-mono text-[#f00060]/60 font-black tracking-widest transition-all`}>
                                                <span>{formatTime(visualTime)}</span>
                                                <span>-{formatTime(Math.max(0, trackDurationSec - visualTime))}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                // --- MENU SYSTEM ---
                                <motion.div
                                    key="menu"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col h-full bg-[#050505] no-scrollbar overflow-hidden"
                                >
                                    <div className="p-3 border-b border-[#f00060]/30 bg-gradient-to-r from-black/80 via-[#1a1a1a] to-black/80 backdrop-blur-sm flex items-center justify-between h-[42px] relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
                                        {isSearching ? (
                                            <div className="flex items-center w-full gap-2">
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
                                                {screen === 'MAIN' ? 'BUSCA ALGO' :
                                                    screen === 'ACTION_MENU' ? 'OPTIONS' :
                                                        screen === 'TIP_MENU' ? 'SELECT TIP' :
                                                            screen === 'SONGS' ? 'MUSIC' :
                                                                screen === 'SONGS_LIKED' ? 'LIKED' :
                                                                    screen === 'SONGS_PURCHASED' ? 'PURCHASED' :
                                                                        screen === 'SONGS_ALL' ? 'ALL TRACKS' :
                                                                            screen === 'PURCHASE_CONFIRM' ? 'PURCHASE?' :
                                                                                screen === 'STATION_CHAT' ? 'LIVE COMM' :
                                                                                    screen === 'STATION_QUEUE' ? 'REQ. QUEUE' :
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
                                    <div className={`flex-1 flex ${isVertical ? 'flex-col' : 'flex-row'} overflow-hidden`}>
                                        <div
                                            ref={listRef}
                                            className="flex-1 overflow-y-auto p-1 py-3 no-scrollbar scroll-smooth"
                                        >
                                            {getCurrentItems().map((item, idx) => {
                                                const isAction = ['BACK', 'BACK_SM', 'BACK_AM', 'BACK_NP', 'PLAY_ALL_FILTERED', 'SHUFFLE_ALL_FILTERED', 'PLAY_PLAYLIST', 'SHUFFLE_PLAYLIST'].includes(item.id);
                                                const track = typeof item.id === 'number' ? tracks[item.id] : null;
                                                const isDisabled = !isOnline && track && !track.isOwned;

                                                return (
                                                    <motion.div
                                                        key={item.id + idx}
                                                        initial={false}
                                                        animate={{
                                                            scale: idx === selectedIndex ? 1.02 : 1,
                                                            x: idx === selectedIndex ? 4 : 0
                                                        }}
                                                        className={`flex items-center justify-between px-4 ${isVertical ? 'py-1' : 'py-3'} rounded-lg mb-1 transition-all cursor-pointer 
                                                            ${idx === selectedIndex
                                                                ? 'bg-gradient-to-r from-[#f00060] to-[#c70055] text-black shadow-[0_0_25px_rgba(240,0,96,0.8),inset_0_0_10px_rgba(0,0,0,0.2)] font-black'
                                                                : isDisabled
                                                                    ? 'text-[#666] opacity-50 cursor-not-allowed'
                                                                    : isAction ? 'text-[#f00060] font-black' : 'text-[#f00060]/90 hover:text-[#f00060]'
                                                            }`}
                                                        onClick={(e) => {
                                                            if (isDisabled) return;
                                                            e.stopPropagation();
                                                            setSelectedIndex(idx);
                                                            handleCenterClick(e, item);
                                                        }}
                                                    >
                                                        <span className="text-[11px] tracking-widest truncate font-bold">
                                                            {item.type === 'YOUTUBE_SIGNAL' && <span className="text-white/20 mr-2">[SIGNAL]</span>}
                                                            {item.label}
                                                        </span>
                                                        <ChevronRight size={14} className={idx === selectedIndex ? 'text-black animate-pulse' : isDisabled ? 'text-transparent' : 'text-[#f00060]/60'} />
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                        {!isVertical && (
                                            <div className="w-[180px] bg-black border-l border-[#f00060]/20 flex items-center justify-center p-4">
                                                {/* Preview Art */}
                                                {(() => {
                                                    const selectedItem = getCurrentItems()[selectedIndex];
                                                    const track = selectedItem?.originalTrack;
                                                    const playlist = playlists.find(p => (p.id || p.Id) === selectedItem?.playlistId);
                                                    let coverUrl = null;
                                                    if (track) coverUrl = track.cover || track.coverImageUrl;
                                                    else if (playlist) coverUrl = playlist.coverImageUrl || playlist.imageUrl;

                                                    return (
                                                        <div className="w-[140px] h-[140px] bg-black border-2 border-[#f00060]/30 shadow-[0_0_40px_rgba(255,0,110,0.15)] flex items-center justify-center relative overflow-hidden rounded-xl">
                                                            {coverUrl ? (
                                                                <img src={coverUrl} alt="Preview" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div 
                                                                    className="system-skull w-20 h-20 animate-beat-pulse" 
                                                                    style={{ 
                                                                        WebkitMaskImage: `url(${skullImg})`, 
                                                                        maskImage: `url(${skullImg})`,
                                                                        filter: `drop-shadow(0 0 12px var(--theme-color))` 
                                                                    }} 
                                                                />
                                                            )}
                                                            <div className="absolute -inset-10 border border-[#f00060]/5 rotate-45 pointer-events-none" />
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* SCREEN OVERLAYS: SCANLINES & GLOSS */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-40 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-50" />
                    </div>
                </div>

                {/* CLICK WHEEL SECTION */}
                {!isFullView && (
                    <>
                    <div className={`flex-1 w-full flex items-center justify-center relative ${isVertical ? 'pt-4 pb-1' : 'pt-10 pb-6'}`}>
                    {/* EVOLVE BUTTON — bottom-right of circle */}

                    <div
                        ref={wheelRef}
                        onMouseDown={onStart}
                        onTouchStart={onStart}
                        className={`${isVertical ? 'w-40 h-40' : 'w-64 h-64'} rounded-full bg-[#111] border-2 border-[#333] shadow-[0_15px_60px_rgba(0,0,0,1),inset_0_2px_10px_rgba(255,255,255,0.05)] relative flex items-center justify-center cursor-pointer active:scale-[0.99] transition-all duration-300 group touch-none`}
                    >
                        {/* WHEEL BUTTONS - POLISHED */}
                        <button onClick={handleMenuClick} className={`absolute ${isVertical ? 'top-4' : 'top-6'} text-xs font-black text-[#f00060]/40 hover:text-[#f00060] hover:drop-shadow-[0_0_10px_#f00060] tracking-widest transition-all font-mono uppercase z-50`}>MENU</button>
                        <button onClick={(e) => { e.stopPropagation(); onMinimize(); }} className={`absolute ${isVertical ? 'bottom-4' : 'bottom-6'} text-[#666] hover:text-[#f00060] hover:drop-shadow-[0_0_10px_#f00060] transition-all z-50`}><Minimize2 size={isVertical ? 20 : 24} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className={`absolute ${isVertical ? 'left-4' : 'left-6'} text-[#666] hover:text-[#f00060] hover:drop-shadow-[0_0_10px_#f00060] transition-all active:scale-95 z-50`}><SkipBack size={isVertical ? 24 : 28} fill="currentColor" /></button>
                        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className={`absolute ${isVertical ? 'right-4' : 'right-6'} text-[#666] hover:text-[#f00060] hover:drop-shadow-[0_0_10px_#f00060] transition-all active:scale-95 z-50`}><SkipForward size={isVertical ? 24 : 28} fill="currentColor" /></button>


                        {/* CENTER "SELECT" BUTTON */}
                        <button
                            onClick={handleCenterClick}
                            className={`${isVertical ? 'w-14 h-14' : 'w-24 h-24'} rounded-full bg-[#080808] border-2 border-[#222] shadow-[0_0_30px_rgba(0,0,0,1)] flex items-center justify-center active:bg-[#f00060] transition-all group/select overflow-hidden relative z-50`}
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
                                            <Pause size={isVertical ? 24 : 32} fill="#f00060" className="drop-shadow-[0_0_8px_#f00060]" />
                                        ) : (
                                            <Play size={isVertical ? 24 : 32} fill="#f00060" className="drop-shadow-[0_0_8px_#f00060] ml-1" />
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                    </div>
                    
                    {/* EXPAND BUTTON IN LOWER CORNER */}
                    <button 
                        onClick={() => setIsFullView(true)} 
                        className="absolute bottom-4 right-4 text-[#f00060] hover:text-white transition-colors bg-black/80 border border-[#f00060]/30 rounded-full p-2 z-50 shadow-[0_0_10px_rgba(255,0,110,0.3)]"
                        title="Expand Player"
                    >
                        <Maximize2 size={16} />
                    </button>
                    </>
                )}
                </div>
            </div>
    );
};
