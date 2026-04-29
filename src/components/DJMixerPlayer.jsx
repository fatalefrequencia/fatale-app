import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Pause, Volume2, Settings, MessageSquare, List, Share2,
    Activity, Zap, Cpu, Radio, Shield, Users, Disc,
    Search, Plus, DollarSign, Heart, SkipBack, SkipForward
} from 'lucide-react';
import './DJMixerPlayer.css';

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
    onPlaybackRateChange
}) => {
    const [activeTab, setActiveTab] = useState('LIBRARY'); // LIBRARY, CHAT, REQUESTS
    const [crateCategory, setCrateCategory] = useState('ALL'); // ALL, PURCHASED, FAVORITES, ARTISTS, PLAYLISTS
    const [searchQuery, setSearchQuery] = useState('');
    const [isAutoMixEnabled, setIsAutoMixEnabled] = useState(false);
    const [viewingPlaylist, setViewingPlaylist] = useState(null);
    const [isCrateLoading, setIsCrateLoading] = useState(false);
    
    const [deckA, setDeckA] = useState(currentTrack || null);
    const [deckB, setDeckB] = useState(null);
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

    const [eqA, setEqA] = useState({ hi: 0, mid: 0, low: 0 });
    const [eqB, setEqB] = useState({ hi: 0, mid: 0, low: 0 });

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
                if (isPlayingB) audioB.current.play();
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
        setter(prev => ({
            ...prev,
            [param]: Math.max(-20, Math.min(20, prev[param] + delta))
        }));
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
            if (audioB.current.src) audioB.current.play();
        }
        setIsPlayingB(!isPlayingB);
    };

    // Filtered Crate Logic
    const getFilteredTracks = () => {
        if (crateCategory === 'PLAYLISTS') {
            if (viewingPlaylist) {
                return { collection: viewingPlaylist.tracks || viewingPlaylist.Tracks || [], network: [], playlists: [] };
            }
            return { collection: [], network: [], playlists: userPlaylists };
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
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = (currentTime / duration) * 100 || 0;

    return (
        <div className="dj-mixer-overlay">
            {/* Scanline / Texture Layer */}
            <div className="cyber-overlay-fx"></div>
            
            <div className="mixer-hud-wrapper custom-scrollbar">
                {/* PRIMARY CONSOLE PANE */}
                <div className="mixer-console-pane glass-pane">
                    <div className="pane-glitch-border"></div>
                    
                    {/* Top Signal Strip */}
                    <div className="mixer-header-compact">
                        <div className="signal-identity">
                            <div className="station-node">
                                <Radio size={14} className="pulse-icon text-[var(--accent)]" />
                                <span className="mono tracking-[0.4em] uppercase text-[var(--accent)] glow-text">FREQ_{station?.frequency || '100.1'}</span>
                            </div>
                            <div className="session-info">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">{station?.name || 'NEURAL_BROADCAST'}</h2>
                            </div>
                        </div>

                        <div className="main-waveform-mini">
                            <div className="waveform-play-track">
                                <div className="waveform-fill-progress" style={{ width: `${progress}%` }}></div>
                                <div className="waveform-peaks-static">
                                    {[...Array(120)].map((_, i) => (
                                        <div 
                                            key={i} 
                                            className="peak-bar-nano" 
                                            style={{ 
                                                height: `${20 + Math.sin(i * 0.2) * 30 + Math.random() * 20}%`,
                                                opacity: i / 120 < progress / 100 ? 1 : 0.2
                                            }} 
                                        />
                                    ))}
                                </div>
                                <div className="waveform-playhead-nano" style={{ left: `${progress}%` }}></div>
                            </div>
                        </div>

                        <div className="hud-readouts mono">
                            <div className="readout-item">
                                <span className="label">SYNC</span>
                                <span className="val text-green-500">LOCKED</span>
                            </div>
                            <div className="readout-item">
                                <Users size={10} className="text-[var(--accent)]" />
                                <span className="val">{station?.listenerCount || '1.2K'}</span>
                            </div>
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
                                            <Zap size={10} />
                                            <span>EVOLVE</span>
                                        </button>
                                    </div>
                                    
                                    <div className="tempo-control-group">
                                        <div className="tempo-knob-container">
                                            <div 
                                                className="nano-knob interactive" 
                                                onMouseDown={(e) => handleKnobDragStart(e, 'A')}
                                                onWheel={(e) => handleKnobWheel(e, 'A')}
                                                onTouchStart={(e) => handleKnobTouchStart(e, 'A')}
                                                onTouchMove={handleKnobTouchMove}
                                                onTouchEnd={handleKnobTouchEnd}
                                            >
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
                                                className="nano-slider" 
                                            />
                                        </div>
                                        <div className="tempo-label-nano mono opacity-40">TEMPO_BPM</div>
                                    </div>
                                </div>

                                {/* Center Jog */}
                                <div className="jog-wheel-nano" style={{ transform: `rotate(${rotationA}deg)` }}>
                                    <div className="jog-center-art">
                                        {deckA?.cover && <img src={deckA.cover} alt="" />}
                                    </div>
                                    <div className="jog-active-node"></div>
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
                                        >
                                            <div className="knob-dot" style={{ transform: `rotate(${eqA.hi * 7.2}deg)` }}></div>
                                        </div>
                                        <span>HI</span>
                                    </div>
                                    <div className="nano-knob-wrap">
                                        <div className="nano-knob interactive" 
                                            onMouseDown={(e) => handleKnobDragStart(e, 'A', 'mid')}
                                            onWheel={(e) => handleKnobWheel(e, 'A', 'mid')}
                                            onTouchStart={(e) => handleKnobTouchStart(e, 'A', 'mid')}
                                            onTouchMove={handleKnobTouchMove}
                                            onTouchEnd={handleKnobTouchEnd}
                                        >
                                            <div className="knob-dot" style={{ transform: `rotate(${eqA.mid * 7.2}deg)` }}></div>
                                        </div>
                                        <span>MID</span>
                                    </div>
                                    <div className="nano-knob-wrap">
                                        <div className="nano-knob interactive" 
                                            onMouseDown={(e) => handleKnobDragStart(e, 'A', 'low')}
                                            onWheel={(e) => handleKnobWheel(e, 'A', 'low')}
                                            onTouchStart={(e) => handleKnobTouchStart(e, 'A', 'low')}
                                            onTouchMove={handleKnobTouchMove}
                                            onTouchEnd={handleKnobTouchEnd}
                                        >
                                            <div className="knob-dot" style={{ transform: `rotate(${eqA.low * 7.2}deg)` }}></div>
                                        </div>
                                        <span>LOW</span>
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
                                <input type="range" min="-100" max="100" value={crossfader} onChange={(e) => setCrossfader(Number(e.target.value))} className="crossfader-nano" />
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
                                        >
                                            <div className="knob-dot" style={{ transform: `rotate(${eqB.hi * 7.2}deg)` }}></div>
                                        </div>
                                        <span>HI</span>
                                    </div>
                                    <div className="nano-knob-wrap">
                                        <div className="nano-knob interactive" 
                                            onMouseDown={(e) => handleKnobDragStart(e, 'B', 'mid')}
                                            onWheel={(e) => handleKnobWheel(e, 'B', 'mid')}
                                            onTouchStart={(e) => handleKnobTouchStart(e, 'B', 'mid')}
                                            onTouchMove={handleKnobTouchMove}
                                            onTouchEnd={handleKnobTouchEnd}
                                        >
                                            <div className="knob-dot" style={{ transform: `rotate(${eqB.mid * 7.2}deg)` }}></div>
                                        </div>
                                        <span>MID</span>
                                    </div>
                                    <div className="nano-knob-wrap">
                                        <div className="nano-knob interactive" 
                                            onMouseDown={(e) => handleKnobDragStart(e, 'B', 'low')}
                                            onWheel={(e) => handleKnobWheel(e, 'B', 'low')}
                                            onTouchStart={(e) => handleKnobTouchStart(e, 'B', 'low')}
                                            onTouchMove={handleKnobTouchMove}
                                            onTouchEnd={handleKnobTouchEnd}
                                        >
                                            <div className="knob-dot" style={{ transform: `rotate(${eqB.low * 7.2}deg)` }}></div>
                                        </div>
                                        <span>LOW</span>
                                    </div>
                                </div>

                                {/* Center Jog */}
                                <div className="jog-wheel-nano" style={{ transform: `rotate(${rotationB}deg)` }}>
                                    <div className="jog-center-art">
                                        {deckB?.cover && <img src={deckB.cover} alt="" />}
                                    </div>
                                    <div className="jog-active-node"></div>
                                </div>

                                {/* Outer Controls */}
                                <div className="deck-controls-column-nano">
                                    <div className="evolve-toggle-container">
                                        <button 
                                            onClick={() => setIsEvolveB(!isEvolveB)} 
                                            className={`evolve-btn ${isEvolveB ? 'active' : ''}`}
                                        >
                                            <Zap size={10} />
                                            <span>EVOLVE</span>
                                        </button>
                                    </div>
                                    
                                    <div className="tempo-control-group">
                                        <div className="tempo-knob-container">
                                            <div 
                                                className="nano-knob interactive" 
                                                onMouseDown={(e) => handleKnobDragStart(e, 'B')}
                                                onWheel={(e) => handleKnobWheel(e, 'B')}
                                                onTouchStart={(e) => handleKnobTouchStart(e, 'B')}
                                                onTouchMove={handleKnobTouchMove}
                                                onTouchEnd={handleKnobTouchEnd}
                                            >
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
                                                className="nano-slider" 
                                            />
                                        </div>
                                        <div className="tempo-label-nano mono opacity-40">TEMPO_BPM</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

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
                                    {viewingPlaylist ? (
                                        <button 
                                            onClick={() => setViewingPlaylist(null)}
                                            className="filter-chip active flex items-center gap-2"
                                        >
                                            <SkipBack size={8} /> BACK_TO_PLAYLISTS
                                        </button>
                                    ) : (
                                        ['ALL', 'PURCHASED', 'FAVORITES', 'ARTISTS', 'PLAYLISTS'].map(cat => (
                                            <button 
                                                key={cat}
                                                onClick={() => {
                                                    setCrateCategory(cat);
                                                    setViewingPlaylist(null);
                                                }}
                                                className={`filter-chip ${crateCategory === cat ? 'active' : ''}`}
                                            >
                                                {cat}
                                            </button>
                                        ))
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
                                                getFilteredTracks().playlists.map((p, i) => (
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
                                            ) : (
                                                <>
                                                    {viewingPlaylist && (
                                                        <tr className="section-header-row"><td colSpan="5">PLAYLIST_INSPECTION: {viewingPlaylist.name || viewingPlaylist.Title}</td></tr>
                                                    )}
                                                    {getFilteredTracks().collection.length > 0 && !viewingPlaylist && (
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
                                                            <td className="sig-artist truncate opacity-30">{t.artist}</td>
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
                                                            <td className="sig-artist truncate opacity-30">{t.artist}</td>
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
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Tactical Decals */}
            <div className="cyber-label-fx top-right">SYSTEM_STABLE_4.2.0</div>
            <div className="cyber-label-fx bottom-left">NEURAL_DECK_PRO_V5</div>
        </div>
    );
};

export default DJMixerPlayer;
