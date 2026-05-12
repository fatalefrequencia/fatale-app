import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipBack, SkipForward, Play, Pause, Zap, Disc, MessageSquare, List, Search, Plus, DollarSign, Users, Radio, Heart, Music, Shuffle, Settings, Check, Star } from 'lucide-react';
import { getMediaUrl, API_BASE_URL } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import YouTube from 'react-youtube';
import API from '../services/api';
import './DJMixerPlayer.css';

const NeuralSpectrum = ({ analyser, isActive }) => {
    const canvasRef = useRef(null);
    
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        let animationFrame;
        const draw = () => {
            animationFrame = requestAnimationFrame(draw);
            
            if (analyser && isActive) {
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(dataArray);
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const barWidth = (canvas.width / bufferLength) * 2.5;
                
                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (dataArray[i] / 255) * canvas.height;
                    ctx.fillStyle = `rgba(255, 0, 110, 1)`;
                    ctx.fillRect(i * (barWidth + 1), canvas.height - barHeight, barWidth, barHeight);
                }
            } else if (isActive) {
                // Mock Pulse for YouTube/Fallback
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const time = Date.now() / 200;
                const barCount = 40;
                const barWidth = canvas.width / barCount;
                
                for (let i = 0; i < barCount; i++) {
                    const noise = Math.sin(time + i * 0.5) * 0.5 + 0.5;
                    const barHeight = (0.2 + noise * 0.6) * canvas.height;
                    ctx.fillStyle = `rgba(255, 0, 110, 0.4)`;
                    ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
                }

                // YouTube Licensing Note
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.font = 'bold 7px "Courier New", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`YOUTUBE_LICENSE: ${isActive ? 'VISUAL_DATA_RESTRICTED' : 'SIGNAL_IDLE'}`, canvas.width / 2, canvas.height - 4);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
        
        draw();
        return () => cancelAnimationFrame(animationFrame);
    }, [analyser, isActive]);

    return <canvas ref={canvasRef} width={200} height={40} className="neural-spectrum-canvas" />;
};

