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
        <div className="dj-mixer-container landscape-mode">
            {/* Top Signal Strip */}
            <div className="mixer-header">
                <div className="signal-identity">
                    <div className="station-node">
                        <Radio size={14} className="pulse-icon" />
                        <span className="mono tracking-[0.3em] uppercase text-[var(--accent)]">FREQ_{station?.frequency || '100.1'}</span>
                    </div>
                    <div className="session-info">
                        <h2 className="text-xs font-black uppercase tracking-widest text-white">{station?.name || 'NEURAL_BROADCAST'}</h2>
                        <p className="text-[8px] mono opacity-40 uppercase tracking-tighter">Broadcast_Node_{station?.id || 'ALPHA'}</p>
                    </div>
                </div>

                <div className="main-waveform-container">
                    <div className="waveform-peaks">
                        {[...Array(80)].map((_, i) => (
                            <div 
                                key={i} 
                                className="peak-bar" 
                                style={{ 
                                    height: `${15 + Math.random() * 70}%`,
                                    background: i / 80 < progress / 100 ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                                    boxShadow: i / 80 < progress / 100 ? '0 0 10px var(--accent)' : 'none'
                                }} 
                            />
                        ))}
                    </div>
                    <div className="waveform-playhead" style={{ left: `${progress}%` }}></div>
                </div>

                <div className="listener-count-hud">
                    <Users size={12} className="text-[var(--accent)]" />
                    <span className="mono text-[10px] font-bold">{station?.listenerCount || '1.2K'}</span>
                    <div className="live-dot animate-pulse"></div>
                </div>
            </div>

            {/* Main Dual Deck Area */}
            <div className="mixer-decks-grid">
                {/* DECK A */}
                <div className={`deck-module deck-a ${!deckA ? 'empty' : 'active'}`}>
                    <div className="deck-header">
                        <div className="deck-id">DECK_A</div>
                        <div className="track-meta">
                            <div className="title truncate text-white">{deckA?.title || 'LOAD_SIGNAL_...'}</div>
                            <div className="artist truncate opacity-50">{deckA?.artist || 'EMPTY_NODE'}</div>
                        </div>
                        <div className="bpm-display mono">
                            <span className="text-[var(--accent)]">{deckA?.bpm || '128.0'}</span>
                            <span className="opacity-20 text-[8px]">BPM</span>
                        </div>
                    </div>

                    <div className="deck-visual-core">
                        <div className="pitch-slider-container">
                            <input 
                                type="range" 
                                min="-8" max="8" step="0.1" 
                                value={pitchA} 
                                onChange={(e) => setPitchA(e.target.value)}
                                className="pitch-slider vertical-slider"
                            />
                            <div className="pitch-value mono">{pitchA > 0 ? `+${pitchA}` : pitchA}%</div>
                        </div>

                        <div className="jog-wheel-container small">
                            <motion.div className="jog-wheel" style={{ rotate: rotationA }}>
                                <div className="jog-center">
                                    {deckA?.cover || deckA?.thumbnail ? <img src={deckA.cover || deckA.thumbnail} alt="" /> : <Cpu size={24} className="opacity-20" />}
                                </div>
                                <div className="jog-marker-active"></div>
                            </motion.div>
                        </div>

                        <div className="deck-controls-strip">
                            <div className="knob-mini"><div className="knob-pointer"></div><span className="label">GAIN</span></div>
                            <div className="knob-mini"><div className="knob-pointer"></div><span className="label">LOW</span></div>
                            <div className="knob-mini"><div className="knob-pointer"></div><span className="label">MID</span></div>
                            <div className="knob-mini"><div className="knob-pointer"></div><span className="label">HI</span></div>
                        </div>
                    </div>
                </div>

                {/* CENTRAL MIXER STRIP */}
                <div className="central-mixer-strip">
                    <div className="master-controls">
                        <button onClick={onPrev} className="master-btn mini"><SkipBack size={14} /></button>
                        <button onClick={onPlayPause} className="master-btn play">
                            {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
                        </button>
                        <button onClick={onNext} className="master-btn mini"><SkipForward size={14} /></button>
                    </div>

                    <div className="v-faders">
                        <div className="fader-track"><div className="fader-knob" style={{ bottom: '80%' }}></div></div>
                        <div className="fader-track"><div className="fader-knob" style={{ bottom: '70%' }}></div></div>
                    </div>
                    
                    <div className="master-vu-meters">
                        <div className="vu-bar"><div className="vu-fill" style={{ height: `${isPlaying ? 40 + Math.random() * 40 : 0}%` }}></div></div>
                        <div className="vu-bar"><div className="vu-fill" style={{ height: `${isPlaying ? 35 + Math.random() * 45 : 0}%` }}></div></div>
                    </div>
                </div>

                {/* DECK B */}
                <div className={`deck-module deck-b ${!deckB ? 'empty' : ''}`}>
                    <div className="deck-header">
                        <div className="bpm-display mono">
                            <span className="text-[var(--accent)]">{deckB?.bpm || '124.5'}</span>
                            <span className="opacity-20 text-[8px]">BPM</span>
                        </div>
                        <div className="track-meta text-right">
                            <div className="title truncate text-white">{deckB?.title || 'LOAD_SIGNAL_...'}</div>
                            <div className="artist truncate opacity-50">{deckB?.artist || 'EMPTY_NODE'}</div>
                        </div>
                        <div className="deck-id">DECK_B</div>
                    </div>

                    <div className="deck-visual-core">
                        <div className="deck-controls-strip">
                            <div className="knob-mini"><div className="knob-pointer"></div><span className="label">HI</span></div>
                            <div className="knob-mini"><div className="knob-pointer"></div><span className="label">MID</span></div>
                            <div className="knob-mini"><div className="knob-pointer"></div><span className="label">LOW</span></div>
                            <div className="knob-mini"><div className="knob-pointer"></div><span className="label">GAIN</span></div>
                        </div>

                        <div className="jog-wheel-container small">
                            <motion.div className="jog-wheel" style={{ rotate: rotationB }}>
                                <div className="jog-center">
                                    {deckB?.cover || deckB?.thumbnail ? <img src={deckB.cover || deckB.thumbnail} alt="" /> : <Cpu size={24} className="opacity-20" />}
                                </div>
                                <div className="jog-marker-active"></div>
                            </motion.div>
                        </div>

                        <div className="pitch-slider-container">
                            <input 
                                type="range" 
                                min="-8" max="8" step="0.1" 
                                value={pitchB} 
                                onChange={(e) => setPitchB(e.target.value)}
                                className="pitch-slider vertical-slider"
                            />
                            <div className="pitch-value mono">{pitchB > 0 ? `+${pitchB}` : pitchB}%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Interaction Strip */}
            <div className="mixer-footer-expanded">
                <div className="mixer-footer-nav">
                    <button onClick={() => setActiveTab('LIBRARY')} className={`footer-tab ${activeTab === 'LIBRARY' ? 'active' : ''}`}><Disc size={14} /> <span>SIGNAL_CRATE</span></button>
                    <button onClick={() => setActiveTab('CHAT')} className={`footer-tab ${activeTab === 'CHAT' ? 'active' : ''}`}><MessageSquare size={14} /> <span>NEURAL_CHAT</span></button>
                    <button onClick={() => setActiveTab('REQUESTS')} className={`footer-tab ${activeTab === 'REQUESTS' ? 'active' : ''}`}><List size={14} /> <span>SIGNAL_REQUESTS</span></button>
                </div>

                <div className="mixer-footer-content">
                    <AnimatePresence mode="wait">
                        {activeTab === 'LIBRARY' && (
                            <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="library-browser custom-scrollbar">
                                <table className="crate-table">
                                    <thead>
                                        <tr>
                                            <th>LOAD</th>
                                            <th>SIGNAL_ID</th>
                                            <th>ARTIST</th>
                                            <th>BPM</th>
                                            <th>TIME</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...tracks, ...libraryTracks].map((t, i) => (
                                            <tr key={i} className="crate-row">
                                                <td className="load-btns">
                                                    <button onClick={() => loadToDeck(t, 'A')} className="load-btn">A</button>
                                                    <button onClick={() => loadToDeck(t, 'B')} className="load-btn">B</button>
                                                </td>
                                                <td className="title font-bold uppercase">{t.title}</td>
                                                <td className="artist opacity-40">{t.artist}</td>
                                                <td className="mono text-[var(--accent)]">{t.bpm || '---'}</td>
                                                <td className="mono opacity-40">{t.duration ? Math.floor(t.duration / 60) + ':' + (t.duration % 60).toString().padStart(2, '0') : '--:--'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </motion.div>
                        )}
                        {/* CHAT and REQUESTS components remain similar but scaled */}
                    </AnimatePresence>
                </div>

                <div className="crossfader-strip">
                    <span className="mono text-[8px] opacity-20">A</span>
                    <div className="crossfader-track">
                        <input 
                            type="range" 
                            min="-100" max="100" 
                            value={crossfader} 
                            onChange={(e) => setCrossfader(e.target.value)} 
                            className="crossfader-slider"
                        />
                    </div>
                    <span className="mono text-[8px] opacity-20">B</span>
                </div>
            </div>

            {/* Tactical Decals */}
            <div className="tactical-decal top-left">MODEL_55_COMMAND_DECK</div>
            <div className="tactical-decal bottom-right">FATALE_SYSTEM_V4.2</div>
        </div>
    );
};

export default DJMixerPlayer;
