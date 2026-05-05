import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipBack, SkipForward, Play, Pause, Zap, Disc, MessageSquare, List, Search, Plus, DollarSign, Users, Radio, Heart, Music, Shuffle, Settings } from 'lucide-react';
import { getMediaUrl } from '../constants';
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
                ctx.fillText('YOUTUBE_LICENSE: VISUAL_DATA_RESTRICTED', canvas.width / 2, canvas.height - 4);
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
    const [activeTab, setActiveTab] = useState('LIBRARY'); // LIBRARY, CHAT, REQUESTS
    const [crateCategory, setCrateCategory] = useState('ALL'); // ALL, PURCHASED, FAVORITES, ARTISTS, PLAYLISTS
    const [searchQuery, setSearchQuery] = useState('');
    const [isAutoMixEnabled, setIsAutoMixEnabled] = useState(false);
    const [viewingPlaylist, setViewingPlaylist] = useState(null);
    const [isCrateLoading, setIsCrateLoading] = useState(false);
    const [keyLockB, setKeyLockB] = useState(false);
    const [viewingArtist, setViewingArtist] = useState(null);
    const [chatInput, setChatInput] = useState('');
    const [viewMode, setViewMode] = useState(!isBroadcaster ? 'LISTENER' : 'MIXER');
    
    const [deckA, setDeckA] = useState(currentTrack || null);
    const [deckB, setDeckB] = useState(null);
    const [crossfader, setCrossfader] = useState(0); // -100 to 100
    const [rotationA, setRotationA] = useState(0);
    const [rotationB, setRotationB] = useState(0);
    const [pitchA, setPitchA] = useState(0);
    const [pitchB, setPitchB] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // DECK B LOCAL ENGINE
    const audioB = useRef(null);
    const [isPlayingB, setIsPlayingB] = useState(false);
    const [currentTimeB, setCurrentTimeB] = useState(0);
    const [durationB, setDurationB] = useState(0);
    const [volumeB, setVolumeB] = useState(1);
    const [baseVolume, setBaseVolume] = useState(volume); // Store user preference
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

    useEffect(() => {
        if (currentTrack) {
            setDeckA(currentTrack);
        }
    }, [currentTrack]);

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

    // Crossfader Volume Phasing
    useEffect(() => {
        // Deck A (Global)
        const attenuationA = Math.min(1, (100 - crossfader) / 100);
        if (onVolumeChange) onVolumeChange(baseVolume * attenuationA);

        // Deck B (Local)
        const attenuationB = Math.min(1, (100 + crossfader) / 100);
        audioB.current.volume = volumeB * attenuationB;
    }, [crossfader, baseVolume, volumeB]);

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

    const loadToDeck = (track, deck) => {
        if (deck === 'A') {
            setDeckA(track);
            if (onPlayTrack) onPlayTrack(track);
        } else {
            setDeckB(track);
            // Load source locally for Deck B
            const source = track.source || (track.filePath ? (track.filePath.startsWith('http') ? track.filePath : `https://fatale-api.azurewebsites.net/api/Media/${track.filePath}`) : null);
            if (source) {
                audioB.current.src = source;
                audioB.current.load();
                if (isPlayingB) {
                    initAudioB();
                    if (audioCtxB.current?.state === 'suspended') audioCtxB.current.resume();
                    audioB.current.play();
                }
            }
        }
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
                setViewingPlaylist({ ...p, tracks });
            } catch (e) {
                console.error("Signal ingestion failed", e);
            } finally {
                setIsCrateLoading(false);
            }
        } else {
            setViewingPlaylist(p);
        }
    };

    const togglePlayB = () => {
        if (isPlayingB) {
            audioB.current.pause();
        } else {
            initAudioB();
            if (audioCtxB.current?.state === 'suspended') audioCtxB.current.resume();
            if (audioB.current.src) audioB.current.play();
        }
        setIsPlayingB(!isPlayingB);
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
                                <h2 className="text-[10px] font-black uppercase tracking-[0.1em] text-white/90">{station?.name || 'NEURAL_BROADCAST'}</h2>
                            </div>
                        </div>

                        <div className="hud-readouts-compact mono">
                            <div className="readout-item-nano">
                                <Users size={10} className="text-[var(--accent)]" />
                                <span className="val">{station?.listenerCount || '1.2K'}</span>
                            </div>
                            <div className="divider-nano">|</div>
                            <button onClick={() => setViewMode('LISTENER')} className="readout-item-nano hover:text-[var(--accent)] transition-colors cursor-pointer border border-white/10 px-2 py-0.5 rounded bg-white/5">
                                <Radio size={10} className="mr-1 inline" /> LIVE_VIEW
                            </button>
                        </div>
                    </div>

                    <div className="mixer-decks-grid-compact">
                        {/* DECK A */}
                        <div className={`deck-module-nano deck-a ${!deckA ? 'empty' : 'active'} ${isSyncing ? 'syncing' : ''}`}>
                            {/* Top Signal Ingest Bar */}
                            <div className="signal-ingest-bar">
                                <div className="ingest-info truncate">{deckA?.title || 'NO_SIGNAL'}</div>
                                <div className="ingest-actions">
                                    <button onClick={() => onLike(deckA)} className="ingest-btn" title="ADD_TO_LIBRARY"><Plus size={10} /></button>
                                    <button onClick={() => onPurchase(deckA)} className="ingest-btn" title="PURCHASE_SIGNAL"><DollarSign size={10} /></button>
                                </div>
                            </div>

                            <div className="deck-meta-strip">
                                <div className="deck-transport-row-nano left">
                                    <button onClick={onPrev} className="transport-btn-sq"><SkipBack size={10} /></button>
                                    <button onClick={onPlayPause} className={`transport-btn-sq main ${isPlayingA ? 'active' : ''}`}>
                                        {isPlayingA ? <Pause size={10} /> : <Play size={10} fill="currentColor" />}
                                    </button>
                                    <button onClick={onNext} className="transport-btn-sq"><SkipForward size={10} /></button>
                                    <button onClick={() => handleSync('A')} className={`sync-btn-nano ${isSyncedA ? 'active' : ''}`}>SYNC</button>
                                </div>
                                <div className="deck-id-readout mirrored-right">
                                    <div className="deck-id-tag font-black tracking-widest opacity-40">NODE_A</div>
                                    <div className="tempo-status-nano mono">
                                        <div className="val text-white/90">{(Number(deckA?.bpm || 128) + Number(pitchA)).toFixed(1)}</div>
                                        <div className="label opacity-40 uppercase tracking-tighter">BPM_SIGNAL</div>
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
                                            <span>EVOLVE</span>
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
                                            {deckA?.cover && <img src={deckA.cover} alt="" />}
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
                                        value={baseVolume} 
                                        onChange={(e) => setBaseVolume(Number(e.target.value))} 
                                        onDoubleClick={() => setBaseVolume(0.8)}
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
                                        value={volumeB} 
                                        onChange={(e) => setVolumeB(Number(e.target.value))} 
                                        onDoubleClick={() => setVolumeB(0.8)}
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
                                <div className="ingest-info truncate">{deckB?.title || 'NO_SIGNAL'}</div>
                                <div className="ingest-actions">
                                    <button onClick={() => onLike(deckB)} className="ingest-btn"><Plus size={10} /></button>
                                    <button onClick={() => onPurchase(deckB)} className="ingest-btn"><DollarSign size={10} /></button>
                                </div>
                            </div>

                            <div className="deck-meta-strip text-right">
                                <div className="deck-id-readout mirrored-left text-left">
                                    <div className="deck-id-tag font-black tracking-widest opacity-40">NODE_B</div>
                                    <div className="tempo-status-nano mono">
                                        <div className="val text-white/90">{(Number(deckB?.bpm || 124.5) + Number(pitchB)).toFixed(1)}</div>
                                        <div className="label opacity-40 uppercase tracking-tighter">BPM_SIGNAL</div>
                                    </div>
                                </div>
                                <div className="deck-transport-row-nano right">
                                    <button onClick={() => handleSync('B')} className={`sync-btn-nano ${isSyncedB ? 'active' : ''}`}>SYNC</button>
                                    <button className="transport-btn-sq"><SkipBack size={10} /></button>
                                    <button onClick={togglePlayB} className={`transport-btn-sq main ${isPlayingB ? 'active' : ''}`}>
                                        {isPlayingB ? <Pause size={10} /> : <Play size={10} fill="currentColor" />}
                                    </button>
                                    <button className="transport-btn-sq"><SkipForward size={10} /></button>
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
                                            {deckB?.cover && <img src={deckB.cover} alt="" />}
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
                                            <span>EVOLVE</span>
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
                                src={getMediaUrl(deckA?.imageUrl || deckA?.coverImageUrl || station?.imageUrl)} 
                                alt="Now Playing" 
                                className={`listener-artwork ${isPlayingA ? 'spin-slow' : ''}`} 
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x300/111/ff006e?text=SIGNAL'; }}
                            />
                            <div className="listener-artwork-overlay"></div>
                        </div>
                        
                        <div className="listener-track-info">
                            <h2 className="listener-track-title truncate">{deckA?.title || 'NO_SIGNAL'}</h2>
                            <h3 className="listener-track-artist truncate">{getDisplayArtist(deckA) || 'AWAITING_TRANSMISSION'}</h3>
                        </div>

                        <div className="listener-progress-container">
                            <div className="listener-progress-bar">
                                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className="listener-time-row mono">
                                <span>{formatTime(currentTime)}</span>
                                <span>-{formatTime(duration - currentTime)}</span>
                            </div>
                        </div>

                        <div className="listener-controls">
                            <button onClick={() => onLike(deckA)} className="control-btn"><Heart size={16} /></button>
                            <button onClick={onPrev} className="control-btn"><SkipBack size={16} /></button>
                            <button onClick={onPlayPause} className={`control-btn play-btn ${isPlayingA ? 'active' : ''}`}>
                                {isPlayingA ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                            </button>
                            <button onClick={onNext} className="control-btn"><SkipForward size={16} /></button>
                            <button onClick={() => onPurchase(deckA)} className="control-btn"><DollarSign size={16} /></button>
                        </div>

                        <div className="listener-mode-toggle">
                            <button onClick={() => setViewMode('MIXER')} className="toggle-view-btn-main">
                                <Settings size={14} className="mr-2 inline" /> OPEN_CONSOLE
                            </button>
                        </div>
                    </div>
                </>
            )}

                {/* SECONDARY UTILITY PANE */}

                <div className="utility-interlink-pane glass-pane">
                    <div className="utility-header-neon">
                        <div className="utility-tabs-neon">
                            <button onClick={() => setActiveTab('LIBRARY')} className={`util-tab ${activeTab === 'LIBRARY' ? 'active' : ''}`}><Disc size={12} /> <span>SIGNAL_CRATE</span></button>
                            <button onClick={() => setActiveTab('CHAT')} className={`util-tab ${activeTab === 'CHAT' ? 'active' : ''}`}><MessageSquare size={12} /> <span>NEURAL_CHAT</span></button>
                            <button onClick={() => setActiveTab('REQUESTS')} className={`util-tab ${activeTab === 'REQUESTS' ? 'active' : ''}`}><List size={12} /> <span>SIGNAL_REQUESTS</span></button>
                        </div>
                        
                        {activeTab === 'LIBRARY' && (
                            <div className="crate-controls-hub">
                                <div className="crate-search-box">
                                    <Search size={10} className="opacity-30" />
                                    <input 
                                        type="text" 
                                        placeholder="SEARCH_SIGNAL_DATABASE..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="crate-search-input"
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
                                                <SkipBack size={8} /> BACK_TO_BROWSE
                                            </button>
                                            <button 
                                                onClick={handleShuffle}
                                                className="filter-chip shuffle-btn flex items-center gap-2 bg-[#ff006e]/10 border-[#ff006e]/20 text-[#ff006e]"
                                                title="SHUFFLE_SIGNALS"
                                            >
                                                <Shuffle size={10} /> SHUFFLE
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={handleShuffle}
                                                className="filter-chip shuffle-btn flex items-center gap-2 bg-[#ff006e]/10 border-[#ff006e]/20 text-[#ff006e]"
                                                title="SHUFFLE_SIGNALS"
                                            >
                                                <Shuffle size={10} /> SHUFFLE
                                            </button>
                                            <div className="w-px h-4 bg-white/10 mx-1" />
                                            {['ALL', 'PURCHASED', 'FAVORITES', 'ARTISTS', 'PLAYLISTS'].map(cat => (
                                                <button 
                                                    key={cat}
                                                    onClick={() => {
                                                        setCrateCategory(cat);
                                                        setViewingPlaylist(null);
                                                        setViewingArtist(null);
                                                    }}
                                                    className={`filter-chip ${crateCategory === cat ? 'active' : ''}`}
                                                >
                                                    {cat}
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
                                                <th className="w-16">LOAD</th>
                                                <th>SIGNAL_ID</th>
                                                <th>ORIGIN</th>
                                                <th className="w-12">BPM</th>
                                                <th className="w-12">SYNC</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isCrateLoading ? (
                                                <tr className="signal-row"><td colSpan="5" className="text-center py-8 opacity-40 italic">HYDRATING_SIGNAL_SEQUENCE...</td></tr>
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
                                                        <tr className="section-header-row"><td colSpan="5">PLAYLIST_INSPECTION: {viewingPlaylist.name || viewingPlaylist.Title}</td></tr>
                                                    )}
                                                    {viewingArtist && (
                                                        <tr className="section-header-row"><td colSpan="5">ARTIST_SEQUENCE: {viewingArtist}</td></tr>
                                                    )}
                                                    {getFilteredTracks().collection.length > 0 && !viewingPlaylist && !viewingArtist && (
                                                        <tr className="section-header-row"><td colSpan="5">SIGNAL_COLLECTION</td></tr>
                                                    )}
                                                    {getFilteredTracks().collection.map((t, i) => (
                                                        <tr key={`col-${i}`} className="signal-row">
                                                            <td className="load-actions">
                                                                <button onClick={() => loadToDeck(t, 'A')} className="load-chip">A</button>
                                                                <button onClick={() => loadToDeck(t, 'B')} className="load-chip">B</button>
                                                            </td>
                                                            <td className="sig-title truncate font-black flex items-center gap-2">
                                                                {t.title}
                                                                {t.isLiked && <Heart size={8} fill="var(--accent)" className="text-[var(--accent)]" />}
                                                            </td>
                                                            <td className="sig-artist truncate opacity-30">{getDisplayArtist(t)}</td>
                                                            <td className="sig-bpm mono text-[var(--accent)]">{t.bpm || '--'}</td>
                                                            <td className="sig-sync mono opacity-20">{t.duration ? Math.floor(t.duration / 60) + ':' + (t.duration % 60).toString().padStart(2, '0') : '--:--'}</td>
                                                        </tr>
                                                    ))}

                                                    {getFilteredTracks().network.length > 0 && !viewingPlaylist && (
                                                        <tr className="section-header-row"><td colSpan="5">GLOBAL_NETWORK_RESULTS</td></tr>
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
                            {activeTab === 'CHAT' && (
                                <motion.div 
                                    key="chat"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="chat-container-nano flex flex-col h-full"
                                >
                                    <div className="chat-messages-scroll custom-scrollbar flex-1 overflow-y-auto p-4 space-y-4">
                                        {chatMessages.length > 0 ? chatMessages.map((m, i) => (
                                            <div key={i} className={`neural-msg ${m.username === (station?.artistName) ? 'artist' : ''}`}>
                                                <div className="msg-meta flex items-center gap-2 mb-1">
                                                    <span className="msg-user font-black tracking-tighter text-[8px] uppercase">{m.username || m.userName || 'ANON_NODE'}</span>
                                                    <span className="msg-time opacity-20 text-[6px]">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className="msg-content p-2 rounded bg-white/5 border border-white/5 text-[10px] leading-relaxed">
                                                    {m.message || m.content}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="h-full flex items-center justify-center opacity-20 italic text-[10px]">NO_NEURAL_ACTIVITY_DETECTED...</div>
                                        )}
                                    </div>
                                    <div className="chat-input-row p-3 border-t border-white/5 bg-black/40 flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="BROADCAST_SIGNAL..." 
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (onSendMessage(chatInput), setChatInput(''))}
                                            className="neural-chat-input flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-[10px] focus:outline-none focus:border-[var(--accent)]/50"
                                        />
                                        <button 
                                            onClick={() => { onSendMessage(chatInput); setChatInput(''); }}
                                            className="neural-send-btn px-4 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 rounded hover:bg-[var(--accent)]/20 transition-all"
                                        >
                                            <Zap size={12} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'REQUESTS' && (
                                <motion.div 
                                    key="requests"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="requests-nano custom-scrollbar h-full w-full"
                                >
                                    <table className="signal-table-nano">
                                        <thead>
                                            <tr>
                                                <th className="w-16">LOAD</th>
                                                <th>REQUEST_ID</th>
                                                <th>ORIGIN</th>
                                                <th className="w-12">BPM</th>
                                                <th className="w-12">STATUS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requests.length > 0 ? requests.map((r, i) => (
                                                <tr key={i} className="signal-row request-row">
                                                    <td className="load-actions">
                                                        <button onClick={() => loadToDeck(r, 'A')} className="load-chip">A</button>
                                                        <button onClick={() => loadToDeck(r, 'B')} className="load-chip">B</button>
                                                    </td>
                                                    <td className="sig-title truncate font-black flex items-center gap-2">
                                                        {r.title}
                                                        <span className="text-[6px] px-1 bg-[var(--accent)]/20 rounded">REQ</span>
                                                    </td>
                                                    <td className="sig-artist truncate opacity-30">{getDisplayArtist(r)}</td>
                                                    <td className="sig-bpm mono text-[var(--accent)]">{r.bpm || '--'}</td>
                                                    <td className="sig-sync mono opacity-20 italic">PENDING</td>
                                                </tr>
                                            )) : (
                                                <tr className="signal-row"><td colSpan="5" className="text-center py-12 opacity-20 italic">NO_PENDING_REQUESTS</td></tr>
                                            )}
                                        </tbody>
                                    </table>
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
    );
};

export default DJMixerPlayer;
