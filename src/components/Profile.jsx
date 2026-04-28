import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TrackActionsDropdown from './TrackActionsDropdown';
import UploadTrackView from './UploadTrackView';
import NeuroGraph from './NeuroGraph';
import ContentModal from './ContentModal';
import './SpatialProfile.css';
import {
    Terminal, Cpu, Database, Hash, Shield, Code, ChevronRight, Play, X, Music,
    RefreshCw, Plus, Frown, Globe, Lock, PlayCircle, Edit3, Send, Library, Radio,
    ChevronDown, LogOut, Upload, MessageSquare, MapPin, Calendar, Activity,
    Eye, Cpu as Processor, Zap, Search, Palette, Type, Layout, Maximize2, Monitor,
    Camera, Video, Book, ChevronLeft, Star, Share2, Link, FileText
} from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { API_BASE_URL, getMediaUrl } from '../constants';

const SECTORS = [
    { id: 0, name: 'NEON SLUMS', color: 'var(--text-color)' },
    { id: 1, name: 'SILICON HEIGHTS', color: '#00ffff' },
    { id: 2, name: 'DATA VOID', color: '#9b5de5' },
    { id: 3, name: 'CENTRAL HUB', color: '#ffcc00' },
    { id: 4, name: 'OUTER RIM', color: '#00ff88' },
];

// --- TERMINAL STYLING UTILITIES ---
const hexToRgb = (hex) => {
    if (!hex || typeof hex !== 'string') return '255, 0, 110';
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 0, 110';
};

const isTruthy = (val) => val === true || val === 'true' || val === 1 || val === '1' || val === 'True';

const TerminalFrame = ({ title, children, className = "" }) => (
    <div className={`border border-[var(--text-color)]/30 bg-black/80 relative ${className}`}>
        <div className="absolute -top-3 left-4 px-2 bg-black text-[var(--text-color)] mono text-[10px] font-bold tracking-[0.2em] z-10">
            // {title.toUpperCase()}
        </div>
        <div className="p-4 pt-6">
            {children}
        </div>
    </div>
);

const CRTOverlay = () => (
    <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] animate-scanlines" />
    </div>
);

const DataStream = ({ visible = true }) => {
    if (!visible) return null;
    return (
    <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none mono text-[8px] leading-none text-[var(--text-color)] break-all select-none">
        {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="whitespace-nowrap animate-data-scroll" style={{ animationDelay: `${i * 0.15}s`, opacity: 1 - (i * 0.02) }}>
                {Math.random().toString(2).substring(2).repeat(10)}
            </div>
        ))}
    </div>
    );
};

const CyberDust = ({ count = 30 }) => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: count }).map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-[1px] h-[1px] bg-[var(--subsystem-accent)]/30"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    boxShadow: '0 0 5px var(--subsystem-accent)'
                }}
                animate={{
                    y: [0, -100, 0],
                    opacity: [0, 0.4, 0],
                    scale: [1, 2, 1]
                }}
                transition={{
                    duration: 10 + Math.random() * 20,
                    repeat: Infinity,
                    ease: "linear",
                    delay: Math.random() * 10
                }}
            />
        ))}
    </div>
);

const SignalWaveform = ({ isLive, isProfilePlaying, color }) => {
    // Number of points to render
    const points = Array.from({ length: 40 });
    const accent = color || 'var(--subsystem-accent)';
    
    return (
        <div className="w-full h-24 relative flex items-center justify-center overflow-hidden bg-black/40 border-y border-white/5">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                 <div className="w-full h-[0.5px]" style={{ background: accent }} />
            </div>
            {isLive || isProfilePlaying ? (
                <div className="relative w-full h-full flex items-center justify-around px-8">
                    {points.map((_, i) => (
                        <div key={i} className="relative h-full flex flex-col justify-center">
                            <motion.div
                                className="w-[1.5px] rounded-full"
                                style={{ background: accent }}
                                animate={{ 
                                    height: [2, Math.random() * (isLive ? 60 : 40), 2],
                                    opacity: [0.3, 1, 0.3],
                                }}
                                transition={{ 
                                    duration: 0.5 + Math.random() * 0.5, 
                                    repeat: Infinity,
                                    delay: i * 0.02
                                }}
                            />
                        </div>
                    ))}
                    <div className="absolute top-2 left-4 text-[7px] mono font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>SIGNAL_ACTIVE // {isLive ? 'BROADCASTING' : 'AUDIO_SYNC'}</div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 opacity-20">
                    <div className="text-[7px] mono font-bold tracking-[0.3em]" style={{ color: accent }}>SIGNAL_IDLE</div>
                    <div className="w-32 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
                </div>
            )}
        </div>
    );
};

// --- HUD PROFILE COMPONENTS ---

const LBrackets = ({ className = "" }) => (
    <>
        <div className={`console-bracket console-bracket-tl ${className}`} />
        <div className={`console-bracket console-bracket-tr ${className}`} />
        <div className={`console-bracket console-bracket-bl ${className}`} />
        <div className={`console-bracket console-bracket-br ${className}`} />
    </>
);

const GearRack = ({ gears, onAddGear, onRemoveGear, isMe, input, setInput, isSaving }) => (
    <div className="gear-rack">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/5">
            <Cpu size={10} className="text-[var(--subsystem-accent)]/60" />
            <span className="text-[8px] font-black tracking-widest uppercase">HARDWARE_RACK</span>
        </div>
        <div className="gear-list custom-scrollbar">
            {gears.length > 0 ? gears.map((item, idx) => (
                <div key={idx} className="gear-item group/gear">
                    <span>{item.name || item.Name || item}</span>
                    {isMe && (
                        <button 
                            onClick={() => onRemoveGear(idx)}
                            className="opacity-0 group-hover/gear:opacity-100 text-red-500/40 hover:text-red-500 transition-opacity"
                        >
                            <X size={8} />
                        </button>
                    )}
                </div>
            )) : (
                <div className="text-[7px] mono text-white/10 p-4 text-center mt-4">NO_GEAR_DETECTED // RACK_EMPTY</div>
            )}
        </div>
        {isMe && (
            <input 
                type="text"
                placeholder="REGISTER_GEAR_SIGNAL..."
                className="register-gear-input"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && onAddGear()}
                disabled={isSaving}
            />
        )}
    </div>
);

const SubsystemBlock = ({ title, icon: Icon, children, className = "", expand, onToggleExpand, address = "A1-D4", showBrackets = false }) => (
    <div className={`subsystem-block group/widget ${className}`} data-addr={address}>
        {showBrackets && <LBrackets className="scale-75 opacity-20" />}
        <div className="subsystem-header">
            <div className="flex items-center gap-2">
                <div className="subsystem-status" />
                <span className="subsystem-title">{title}</span>
                {Icon && <Icon size={10} className="text-[var(--subsystem-accent)]/40" />}
            </div>
            {onToggleExpand && (
                <button onClick={onToggleExpand} className="text-[var(--subsystem-accent)]/40 hover:text-[var(--subsystem-accent)] transition-colors">
                    <ChevronDown size={12} className={`transition-transform duration-300 ${expand ? 'rotate-180' : ''}`} />
                </button>
            )}
        </div>
        <div className="subsystem-content">
            {children}
        </div>
    </div>
);

