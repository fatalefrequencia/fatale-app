import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, Pause, SkipForward, SkipBack, Volume2, 
    Settings, MessageSquare, List, Share2, 
    Activity, Zap, Cpu, Radio, Shield, Users
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
    onSendMessage
}) => {
    const [activeTab, setActiveTab] = useState('CHAT'); // CHAT, REQUESTS, STATS
    const jogWheelRef = useRef(null);
    const [rotation, setRotation] = useState(0);

    // Animate Jog Wheel based on playback
    useEffect(() => {
        let animationFrame;
        const animate = () => {
            if (isPlaying) {
                setRotation(prev => (prev + 1) % 360);
            }
            animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [isPlaying]);

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
                        <span className="mono tracking-[0.3em] uppercase">FREQ_{station?.frequency || '100.1'}</span>
                    </div>
                    <div className="session-info">
                        <h2 className="text-xs font-black uppercase tracking-widest">{station?.name || 'NEURAL_BROADCAST'}</h2>
                        <p className="text-[8px] mono opacity-40 uppercase">Broadcast_Node_{station?.id || 'ALPHA'}</p>
                    </div>
                </div>

                <div className="main-waveform-container">
                    <div className="waveform-bg"></div>
                    <div className="waveform-progress" style={{ width: `${progress}%` }}></div>
                    <div className="waveform-peaks">
                        {[...Array(60)].map((_, i) => (
                            <div 
                                key={i} 
                                className="peak-bar" 
                                style={{ 
                                    height: `${20 + Math.random() * 60}%`,
                                    opacity: i / 60 < progress / 100 ? 1 : 0.2
                                }} 
                            />
                        ))}
                    </div>
                </div>

                <div className="listener-count">
                    <Users size={12} />
                    <span className="mono text-[10px]">{station?.listenerCount || 0}</span>
                </div>
            </div>

            {/* Main Control Deck */}
            <div className="mixer-deck">
                {/* Left Control Column */}
                <div className="deck-controls left">
                    <div className="modulation-node">
                        <span className="node-label">GAIN</span>
                        <div className="knob-container">
                            <div className="knob" style={{ transform: `rotate(${(volume * 270) - 135}deg)` }}>
                                <div className="knob-pointer"></div>
                            </div>
                        </div>
                    </div>
                    <div className="modulation-node">
                        <span className="node-label">LOW</span>
                        <div className="knob-container">
                            <div className="knob" style={{ transform: 'rotate(0deg)' }}>
                                <div className="knob-pointer"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Central Neural Hub */}
                <div className="central-hub-container">
                    <div className="hub-outer-glow"></div>
                    <motion.div 
                        className="jog-wheel"
                        style={{ rotate: rotation }}
                        ref={jogWheelRef}
                    >
                        <div className="jog-inner-ring">
                            <div className="jog-center">
                                <div className="track-pfp">
                                    <img src={currentTrack?.artwork || '/assets/default_artwork.png'} alt="" />
                                </div>
                            </div>
                        </div>
                        {/* Interactive Markers */}
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="jog-marker" style={{ transform: `rotate(${i * 30}deg)` }}></div>
                        ))}
                    </motion.div>

                    {/* Playback Controls Overlay */}
                    <div className="playback-controls-hud">
                        <button onClick={onPrev} className="hud-btn"><SkipBack size={20} /></button>
                        <button onClick={onPlayPause} className="hud-btn main-play">
                            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                        </button>
                        <button onClick={onNext} className="hud-btn"><SkipForward size={20} /></button>
                    </div>

                    <div className="time-display mono">
                        <span className="current">{formatTime(currentTime)}</span>
                        <span className="divider">/</span>
                        <span className="total">{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Right Control Column */}
                <div className="deck-controls right">
                    <div className="modulation-node">
                        <span className="node-label">MID</span>
                        <div className="knob-container">
                            <div className="knob" style={{ transform: 'rotate(20deg)' }}>
                                <div className="knob-pointer"></div>
                            </div>
                        </div>
                    </div>
                    <div className="modulation-node">
                        <span className="node-label">HIGH</span>
                        <div className="knob-container">
                            <div className="knob" style={{ transform: 'rotate(-45deg)' }}>
                                <div className="knob-pointer"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Interaction Strip */}
            <div className="mixer-footer">
                <div className="footer-tabs">
                    <button 
                        onClick={() => setActiveTab('CHAT')}
                        className={`tab-btn ${activeTab === 'CHAT' ? 'active' : ''}`}
                    >
                        <MessageSquare size={14} /> <span>NEURAL_CHAT</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('REQUESTS')}
                        className={`tab-btn ${activeTab === 'REQUESTS' ? 'active' : ''}`}
                    >
                        <List size={14} /> <span>SIGNAL_REQUESTS</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('STATS')}
                        className={`tab-btn ${activeTab === 'STATS' ? 'active' : ''}`}
                    >
                        <Activity size={14} /> <span>PULSE_STATS</span>
                    </button>
                </div>

                <div className="tab-content-area">
                    <AnimatePresence mode="wait">
                        {activeTab === 'CHAT' && (
                            <motion.div 
                                key="chat"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="chat-container"
                            >
                                <div className="chat-messages custom-scrollbar">
                                    {chatMessages.length > 0 ? chatMessages.map((m, i) => (
                                        <div key={i} className="chat-msg">
                                            <span className="user text-[var(--profile-accent)]">{m.username}:</span>
                                            <span className="text">{m.text}</span>
                                        </div>
                                    )) : (
                                        <div className="text-center opacity-20 py-4 italic text-[10px]">WAITING_FOR_SIGNALS...</div>
                                    )}
                                </div>
                                <div className="chat-input-wrapper">
                                    <input type="text" placeholder="TRANSMIT_MESSAGE..." className="mono" />
                                    <button className="send-btn"><Zap size={14} /></button>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'REQUESTS' && (
                            <motion.div 
                                key="requests"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="requests-list"
                            >
                                {requests.length > 0 ? requests.map((r, i) => (
                                    <div key={i} className="request-item">
                                        <div className="req-info">
                                            <span className="title">{r.title}</span>
                                            <span className="artist opacity-40">{r.artist}</span>
                                        </div>
                                        <div className="req-sender text-[var(--profile-accent)]">@{r.requestedBy}</div>
                                    </div>
                                )) : (
                                    <div className="text-center opacity-20 py-8 italic text-[10px]">NO_PENDING_REQUESTS</div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Tactical Decals */}
            <div className="tactical-decal top-left">MODEL_55_COMMAND_DECK</div>
            <div className="tactical-decal bottom-right">FATALE_SYSTEM_V4.2</div>
        </div>
    );
};

export default DJMixerPlayer;
