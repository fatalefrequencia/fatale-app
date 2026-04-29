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
    onClose,
    tracks = [],
    libraryTracks = [],
    onPlayTrack
}) => {
    const [activeTab, setActiveTab] = useState('LIBRARY'); // LIBRARY, CHAT, REQUESTS
    const [crateCategory, setCrateCategory] = useState('COLLECTION'); // COLLECTION, DISCOVERY
    const [searchQuery, setSearchQuery] = useState('');
    const [isAutoMixEnabled, setIsAutoMixEnabled] = useState(false);
    
    const [deckA, setDeckA] = useState(currentTrack || null);
    const [deckB, setDeckB] = useState(null);
    const [crossfader, setCrossfader] = useState(0); // -100 to 100
    const [rotationA, setRotationA] = useState(0);
    const [rotationB, setRotationB] = useState(0);
    const [pitchA, setPitchA] = useState(0);
    const [pitchB, setPitchB] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

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
                setRotationA(prev => (prev + 1.2) % 360);
                if (deckB) setRotationB(prev => (prev + 1.2) % 360);
            }
            animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [isPlaying, deckB]);

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
        }
    };

    // Filtered Crate Logic
    const getFilteredTracks = () => {
        // Clear distinction between personal library and global discovery
        let base = crateCategory === 'COLLECTION' ? libraryTracks : tracks;
        
        // Ensure no duplicates
        const seen = new Set();
        base = base.filter(t => {
            const id = t.id || t.Id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            base = base.filter(t => 
                t.title?.toLowerCase().includes(q) || 
                t.artist?.toLowerCase().includes(q)
            );
        }
        return base;
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
                            {/* Signal Ingest Bar */}
                            <div className="signal-ingest-bar">
                                <div className="ingest-info truncate">{deckA?.title || 'NO_SIGNAL'}</div>
                                <div className="ingest-actions">
                                    <button onClick={() => onLike(deckA)} className="ingest-btn" title="ADD_TO_LIBRARY"><Plus size={10} /></button>
                                    <button onClick={() => onPurchase(deckA)} className="ingest-btn" title="PURCHASE_SIGNAL"><DollarSign size={10} /></button>
                                </div>
                            </div>

                            <div className="deck-meta-strip">
                                <div className="deck-id-tag">NODE_A</div>
                                <div className="bpm-tag mono">{deckA?.bpm || '128.0'} <span className="opacity-20 text-[8px]">BPM</span></div>
                            </div>

                            <div className="deck-visual-core-nano">
                                <div className="pitch-slider-vertical">
                                    <input type="range" min="-8" max="8" step="0.1" value={pitchA} onChange={(e) => setPitchA(e.target.value)} className="nano-slider" />
                                    <div className="pitch-readout mono">{pitchA}%</div>
                                </div>

                                <div className="jog-wheel-nano">
                                    <motion.div className="jog-ring" style={{ rotate: rotationA }}>
                                        <div className="jog-center-art">
                                            {deckA?.cover || deckA?.thumbnail ? <img src={deckA.cover || deckA.thumbnail} alt="" /> : <div className="neon-glitch-icon">A</div>}
                                        </div>
                                        <div className="jog-active-node"></div>
                                    </motion.div>
                                </div>

                                <div className="eq-knobs-column">
                                    <div className="nano-knob"><div className="knob-dot"></div><span>LOW</span></div>
                                    <div className="nano-knob"><div className="knob-dot"></div><span>MID</span></div>
                                    <div className="nano-knob"><div className="knob-dot"></div><span>HI</span></div>
                                </div>
                            </div>
                        </div>

                        {/* MASTER CENTRAL HUB */}
                        <div className="master-central-strip">
                            <div className="master-nav-row">
                                <button onClick={onPrev} className="nav-btn mini"><SkipBack size={12} /></button>
                                <button onClick={onPlayPause} className="master-btn-neon">
                                    {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
                                </button>
                                <button onClick={onNext} className="nav-btn mini"><SkipForward size={12} /></button>
                            </div>
                            
                            <div className="evolve-toggle-container">
                                <button 
                                    onClick={() => setIsAutoMixEnabled(!isAutoMixEnabled)} 
                                    className={`evolve-btn ${isAutoMixEnabled ? 'active' : ''}`}
                                >
                                    <Zap size={10} />
                                    <span>EVOLVE</span>
                                </button>
                            </div>

                            <div className="master-vu-nano">
                                <div className="vu-led"><div className="vu-led-fill" style={{ height: isPlaying ? '70%' : '0%' }}></div></div>
                                <div className="vu-led"><div className="vu-led-fill" style={{ height: isPlaying ? '65%' : '0%' }}></div></div>
                            </div>
                            <div className="deck-crossfader">
                                <div className="cf-label">A</div>
                                <input type="range" min="-100" max="100" value={crossfader} onChange={(e) => setCrossfader(e.target.value)} className="crossfader-nano" />
                                <div className="cf-label">B</div>
                            </div>
                        </div>

                        {/* DECK B */}
                        <div className={`deck-module-nano deck-b ${!deckB ? 'empty' : ''}`}>
                            {/* Signal Ingest Bar */}
                            <div className="signal-ingest-bar">
                                <div className="ingest-info truncate">{deckB?.title || 'NO_SIGNAL'}</div>
                                <div className="ingest-actions">
                                    <button onClick={() => onLike(deckB)} className="ingest-btn"><Plus size={10} /></button>
                                    <button onClick={() => onPurchase(deckB)} className="ingest-btn"><DollarSign size={10} /></button>
                                </div>
                            </div>

                            <div className="deck-meta-strip text-right">
                                <div className="bpm-tag mono">{deckB?.bpm || '124.5'} <span className="opacity-20 text-[8px]">BPM</span></div>
                                <div className="deck-id-tag">NODE_B</div>
                            </div>

                            <div className="deck-visual-core-nano">
                                <div className="eq-knobs-column">
                                    <div className="nano-knob"><div className="knob-dot"></div><span>HI</span></div>
                                    <div className="nano-knob"><div className="knob-dot"></div><span>MID</span></div>
                                    <div className="nano-knob"><div className="knob-dot"></div><span>LOW</span></div>
                                </div>

                                <div className="jog-wheel-nano">
                                    <motion.div className="jog-ring" style={{ rotate: rotationB }}>
                                        <div className="jog-center-art">
                                            {deckB?.cover || deckB?.thumbnail ? <img src={deckB.cover || deckB.thumbnail} alt="" /> : <div className="neon-glitch-icon">B</div>}
                                        </div>
                                        <div className="jog-active-node"></div>
                                    </motion.div>
                                </div>

                                <div className="pitch-slider-vertical">
                                    <input type="range" min="-8" max="8" step="0.1" value={pitchB} onChange={(e) => setPitchB(e.target.value)} className="nano-slider" />
                                    <div className="pitch-readout mono">{pitchB}%</div>
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
                                    {['COLLECTION', 'DISCOVERY'].map(cat => (
                                        <button 
                                            key={cat}
                                            onClick={() => setCrateCategory(cat)}
                                            className={`filter-chip ${crateCategory === cat ? 'active' : ''}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="utility-content-nano">
                        <AnimatePresence mode="wait">
                            {activeTab === 'LIBRARY' && (
                                <motion.div key="lib" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="library-nano custom-scrollbar">
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
                                            {getFilteredTracks().map((t, i) => (
                                                <tr key={i} className="signal-row">
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
                                        </tbody>
                                    </table>
                                </motion.div>
                            )}
                            {/* Additional Tab Content ... */}
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
