import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Pause, SkipForward, SkipBack, Volume2, 
    Settings, MessageSquare, List, Share2, 
    Activity, Zap, Cpu, Radio, Shield, Users, Disc
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
    tracks = [],
    libraryTracks = []
}) => {
    const [activeTab, setActiveTab] = useState('LIBRARY'); // LIBRARY, CHAT, REQUESTS
    const [deckA, setDeckA] = useState(currentTrack || null);
    const [deckB, setDeckB] = useState(null);
    const [crossfader, setCrossfader] = useState(0); // -100 to 100
    const [rotationA, setRotationA] = useState(0);
    const [rotationB, setRotationB] = useState(0);
    const [pitchA, setPitchA] = useState(0);
    const [pitchB, setPitchB] = useState(0);

    // Sync Deck A with global track if needed
    useEffect(() => {
        if (currentTrack && !deckA) setDeckA(currentTrack);
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

    const loadToDeck = (track, deck) => {
        if (deck === 'A') setDeckA(track);
        else setDeckB(track);
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
                            <div className="waveform-peaks-dense">
                                {[...Array(120)].map((_, i) => (
                                    <div 
                                        key={i} 
                                        className="peak-bar-nano" 
                                        style={{ 
                                            height: `${10 + Math.random() * 80}%`,
                                            background: i / 120 < progress / 100 ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                            boxShadow: i / 120 < progress / 100 ? '0 0 8px var(--accent)' : 'none'
                                        }} 
                                    />
                                ))}
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
                        <div className={`deck-module-nano deck-a ${!deckA ? 'empty' : 'active'}`}>
                            <div className="deck-meta-strip">
                                <div className="deck-id-tag">NODE_A</div>
                                <div className="bpm-tag mono">{deckA?.bpm || '128.0'} <span className="opacity-20">BPM</span></div>
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
                            <div className="master-controls-nano">
                                <button onClick={onPlayPause} className="master-btn-neon">
                                    {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
                                </button>
                                <div className="master-vu-nano">
                                    <div className="vu-led"><div className="vu-led-fill" style={{ height: isPlaying ? '70%' : '0%' }}></div></div>
                                    <div className="vu-led"><div className="vu-led-fill" style={{ height: isPlaying ? '65%' : '0%' }}></div></div>
                                </div>
                            </div>
                            <div className="deck-crossfader">
                                <input type="range" min="-100" max="100" value={crossfader} onChange={(e) => setCrossfader(e.target.value)} className="crossfader-nano" />
                            </div>
                        </div>

                        {/* DECK B */}
                        <div className={`deck-module-nano deck-b ${!deckB ? 'empty' : ''}`}>
                            <div className="deck-meta-strip text-right">
                                <div className="bpm-tag mono">{deckB?.bpm || '124.5'} <span className="opacity-20">BPM</span></div>
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
                    <div className="utility-tabs-neon">
                        <button onClick={() => setActiveTab('LIBRARY')} className={`util-tab ${activeTab === 'LIBRARY' ? 'active' : ''}`}><Disc size={12} /> <span>SIGNAL_CRATE</span></button>
                        <button onClick={() => setActiveTab('CHAT')} className={`util-tab ${activeTab === 'CHAT' ? 'active' : ''}`}><MessageSquare size={12} /> <span>NEURAL_CHAT</span></button>
                        <button onClick={() => setActiveTab('REQUESTS')} className={`util-tab ${activeTab === 'REQUESTS' ? 'active' : ''}`}><List size={12} /> <span>SIGNAL_REQUESTS</span></button>
                    </div>

                    <div className="utility-content-nano">
                        <AnimatePresence mode="wait">
                            {activeTab === 'LIBRARY' && (
                                <motion.div key="lib" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="library-nano custom-scrollbar">
                                    <table className="signal-table-nano">
                                        <thead>
                                            <tr>
                                                <th>LOAD</th>
                                                <th>SIGNAL_ID</th>
                                                <th>ORIGIN</th>
                                                <th>BPM</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...tracks, ...libraryTracks].map((t, i) => (
                                                <tr key={i} className="signal-row">
                                                    <td className="load-actions">
                                                        <button onClick={() => loadToDeck(t, 'A')} className="load-chip">A</button>
                                                        <button onClick={() => loadToDeck(t, 'B')} className="load-chip">B</button>
                                                    </td>
                                                    <td className="sig-title truncate font-black">{t.title}</td>
                                                    <td className="sig-artist truncate opacity-30">{t.artist}</td>
                                                    <td className="sig-bpm mono text-[var(--accent)]">{t.bpm || '--'}</td>
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