const DJMixerPlayer = ({ 
    currentTrack, 
    isPlaying, 
    onPlayPause, 
    onNext, 
    onPrev, 
    currentTime, 
    duration, 
    onSeek, 
    volume, 
    onVolumeChange,
    station,
    isBroadcaster = false,
    requests = [],
    chatMessages = [],
    onSendMessage,
    onClose,
    tracks = [],
    libraryTracks = [],
    userPlaylists = [],
    onLike,
    onPurchase,
    onPlayPlaylist,
    onPlayTrack,
    onFetchPlaylistTracks,
    onPlaybackRateChange,
    onEqA,
    analyserA,
    keyLockA,
    onKeyLockAChange,
    setTracks,
    setCurrentTrackIndex,
    isMobile = false
}) => {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState('LIBRARY'); // LIBRARY, CHAT, REQUESTS
    const [crateCategory, setCrateCategory] = useState('ALL'); // ALL, PURCHASED, FAVORITES, ARTISTS, PLAYLISTS
    const [searchQuery, setSearchQuery] = useState('');
    const [isAutoMixEnabled, setIsAutoMixEnabled] = useState(false);
    const [viewingPlaylist, setViewingPlaylist] = useState(null);
    const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [selectedTracksForNewPlaylist, setSelectedTracksForNewPlaylist] = useState([]);
    const [selectedTracksObjects, setSelectedTracksObjects] = useState([]);
    const [localPlaylists, setLocalPlaylists] = useState(userPlaylists || []);
    const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
    const [selectedPlaylistsForDeletion, setSelectedPlaylistsForDeletion] = useState([]);
    const [isShuffle, setIsShuffle] = useState(false);

    useEffect(() => {
        setLocalPlaylists(userPlaylists || []);
    }, [userPlaylists]);

    const refreshLocalPlaylists = async () => {
        try {
            const userStr = localStorage.getItem('user');
            const userId = userStr ? JSON.parse(userStr)?.id : null;
            if (!userId) return;
            const res = await API.Playlists.getUserPlaylists(userId);
            let backendPlaylists = res.data || [];
            
            if (backendPlaylists.length === 0) {
                try {
                    const allRes = await API.Playlists.getAll();
                    const allPlaylists = allRes.data || [];
                    backendPlaylists = allPlaylists.filter(p => p.userId === userId || p.UserId === userId || p.username === 'YOU' || p.Username === 'YOU');
                    
                    if (backendPlaylists.length === 0 && allPlaylists.length > 0) {
                        backendPlaylists = allPlaylists;
                    }
                } catch (allErr) {
                    console.error("Failed to fetch all playlists as fallback", allErr);
                }
            }
            
            setLocalPlaylists(prev => {
                const backendIds = backendPlaylists.map(p => p.id || p.Id);
                
                const updatedBackend = backendPlaylists.map(bp => {
                    const localVersion = prev.find(lp => (lp.id || lp.Id) === (bp.id || bp.Id));
                    const bpTracks = bp.tracks || bp.Tracks || [];
                    const lpTracks = localVersion ? (localVersion.tracks || localVersion.Tracks || []) : [];
                    
                    if (bpTracks.length === 0 && lpTracks.length > 0) {
                        return { ...bp, tracks: lpTracks };
                    }
                    return bp;
                });
                
                const localOnly = prev.filter(p => !backendIds.includes(p.id || p.Id));
                return [...updatedBackend, ...localOnly];
            });
        } catch (err) {
            console.error("Failed to refresh playlists", err);
        }
    };
    const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
    const [playlistSearchResults, setPlaylistSearchResults] = useState([]);
    const [playlistImage, setPlaylistImage] = useState(null);
    const [isCrateLoading, setIsCrateLoading] = useState(false);
    const [editingPlaylistId, setEditingPlaylistId] = useState(null);
    const [keyLockB, setKeyLockB] = useState(false);
    const [viewingArtist, setViewingArtist] = useState(null);
    const [chatInput, setChatInput] = useState('');
    const [viewMode, setViewMode] = useState(!isBroadcaster ? 'LISTENER' : 'MIXER');
    
    const handleSavePlaylist = async () => {
        if (!newPlaylistName || isSavingPlaylist) return;
        setIsSavingPlaylist(true);
        try {
            let playlistId = editingPlaylistId;
            if (!playlistId) {
                const res = await API.Playlists.create({ name: newPlaylistName });
                playlistId = res.id || res.Id;
            } else {
                await API.Playlists.update(playlistId, { name: newPlaylistName });
            }

            const currentTrackIds = (viewingPlaylist?.tracks || viewingPlaylist?.Tracks || []).map(t => t.id || t.Id);
            
            // Add new tracks
            for (const trackId of selectedTracksForNewPlaylist) {
                if (!currentTrackIds.includes(trackId)) {
                    let effectiveTrackId = trackId;
                    
                    // Si es un track de YouTube (ID es string o no es un numero)
                    if (typeof trackId === 'string' || isNaN(Number(trackId))) {
                        const trackObj = selectedTracksObjects.find(t => (t.id || t.Id) === trackId);
                        if (trackObj) {
                            const youtubeId = trackObj.youtubeId || trackObj.id?.replace('yt-', '') || trackObj.Id?.replace('yt-', '');
                            try {
                                const existing = await API.YoutubeTracks.getByYoutubeId(youtubeId);
                                if (existing.data) {
                                    effectiveTrackId = existing.data.id || existing.data.Id || existing.data;
                                } else {
                                    const res = await API.YoutubeTracks.save({
                                        YoutubeId: youtubeId,
                                        Title: trackObj.title || trackObj.Title,
                                        ChannelTitle: trackObj.artist || trackObj.Artist || "Unknown",
                                        ThumbnailUrl: trackObj.imageUrl || trackObj.ImageUrl || trackObj.cover || trackObj.coverImageUrl || "",
                                        ViewCount: trackObj.viewCount || 0,
                                        Duration: trackObj.duration || "0:00"
                                    });
                                    effectiveTrackId = res.data.id || res.data.Id || res.data;
                                }
                            } catch (err) {
                                // If get fails (404) or throws, try to save
                                try {
                                    const res = await API.YoutubeTracks.save({
                                        YoutubeId: youtubeId,
                                        Title: trackObj.title || trackObj.Title,
                                        ChannelTitle: trackObj.artist || trackObj.Artist || "Unknown",
                                        ThumbnailUrl: trackObj.imageUrl || trackObj.ImageUrl || trackObj.cover || trackObj.coverImageUrl || "",
                                        ViewCount: trackObj.viewCount || 0,
                                        Duration: trackObj.duration || "0:00"
                                    });
                                    effectiveTrackId = res.data.id || res.data.Id || res.data;
                                } catch (err2) {
                                    console.error("Failed to save YouTube track to database", err2);
                                    continue; // Saltar si falla
                                }
                            }
                        }
                    }
                    
                    try {
                        await API.Playlists.addTrack(playlistId, Number(effectiveTrackId));
                    } catch (err) {
                        console.error("Failed to add track using Playlists.addTrack, trying Collections.addToPlaylist", err);
                        try {
                            await API.Collections.addToPlaylist(playlistId, Number(effectiveTrackId));
                        } catch (err2) {
                            console.error("Failed to add track using Collections.addToPlaylist too", err2);
                        }
                    }
                }
            }

            // Remove tracks
            if (editingPlaylistId) {
                for (const trackId of currentTrackIds) {
                    if (!selectedTracksForNewPlaylist.includes(trackId)) {
                        await API.Playlists.removeTrack(playlistId, trackId);
                    }
                }
            }

            const newPlaylistObj = {
                id: playlistId,
                name: newPlaylistName,
                tracks: selectedTracksObjects,
                imageUrl: playlistImage || 'https://via.placeholder.com/50?text=PL',
                username: 'YOU'
            };

            // Update list optimistically
            setLocalPlaylists(prev => {
                if (editingPlaylistId) {
                    return prev.map(p => (p.id || p.Id) === playlistId ? newPlaylistObj : p);
                } else {
                    return [...prev, newPlaylistObj];
                }
            });

            setIsCreatingPlaylist(false);
            setNewPlaylistName('');
            setSelectedTracksForNewPlaylist([]);
            setSelectedTracksObjects([]);
            setPlaylistSearchQuery('');
            setPlaylistSearchResults([]);
            setEditingPlaylistId(null);
            setViewingPlaylist(newPlaylistObj); // Auto-open!
            
            // Still refresh in background to be sure
            refreshLocalPlaylists();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingPlaylist(false);
        }
    };

    const [deckA, setDeckA] = useState(currentTrack || null);
    const [deckB, setDeckB] = useState(null);
    const [deckBIndex, setDeckBIndex] = useState(-1); // Index in the crate for prev/next navigation
    const [isYoutubeModeB, setIsYoutubeModeB] = useState(false);
    const [youtubePlayerB, setYoutubePlayerB] = useState(null);
    const [crossfader, setCrossfader] = useState(0); // -100 to 100
    const [rotationA, setRotationA] = useState(0);
    const [rotationB, setRotationB] = useState(0);
    const [pitchA, setPitchA] = useState(0);
    const [pitchB, setPitchB] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // DECK B LOCAL ENGINE
    const audioB = useRef(new Audio());
    const [isPlayingB, setIsPlayingB] = useState(false);
    const [currentTimeB, setCurrentTimeB] = useState(0);
    const [durationB, setDurationB] = useState(0);
    const [faderB, setFaderB] = useState(1);
    const [faderA, setFaderA] = useState(volume);
    const lastSentVolA = useRef(volume);

    // Sync from parent prop ONLY if it changes externally (not from our own fader/crossfader actions)
    useEffect(() => {
        // If the incoming volume prop is different from what we last sent, 
        // it means an external change happened (e.g. Master Volume, Mute, or change in another view)
        // We need to account for the current crossfader position to see if the faderA matches
        const fadeA = crossfader > 0 ? (100 - crossfader) / 100 : 1;
        const expectedPropVolume = faderA * fadeA;

        if (Math.abs(volume - expectedPropVolume) > 0.01 && Math.abs(volume - lastSentVolA.current) > 0.01) {
            console.log(`[Neural Core] External volume sync: ${volume.toFixed(2)}`);
            // Reverse calculate faderA if possible, or just reset it
            setFaderA(fadeA > 0 ? volume / fadeA : volume);
            lastSentVolA.current = volume;
        }
    }, [volume]);

    const [isEvolveA, setIsEvolveA] = useState(false);
    const [isEvolveB, setIsEvolveB] = useState(false);
    const [isPlayingA, setIsPlayingA] = useState(isPlaying);
    const [isSyncedA, setIsSyncedA] = useState(false);
    const [isSyncedB, setIsSyncedB] = useState(false);
    const [effectiveRateA, setEffectiveRateA] = useState(1);
    const [effectiveRateB, setEffectiveRateB] = useState(1);
    const bpmInterval = useRef(null);
    const isDraggingKnob = useRef(false);
    const lastY = useRef(0);
    const dragTarget = useRef(null);
    const dragParam = useRef(null); // hi, mid, low, pitch

    const audioCtxB = useRef(null);
    const filtersB = useRef({ low: null, mid: null, high: null });
    const [analyserBState, setAnalyserBState] = useState(null);
    const analyserB = useRef(null);
    const sourceNodeB = useRef(null);

    const [eqA, setEqA] = useState({ hi: 0, mid: 0, low: 0 });
    const [eqB, setEqB] = useState({ hi: 0, mid: 0, low: 0 });

    const [loopA, setLoopA] = useState({ active: false, start: 0, beats: 4 });
    const [loopB, setLoopB] = useState({ active: false, start: 0, beats: 4 });

    useEffect(() => {
        setIsPlayingA(isPlaying);
    }, [isPlaying]);


    // Deck B Audio Event Handlers
    useEffect(() => {
        const b = audioB.current;
        const updateTime = () => setCurrentTimeB(b.currentTime);
        const updateDuration = () => setDurationB(b.duration);
        const onEnd = () => setIsPlayingB(false);

        b.addEventListener('timeupdate', updateTime);
        b.addEventListener('loadedmetadata', updateDuration);
        b.addEventListener('ended', onEnd);

        return () => {
            b.removeEventListener('timeupdate', updateTime);
            b.removeEventListener('loadedmetadata', updateDuration);
            b.removeEventListener('ended', onEnd);
            b.pause();
        };
    }, []);

    // Quantized Loop Engine
    useEffect(() => {
        if (loopA.active && isPlayingA) {
            const bpm = Number(deckA?.bpm || 128) + Number(pitchA);
            const beatDuration = 60 / bpm;
            const loopDuration = beatDuration * loopA.beats;
            if (currentTime >= loopA.start + loopDuration) {
                onSeek(loopA.start);
            }
        }
    }, [currentTime, loopA, isPlayingA, deckA, pitchA, onSeek]);

    useEffect(() => {
        if (loopB.active && isPlayingB) {
            const bpm = Number(deckB?.bpm || 124.5) + Number(pitchB);
            const beatDuration = 60 / bpm;
            const loopDuration = beatDuration * loopB.beats;
            if (currentTimeB >= loopB.start + loopDuration) {
                audioB.current.currentTime = loopB.start;
            }
        }
    }, [currentTimeB, loopB, isPlayingB, deckB, pitchB]);

    const handleLoop = (deck, beats) => {
        if (deck === 'A') {
            if (loopA.active && loopA.beats === beats) {
                setLoopA({ ...loopA, active: false });
                console.log("[Neural Core] NODE_A Loop deactivated");
            } else {
                setLoopA({ active: true, start: currentTime, beats });
                console.log(`[Neural Core] NODE_A Loop activated: ${beats} beats`);
            }
        } else {
            if (loopB.active && loopB.beats === beats) {
                setLoopB({ ...loopB, active: false });
                console.log("[Neural Core] NODE_B Loop deactivated");
            } else {
                setLoopB({ active: true, start: currentTimeB, beats });
                console.log(`[Neural Core] NODE_B Loop activated: ${beats} beats`);
            }
        }
    };

    // Master Output & Crossfader Engine
    useEffect(() => {
        // Linear crossfade curve
        // crossfader: -100 (Full A) to 100 (Full B)
        const fadeA = crossfader > 0 ? (100 - crossfader) / 100 : 1;
        const fadeB = crossfader < 0 ? (100 + crossfader) / 100 : 1;
        
        const effectiveA = faderA * fadeA;
        const effectiveB = faderB * fadeB;

        // Deck A Output (Sync to parent engine)
        if (onVolumeChange && Math.abs(volume - effectiveA) > 0.001) {
            lastSentVolA.current = effectiveA;
            onVolumeChange(effectiveA);
        }

        // Deck B Output (Local Audio Engine)
        if (audioB.current) {
            audioB.current.volume = Math.max(0, Math.min(1, effectiveB));
        }

        // Deck B Output (YouTube Engine)
        if (youtubePlayerB && typeof youtubePlayerB.setVolume === 'function') {
            try {
                youtubePlayerB.setVolume(effectiveB * 100);
            } catch (e) { /* YT player may not be ready */ }
        }
    }, [faderA, faderB, crossfader, youtubePlayerB, onVolumeChange]);

    // Sync Deck A with global track in real-time
    useEffect(() => {
        if (currentTrack) {
            setDeckA(currentTrack);
            setIsSyncing(true);
            setTimeout(() => setIsSyncing(false), 1000);
        }
    }, [currentTrack]);

    // Animate Jog Wheels
    useEffect(() => {
        let animationFrame;
        const animate = () => {
            if (isPlaying) {
                setRotationA(prev => (prev + 1.2 * effectiveRateA) % 360);
            }
            if (isPlayingB) {
                setRotationB(prev => (prev + 1.2 * effectiveRateB) % 360);
            }
            animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [isPlaying, isPlayingB]);

    useEffect(() => {
        const baseA = Number(deckA?.bpm || 128);
        const effectiveA = baseA + Number(pitchA);
        const rate = baseA > 0 ? effectiveA / baseA : 1;
        setEffectiveRateA(rate);
        if (onPlaybackRateChange) {
            onPlaybackRateChange(rate);
        }
    }, [pitchA, deckA, onPlaybackRateChange]);

    const initAudioB = () => {
        if (!audioCtxB.current && audioB.current) {
            audioCtxB.current = new (window.AudioContext || window.webkitAudioContext)();
            
            analyserB.current = audioCtxB.current.createAnalyser();
            analyserB.current.fftSize = 256;

            filtersB.current.low = audioCtxB.current.createBiquadFilter();
            filtersB.current.low.type = 'lowshelf';
            filtersB.current.low.frequency.value = 320;
            
            filtersB.current.mid = audioCtxB.current.createBiquadFilter();
            filtersB.current.mid.type = 'peaking';
            filtersB.current.mid.frequency.value = 1000;
            filtersB.current.mid.Q.value = 1;
            
            filtersB.current.high = audioCtxB.current.createBiquadFilter();
            filtersB.current.high.type = 'highshelf';
            filtersB.current.high.frequency.value = 3200;

            sourceNodeB.current = audioCtxB.current.createMediaElementSource(audioB.current);
            sourceNodeB.current.connect(filtersB.current.low);
            filtersB.current.low.connect(filtersB.current.mid);
            filtersB.current.mid.connect(filtersB.current.high);
            filtersB.current.high.connect(analyserB.current);
            analyserB.current.connect(audioCtxB.current.destination);
            setAnalyserBState(analyserB.current);
        }
    };

    useEffect(() => {
        if (deckB) {
            initAudioB();
            if (audioB.current) audioB.current.preservesPitch = keyLockB;
        }
    }, [deckB, keyLockB]);

    useEffect(() => {
        const ctx = audioCtxB.current;
        if (!ctx) return;
        const now = ctx.currentTime;
        if (filtersB.current.low) filtersB.current.low.gain.setTargetAtTime(eqB.low, now, 0.02);
        if (filtersB.current.mid) filtersB.current.mid.gain.setTargetAtTime(eqB.mid, now, 0.02);
        if (filtersB.current.high) filtersB.current.high.gain.setTargetAtTime(eqB.hi, now, 0.02);
    }, [eqB]);

    useEffect(() => {
        if (onEqA) {
            onEqA('low', eqA.low);
            onEqA('mid', eqA.mid);
            onEqA('high', eqA.hi);
        }
    }, [eqA, onEqA]);

    useEffect(() => {
        const baseB = Number(deckB?.bpm || 124.5);
        const effectiveB = baseB + Number(pitchB);
        const rate = baseB > 0 ? effectiveB / baseB : 1;
        setEffectiveRateB(rate);
        if (audioB.current) {
            audioB.current.playbackRate = rate;
        }
    }, [pitchB, deckB]);

    // Auto-Mix Evolution logic
    useEffect(() => {
        if (isAutoMixEnabled && isPlaying && duration > 0 && currentTime > duration - 8) {
            // Trigger transition to next track
            onNext();
            // Optional: reset crossfader or animate it
        }
    }, [currentTime, isAutoMixEnabled, isPlaying, duration]);

    // Extract YouTube video ID from a track object
    const getYoutubeVideoId = (track) => {
        if (!track) return null;
        const raw = track.source || track.Source || track.filePath || track.FilePath || '';
        if (typeof raw === 'string' && raw.startsWith('youtube:')) return raw.split(':')[1];
        // Check if the ID itself looks like a YT video ID (11 chars)
        const id = track.youtubeId || track.YoutubeId || track.videoId || track.VideoId;
        if (typeof id === 'string' && id.length === 11) return id;
        return null;
    };

    // Resolve album artwork from any track object
    const resolveArtwork = (track) => {
        if (!track) return null;
        const raw = track.imageUrl || track.coverImageUrl || track.thumbnail || track.cover || track.image;
        if (raw) return getMediaUrl(raw);
        // Fallback: generate YouTube thumbnail from video ID
        const ytId = getYoutubeVideoId(track);
        if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        return null;
    };

    // Check if a track is a YouTube track
    const isYoutubeTrack = (track) => !!getYoutubeVideoId(track);

    // Load a track into Deck B (independent engine)
    const loadToDeckB = (track, index = -1) => {
        setDeckB(track);
        if (index >= 0) setDeckBIndex(index);

        const ytId = getYoutubeVideoId(track);

        if (ytId) {
            // YouTube: switch Deck B to internal YouTube mode
            console.log('[Neural Core] NODE_B: YouTube track detected. Activating internal engine.');
            setIsYoutubeModeB(true);
            setIsPlayingB(false); // YouTube usually autoplays or waits for player ready
            // Stop any native audio
            if (audioB.current) {
                audioB.current.pause();
                audioB.current.src = '';
            }
        } else {
            // Native track: use local <audio> element
            setIsYoutubeModeB(false);
            const raw = track.source || track.Source || track.filePath || track.FilePath || track.url || '';
            const source = getMediaUrl(raw) || null;
            console.log('[Neural Core] NODE_B: Loading native source:', source);
            if (source) {
                initAudioB();
                if (audioCtxB.current?.state === 'suspended') audioCtxB.current.resume();
                audioB.current.src = source;
                audioB.current.load();
                if (isPlayingB) {
                    audioB.current.play().catch(e => console.error('[Neural Core] Deck B play failed:', e));
                }
            }
        }
    };

    // Get all tracks available in the crate for navigation
    const getCrateTrackList = () => {
        const filtered = getFilteredTracks();
        return [...(filtered.collection || []), ...(filtered.network || [])];
    };

    const loadToDeck = (track, deck) => {
        if (deck === 'A') {
            setDeckA(track);
            if (onPlayTrack) onPlayTrack(track);
        } else {
            // Find the track's index in the crate for prev/next navigation
            const allTracks = getCrateTrackList();
            const idx = allTracks.findIndex(t => 
                (t.id || t.Id) === (track.id || track.Id) || t.title === track.title
            );
            loadToDeckB(track, idx >= 0 ? idx : 0);
        }
    };

    // Deck B: skip to previous track in the crate
    const skipBPrev = () => {
        const allTracks = getCrateTrackList();
        if (allTracks.length === 0) return;
        const newIdx = deckBIndex > 0 ? deckBIndex - 1 : allTracks.length - 1;
        loadToDeckB(allTracks[newIdx], newIdx);
    };

    // Deck B: skip to next track in the crate
    const skipBNext = () => {
        const allTracks = getCrateTrackList();
        if (allTracks.length === 0) return;
        const newIdx = deckBIndex < allTracks.length - 1 ? deckBIndex + 1 : 0;
        loadToDeckB(allTracks[newIdx], newIdx);
    };

    const handleSync = (initiator) => {
        const bpmA = Number(deckA?.bpm || 128) + Number(pitchA);
        const bpmB = Number(deckB?.bpm || 124.5) + Number(pitchB);

        console.log(`[SYNC] Initiator: ${initiator} | A:${bpmA.toFixed(1)} | B:${bpmB.toFixed(1)}`);

        if (initiator === 'A') {
            // Make B match A
            if (!deckB) return;
            setIsSyncedA(true);
            const targetBpm = bpmA;
            const baseB = Number(deckB.bpm || 124.5);
            setPitchB(targetBpm - baseB);
            setTimeout(() => setIsSyncedA(false), 2000);
        } else if (initiator === 'B') {
            // Make A match B
            if (!deckA) return;
            setIsSyncedB(true);
            const targetBpm = bpmB;
            const baseA = Number(deckA.bpm || 128);
            setPitchA(targetBpm - baseA);
            setTimeout(() => setIsSyncedB(false), 2000);
        }
        
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 500);
    };

    const startBpmAdjust = (deck, delta) => {
        adjustBpm(deck, delta);
        bpmInterval.current = setInterval(() => adjustBpm(deck, delta), 80);
    };

    const stopBpmAdjust = () => {
        if (bpmInterval.current) {
            clearInterval(bpmInterval.current);
            bpmInterval.current = null;
        }
    };

    const adjustBpm = (deck, delta) => {
        if (deck === 'A') {
            setPitchA(prev => Math.max(-100, Math.min(100, Number(prev) + delta)));
        } else {
            setPitchB(prev => Math.max(-100, Math.min(100, Number(prev) + delta)));
        }
    };

    const adjustEq = (deck, param, delta) => {
        const setter = deck === 'A' ? setEqA : setEqB;
        setter(prev => {
            const newVal = Math.max(-35, Math.min(15, prev[param] + delta));
            console.log(`[Neural Core] ${deck} ${param.toUpperCase()} adjusted to: ${newVal.toFixed(1)}dB`);
            return {
                ...prev,
                [param]: newVal
            };
        });
    };

    const handleEqReset = (deck, param) => {
        const setter = deck === 'A' ? setEqA : setEqB;
        setter(prev => ({ ...prev, [param]: 0 }));
        console.log(`[Neural Core] ${deck} ${param.toUpperCase()} reset to zero-point`);
    };

    const handleKnobDragStart = (e, deck, param = 'pitch') => {
        isDraggingKnob.current = true;
        lastY.current = e.clientY;
        dragTarget.current = deck;
        dragParam.current = param;
        document.addEventListener('mousemove', handleKnobDragMove);
        document.addEventListener('mouseup', handleKnobDragEnd);
    };

    const handleKnobDragMove = (e) => {
        if (!isDraggingKnob.current) return;
        const delta = (lastY.current - e.clientY) * 0.2; // Higher sensitivity for EQ
        if (dragParam.current === 'pitch') {
            adjustBpm(dragTarget.current, delta * 0.25);
        } else {
            adjustEq(dragTarget.current, dragParam.current, delta);
        }
        lastY.current = e.clientY;
    };

    const handleKnobDragEnd = () => {
        isDraggingKnob.current = false;
        dragTarget.current = null;
        dragParam.current = null;
        document.removeEventListener('mousemove', handleKnobDragMove);
        document.removeEventListener('mouseup', handleKnobDragEnd);
    };

    const handleKnobWheel = (e, deck, param = 'pitch') => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        if (param === 'pitch') {
            adjustBpm(deck, delta * 0.1);
        } else {
            adjustEq(deck, param, delta);
        }
    };

    const handleKnobTouchStart = (e, deck, param = 'pitch') => {
        isDraggingKnob.current = true;
        lastY.current = e.touches[0].clientY;
        dragTarget.current = deck;
        dragParam.current = param;
    };

    const handleKnobTouchMove = (e) => {
        if (!isDraggingKnob.current) return;
        const delta = (lastY.current - e.touches[0].clientY) * 0.2;
        if (dragParam.current === 'pitch') {
            adjustBpm(dragTarget.current, delta * 0.25);
        } else {
            adjustEq(dragTarget.current, dragParam.current, delta);
        }
        lastY.current = e.touches[0].clientY;
    };

    const handleKnobTouchEnd = () => {
        isDraggingKnob.current = false;
        dragTarget.current = null;
        dragParam.current = null;
    };

    const handlePlaylistClick = async (p) => {
        if (onFetchPlaylistTracks) {
            setIsCrateLoading(true);
            try {
                const tracks = await onFetchPlaylistTracks(p.id || p.Id);
                const finalTracks = (tracks && tracks.length > 0) ? tracks : (p.tracks || p.Tracks || []);
                setViewingPlaylist({ ...p, tracks: finalTracks });
            } catch (e) {
                console.error("Signal ingestion failed", e);
                setViewingPlaylist({ ...p, tracks: p.tracks || p.Tracks || [] });
            } finally {
                setIsCrateLoading(false);
            }
        } else {
            setViewingPlaylist(p);
        }
    };

    const togglePlayB = () => {
        if (!deckB) {
            console.warn('[Neural Core] No track loaded on Deck B');
            return;
        }

        // YouTube tracks use internal YouTube engine
        if (isYoutubeModeB) {
            if (youtubePlayerB) {
                if (isPlayingB) {
                    youtubePlayerB.pauseVideo();
                    setIsPlayingB(false);
                } else {
                    youtubePlayerB.playVideo();
                    setIsPlayingB(true);
                }
            }
            return;
        }

        // Native tracks: use Deck B's local <audio> element
        if (isPlayingB) {
            audioB.current.pause();
            setIsPlayingB(false);
        } else {
            initAudioB();
            if (audioCtxB.current?.state === 'suspended') audioCtxB.current.resume();
            if (audioB.current.src) {
                audioB.current.play()
                    .then(() => setIsPlayingB(true))
                    .catch(e => {
                        console.error('[Neural Core] Deck B play failed:', e);
                        setIsPlayingB(false);
                    });
            } else {
                console.warn('[Neural Core] Deck B has no source loaded');
            }
        }
    };

    const handleTogglePlayA = () => {
        if (onPlayPause) onPlayPause();
    };

    const handleShuffle = () => {
        const filtered = getFilteredTracks();
        const allTracks = [...(filtered.collection || []), ...(filtered.network || [])];
        if (allTracks.length > 0) {
            // Shuffle the entire group
            const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
            
            if (setTracks && setCurrentTrackIndex) {
                // Update global queue so Next/Prev respect the shuffle
                setTracks(shuffled);
                setCurrentTrackIndex(0);
            } else {
                // Fallback for isolated component testing
                const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
                loadToDeck(randomTrack, 'A');
            }
        }
    };

    const getDisplayArtist = (t) => {
        if (!t) return "Unknown Artist";
        const source = t.source || t.Source || t.filePath || t.FilePath || "";
        if (source.includes('youtube:') || source.includes('youtu.be') || source.includes('youtube.com')) {
            return "YouTube Tracks";
        }
        
        let artist = t.artist || t.ArtistName || t.Artist;
        if (!artist || artist === 'Unknown Artist' || artist === 'Unknown') {
            if (station?.artistName) return station.artistName;
            return "Unknown Artist";
        }
        return artist;
    };

    // Filtered Crate Logic
    const getFilteredTracks = () => {
        if (crateCategory === 'PLAYLISTS') {
            if (viewingPlaylist) {
                return { collection: viewingPlaylist.tracks || viewingPlaylist.Tracks || [], network: [], playlists: [] };
            }
            return { collection: [], network: [], playlists: userPlaylists };
        }

        if (crateCategory === 'ARTISTS') {
            if (viewingArtist) {
                const artistTracks = libraryTracks.filter(t => getDisplayArtist(t) === viewingArtist);
                return { collection: artistTracks, network: [] };
            }
            const uniqueArtists = Array.from(new Set(libraryTracks.map(t => getDisplayArtist(t)))).sort();
            return { collection: [], network: [], artists: uniqueArtists };
        }

        let collectionBase = libraryTracks.filter(t => t.isLiked || t.isOwned);
        
        if (crateCategory === 'PURCHASED') collectionBase = collectionBase.filter(t => t.isOwned);
        if (crateCategory === 'FAVORITES') collectionBase = collectionBase.filter(t => t.isLiked);
        
        if (!searchQuery) {
            return { collection: collectionBase, network: [] };
        }

        const q = searchQuery.toLowerCase();
        
        const collectionResults = collectionBase.filter(t => 
            t.title?.toLowerCase().includes(q) || t.artist?.toLowerCase().includes(q)
        );

        const collectionIds = new Set(collectionResults.map(t => t.id || t.Id));
        const networkResults = tracks.filter(t => {
            const id = t.id || t.Id;
            return !collectionIds.has(id) && 
                   (t.title?.toLowerCase().includes(q) || t.artist?.toLowerCase().includes(q));
        });

        return {
            collection: collectionResults,
            network: networkResults
        };
    };

    const formatTime = (time) => {
        if (!time || isNaN(time) || time < 0) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = (duration > 0 && !isNaN(duration)) ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`dj-mixer-container ${isMobile ? 'mobile' : ''}`}>
            {/* Hidden Deck B YouTube Engine */}
            {isYoutubeModeB && deckB && (
                <div style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
                    <YouTube
                        videoId={getYoutubeVideoId(deckB)}
                        opts={{
                            height: '1',
                            width: '1',
                            playerVars: {
                                autoplay: isPlayingB ? 1 : 0,
                                controls: 0,
                                disablekb: 1,
                                fs: 0,
                                iv_load_policy: 3,
                                modestbranding: 1,
                                rel: 0,
                                showinfo: 0
                            },
                        }}
                        onReady={(e) => {
                            setYoutubePlayerB(e.target);
                            const fadeB = crossfader < 0 ? (100 + crossfader) / 100 : 1;
                            e.target.setVolume(faderB * fadeB * 100);
                        }}
                        onStateChange={(e) => {
                            if (e.data === 1 && !isPlayingB) setIsPlayingB(true);
                            if (e.data === 2 && isPlayingB) setIsPlayingB(false);
                            if (e.data === 0) setIsPlayingB(false);
                        }}
                    />
                </div>
            )}
        <div className={`dj-mixer-overlay ${isMobile ? 'is-mobile-landscape' : ''} ${viewMode === 'LISTENER' ? 'is-listener-mode' : ''}`}>
            {/* Scanline / Texture Layer */}
            <div className="cyber-overlay-fx"></div>

            <audio ref={audioB} crossOrigin="anonymous" className="hidden" />
            
            <div className="mixer-hud-wrapper custom-scrollbar">
                {viewMode === 'MIXER' ? (
                    <>
                        {/* PRIMARY CONSOLE PANE */}
                        <div className="mixer-console-pane glass-pane">
                        <div className="pane-glitch-border"></div>

                    
                    {/* Top Signal Strip: Ultra-Thin tactical bar */}
                    <div className="mixer-header-compact-neural">
                        <div className="signal-identity-inline">
                            <div className="station-node-compact">
                                <Radio size={12} className="pulse-icon text-[var(--accent)]" />
                                <span className="mono tracking-[0.2em] uppercase text-[var(--accent)] glow-text">FREQ_{station?.frequency || '100.1'}</span>
                            </div>
                            <div className="divider-nano">|</div>
                            <div className="session-info-inline">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.1em] text-white/90">{station?.name || t('NEURAL_BROADCAST')}</h2>
                            </div>
                        </div>

                        <div className="hud-readouts-compact mono">
                            <div className="readout-item-nano">
                                <Users size={10} className="text-[var(--accent)]" />
                                <span className="val">{station?.listenerCount || '1.2K'}</span>
                            </div>
                            <div className="divider-nano">|</div>
                            <button onClick={() => setViewMode('LISTENER')} className="readout-item-nano hover:text-[var(--accent)] transition-colors cursor-pointer border border-white/10 px-2 py-0.5 rounded bg-white/5">
                                <Radio size={10} className="mr-1 inline" /> {t('LIVE')}
                            </button>
                        </div>
                    </div>

                    <div className="mixer-decks-grid-compact">
                        {/* DECK A */}
                        <div className={`deck-module-nano deck-a ${!deckA ? 'empty' : 'active'} ${isSyncing ? 'syncing' : ''}`}>
                            {/* Top Signal Ingest Bar */}
                            <div className="signal-ingest-bar">
                                <div className="ingest-info truncate">{deckA?.title || t('NO_SIGNAL_BROADCAST')}</div>
                                <div className="ingest-actions">
                                    <button onClick={() => onLike(deckA)} className="ingest-btn" title={t('ADD_TO_PLAYLIST')}><Plus size={10} /></button>
                                    <button onClick={() => onPurchase(deckA)} className="ingest-btn" title={t('PURCHASE_FILE')}><DollarSign size={10} /></button>
                                </div>
                            </div>

                            <div className="deck-meta-strip">
                                <div className="deck-transport-row-nano left">
                                    <button onClick={onPrev} className="transport-btn-sq"><SkipBack size={10} /></button>
                                    <button onClick={handleTogglePlayA} className={`transport-btn-sq main ${isPlayingA ? 'active' : ''}`}>
                                        {isPlayingA ? <Pause size={10} /> : <Play size={10} fill="currentColor" />}
                                    </button>
                                    <button onClick={onNext} className="transport-btn-sq"><SkipForward size={10} /></button>
                                    <button onClick={() => handleSync('A')} className={`sync-btn-nano ${isSyncedA ? 'active' : ''}`}>{t('SYNCED')}</button>
                                </div>
                                <div className="deck-id-readout mirrored-right">
                                    <div className="deck-id-tag font-black tracking-widest opacity-40">NODE_A</div>
                                    <div className="tempo-status-nano mono">
                                        <div className="val text-white/90">{(Number(deckA?.bpm || 128) + Number(pitchA)).toFixed(1)}</div>
                                        <div className="label opacity-40 uppercase tracking-tighter">{t('BPM')}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="deck-core-layout-mirrored">
                                {/* Outer Controls */}
                                <div className="deck-controls-column-nano">
                                    <div className="evolve-toggle-container">
                                        <button 
                                            onClick={() => setIsEvolveA(!isEvolveA)} 
                                            className={`evolve-btn ${isEvolveA ? 'active' : ''}`}
                                        >
                                            <span>{t('EVOLVE_SIGNAL')}</span>
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => onKeyLockAChange(!keyLockA)}
                                        className={`key-lock-btn-nano ${keyLockA ? 'active' : ''}`}
                                        title="KEY_LOCK"
                                    >
                                        <span>Key Lock</span>
                                    </button>
                                    
                                    <div className="tempo-control-group">
                                        <div className="tempo-knob-container">
                                            <div 
                                                className="nano-knob interactive" 
                                                onMouseDown={(e) => handleKnobDragStart(e, 'A')}
                                                onWheel={(e) => handleKnobWheel(e, 'A')}
                                                onTouchStart={(e) => handleKnobTouchStart(e, 'A')}
                                                onTouchMove={handleKnobTouchMove}
                                                onTouchEnd={handleKnobTouchEnd}
                                                onDoubleClick={() => { setPitchA(0); console.log("[Neural Core] NODE_A PITCH reset to zero-point"); }}
                                            >
                                                <div className="knob-ring" style={{ '--ring-fill': `${50 + (pitchA)}%` }}></div>
                                                <div className="knob-dot" style={{ transform: `rotate(${pitchA * 7.2}deg)` }}></div>
                                            </div>
                                            <span className="knob-label">FINE</span>
                                        </div>
                                        <div className="pitch-readout mono text-[9px] text-[var(--accent)] font-bold">
                                            {Number(pitchA) >= 0 ? '+' : ''}{Number(pitchA).toFixed(1)}%
                                        </div>
                                        <div className="slider-track-vertical">
                                            <input 
                                                type="range" 
                                                min="-50" 
                                                max="50" 
                                                step="0.1" 
                                                value={pitchA} 
                                                onChange={(e) => setPitchA(Number(e.target.value))} 
                                                onDoubleClick={() => setPitchA(0)}
                                                className="nano-slider" 
                                            />
                                        </div>
                                        <div className="tempo-label-nano mono opacity-40">TEMPO_BPM</div>
                                    </div>
                                </div>

                                {/* Center Jog */}
                                <div className="deck-spinner-command-cluster">
                                    <div className="jog-wheel-nano" style={{ transform: `rotate(${rotationA}deg)` }}>
                                        <div className="jog-center-art">
                                            {resolveArtwork(deckA) && <img src={resolveArtwork(deckA)} alt="" onError={(e) => { e.target.style.display = 'none'; }} />}
                                        </div>
                                        <div className="jog-active-node"></div>
                                    </div>
                                    
                                    <div className="loop-command-bar-horizontal">
                                        <div className="loop-grid-horizontal">
                                            {[1, 2, 4, 8, 16].map(b => (
                                                <button 
                                                    key={b}
                                                    onClick={() => handleLoop('A', b)}
                                                    className={`loop-btn-nano-h ${loopA.active && loopA.beats === b ? 'active' : ''}`}
                                                >
                                                    {b}
                                                </button>
                                            ))}
                                            <button 
                                                onClick={() => setLoopA({ ...loopA, active: false })}
                                                className="loop-btn-nano-h exit"
                                            >
                                                X
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Inner EQ */}
                                <div className="eq-knobs-column inner">
                                    <div className="nano-knob-wrap">
                                        <div className="nano-knob interactive" 
                                            onMouseDown={(e) => handleKnobDragStart(e, 'A', 'hi')}
                                            onWheel={(e) => handleKnobWheel(e, 'A', 'hi')}
                                            onTouchStart={(e) => handleKnobTouchStart(e, 'A', 'hi')}
                                            onTouchMove={handleKnobTouchMove}
                                            onTouchEnd={handleKnobTouchEnd}
                                            onDoubleClick={() => handleEqReset('A', 'hi')}
                                        >
                                            <div className="knob-ring" style={{ '--ring-fill': `${50 + (eqA.hi * 2.5)}%` }}></div>
                                            <div className="knob-dot" style={{ transform: `rotate(${eqA.hi * 7.2}deg)` }}></div>
                                        </div>
                                        <span>HI</span>
                                        <div className="eq-val-nano mono">{(eqA.hi > 0 ? '+' : '')}{eqA.hi.toFixed(1)}</div>
                                    </div>
                                    <div className="nano-knob-wrap">
                                        <div className="nano-knob interactive" 
                                            onMouseDown={(e) => handleKnobDragStart(e, 'A', 'mid')}
                                            onWheel={(e) => handleKnobWheel(e, 'A', 'mid')}
                                            onTouchStart={(e) => handleKnobTouchStart(e, 'A', 'mid')}
                                            onTouchMove={handleKnobTouchMove}
                                            onTouchEnd={handleKnobTouchEnd}
                                            onDoubleClick={() => handleEqReset('A', 'mid')}
                                        >
                                            <div className="knob-ring" style={{ '--ring-fill': `${50 + (eqA.mid * 2.5)}%` }}></div>
                                            <div className="knob-dot" style={{ transform: `rotate(${eqA.mid * 7.2}deg)` }}></div>
                                        </div>
                                        <span>MID</span>
                                        <div className="eq-val-nano mono">{(eqA.mid > 0 ? '+' : '')}{eqA.mid.toFixed(1)}</div>
                                    </div>
                                    <div className="nano-knob-wrap">
                                        <div className="nano-knob interactive" 
                                            onMouseDown={(e) => handleKnobDragStart(e, 'A', 'low')}
                                            onWheel={(e) => handleKnobWheel(e, 'A', 'low')}
                                            onTouchStart={(e) => handleKnobTouchStart(e, 'A', 'low')}
                                            onTouchMove={handleKnobTouchMove}
                                            onTouchEnd={handleKnobTouchEnd}
                                            onDoubleClick={() => handleEqReset('A', 'low')}
                                        >
                                            <div className="knob-ring" style={{ '--ring-fill': `${50 + (eqA.low * 2.5)}%` }}></div>
                                            <div className="knob-dot" style={{ transform: `rotate(${eqA.low * 7.2}deg)` }}></div>
                                        </div>
                                        <span>LOW</span>
                                        <div className="eq-val-nano mono">{(eqA.low > 0 ? '+' : '')}{eqA.low.toFixed(1)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MASTER CENTRAL HUB */}
                        <div className="master-central-strip">
                            <div className="master-gain-faders-row">
                                <div className="fader-channel">
                                    <span className="fader-label">A</span>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.01" 
                                        value={faderA} 
                                        onChange={(e) => setFaderA(Number(e.target.value))} 
                                        onDoubleClick={() => setFaderA(0.8)}
                                        className="vertical-fader-nano" 
                                    />
                                </div>
                                <div className="fader-channel">
                                    <span className="fader-label">B</span>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.01" 
                                        value={faderB} 
                                        onChange={(e) => setFaderB(Number(e.target.value))} 
                                        onDoubleClick={() => setFaderB(0.8)}
                                        className="vertical-fader-nano" 
                                    />
                                </div>
                            </div>
                            
                            <div className="master-vu-nano">
                                <div className="vu-led"><div className="vu-led-fill" style={{ height: isPlaying ? '70%' : '0%' }}></div></div>
                                <div className="vu-led"><div className="vu-led-fill" style={{ height: isPlayingB ? '65%' : '0%' }}></div></div>
                            </div>
                            <div className="deck-crossfader">
                                <div className="cf-label">A</div>
                                <input 
                                    type="range" 
                                    min="-100" 
                                    max="100" 
                                    value={crossfader} 
                                    onChange={(e) => setCrossfader(Number(e.target.value))} 
                                    onDoubleClick={() => setCrossfader(0)}
                                    className="crossfader-nano" 
                                />
                                <div className="cf-label">B</div>
                            </div>
                        </div>

                        {/* DECK B */}
                        <div className={`deck-module-nano deck-b ${!deckB ? 'empty' : 'active'}`}>
                            {/* Top Signal Ingest Bar */}
                            <div className="signal-ingest-bar">
                                <div className="ingest-info truncate">{deckB?.title || t('NO_SIGNAL_BROADCAST')}</div>
                                <div className="ingest-actions">
                                    <button onClick={() => onLike(deckB)} className="ingest-btn" title={t('ADD_TO_PLAYLIST')}><Plus size={10} /></button>
                                    <button onClick={() => onPurchase(deckB)} className="ingest-btn" title={t('PURCHASE_FILE')}><DollarSign size={10} /></button>
                                </div>
                            </div>

                            <div className="deck-meta-strip text-right">
                                <div className="deck-id-readout mirrored-left text-left">
                                    <div className="deck-id-tag font-black tracking-widest opacity-40">NODE_B</div>
                                    <div className="tempo-status-nano mono">
                                        <div className="val text-white/90">{(Number(deckB?.bpm || 124.5) + Number(pitchB)).toFixed(1)}</div>
                                        <div className="label opacity-40 uppercase tracking-tighter">{t('BPM')}</div>
                                    </div>
                                </div>
                                <div className="deck-transport-row-nano right">
                                    <button onClick={() => handleSync('B')} className={`sync-btn-nano ${isSyncedB ? 'active' : ''}`}>{t('SYNCED')}</button>
                                    <button onClick={skipBPrev} className="transport-btn-sq"><SkipBack size={10} /></button>
                                    <button onClick={togglePlayB} className={`transport-btn-sq main ${isPlayingB || (deckB && isYoutubeTrack(deckB) && isPlaying) ? 'active' : ''}`}>
                                        {(isPlayingB || (deckB && isYoutubeTrack(deckB) && isPlaying)) ? <Pause size={10} /> : <Play size={10} fill="currentColor" />}
                                    </button>
                                    <button onClick={skipBNext} className="transport-btn-sq"><SkipForward size={10} /></button>
                                </div>
                            </div>

                            <div className="deck-core-layout-mirrored">
                                {/* Inner EQ (Mirrored from A) */}
                                <div className="eq-knobs-column inner">
                                    <div className="nano-knob-wrap">
                                        <div className="nano-knob interactive" 
                                            onMouseDown={(e) => handleKnobDragStart(e, 'B', 'hi')}
                                            onWheel={(e) => handleKnobWheel(e, 'B', 'hi')}
                                            onTouchStart={(e) => handleKnobTouchStart(e, 'B', 'hi')}
                                            onTouchMove={handleKnobTouchMove}
                                            onTouchEnd={handleKnobTouchEnd}
                                            onDoubleClick={() => handleEqReset('B', 'hi')}
                                        >
                                            <div className="knob-ring" style={{ '--ring-fill': `${50 + (eqB.hi * 2.5)}%` }}></div>
                                            <div className="knob-dot" style={{ transform: `rotate(${eqB.hi * 7.2}deg)` }}></div>
                                        </div>
                                        <span>HI</span>
                                        <div className="eq-val-nano mono">{(eqB.hi > 0 ? '+' : '')}{eqB.hi.toFixed(1)}</div>
                                    </div>
                                    <div className="nano-knob-wrap">
                                        <div className="nano-knob interactive" 
                                            onMouseDown={(e) => handleKnobDragStart(e, 'B', 'mid')}
                                            onWheel={(e) => handleKnobWheel(e, 'B', 'mid')}
                                            onTouchStart={(e) => handleKnobTouchStart(e, 'B', 'mid')}
                                            onTouchMove={handleKnobTouchMove}
                                            onTouchEnd={handleKnobTouchEnd}
                                            onDoubleClick={() => handleEqReset('B', 'mid')}
                                        >
                                            <div className="knob-ring" style={{ '--ring-fill': `${50 + (eqB.mid * 2.5)}%` }}></div>
                                            <div className="knob-dot" style={{ transform: `rotate(${eqB.mid * 7.2}deg)` }}></div>
                                        </div>
                                        <span>MID</span>
                                        <div className="eq-val-nano mono">{(eqB.mid > 0 ? '+' : '')}{eqB.mid.toFixed(1)}</div>
                                    </div>
                                    <div className="nano-knob-wrap">
                                        <div className="nano-knob interactive" 
                                            onMouseDown={(e) => handleKnobDragStart(e, 'B', 'low')}
                                            onWheel={(e) => handleKnobWheel(e, 'B', 'low')}
                                            onTouchStart={(e) => handleKnobTouchStart(e, 'B', 'low')}
                                            onTouchMove={handleKnobTouchMove}
                                            onTouchEnd={handleKnobTouchEnd}
                                            onDoubleClick={() => handleEqReset('B', 'low')}
                                        >
                                            <div className="knob-ring" style={{ '--ring-fill': `${50 + (eqB.low * 2.5)}%` }}></div>
                                            <div className="knob-dot" style={{ transform: `rotate(${eqB.low * 7.2}deg)` }}></div>
                                        </div>
                                        <span>LOW</span>
                                        <div className="eq-val-nano mono">{(eqB.low > 0 ? '+' : '')}{eqB.low.toFixed(1)}</div>
                                    </div>
                                </div>

                                {/* Center Jog */}
                                <div className="deck-spinner-command-cluster">
                                    <div className="jog-wheel-nano" style={{ transform: `rotate(${rotationB}deg)` }}>
                                        <div className="jog-center-art">
                                            {resolveArtwork(deckB) && <img src={resolveArtwork(deckB)} alt="" onError={(e) => { e.target.style.display = 'none'; }} />}
                                        </div>
                                        <div className="jog-active-node"></div>
                                    </div>

                                    <div className="loop-command-bar-horizontal">
                                        <div className="loop-grid-horizontal">
                                            {[1, 2, 4, 8, 16].map(b => (
                                                <button 
                                                    key={b}
                                                    onClick={() => handleLoop('B', b)}
                                                    className={`loop-btn-nano-h ${loopB.active && loopB.beats === b ? 'active' : ''}`}
                                                >
                                                    {b}
                                                </button>
                                            ))}
                                            <button 
                                                onClick={() => setLoopB({ ...loopB, active: false })}
                                                className="loop-btn-nano-h exit"
                                            >
                                                X
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Outer Controls */}
                                <div className="deck-controls-column-nano">
                                    <div className="evolve-toggle-container">
                                        <button 
                                            onClick={() => setIsEvolveB(!isEvolveB)} 
                                            className={`evolve-btn ${isEvolveB ? 'active' : ''}`}
                                        >
                                            <span>{t('EVOLVE_SIGNAL')}</span>
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setKeyLockB(!keyLockB)}
                                        className={`key-lock-btn-nano ${keyLockB ? 'active' : ''}`}
                                        title="KEY_LOCK"
                                    >
                                        <span>Key Lock</span>
                                    </button>
                                    
                                    <div className="tempo-control-group">
                                        <div className="tempo-knob-container">
                                            <div 
                                                className="nano-knob interactive" 
                                                onMouseDown={(e) => handleKnobDragStart(e, 'B')}
                                                onWheel={(e) => handleKnobWheel(e, 'B')}
                                                onTouchStart={(e) => handleKnobTouchStart(e, 'B')}
                                                onTouchMove={handleKnobTouchMove}
                                                onTouchEnd={handleKnobTouchEnd}
                                                onDoubleClick={() => { setPitchB(0); console.log("[Neural Core] NODE_B PITCH reset to zero-point"); }}
                                            >
                                                <div className="knob-ring" style={{ '--ring-fill': `${50 + (pitchB)}%` }}></div>
                                                <div className="knob-dot" style={{ transform: `rotate(${pitchB * 7.2}deg)` }}></div>
                                            </div>
                                            <span className="knob-label">FINE</span>
                                        </div>
                                        <div className="pitch-readout mono text-[9px] text-[var(--accent)] font-bold">
                                            {Number(pitchB) >= 0 ? '+' : ''}{Number(pitchB).toFixed(1)}%
                                        </div>
                                        <div className="slider-track-vertical">
                                            <input 
                                                type="range" 
                                                min="-50" 
                                                max="50" 
                                                step="0.1" 
                                                value={pitchB} 
                                                onChange={(e) => setPitchB(Number(e.target.value))} 
                                                onDoubleClick={() => setPitchB(0)}
                                                className="nano-slider" 
                                            />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> {/* End Deck B */}
                </div> {/* End mixer-decks-grid-compact */}

                {/* MASTER NEURAL SPECTRUM HUB: Below Decks, spanning width */}
                    <div className="neural-spectrum-master-hub">
                        <div className="spectrum-container-wide">
                            <div className="node-label-strip mono">
                                <span className="text-[var(--accent)]">NODE_A_SIGNAL_FLUX</span>
                                <span className="text-[var(--accent)] opacity-40">PHASE_LOCKED</span>
                                <span className="text-[var(--accent)]">NODE_B_SIGNAL_FLUX</span>
                            </div>
                            <div className="master-analyzers-row">
                                <div className="master-analyzer-node">
                                    <NeuralSpectrum analyser={analyserA} isActive={isPlayingA} />
                                </div>
                                <div className="master-analyzer-node">
                                    <NeuralSpectrum analyser={analyserBState} isActive={isPlayingB} />
                                </div>
                            </div>
                            <div className="master-playhead-strip">
                                <div className="playhead-track">
                                    <div className="playhead-marker" style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
                ) : (
                    <>
                        {/* LISTENER NOW PLAYING PANE */}
                        <div className="listener-now-playing-pane glass-pane">
                        <div className="listener-artwork-wrapper">
                            <div className="listener-artwork-glow"></div>
                            <img 
                                src={station ? (getMediaUrl(station.imageUrl || station.coverArt || station.image) || 'https://via.placeholder.com/300x300/111/ff006e?text=LIVE') : (resolveArtwork(deckA) || 'https://via.placeholder.com/300x300/111/ff006e?text=SIGNAL')} 
                                alt="Now Playing" 
                                className={`listener-artwork ${isPlayingA && !station ? 'spin-slow' : ''}`} 
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x300/111/ff006e?text=SIGNAL'; }}
                            />
                            <div className="listener-artwork-overlay"></div>
                        </div>
                        
                        <div className="listener-track-info">
                            {station ? (
                                <>
                                    <h2 className="listener-track-title truncate">{station.name || station.Name || 'LIVE_BROADCAST'}</h2>
                                    <h3 className="listener-track-artist truncate" style={{ color: 'var(--accent)' }}>
                                        <Radio size={10} className="inline mr-1" style={{ verticalAlign: 'middle' }} />
                                        LIVE: {station.artistName || station.ArtistName || 'DJ'}
                                    </h3>
                                </>
                            ) : (
                                <>
                                    <h2 className="listener-track-title truncate">{deckA?.title || t('NO_SIGNAL_BROADCAST')}</h2>
                                    <h3 className="listener-track-artist truncate">{getDisplayArtist(deckA) || t('AWAITING_TRANSMISSION')}</h3>
                                </>
                            )}
                        </div>

                        <div className="listener-progress-container">
                            <div className="listener-progress-bar">
                                <div className="progress-fill" style={{ width: `${station ? '100' : progress}%`, opacity: station ? 0.3 : 1 }}></div>
                            </div>
                            <div className="listener-time-row mono">
                                {station ? (
                                    <><span style={{ color: 'var(--accent)' }}>● LIVE</span><span>{formatTime(currentTime)}</span></>
                                ) : (
                                    <><span>{formatTime(currentTime)}</span><span>-{formatTime(duration - currentTime)}</span></>
                                )}
                            </div>
                        </div>

                        <div className="listener-controls">
                            <button onClick={() => onLike(deckA)} className="control-btn"><Heart size={16} /></button>
                            <button onClick={onPrev} className="control-btn"><SkipBack size={16} /></button>
                            <button onClick={handleTogglePlayA} className={`control-btn play-btn ${isPlayingA ? 'active' : ''}`}>
                                {isPlayingA ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                            </button>
                            <button onClick={onNext} className="control-btn"><SkipForward size={16} /></button>
                            <button onClick={() => onPurchase(deckA)} className="control-btn"><DollarSign size={16} /></button>
                        </div>

                        <div className="listener-mode-toggle">
                            <button onClick={() => setViewMode('MIXER')} className="toggle-view-btn-main">
                                <Settings size={14} className="mr-2 inline" /> {t('SYS_CONF')}
                            </button>
                        </div>
                    </div>
                </>
            )}

                {/* SECONDARY UTILITY PANE */}

                <div className="utility-interlink-pane glass-pane">
                    <div className="utility-header-neon">
                        <div className="utility-tabs-neon">
                            <button onClick={() => setActiveTab('LIBRARY')} className={`util-tab ${activeTab === 'LIBRARY' ? 'active' : ''}`}><Disc size={12} /> <span>{t('SIGNAL_CRATE')}</span></button>
                            <button onClick={() => setActiveTab('PLAYLISTS')} className={`util-tab ${activeTab === 'PLAYLISTS' ? 'active' : ''}`}><List size={12} /> <span>{t('PLAYLISTS') || 'PLAYLISTS'}</span></button>
                        </div>
                        
                        {activeTab === 'LIBRARY' && (
                            <div className="crate-controls-hub">
                                <div className="crate-search-box-minimal">
                                    <Search size={12} className="search-icon-trigger" />
                                    <input 
                                        type="text" 
                                        placeholder={t('SEARCH_SIGNAL')} 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="crate-search-input-minimal"
                                    />
                                </div>
                                <div className="crate-filter-chips">
                                    {viewingPlaylist || viewingArtist ? (
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    setViewingPlaylist(null);
                                                    setViewingArtist(null);
                                                }}
                                                className="filter-chip active flex items-center gap-2"
                                            >
                                                <SkipBack size={8} /> {t('BACK')}
                                            </button>
                                            <button 
                                                onClick={handleShuffle}
                                                className="filter-chip shuffle-btn flex items-center gap-2 bg-[#ff006e]/10 border-[#ff006e]/20 text-[#ff006e]"
                                                title={t('SHUFFLE_ALL')}
                                            >
                                                <Shuffle size={10} /> {t('SHUFFLE')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={handleShuffle}
                                                className="filter-chip shuffle-btn flex items-center gap-2 bg-[#ff006e]/10 border-[#ff006e]/20 text-[#ff006e]"
                                                title={t('SHUFFLE_ALL')}
                                            >
                                                <Shuffle size={10} /> {t('SHUFFLE')}
                                            </button>
                                            <div className="w-px h-4 bg-white/10 mx-1" />
                                            {['ALL', 'PURCHASED', 'FAVORITES', 'ARTISTS'].map(cat => (
                                                <button 
                                                    key={cat}
                                                    onClick={() => {
                                                        setCrateCategory(cat);
                                                        setViewingPlaylist(null);
                                                        setViewingArtist(null);
                                                    }}
                                                    className={`filter-chip ${crateCategory === cat ? 'active' : ''}`}
                                                >
                                                    {t(cat)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="utility-content-nano relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {activeTab === 'LIBRARY' && (
                                <motion.div 
                                    key={`lib-${crateCategory}-${viewingPlaylist?.id || 'main'}`}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="library-nano custom-scrollbar h-full w-full"
                                >
                                    <table className="signal-table-nano">
                                        <thead>
                                            <tr>
                                                <th className="w-16">{t('LOAD')}</th>
                                                <th>{t('SIGNAL_ID')}</th>
                                                <th>{t('TITULAR')}</th>
                                                <th className="w-12">{t('BPM')}</th>
                                                <th className="w-12">{t('DURATION')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isCrateLoading ? (
                                                <tr className="signal-row"><td colSpan="5" className="text-center py-8 opacity-40 italic">{t('TUNING_FREQS')}</td></tr>
                                            ) : crateCategory === 'PLAYLISTS' && !viewingPlaylist ? (
                                                (getFilteredTracks().playlists || []).map((p, i) => (
                                                    <tr key={`pl-${i}`} className="signal-row cursor-pointer" onClick={() => handlePlaylistClick(p)}>
                                                        <td className="load-actions">
                                                            <button className="load-chip"><List size={8} /></button>
                                                        </td>
                                                        <td colSpan="2" className="sig-title truncate font-black">
                                                            {p.name || p.Title || 'UNNAMED_PLAYLIST'}
                                                        </td>
                                                        <td className="sig-bpm mono opacity-20">{(p.tracks || p.Tracks || []).length} SIG</td>
                                                        <td className="sig-sync mono opacity-20">VIEW_SIGNALS</td>
                                                    </tr>
                                                ))
                                            ) : crateCategory === 'ARTISTS' && !viewingArtist ? (
                                                (getFilteredTracks().artists || []).map((artist, i) => (
                                                    <tr key={`art-${i}`} className="signal-row cursor-pointer" onClick={() => setViewingArtist(artist)}>
                                                        <td className="load-actions">
                                                            <button className="load-chip"><Users size={8} /></button>
                                                        </td>
                                                        <td colSpan="2" className="sig-title truncate font-black">
                                                            {artist}
                                                        </td>
                                                        <td className="sig-bpm mono opacity-20">
                                                            {libraryTracks.filter(t => getDisplayArtist(t) === artist).length} SIG
                                                        </td>
                                                        <td className="sig-sync mono opacity-20">BROWSE_NODE</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <>
                                                    {viewingPlaylist && (
                                                        <tr className="section-header-row"><td colSpan="5">{t('PLAYLISTS')}: {viewingPlaylist.name || viewingPlaylist.Title}</td></tr>
                                                    )}
                                                    {viewingArtist && (
                                                        <tr className="section-header-row"><td colSpan="5">ARTIST_SEQUENCE: {viewingArtist}</td></tr>
                                                    )}
                                                    {getFilteredTracks().collection.filter(t => t.isLiked).length > 0 && !viewingPlaylist && !viewingArtist && (
                                                        <>
                                                            <tr className="section-header-row"><td colSpan="5">FATALE_FAVORITES</td></tr>
                                                            {getFilteredTracks().collection.filter(t => t.isLiked).map((t, i) => (
                                                                <tr key={`fav-${i}`} className="signal-row">
                                                                    <td className="load-actions">
                                                                        <button onClick={() => loadToDeck(t, 'A')} className="load-chip">A</button>
                                                                        <button onClick={() => loadToDeck(t, 'B')} className="load-chip">B</button>
                                                                    </td>
                                                                    <td className="sig-title truncate font-black flex items-center gap-2">
                                                                        {t.title}
                                                                        <Heart size={8} fill="var(--accent)" className="text-[var(--accent)]" />
                                                                    </td>
                                                                    <td className="sig-artist truncate opacity-30">{getDisplayArtist(t)}</td>
                                                                    <td className="sig-bpm mono text-[var(--accent)]">{t.bpm || '--'}</td>
                                                                    <td className="sig-sync mono opacity-20">{t.duration ? Math.floor(t.duration / 60) + ':' + (t.duration % 60).toString().padStart(2, '0') : '--:--'}</td>
                                                                </tr>
                                                            ))}
                                                        </>
                                                    )}
                                                    {getFilteredTracks().collection.filter(t => !t.isLiked).length > 0 && !viewingPlaylist && !viewingArtist && (
                                                        <>
                                                            <tr className="section-header-row"><td colSpan="5">{t('YOUTUBE_FAVS') || 'YOUTUBE FAVS'}</td></tr>
                                                            {getFilteredTracks().collection.filter(t => !t.isLiked).map((t, i) => (
                                                                <tr key={`col-${i}`} className="signal-row">
                                                                    <td className="load-actions">
                                                                        <button onClick={() => loadToDeck(t, 'A')} className="load-chip">A</button>
                                                                        <button onClick={() => loadToDeck(t, 'B')} className="load-chip">B</button>
                                                                    </td>
                                                                    <td className="sig-title truncate font-black flex items-center gap-2">
                                                                        {t.title}
                                                                    </td>
                                                                    <td className="sig-artist truncate opacity-30">{getDisplayArtist(t)}</td>
                                                                    <td className="sig-bpm mono text-[var(--accent)]">{t.bpm || '--'}</td>
                                                                    <td className="sig-sync mono opacity-20">{t.duration ? Math.floor(t.duration / 60) + ':' + (t.duration % 60).toString().padStart(2, '0') : '--:--'}</td>
                                                                </tr>
                                                            ))}
                                                        </>
                                                    )}

                                                    {getFilteredTracks().network.length > 0 && !viewingPlaylist && (
                                                        <tr className="section-header-row"><td colSpan="5">{t('GLOBAL_SIGNAL')}</td></tr>
                                                    )}
                                                    {getFilteredTracks().network.map((t, i) => (
                                                        <tr key={`net-${i}`} className="signal-row discovery">
                                                            <td className="load-actions">
                                                                <button onClick={() => loadToDeck(t, 'A')} className="load-chip">A</button>
                                                                <button onClick={() => loadToDeck(t, 'B')} className="load-chip">B</button>
                                                            </td>
                                                            <td className="sig-title truncate font-black flex items-center gap-2">
                                                                {t.title}
                                                            </td>
                                                            <td className="sig-artist truncate opacity-30">{getDisplayArtist(t)}</td>
                                                            <td className="sig-bpm mono text-[var(--accent)]">{t.bpm || '--'}</td>
                                                            <td className="sig-sync mono opacity-20">{t.duration ? Math.floor(t.duration / 60) + ':' + (t.duration % 60).toString().padStart(2, '0') : '--:--'}</td>
                                                        </tr>
                                                    ))}
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </motion.div>
                            )}
                            {activeTab === 'PLAYLISTS' && (
                                <motion.div 
                                    key={`playlists-${viewingPlaylist?.id || 'list'}`}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="library-nano custom-scrollbar h-full w-full p-4 overflow-y-auto"
                                >
                                    {viewingPlaylist ? (
                                        /* PLAYLIST VIEW (Spotify Style) */
                                        <div className="playlist-view space-y-6">
                                            {/* Header */}
                                            <div className="flex gap-6 items-end">
                                                <div className="w-32 h-32 bg-black border border-white/10 shadow-2xl flex-shrink-0">
                                                    <img src={viewingPlaylist.imageUrl || viewingPlaylist.ImageUrl || 'https://via.placeholder.com/150?text=PLAYLIST'} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=PLAYLIST'; }} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-2">// PLAYLIST</div>
                                                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">{viewingPlaylist.name || viewingPlaylist.Title}</h1>
                                                    <div className="text-[11px] text-white/50 font-mono">
                                                        <span className="text-white font-bold">{viewingPlaylist.username || 'USER'}</span> • {(viewingPlaylist.tracks || viewingPlaylist.Tracks || []).length} canciones
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            const tracks = viewingPlaylist.tracks || viewingPlaylist.Tracks || [];
                                                            if (tracks.length > 0) {
                                                                let trackToPlay = tracks[0];
                                                                if (isShuffle) {
                                                                    const randomIndex = Math.floor(Math.random() * tracks.length);
                                                                    trackToPlay = tracks[randomIndex];
                                                                }
                                                                loadToDeck(trackToPlay, 'A');
                                                            }
                                                        }} 
                                                        className="px-3 py-1 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all font-mono text-[10px] font-black uppercase flex items-center gap-1"
                                                    >
                                                        <Play size={10} /> Reproducir
                                                    </button>
                                                    <button 
                                                        onClick={() => setIsShuffle(!isShuffle)} 
                                                        className={`px-3 py-1 border ${isShuffle ? 'border-[var(--accent)] bg-[var(--accent)] text-black' : 'border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/10'} transition-all font-mono text-[10px] font-black uppercase flex items-center gap-1`}
                                                    >
                                                        <Shuffle size={10} /> Aleatorio
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setIsCreatingPlaylist(true);
                                                            setNewPlaylistName(viewingPlaylist.name || viewingPlaylist.Title);
                                                            setSelectedTracksForNewPlaylist((viewingPlaylist.tracks || viewingPlaylist.Tracks || []).map(t => t.id || t.Id));
                                                            setSelectedTracksObjects(viewingPlaylist.tracks || viewingPlaylist.Tracks || []);
                                                            setEditingPlaylistId(viewingPlaylist.id || viewingPlaylist.Id);
                                                        }} 
                                                        className="px-3 py-1 border border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all font-mono text-[10px] font-black uppercase"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button onClick={() => setViewingPlaylist(null)} className="px-3 py-1 border border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all font-mono text-[10px] font-black uppercase">
                                                        {t('BACK')}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Tracks Table */}
                                            <table className="signal-table-nano w-full">
                                                <thead>
                                                    <tr>
                                                        <th className="w-8">#</th>
                                                        <th className="w-16">{t('LOAD')}</th>
                                                        <th>{t('TITULAR')}</th>
                                                        <th>{t('ARTIST')}</th>
                                                        <th className="w-12">{t('DURATION')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(viewingPlaylist.tracks || viewingPlaylist.Tracks || []).map((t, i) => (
                                                        <tr key={`pl-track-${i}`} className="signal-row">
                                                            <td className="text-white/30 font-mono text-[10px]">{i + 1}</td>
                                                            <td className="load-actions">
                                                                <button onClick={() => { loadToDeck(t, 'A'); }} className="load-chip" style={{ marginRight: '2px' }}><Play size={8} /></button>
                                                                <button onClick={() => loadToDeck(t, 'A')} className="load-chip">A</button>
                                                                <button onClick={() => loadToDeck(t, 'B')} className="load-chip">B</button>
                                                            </td>
                                                            <td className="sig-title truncate font-black flex items-center gap-2">
                                                                {t.title}
                                                            </td>
                                                            <td className="sig-artist truncate opacity-30">{getDisplayArtist(t)}</td>
                                                            <td className="sig-sync mono opacity-20">{t.duration ? Math.floor(t.duration / 60) + ':' + (t.duration % 60).toString().padStart(2, '0') : '--:--'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        /* LIST OF PLAYLISTS (Spotify Sidebar Style) */
                                        <div className="playlists-list space-y-4">
                                            {isCreatingPlaylist ? (
                                                /* CREATE PLAYLIST VIEW */
                                                <div className="create-playlist-view space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar p-1">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">// CREAR PLAYLIST</div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={handleSavePlaylist}
                                                                disabled={!newPlaylistName || isSavingPlaylist}
                                                                className={`px-2 py-0.5 border ${(!newPlaylistName || isSavingPlaylist) ? 'border-white/10 text-white/30 cursor-not-allowed' : 'border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black'} transition-all font-mono text-[9px] font-black uppercase flex items-center gap-1`}
                                                            >
                                                                {isSavingPlaylist ? '...' : <Check size={8} />} {isSavingPlaylist ? 'Guardando' : 'Guardar'}
                                                            </button>
                                                            <button 
                                                                onClick={() => setIsCreatingPlaylist(false)} 
                                                                className="px-2 py-0.5 border border-white/20 text-white/50 hover:text-white transition-all font-mono text-[9px] font-black uppercase"
                                                            >
                                                                {t('BACK')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Nombre de la playlist..." 
                                                            value={newPlaylistName}
                                                            onChange={(e) => setNewPlaylistName(e.target.value)}
                                                            className="w-full bg-black border border-white/10 px-3 py-2 text-white text-xs font-mono focus:border-[var(--accent)] outline-none"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-white/50">// IMAGEN DE PORTADA</div>
                                                        <div className="flex gap-4 items-center">
                                                            <div className="w-20 h-20 bg-black border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                                {playlistImage ? (
                                                                    <img src={playlistImage} alt="Preview" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Music size={20} className="text-white/20" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="px-3 py-1.5 border border-white/20 text-white hover:bg-white/5 cursor-pointer transition-all font-mono text-[10px] font-black uppercase">
                                                                    Subir Imagen
                                                                    <input 
                                                                        type="file" 
                                                                        accept="image/*" 
                                                                        className="hidden" 
                                                                        onChange={(e) => {
                                                                            const file = e.target.files[0];
                                                                            if (file) {
                                                                                const reader = new FileReader();
                                                                                reader.onloadend = () => {
                                                                                    setPlaylistImage(reader.result);
                                                                                };
                                                                                reader.readAsDataURL(file);
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                                <div className="text-[8px] text-white/30 mt-1 font-mono">Se ajustará automáticamente a un cuadrado.</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Liked Songs Section */}
                                                    <div className="space-y-2">
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-white/50">// AGREGAR TUS LIKES</div>
                                                        <div className="max-h-40 overflow-y-auto border border-white/5 bg-black/20 p-2 space-y-1">
                                                            {libraryTracks.filter(t => t.isLiked).map((track, i) => (
                                                                <div key={`liked-${i}`} className="flex items-center justify-between text-xs p-1 hover:bg-white/[0.02]">
                                                                    <div className="truncate flex-1">
                                                                        <span className="text-white font-bold">{track.title}</span>
                                                                        <span className="text-white/30 ml-2">{getDisplayArtist(track)}</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => {
                                                                            if (selectedTracksForNewPlaylist.includes(track.id || track.Id)) {
                                                                                setSelectedTracksForNewPlaylist(selectedTracksForNewPlaylist.filter(id => id !== (track.id || track.Id)));
                                                                                setSelectedTracksObjects(selectedTracksObjects.filter(t => (t.id || t.Id) !== (track.id || track.Id)));
                                                                            } else {
                                                                                setSelectedTracksForNewPlaylist([...selectedTracksForNewPlaylist, track.id || track.Id]);
                                                                                setSelectedTracksObjects([...selectedTracksObjects, track]);
                                                                            }
                                                                        }}
                                                                        className={`px-1.5 py-0.5 border ${selectedTracksForNewPlaylist.includes(track.id || track.Id) ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-white/10 text-white/30'} text-[8px] font-black uppercase`}
                                                                    >
                                                                        {selectedTracksForNewPlaylist.includes(track.id || track.Id) ? 'QUITAR' : 'SUMAR'}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Selected Tracks Section */}
                                                    <div className="space-y-2">
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-white/50">// CANCIONES SELECCIONADAS</div>
                                                        <div className="max-h-40 overflow-y-auto border border-white/5 bg-black/20 p-2 space-y-1">
                                                            {selectedTracksObjects.map((track, i) => (
                                                                <div key={`selected-${i}`} className="flex items-center justify-between text-xs p-1 hover:bg-white/[0.02]">
                                                                    <div className="truncate flex-1">
                                                                        <span className="text-white font-bold">{track.title || track.Title}</span>
                                                                        <span className="text-white/30 ml-2">{track.artist || track.Artist || getDisplayArtist(track)}</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setSelectedTracksForNewPlaylist(selectedTracksForNewPlaylist.filter(id => id !== (track.id || track.Id)));
                                                                            setSelectedTracksObjects(selectedTracksObjects.filter(t => (t.id || t.Id) !== (track.id || track.Id)));
                                                                        }}
                                                                        className="px-1.5 py-0.5 border border-[var(--accent)] text-[var(--accent)] text-[8px] font-black uppercase"
                                                                    >
                                                                        QUITAR
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {selectedTracksObjects.length === 0 && (
                                                                <div className="text-[8px] text-white/20 uppercase py-2 text-center">No hay canciones seleccionadas</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Search Section */}
                                                    <div className="space-y-2">
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-white/50">// BUSCAR MAS</div>
                                                        <div className="crate-search-box-large w-full">
                                                            <Search size={16} className="text-[var(--accent)]" />
                                                            <input 
                                                                type="text" 
                                                                placeholder={t('SEARCH_SIGNAL')} 
                                                                value={playlistSearchQuery}
                                                                onChange={(e) => {
                                                                    setPlaylistSearchQuery(e.target.value);
                                                                    // Trigger search
                                                                    if (e.target.value.length > 2) {
                                                                        API.Youtube.search(e.target.value).then(res => {
                                                                            const tracks = Array.isArray(res.data) ? res.data : (res.data?.tracks || res.data?.Tracks || []);
                                                                            setPlaylistSearchResults(tracks);
                                                                        }).catch(err => {
                                                                            console.error(err);
                                                                            setPlaylistSearchResults([]);
                                                                        });
                                                                    } else {
                                                                        setPlaylistSearchResults([]); // Limpiar resultados si es muy corto
                                                                    }
                                                                }}
                                                                className="crate-search-input-large w-full"
                                                            />
                                                        </div>
                                                        <div className="max-h-40 overflow-y-auto border border-white/5 bg-black/20 p-2 space-y-1">
                                                            {playlistSearchResults.map((track, i) => (
                                                                <div key={`search-${i}`} className="flex items-center justify-between text-xs p-1 hover:bg-white/[0.02]">
                                                                    <div className="truncate flex-1">
                                                                        <span className="text-white font-bold">{track.title || track.Title}</span>
                                                                        <span className="text-white/30 ml-2">{track.artist || track.Artist}</span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => {
                                                                            if (selectedTracksForNewPlaylist.includes(track.id || track.Id)) {
                                                                                setSelectedTracksForNewPlaylist(selectedTracksForNewPlaylist.filter(id => id !== (track.id || track.Id)));
                                                                                setSelectedTracksObjects(selectedTracksObjects.filter(t => (t.id || t.Id) !== (track.id || track.Id)));
                                                                            } else {
                                                                                setSelectedTracksForNewPlaylist([...selectedTracksForNewPlaylist, track.id || track.Id]);
                                                                                setSelectedTracksObjects([...selectedTracksObjects, track]);
                                                                            }
                                                                        }}
                                                                        className={`px-1.5 py-0.5 border ${selectedTracksForNewPlaylist.includes(track.id || track.Id) ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-white/10 text-white/30'} text-[8px] font-black uppercase`}
                                                                    >
                                                                        {selectedTracksForNewPlaylist.includes(track.id || track.Id) ? 'QUITAR' : 'SUMAR'}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={handleSavePlaylist}
                                                        disabled={!newPlaylistName || isSavingPlaylist}
                                                        className={`w-full py-2 ${(!newPlaylistName || isSavingPlaylist) ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-[var(--accent)] text-black hover:bg-[var(--accent)]/90'} font-black uppercase text-xs transition-all`}
                                                    >
                                                        {isSavingPlaylist ? '...' : 'Guardar Playlist'}
                                                    </button>
                                                    {!newPlaylistName && (
                                                        <div className="text-[8px] text-[var(--accent)]/60 uppercase text-center mt-2 font-mono">
                                                            // Ingresa un nombre arriba para guardar
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                /* LIST VIEW */
                                                <>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">// MIS LISTAS</div>
                                                        <div className="flex gap-2">
                                                            {selectedPlaylistsForDeletion.length > 0 && (
                                                                <button 
                                                                    onClick={async () => {
                                                                        if (confirm(`¿Borrar ${selectedPlaylistsForDeletion.length} playlists seleccionadas?`)) {
                                                                            const idsToDelete = [...selectedPlaylistsForDeletion];
                                                                            setSelectedPlaylistsForDeletion([]);
                                                                            
                                                                            // Delete from state immediately
                                                                            setLocalPlaylists(prev => prev.filter(p => !idsToDelete.includes(p.id || p.Id)));
                                                                            
                                                                            // Then delete in background
                                                                            for (const id of idsToDelete) {
                                                                                try {
                                                                                    await API.Playlists.delete(id);
                                                                                } catch (err) {
                                                                                    console.error(`Failed to delete playlist ${id}`, err);
                                                                                }
                                                                            }
                                                                        }
                                                                    }} 
                                                                    className="px-2 py-0.5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-mono text-[9px] font-black uppercase flex items-center gap-1"
                                                                >
                                                                    Borrar ({selectedPlaylistsForDeletion.length})
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => setIsCreatingPlaylist(true)} 
                                                                className="px-2 py-0.5 border border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all font-mono text-[9px] font-black uppercase flex items-center gap-1"
                                                            >
                                                                <Plus size={8} /> Crear
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(localPlaylists || []).map((p, i) => (
                                                            <div 
                                                                key={`pl-${i}`} 
                                                                className={`flex items-center gap-3 p-2 border ${selectedPlaylistsForDeletion.includes(p.id || p.Id) ? 'border-red-500/50 bg-red-500/5' : 'border-white/5 hover:border-[var(--accent)]/20'} cursor-pointer transition-all bg-black/40 hover:bg-white/[0.02]`}
                                                                onClick={() => handlePlaylistClick(p)}
                                                            >
                                                                <div 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const id = p.id || p.Id;
                                                                        if (selectedPlaylistsForDeletion.includes(id)) {
                                                                            setSelectedPlaylistsForDeletion(selectedPlaylistsForDeletion.filter(item => item !== id));
                                                                        } else {
                                                                            setSelectedPlaylistsForDeletion([...selectedPlaylistsForDeletion, id]);
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 border border-white/20 flex items-center justify-center cursor-pointer flex-shrink-0 hover:border-[var(--accent)]"
                                                                >
                                                                    {selectedPlaylistsForDeletion.includes(p.id || p.Id) && <div className="w-2 h-2 bg-[var(--accent)]" />}
                                                                </div>

                                                                <div className="w-10 h-10 bg-black border border-white/10 flex-shrink-0">
                                                                    <img src={p.imageUrl || p.ImageUrl || 'https://via.placeholder.com/50?text=PL'} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=PL'; }} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-black text-white uppercase truncate">{p.name || p.Title || 'UNNAMED_PLAYLIST'}</div>
                                                                    <div className="text-[9px] text-white/30 font-mono">Playlist • {p.username || 'Uknown'}</div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-[9px] text-[var(--accent)]/50 font-mono">{(p.tracks || p.Tracks || []).length} SIG</div>
                                                                    
                                                                    <button 
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            await API.Playlists.togglePin(p.id || p.Id);
                                                                            await refreshLocalPlaylists();
                                                                        }}
                                                                        className={`p-1 border ${(p.isPinned || p.IsPinned) ? 'border-yellow-500/50 text-yellow-500' : 'border-white/10 text-white/30'} hover:border-yellow-500 transition-all flex items-center justify-center`}
                                                                    >
                                                                        <Star size={10} fill={(p.isPinned || p.IsPinned) ? "currentColor" : "none"} />
                                                                    </button>

                                                                    <button 
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const pId = p.id || p.Id;
                                                                            if (confirm(`¿Borrar playlist "${p.name || p.Title}"?`)) {
                                                                                try {
                                                                                    await API.Playlists.delete(pId);
                                                                                    setLocalPlaylists(prev => prev.filter(item => (item.id || item.Id) !== pId));
                                                                                } catch (err) {
                                                                                    console.error("Failed to delete playlist", err);
                                                                                    // Remove anyway to satisfy user request immediately
                                                                                    setLocalPlaylists(prev => prev.filter(item => (item.id || item.Id) !== pId));
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="px-1.5 py-0.5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-mono text-[8px] font-black uppercase"
                                                                    >
                                                                        Borrar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Tactical Decals */}
                <div className="cyber-label-fx top-right">SYSTEM_STABLE_4.2.0</div>
                <div className="cyber-label-fx bottom-left">NEURAL_DECK_PRO_V5</div>
            </div>
            </div>
        </div>
    );
};

export default DJMixerPlayer;