const ProfileIdentityHeader = ({
    displayUser, isMe, isFollowing, localStatus, isSavingStatus,
    setLocalStatus, handleInlineStatusUpdate, handleFollow,
    onModifyId, onGoLive, onUpload, onLogout, onExitProfile,
    onMessageClick, communityName, communityColor, stationData,
    panelsVisible, onTogglePanels,
    isProfileTrackMuted, onToggleProfileMusic, hasFeaturedTrack
}) => {
    const pfp = displayUser?.profilePictureUrl || displayUser?.ProfilePictureUrl || displayUser?.profileImageUrl || displayUser?.ProfileImageUrl;
    const isLive = stationData?.isLive || stationData?.IsLive;
    
    return (
        <div className="subsystem-block flex flex-col relative" data-addr="USR_ID">
            {/* Top Tier: Identity & Primary Controls */}
            <div className="px-4 py-4 flex flex-col lg:flex-row items-center gap-4 lg:gap-8 border-b border-[var(--subsystem-accent)]/10">
                {/* Profile pic + name */}
                <div className="flex items-center gap-6 shrink-0 min-w-[280px]">
                    <div className="w-16 h-16 border border-[var(--subsystem-accent)] overflow-hidden bg-black p-0.5">
                        <div className="w-full h-full border border-[var(--subsystem-accent)]/30 relative group/pfp cursor-pointer">
                            {pfp ? (
                                <img src={getMediaUrl(pfp)} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--subsystem-accent)]/50"><Cpu size={24} /></div>
                            )}
                            <div className="absolute inset-0 bg-[var(--subsystem-accent)]/10 opacity-0 group-hover/pfp:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[7px] mono font-bold text-[var(--subsystem-accent)]">BIO_SCAN</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="text-[20px] font-black text-[var(--subsystem-accent)] uppercase tracking-[0.2em] leading-tight flex items-center gap-2">
                            {displayUser?.username || displayUser?.Username || 'GUEST_USER'}
                            <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)] ${isLive ? 'bg-red-500' : 'bg-green-500'}`} />
                        </div>
                        <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center gap-3">
                                <span className="text-[7px] mono text-[var(--subsystem-accent)]/40">SIGNAL_ID:</span>
                                <span className="text-[8px] mono text-white/60 tracking-widest">0x{displayUser?.id?.toString().slice(0, 8).toUpperCase() || 'NULL'}</span>
                            </div>
                            {communityName && (
                                <div className="flex items-center gap-3">
                                    <span className="text-[7px] mono text-[var(--subsystem-accent)]/40">RES_SECTOR:</span>
                                    <span className="text-[8px] mono font-black tracking-widest uppercase" style={{ color: communityColor || 'var(--subsystem-accent)' }}>
                                        {communityName}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <span className="text-[7px] mono text-[var(--subsystem-accent)]/40">BIO_SYNC:</span>
                                <span className="text-[8px] mono text-white/50 tracking-widest">{Math.floor(Math.random() * 40 + 60)}% (OPTIMAL)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status & Biography Integrated */}
                <div className="flex-1 min-w-0 w-full flex flex-col gap-3">
                    <div className="bg-black/60 border border-[var(--subsystem-accent)]/20 p-2 relative">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[6px] mono text-[var(--subsystem-accent)]/40 uppercase tracking-[0.2em]">FREQ_STATUS_SIGNAL</span>
                            <div className="h-px flex-1 bg-[var(--subsystem-accent)]/10" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] text-[var(--subsystem-accent)]/40 mono">&gt;</span>
                            {isMe ? (
                                <input
                                    type="text"
                                    value={localStatus}
                                    onChange={(e) => setLocalStatus(e.target.value)}
                                    onBlur={handleInlineStatusUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && handleInlineStatusUpdate()}
                                    placeholder="WAITING_FOR_SIGNALS..."
                                    className="w-full bg-transparent border-none outline-none text-[10px] text-[var(--subsystem-accent)] mono uppercase tracking-widest placeholder:text-[var(--subsystem-accent)]/20 p-0 m-0 focus:ring-0"
                                    disabled={isSavingStatus}
                                />
                            ) : (
                                <span className="text-[10px] text-[var(--subsystem-accent)]/80 mono uppercase tracking-widest truncate">
                                    {displayUser?.statusMessage || displayUser?.StatusMessage || 'NO_SIGNAL_BROADCAST'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-[9px] mono text-white/40 leading-relaxed max-h-[40px] overflow-hidden">
                        {displayUser?.biography || displayUser?.Biography || '// NO_BIOGRAPHIC_METADATA_LOADED'}
                    </div>
                </div>

                {/* Primary Action Stack */}
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                        {isMe ? (
                            <>
                                <button onClick={onModifyId} className="subsystem-command-btn py-1 px-3">
                                    [ MODIFY_ID ]
                                </button>
                                <button onClick={onGoLive} className={`subsystem-command-btn py-1 px-3 ${isLive ? 'border-red-500 text-red-500' : ''}`}>
                                    <Radio size={10} /> [ {isLive ? 'LIVE' : 'LIVE'} ]
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleFollow} className={`subsystem-command-btn py-1 px-3 ${isFollowing ? 'bg-[var(--subsystem-accent)]/10 text-[var(--subsystem-accent)] border-[var(--subsystem-accent)]' : ''}`}>
                                    [ {isFollowing ? 'SYNCED' : 'INITIALIZE_LINK'} ]
                                </button>
                                {onMessageClick && (
                                    <button onClick={onMessageClick} className="subsystem-command-btn py-1 px-3">
                                        <MessageSquare size={10} /> [ COMMS ]
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <button onClick={onTogglePanels} className="subsystem-command-btn py-1 px-3 text-[var(--subsystem-accent)]/40 hover:text-[var(--subsystem-accent)]">
                            {panelsVisible ? '[ COLLAPSE_SUBSYSTEMS ]' : '[ SHOW_SUBSYSTEMS ]'}
                        </button>
                        {isMe && onLogout ? (
                            <button onClick={onLogout} className="subsystem-command-btn py-1 px-3 border-red-900/40 text-red-700/60 hover:text-red-500">
                                <LogOut size={10} /> [ LOGOUT ]
                            </button>
                        ) : (
                            onExitProfile && (
                                <button onClick={onExitProfile} className="subsystem-command-btn py-1 px-3 text-white/40">
                                    [ EXIT ]
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Middle Tier: Waveform */}
            <div className="relative">
                <SignalWaveform isLive={isLive} isProfilePlaying={!isProfileTrackMuted} />
                {hasFeaturedTrack && !isLive && (
                    <div className="absolute inset-0 pr-4 flex items-center justify-end pointer-events-none">
                        <button 
                            onClick={onToggleProfileMusic} 
                            className="pointer-events-auto subsystem-command-btn py-0.5 px-2 bg-black/80 flex items-center gap-2 group/mute"
                        >
                            {isProfileTrackMuted ? <VolumeX size={10} className="text-[var(--subsystem-accent)]/40 group-hover/mute:text-[var(--subsystem-accent)]" /> : <Volume2 size={10} className="text-[var(--subsystem-accent)] animate-pulse" />}
                            <span className="text-[7px]">{isProfileTrackMuted ? '[ LISTEN_PROFILE_SIGNAL ]' : '[ SIGNAL_ACTIVE ]'}</span>
                        </button>
                    </div>
                )}
            </div>
            
            {/* Bottom Tier Decor */}
            <div className="h-1 bg-gradient-to-r from-transparent via-[var(--subsystem-accent)]/5 to-transparent flex items-center justify-center">
                 <div className="w-1/4 h-px bg-[var(--subsystem-accent)]/20" />
            </div>
        </div>
    );
};

const AudioSignalsWidget = ({ tracks, isExpanded, onToggleExpand, onPlayTrack, isMe, onUpload }) => {
    const [subTab, setSubTab] = useState('All');

    const allItems = [
        ...tracks.map(t => ({ ...t, _type: 'track' }))
    ];

    const filtered = subTab === 'All' ? allItems :
        subTab === 'albums' ? [] :
        allItems.filter(i => i._type === 'track');

    return (
        <SubsystemBlock title="AUDIO_REGISTRY" icon={Music} expand={isExpanded} onToggleExpand={onToggleExpand} address="FRQ-01">
            <AnimatePresence mode="wait">
                {!isExpanded ? (
                    <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1 max-h-[280px] overflow-y-auto no-scrollbar">
                        {allItems.length > 0 ? allItems.slice(0, 8).map((item, i) => (
                            <div
                                key={`${item._type}-${item.id || i}`}
                                className="flex items-center gap-3 py-1.5 px-2 bg-black/40 border border-white/5 hover:border-[var(--subsystem-accent)]/30 cursor-pointer group transition-all"
                                onClick={() => item._type === 'track' ? onPlayTrack?.(item) : onPlayPlaylist?.(item)}
                            >
                                <div className="text-[var(--subsystem-accent)]/20 group-hover:text-[var(--subsystem-accent)] transition-colors mono text-[8px]">[{i.toString(16).toUpperCase().padStart(2, '0')}]</div>
                                <span className="text-[10px] mono text-white/70 uppercase tracking-widest truncate flex-1 group-hover:text-[var(--subsystem-accent)] transition-colors">
                                    {item.title || item.Title || item.name || item.Name}
                                </span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-12 h-1 bg-[var(--subsystem-accent)]/10 relative overflow-hidden">
                                        <motion.div 
                                            initial={{ x: '-100%' }}
                                            animate={{ x: '100%' }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 bg-[var(--subsystem-accent)]/40" 
                                        />
                                    </div>
                                    <Play size={10} className="text-[var(--subsystem-accent)]" />
                                </div>
                            </div>
                        )) : (
                            <div className="text-[8px] mono text-[var(--subsystem-accent)]/20 uppercase py-2 italic text-center">// NO_SIGNALS_DETECTED</div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {/* Sub-tabs */}
                        <div className="flex gap-1 mb-3">
                            {['All', 'albums', 'singles/eps'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setSubTab(tab)}
                                    className={`px-3 py-1 text-[8px] font-bold uppercase tracking-widest border transition-all ${subTab === tab ? 'border-[var(--subsystem-accent)]/60 bg-[var(--subsystem-accent)]/10 text-[var(--subsystem-accent)]' : 'border-white/5 text-white/20 hover:text-white/40'}`}
                                >
                                    [{tab.toUpperCase()}]
                                </button>
                            ))}
                        </div>
                        {isMe && (
                            <button onClick={onUpload} className="w-full mb-3 py-1.5 border border-dashed border-[var(--subsystem-accent)]/20 text-[8px] mono text-[var(--subsystem-accent)]/50 uppercase tracking-[0.3em] hover:border-[var(--subsystem-accent)]/40 hover:text-[var(--subsystem-accent)] transition-all flex items-center justify-center gap-2">
                                <Plus size={10} /> [ INJECT_SIGNAL ]
                            </button>
                        )}
                        <div className="space-y-1 max-h-[400px] overflow-y-auto no-scrollbar">
                            {filtered.length > 0 ? filtered.map((item, i) => (
                                <div
                                    key={`${item._type}-${item.id || i}`}
                                    className="flex items-center gap-3 py-2 px-2 bg-black/20 border border-white/5 hover:border-[var(--subsystem-accent)]/40 cursor-pointer group transition-all"
                                    onClick={() => item._type === 'track' ? onPlayTrack?.(item) : onPlayPlaylist?.(item)}
                                >
                                    <div className="w-8 h-8 border border-[var(--subsystem-accent)]/20 bg-black p-0.5 shrink-0">
                                        {(item.cover || item.coverImageUrl || item.CoverImageUrl || item.imageUrl || item.ImageUrl) ? (
                                            <img src={getMediaUrl(item.cover || item.coverImageUrl || item.CoverImageUrl || item.imageUrl || item.ImageUrl)} className="w-full h-full object-cover subsystem-media-filter" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[var(--subsystem-accent)]/20">
                                                {item._type === 'playlist' ? <Database size={12} /> : <Music size={12} />}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] mono text-white/80 uppercase tracking-widest truncate group-hover:text-[var(--subsystem-accent)] transition-colors">
                                            {item.title || item.Title || item.name || item.Name}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[6px] mono text-[var(--subsystem-accent)]/40 uppercase tracking-widest">
                                                {item._type === 'playlist' ? 'CLUSTER' : 'SIGNAL'} // {item.playCount || 0} SCANS
                                            </span>
                                            <div className="h-0.5 flex-1 bg-[var(--subsystem-accent)]/5" />
                                            <span className="text-[6px] mono text-[var(--subsystem-accent)]/30 uppercase">UPLINK_OK</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Play size={12} className="text-[var(--subsystem-accent)]/0 group-hover:text-[var(--subsystem-accent)] transition-all" />
                                    </div>
                                </div>
                            )) : (
                                <div className="text-[8px] mono text-[var(--subsystem-accent)]/20 uppercase py-6 text-center italic">// SECTOR_CLEAN</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </SubsystemBlock>
    );
};

const DisplayWallGrid = ({ tracks, gallery, journal, playlists, uid, onExpand, onPlayTrack, onPlayPlaylist }) => {
    const items = [];

    // Tracks
    if (Array.isArray(tracks)) {
        tracks.filter(t => {
            const tUserId = t.artistUserId || t.ArtistUserId || t.album?.artist?.userId || t.Album?.Artist?.UserId;
            return String(tUserId) === String(uid);
        }).forEach(t => {
            if (isTruthy(t.IsPosted || t.isPosted)) {
                const cover = t.cover || t.coverImage || t.CoverImage || t.imageUrl || t.ImageUrl || t.coverImageUrl || t.CoverImageUrl;
                items.push({ id: t.id || t.Id, type: 'TRACK', title: t.title || t.Title, url: cover, original: t });
            }
        });
    }

    // Playlists
    if (Array.isArray(playlists)) {
        playlists.forEach(p => {
            if (isTruthy(p.IsPosted || p.isPosted)) {
                items.push({ id: p.id || p.Id, type: 'PLAYLIST', title: p.name || p.Name, url: p.imageUrl || p.ImageUrl, original: p });
            }
        });
    }

    // Gallery
    if (Array.isArray(gallery)) {
        gallery.filter(c => String(c.UserId || c.userId) === String(uid)).forEach(c => {
            if (isTruthy(c.IsPosted || c.isPosted)) {
                const type = (c.type || c.Type || '').toUpperCase();
                const isVideo = type === 'VIDEO';
                const thumb = c.thumbnailUrl || c.ThumbnailUrl || c.coverImageUrl || c.CoverImageUrl || (isVideo ? null : (c.url || c.Url));
                items.push({ id: c.id || c.Id, type, title: c.title || c.Title, url: thumb, original: c });
            }
        });
    }

    // Journal
    if (Array.isArray(journal)) {
        journal.filter(j => String(j.UserId || j.userId) === String(uid)).forEach(j => {
            if (isTruthy(j.IsPosted || j.isPosted)) {
                items.push({ id: j.id || j.Id, type: 'JOURNAL', title: j.title || j.Title, url: null, original: j });
            }
        });
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center opacity-20 border border-dashed border-[var(--subsystem-accent)]/20">
                <Globe size={32} className="mb-4 text-[var(--subsystem-accent)]" />
                <span className="mono text-[10px] uppercase tracking-[0.4em]">MATRIX_DEVOID_OF_SIGNAL</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item, i) => (
                <div
                    key={`${item.type}_${item.id}_${i}`}
                    className="aspect-square subsystem-grid-item cursor-pointer group"
                    onClick={() => onExpand({ ...item.original, type: item.type }, item.type)}
                >
                    <div className="subsystem-media-info">
                        <span className="subsystem-tag">UID:{item.id.toString().slice(-4)}</span>
                        <span className="subsystem-tag">TYP:{item.type}</span>
                    </div>

                    {item.url && (item.url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) || !item.url.toLowerCase().match(/\.(mp4|webm|avi)$/)) ? (
                        <img src={getMediaUrl(item.url)} alt="" className="w-full h-full object-cover subsystem-media-filter group-hover:scale-105 transition-all duration-700" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/80">
                            {item.type === 'VIDEO' ? <Video size={32} strokeWidth={1} className="text-[var(--subsystem-accent)]/40 group-hover:text-[var(--subsystem-accent)]" /> : <Music size={32} className="text-[var(--subsystem-accent)]/20 group-hover:text-[var(--subsystem-accent)]" />}
                        </div>
                    )}

                    {/* Play overlay for tracks/playlists */}
                    {(item.type === 'TRACK' || item.type === 'PLAYLIST') && (
                        <button
                            className="absolute inset-0 bg-[var(--subsystem-accent)]/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (item.type === 'TRACK') onPlayTrack(item.original);
                                else if (item.type === 'PLAYLIST') onPlayPlaylist(item.original.tracks || [], 0);
                            }}
                        >
                            <div className="w-12 h-12 border border-[var(--subsystem-accent)] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                <Play size={20} className="text-[var(--subsystem-accent)]" fill="currentColor" />
                            </div>
                        </button>
                    )}

                    {/* Label */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 border-t border-[var(--subsystem-accent)]/20 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform">
                        <div className="text-[7px] mono text-[var(--subsystem-accent)] uppercase tracking-widest truncate">
                            {String(item.title || 'UNTITLED').toUpperCase().replace(/\s+/g, '_')}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const SequenceMapWidget = ({ playlists, onPlay, isMe, onNew, expand, onToggleExpand }) => (
    <SubsystemBlock title="SEQUENCE_MAPS" icon={Database} expand={expand} onToggleExpand={onToggleExpand} address="MEM-09">
        <div className="space-y-1">
            {isMe && (
                <button onClick={onNew} className="w-full py-2 mb-3 border border-dashed border-[var(--subsystem-accent)]/20 text-[var(--subsystem-accent)]/40 hover:text-[var(--subsystem-accent)] hover:border-[var(--subsystem-accent)]/40 transition-all text-[8px] mono uppercase tracking-[.3em]">
                    + INITIALIZE_SEQUENCE
                </button>
            )}
            {playlists.length > 0 ? playlists.map((p, idx) => (
                <div 
                    key={p.id || idx} 
                    className="group border border-white/5 bg-black/40 p-2 hover:border-[var(--subsystem-accent)]/30 transition-all cursor-pointer flex items-center gap-3"
                    onClick={() => onPlay(p)}
                >
                    <div className="w-10 h-10 bg-black border border-[var(--subsystem-accent)]/20 overflow-hidden shrink-0">
                        {p.imageUrl || p.ImageUrl ? (
                            <img src={getMediaUrl(p.imageUrl || p.ImageUrl)} className="w-full h-full object-cover subsystem-media-filter" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10"><Music size={16} /></div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black text-white/80 uppercase tracking-widest truncate group-hover:text-[var(--subsystem-accent)] transition-colors">
                            {p.name || p.Name || 'UNTITLED_MAP'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-0.5 w-8 bg-[var(--subsystem-accent)]/20" />
                            <div className="text-[6px] mono text-white/30 uppercase tracking-widest">
                                {(p.tracks || p.Tracks || []).length} SIGNALS // SECTOR_LOADED
                            </div>
                        </div>
                    </div>
                    <Play size={12} className="text-white/10 group-hover:text-[var(--subsystem-accent)] transition-colors" />
                </div>
            )) : (
                <div className="text-[8px] mono text-white/20 italic p-4 text-center border border-white/5 bg-black/20">// NO_SEQUENCES_MOUNTED</div>
            )}
        </div>
    </SubsystemBlock>
);

const EntityMetadataWidget = ({ user, sectorName, sectorColor, expand, onToggleExpand }) => (
    <SubsystemBlock title="ENTITY_METADATA" icon={Cpu} expand={expand} onToggleExpand={onToggleExpand} address="BIO-02">
        <div className="space-y-4">
            <div className="p-3 border border-[var(--subsystem-accent)]/10 bg-black/60 relative">
                 <div className="absolute top-0 right-0 p-1">
                    <Database size={8} className="text-[var(--subsystem-accent)]/20" />
                 </div>
                <div className="text-[7px] mono text-[var(--subsystem-accent)]/40 uppercase tracking-[0.2em] mb-2">// BIOGRAPHY_BUFFER</div>
                <div className="text-[10px] text-white/80 leading-relaxed font-medium mono">
                    {user?.biography || user?.Biography || 'SIGNAL_DEVOID_OF_METADATA_BLOCK'}
                </div>
                <div className="mt-3 overflow-hidden h-px bg-gradient-to-r from-[var(--subsystem-accent)]/20 via-transparent to-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <StatItem label="BIO_SYNC" value={`${Math.floor(Math.random() * 100)}%`} />
                <StatItem label="SIGNAL_ID" value={user?.id?.toString().slice(0, 8).toUpperCase() || 'NULL'} />
            </div>
            {sectorName && (
                <div className="flex items-center gap-3 p-3 border border-[var(--subsystem-accent)]/20 bg-black/40">
                    <div className="p-1 border border-current" style={{ color: sectorColor }}>
                        <MapPin size={10} />
                    </div>
                    <div className="flex-1">
                        <div className="text-[6px] mono text-white/20">RESIDENT_SECTOR</div>
                        <div className="text-[10px] mono uppercase tracking-widest font-black" style={{ color: sectorColor }}>
                            {sectorName}
                        </div>
                    </div>
                </div>
            )}
        </div>
    </SubsystemBlock>
);

const JournalWidget = ({ entries, onExpand, isMe, onNew, expand, onToggleExpand }) => (
    <SubsystemBlock title="FREQ_JOURNAL" icon={Book} expand={expand} onToggleExpand={onToggleExpand} address="LOG-12">
        <div className="space-y-1">
            {isMe && (
                <button onClick={onNew} className="w-full py-2 mb-3 border border-dashed border-[var(--subsystem-accent)]/20 text-[var(--subsystem-accent)]/40 hover:text-[var(--subsystem-accent)] hover:border-[var(--subsystem-accent)]/40 transition-all text-[8px] mono uppercase tracking-[.3em]">
                    + APPEND_LOG_ENTRY
                </button>
            )}
            {entries.length > 0 ? entries.map((entry, idx) => (
                <div 
                    key={entry.id || idx} 
                    onClick={() => onExpand({ ...entry, type: 'JOURNAL' }, 'JOURNAL')}
                    className="group flex flex-col p-2.5 border border-white/5 hover:border-[var(--subsystem-accent)]/30 bg-black/20 cursor-pointer transition-all"
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-white/80 uppercase group-hover:text-[var(--subsystem-accent)] transition-colors truncate mono">
                            {entry.title || entry.Title || 'UNTITLED_LOG'}
                        </span>
                        <span className="text-[7px] mono text-[var(--subsystem-accent)]/20">
                            ID:0x{idx.toString(16).padStart(2, '0')}
                        </span>
                    </div>
                    <div className="text-[6px] mono text-white/20 uppercase tracking-widest flex justify-between">
                        <span>TIMESTAMP: {new Date(entry.createdAt || entry.CreatedAt).toLocaleDateString()}</span>
                        <span>[READ_ONLY]</span>
                    </div>
                </div>
            )) : (
                <div className="text-[8px] mono text-white/20 italic p-4 text-center border border-white/5 bg-black/20">// NO_LOGS_FOUND_IN_SECTOR</div>
            )}
        </div>
    </SubsystemBlock>
);

const VisualArchiveWidget = ({ gallery, onExpand, isMe, onIngest, expand, onToggleExpand }) => (
    <SubsystemBlock title="VISUAL_BUFFER" icon={Camera} expand={expand} onToggleExpand={onToggleExpand} address="IMG-44">
        <div className="grid grid-cols-2 gap-2">
            {(gallery || []).slice(0, 7).map((item, i) => (
                <div 
                    key={item.id || i}
                    onClick={() => onExpand(item, item.type || item.Type || 'PHOTO')}
                    className="subsystem-grid-item aspect-square cursor-pointer"
                >
                    <img src={getMediaUrl(item.url || item.Url)} className="w-full h-full object-cover subsystem-media-filter group-hover:scale-110 transition-all duration-700" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--subsystem-accent)]/10">
                        <div className="p-2 border border-[var(--subsystem-accent)] bg-black/40">
                            <Maximize2 size={12} className="text-[var(--subsystem-accent)]" />
                        </div>
                    </div>
                    <div className="absolute top-1 left-1">
                        <span className="subsystem-tag">0x{i.toString(16).toUpperCase()}</span>
                    </div>
                </div>
            ))}
            {isMe && (
                <button onClick={onIngest} className="aspect-square border border-dashed border-[var(--subsystem-accent)]/20 flex flex-col items-center justify-center gap-2 hover:border-[var(--subsystem-accent)]/40 hover:bg-[var(--subsystem-accent)]/5 transition-all group">
                    <Plus size={16} className="text-[var(--subsystem-accent)]/20 group-hover:text-[var(--subsystem-accent)]" />
                    <span className="text-[7px] mono text-[var(--subsystem-accent)]/10 group-hover:text-[var(--subsystem-accent)] uppercase tracking-[0.2em]">INGEST_DATA</span>
                </button>
            )}
        </div>
    </SubsystemBlock>
);

const GearRackWidget = ({ gear, isMe, onAdd, onDelete, expand, onToggleExpand }) => (
    <SubsystemBlock title="HARDWARE_RACK" icon={Zap} expand={expand} onToggleExpand={onToggleExpand} address="HW-99">
        <div className="space-y-1">
            {isMe && (
                <button onClick={onAdd} className="w-full py-2 mb-3 border border-dashed border-[var(--subsystem-accent)]/20 text-[var(--subsystem-accent)]/40 hover:text-[var(--subsystem-accent)] hover:border-[var(--subsystem-accent)]/40 transition-all text-[8px] mono uppercase tracking-[.3em]">
                    + REGISTER_NEW_HW
                </button>
            )}
            {(gear || []).length > 0 ? (gear || []).map((item, idx) => (
                <div key={idx} className="p-3 border border-white/5 bg-black/20 flex gap-3 items-center group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-[var(--subsystem-accent)]/10 to-transparent" />
                    <div className="w-9 h-9 border border-[var(--subsystem-accent)]/20 flex items-center justify-center text-[var(--subsystem-accent)]/40 group-hover:text-[var(--subsystem-accent)] transition-all bg-black">
                        <Processor size={16} />
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] font-black text-white/70 uppercase tracking-widest">{item.name}</div>
                        <div className="text-[6px] mono text-[var(--subsystem-accent)]/60 uppercase flex items-center gap-2">
                            <span className="p-0.5 border border-current">{item.category}</span>
                            <span>READY</span>
                        </div>
                    </div>
                    {isMe && (
                        <button onClick={() => onDelete(item.id || item.Id)} className="text-white/10 hover:text-red-500 transition-colors z-10">
                            <X size={12} />
                        </button>
                    )}
                </div>
            )) : (
                <div className="text-[8px] mono text-white/20 italic p-4 text-center border border-white/5 bg-black/20">// NO_HW_DETECTED_IN_RACK</div>
            )}
        </div>
    </SubsystemBlock>
);

// --- VISTA: PERFIL ---
export const ProfileView = React.memo(({
    user: currentUser, tracks: allTracks, onLogout, onAddCredits, onRefreshProfile, onRefreshTracks,
    targetUserId,
    navigateToProfile,
    onPlayPlaylist,
    onPlayTrack,
    currentTrack,
    onQueueTrack,
    playlists: currentUserPlaylists = [], // Prop from App (current user's playlists)
    initialModal,
    onClearInitialModal,
    activeStation,
    stationChat,
    stationQueue,
    isPlaying,
    onExitProfile,
    onMessageUser,
    setActiveStation,
    setUser, // ADDED
    setShowGlobalGoLive,
    setShowGlobalUpload,
    setShowGlobalIngest,
    onExpandContent,
    onRefreshPlaylists,
    onLike,
    onThemeChange,
    hasMiniPlayer
}) => {
    const { showNotification } = useNotification();
    
    // 1. ALL STATES
    const [profileData, setProfileData] = useState(null);
    const [activeTab, setActiveTab] = useState('Music');
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [profileTracks, setProfileTracks] = useState([]);
    const [isLoadingTracks, setIsLoadingTracks] = useState(false);
    const [profileJournal, setProfileJournal] = useState([]);
    const [isLoadingJournal, setIsLoadingJournal] = useState(false);
    const [profileGallery, setProfileGallery] = useState([]);
    const [isLoadingGallery, setIsLoadingGallery] = useState(false);
    const [myLikes, setMyLikes] = useState([]);
    const [isAboutOpen, setIsAboutOpen] = useState(true);
    const [isStatsOpen, setIsStatsOpen] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [broadcasterTab, setBroadcasterTab] = useState('requests');
    const [leftOpen, setLeftOpen] = useState(false);
    const [rightOpen, setRightOpen] = useState(false);
    const [roomMode, setRoomMode] = useState('room');
    const [isProfileTrackMuted, setIsProfileTrackMuted] = useState(true);
    const [savedPlaybackState, setSavedPlaybackState] = useState(null);
    const [mobileView, setMobileView] = useState('WALL'); 
    const [panelsVisible, setPanelsVisible] = useState(false);
    const [widgetsExpanded, setWidgetsExpanded] = useState({
        audio: true,
        sequences: true,
        journal: true,
        metadata: true,
        archive: true,
        gear: true
    });
    const [showIngestMenu, setShowIngestMenu] = useState(false);
    const [selectedContent, setSelectedContent] = useState(null);
    const [expandedEntries, setExpandedEntries] = useState({});
    const [showJournalForm, setShowJournalForm] = useState(false);
    const [stationData, setStationData] = useState(null);
    const [isStationFavorited, setIsStationFavorited] = useState(false);
    const [localStatus, setLocalStatus] = useState('');
    const [isSavingStatus, setIsSavingStatus] = useState(false);
    
    const [viewMode, setViewMode] = useState('CONSOLE'); // 'CONSOLE' or 'DASHBOARD'
    const [cycleIndex, setCycleIndex] = useState(0); // 0: PFP, 1: Tracks, 2: Activity, 3: Social
    const [musicFilter, setMusicFilter] = useState('ALL'); // 'ALL', 'ALBUMS', 'SINGLES'
    
    // RESTORED GEAR/STUDIO STATES
    const [profileGear, setProfileGear] = useState([]);
    const [isLoadingGear, setIsLoadingGear] = useState(false);
    const [gearInput, setGearInput] = useState('');
    const [isSavingGear, setIsSavingGear] = useState(false);
    const [studioSubTab, setStudioSubTab] = useState('All');
    const [selectedRelease, setSelectedRelease] = useState(null);

    // 2. DERIVED VARIABLES
    const effectiveId = targetUserId || currentUser?.id || currentUser?.Id;
    const isMe = String(effectiveId) === String(currentUser?.id || currentUser?.Id);
    const displayUser = isMe ? currentUser : profileData;
    const profileAccent = displayUser?.previewThemeColor || displayUser?.themeColor || displayUser?.ThemeColor || displayUser?.profileColor || displayUser?.ProfileColor || '#ff3131';

    const sector = SECTORS.find(s => s.id === (displayUser?.residentSectorId || displayUser?.ResidentSectorId || 0));
    const communityName = (displayUser?.communityName || displayUser?.CommunityName) || (displayUser?.communityId || displayUser?.CommunityId ? 'SYNCING...' : 'N/A');
    const communityColor = (displayUser?.communityColor || displayUser?.CommunityColor) || sector?.color;

    // 3. EFFECTS & LOGIC
    const toggleWidget = (key) => setWidgetsExpanded(prev => ({ ...prev, [key]: !prev[key] }));

    useEffect(() => {
        if (onThemeChange) {
            onThemeChange(profileAccent);
        }
    }, [profileAccent, onThemeChange]);

    const hasFeaturedTrack = !!(displayUser?.featuredTrackId || displayUser?.FeaturedTrackId);

    const toggleProfileMusic = () => {
        if (isProfileTrackMuted) {
            setSavedPlaybackState({
                track: currentTrack,
                playing: isPlaying
            });
            const fId = String(displayUser?.featuredTrackId || displayUser?.FeaturedTrackId);
            const profileTrack = profileTracks.find(t => String(t.id || t.Id) === fId);
            if (profileTrack) {
                onPlayTrack(profileTrack);
            }
            setIsProfileTrackMuted(false);
        } else {
            if (savedPlaybackState?.track) {
                onPlayTrack(savedPlaybackState.track);
            }
            setIsProfileTrackMuted(true);
        }
    };

    useEffect(() => {
        if (isMe && currentUser) {
            setProfileData(currentUser);
        }
    }, [currentUser, isMe]);

    useEffect(() => {
        setLocalStatus(displayUser?.statusMessage || displayUser?.StatusMessage || '');
    }, [displayUser?.statusMessage, displayUser?.StatusMessage]);

    // Auto-switch to Broadcast tab if live
    useEffect(() => {
        if (isMe && stationData && (stationData.isLive || stationData.IsLive) && activeTab === 'Music') {
            setActiveTab('Broadcast');
            setRoomMode('monitor');
        }
    }, [stationData, isMe]);


    const handleToggleStationFavorite = async () => {
        if (!stationData) return;
        try {
            const API = await import('../services/api').then(mod => mod.default);
            const res = await API.Stations.toggleFavorite(stationData.id || stationData.Id);
            setIsStationFavorited(res.data.favorited || res.data.Favorited);
            showNotification(res.data.favorited ? "STATION_SYNCED" : "STATION_DISCONNECTED",
                `Frequency ${stationData.frequency || stationData.Frequency || 'LINK'} ${res.data.favorited ? 'added to' : 'removed from'} favorites.`, "success");
        } catch (e) {
            console.error("Failed to toggle station favorite", e);
        }
    };

    const handleGoLive = async (sessionTitle, description) => {
        const title = sessionTitle;
        const desc = description;
        if (!title) {
            showNotification("BROADCAST_ERROR", "A session title is required to go live.", "error");
            return;
        }
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Stations.goLive({
                SessionTitle: title,
                Description: desc || null,
                IsChatEnabled: true,
                IsQueueEnabled: true
            });
            showNotification("BROADCAST_ACTIVE", "Signal established. Frequency is now LIVE.", "success");
            setShowGlobalGoLive(false);
            if (onRefreshProfile) onRefreshProfile();
            // Refresh local station data
            const sRes = await API.Stations.getByUserId(currentUser?.id || currentUser?.Id);
            setStationData(sRes.data);
            if (setActiveStation) setActiveStation(sRes.data);
            setActiveTab('Broadcast');
            if (setRoomMode) setRoomMode('monitor');
        } catch (e) {
            console.error("Failed to go live", e);
            showNotification("BROADCAST_FAILURE", "Neural interface failed to establish link.", "error");
        }
    };

    const handleEndLive = async () => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Stations.endLive();
            showNotification("BROADCAST_TERMINATED", "Neural link closed. Station is offline.", "success");
            if (onRefreshProfile) onRefreshProfile();
            // Refresh local station data
            const sRes = await API.Stations.getByUserId(currentUser?.id || currentUser?.Id);
            setStationData(sRes.data);
            if (setActiveStation) setActiveStation(null);
            setActiveTab('Music');
        } catch (e) {
            console.error("Failed to end live", e);
        }
    };

    const toggleExpandEntry = (id) => {
        setExpandedEntries(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleSaveStatus = async () => {
        if (!isMe) return;
        setIsSavingStatus(true);
        try {
            const API = await import('../services/api').then(mod => mod.default);
            const fd = new FormData();
            fd.append('StatusMessage', localStatus);
            const uid = currentUser?.id || currentUser?.Id || currentUser?.userId || currentUser?.UserId;
            await API.Users.updateProfile(fd, uid);
            showNotification("STATUS_UPDATED", "Uplink message synchronized.", "success");
            if (onRefreshProfile) onRefreshProfile();
        } catch (e) {
            console.error("Failed to update status", e);
            showNotification("SYNC_ERROR", "Failed to commit status change.", "error");
        } finally {
            setIsSavingStatus(false);
        }
    };

    const handleIngestFile = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (type === 'CORE_LOG') {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const content = event.target.result;
                const title = file.name.split('.')[0];
                setStudioSubTab('Journal');
                setShowJournalForm(true);
                setTimeout(() => {
                    const titleInput = document.getElementById('journal-title');
                    const contentInput = document.getElementById('journal-content');
                    if (titleInput && contentInput) {
                        titleInput.value = title;
                        contentInput.value = content;
                    }
                    setShowIngestMenu(false);
                }, 100);
            };
            reader.readAsText(file);
        } else if (type === 'VISUAL_DATA' || type === 'SIGNAL_FEED') {
            const contentType = type === 'VISUAL_DATA' ? 'PHOTO' : 'VIDEO';
            const formData = new FormData();
            formData.append('File', file);
            formData.append('Type', contentType);
            formData.append('Title', file.name.split('.')[0]);
            formData.append('IsPosted', true);

            try {
                console.log(`[STUDIO_INGEST] Starting ${contentType} upload:`, file.name);
                const API = await import('../services/api').then(mod => mod.default);

                await API.Studio.upload(formData);
                console.log(`[STUDIO_INGEST] Upload successful. Refreshing gallery...`);

                const res = await API.Studio.getMyGallery();
                setProfileGallery(res.data || []);
                setStudioSubTab(contentType === 'PHOTO' ? 'Photos' : 'Video');
                setShowIngestMenu(false);

                showNotification("INGEST_COMPLETE", `${contentType} [${file.name.split('.')[0]}] ingested into core archive.`, "success");
            } catch (err) {
                console.error("Failed to ingest media", err);
                showNotification("INGEST_FAILURE", `Failed to ingest ${contentType}. Check console for signal diagnostics.`, "error");
            }
        }
    };

    // Playlist State (Renamed to profilePlaylists to avoid shadowed prop)
    const [profilePlaylists, setProfilePlaylists] = useState([]);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isPlaylistPublic, setIsPlaylistPublic] = useState(true);

    // Selected Playlist State (for wall popup â€” keeps existing wall behavior)
    const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
    const [playlistDetails, setPlaylistDetails] = useState(null); // { Playlist, Tracks }
    const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

    // In-Monitor Playlist Detail State (replaces popup for monitor tab)
    const [monitorPlaylistId, setMonitorPlaylistId] = useState(null);
    const [monitorPlaylistDetails, setMonitorPlaylistDetails] = useState(null);
    const [isLoadingMonitorPlaylist, setIsLoadingMonitorPlaylist] = useState(false);



    // Fetch Playlists â€” always on mount/profile change so SEQ_MAPS stat is accurate
    const fetchPlaylists = React.useCallback(async () => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            const targetId = isMe ? (currentUser?.id || currentUser?.Id) : targetUserId;
            if (targetId) {
                const res = await API.Playlists.getUserPlaylists(targetId);
                const normalized = (res.data || []).map(p => ({
                    ...p,
                    id: p.id || p.Id,
                    name: p.name || p.Name,
                    imageUrl: p.imageUrl || p.ImageUrl,
                    isPublic: (p.isPublic !== undefined ? p.isPublic : p.IsPublic) ? true : false,
                    description: p.description || p.Description,
                    isPinned: (p.isPinned !== undefined ? p.isPinned : p.IsPinned) ? true : false,
                    isPosted: (p.isPosted !== undefined ? p.isPosted : p.IsPosted) ? true : false
                }));
                setProfilePlaylists(normalized.filter(p => p.id && String(p.id).trim() !== ''));
            }
        } catch (err) {
            console.error("Failed to fetch playlists", err);
        }
    }, [isMe, currentUser, targetUserId]);

    React.useEffect(() => {
        fetchPlaylists();
    }, [fetchPlaylists]);

    // Fetch Gear
    const fetchGear = React.useCallback(async () => {
        setIsLoadingGear(true);
        try {
            const API = await import('../services/api').then(mod => mod.default);
            const targetId = isMe ? (currentUser?.id || currentUser?.Id) : targetUserId;
            if (targetId) {
                const res = await API.Gear.getByUser(targetId);
                setProfileGear(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err) {
            console.error('Failed to fetch gear', err);
        } finally {
            setIsLoadingGear(false);
        }
    }, [isMe, currentUser, targetUserId]);

    React.useEffect(() => {
        fetchGear();
    }, [fetchGear]);

    const handleAddGear = async (e) => {
        e.preventDefault();
        if (!gearFormData.name.trim()) return;
        setIsSavingGear(true);
        try {
            const API = await import('../services/api').then(mod => mod.default);
            const response = await API.Gear.add({
                name: gearFormData.name.trim(),
                category: gearFormData.category,
                notes: gearFormData.notes.trim() || null,
                displayOrder: profileGear.length
            });
            console.log('[GEAR_ADD_SUCCESS]', response.data);
            setGearFormData({ name: '', category: 'Synth', notes: '' });
            setShowGearForm(false);
            await fetchGear();
            showNotification('GEAR_ADDED', `${gearFormData.name} added to shelf.`, 'success');
        } catch (err) {
            console.error('[GEAR_ADD_FAILURE]', err);
            const errorMsg = err.response?.data?.message || err.response?.data || 'Failed to establish link with gear shelf database.';
            showNotification('GEAR_ERROR', `ERROR: ${errorMsg}`, 'error');
        } finally {
            setIsSavingGear(false);
        }
    };

    const handleDeleteGear = async (id) => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Gear.remove(id);
            setProfileGear(prev => prev.filter(g => (g.id || g.Id) !== id));
            showNotification('GEAR_REMOVED', 'Item removed from shelf.', 'success');
        } catch (err) {
            console.error('Failed to remove gear', err);
        }
    };

    const handleCreatePlaylist = async (_e) => {
        _e.preventDefault();
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Playlists.create({
                Name: newPlaylistName,
                IsPublic: isPlaylistPublic,
                Description: ''
            }); 
            setShowCreatePlaylist(false);
            setNewPlaylistName('');
            onRefreshPlaylists?.(); // Refresh global state
            
            // Local Refresh for ProfileView playlists if they are local
            const targetId = currentUser?.id || currentUser?.Id;
            const res = await API.Playlists.getUserPlaylists(targetId);
            const normalized = (res.data || []).map(p => ({
                ...p,
                id: p.id || p.Id,
                name: p.name || p.Name,
                imageUrl: p.imageUrl || p.ImageUrl,
                isPublic: p.isPublic !== undefined ? p.isPublic : p.IsPublic,
                description: p.description || p.Description
            }));
            setProfilePlaylists(normalized.filter(p => p.id && String(p.id).trim() !== ''));
        } catch (err) {
            console.error("Failed to create playlist", err);
        }
    };

    const handleOpenPlaylist = async (playlistId) => {
        setSelectedPlaylistId(playlistId);
        setIsLoadingPlaylist(true);
        try {
            const API = await import('../services/api').then(mod => mod.default);
            const res = await API.Playlists.getById(playlistId);
            const data = res.data;
            if (data && data.Playlist) {
                const normalizedPlaylist = {
                    ...data.Playlist,
                    id: data.Playlist.id || data.Playlist.Id,
                    name: data.Playlist.name || data.Playlist.Name,
                    imageUrl: data.Playlist.imageUrl || data.Playlist.ImageUrl,
                    isPublic: data.Playlist.isPublic !== undefined ? data.Playlist.isPublic : data.Playlist.IsPublic,
                    description: data.Playlist.description || data.Playlist.Description
                };
                const normalizedTracks = (data.Tracks || []).map(t => ({
                    ...t,
                    id: t.id || t.Id,
                    title: t.title || t.Title,
                    artistName: t.artistName || t.ArtistName,
                    coverImageUrl: t.coverImageUrl || t.CoverImageUrl,
                    source: t.source || t.Source,
                    isLocked: t.isLocked !== undefined ? t.isLocked : (t.IsLocked !== undefined ? t.IsLocked : false),
                    isOwned: t.isOwned !== undefined ? t.isOwned : (t.IsOwned !== undefined ? t.IsOwned : true)
                }));
                setPlaylistDetails({ Playlist: normalizedPlaylist, Tracks: normalizedTracks });
            } else {
                setPlaylistDetails(data);
            }
        } catch (err) {
            console.error("Failed to fetch playlist details", err);
        } finally {
            setIsLoadingPlaylist(false);
        }
    };

    // Fetches details for the in-monitor inline panel
    const handleOpenMonitorPlaylist = async (playlistId) => {
        setMonitorPlaylistId(playlistId);
        setIsLoadingMonitorPlaylist(true);
        try {
            const API = await import('../services/api').then(mod => mod.default);
            const res = await API.Playlists.getById(playlistId);
            const data = res.data;
            if (data && data.Playlist) {
                const normalizedPlaylist = {
                    ...data.Playlist,
                    id: data.Playlist.id || data.Playlist.Id,
                    name: data.Playlist.name || data.Playlist.Name,
                    imageUrl: data.Playlist.imageUrl || data.Playlist.ImageUrl,
                    isPublic: data.Playlist.isPublic !== undefined ? data.Playlist.isPublic : data.Playlist.IsPublic,
                    description: data.Playlist.description || data.Playlist.Description
                };
                const normalizedTracks = (data.Tracks || []).map(t => ({
                    ...t,
                    id: t.id || t.Id,
                    title: t.title || t.Title,
                    artistName: t.artistName || t.ArtistName,
                    coverImageUrl: t.coverImageUrl || t.CoverImageUrl,
                    source: t.source || t.Source,
                    isLocked: t.isLocked !== undefined ? t.isLocked : (t.IsLocked !== undefined ? t.IsLocked : false),
                    isOwned: t.isOwned !== undefined ? t.isOwned : (t.IsOwned !== undefined ? t.IsOwned : true)
                }));
                setMonitorPlaylistDetails({ Playlist: normalizedPlaylist, Tracks: normalizedTracks });
            } else {
                setMonitorPlaylistDetails(data);
            }
        } catch (err) {
            console.error("Failed to fetch monitor playlist details", err);
        } finally {
            setIsLoadingMonitorPlaylist(false);
        }
    };

    // Routes wall/monitor item clicks: playlists get local details panel, everything else goes to global expand
    const handleItemClick = (item, type) => {
        const resolvedType = type || item?.type || item?.Type;
        if (resolvedType === 'PLAYLIST') {
            handleOpenPlaylist(item.id || item.Id);
        } else {
            onExpandContent?.(item, resolvedType);
        }
    };

    const handleUpdatePlaylist = async (id, data) => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Playlists.update(id, data);

            // Refresh list
            const targetId = currentUser?.id || currentUser?.Id;
            const res = await API.Playlists.getUserPlaylists(targetId);
            const normalized = (res.data || []).map(p => ({
                ...p,
                id: p.id || p.Id,
                name: p.name || p.Name,
                imageUrl: p.imageUrl || p.ImageUrl,
                isPublic: p.isPublic !== undefined ? p.isPublic : p.IsPublic,
                description: p.description || p.Description
            }));
            setProfilePlaylists(normalized.filter(p => p.id && String(p.id).trim() !== ''));

            // Refresh details if open
            if (selectedPlaylistId === id) {
                handleOpenPlaylist(id);
            }
        } catch (err) {
            console.error("Failed to update playlist", err);
        }
    };

    const handleDeletePlaylist = async (id) => {
        if (!window.confirm("Are you sure you want to delete this playlist? This cannot be undone.")) return;
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Playlists.delete(id);

            setPlaylistDetails(null);
            setSelectedPlaylistId(null);

            // Refresh list
            const targetId = currentUser?.id || currentUser?.Id;
            const res = await API.Playlists.getUserPlaylists(targetId);
            const normalized = (res.data || []).map(p => ({
                ...p,
                id: p.id || p.Id,
                name: p.name || p.Name,
                imageUrl: p.imageUrl || p.ImageUrl,
                isPublic: p.isPublic !== undefined ? p.isPublic : p.IsPublic,
                description: p.description || p.Description
            }));
            setProfilePlaylists(normalized.filter(p => p.id && String(p.id).trim() !== ''));
        } catch (err) {
            console.error("Failed to delete playlist", err);
        }
    };

    const handleRemoveTrackFromPlaylist = async (playlistId, trackId) => {
        if (!window.confirm("Remove this signal from the sequence?")) return;
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Playlists.removeTrack(playlistId, trackId);
            // Refresh details
            handleOpenPlaylist(playlistId);
        } catch (err) {
            console.error("Failed to remove track", err);
        }
    };

    const handleUpdateProfile = async (formData) => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            const uid = currentUser?.id || currentUser?.Id || currentUser?.userId || currentUser?.UserId;
            const res = await API.Users.updateProfile(formData, uid);
            showNotification("PROFILE_SYNCED", "Identity modifications committed to core.", "success");
            setShowEditProfile(false);

            if (res?.data?.user && setUser) {
                const rawData = res.data.user;
                const updated = {
                    ...currentUser,
                    username: rawData.username || rawData.Username || currentUser.username,
                    biography: rawData.biography || rawData.Biography || currentUser.biography,
                    residentSectorId: rawData.residentSectorId !== undefined ? rawData.residentSectorId : (rawData.ResidentSectorId !== undefined ? rawData.ResidentSectorId : currentUser.residentSectorId),
                    profileImageUrl: getMediaUrl(rawData.profilePictureUrl || rawData.ProfilePictureUrl) || currentUser.profileImageUrl,
                    bannerUrl: getMediaUrl(rawData.bannerUrl || rawData.BannerUrl) || currentUser.bannerUrl,
                    themeColor: rawData.themeColor || rawData.ThemeColor || currentUser.themeColor,
                    textColor: rawData.textColor || rawData.TextColor || currentUser.textColor,
                    backgroundColor: rawData.backgroundColor || rawData.BackgroundColor || currentUser.backgroundColor,
                    isGlass: rawData.isGlass !== undefined ? rawData.isGlass : (rawData.IsGlass !== undefined ? rawData.IsGlass : currentUser.isGlass),
                    statusMessage: rawData.statusMessage || rawData.StatusMessage || currentUser.statusMessage,
                    StatusMessage: rawData.statusMessage || rawData.StatusMessage || currentUser.StatusMessage,
                    communityName: rawData.communityName || rawData.CommunityName || currentUser.communityName,
                    communityId: rawData.communityId || rawData.CommunityId || currentUser.communityId,
                    monitorImageUrl: rawData.hasOwnProperty('monitorImageUrl') || rawData.hasOwnProperty('MonitorImageUrl') 
                        ? getMediaUrl(rawData.monitorImageUrl || rawData.MonitorImageUrl) 
                        : currentUser.monitorImageUrl,
                    monitorBackgroundColor: rawData.hasOwnProperty('monitorBackgroundColor') ? rawData.monitorBackgroundColor : (rawData.hasOwnProperty('MonitorBackgroundColor') ? rawData.MonitorBackgroundColor : currentUser.monitorBackgroundColor),
                    monitorIsGlass: rawData.hasOwnProperty('monitorIsGlass') ? rawData.monitorIsGlass : (rawData.hasOwnProperty('MonitorIsGlass') ? rawData.MonitorIsGlass : currentUser.monitorIsGlass)
                };
                setUser(prev => {
                    try { localStorage.setItem('user', JSON.stringify(updated)); } catch (e) { }
                    return updated;
                });
                setProfileData(updated);
            } else {
                onRefreshProfile?.();
            }
        } catch (error) {
            console.error("Profile Sync Error:", error);
            showNotification("SYNC_FAILED", "Failed to commit modifications to core.", "error");
            throw error;
        }
    };

    const handleInlineStatusUpdate = async () => {
        const currentStatus = displayUser?.statusMessage || displayUser?.StatusMessage || '';
        if (localStatus === currentStatus) return;

        setIsSavingStatus(true);
        try {
            const API = await import('../services/api').then(mod => mod.default);
            const uid = currentUser?.id || currentUser?.Id || currentUser?.userId || currentUser?.UserId;
            
            const formData = new FormData();
            formData.append('StatusMessage', localStatus);
            
            const res = await API.Users.updateProfile(formData, uid);
            
            if (res?.data?.user && setUser) {
                const rawData = res.data.user;
                const updated = {
                    ...currentUser,
                    statusMessage: rawData.statusMessage || rawData.StatusMessage || localStatus,
                    StatusMessage: rawData.statusMessage || rawData.StatusMessage || localStatus,
                    communityName: rawData.communityName || rawData.CommunityName || currentUser.communityName
                };
                setUser(prev => {
                    try { localStorage.setItem('user', JSON.stringify(updated)); } catch (e) { }
                    return updated;
                });
                setProfileData(updated);
            }
            
            showNotification("SIGNAL_BROADCAST", "Frequency status updated successfully.", "success");
        } catch (err) {
            console.error('Status update failed:', err);
            showNotification("BROADCAST_FAILURE", "Signal lost. Status synchronization failed.", "error");
            setLocalStatus(currentStatus); // Revert UI
        } finally {
            setIsSavingStatus(false);
        }
    };

    const handleDeleteTrack = async (track) => {
        if (!window.confirm(`Are you sure you want to delete "${track.title}"?`)) return;
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Tracks.deleteTrack(track.id || track.Id);
            if (onRefreshTracks) onRefreshTracks();
        } catch (err) {
            console.error("Failed to delete track", err);
        }
    };

    // Fetch Target Profile
    useEffect(() => {
        const fetchTargetProfileInternal = async () => {
            setIsLoadingProfile(true);
            try {
                const API = await import('../services/api').then(mod => mod.default);
                if (!effectiveId) return;

                // Fetch basic user data first (Skip if it's already in Props for "Me")
                if (isMe && currentUser) {
                    setProfileData(currentUser);
                    setIsLoadingProfile(false); // Stop blocking early for "Me"
                } else {
                    const userRes = await API.Users.getUserById(effectiveId).catch(() => ({ data: null }));
                    if (userRes.data) {
                        setProfileData(userRes.data);
                        setIsLoadingProfile(false); // Stop blocking once we have the identity
                    }
                }

                // Fetch My Likes to sync state
                try {
                    const lResp = await API.Likes.getMyLikes();
                    setMyLikes(Array.isArray(lResp.data) ? lResp.data : []);
                } catch (e) {
                    console.error("Failed to fetch likes", e);
                }

                // Try to resolve ArtistId if this user is an artist
                const artistRes = await API.Artists.getByUserId(effectiveId).catch(() => ({ data: null }));
                if (artistRes.data) {
                    setProfileData(prev => ({
                        ...prev,
                        isLive: artistRes.data.isLive || artistRes.data.IsLive,
                        featuredTrackId: artistRes.data.featuredTrackId || artistRes.data.FeaturedTrackId
                    }));
                }
                const artistId = artistRes.data?.id || artistRes.data?.Id;
                // Tracks & Following logic
                setIsLoadingTracks(true);
                let filtered = [];
                if (isMe && allTracks?.length > 0) {
                    // Use tracks already in memory for Current User
                    filtered = allTracks.filter(t => {
                        const tUserId = t.artistUserId || t.ArtistUserId || t.userId || t.UserId;
                        return String(tUserId) === String(effectiveId);
                    }).map(t => ({
                        ...t,
                        id: t.id || t.Id,
                        title: t.title || t.Title || 'UNKNOWN_SIGNAL',
                        artist: t.artist || t.ArtistName || t.Artist || 'UNKNOWN_SOURCE',
                        source: getMediaUrl(t.source || t.Source || t.filePath || t.FilePath),
                        cover: getMediaUrl(t.coverImageUrl || t.CoverImageUrl)
                    }));
                    setIsLoadingTracks(false);
                } else {
                    const [tracksRes, followingRes] = await Promise.all([
                        API.Tracks.getAllTracks(),
                        API.Users.getFollowing(currentUser?.id || currentUser?.Id).catch(() => ({ data: [] }))
                    ]);

                    const following = followingRes.data || [];
                    setIsFollowing(following.some(a => String(a.id || a.Id) === String(effectiveId)));

                    const tracks = tracksRes.data || [];
                    filtered = tracks.filter(t => {
                        const tUserId = t.artistUserId || t.ArtistUserId || t.userId || t.UserId;
                        return String(tUserId) === String(effectiveId);
                    }).map(t => ({
                        ...t,
                        id: t.id || t.Id,
                        title: t.title || t.Title || 'UNKNOWN_SIGNAL',
                        artist: t.artist || t.ArtistName || t.Artist || 'UNKNOWN_SOURCE',
                        source: getMediaUrl(t.source || t.Source || t.filePath || t.FilePath),
                        cover: getMediaUrl(t.coverImageUrl || t.CoverImageUrl)
                    }));
                    setIsLoadingTracks(false);
                }
                setProfileTracks(filtered);

                try {
                    setIsLoadingJournal(true);
                    setIsLoadingGallery(true);
                    const [jRes, gRes, sRes, fvRes, pRes] = await Promise.all([
                        isMe ? API.Journal.getMyJournal().catch(() => ({ data: [] })) : API.Journal.getUserJournal(effectiveId).catch(() => ({ data: [] })),
                        isMe ? API.Studio.getMyGallery().catch(() => ({ data: [] })) : API.Studio.getUserGallery(effectiveId).catch(() => ({ data: [] })),
                        API.Stations.getByUserId(effectiveId).catch(() => ({ data: null })),
                        API.Stations.getFavorites().catch(() => ({ data: [] })),
                        API.Playlists.getUserPlaylists(effectiveId).catch(() => ({ data: [] }))
                    ]);
                    setProfileJournal(jRes.data || []);
                    setProfileGallery(gRes.data || []);
                    setProfilePlaylists((pRes.data || []).map(p => ({
                        ...p,
                        id: p.id || p.Id,
                        name: p.name || p.Name,
                        imageUrl: p.imageUrl || p.ImageUrl
                    })));
                    setIsLoadingJournal(false);
                    setIsLoadingGallery(false);
                    setStationData(sRes.data);
                    if (sRes.data) {
                        const isFav = (fvRes.data || []).some(f => (f.id || f.Id) === (sRes.data.id || sRes.data.Id));
                        setIsStationFavorited(isFav);

                        // Auto-sync global activeStation if this is my live station
                        if (isMe && (sRes.data.isLive || sRes.data.IsLive) && setActiveStation && !activeStation) {
                            setActiveStation(sRes.data);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch studio or station content", e);
                }

            } catch (err) {
                console.error("Failed to fetch target profile", err);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchTargetProfileInternal();
    }, [targetUserId, isMe, currentUser]);


    const handleFollow = async () => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Artists.likeArtist(targetUserId);
            setIsFollowing(!isFollowing);
            if (onRefreshProfile) onRefreshProfile();
        } catch (err) {
            console.error("Follow action failed", err);
        }
    };


    // 5. RENDER PHASE: CONSOLE (PROJECTION)
    const renderConsoleView = () => {
        const pfp = displayUser?.profilePictureUrl || displayUser?.ProfilePictureUrl || displayUser?.profileImageUrl || displayUser?.ProfileImageUrl;
        const isLive = stationData?.isLive || stationData?.IsLive;

        return (
            <div className="console-container pt-12">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="console-outer-frame"
                >
                    <LBrackets className="opacity-60" />
                    
                    {/* Left: Station Signal */}
                    <div className="console-panel">
                        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
                            <div className="text-[9px] mono font-bold uppercase tracking-[0.4em] opacity-40">STATION_LINK</div>
                            <div className="w-32 h-32 border border-white/10 bg-black/40 flex items-center justify-center relative overflow-hidden">
                                {isLive && stationData?.imageUrl ? (
                                    <img src={getMediaUrl(stationData.imageUrl)} className="w-full h-full object-cover animate-pulse" />
                                ) : (
                                    <Radio size={32} className="text-white/10" />
                                )}
                                <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none" />
                            </div>
                            <SignalWaveform isLive={isLive} isProfilePlaying={!isProfileTrackMuted} color={profileAccent} />
                            <div className="text-[10px] font-black uppercase tracking-widest text-center" style={{ color: profileAccent }}>
                                {isLive ? 'SIGNAL_DETECTION: LIVE' : 'STATUS: OFFLINE'}
                            </div>
                        </div>
                    </div>

                    {/* Center: Dynamic Core */}
                    <div className="console-panel w-[380px]">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={cycleIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex-1 p-6 flex flex-col items-center justify-center"
                            >
                                {cycleIndex === 0 && (
                                    <div className="w-48 h-48 border border-white/10 bg-black/40 p-1">
                                        <div className="w-full h-full border border-white/20 relative overflow-hidden group">
                                            {pfp ? (
                                                <img src={getMediaUrl(pfp)} className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/5"><Cpu size={48} /></div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                                <span className="text-[7px] mono font-bold tracking-widest">BIO_SCAN_COMPLETE</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {cycleIndex === 1 && (
                                    <div className="w-full space-y-4">
                                        <div className="text-[9px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-2">SIGNAL_TRACKS</div>
                                        {profileTracks.slice(0, 5).map((t, idx) => (
                                            <div key={idx} className="flex items-center gap-3 group cursor-pointer" onClick={() => onPlayTrack(t)}>
                                                <span className="text-[8px] mono opacity-20">[{String(idx+1).padStart(2,'0')}]</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] font-bold text-white uppercase tracking-wider truncate group-hover:text-[var(--subsystem-accent)] transition-colors">{t.title || t.Title}</div>
                                                    <div className="text-[7px] mono opacity-40 uppercase truncate">{t.artistName || t.ArtistName}</div>
                                                </div>
                                                {idx === 0 && <Star size={10} className="text-yellow-500/60" />}
                                                <Play size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {cycleIndex === 2 && (
                                    <div className="w-full h-full flex flex-col">
                                        <div className="text-[9px] mono font-bold uppercase tracking-[0.4em] opacity-40 mb-4">ACTIVITY_LOG</div>
                                        <div className="flex-1 space-y-4">
                                            {profileJournal.slice(0, 4).map((entry, idx) => (
                                                <div key={idx} className="border-l border-white/10 pl-3">
                                                    <div className="text-[8px] mono text-white/30 uppercase">{new Date(entry.createdAt || entry.CreatedAt).toLocaleDateString()}</div>
                                                    <div className="text-[9px] font-bold text-white/80 uppercase tracking-wide truncate">{entry.title || entry.Title}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {cycleIndex === 3 && (
                                    <div className="w-full flex flex-col items-center gap-8">
                                        <div className="text-[9px] mono font-bold uppercase tracking-[0.4em] opacity-40">NEURAL_LINKS</div>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="flex flex-col items-center gap-2 group cursor-pointer opacity-40 hover:opacity-100 transition-all">
                                                <div className="p-4 border border-white/10 bg-white/5 rounded-full"><Share2 size={24} /></div>
                                                <span className="text-[8px] mono">SOCIAL_01</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2 group cursor-pointer opacity-40 hover:opacity-100 transition-all">
                                                <div className="p-4 border border-white/10 bg-white/5 rounded-full"><Link size={24} /></div>
                                                <span className="text-[8px] mono">WEBSITE</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Controls */}
                        <div className="center-cycle-controls">
                            <button onClick={() => setCycleIndex((prev) => (prev - 1 + 4) % 4)} className="cycle-btn"><ChevronDown size={20} className="rotate-180" /></button>
                            <button onClick={() => setCycleIndex((prev) => (prev + 1) % 4)} className="cycle-btn"><ChevronDown size={20} /></button>
                        </div>
                    </div>

                    {/* Right: Metadata */}
                    <div className="console-panel">
                        <div className="flex-1 p-8 space-y-6">
                            <div className="text-[9px] mono font-bold uppercase tracking-[0.4em] opacity-40">USER_DATA</div>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="text-[7px] mono text-white/20 uppercase">FULL_NAME</div>
                                    <div className="text-[11px] font-black text-white uppercase tracking-widest">{displayUser?.username || 'ANONYMOUS'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[7px] mono text-white/20 uppercase">RES_SECTOR</div>
                                    <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: communityColor }}>{communityName}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[7px] mono text-white/20 uppercase">SIG_ID</div>
                                    <div className="text-[10px] mono font-bold text-white/60 tracking-wider">0X{displayUser?.id?.toString().slice(0, 8).toUpperCase()}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[7px] mono text-white/20 uppercase">BIO_SYNC</div>
                                    <div className="text-[10px] mono font-bold text-white/40 tracking-widest">NORMALIZED_98%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enter Button */}
                    <button onClick={() => setViewMode('DASHBOARD')} className="enter-system-btn">ENTER_SYSTEM</button>
                </motion.div>
            </div>
        );
    };

    // 6. RENDER PHASE: DASHBOARD (EXPANDED)
    const renderDashboardView = () => {
        const pfp = displayUser?.profilePictureUrl || displayUser?.ProfilePictureUrl || displayUser?.profileImageUrl || displayUser?.ProfileImageUrl;

        return (
            <div className="dashboard-grid custom-scrollbar">
                {/* Identity Core Panel (Upper Right) */}
                <div className="identity-core-panel">
                    <SubsystemBlock title="IDENTITY_CORE" showBrackets={true} address="USR_USR_01">
                        <div className="p-4 flex gap-6 border-b border-white/5">
                            <div className="w-24 h-24 border border-[var(--subsystem-accent)]/30 bg-black/40 p-0.5 shrink-0 relative">
                                <LBrackets className="scale-75 opacity-40" />
                                <div className="w-full h-full border border-[var(--subsystem-accent)]/10 overflow-hidden">
                                     {pfp ? (
                                        <img src={getMediaUrl(pfp)} className="w-full h-full object-cover grayscale transition-all duration-700 hover:grayscale-0" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/5"><Cpu size={32} /></div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                <div className="text-[18px] font-black uppercase tracking-widest leading-none mb-1 text-[var(--subsystem-accent)]">{displayUser?.username}</div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    <div className="text-[8px] mono text-[var(--subsystem-accent)]/60 uppercase tracking-widest">UPLINK_STABLE // PROT_9.5</div>
                                </div>
                            </div>
                        </div>

                        <div className="metadata-list">
                            <div className="metadata-entry">
                                <span className="metadata-label">FULL_NAME</span>
                                <span className="metadata-value">{displayUser?.username || 'ANONYMOUS'}</span>
                            </div>
                            <div className="metadata-entry">
                                <span className="metadata-label">RES_SECTOR</span>
                                <span className="metadata-value" style={{ color: communityColor }}>{communityName}</span>
                            </div>
                            <div className="metadata-entry">
                                <span className="metadata-label">SIG_ID</span>
                                <span className="metadata-value">0X{displayUser?.id?.toString().slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="metadata-entry">
                                <span className="metadata-label">UPLINK_STAT</span>
                                <span className="metadata-value opacity-60 italic">{localStatus || 'NO_SIGNAL_BROADCAST'}</span>
                            </div>
                        </div>

                        {isMe && (
                            <div className="status-action-container">
                                <input 
                                    type="text"
                                    className="status-input"
                                    placeholder="UPDATE_SYSTEM_STATUS..."
                                    value={localStatus}
                                    onChange={(e) => setLocalStatus(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveStatus()}
                                    disabled={isSavingStatus}
                                />
                                <button 
                                    onClick={handleSaveStatus} 
                                    className="status-save-btn"
                                    disabled={isSavingStatus}
                                >
                                    {isSavingStatus ? 'SYNCING...' : 'UPDATE'}
                                </button>
                            </div>
                        )}

                        <GearRack 
                            gears={profileGear} 
                            isMe={isMe} 
                            input={gearInput} 
                            setInput={setGearInput} 
                            onAddGear={handleAddGear}
                            onRemoveGear={handleDeleteGear}
                            isSaving={isSavingGear}
                        />
                    </SubsystemBlock>
                </div>

                {/* Music Releases Panel */}
                <div className="music-releases-panel">
                    <SubsystemBlock title="MUSIC_RELEASES" showBrackets={true} address="SIG_AUD_04">
                        <div className="flex items-center justify-between px-6 py-3 bg-black/40 border-b border-white/5">
                            <div className="flex gap-6">
                                {['ALL', 'ALBUMS', 'SINGLES'].map(f => (
                                    <button 
                                        key={f}
                                        onClick={() => setMusicFilter(f)}
                                        className={`text-[9px] font-black uppercase tracking-[0.3em] transition-all hover:text-white ${musicFilter === f ? 'text-[var(--subsystem-accent)] border-b border-[var(--subsystem-accent)]' : 'text-white/20'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-4">
                                <button className="p-1 hover:text-white text-white/20 transition-all hover:scale-110"><ChevronLeft size={16} /></button>
                                <button className="p-1 hover:text-white text-white/20 transition-all hover:scale-110"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {profileTracks.filter(t => musicFilter === 'ALL' || (musicFilter === 'ALBUMS' ? (t.isAlbum || t.IsAlbum) : !(t.isAlbum || t.IsAlbum))).map((t, idx) => (
                                <div key={idx} className="group cursor-pointer" onClick={() => onPlayTrack(t)}>
                                    <div className="aspect-square bg-black border border-white/10 overflow-hidden relative mb-3 p-1">
                                        <div className="w-full h-full border border-white/5 relative overflow-hidden">
                                            {t.coverImageUrl || t.CoverImageUrl ? (
                                                <img src={getMediaUrl(t.coverImageUrl || t.CoverImageUrl)} className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" />
                                            ) : (
                                                <div className="w-full h-full bg-[#050505] flex items-center justify-center text-white/10"><Music size={48} /></div>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Play size={32} className="text-white scale-75 group-hover:scale-100 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[11px] font-black text-white uppercase tracking-wider truncate mb-1">{t.title || t.Title}</div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-[7px] mono text-[var(--subsystem-accent)]/80 uppercase tracking-widest">{(t.isAlbum || t.IsAlbum) ? 'ALBUM_RELEASE' : 'SINGLE_SIGNAL'}</div>
                                        <div className="text-[6px] mono text-white/20 uppercase">ID_0X{idx.toString(16).padStart(3,'0')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SubsystemBlock>
                </div>

                {/* Studio Content Panel */}
                <div className="studio-content-panel">
                    <SubsystemBlock title="STUDIO_ARCHIVE" showBrackets={true} address="VIS_CAP_09">
                        <div className="p-4 grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {profileGallery.map((img, idx) => (
                                <div key={idx} className="aspect-square bg-black border border-white/5 overflow-hidden group relative cursor-pointer" onClick={() => handleItemClick(img, 'GALLERY')}>
                                    <img src={getMediaUrl(img.url || img.Url || img.imageUrl || img.ImageUrl)} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110" />
                                    {(img.type === 'VIDEO' || img.Type === 'VIDEO') && (
                                        <div className="absolute top-1 right-1 p-1 bg-black/60 border border-cyan-500/30">
                                            <Video size={10} className="text-cyan-400" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {profileJournal.map((entry, idx) => (
                                <div key={idx} className="aspect-square border border-white/5 bg-white/5 p-3 flex flex-col justify-between group cursor-pointer hover:bg-[var(--subsystem-accent)]/10 transition-all border-l-2 border-l-transparent hover:border-l-[var(--subsystem-accent)]" onClick={() => handleItemClick(entry, 'JOURNAL')}>
                                    <Book size={16} className="text-white/20 group-hover:text-[var(--subsystem-accent)] transition-colors" />
                                    <div className="text-[8px] font-black uppercase tracking-tight leading-tight line-clamp-2 text-white/60 group-hover:text-white transition-colors">{entry.title || entry.Title}</div>
                                </div>
                            ))}
                        </div>
                    </SubsystemBlock>
                </div>

                {/* Archive Panel (Playlists/Past Broadcasts) */}
                <div className="archive-panel">
                    <SubsystemBlock title="PLAYLISTS_&_BROADCASTS" showBrackets={true} address="ARC_MEM_02">
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 p-3 max-h-[500px]">
                            {profilePlaylists.map((p, idx) => (
                                <div 
                                    key={idx} 
                                    className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 hover:border-[var(--subsystem-accent)]/40 hover:bg-[var(--subsystem-accent)]/5 transition-all cursor-pointer group relative"
                                    onClick={() => handleItemClick(p, 'PLAYLIST')}
                                >
                                    <div className="w-12 h-12 bg-black border border-[var(--subsystem-accent)]/20 p-0.5 shrink-0">
                                        <div className="w-full h-full border border-white/5 overflow-hidden">
                                            <img src={getMediaUrl(p.imageUrl || p.ImageUrl)} className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-100 transition-all duration-500" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[12px] font-black text-white uppercase tracking-widest truncate group-hover:text-[var(--subsystem-accent)] transition-colors">{p.name || p.Name}</div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-[7px] mono text-white/30 uppercase tracking-widest">{p.isPublic ? 'PUBLIC_SOURCE' : 'ENCRYPTED_SIG'}</div>
                                            <div className="w-1 h-1 rounded-full bg-white/10" />
                                            <div className="text-[7px] mono text-white/20 uppercase tracking-widest">ARCHIVE_0X{idx}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-white/10 group-hover:text-[var(--subsystem-accent)] group-hover:translate-x-1 transition-all" />
                                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-40 transition-opacity">
                                        <div className="text-[6px] mono text-white">RECOVER_SIG</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SubsystemBlock>
                </div>
            </div>
        );
    };

    return (
        <div className="spatial-container monitor-shell min-h-screen pt-4" style={{ '--subsystem-accent': profileAccent, '--subsystem-accent-rgb': hexToRgb(profileAccent) }}>
            <DataStream />
            <CRTOverlay />
            <CyberDust count={40} />

            {/* Global Refined Header */}
            <div className="fixed top-6 left-12 right-12 z-[100] flex items-center justify-between">
                <button 
                    onClick={onExitProfile}
                    className="group flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em] text-white/40 hover:text-white transition-all"
                >
                    <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    RETURN_ORBIT
                </button>

                <div className="flex items-center gap-6">
                    {isMe ? (
                        <>
                            <button onClick={onLogout} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-red-500/40 hover:text-red-500 transition-colors">
                                <LogOut size={14} /> LOGOUT
                            </button>
                            <button onClick={() => setShowEditProfile(true)} className="px-4 py-1.5 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all">
                                MODIFY_ID
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => onMessageUser?.(displayUser)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors">
                                <MessageSquare size={14} /> MESSAGE
                            </button>
                            <button onClick={handleFollow} className={`px-6 py-1.5 border text-[9px] font-black uppercase tracking-[0.3em] transition-all ${isFollowing ? 'border-white/10 text-white/40' : 'border-[var(--subsystem-accent)] text-[var(--subsystem-accent)] hover:bg-[var(--subsystem-accent)] hover:text-black'}`}>
                                {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <motion.div 
                className="flex-1 w-full h-full relative z-10 flex flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                <AnimatePresence mode="wait">
                    {viewMode === 'CONSOLE' ? (
                        <div key="console" className="flex-1 overflow-hidden">{renderConsoleView()}</div>
                    ) : (
                        <div key="dashboard" className="flex-1 overflow-hidden">{renderDashboardView()}</div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Modal Layer */}
            <AnimatePresence>
                {showEditProfile && (
                    <ContentModal onClose={() => setShowEditProfile(false)} title="MODIFY_IDENTITY">
                         <div className="p-8 h-full bg-black/90 backdrop-blur-3xl border border-white/5 overflow-y-auto custom-scrollbar">
                            <h2 className="text-2xl font-black text-white mb-8 border-b border-white/10 pb-4 uppercase tracking-[0.2em] italic flex items-center gap-4">
                                <span className="p-2 bg-red-500 text-black">01</span> Identity_Core_Update
                            </h2>
                            <EditProfileForm
                                user={displayUser}
                                tracks={isMe ? profileTracks : []}
                                onSubmit={handleUpdateProfile}
                                onLogout={onLogout}
                            />
                        </div>
                    </ContentModal>
                )}
                {selectedPlaylistId && playlistDetails && (
                    <PlaylistPopup 
                        playlist={playlistDetails.Playlist || playlistDetails.playlist} 
                        tracks={playlistDetails.Tracks || playlistDetails.tracks} 
                        isMe={isMe}
                        onClose={() => { setSelectedPlaylistId(null); setPlaylistDetails(null); }}
                        onRemoveTrack={handleRemoveTrackFromPlaylist}
                        onPlayAll={onPlayPlaylist}
                        playlists={profilePlaylists}
                        myLikes={myLikes}
                        onQueueTrack={onQueueTrack}
                        onRefreshPlaylists={onRefreshPlaylists}
                        onLike={onLike}
                        onUpdate={handleUpdatePlaylist}
                        onDelete={handleDeletePlaylist}
                    />
                )}
                {selectedContent && (
                    <ContentModal
                        content={selectedContent}
                        type={selectedContent.type || selectedContent.Type}
                        onClose={() => setSelectedContent(null)}
                        hasMiniPlayer={true}
                        themeColor={profileAccent}
                    />
                )}
            </AnimatePresence>
        </div>
    );
});

// --- SUB-COMPONENTES AUXILIARES ---

const ProfileTabIcon = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-8 py-2 relative transition-all duration-300 mono text-[10px] font-bold tracking-[0.4em] ${active ? 'text-[var(--text-color)]' : 'text-[var(--text-color)]/50 hover:text-[var(--text-color)]/60'}`}
    >
        {active ? `[ ${label} ]` : label}
    </button>
);

const Accordion = ({ title, isOpen, onToggle, children }) => (
    <div className="border border-[var(--text-color)]/10 rounded-2xl overflow-hidden bg-black shadow-lg">
        <button
            onClick={onToggle}
            className="w-full flex justify-between items-center p-5 text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-color)] hover:bg-[var(--text-color)]/5"
        >
            <span>{title}</span>
            <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={14} className="text-[var(--text-color)]/60" />
            </div>
        </button>
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-black/40 border-t border-[var(--text-color)]/10 p-5 pt-3"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);



const EditProfileForm = ({ user, tracks = [], onSubmit, onColorPreview, onLogout }) => {
    const [activeTab, setActiveTab] = useState('identity');
    const [name, setName] = useState(user?.username || user?.Username || '');
    const [bio, setBio] = useState(user?.biography || user?.Biography || user?.bio || user?.Bio || '');
    const [sectorId, setSectorId] = useState(user?.residentSectorId || user?.ResidentSectorId || 0);
    const [statusMessage, setStatusMessage] = useState(user?.statusMessage || user?.StatusMessage || '');
    const [file, setFile] = useState(null);
    const [isLive, setIsLive] = useState(user?.isLive || user?.IsLive || false);
    const [featuredTrackId, setFeaturedTrackId] = useState(user?.featuredTrackId || user?.FeaturedTrackId || -1);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [bannerFile, setBannerFile] = useState(null);
    const [wallpaperVideoFile, setWallpaperVideoFile] = useState(null);
    const [themeColor, setThemeColor] = useState(user?.themeColor || user?.ThemeColor || 'var(--text-color)');
    const [textColor, setTextColor] = useState(user?.textColor || user?.TextColor || '#ffffff');
    const [backgroundColor, setBackgroundColor] = useState(user?.backgroundColor || user?.BackgroundColor || '#000000');
    const [isGlass, setIsGlass] = useState(user?.isGlass || user?.IsGlass || false);

    // Sync state with user prop updates
    React.useEffect(() => {
        if (user) {
            setName(user.username || user.Username || '');
            setBio(user.biography || user.Biography || user.bio || user.Bio || '');
            setSectorId(user.residentSectorId || user.ResidentSectorId || 0);
            setStatusMessage(user.statusMessage || user.StatusMessage || '');
            setIsLive(user.isLive || user.IsLive || false);
            setFeaturedTrackId(user.featuredTrackId || user.FeaturedTrackId || -1);
            setThemeColor(user.themeColor || user.ThemeColor || 'var(--text-color)');
            setTextColor(user.textColor || user.TextColor || '#ffffff');
            setBackgroundColor(user.backgroundColor || user.BackgroundColor || '#000000');
            setIsGlass(user.isGlass || user.IsGlass || false);
        }
    }, [user]);

    // Notify parent of color changes for live preview
    React.useEffect(() => {
        if (onColorPreview) onColorPreview({ 
            themeColor, 
            textColor, 
            backgroundColor, 
            isGlass 
        });
    }, [themeColor, textColor, backgroundColor, isGlass]);

    // Sort and filter tracks
    const processedTracks = React.useMemo(() => {
        const search = (searchTerm || '').toLowerCase();

        return [...tracks]
            .sort((a, b) => (a.title || a.Title || '').localeCompare(b.title || b.Title || ''))
            .filter(t => {
                if (!search) return false; // Don't show tracks if not searching
                const title = (t.title || t.Title || '').toLowerCase();
                const artist = (t.artist || t.ArtistName || t.Artist || '').toLowerCase();
                return title.includes(search) || artist.includes(search);
            });
    }, [tracks, searchTerm]);

    const selectedTrack = tracks.find(t => String(t.id || t.Id) === String(featuredTrackId));



    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('Username', name);
            formData.append('Biography', bio);
            formData.append('StatusMessage', statusMessage);
            // Re-added Sector Residency
            formData.append('ResidentSectorId', parseInt(sectorId) || 0);
            formData.append('IsLive', isLive);

            if (featuredTrackId !== null) {
                formData.append('FeaturedTrackId', parseInt(featuredTrackId));
            }

            if (file) formData.append('ProfilePicture', file);
            if (bannerFile) formData.append('Banner', bannerFile);
            if (wallpaperVideoFile) formData.append('WallpaperVideo', wallpaperVideoFile);
            
            formData.append('ThemeColor', themeColor);
            formData.append('TextColor', textColor);
            formData.append('BackgroundColor', backgroundColor);
            formData.append('IsGlass', isGlass);

            await onSubmit(formData);
        } catch (error) {
            console.error("Profile Update Failed Validation:", error.response?.data?.errors);
            alert(`Validation Error: ${JSON.stringify(error.response?.data?.errors || error.message)}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="py-6 min-h-[500px] flex flex-col" style={{
            '--theme-color': themeColor,
            '--text-color': textColor,
            '--theme-color-rgb': hexToRgb(themeColor),
            '--panel-bg': backgroundColor,
            '--panel-bg-rgb': hexToRgb(backgroundColor),
            '--glass-opacity': isGlass ? '0.2' : '0.95',
            '--glass-blur': isGlass ? '20px' : '0px'
        }}>
            <h3 className="text-3xl font-bold text-[var(--text-color)] uppercase tracking-tighter mb-6 pb-4 border-b border-[var(--theme-color)]/20">// SIGNAL_MODIFICATION_REQ</h3>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button
                    type="button"
                    onClick={() => setActiveTab('identity')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${activeTab === 'identity' ? 'bg-[var(--theme-color)] text-black border-[var(--theme-color)]' : 'bg-black text-[var(--text-color)]/70 border-[var(--text-color)]/10 hover:border-[var(--text-color)]/30 hover:text-[var(--text-color)]'}`}
                >
                    [ IDENTITY_CORE ]
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('interface')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${activeTab === 'interface' ? 'bg-[var(--theme-color)] text-black border-[var(--theme-color)]' : 'bg-black text-[var(--text-color)]/70 border-[var(--text-color)]/10 hover:border-[var(--text-color)]/30 hover:text-[var(--text-color)]'}`}
                >
                    [ INTERFACE_CALIBRATION ]
                </button>
            </div>

            {/* IDENTITY TAB */}
            {activeTab === 'identity' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="flex items-center gap-8">
                        <div className="w-32 h-32 bg-black border border-[var(--text-color)]/20 rounded-full flex items-center justify-center overflow-hidden relative group">
                            {file ? (
                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                            ) : user?.profileImageUrl ? (
                                <img src={getMediaUrl(user.profileImageUrl)} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-[var(--text-color)]/50"><Cpu size={48} /></div>
                            )}
                            <input
                                type="file"
                                onChange={e => setFile(e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={24} className="text-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs font-bold text-[var(--text-color)] uppercase tracking-widest">Profile Picture</div>
                            <div className="text-[10px] text-white/40 uppercase">Recommended: 400x400 PNG/JPG</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-[var(--text-color)]/60 uppercase tracking-widest ml-1">Username</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 p-4 text-white font-bold outline-none focus:border-[var(--text-color)] transition-all"
                                placeholder="Enter Username..."
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-[var(--text-color)]/60 uppercase tracking-widest ml-1">Sector Residency</label>
                            <select
                                value={sectorId}
                                onChange={(e) => setSectorId(parseInt(e.target.value))}
                                className="w-full bg-black/40 border border-white/10 p-4 text-white font-bold outline-none focus:border-[var(--text-color)] appearance-none"
                            >
                                <option value={0}>NEON SLUMS</option>
                                <option value={1}>SILICON HEIGHTS</option>
                                <option value={2}>DATA VOID</option>
                                <option value={3}>CENTRAL HUB</option>
                                <option value={4}>OUTER RIM</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-[var(--text-color)]/60 uppercase tracking-widest ml-1">Signal Status</label>
                        <input
                            type="text"
                            value={statusMessage}
                            onChange={e => setStatusMessage(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-bold outline-none focus:border-[var(--text-color)] transition-all font-mono uppercase"
                            placeholder="INITIALIZE_STATUS_STREAM..."
                            maxLength={100}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-[var(--text-color)]/60 uppercase tracking-widest ml-1">Featured Track</label>
                            <div className="relative">
                                <div
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full bg-black/40 border p-4 flex items-center justify-between cursor-pointer transition-all ${isDropdownOpen ? 'border-[var(--theme-color)]' : 'border-white/10 hover:border-white/30'}`}
                                >
                                    <span className={`text-xs font-bold uppercase tracking-widest truncate ${featuredTrackId == -1 ? 'text-white/50' : 'text-white'}`}>
                                        {featuredTrackId == -1 ? 'None Selected' : (selectedTrack?.title || 'Unknown Track').toUpperCase()}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-[var(--theme-color)]' : 'text-white/50'}`} />
                                </div>

                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="absolute left-0 right-0 top-full mt-2 bg-[#0a0a0a] border border-white/10 z-[100] shadow-2xl flex flex-col max-h-64 overflow-hidden"
                                        >
                                            <div className="p-3 border-b border-white/5 bg-black/20">
                                                <div className="relative flex items-center">
                                                    <Search size={14} className="absolute left-3 text-white/50" />
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        placeholder="Search Signals..."
                                                        className="w-full bg-black border border-white/10 p-2 pl-10 text-xs text-white outline-none focus:border-[var(--theme-color)] transition-all"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setFeaturedTrackId(-1); setIsDropdownOpen(false); }}
                                                    className={`p-4 text-[10px] font-black uppercase tracking-widest cursor-pointer border-b border-[var(--text-color)]/5 transition-all ${featuredTrackId == -1 ? 'bg-[var(--theme-color)]/10 text-[var(--theme-color)]' : 'text-[var(--text-color)]/70 hover:bg-white/5 hover:text-[var(--text-color)]'}`}
                                                >
                                                    [ QUIET_MODE ]
                                                </div>
                                                {processedTracks.length > 0 ? (
                                                    processedTracks.map(t => {
                                                        const tId = t.id || t.Id;
                                                        const isSelected = String(tId) === String(featuredTrackId);
                                                        return (
                                                            <div
                                                                key={tId}
                                                                onClick={() => { setFeaturedTrackId(tId); setIsDropdownOpen(false); }}
                                                                className={`p-4 text-[9px] font-bold uppercase tracking-wider cursor-pointer border-b border-[var(--text-color)]/5 transition-all flex flex-col gap-1 ${isSelected ? 'bg-[var(--theme-color)]/10 border-l-4 border-l-[var(--text-color)] text-[var(--text-color)]' : 'text-[var(--text-color)]/60 hover:bg-white/5 hover:text-[var(--text-color)]'}`}
                                                            >
                                                                <span className={isSelected ? 'text-[var(--theme-color)]' : 'text-[var(--text-color)]/80'}>{t.title || 'UNKNOWN'}</span>
                                                                <span className="text-[8px] opacity-40">BY {(t.artist || t.ArtistName || 'UNKNOWN')}</span>
                                                            </div>
                                                        );
                                                    })
                                                ) : searchTerm ? (
                                                    <div className="p-8 text-center text-[9px] text-[var(--text-color)]/50 uppercase font-black tracking-widest italic">
                                                        NO_MATCHING_SIGNALS_FOUND
                                                    </div>
                                                ) : null}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-[var(--text-color)]/60 uppercase tracking-[0.4em]">_TRANSMISSION_STATUS</label>
                            <div
                                onClick={() => setIsLive(!isLive)}
                                className={`flex items-center justify-between p-4 border cursor-pointer transition-all ${isLive ? 'border-[var(--theme-color)] bg-[var(--theme-color)]/5' : 'border-[var(--text-color)]/10 bg-black'}`}
                            >
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isLive ? 'text-[var(--theme-color)]' : 'text-[var(--text-color)]/70'}`}>
                                    {isLive ? 'SIGNAL_LIVE' : 'STANDBY'}
                                </span>
                                <div className={`w-10 h-5 border transition-all relative ${isLive ? 'border-[var(--theme-color)]' : 'border-[var(--text-color)]/20'}`}>
                                    <motion.div
                                        animate={{ x: isLive ? 20 : 0 }}
                                        className={`absolute top-1 left-1 w-3 h-3 ${isLive ? 'bg-[var(--theme-color)]' : 'bg-white/20'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-[var(--text-color)]/60 uppercase tracking-[0.4em]">_BIO_ENCODING</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            className="w-full bg-black border border-[var(--text-color)]/10 p-5 text-[var(--text-color)] font-bold outline-none focus:border-[var(--theme-color)] min-h-[150px] transition-all resize-none custom-scrollbar tracking-wider leading-relaxed"
                            placeholder="ENCODE BIO DATA..."
                        />
                    </div>
                </div>
            )}

            {/* INTERFACE TAB */}
            {activeTab === 'interface' && (
                <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Unified Backdrop Upload â€” Photo or Video */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-[var(--text-color)]/60 uppercase tracking-widest">SIGNAL_BACKDROP</label>
                        <div className="relative group cursor-pointer border border-dashed border-[var(--text-color)]/20 hover:border-[var(--theme-color)] transition-all bg-white/5 hover:bg-[var(--theme-color)]/5 overflow-hidden">
                            <input
                                type="file"
                                accept="image/*,video/mp4,video/webm,video/*"
                                onChange={e => {
                                    const f = e.target.files[0];
                                    if (!f) return;
                                    if (f.type.startsWith('video/')) {
                                        setWallpaperVideoFile(f);
                                        setBannerFile(null);
                                    } else {
                                        setBannerFile(f);
                                        setWallpaperVideoFile(null);
                                    }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                            />
                            {/* Upload area */}
                            <div className="p-8 flex flex-col items-center justify-center gap-2">
                                {bannerFile || wallpaperVideoFile ? (
                                    <>
                                        {wallpaperVideoFile
                                            ? <Video size={24} className="text-cyan-400" />
                                            : <Camera size={24} className="text-[var(--theme-color)]" />
                                        }
                                        <span className="text-[9px] text-[var(--text-color)]/80 uppercase tracking-widest text-center font-bold">
                                            {(bannerFile || wallpaperVideoFile).name}
                                        </span>
                                        <span className="text-[7px] text-[var(--text-color)]/30 uppercase tracking-widest">
                                            {wallpaperVideoFile ? 'VIDEO_BACKDROP_QUEUED' : 'PHOTO_BACKDROP_QUEUED'}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 mb-1">
                                            <Camera size={18} className="text-[var(--theme-color)]/60" />
                                            <span className="text-[var(--text-color)]/20 text-xs">/</span>
                                            <Video size={18} className="text-cyan-400/60" />
                                        </div>
                                        <span className="text-[9px] text-[var(--text-color)]/60 uppercase tracking-widest text-center">
                                            {user?.bannerUrl || user?.wallpaperVideoUrl ? 'UPDATE_BACKDROP_SIGNAL' : 'UPLOAD_PHOTO_OR_VIDEO'}
                                        </span>
                                        <span className="text-[7px] text-[var(--text-color)]/20 uppercase tracking-widest">JPG Â· PNG Â· MP4 Â· WEBM</span>
                                    </>
                                )}
                            </div>
                        </div>
                        {/* Status indicators â€” video takes priority over photo */}
                        {(() => {
                            const hasVideo = !!(user?.wallpaperVideoUrl || user?.WallpaperVideoUrl);
                            const hasPhoto = !!(user?.bannerUrl || user?.BannerUrl);
                            const pendingNew = bannerFile || wallpaperVideoFile;
                            return (
                                <div className="flex gap-2">
                                    {hasVideo && !pendingNew && (
                                        <div className="flex items-center gap-2 px-3 py-2 border border-cyan-400/20 bg-cyan-400/5 flex-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                            <span className="text-[8px] text-cyan-400 mono uppercase tracking-widest">VIDEO_BACKDROP_ACTIVE</span>
                                        </div>
                                    )}
                                    {hasPhoto && !hasVideo && !pendingNew && (
                                        <div className="flex items-center gap-2 px-3 py-2 border border-[var(--theme-color)]/20 bg-[var(--theme-color)]/5 flex-1">
                                            <Camera size={10} className="text-[var(--theme-color)]" />
                                            <span className="text-[8px] text-[var(--theme-color)] mono uppercase tracking-widest">PHOTO_BACKDROP_ACTIVE</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Theme Calibration Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* TERMINAL_STYLING */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--text-color)]/10">
                                <Layout size={14} className="text-[var(--theme-color)]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-color)]/80">TERMINAL_STYLING</span>
                            </div>

                            <div className="space-y-4">
                                {/* Theme & Text Color */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-bold text-[var(--text-color)]/40 uppercase tracking-widest">HUE</label>
                                        <div className="flex items-center gap-3 p-3 border border-[var(--text-color)]/10 bg-black relative group hover:border-[var(--theme-color)] transition-all">
                                            <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" />
                                            <div className="w-8 h-8 rounded-full border border-[var(--text-color)]/20" style={{ backgroundColor: themeColor }} />
                                            <span className="text-[10px] font-bold text-[var(--theme-color)] mono">{themeColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-bold text-[var(--text-color)]/40 uppercase tracking-widest">DATA</label>
                                        <div className="flex items-center gap-3 p-3 border border-[var(--text-color)]/10 bg-black relative group hover:border-[var(--text-color)] transition-all">
                                            <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" />
                                            <div className="w-8 h-8 rounded-full border border-[var(--text-color)]/20" style={{ backgroundColor: textColor }} />
                                            <span className="text-[10px] font-bold text-[var(--text-color)] mono">{textColor}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Backdrop & Glass */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-bold text-[var(--text-color)]/40 uppercase tracking-widest">BACKDROP</label>
                                    <div className="flex gap-4">
                                        <div className="flex-1 flex items-center gap-3 p-3 border border-[var(--text-color)]/10 bg-black relative group hover:border-[var(--text-color)] transition-all">
                                            <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" />
                                            <div className="w-8 h-8 rounded-full border border-[var(--text-color)]/20" style={{ backgroundColor: backgroundColor }} />
                                            <span className="text-[10px] font-bold text-[var(--text-color)] mono">{backgroundColor}</span>
                                        </div>
                                        <button type="button" onClick={() => setIsGlass(!isGlass)} className={`w-24 px-4 py-3 border flex items-center justify-center transition-all ${isGlass ? 'bg-[var(--text-color)]/10 border-[var(--text-color)] text-[var(--text-color)]' : 'bg-black border-[var(--text-color)]/10 text-[var(--text-color)]/40'}`}>
                                            <span className="text-[8px] font-black uppercase tracking-widest">GLASS</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-auto pt-10 flex flex-col gap-4">
                <button type="submit" className="w-full py-6 bg-black border border-[var(--theme-color)] text-[var(--theme-color)] font-bold uppercase tracking-[0.5em] hover:bg-[var(--theme-color)] hover:text-black transition-all shadow-[0_0_30px_rgba(var(--theme-color-rgb),0.15)]">
                    SYNC_IDENTITY_TO_CORE
                </button>
                <button
                    type="button"
                    onClick={onLogout}
                    className="w-full py-3 text-[10px] text-[var(--text-color)]/40 hover:text-[var(--text-color)] font-black uppercase tracking-[0.3em] border border-[var(--text-color)]/10 hover:border-[var(--text-color)]/40 transition-all"
                >
                    [ TERMINATE_CURRENT_SESSION_LINK ]
                </button>
            </div>
        </form>
    );
};

const StatItem = ({ label, value }) => (
    <div className="flex justify-between items-center text-[10px] group py-3 border-b border-[var(--text-color)]/5 last:border-none">
        <span className="text-[var(--text-color)]/40 group-hover:text-[var(--theme-color)] tracking-[0.3em] font-bold transition-all">{label}</span>
        <span className="text-[var(--text-color)] font-bold tabular-nums">[{value}]</span>
    </div>
);

const PlaylistDetailsModal = ({ playlist, tracks, isOwner, onUpdate, onDelete, onRemoveTrack, onPlayAll, playlists = [], myLikes = [], onQueueTrack, onRefreshPlaylists }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localImageUrl, setLocalImageUrl] = useState(playlist?.imageUrl || '');

    // Edit State
    const [name, setName] = useState(playlist.name);
    const [isPublic, setIsPublic] = useState(playlist.isPublic);
    const [description, setDescription] = useState(playlist.description || '');

    // Reset state when playlist changes
    React.useEffect(() => {
        setName(playlist.name);
        setIsPublic(playlist.isPublic);
        setDescription(playlist.description || '');
        setLocalImageUrl(playlist?.imageUrl || '');
    }, [playlist]);

    const handleSave = () => {
        onUpdate(playlist.id, { Name: name, Description: description, IsPublic: isPublic });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex-1 flex flex-col p-8 pt-16 gap-10 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center border-b border-[var(--text-color)]/20 pb-4">
                    <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">// MODIFY_PLAYLIST_METADATA</h3>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="text-[var(--text-color)]/30 hover:text-[var(--text-color)] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-10 max-w-lg mx-auto w-full pb-10">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-[var(--text-color)] uppercase tracking-[0.4em]">_PLAYLIST_NAME</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-color)] mono">{'>'}</span>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-white/10 p-4 pl-10 text-white font-bold outline-none focus:border-[var(--text-color)] uppercase tracking-widest transition-all" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-[var(--text-color)] uppercase tracking-[0.4em]">_BLOCK_DESCRIPTION</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-white/10 p-5 text-white font-bold outline-none focus:border-[var(--text-color)] min-h-[120px] resize-none uppercase tracking-wide leading-relaxed transition-all" />
                    </div>

                    <div className="flex items-center justify-between p-5 border border-white/5 cursor-pointer group" onClick={() => setIsPublic(!isPublic)}>
                        <div className="flex flex-col">
                            <span className="text-white/60 font-bold uppercase tracking-widest text-xs group-hover:text-white transition-colors">_ACCESS_PROTOCOL</span>
                            <span className="text-[9px] text-[var(--text-color)] uppercase mt-1">{isPublic ? 'PUBL_SYSTEM' : 'PRIV_ENCRYPTED'}</span>
                        </div>
                        <div className={`w-10 h-5 border transition-colors ${isPublic ? 'border-[var(--text-color)] bg-[var(--text-color)]/20' : 'border-white/20 bg-black'}`}>
                            <div className={`w-3 h-3 bg-white transform transition-transform mt-[3px] ml-[3px] ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <button onClick={handleSave} className="w-full py-4 bg-[#ff006e]/10 border border-[#ff006e] text-[#ff006e] font-black uppercase tracking-[0.3em] hover:bg-[#ff006e] hover:text-black transition-all text-[10px] shadow-[0_0_30px_rgba(255,0,110,0.1)] rounded-sm">
                            SYNC_SIGNALS
                        </button>
                    </div>

                    <button onClick={() => onDelete(playlist.id)} className="w-full py-4 border border-red-900/20 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 font-bold uppercase tracking-widest transition-all text-[9px] mt-4">
                        // DELETE_LOCAL_PLAYLIST_PERMANENTLY
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col md:flex-row h-full pt-12 md:pt-0">
            {/* Sidebar / Info */}
            <div className="w-full md:w-80 bg-black/40 border-r border-[var(--text-color)]/20 p-8 flex flex-col gap-8 shrink-0 overflow-y-auto custom-scrollbar">
                <div className="aspect-square border border-[var(--text-color)]/30 p-1 relative group shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                    <div className="w-full h-full relative overflow-hidden group/cover">
                        {(localImageUrl || playlist.imageUrl) ? (
                            <img src={getMediaUrl(localImageUrl || playlist.imageUrl)} className="w-full h-full object-cover grayscale mix-blend-screen opacity-60 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="w-full h-full bg-[var(--text-color)]/5 flex items-center justify-center">
                                <Database size={64} className="text-[var(--text-color)]/10" />
                            </div>
                        )}
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black border border-[var(--text-color)]/30 text-[9px] font-bold text-[var(--text-color)] z-10 mono uppercase">
                            PL_{String(playlist.id).padStart(4, '0')}
                        </div>
                        {isOwner && (
                            <>
                                <label
                                    htmlFor={`playlist-popup-cover-${playlist.id}`}
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 opacity-0 group-hover/cover:opacity-100 transition-opacity cursor-pointer z-20"
                                >
                                    <Upload size={22} className="text-[var(--text-color)] mb-1" />
                                    <span className="text-[8px] mono font-bold uppercase tracking-widest text-[var(--text-color)]">UPLOAD_COVER</span>
                                </label>
                                <input
                                    id={`playlist-popup-cover-${playlist.id}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        try {
                                            const API = await import('../services/api').then(mod => mod.default);
                                            const res = await API.Playlists.uploadCover(playlist.id, formData);
                                            const newUrl = res.data?.imageUrl;
                                            if (newUrl) setLocalImageUrl(newUrl);
                                        } catch (err) {
                                            console.error('Playlist cover upload failed', err);
                                        }
                                        e.target.value = '';
                                    }}
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="space-y-4 mt-4">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none break-words drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{playlist.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold text-[var(--text-color)] uppercase tracking-[0.2em]">
                        <span className="bg-[var(--theme-color)] text-black px-1.5 py-0.5 flex items-center gap-1.5">
                            {playlist.isPublic ? <Globe size={10} /> : <Shield size={10} />}
                            {playlist.isPublic ? 'SYSTEM_PUBL' : 'ENCRYPTED'}
                        </span>
                        <span className="text-white/20">|</span>
                        <span className="text-white/60">{tracks.length} SIGNALS_MAPPED</span>
                    </div>
                    {playlist.description && <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed mt-4 border-l border-[var(--text-color)]/20 pl-4 italic">{playlist.description}</p>}
                </div>

                {isOwner && (
                    <div className="mt-auto pt-8 border-t border-[var(--text-color)]/10 space-y-4">
                        {tracks.length > 0 && (
                            <button onClick={() => onPlayAll?.(tracks)} className="w-full py-5 bg-[var(--text-color)]/10 border border-[var(--text-color)]/40 text-[var(--text-color)] font-bold uppercase tracking-[0.4em] text-[10px] transition-all hover:bg-[var(--text-color)] hover:text-black flex items-center justify-center gap-2 mb-4 shadow-[0_0_20px_rgba(var(--text-color-rgb),0.05)] hover:shadow-[0_0_30px_rgba(var(--text-color-rgb),0.2)]">
                                <Play size={14} fill="currentColor" /> INITIALISE_PLAYLIST
                            </button>
                        )}
                        <button onClick={() => setIsEditing(true)} className="w-full py-3 bg-black border border-white/10 hover:border-[var(--text-color)] text-white/60 hover:text-[var(--text-color)] font-bold uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2">
                            <Edit3 size={12} /> MODIFY_METADATA
                        </button>
                        <button className="w-full py-3 bg-black border border-white/10 hover:border-white/40 text-white/60 hover:text-white font-bold uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2">
                            <Send size={12} /> FORWARD_SIGNAL
                        </button>
                    </div>
                )}
            </div>

            {/* Track List */}
            <div className="flex-1 p-8 pt-20 overflow-y-auto bg-black custom-scrollbar">
                {tracks.length > 0 ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-4 px-4 py-2 text-[9px] font-bold text-[var(--text-color)]/40 uppercase tracking-[0.5em] mb-4 border-b border-[var(--text-color)]/10">
                            <span className="w-8">#ID</span>
                            <span className="flex-1 ml-10">SOURCE_SIGNAL</span>
                            <span className="mr-8">STATUS</span>
                        </div>
                        {tracks.map((t, idx) => (
                            <div key={t.id || `plt-${idx}`} className="flex items-center gap-6 p-4 border border-transparent hover:border-[var(--text-color)]/20 hover:bg-[var(--text-color)]/5 group transition-all">
                                <span className="text-[var(--text-color)]/30 group-hover:text-[var(--text-color)] font-bold mono text-[10px] w-8">[{String(idx + 1).padStart(2, '0')}]</span>
                                <div className="w-10 h-10 border border-white/10 bg-black overflow-hidden relative shrink-0">
                                    {t.coverImageUrl ? (
                                        <img src={getMediaUrl(t.coverImageUrl)} className="w-full h-full object-cover grayscale opacity-50 group-hover:opacity-100 transition-opacity mix-blend-screen" />
                                    ) : (
                                        <div className="w-full h-full bg-[#050505] flex items-center justify-center text-[var(--text-color)]/10"><Code size={20} /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pr-10">
                                    <div className="text-white font-bold text-sm truncate uppercase tracking-wider group-hover:text-[var(--text-color)] transition-colors">{t.title}</div>
                                    <div className="text-white/60 text-[9px] font-bold uppercase tracking-widest mt-1">SIG_ADDR: {t.artistName || 'UNKNOWN'}</div>
                                </div>
                                <div className="hidden md:block mr-4">
                                    <div className="text-[8px] font-bold border border-[var(--text-color)]/20 text-[var(--text-color)]/40 px-2 py-0.5 uppercase group-hover:border-[var(--text-color)] group-hover:text-[var(--text-color)] transition-all">VERIFIED</div>
                                </div>
                                <TrackActionsDropdown
                                    track={t}
                                    isOwner={isOwner}
                                    playlists={playlists}
                                    myLikes={myLikes}
                                    isLikedInitial={myLikes.some(l => (l.trackId || l.TrackId) === (t.id || t.Id))}
                                    onDelete={() => onRemoveTrack?.(playlist.id, t.id || t.Id)}
                                    onAddToQueue={onQueueTrack}
                                    onRefreshPlaylists={onRefreshPlaylists}
                                    onLike={onLike}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-white italic font-black uppercase tracking-tighter">
                        <Library size={48} className="mb-4" />
                        Empty Playlist
                    </div>
                )}
            </div>
        </div>
    );
};

const PlaylistPopup = ({ 
    playlist, tracks, isMe, onClose, onUpdate, onDelete, 
    onRemoveTrack, onPlayAll, playlists, myLikes, 
    onQueueTrack, onRefreshPlaylists, onLike 
}) => {
    return (
        <ContentModal onClose={onClose} title={`PLAYLIST // ${playlist.name?.toUpperCase()}`}>
            <div className="h-full bg-black/90 backdrop-blur-3xl">
                <PlaylistDetailsModal 
                    playlist={playlist}
                    tracks={tracks}
                    isOwner={isMe}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onRemoveTrack={onRemoveTrack}
                    onPlayAll={onPlayAll}
                    playlists={playlists}
                    myLikes={myLikes}
                    onQueueTrack={onQueueTrack}
                    onRefreshPlaylists={onRefreshPlaylists}
                    onLike={onLike}
                />
            </div>
        </ContentModal>
    );
};

export default ProfileView;
