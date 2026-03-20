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
    Camera, Video, Book, ChevronLeft, Star, Share2, Link
} from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { API_BASE_URL, getMediaUrl } from '../constants';

// --- TERMINAL STYLING UTILITIES ---
const hexToRgb = (hex) => {
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

const DataStream = () => (
    <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none mono text-[8px] leading-none text-[var(--text-color)] break-all select-none">
        {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="whitespace-nowrap animate-data-scroll" style={{ animationDelay: `${i * 0.15}s`, opacity: 1 - (i * 0.02) }}>
                {Math.random().toString(2).substring(2).repeat(10)}
            </div>
        ))}
    </div>
);

const CyberDust = ({ count = 30 }) => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: count }).map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-[1px] h-[1px] bg-[var(--text-color)]/30"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    boxShadow: '0 0 5px var(--text-color)'
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

// --- SPATIAL ROOM COMPONENTS ---

const SideTerminal = ({ title, children, side = "left", isOpen, onClose, roomMode }) => (
    <motion.div
        className={`side-terminal ${side} ${isOpen ? 'open' : ''} custom-scrollbar`}
        initial={roomMode === 'room' ? false : { opacity: 0, x: side === 'left' ? -100 : 100, scale: 0.9, filter: "blur(10px)" }}
        animate={roomMode === 'room' ? {
            opacity: 0,
            x: side === 'left' ? -100 : 100,
            scale: 0.9,
            filter: "blur(10px)",
            pointerEvents: "none"
        } : {
            opacity: 1,
            x: 0,
            scale: 1,
            filter: "blur(0px)",
            pointerEvents: "auto"
        }}
        transition={{ type: "tween", duration: 0.6, ease: "easeInOut" }}
    >
        <div className="terminal-header flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
                <Activity size={14} />
                // {title.toUpperCase()}
            </div>
            <button onClick={onClose} className="lg:hidden p-1 hover:text-white transition-colors">
                <X size={14} />
            </button>
        </div>
        <div className="flex-1">
            {children}
        </div>
        <div className="mt-6 pt-4 border-t border-[var(--text-color)]/10 text-[8px] opacity-30 flex justify-between">
            <span className="text-[var(--text-color)]">SECURE_LINK::ENABLED</span>
            <span className="text-[var(--text-color)]">v4.0.2</span>
        </div>
    </motion.div>
);

const SpatialRoomLayout = ({ children, leftContent, rightContent, monitorTitle, leftOpen, rightOpen, onToggleLeft, onToggleRight, bannerUrl, wallpaperVideoUrl, profileImageUrl, biography, themeColor, textColor, backgroundColor, isGlass, previewThemeColor, previewTextColor, previewBackgroundColor, previewIsGlass, onUpload, onGoLive, onModifyId, onLogout, roomMode, setRoomMode, isPlaying, onExpandContent, journal, gallery, tracks, uid, playlists = [], onPlayTrack, onPlayPlaylist, isMe, onExitProfile, onMessageClick, communityId, communityName, communityColor }) => {
    // Use preview colors if available, otherwise fall back to saved user props
    const activeTheme = previewThemeColor || themeColor || 'var(--text-color)';
    const activeText = previewTextColor || textColor || '#ffffff';
    const activeBackground = previewBackgroundColor || backgroundColor || '#000000';
    const activeIsGlass = (previewIsGlass !== undefined && previewIsGlass !== null) ? previewIsGlass : (isGlass !== undefined ? isGlass : false);
    const [scrolled, setScrolled] = useState(false);
    const [isJournalDetailed, setIsJournalDetailed] = useState(false);

    return (
        <div className={`spatial-container ${roomMode === 'room' ? 'room-mode-active' : ''}`} style={{
            '--theme-color': activeTheme,
            '--text-color': activeText,
            '--text-color-rgb': hexToRgb(activeText),
            '--theme-color-rgb': hexToRgb(activeTheme),
            '--panel-bg': activeBackground,
            '--panel-bg-rgb': hexToRgb(activeBackground),
            '--glass-opacity': activeIsGlass ? '0.2' : '0.95',
            '--glass-blur': activeIsGlass ? '20px' : '0px'
        }}>
            <div className="absolute inset-0 z-0 overflow-hidden">
                {wallpaperVideoUrl ? (
                    <video
                        key={wallpaperVideoUrl}
                        src={getMediaUrl(wallpaperVideoUrl)}
                        className={`w-full h-full object-cover transition-all duration-[400ms] ${roomMode === 'room' ? 'opacity-100 scale-110' : 'opacity-70 scale-100'}`}
                        style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : bannerUrl ? (
                    <img
                        src={getMediaUrl(bannerUrl)}
                        className={`w-full h-full object-cover transition-all duration-[400ms] ${roomMode === 'room' ? 'opacity-100 scale-110' : 'opacity-60 scale-100'}`}
                        style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                    />
                ) : null}
                <div className={`absolute inset-0 bg-black transition-opacity duration-[400ms] ${roomMode === 'room' ? 'opacity-20' : 'opacity-60'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }} />
            </div>
            <div className="desk-surface" />
            <CyberDust />

            {/* Profile Return Navigation (Room View Only) */}
            {roomMode === 'room' && (
                <>
                    <div className="absolute top-6 left-6 z-[200] flex items-center gap-4">
                        {onExitProfile && (
                            <button
                                onClick={onExitProfile}
                                className="p-2 bg-black/40 backdrop-blur-md border border-white/20 text-white/70 hover:bg-white/10 hover:text-white transition-all rounded-full"
                                title="Return to Previous Location"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        {!isMe && onMessageClick && (
                            <button
                                onClick={onMessageClick}
                                className="hidden lg:block p-2 bg-[var(--text-color)]/10 backdrop-blur-md border border-[var(--text-color)]/30 text-[var(--text-color)] hover:bg-[var(--text-color)] hover:text-black transition-all rounded-full shadow-[0_0_15px_rgba(var(--text-color-rgb),0.2)]"
                                title="Send Message"
                            >
                                <MessageSquare size={20} />
                            </button>
                        )}
                    </div>
                    {!isMe && onMessageClick && (
                        <div className="absolute top-6 right-6 z-[200] lg:hidden">
                            <button
                                onClick={onMessageClick}
                                className="p-2 bg-[var(--text-color)]/10 backdrop-blur-md border border-[var(--text-color)]/30 text-[var(--text-color)] hover:bg-[var(--text-color)] hover:text-black transition-all rounded-full shadow-[0_0_15px_rgba(var(--text-color-rgb),0.2)]"
                                title="Send Message"
                            >
                                <MessageSquare size={20} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Identity Overlay - Only show in Room mode to avoid redundancy with Social Sidebar */}
            {roomMode === 'room' && (
                <div className="profile-identity-overlay">
                    <div className="identity-container">
                        <div className="flex flex-col items-center gap-1">
                            <div className="text-[6px] mono text-[var(--text-color)] opacity-40 uppercase tracking-[3px] mb-1">Hardware_Profile_v4.2</div>
                            <div className="identity-pic">
                                {profileImageUrl ? (
                                    <img
                                        src={getMediaUrl(profileImageUrl)}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[var(--text-color)]/20"><Cpu size={32} /></div>
                                )}
                            </div>
                        </div>
                        <div className="identity-text">
                            <div className="flex items-center justify-center gap-3 mb-1">
                                <span className="text-[8px] mono text-[var(--text-color)] opacity-30">[ ONLINE ]</span>
                                <div className="identity-username">{monitorTitle || 'GUEST_USER'}</div>
                                <span className="text-[8px] mono text-[var(--text-color)] opacity-30">[ SYNC_OK ]</span>
                            </div>

                            {communityName && (
                                <div className="flex items-center justify-center mb-3">
                                    <div 
                                        className="px-2 py-0.5 border flex items-center gap-1.5"
                                        style={{ 
                                            borderColor: `${communityColor}40`, 
                                            backgroundColor: `${communityColor}10`,
                                            boxShadow: `0 0 10px ${communityColor}20`
                                        }}
                                    >
                                        <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: communityColor }} />
                                        <span className="mono text-[8px] font-black tracking-[0.2em]" style={{ color: communityColor }}>
                                            [ COLLECTIVE: {communityName.toUpperCase()} ]
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="text-[10px] mono text-white/50 mb-2">{biography || ''}</div>
                            <div className="flex justify-center gap-4 text-[7px] mono text-[var(--text-color)]/40 uppercase tracking-widest">
                                <span>Lat: 34.0522</span>
                                <span>Lng: -118.2437</span>
                                <span>Freq: 104.2MHz</span>
                            </div>

                            <div className="flex items-center justify-center gap-3 mt-4 pointer-events-auto">
                                <button
                                    onClick={() => setRoomMode('monitor')}
                                    className="px-3 py-1.5 bg-[var(--text-color)]/10 border border-[var(--text-color)]/30 text-[var(--text-color)] mono text-[9px] font-bold tracking-widest hover:bg-[var(--text-color)]/20 transition-all flex items-center gap-2"
                                >
                                    <Monitor size={12} /> ENTER_MONITOR
                                </button>
                                {isMe && onGoLive && (
                                    <button
                                        onClick={onGoLive}
                                        className="px-3 py-1.5 bg-[var(--text-color)]/10 border border-[var(--text-color)]/30 text-[var(--text-color)] mono text-[9px] font-bold tracking-widest hover:bg-[var(--text-color)]/20 transition-all flex items-center gap-2"
                                    >
                                        <Radio size={12} /> GO_LIVE
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            <DisplayWall
                tracks={tracks}
                uid={uid}
                gallery={gallery}
                journal={journal}
                playlists={playlists}
                themeColor={activeTheme}
                onExpand={onExpandContent}
                onPlayTrack={onPlayTrack}
                onPlayPlaylist={onPlayPlaylist}
            />

            {/* LEFT SIDE TERMINAL — Desktop only */}
            <div className="hidden xl:flex">
                <SideTerminal
                    title="STATUS_MONITOR"
                    side="left"
                    isOpen={leftOpen}
                    onClose={() => onToggleLeft(false)}
                    roomMode={roomMode}
                >
                    {leftContent}
                </SideTerminal>
            </div>

            <motion.div
                className="monitor-frame frameless"
                initial={roomMode === 'room' ? false : { rotateX: 5, y: 30, opacity: 0, scale: 0.95, translateZ: -100 }}
                animate={roomMode === 'room' ? {
                    rotateX: 25,
                    y: -300,
                    opacity: 0,
                    scale: 0.5,
                    translateZ: -1500,
                    filter: "blur(40px) brightness(0.5)"
                } : {
                    rotateX: 0,
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    translateZ: 0,
                    filter: "blur(0px) brightness(1)"
                }}
                transition={{ type: "tween", duration: 0.8, ease: "easeInOut" }}
            >
                <div className="monitor-screen custom-scrollbar relative">
                    <DataStream />
                    <div className="relative z-10 h-full overflow-y-auto custom-scrollbar pt-16 lg:pt-0 pb-28 lg:pb-12">
                        {/* Consolidated Monitor Navigation - Responsive for Mobile */}
                        <div className="absolute top-4 left-4 right-4 z-[100] flex flex-wrap justify-between gap-2 items-start pointer-events-none">
                            <div className="flex gap-1.5 flex-wrap pointer-events-auto">
                                {isMe && onLogout && (
                                    <button
                                        onClick={onLogout}
                                        className="px-2 lg:px-3 py-1 bg-black/40 backdrop-blur-md border border-[var(--text-color)]/20 text-[var(--text-color)]/60 hover:text-[var(--text-color)] hover:border-[var(--text-color)] transition-all rounded flex items-center gap-1.5 mono text-[8px] lg:text-[9px] font-bold group/logout"
                                    >
                                        <LogOut size={10} className="lg:w-3 lg:h-3 group-hover/logout:animate-pulse" />
                                        LOGOUT
                                    </button>
                                )}
                                {isMe && onModifyId && (
                                    <button
                                        onClick={onModifyId}
                                        className="px-2 lg:px-3 py-1 bg-[var(--text-color)]/10 backdrop-blur-md border border-[var(--text-color)]/30 text-[var(--text-color)] hover:bg-[var(--text-color)] hover:text-black transition-all rounded mono text-[8px] lg:text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(var(--theme-color-rgb),0.2)]"
                                    >
                                        MODIFY_ID
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-1.5 flex-wrap pointer-events-auto">
                                {onExitProfile && (
                                    <button
                                        onClick={onExitProfile}
                                        className="px-2 lg:px-3 py-1 bg-black/40 backdrop-blur-md border border-white/20 text-white/70 hover:bg-white/10 hover:text-white transition-all rounded flex items-center gap-1.5 mono text-[8px] lg:text-[9px] font-bold"
                                        title="Exit to Previous Location"
                                    >
                                        <LogOut size={12} className="lg:w-3.5 lg:h-3.5" /> EXIT_CORE
                                    </button>
                                )}

                                <button
                                    onClick={() => { setRoomMode('room'); document.dispatchEvent(new CustomEvent('exitmonitor')); }}
                                    className="px-2 lg:px-3 py-1 bg-[var(--text-color)]/20 backdrop-blur-md border border-[var(--text-color)]/30 text-[var(--text-color)] hover:bg-[var(--text-color)]/40 transition-all rounded flex items-center gap-1.5 mono text-[8px] lg:text-[9px] font-bold"
                                >
                                    <Maximize2 size={12} className="lg:w-3.5 lg:h-3.5" /> EXIT_MONITOR
                                </button>
                            </div>
                        </div>
                        {children}
                    </div>
                </div>
            </motion.div>

            {/* RIGHT SIDE TERMINAL — Desktop only */}
            <div className="hidden xl:flex">
                <SideTerminal
                    title="ENTITY_METADATA"
                    side="right"
                    isOpen={rightOpen}
                    onClose={() => onToggleRight(false)}
                    roomMode={roomMode}
                >
                    {rightContent}
                </SideTerminal>
            </div>
        </div >
    );
};

const Sector = ({ id, label, items, onExpand, onPlayTrack, onPlayPlaylist }) => {
    if (!items || items.length === 0) return null;
    return (
        <div className="wall-sector">
            <div className="sector-header">
                <div className="sector-tag">SEC_{id}</div>
                <div className="sector-label">{label}</div>
            </div>
            <div className="sector-grid">
                {items.map((item, i) => (
                    <div
                        key={`${item.type}_${item.id}_${i}`}
                        className={`wall-item ${item.type === 'VIDEO' ? 'video-panel' : 'media-print'} group`}
                        style={{ transitionDelay: `${i * 0.05}s` }}
                        onClick={() => onExpand({ ...item.original, type: item.type })}
                    >
                        {item.type === 'VIDEO' ? (
                            <div className="video-panel-content">
                                <Video size={48} strokeWidth={1} />
                                <div className="mt-2 text-[8px] mono text-cyan-400 opacity-40 uppercase tracking-widest">
                                    SIGNAL_ACTIVE
                                </div>
                            </div>
                        ) : (
                            (item.url || item.type === 'PLAYLIST') ? (
                                <img
                                    src={getMediaUrl(item.url)}
                                    alt={item.title}
                                    className={item.type === 'PLAYLIST' ? 'grayscale opacity-60' : ''}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] text-[var(--text-color)]/20 p-2 text-center group">
                                    {item.type === 'JOURNAL' ? <Book size={20} className="group-hover:text-[var(--text-color)] transition-colors" /> :
                                        item.type === 'PLAYLIST' ? <Database size={20} className="group-hover:text-[var(--text-color)] transition-colors" /> :
                                            <Music size={20} />}
                                    {(item.type === 'JOURNAL' || item.type === 'PLAYLIST') && (
                                        <div className="mt-1 text-[5px] mono opacity-20 truncate w-full uppercase px-2">
                                            {item.title}
                                        </div>
                                    )}
                                </div>
                            )
                        )}

                        {/* Quick Play Hover Trigger */}
                        {(item.type === 'TRACK' || item.type === 'PLAYLIST') && (
                            <button
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.type === 'TRACK') onPlayTrack(item.original);
                                    else if (item.type === 'PLAYLIST') onPlayPlaylist(item.original.tracks || [], 0);
                                }}
                            >
                                <Play size={24} fill="currentColor" className="text-[var(--text-color)] drop-shadow-[0_0_10px_rgba(var(--text-color-rgb),0.5)]" />
                            </button>
                        )}

                        <div className="wall-label">
                            {item.type}_{String(item.title || 'UNTITLED').toUpperCase().replace(/\s+/g, '_')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};



const DisplayWall = ({ tracks: originalTracks, uid, gallery, journal = [], playlists = [], themeColor, onExpand, onPlayTrack, onPlayPlaylist }) => {
    // 1. Group items by logical sectors
    const sectors = {
        AUDIO: [],
        VISUAL: [],
        LOGS: []
    };

    // Tracks & Playlists (AUDIO) - Filtered by owner
    const targetUserId = originalTracks?.[0]?.artistUserId || originalTracks?.[0]?.ArtistUserId; // Helper just for this block

    if (Array.isArray(originalTracks)) {
        originalTracks.filter(t => {
            const tUserId = t.artistUserId || t.ArtistUserId ||
                t.album?.artist?.userId || t.Album?.Artist?.UserId ||
                t.album?.Artist?.UserId || t.Album?.artist?.userId;
            return String(tUserId) === String(uid);
        }).forEach(t => {
            const cover = t.cover || t.coverImage || t.CoverImage || t.imageUrl || t.ImageUrl || t.coverImageUrl || t.CoverImageUrl;
            if (isTruthy(t.IsPosted || t.isPosted)) {
                sectors.AUDIO.push({ id: t.id || t.Id, type: 'TRACK', title: t.title || t.Title, url: cover, original: t });
            }
        });
    }

    if (Array.isArray(playlists)) {
        playlists.forEach(p => {
            if (isTruthy(p.IsPosted || p.isPosted)) {
                sectors.AUDIO.push({ id: p.id || p.Id, type: 'PLAYLIST', title: p.name || p.Name, url: p.imageUrl || p.ImageUrl, original: p });
            }
        });
    }

    // Gallery (VISUAL) - Filtered by owner
    if (Array.isArray(gallery)) {
        gallery.filter(c => String(c.UserId || c.userId) === String(uid))
            .forEach(c => {
                if (isTruthy(c.IsPosted || c.isPosted)) {
                    sectors.VISUAL.push({ id: c.id || c.Id, type: c.Type, title: c.Title, url: c.Url, original: c });
                }
            });
    }

    // Journal (LOGS) - Filtered by owner
    if (Array.isArray(journal)) {
        journal.filter(j => String(j.UserId || j.userId) === String(uid))
            .forEach(j => {
                if (isTruthy(j.IsPosted || j.isPosted)) {
                    sectors.LOGS.push({ id: j.id || j.Id, type: 'JOURNAL', title: j.title || j.Title, url: null, original: j });
                }
            });
    }

    return (
        <div className="display-wall no-scrollbar">
            <Sector id="01" label="AUDIO_SIGNALS" items={sectors.AUDIO} onExpand={onExpand} onPlayTrack={onPlayTrack} onPlayPlaylist={onPlayPlaylist} />
            <Sector id="02" label="VISUAL_ARCHIVE" items={sectors.VISUAL} onExpand={onExpand} onPlayTrack={onPlayTrack} onPlayPlaylist={onPlayPlaylist} />
            <Sector id="03" label="CORE_MEMORIES" items={sectors.LOGS} onExpand={onExpand} onPlayTrack={onPlayTrack} onPlayPlaylist={onPlayPlaylist} />
        </div>
    );
};

const AlbumWall = ({ tracks, themeColor }) => {
    // Only show tracks with cover images
    const tracksWithCovers = Array.isArray(tracks) ? tracks
        .filter(t => t.coverImageUrl || t.CoverImageUrl)
        .slice(0, 8) : []; // Limit to top 8

    return (
        <div className="album-wall">
            {tracksWithCovers.map((track, i) => (
                <div key={track.id || track.Id || i} className="album-file" style={{ transitionDelay: `${i * 0.1}s` }}>
                    <div className="album-cover-frame">
                        <img
                            src={getMediaUrl(track.coverImageUrl || track.CoverImageUrl)}
                            alt={track.title}
                        />
                    </div>
                    <div className="album-filename">
                        {String(track.title || 'UNKNOWN').toUpperCase().replace(/\s+/g, '_')}.DAT
                    </div>
                </div>
            ))}
        </div>
    );
};

// PeripheralDock removed in favor of decentralized HUD toggles


// --- VISTA: PERFIL (DISEÑO SLAVA KORNILOV) ---
export const ProfileView = React.memo(({
    user: currentUser, tracks: allTracks, onLogout, onAddCredits, onRefreshProfile, onRefreshTracks,
    targetUserId,
    navigateToProfile,
    onPlayPlaylist,
    onPlayTrack,
    playlists: currentUserPlaylists = [], // Prop from App (current user's playlists)
    initialModal,
    onClearInitialModal,
    activeStation,
    stationChat,
    stationQueue,
    isPlaying,
    onExitProfile,
    onMessageUser,
    setActiveStation
}) => {
    const effectiveId = targetUserId || currentUser?.id || currentUser?.Id;
    const isMe = String(effectiveId) === String(currentUser?.id || currentUser?.Id);

    const { showNotification } = useNotification();
    const [activeTab, setActiveTab] = useState('Music');
    const [studioSubTab, setStudioSubTab] = useState('All');

    // Profile Data State
    const [profileData, setProfileData] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [profileTracks, setProfileTracks] = useState([]);
    const [profileJournal, setProfileJournal] = useState([]);
    const [profileGallery, setProfileGallery] = useState([]);
    const [myLikes, setMyLikes] = useState([]);

    const [isAboutOpen, setIsAboutOpen] = useState(true);
    const [isStatsOpen, setIsStatsOpen] = useState(true);

    const [showUpload, setShowUpload] = useState(false);
    const [showGoLiveModal, setShowGoLiveModal] = useState(false);
    const [goLiveFormData, setGoLiveFormData] = useState({ sessionTitle: '', description: '', isChatEnabled: true, isQueueEnabled: true });
    const [showSettings, setShowSettings] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [broadcasterTab, setBroadcasterTab] = useState('requests');

    const [leftOpen, setLeftOpen] = useState(false);
    const [rightOpen, setRightOpen] = useState(false);
    const [roomMode, setRoomMode] = useState('room');


    // Sync profileData with currentUser for "Me" view to ensure instant updates
    useEffect(() => {
        if (isMe && currentUser) {
            setProfileData(currentUser);
        }
    }, [currentUser, isMe]);

    // Auto-Room Mode for Mobile
    useEffect(() => {
        const isMobile = window.innerWidth < 1024;
        if (isMobile) {
            // setRoomMode('room'); // User wants to preserve monitor space on mobile
        }
    }, []);

    const [showIngestMenu, setShowIngestMenu] = useState(false);
    const [selectedContent, setSelectedContent] = useState(null);
    const [expandedEntries, setExpandedEntries] = useState({});
    const [showJournalForm, setShowJournalForm] = useState(false);
    const [stationData, setStationData] = useState(null);
    const [isStationFavorited, setIsStationFavorited] = useState(false);

    const displayUser = isMe ? currentUser : profileData;

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
        const title = sessionTitle || goLiveFormData.sessionTitle;
        const desc = description || goLiveFormData.description;
        if (!title) {
            showNotification("BROADCAST_ERROR", "A session title is required to go live.", "error");
            return;
        }
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Stations.goLive({
                SessionTitle: title,
                Description: desc || null,
                IsChatEnabled: goLiveFormData.isChatEnabled,
                IsQueueEnabled: goLiveFormData.isQueueEnabled
            });
            showNotification("BROADCAST_ACTIVE", "Signal established. Frequency is now LIVE.", "success");
            setShowGoLiveModal(false);
            setGoLiveFormData({ sessionTitle: '', description: '', isChatEnabled: true, isQueueEnabled: true });
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

    // Selected Playlist State
    const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
    const [playlistDetails, setPlaylistDetails] = useState(null); // { Playlist, Tracks }
    const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);



    // Fetch Playlists — always on mount/profile change so SEQ_MAPS stat is accurate
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

    const handleCreatePlaylist = async (_e) => {
        _e.preventDefault();
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Playlists.create({
                Name: newPlaylistName,
                IsPublic: isPlaylistPublic,
                Description: ''
            }); // DTO expects PascalCase keys or matching properties
            setShowCreatePlaylist(false);
            setNewPlaylistName('');
            // Refresh
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
                    isOwned: t.isOwned !== undefined ? t.isOwned : (t.IsOwned !== undefined ? t.IsOwned : true) // Default to true for playlist items if not specified
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
            await API.Users.updateProfile(formData, uid);
            showNotification("PROFILE_SYNCED", "Identity modifications committed to core.", "success");
            setShowEditProfile(false);
            onRefreshProfile?.();
        } catch (error) {
            console.error("Profile Sync Error:", error);
            showNotification("SYNC_FAILED", "Failed to commit modifications to core.", "error");
            throw error;
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
                } else {
                    const userRes = await API.Users.getUserById(effectiveId).catch(() => ({ data: null }));
                    if (userRes.data) {
                        setProfileData(userRes.data);
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
                }
                setProfileTracks(filtered);

                try {
                    const [jRes, gRes, sRes, fvRes] = await Promise.all([
                        isMe ? API.Journal.getMyJournal().catch(() => ({ data: [] })) : API.Journal.getUserJournal(effectiveId).catch(() => ({ data: [] })),
                        isMe ? API.Studio.getMyGallery().catch(() => ({ data: [] })) : API.Studio.getUserGallery(effectiveId).catch(() => ({ data: [] })),
                        API.Stations.getByUserId(effectiveId).catch(() => ({ data: null })),
                        API.Stations.getFavorites().catch(() => ({ data: [] }))
                    ]);
                    setProfileJournal(jRes.data || []);
                    setProfileGallery(gRes.data || []);
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


    // Handle Initial Modal Triggers from Feed/Discovery
    React.useEffect(() => {
        if (initialModal) {
            console.log(`[PROFILE_TRIGGER] Initializing modal: ${initialModal}`);
            if (initialModal === 'post' || initialModal === 'studio') {
                setActiveTab('Studio');
                setStudioSubTab('All'); // User requested "all posts" tab within Studio
            } else if (initialModal === 'upload') {
                setActiveTab('Music');
                setShowUpload(true);
            }
            // Clear the trigger after handling
            if (onClearInitialModal) onClearInitialModal();
        }
    }, [initialModal, onClearInitialModal]);

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

    return (
        <>
            <SpatialRoomLayout
                monitorTitle={isLoadingProfile ? 'INITIALIZING_LINK...' : (displayUser?.username || displayUser?.Username || 'GUEST_USER')}
                leftOpen={leftOpen}
                rightOpen={rightOpen}
                onToggleLeft={setLeftOpen}
                onToggleRight={setRightOpen}
                roomMode={roomMode}
                setRoomMode={setRoomMode}
                isPlaying={isPlaying}
                onUpload={() => setShowUpload(true)}
                onGoLive={() => setShowGoLiveModal(true)}
                onModifyId={() => setShowEditProfile(true)}
                onLogout={onLogout}
                onExpandContent={setSelectedContent}
                gallery={profileGallery}
                tracks={profileTracks}
                journal={isMe ? profileJournal : profileJournal.filter(j => j.IsPosted)}
                bannerUrl={displayUser?.bannerUrl || displayUser?.BannerUrl}
                wallpaperVideoUrl={displayUser?.wallpaperVideoUrl || displayUser?.WallpaperVideoUrl}
                profileImageUrl={displayUser?.profilePictureUrl || displayUser?.ProfilePictureUrl || displayUser?.profileImageUrl || displayUser?.ProfileImageUrl}
                biography={displayUser?.biography || displayUser?.Biography || displayUser?.bio}
                themeColor={displayUser?.themeColor || displayUser?.ThemeColor}
                textColor={displayUser?.textColor || displayUser?.TextColor}
                backgroundColor={displayUser?.backgroundColor || displayUser?.BackgroundColor}
                isGlass={displayUser?.isGlass || displayUser?.IsGlass}
                // Override with preview values if editing (and isMe)
                previewThemeColor={isMe && showEditProfile ? profileData?.previewThemeColor : null}
                previewTextColor={isMe && showEditProfile ? profileData?.previewTextColor : null}
                previewBackgroundColor={isMe && showEditProfile ? profileData?.previewBackgroundColor : null}
                previewIsGlass={isMe && showEditProfile ? profileData?.previewIsGlass : null}
                playlists={profilePlaylists}
                uid={effectiveId}
                onPlayTrack={onPlayTrack}
                onPlayPlaylist={onPlayPlaylist}
                isMe={isMe}
                onExitProfile={onExitProfile}
                onMessageClick={() => onMessageUser && onMessageUser(displayUser)}
                communityId={displayUser?.communityId || displayUser?.CommunityId}
                communityName={displayUser?.communityName || displayUser?.CommunityName}
                communityColor={displayUser?.communityColor || displayUser?.CommunityColor}
                leftContent={
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// BIOMETRIC_ID</div>
                            <div className="aspect-square border border-[var(--text-color)]/30 p-1 relative group bg-black overflow-hidden">
                                {(() => {
                                    const pfp = displayUser?.profilePictureUrl || displayUser?.ProfilePictureUrl || displayUser?.profileImageUrl || displayUser?.ProfileImageUrl;
                                    if (pfp) {
                                        return <img src={getMediaUrl(pfp)} className="w-full h-full object-cover" />;
                                    }
                                    return <div className="w-full h-full flex items-center justify-center text-[var(--text-color)]/20"><Cpu size={40} /></div>;
                                })()}
                                <div className="absolute inset-0 bg-[var(--text-color)]/5 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-[var(--text-color)]/5">
                            <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// SYSTEM_STATS</div>
                            <StatItem label="DAT_SIGNALS" value={isMe ? (allTracks?.filter(t => String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)).length || 0) : profileTracks.length} />
                            <StatItem label="SEQ_MAPS" value={profilePlaylists.length} />
                            <StatItem label="TOTAL_SCANS" value={(isMe ? (allTracks || []).filter(t => !String(t.id).startsWith('mock-') && String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)) : profileTracks).reduce((acc, t) => acc + (t.playCount || 0), 0).toLocaleString()} />
                        </div>

                        <div className="space-y-2 pt-6 border-t border-[var(--text-color)]/5">
                            <div className="flex items-center gap-2 text-[var(--text-color)] animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-color)]" />
                                <span className="text-[9px] font-bold tracking-[0.3em] uppercase">LINK_ACTIVE</span>
                            </div>
                            <div className="text-[8px] text-[var(--text-color)]/20 mono break-all">
                                ADDR::0x7F21_{displayUser?.id || 'XXXX'}_SIG_OK
                            </div>
                        </div>
                    </div>
                }
                rightContent={
                    <div className="space-y-8">
                        {isMe && stationData && (
                            <div className="space-y-4">
                                <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// BROADCAST_PROTOCOL</div>
                                {stationData.isLive || stationData.IsLive ? (
                                    <button
                                        onClick={handleEndLive}
                                        className="w-full py-4 border border-[var(--text-color)] bg-[var(--text-color)]/20 text-[var(--text-color)] font-bold text-[10px] uppercase transition-all shadow-[0_0_20px_rgba(var(--text-color-rgb),0.2)] hover:bg-[var(--text-color)] hover:text-black"
                                    >
                                        [ TERMINATE_BROADCAST ]
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowGoLiveModal(true)}
                                        className="w-full py-4 border border-[var(--text-color)] bg-black text-[var(--text-color)] font-bold text-[10px] uppercase transition-all hover:bg-[var(--text-color)] hover:text-black shadow-[0_0_15px_rgba(var(--text-color-rgb),0.1)]"
                                    >
                                        [ GO_LIVE ]
                                    </button>
                                )}
                            </div>
                        )}
                        {!isMe && (
                            <div className="space-y-4">
                                <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// ACTION_PROTOCOL</div>
                                <button
                                    onClick={handleFollow}
                                    className={`w-full py-4 border font-bold text-[10px] uppercase transition-all transform hover:-translate-y-0.5 ${isFollowing
                                        ? 'bg-[var(--text-color)]/10 text-[var(--text-color)] border-[var(--text-color)] shadow-[0_0_20px_rgba(var(--text-color-rgb),0.2)]'
                                        : 'bg-black text-[var(--text-color)] border-[var(--text-color)]/20 hover:border-[var(--text-color)] hover:text-[var(--text-color)]'
                                        }`}
                                >
                                    {isFollowing ? '[ DISCONNECT_LINK ]' : '[ ESTABLISH_LINK ]'}
                                </button>
                                {stationData && (
                                    <button
                                        onClick={handleToggleStationFavorite}
                                        className={`w-full py-4 border font-bold text-[10px] uppercase transition-all transform hover:-translate-y-0.5 mt-2 ${isStationFavorited
                                            ? 'bg-[var(--text-color)] text-black border-[var(--text-color)] shadow-[0_0_20px_rgba(var(--text-color-rgb),0.4)]'
                                            : 'bg-black text-[var(--text-color)] border-[var(--text-color)]/20 hover:border-[var(--text-color)] hover:bg-[var(--text-color)]/5'
                                            }`}
                                    >
                                        {isStationFavorited ? `[ DISCONNECT_FREQ_${stationData.frequency || 'LINK'} ]` : `[ FAVORITE_FREQ_${stationData.frequency || 'LINK'} ]`}
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="space-y-4">
                            <NeuroGraph userId={effectiveId} />
                        </div>

                        <div className="space-y-4">
                            <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// IDENTITY_BIO</div>
                            <div className="text-[10px] text-[var(--text-color)]/80 leading-relaxed mono break-words border-l border-[var(--text-color)]/20 pl-4 py-2">
                                {displayUser?.biography || displayUser?.bio || '> NO_BIOMETRIC_DATA_AVAILABLE'}
                            </div>
                        </div>


                        <div className="space-y-4 pt-4 border-t border-[var(--text-color)]/5">
                            <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// PINNED_SIGNALS</div>
                            <div className="space-y-4">
                                {[...profileTracks, ...profileGallery, ...profilePlaylists].filter(item => isTruthy(item.isPinned || item.IsPinned))
                                    .slice(0, 3)
                                    .map((item, i) => (
                                        <div key={`pinned_${i}`} className="flex gap-3 items-center group cursor-pointer" onClick={() => {
                                            const type = item.Type || (item.name ? 'PLAYLIST' : 'TRACK');
                                            if (type === 'TRACK') onPlayTrack?.(item);
                                            else if (type === 'PLAYLIST') onPlayPlaylist?.(item.tracks || [], 0);
                                            else setSelectedContent?.({ ...item, type });
                                        }}>
                                            <div className="w-10 h-10 border border-white text-black bg-white flex-shrink-0 overflow-hidden shadow-[0_0_10px_#fff]">
                                                {(item.cover || item.Url || item.imageUrl || item.ImageUrl) ? (
                                                    <img
                                                        src={getMediaUrl(item.cover || item.Url || item.imageUrl || item.ImageUrl)}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        {item.Type === 'VIDEO' ? <Video size={14} /> : item.name ? <Database size={14} /> : <Music size={14} />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[7px] mono text-white tracking-widest uppercase truncate">{item.Type || (item.name ? 'PLAYLIST' : 'AUDIO_SIGNAL')}</div>
                                                <div className="text-[9px] mono text-white truncate uppercase">{item.title || item.Title || item.name || item.Name}</div>
                                            </div>
                                            <Star size={10} className="text-white fill-white" />
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-[var(--text-color)]/5">
                            <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// LATEST_TRANSMISSIONS</div>
                            <div className="space-y-4">
                                {[...profileTracks, ...profileGallery, ...profilePlaylists].filter(item => isTruthy(item.isPosted || item.IsPosted))
                                    .sort((a, b) => new Date(b.createdAt || b.CreatedAt || b.UploadDate || 0) - new Date(a.createdAt || a.CreatedAt || a.UploadDate || 0))
                                    .slice(0, 5)
                                    .map((item, i) => (
                                        <div key={i} className="flex gap-3 items-center group cursor-pointer" onClick={() => {
                                            const type = item.Type || (item.name ? 'PLAYLIST' : 'TRACK');
                                            if (type === 'TRACK') onPlayTrack?.(item);
                                            else if (type === 'PLAYLIST') onPlayPlaylist?.(item.tracks || [], 0);
                                            else setSelectedContent?.({ ...item, type });
                                        }}>
                                            <div className="w-10 h-10 border border-[var(--text-color)]/20 flex-shrink-0 overflow-hidden bg-black/40">
                                                {(item.cover || item.Url) ? (
                                                    <img
                                                        src={(item.cover || item.Url).startsWith('http') ? (item.cover || item.Url) : `${API_BASE_URL}${item.cover || item.Url}`}
                                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[var(--text-color)]/40">
                                                        {item.Type === 'VIDEO' ? <Video size={14} /> : <Music size={14} />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[7px] mono text-[var(--text-color)] tracking-widest uppercase truncate">{item.Type || 'AUDIO_SIGNAL'}</div>
                                                <div className="text-[9px] mono text-white/60 truncate uppercase">{item.title || item.Title}</div>
                                            </div>
                                        </div>
                                    ))}
                                  {profileTracks.length === 0 && profileGallery.length === 0 && (
                                    <div className="text-[8px] mono text-white/20 uppercase italic">
                                        &gt; NO_RECENT_TRANSMISSIONS
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                }
            >
                <div className="social-monitor-grid">
                    {/* Left Side: Profile Sidebar (Fotolog Style) */}
                    <aside className="social-sidebar">
                        <div className="social-profile-card relative">
                            {!isMe && onMessageUser && (
                                <button
                                    onClick={() => onMessageUser(displayUser)}
                                    className="absolute top-4 left-4 p-1.5 bg-[var(--text-color)]/10 border border-[var(--text-color)]/30 text-[var(--text-color)] hover:bg-[var(--text-color)] hover:text-black transition-all rounded lg:hidden z-[100]"
                                    title="Send Message"
                                >
                                    <MessageSquare size={16} />
                                </button>
                            )}
                            <div className="social-pic-frame">
                                {(() => {
                                    const pfp = displayUser?.profilePictureUrl || displayUser?.ProfilePictureUrl || displayUser?.profileImageUrl || displayUser?.ProfileImageUrl;
                                    if (pfp) {
                                        return <img src={getMediaUrl(pfp)} alt={displayUser?.username} />;
                                    }
                                    return <div className="w-full h-full flex items-center justify-center text-[var(--text-color)]/20"><Cpu size={32} /></div>;
                                })()}
                            </div>
                            <div className="social-info mt-6">
                                <h1 className="social-name">{displayUser?.username || displayUser?.Username || 'GUEST_USER'}</h1>
                                {(displayUser?.communityName || displayUser?.CommunityName) && (
                                    <div className="mt-2 flex">
                                        <div 
                                            className="px-2 py-0.5 border flex items-center gap-1.5"
                                            style={{ 
                                                borderColor: `${displayUser?.communityColor || displayUser?.CommunityColor || '#ff006e'}40`, 
                                                backgroundColor: `${displayUser?.communityColor || displayUser?.CommunityColor || '#ff006e'}10`,
                                                boxShadow: `0 0 10px ${displayUser?.communityColor || displayUser?.CommunityColor || '#ff006e'}10`
                                            }}
                                        >
                                            <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: displayUser?.communityColor || displayUser?.CommunityColor || '#ff006e' }} />
                                            <span className="mono text-[8px] font-black tracking-[0.2em]" style={{ color: displayUser?.communityColor || displayUser?.CommunityColor || '#ff006e' }}>
                                                [ {String(displayUser?.communityName || displayUser?.CommunityName).toUpperCase()} ]
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="social-bio-text mt-4">
                                    {displayUser?.biography || displayUser?.bio || ''}
                                </div>

                                <div className="social-stats mt-8 space-y-2">
                                    <div className="flex justify-between text-[8px] mono opacity-40">
                                        <span>SIGNALS:</span>
                                        <span>{profileTracks.length}</span>
                                    </div>
                                    <div className="flex justify-between text-[8px] mono opacity-40">
                                        <span>ARCHIVE:</span>
                                        <span>{profileGallery.length}</span>
                                    </div>
                                    <div className="flex justify-between text-[8px] mono opacity-40">
                                        <span>STATUS:</span>
                                        <span className="text-[var(--text-color)]">ONLINE</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </aside>

                    {/* Right Side: Content Area */}
                    <div className="social-main-pane">
                        {activeTab === 'Broadcast' ? (
                            // --- BROADCASTER DASHBOARD ---
                            <div className="flex flex-col h-full animate-in fade-in duration-500">
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--text-color)]/20">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full bg-[var(--text-color)] animate-pulse shadow-[0_0_10px_var(--text-color)]" />
                                        <div>
                                            <h2 className="text-[14px] font-black uppercase text-[var(--text-color)] tracking-widest">BROADCASTER DASHBOARD</h2>
                                            <p className="text-[10px] text-[var(--text-color)]/60 font-mono uppercase mt-1">
                                                FREQ: {(activeStation || stationData)?.frequency || (activeStation || stationData)?.Frequency} // {(activeStation || stationData)?.listenerCount || (activeStation || stationData)?.ListenerCount || 0} LISTENERS
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleEndLive}
                                        className="px-4 py-2 bg-[var(--text-color)]/20 border border-[var(--text-color)]/60 text-[var(--text-color)] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[var(--text-color)] hover:text-black transition-all shadow-[0_0_15px_var(--text-color)]"
                                    >
                                        END BROADCAST
                                    </button>
                                </div>
                                <div className="flex-1 min-h-0 flex flex-col">
                                    {/* Mobile Sub-tabs for Broadcaster Dashboard */}
                                    <div className="flex lg:hidden mb-4 border-b border-[var(--text-color)]/20">
                                        <button
                                            onClick={() => setBroadcasterTab('requests')}
                                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${broadcasterTab === 'requests' ? 'text-[var(--text-color)] border-b-2 border-[var(--text-color)]' : 'text-[var(--text-color)]/40'}`}
                                        >
                                            REQUESTS
                                        </button>
                                        <button
                                            onClick={() => setBroadcasterTab('chat')}
                                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${broadcasterTab === 'chat' ? 'text-[var(--text-color)] border-b-2 border-[var(--text-color)]' : 'text-[var(--text-color)]/40'}`}
                                        >
                                            COMM_LINK
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
                                        {/* Request Queue Column */}
                                        <div className={`flex flex-col bg-black/40 border border-[var(--text-color)]/10 rounded-sm overflow-hidden ${broadcasterTab !== 'requests' ? 'hidden lg:flex' : 'flex'}`}>
                                            <div className="p-3 bg-[var(--text-color)]/10 border-b border-[var(--text-color)]/20 text-[10px] font-black uppercase text-[var(--text-color)] tracking-widest flex justify-between items-center">
                                                <span>REQUEST_QUEUE</span>
                                                <span className="text-[var(--text-color)]/60">[{stationQueue?.length || 0}]</span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                                {stationQueue && stationQueue.length > 0 ? stationQueue.map((req, idx) => (
                                                    <div key={idx} className="p-3 border border-[var(--text-color)]/20 bg-black hover:border-[var(--text-color)]/60 transition-colors flex justify-between items-center group">
                                                        <div>
                                                            <div className="text-[11px] font-bold text-white tracking-wider">{req.trackTitle}</div>
                                                            <div className="text-[9px] text-[var(--text-color)] font-mono mt-1">REQ_BY: {req.username}</div>
                                                        </div>
                                                        {allTracks && (
                                                            <button 
                                                                onClick={async () => {
                                                                    const matchIdx = allTracks.findIndex(t => t.id === req.trackId || t.Id === req.trackId);
                                                                    if (matchIdx !== -1 && onPlayPlaylist) {
                                                                        onPlayPlaylist(allTracks, matchIdx);
                                                                    }
                                                                }}
                                                                className="w-8 h-8 rounded-full border border-[var(--text-color)]/40 flex items-center justify-center text-[var(--text-color)] group-hover:bg-[var(--text-color)] group-hover:text-black transition-all"
                                                            >
                                                                <Play size={14} fill="currentColor" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )) : (
                                                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-[10px] font-mono uppercase text-[var(--text-color)] text-center p-8">
                                                        <Radio size={24} className="mb-4 opacity-50 block mx-auto" />
                                                        WAITING FOR INCOMING REQUESTS...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Comm Link Chat Column */}
                                        <div className={`flex flex-col bg-black/40 border border-[var(--text-color)]/10 rounded-sm overflow-hidden ${broadcasterTab !== 'chat' ? 'hidden lg:flex' : 'flex'}`}>
                                            <div className="p-3 bg-[var(--text-color)]/10 border-b border-[var(--text-color)]/20 text-[10px] font-black uppercase text-[var(--text-color)] tracking-widest">
                                                LIVE_COMM_LINK
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                                {stationChat && stationChat.length > 0 ? stationChat.map((msg, idx) => (
                                                    <div key={idx} className="font-mono text-[10px]">
                                                        <span className="text-[var(--text-color)] font-bold">[{msg.username}]</span> <span className="text-white/80">{msg.message}</span>
                                                    </div>
                                                )) : (
                                                    <div className="h-full flex items-center justify-center opacity-30 text-[10px] font-mono uppercase text-[var(--text-color)]">
                                                        COMM LINK IDLE...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0 flex flex-col">
                                <div className="social-tabs-header flex flex-col md:flex-row justify-between items-center mb-4 lg:mb-10 pb-2 lg:pb-6 border-b border-[var(--text-color)]/10 gap-4">
                                    <div className="flex gap-2 lg:gap-4 flex-wrap justify-center">
                                        <button
                                            onClick={() => setActiveTab('Music')}
                                            className={`text-[9px] lg:text-[10px] font-bold tracking-[0.2em] lg:tracking-[0.4em] uppercase transition-all ${activeTab === 'Music' ? 'text-[var(--text-color)]' : 'text-[var(--text-color)]/20 hover:text-[var(--text-color)]'}`}
                                        >
                                            [ MUSIC ]
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('Playlists')}
                                            className={`text-[9px] lg:text-[10px] font-bold tracking-[0.2em] lg:tracking-[0.4em] uppercase transition-all ${activeTab === 'Playlists' ? 'text-[var(--text-color)]' : 'text-[var(--text-color)]/20 hover:text-[var(--text-color)]'}`}
                                        >
                                            [ PLAYLISTS ]
                                        </button>
                                        {isMe && stationData && (stationData.isLive || stationData.IsLive) && (
                                            <button
                                                onClick={() => setActiveTab('Broadcast')}
                                                className={`text-[9px] lg:text-[10px] font-bold tracking-[0.2em] lg:tracking-[0.4em] uppercase transition-all ${activeTab === 'Broadcast' ? 'text-[var(--text-color)]' : 'text-[var(--text-color)]/20 hover:text-[var(--text-color)]'}`}
                                            >
                                                [ BROADCAST ]
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setActiveTab('Studio')}
                                            className={`text-[9px] lg:text-[10px] font-bold tracking-[0.2em] lg:tracking-[0.4em] uppercase transition-all ${activeTab === 'Studio' ? 'text-[var(--text-color)]' : 'text-[var(--text-color)]/20 hover:text-[var(--text-color)]'}`}
                                        >
                                            [ JOURNAL ]
                                        </button>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        {isMe && activeTab === 'Music' && (
                                                <button
                                                    onClick={() => setShowUpload(true)}
                                                    className="px-4 py-1.5 bg-[var(--text-color)]/10 border border-[var(--text-color)]/30 text-[var(--text-color)] text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-[var(--text-color)] hover:text-black transition-all flex items-center gap-2 rounded-sm mr-2"
                                                    title="Upload Signal"
                                                >
                                                    <Plus size={12} /> UPLOAD_SIGNAL
                                                </button>
                                        )}
                                        {!isMe && onMessageUser && (
                                            <button
                                                onClick={() => onMessageUser(displayUser)}
                                                className="p-1.5 bg-[var(--text-color)]/10 border border-[var(--text-color)]/30 text-[var(--text-color)] hover:bg-[var(--text-color)] hover:text-black transition-all rounded hidden lg:block"
                                                title="Send Message"
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Tab Content */}
                                {activeTab === 'Music' && (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {profileTracks
                                    .sort((a, b) => {
                                        const aPosted = isTruthy(a.IsPosted || a.isPosted) ? 1 : 0;
                                        const bPosted = isTruthy(b.IsPosted || b.isPosted) ? 1 : 0;
                                        if (bPosted !== aPosted) return bPosted - aPosted;

                                        const dateA = new Date(a.CreatedAt || a.createdAt || 0).getTime();
                                        const dateB = new Date(b.CreatedAt || b.createdAt || 0).getTime();
                                        return dateB - dateA;
                                    })
                                    .map((track, idx) => (
                                        <div
                                            key={track.id || `track-${idx}`}
                                            className="flex items-center justify-between p-4 bg-transparent border-b border-white/5 hover:border-[var(--text-color)]/30 transition-all group backdrop-blur-[2px] cursor-pointer"
                                            onClick={() => onPlayTrack(track)}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="w-10">
                                                    <span className="text-[10px] text-[var(--text-color)]/20 font-bold mono">[{String(idx + 1).padStart(2, '0')}]</span>
                                                </div>
                                                <div className="w-8 h-8 border border-white/10 bg-black overflow-hidden relative grayscale group-hover:grayscale-0 transition-all">
                                                    {track.cover ? (
                                                        <img src={track.cover} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-color)]/20"><Music size={14} /></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-[var(--text-color)] uppercase tracking-wider group-hover:text-[var(--text-color)]">{track.title}</div>
                                                    <div className="text-[9px] text-[var(--text-color)]/30 uppercase mt-1">SIG_TYPE: {track.genre || 'CORE'} // {track.playCount || 0} READS</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {isMe && (
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    const API = await import('../services/api').then(mod => mod.default);
                                                                    await API.Tracks.togglePost(track.id || track.Id);
                                                                    const isPostedNow = !isTruthy(track.isPosted || track.IsPosted);
                                                                    // Optimistic Update
                                                                    setProfileTracks(prev => prev.map(t => (String(t.id) === String(track.id)) ? { ...t, isPosted: isPostedNow, IsPosted: isPostedNow } : t));
                                                                    showNotification(isPostedNow ? "SIGNAL_BROADCAST" : "SIGNAL_REDACTED", `TRACK_${isPostedNow ? 'ADDED_TO' : 'REMOVED_FROM'}_WALL`, "success");
                                                                } catch (err) { console.error(err); }
                                                            }}
                                                            className={`p-2 border transition-all ${isTruthy(track.isPosted || track.IsPosted) ? 'bg-white text-black border-white shadow-[0_0_15px_#fff]' : 'border-white/10 text-white/40 hover:text-white hover:border-white/30'}`}
                                                            title="Pin to Wall"
                                                        >
                                                            <Star size={12} fill={isTruthy(track.isPosted || track.IsPosted) ? "currentColor" : "none"} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const link = `${window.location.origin}/profile/${targetUserId || currentUser?.id || currentUser?.Id}?track=${track.id || track.Id}`;
                                                                navigator.clipboard.writeText(link);
                                                                showNotification("LINK_COPIED", "SIGNAL_ADDRESS_SECURED_TO_CLIPBOARD", "success");
                                                            }}
                                                            className="p-2 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all"
                                                            title="Copy Signal Link"
                                                        >
                                                            <Share2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                                <TrackActionsDropdown track={track} isOwner={isMe} playlists={currentUserPlaylists} myLikes={myLikes} isLikedInitial={myLikes.some(l => (l.trackId || l.TrackId) === (track.id || track.Id))} onDelete={() => handleDeleteTrack(track)} />
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {activeTab === 'Playlists' && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 pb-8">
                                {isMe && (
                                    <button
                                        onClick={() => setShowCreatePlaylist(true)}
                                        className="border border-[var(--text-color)]/10 p-4 hover:border-[var(--text-color)]/40 transition-all cursor-pointer group bg-black/20 flex flex-col items-center justify-center gap-4 text-[var(--text-color)]/20 hover:text-[var(--text-color)]"
                                    >
                                        <Plus size={32} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">INIT_NEW_PLAYLIST</span>
                                    </button>
                                )}
                                {profilePlaylists
                                    .sort((a, b) => {
                                        const aPinned = isTruthy(a.isPinned || a.IsPinned) ? 1 : 0;
                                        const bPinned = isTruthy(b.isPinned || b.IsPinned) ? 1 : 0;
                                        if (bPinned !== aPinned) return bPinned - aPinned;

                                        const aPosted = isTruthy(a.isPosted || a.IsPosted) ? 1 : 0;
                                        const bPosted = isTruthy(b.isPosted || b.IsPosted) ? 1 : 0;
                                        if (bPosted !== aPosted) return bPosted - aPosted;
                                        return 0;
                                    })
                                    .map(p => (
                                        <div key={p.id} onClick={() => handleOpenPlaylist(p.id)} className="border border-[var(--text-color)]/5 p-4 hover:border-[var(--text-color)]/40 transition-all cursor-pointer group bg-black/40">
                                            <div className="aspect-square bg-black overflow-hidden relative mb-4">
                                                {(p.imageUrl || p.ImageUrl) ? (
                                                    <img src={getMediaUrl(p.imageUrl || p.ImageUrl)} className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-100 transition-all" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[var(--text-color)]/10"><Database size={32} /></div>
                                                )}
                                                <div className="absolute top-0 left-0 bg-[var(--text-color)] text-black text-[8px] font-bold px-1.5 py-0.5 mono">#{String(p.id).padStart(3, '0')}</div>
                                                {isMe && (
                                                    <div className="absolute top-2 right-2 z-30 flex gap-2">
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    const API = await import('../services/api').then(mod => mod.default);
                                                                    await API.Playlists.togglePin(p.id || p.Id);
                                                                    const isPinnedNow = !isTruthy(p.isPinned || p.IsPinned);
                                                                    setProfilePlaylists(prev => prev.map(pl => (String(pl.id) === String(p.id)) ? { ...pl, isPinned: isPinnedNow, IsPinned: isPinnedNow } : pl));
                                                                    showNotification(isPinnedNow ? "SIGNAL_LOCKED" : "SIGNAL_RELEASED", `PLAYLIST_${isPinnedNow ? 'PINNED_TO' : 'REMOVED_FROM'}_MONITOR`, "success");
                                                                } catch (err) { console.error(err); }
                                                            }}
                                                            className={`p-1.5 border backdrop-blur-md transition-all ${isTruthy(p.isPinned || p.IsPinned) ? 'bg-white text-black border-white shadow-[0_0_15px_#fff]' : 'bg-black/60 border-white/20 text-white/40 hover:text-white hover:border-white/40'}`}
                                                            title="Pin to Monitor"
                                                        >
                                                            <Star size={10} fill={isTruthy(p.isPinned || p.IsPinned) ? "currentColor" : "none"} />
                                                        </button>

                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    const API = await import('../services/api').then(mod => mod.default);
                                                                    await API.Playlists.togglePost(p.id || p.Id);
                                                                    const isPostedNow = !isTruthy(p.isPosted || p.IsPosted);
                                                                    setProfilePlaylists(prev => prev.map(pl => (String(pl.id) === String(p.id)) ? { ...pl, isPosted: isPostedNow, IsPosted: isPostedNow } : pl));
                                                                    showNotification(isPostedNow ? "SIGNAL_POSTED" : "SIGNAL_RECALLED", `PLAYLIST_${isPostedNow ? 'ATTACHED_TO' : 'RECALLED_FROM'}_WALL`, "success");
                                                                } catch (err) { console.error(err); }
                                                            }}
                                                            className={`p-1.5 border backdrop-blur-md transition-all ${isTruthy(p.isPosted || p.IsPosted) ? 'bg-[var(--theme-color)] text-black border-[var(--theme-color)] shadow-[0_0_15px_rgba(var(--theme-color-rgb),0.5)]' : 'bg-black/60 border-[var(--text-color)]/20 text-[var(--text-color)]/40 hover:text-[var(--text-color)] hover:border-[var(--text-color)]/40'}`}
                                                            title="Pin to Wall"
                                                        >
                                                            <Share2 size={10} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const link = `${window.location.origin}/profile/${targetUserId || currentUser?.id || currentUser?.Id}?playlist=${p.id || p.Id}`;
                                                                navigator.clipboard.writeText(link);
                                                                showNotification("LINK_COPIED", "MAP_ADDRESS_SECURED_TO_CLIPBOARD", "success");
                                                            }}
                                                            className="p-1.5 border bg-black/60 border-[var(--text-color)]/20 text-[var(--text-color)]/40 hover:text-[var(--text-color)] hover:border-[var(--text-color)]/40 backdrop-blur-md transition-all"
                                                            title="Copy Sequence Link"
                                                        >
                                                            <Link size={10} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="text-[10px] font-bold text-[var(--text-color)] uppercase truncate tracking-widest">{p.name}</h4>
                                        </div>
                                    ))}
                            </div>
                        )}

                        {activeTab === 'Studio' && (
                            <div className="space-y-6">
                                {/* Studio Sub-tabs + Universal Ingest */}
                                <div className="flex flex-col lg:flex-row justify-between items-center mb-6 pb-4 border-b border-white/5 gap-4">
                                    <div className="flex gap-4">
                                        {['All', 'Photos', 'Video', 'Journal'].map(tab => {
                                            const count = tab === 'All' ? profileGallery.length + profileJournal.length :
                                                tab === 'Photos' ? profileGallery.filter(c => c.Type === 'PHOTO').length :
                                                    tab === 'Video' ? profileGallery.filter(c => c.Type === 'VIDEO').length :
                                                        tab === 'Journal' ? profileJournal.length : 0;
                                            return (
                                                <button
                                                    key={tab}
                                                    onClick={() => setStudioSubTab(tab)}
                                                    className={`flex items-center gap-2 text-[8px] mono font-bold tracking-widest uppercase transition-all ${studioSubTab === tab ? 'text-[var(--text-color)]' : 'text-white/20 hover:text-white/60'}`}
                                                >
                                                    {tab === 'Photos' && <Camera size={12} />}
                                                    {tab === 'Video' && <Video size={12} />}
                                                    {tab === 'Journal' && <Book size={12} />}
                                                    {tab === 'All' && <Hash size={12} />}
                                                    [{tab}] <span className="text-[var(--text-color)]/40">{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Log Terminal */}


                                    {/* Universal Ingest Menu */}
                                    {isMe && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowIngestMenu(!showIngestMenu)}
                                                className="px-3 lg:px-4 py-1.5 bg-[var(--text-color)]/10 border border-[var(--text-color)]/40 text-[var(--text-color)] text-[8px] lg:text-[9px] font-bold uppercase tracking-[0.1em] lg:tracking-[0.2em] hover:bg-[var(--text-color)] hover:text-black transition-all flex items-center gap-2"
                                            >
                                                <Upload size={12} /> [ INGEST_DATA ]
                                            </button>

                                            <AnimatePresence>
                                                {showIngestMenu && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="absolute right-0 top-full mt-2 w-48 bg-black border border-[var(--text-color)]/30 shadow-[0_0_30px_rgba(var(--text-color-rgb),0.1)] z-[100]"
                                                    >
                                                        <div className="p-1 space-y-1">
                                                            <button
                                                                onClick={() => document.getElementById('ingest-log').click()}
                                                                className="w-full text-left px-4 py-2 text-[8px] font-bold text-[var(--text-color)]/60 hover:text-[var(--text-color)] hover:bg-[var(--text-color)]/10 transition-all uppercase mono flex items-center gap-3"
                                                            >
                                                                <Book size={12} /> [ JOURNAL_ENTRY ]
                                                            </button>
                                                            <button
                                                                onClick={() => document.getElementById('ingest-visual').click()}
                                                                className="w-full text-left px-4 py-2 text-[8px] font-bold text-[var(--text-color)]/60 hover:text-[var(--text-color)] hover:bg-[var(--text-color)]/10 transition-all uppercase mono flex items-center gap-3"
                                                            >
                                                                <Camera size={12} /> [ VISUAL_DATA ]
                                                            </button>
                                                            <button
                                                                onClick={() => document.getElementById('ingest-signal').click()}
                                                                className="w-full text-left px-4 py-2 text-[8px] font-bold text-[var(--text-color)]/60 hover:text-[var(--text-color)] hover:bg-[var(--text-color)]/10 transition-all uppercase mono flex items-center gap-3"
                                                            >
                                                                <Video size={12} /> [ SIGNAL_FEED ]
                                                            </button>
                                                        </div>

                                                        {/* Hidden Inputs */}
                                                        <input
                                                            id="ingest-log"
                                                            type="file"
                                                            accept=".txt,.log,.md"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                handleIngestFile(e, 'CORE_LOG');
                                                                e.target.value = ''; // Reset to allow same file re-selection
                                                            }}
                                                        />
                                                        <input
                                                            id="ingest-visual"
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                handleIngestFile(e, 'VISUAL_DATA');
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                        <input
                                                            id="ingest-signal"
                                                            type="file"
                                                            accept="video/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                handleIngestFile(e, 'SIGNAL_FEED');
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>

                                {/* Studio Content Header / Carousel for Media Tabs */}
                                {['All', 'Photos', 'Video'].includes(studioSubTab) && (
                                    <div className="mb-4 lg:mb-8 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="mono text-[10px] font-black text-[var(--text-color)]/60 uppercase tracking-[0.3em]">
                                                {studioSubTab === 'All' ? 'SIGNAL_GALLERY' : studioSubTab === 'Photos' ? 'VISUAL_ARCHIVE' : 'VIDEO_FEED'}
                                            </h3>
                                        </div>
                                        <div className="relative group px-6 mb-4">
                                            {profileGallery.length > 0 && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const el = document.getElementById('media-carousel');
                                                            if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                                                        }}
                                                        className="absolute left-0 top-1/2 -translate-y-1/2 z-40 text-[var(--text-color)]/60 hover:text-[var(--text-color)] hover:scale-110 transition-all opacity-100"
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const el = document.getElementById('media-carousel');
                                                            if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                                                        }}
                                                        className="absolute right-0 top-1/2 -translate-y-1/2 z-40 text-[var(--text-color)]/60 hover:text-[var(--text-color)] hover:scale-110 transition-all opacity-100"
                                                    >
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </>
                                            )}
                                            <div
                                                id="media-carousel"
                                                className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar scroll-smooth"
                                            >
                                                {profileGallery
                                                    .filter(c => studioSubTab === 'All' || (studioSubTab === 'Photos' && c.Type === 'PHOTO') || (studioSubTab === 'Video' && c.Type === 'VIDEO'))
                                                    .sort((a, b) => {
                                                        const aPinned = isTruthy(a.IsPinned || a.isPinned) ? 1 : 0;
                                                        const bPinned = isTruthy(b.IsPinned || b.isPinned) ? 1 : 0;
                                                        if (bPinned !== aPinned) return bPinned - aPinned;

                                                        const aPosted = isTruthy(a.IsPosted || a.isPosted) ? 1 : 0;
                                                        const bPosted = isTruthy(b.IsPosted || b.isPosted) ? 1 : 0;
                                                        if (bPosted !== aPosted) return bPosted - aPosted;

                                                        return new Date(b.CreatedAt || b.createdAt) - new Date(a.CreatedAt || a.createdAt);
                                                    })
                                                    .map((content) => (
                                                        <motion.div
                                                            key={content.Id || content.id}
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            whileHover={{ scale: 1.02 }}
                                                            className="group relative flex-shrink-0 w-64 aspect-square bg-black border border-white/5 overflow-hidden cursor-pointer"
                                                        >
                                                            {/* Hover Controls */}
                                                            {isMe && (
                                                                <div className="absolute top-2 left-2 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            try {
                                                                                const API = await import('../services/api').then(mod => mod.default);
                                                                                await API.Studio.togglePin(content.Id || content.id);
                                                                                const isPinnedNow = !isTruthy(content.IsPinned || content.isPinned);
                                                                                setProfileGallery(prev => prev.map(c => (String(c.Id || c.id) === String(content.Id || content.id)) ? { ...c, isPinned: isPinnedNow, IsPinned: isPinnedNow } : c));
                                                                                showNotification(isPinnedNow ? "SIGNAL_LOCKED" : "SIGNAL_RELEASED", `CONTENT_${isPinnedNow ? 'PINNED_TO' : 'RECALLED_FROM'}_MONITOR`, "success");
                                                                            } catch (err) { console.error(err); }
                                                                        }}
                                                                        className={`p-1.5 border backdrop-blur-md transition-all ${isTruthy(content.IsPinned || content.isPinned) ? 'bg-white text-black border-white shadow-[0_0_15px_#fff]' : 'bg-black/60 text-white/40 border-white/10 hover:text-white hover:border-white/40'}`}
                                                                        title="Pin to Monitor"
                                                                    >
                                                                        <Star size={10} fill={isTruthy(content.IsPinned || content.isPinned) ? "currentColor" : "none"} />
                                                                    </button>

                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            try {
                                                                                const API = await import('../services/api').then(mod => mod.default);
                                                                                await API.Studio.togglePost(content.Id || content.id);
                                                                                const isPostedNow = !isTruthy(content.IsPosted || content.isPosted);
                                                                                setProfileGallery(prev => prev.map(c => (String(c.Id || c.id) === String(content.Id || content.id)) ? { ...c, isPosted: isPostedNow, IsPosted: isPostedNow } : c));
                                                                                showNotification(isPostedNow ? "SIGNAL_BROADCAST" : "SIGNAL_REDACTED", `CONTENT_${isPostedNow ? 'ADDED_TO' : 'REMOVED_FROM'}_WALL`, "success");
                                                                            } catch (err) { console.error(err); }
                                                                        }}
                                                                        className={`p-1.5 border backdrop-blur-md transition-all ${isTruthy(content.IsPosted || content.isPosted) ? 'bg-[var(--theme-color)] text-black border-[var(--theme-color)] shadow-[0_0_15px_rgba(var(--theme-color-rgb),0.5)]' : 'bg-black/60 text-[var(--text-color)]/40 border-[var(--text-color)]/20 hover:text-[var(--text-color)] hover:border-[var(--text-color)]/40'}`}
                                                                        title="Pin to Wall"
                                                                    >
                                                                        <Share2 size={10} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const link = `${window.location.origin}/profile/${targetUserId || currentUser?.id || currentUser?.Id}?content=${content.Id || content.id}`;
                                                                            navigator.clipboard.writeText(link);
                                                                            showNotification("LINK_COPIED", "SIGNAL_ADDRESS_SECURED", "success");
                                                                        }}
                                                                        className="p-1.5 border bg-black/60 border-white/10 text-white/40 hover:text-white backdrop-blur-md transition-all"
                                                                        title="Copy Link"
                                                                    >
                                                                        <Share2 size={10} />
                                                                    </button>
                                                                </div>
                                                            )}

                                                            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end"
                                                                onClick={() => setSelectedContent({ ...content, type: content.Type || 'PHOTO' })}>
                                                                <div className="text-[7px] mono font-bold text-[var(--text-color)] tracking-widest uppercase mb-1">
                                                                    {content.Type === 'PHOTO' ? '// VISUAL_DATA' : '// SIGNAL_FEED'}
                                                                </div>
                                                                <div className="text-[8px] mono text-white truncate uppercase">{content.Title}</div>
                                                            </div>
                                                            {content.Type === 'VIDEO' ? (
                                                                <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 space-y-2"
                                                                    onClick={() => setSelectedContent({ ...content, type: content.Type || 'PHOTO' })}>
                                                                    <Video size={16} className="text-[var(--text-color)]/40" />
                                                                    <div className="text-[6px] mono text-white/20 uppercase">DECODING_SIGNAL...</div>
                                                                </div>
                                                            ) : (
                                                                <img
                                                                    src={getMediaUrl(content.Url)}
                                                                    alt={content.Title}
                                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500"
                                                                    onClick={() => setSelectedContent({ ...content, type: content.Type || 'PHOTO' })}
                                                                />
                                                            )}
                                                        </motion.div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {studioSubTab === 'Photos' && profileGallery.filter(c => c.Type === 'PHOTO').length === 0 && (
                                    <div className="col-span-full py-10 lg:py-20 flex flex-col items-center justify-center border border-dashed border-white/5 opacity-20">
                                        <Camera size={24} className="mb-4 text-[var(--text-color)]" />
                                        <span className="mono text-[8px] uppercase tracking-[0.2em]">GALLERY_ENCRYPTED_OR_EMPTY</span>
                                    </div>
                                )}
                                {studioSubTab === 'Video' && profileGallery.filter(c => c.Type === 'VIDEO').length === 0 && (
                                    <div className="col-span-full py-10 lg:py-20 flex flex-col items-center justify-center border border-dashed border-white/5 opacity-20">
                                        <Video size={24} className="mb-4 text-[var(--text-color)]" />
                                        <span className="mono text-[8px] uppercase tracking-[0.2em]">VISUAL_FEED_OFFLINE</span>
                                    </div>
                                )}
                                {(studioSubTab === 'Journal' || studioSubTab === 'All') && (
                                    <div className="col-span-full space-y-6">
                                        {isMe && showJournalForm && (
                                            <div className="bg-black border border-[var(--text-color)]/20 p-6 space-y-4">
                                                <div className="flex justify-between items-center border-b border-[var(--text-color)]/10 pb-4">
                                                    <h3 className="mono text-[10px] font-black text-[var(--text-color)] uppercase tracking-[0.3em]">INIT_NEW_ENTRY</h3>
                                                </div>
                                                <input
                                                    id="journal-title"
                                                    type="text"
                                                    placeholder="ENTRY_TITLE..."
                                                    className="w-full bg-black/40 border border-white/5 p-3 text-[10px] text-white mono outline-none focus:border-[var(--text-color)]/40 transition-all tracking-widest"
                                                />
                                                <textarea
                                                    id="journal-content"
                                                    placeholder="ENCODE_CORE_LOG_DATA..."
                                                    className="w-full bg-black/40 border border-white/5 p-3 text-[10px] text-white/60 mono outline-none focus:border-[var(--text-color)]/40 transition-all min-h-[100px] resize-none tracking-wider leading-relaxed"
                                                />
                                                <div className="flex justify-center pt-2">
                                                    <button
                                                        onClick={async () => {
                                                            const titleInput = document.getElementById('journal-title');
                                                            const contentInput = document.getElementById('journal-content');
                                                            if (!titleInput?.value || !contentInput?.value) return;

                                                            try {
                                                                const API = await import('../services/api').then(mod => mod.default);
                                                                await API.Journal.create({
                                                                    Title: titleInput.value,
                                                                    Content: contentInput.value,
                                                                    IsPosted: true,
                                                                    IsPinned: false
                                                                });
                                                                titleInput.value = '';
                                                                contentInput.value = '';
                                                                const res = await API.Journal.getMyJournal();
                                                                setProfileJournal(res.data || []);
                                                                setShowJournalForm(false);
                                                            } catch (err) {
                                                                console.error("Failed to commit log", err);
                                                            }
                                                        }}
                                                        className="px-10 py-3 bg-[var(--text-color)]/10 border border-[var(--text-color)]/40 text-[var(--text-color)] text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[var(--text-color)] hover:text-black transition-all"
                                                    >
                                                        [ COMMIT_LOG_TO_ARCHIVE ]
                                                    </button>
                                                </div>

                                                <div className="flex justify-center gap-8 pt-6 border-t border-white/5">
                                                    <button
                                                        onClick={() => {
                                                            const t = document.getElementById('journal-title');
                                                            const c = document.getElementById('journal-content');
                                                            if (t) t.value = '';
                                                            if (c) c.value = '';
                                                        }}
                                                        className="text-[9px] font-bold text-red-500/40 hover:text-red-500 uppercase mono flex items-center gap-2 transition-all tracking-widest"
                                                    >
                                                        <Database size={12} /> [ PURGE_BUFFER ]
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const t = document.getElementById('journal-title');
                                                            const c = document.getElementById('journal-content');
                                                            if (t) t.value = '';
                                                            if (c) c.value = '';
                                                            setShowJournalForm(false);
                                                        }}
                                                        className="text-[9px] font-bold text-white/20 hover:text-white/60 uppercase mono flex items-center gap-2 transition-all tracking-widest"
                                                    >
                                                        <X size={12} /> [ EXIT_POST_PROTOCOL ]
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            {/* Journal Carousel Header */}
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="mono text-[10px] font-black text-[var(--text-color)]/60 uppercase tracking-[0.3em]">
                                                    JOURNAL_ARCHIVE
                                                </h3>
                                            </div>

                                            <div className="relative group px-6 mb-4">
                                                {profileJournal.length > 0 && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                const el = document.getElementById('journal-carousel');
                                                                if (el) el.scrollBy({ left: -400, behavior: 'smooth' });
                                                            }}
                                                            className="absolute left-0 top-1/2 -translate-y-1/2 z-40 text-[var(--text-color)]/60 hover:text-[var(--text-color)] hover:scale-110 transition-all opacity-100"
                                                        >
                                                            <ChevronLeft size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const el = document.getElementById('journal-carousel');
                                                                if (el) el.scrollBy({ left: 400, behavior: 'smooth' });
                                                            }}
                                                            className="absolute right-0 top-1/2 -translate-y-1/2 z-40 text-[var(--text-color)]/60 hover:text-[var(--text-color)] hover:scale-110 transition-all opacity-100"
                                                        >
                                                            <ChevronRight size={20} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div id="journal-carousel" className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar scroll-smooth snap-x snap-mandatory">
                                            {profileJournal.length > 0 ? (
                                                        profileJournal.sort((a, b) => {
                                                            const aPinned = isTruthy(a.IsPinned || a.isPinned) ? 1 : 0;
                                                            const bPinned = isTruthy(b.IsPinned || b.isPinned) ? 1 : 0;
                                                            if (bPinned !== aPinned) return bPinned - aPinned;

                                                            const aPosted = isTruthy(a.IsPosted || a.isPosted) ? 1 : 0;
                                                            const bPosted = isTruthy(b.IsPosted || b.isPosted) ? 1 : 0;
                                                            if (bPosted !== aPosted) return bPosted - aPosted;

                                                            return new Date(b.CreatedAt || b.createdAt) - new Date(a.CreatedAt || a.createdAt);
                                                        })
                                                            .map((entry, idx) => (
                                                                <div key={entry.Id || idx} className={`snap-center shrink-0 w-[400px] p-6 border flex flex-col transition-all ${(entry.IsPosted || entry.isPosted) ? 'border-[var(--text-color)]/40 bg-[var(--text-color)]/5 shadow-[0_0_20px_rgba(var(--text-color-rgb),0.02)]' : 'border-white/5 bg-black'}`}>
                                                                    <div className="flex justify-between items-start mb-4 shrink-0">
                                                                        <div className="flex flex-col gap-1">
                                                                            <div className="flex items-center gap-3">
                                                                                {(entry.IsPinned || entry.isPinned) && <Star size={12} className="text-white fill-white" />}
                                                                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{entry.Title || entry.title || '// UNTITLED_LOG'}</h3>
                                                                            </div>
                                                                            <span className="text-[8px] text-[var(--text-color)] mono">{new Date(entry.CreatedAt || entry.createdAt).toLocaleString()}</span>
                                                                        </div>
                                                                        {isMe && (
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        try {
                                                                                            const API = await import('../services/api').then(mod => mod.default);
                                                                                            await API.Journal.togglePin(entry.Id || entry.id);
                                                                                            const isPinnedNow = !isTruthy(entry.IsPinned || entry.isPinned);
                                                                                            setProfileJournal(prev => prev.map(j => (String(j.Id || j.id) === String(entry.Id || entry.id)) ? { ...j, isPinned: isPinnedNow, IsPinned: isPinnedNow } : j));
                                                                                            showNotification(isPinnedNow ? "LOG_LOCKED" : "LOG_RELEASED", `ENTRY_${isPinnedNow ? 'PINNED_TO' : 'RECALLED_FROM'}_MONITOR`, "success");
                                                                                        } catch (err) { console.error(err); }
                                                                                    }}
                                                                                    className={`p-1.5 border backdrop-blur-md transition-all ${isTruthy(entry.IsPinned || entry.isPinned) ? 'bg-white text-black border-white shadow-[0_0_15px_#fff]' : 'bg-black/60 border-white/20 text-white/40 hover:text-white hover:border-white/40'}`}
                                                                                    title="Pin to Monitor"
                                                                                >
                                                                                    <Star size={10} fill={isTruthy(entry.IsPinned || entry.isPinned) ? "currentColor" : "none"} />
                                                                                </button>

                                                                                <button
                                                                                    onClick={async () => {
                                                                                        try {
                                                                                            const API = await import('../services/api').then(mod => mod.default);
                                                                                            await API.Journal.togglePost(entry.Id || entry.id);
                                                                                            const isPostedNow = !isTruthy(entry.IsPosted || entry.isPosted);
                                                                                            setProfileJournal(prev => prev.map(j => (String(j.Id || j.id) === String(entry.Id || entry.id)) ? { ...j, isPosted: isPostedNow, IsPosted: isPostedNow } : j));
                                                                                            showNotification(isPostedNow ? "PINNED_TO_WALL" : "REMOVED_FROM_WALL", `ENTRY_${isPostedNow ? 'ATTACHED_TO' : 'DETACHED_FROM'}_PROFILE_SURFACE`, "success");
                                                                                        } catch (err) { console.error(err); }
                                                                                    }}
                                                                                    className={`p-1.5 border backdrop-blur-md transition-all ${isTruthy(entry.IsPosted || entry.isPosted) ? 'bg-[var(--text-color)] text-black border-[var(--text-color)] shadow-[0_0_15px_rgba(255,0,110,0.5)]' : 'bg-black/60 border-[var(--text-color)]/20 text-[var(--text-color)]/40 hover:text-[var(--text-color)] hover:border-[var(--text-color)]/40'}`}
                                                                                    title="Pin to Wall"
                                                                                >
                                                                                    <Share2 size={10} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const link = `${window.location.origin}/profile/${targetUserId || currentUser?.id || currentUser?.Id}?journal=${entry.Id || entry.id}`;
                                                                                        navigator.clipboard.writeText(link);
                                                                                        showNotification("LINK_COPIED", "ARCHIVE_SIGNAL_SECURED", "success");
                                                                                    }}
                                                                                    className="px-3 py-1 border border-white/20 text-white/40 hover:text-white transition-all text-[7px] mono uppercase font-bold"
                                                                                >
                                                                                    [ SHARE_LOG ]
                                                                                </button>
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        if (!window.confirm("DELETE_LOG_PERMANENTLY?")) return;
                                                                                        try {
                                                                                            const API = await import('../services/api').then(mod => mod.default);
                                                                                            await API.Journal.delete(entry.Id);
                                                                                            const res = await API.Journal.getMyJournal();
                                                                                            setProfileJournal(res.data || []);
                                                                                        } catch (err) { console.error(err); }
                                                                                    }}
                                                                                    className="px-3 py-1 border border-white/5 text-white/20 hover:text-red-500 hover:border-red-500/30 transition-all text-[7px] mono"
                                                                                >
                                                                                    [ DELETE ]
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="relative">
                                                                        <p className="text-[9px] text-white/60 leading-relaxed italic tracking-wider line-clamp-3">
                                                                            {entry.Content || entry.content}
                                                                        </p>
                                                                        <button
                                                                            onClick={() => setSelectedContent({ ...entry, type: 'JOURNAL' })}
                                                                            className="mt-2 text-[7px] font-bold text-[var(--text-color)] uppercase tracking-widest hover:underline"
                                                                        >
                                                                            [ EXPAND_SIGNAL_DATA ]
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                    ) : (
                                                        <div className="col-span-full py-10 lg:py-20 flex flex-col items-center justify-center border border-dashed border-white/5 opacity-20">
                                                            <Book size={32} className="mb-4 text-[var(--text-color)]" />
                                                            <span className="mono text-[10px] uppercase tracking-[0.2em]">NO_ARCHIVED_LOGS_FOUND</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </SpatialRoomLayout>

            {/* Global Overlays */}
            <AnimatePresence>
                {/* ─── Go Live Modal ─────────────────────────────── */}
                {showGoLiveModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    >
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[12px]"
                            onClick={() => setShowGoLiveModal(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="relative w-full max-w-lg rounded-sm overflow-visible"
                            style={{
                                background: 'rgba(5, 5, 5, 0.92)',
                                backdropFilter: 'blur(30px)',
                                border: '1px solid rgba(var(--text-color-rgb), 0.2)',
                                boxShadow: '0 0 50px -10px rgba(0,0,0,0.5)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 4-Corner Brackets */}
                            <div className="hud-bracket-tl text-[var(--text-color)]" />
                            <div className="hud-bracket-tr text-[var(--text-color)]" />
                            <div className="hud-bracket-bl text-[var(--text-color)]" />
                            <div className="hud-bracket-br text-[var(--text-color)]" />

                            {/* Animated Scan Line */}
                            <motion.div
                                className="absolute inset-x-0 h-[1px] bg-[var(--text-color)]/20 blur-[1px] z-10 pointer-events-none"
                                animate={{ top: ['0%', '100%'] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            />

                            <div className="p-8 relative z-10">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-[var(--text-color)]/10 border border-[var(--text-color)]/20 rounded-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-color)] animate-pulse shadow-[0_0_8px_rgba(var(--text-color-rgb),0.5)]" />
                                            <span className="text-[8px] mono font-black text-[var(--text-color)] tracking-[0.3em] uppercase">+ LIVE_BROADCAST</span>
                                        </div>
                                        <div className="text-[9px] mono text-white/30 uppercase tracking-widest mt-1 ml-1">
                                            Station goes on-air — no track required
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {/* Session title */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-[var(--text-color)] opacity-40 uppercase tracking-[0.4em] ml-1">signal_metadata // title</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={goLiveFormData.sessionTitle}
                                                onChange={e => setGoLiveFormData(p => ({ ...p, sessionTitle: e.target.value }))}
                                                className="w-full bg-white/[0.03] border border-white/10 p-4 text-white font-black outline-none focus:border-[var(--text-color)] tracking-[0.2em] transition-all text-sm rounded-sm"
                                                placeholder="establish_session_id..."
                                            />
                                            <div className="absolute top-0 right-0 p-4 text-[var(--text-color)]/20 mono text-[10px] uppercase">req_id: 104.2</div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-[var(--text-color)] opacity-40 uppercase tracking-[0.4em] ml-1">transmission_log // desc</label>
                                        <textarea
                                            value={goLiveFormData.description}
                                            onChange={e => setGoLiveFormData(p => ({ ...p, description: e.target.value }))}
                                            rows={3}
                                            className="w-full bg-white/[0.03] border border-white/10 p-4 text-white/70 outline-none focus:border-[var(--text-color)]/50 tracking-wide transition-all text-[11px] resize-none custom-scrollbar rounded-sm"
                                            placeholder="describe_signal_feed..."
                                        />
                                    </div>
                                    
                                    {/* Toggles */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div 
                                            onClick={() => setGoLiveFormData(p => ({ ...p, isChatEnabled: !p.isChatEnabled }))}
                                            className={`p-3 border cursor-pointer transition-all flex items-center justify-between group rounded-sm ${goLiveFormData.isChatEnabled ? 'border-[var(--text-color)]/40 bg-[var(--text-color)]/5' : 'border-white/5 bg-white/5 opacity-40 hover:opacity-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <MessageSquare size={14} className={goLiveFormData.isChatEnabled ? 'text-[var(--text-color)]' : 'text-white/40'} />
                                                <span className="text-[9px] mono font-bold uppercase tracking-widest">Enable Chat</span>
                                            </div>
                                            <div className={`w-2 h-2 rounded-full ${goLiveFormData.isChatEnabled ? 'bg-[var(--text-color)] shadow-[0_0_10px_var(--text-color)]' : 'bg-white/10'}`} />
                                        </div>

                                        <div 
                                            onClick={() => setGoLiveFormData(p => ({ ...p, isQueueEnabled: !p.isQueueEnabled }))}
                                            className={`p-3 border cursor-pointer transition-all flex items-center justify-between group rounded-sm ${goLiveFormData.isQueueEnabled ? 'border-[var(--text-color)]/40 bg-[var(--text-color)]/5' : 'border-white/5 bg-white/5 opacity-40 hover:opacity-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Radio size={14} className={goLiveFormData.isQueueEnabled ? 'text-[var(--text-color)]' : 'text-white/40'} />
                                                <span className="text-[9px] mono font-bold uppercase tracking-widest">Enable Requests</span>
                                            </div>
                                            <div className={`w-2 h-2 rounded-full ${goLiveFormData.isQueueEnabled ? 'bg-[var(--text-color)] shadow-[0_0_10px_var(--text-color)]' : 'bg-white/10'}`} />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-4 pt-4">
                                        <button
                                            onClick={() => setShowGoLiveModal(false)}
                                            className="flex-1 px-8 py-4 hud-panel border-white/10 text-white/30 font-black uppercase text-[10px] tracking-[0.3em] hover:text-[var(--text-color)] hover:border-[var(--text-color)]/30 transition-all outline-none rounded-sm"
                                        >
                                            ABORT_INIT
                                        </button>
                                        <button
                                            onClick={() => handleGoLive(goLiveFormData.sessionTitle, goLiveFormData.description)}
                                            disabled={!goLiveFormData.sessionTitle.trim()}
                                            className={`flex-[2] py-4 border font-black uppercase text-[10px] tracking-[0.3em] relative overflow-hidden group transition-all outline-none rounded-sm ${!goLiveFormData.sessionTitle.trim()
                                                ? 'bg-white/5 border-white/10 text-white/20 opacity-50'
                                                : 'bg-[var(--theme-color)]/10 border-[var(--theme-color)] text-[var(--text-color)] hover:bg-[var(--theme-color)] hover:text-black hover:shadow-[0_0_50px_rgba(var(--theme-color-rgb),0.4)]'}`}
                                        >
                                            <div className="hud-bracket-tl opacity-60 group-hover:opacity-100" />
                                            <div className="hud-bracket-br opacity-60 group-hover:opacity-100" />
                                            INIT_BROADCAST
                                            {goLiveFormData.sessionTitle.trim() && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Overlays */}
            <AnimatePresence>
                {showCreatePlaylist && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="bg-black/60 backdrop-blur-xl border border-[var(--text-color)]/30 p-10 max-w-md w-full relative shadow-[0_0_50px_rgba(255,0,110,0.1)]">
                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-[var(--text-color)]/40" />
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-[var(--text-color)]/40" />
                            <button onClick={() => setShowCreatePlaylist(false)} className="absolute top-4 right-4 text-[var(--text-color)]/40 hover:text-[var(--text-color)]">[ X ]</button>
                            <h3 className="text-xl font-bold text-white uppercase tracking-tighter mb-8 pb-4 border-b border-[var(--text-color)]/20">// INIT_SEQ_MAP_V1</h3>
                            <form onSubmit={handleCreatePlaylist} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-[var(--text-color)] uppercase tracking-[0.4em]">_SEQUENCE_NAME</label>
                                    <input type="text" value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} className="w-full bg-black border border-white/10 p-4 text-white font-bold outline-none focus:border-[var(--text-color)] tracking-widest transition-all" placeholder="sequence_id_0" />
                                </div>
                                <div className="flex items-center justify-between p-4 border border-white/5 cursor-pointer group" onClick={() => setIsPlaylistPublic(!isPlaylistPublic)}>
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">_ACCESS_PROTOCOL</span>
                                    <span className="text-[9px] text-[var(--text-color)] uppercase">{isPlaylistPublic ? 'PUBL_SYSTEM' : 'PRIV_ENCRYPTED'}</span>
                                </div>
                                <button type="submit" className="w-full py-4 bg-black border border-[var(--theme-color)] text-[var(--text-color)] font-bold uppercase tracking-widest hover:bg-[var(--theme-color)] hover:text-black transition-all">ESTABLISH_SEQUENCE</button>
                            </form>
                        </div>
                    </motion.div>
                )}
                {
                    showUpload && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md p-6 flex flex-col overflow-y-auto">
                            <button onClick={() => setShowUpload(false)} className="self-end px-4 py-2 border border-[var(--text-color)]/30 text-[var(--text-color)]/40 hover:text-[var(--text-color)] mb-10 mono text-xs uppercase transition-all backdrop-blur-sm bg-black/20 hover:bg-[var(--text-color)]/10 hover:border-[var(--text-color)]">[ ABORT_SIGNAL ]</button>
                            <div className="max-w-5xl mx-auto w-full">
                                <UploadTrackView
                                    onClose={() => setShowUpload(false)}
                                    onRefreshTracks={onRefreshTracks}
                                    allTracks={allTracks}
                                    onGoLive={handleGoLive}
                                    currentUserId={currentUser?.id || currentUser?.Id}
                                />
                            </div>
                        </motion.div>
                    )
                }
                {
                    showEditProfile && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-md flex items-center justify-center p-6">
                            <div className="bg-black border border-[var(--text-color)]/30 p-10 max-w-xl w-full relative shadow-[0_0_50px_rgba(var(--text-color-rgb),0.1)] rounded-2xl overflow-hidden">
                                <button onClick={() => setShowEditProfile(false)} className="absolute top-4 right-4 text-[var(--text-color)]/40 hover:text-[var(--text-color)] transition-all"><X size={20} /></button>
                                <div className="max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
                                    <EditProfileForm
                                        user={displayUser}
                                        tracks={isMe ? allTracks.filter(t => t.isOwned || t.isLiked || String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)) : profileTracks}
                                        onSubmit={handleUpdateProfile}
                                        onLogout={onLogout}
                                        onColorPreview={(colors) => {
                                            setProfileData(prev => ({
                                                ...prev,
                                                previewThemeColor: colors.themeColor,
                                                previewTextColor: colors.textColor,
                                                previewBackgroundColor: colors.backgroundColor,
                                                previewIsGlass: colors.isGlass
                                            }));
                                        }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )
                }
                {
                    selectedPlaylistId && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
                            <div className="bg-black border border-[var(--text-color)]/20 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative">
                                <button onClick={() => setSelectedPlaylistId(null)} className="absolute top-4 right-4 z-50 text-[var(--text-color)]/40 hover:text-[var(--text-color)]">[ DISCONNECT ]</button>
                                {isLoadingPlaylist ? (
                                    <div className="flex-1 flex items-center justify-center"><RefreshCw className="animate-spin text-[var(--text-color)]" /></div>
                                ) : (
                                    <PlaylistDetailsModal
                                        playlist={playlistDetails?.playlist || playlistDetails?.Playlist}
                                        tracks={playlistDetails?.tracks || playlistDetails?.Tracks}
                                        isOwner={isMe}
                                        onUpdate={handleUpdatePlaylist}
                                        onDelete={handleDeletePlaylist}
                                        onRemoveTrack={handleRemoveTrackFromPlaylist}
                                        onPlayAll={(tracks) => onPlayPlaylist?.(tracks)}
                                        playlists={currentUserPlaylists}
                                        myLikes={myLikes}
                                    />
                                )}
                            </div>
                        </motion.div>
                    )
                }
                {
                    selectedContent && (
                        <ContentModal
                            content={selectedContent}
                            type={selectedContent.type}
                            onClose={() => setSelectedContent(null)}
                        />
                    )
                }
            </AnimatePresence>
            <CRTOverlay />
        </>
    );
});

// --- SUB-COMPONENTES AUXILIARES ---

const ProfileTabIcon = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-8 py-2 relative transition-all duration-300 mono text-[10px] font-bold tracking-[0.4em] ${active ? 'text-[var(--text-color)]' : 'text-[var(--text-color)]/20 hover:text-[var(--text-color)]/60'}`}
    >
        {active ? `[ ${label} ]` : label}
    </button>
);

const Accordion = ({ title, isOpen, onToggle, children }) => (
    <div className="border border-[var(--text-color)]/20 rounded-2xl overflow-hidden bg-[#0a0a0a]/80 backdrop-blur-md">
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
        if (onColorPreview) onColorPreview({ themeColor, textColor, backgroundColor, isGlass });
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

    const SECTORS = [
        { id: 0, name: 'NEON SLUMS', color: 'var(--text-color)' },
        { id: 1, name: 'SILICON HEIGHTS', color: '#00ffff' },
        { id: 2, name: 'DATA VOID', color: '#9b5de5' },
        { id: 3, name: 'CENTRAL HUB', color: '#ffcc00' },
        { id: 4, name: 'OUTER RIM', color: '#00ff88' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('Username', name);
            formData.append('Biography', bio);
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
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${activeTab === 'identity' ? 'bg-[var(--theme-color)] text-black border-[var(--theme-color)]' : 'bg-black text-[var(--text-color)]/40 border-[var(--text-color)]/10 hover:border-[var(--text-color)]/30 hover:text-[var(--text-color)]'}`}
                >
                    [ IDENTITY_CORE ]
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('interface')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${activeTab === 'interface' ? 'bg-[var(--theme-color)] text-black border-[var(--theme-color)]' : 'bg-black text-[var(--text-color)]/40 border-[var(--text-color)]/10 hover:border-[var(--text-color)]/30 hover:text-[var(--text-color)]'}`}
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
                                <div className="text-[var(--text-color)]/20"><Cpu size={48} /></div>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-[var(--text-color)]/60 uppercase tracking-widest ml-1">Featured Track</label>
                            <div className="relative">
                                <div
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full bg-black/40 border p-4 flex items-center justify-between cursor-pointer transition-all ${isDropdownOpen ? 'border-[var(--theme-color)]' : 'border-white/10 hover:border-white/30'}`}
                                >
                                    <span className={`text-xs font-bold uppercase tracking-widest truncate ${featuredTrackId == -1 ? 'text-white/20' : 'text-white'}`}>
                                        {featuredTrackId == -1 ? 'None Selected' : (selectedTrack?.title || 'Unknown Track').toUpperCase()}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-[var(--theme-color)]' : 'text-white/20'}`} />
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
                                                    <Search size={14} className="absolute left-3 text-white/20" />
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
                                                    className={`p-4 text-[10px] font-black uppercase tracking-widest cursor-pointer border-b border-[var(--text-color)]/5 transition-all ${featuredTrackId == -1 ? 'bg-[var(--theme-color)]/10 text-[var(--theme-color)]' : 'text-[var(--text-color)]/40 hover:bg-white/5 hover:text-[var(--text-color)]'}`}
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
                                                    <div className="p-8 text-center text-[9px] text-[var(--text-color)]/20 uppercase font-black tracking-widest italic">
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
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isLive ? 'text-[var(--theme-color)]' : 'text-[var(--text-color)]/40'}`}>
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
                    {/* Unified Backdrop Upload — Photo or Video */}
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
                                        <span className="text-[7px] text-[var(--text-color)]/20 uppercase tracking-widest">JPG · PNG · MP4 · WEBM</span>
                                    </>
                                )}
                            </div>
                        </div>
                        {/* Status indicators — video takes priority over photo */}
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

                    {/* Theme Color */}
                    <div className="grid grid-cols-2 gap-8">
                        {/* Theme Color */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-[var(--text-color)]/60 uppercase tracking-widest">INTERFACE_HUE</label>
                            <div className="flex items-center gap-4 p-4 border border-[var(--text-color)]/10 bg-black group hover:border-[var(--theme-color)] transition-all relative">
                                <input
                                    type="color"
                                    value={themeColor}
                                    onChange={e => setThemeColor(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                />
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[var(--text-color)]/20 hover:border-[var(--text-color)] transition-all shadow-lg shadow-[var(--theme-color)]/20 pointer-events-none">
                                    <div className="absolute inset-0" style={{ backgroundColor: themeColor }} />
                                    <Palette size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--text-color)] drop-shadow-md mix-blend-difference" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-[var(--text-color)]/40 uppercase tracking-widest">HEX_CODE</span>
                                    <span className="text-xs font-bold text-[var(--theme-color)] mono">{themeColor}</span>
                                </div>
                            </div>
                        </div>

                        {/* Text Color */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-[var(--text-color)]/60 uppercase tracking-widest">DATA_COLOR</label>
                            <div className="flex items-center gap-4 p-4 border border-[var(--text-color)]/10 bg-black group hover:border-[var(--text-color)] transition-all relative">
                                <input
                                    type="color"
                                    value={textColor}
                                    onChange={e => setTextColor(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                />
                                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[var(--text-color)]/20 hover:border-[var(--text-color)] transition-all shadow-lg shadow-[var(--text-color)]/20 pointer-events-none">
                                    <div className="absolute inset-0" style={{ backgroundColor: textColor }} />
                                    <Type size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black drop-shadow-md mix-blend-difference" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-[var(--text-color)]/40 uppercase tracking-widest">HEX_CODE</span>
                                    <span className="text-xs font-bold text-[var(--text-color)] mono">{textColor}</span>
                                </div>
                            </div>
                        </div>

                        {/* Background Color & Glass Toggle */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-[var(--text-color)]/60 uppercase tracking-widest">PANEL_BG</label>
                            <div className="flex gap-4">
                                <div className="flex-1 flex items-center gap-4 p-4 border border-[var(--text-color)]/10 bg-black group hover:border-[var(--text-color)] transition-all relative">
                                    <input
                                        type="color"
                                        value={backgroundColor}
                                        onChange={e => setBackgroundColor(e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                                    />
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[var(--text-color)]/20 hover:border-[var(--text-color)] transition-all shadow-lg shadow-[var(--text-color)]/20 pointer-events-none">
                                        <div className="absolute inset-0" style={{ backgroundColor: backgroundColor }} />
                                        <Layout size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-md mix-blend-difference" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-[var(--text-color)]/40 uppercase tracking-widest">HEX_CODE</span>
                                        <span className="text-xs font-bold text-[var(--text-color)] mono">{backgroundColor}</span>
                                    </div>
                                </div>

                                {/* Glass Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setIsGlass(!isGlass)}
                                    className={`w-24 border flex flex-col items-center justify-center gap-2 transition-all ${isGlass ? 'bg-[var(--text-color)]/10 border-[var(--text-color)] text-[var(--text-color)]' : 'bg-black border-[var(--text-color)]/10 text-[var(--text-color)]/40 hover:border-[var(--text-color)] hover:text-[var(--text-color)]'}`}
                                >
                                    <div className={`w-8 h-4 rounded-full border relative transition-all ${isGlass ? 'border-[var(--text-color)] bg-[var(--text-color)]' : 'border-[var(--text-color)]/40'}`}>
                                        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${isGlass ? 'left-[calc(100%-12px)]' : 'left-0.5'}`} />
                                    </div>
                                    <span className="text-[8px] font-bold uppercase tracking-widest">GLASS_FX</span>
                                </button>
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

const PlaylistDetailsModal = ({ playlist, tracks, isOwner, onUpdate, onDelete, onRemoveTrack, onPlayAll, playlists = [], myLikes = [] }) => {
    const [isEditing, setIsEditing] = useState(false);

    // Edit State
    const [name, setName] = useState(playlist.name);
    const [isPublic, setIsPublic] = useState(playlist.isPublic);
    const [description, setDescription] = useState(playlist.description || '');

    // Reset state when playlist changes
    React.useEffect(() => {
        setName(playlist.name);
        setIsPublic(playlist.isPublic);
        setDescription(playlist.description || '');
    }, [playlist]);

    const handleSave = () => {
        onUpdate(playlist.id, { Name: name, Description: description, IsPublic: isPublic });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex-1 flex flex-col p-8 pt-16 gap-10 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto custom-scrollbar">
                <div className="border-b border-[var(--text-color)]/20 pb-4">
                    <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">// MODIFY_PLAYLIST_METADATA
                    </h3>
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

                    <div className="grid grid-cols-2 gap-6">
                        <button onClick={() => setIsEditing(false)} className="w-full py-4 hud-panel border-white/10 text-white/30 font-black uppercase tracking-[0.3em] hover:text-[#ff006e] hover:border-[#ff006e]/30 transition-all text-[10px] rounded-sm">
                            ABORT_INIT
                        </button>
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
                    <div className="w-full h-full relative overflow-hidden">
                        {playlist.imageUrl ? (
                            <img src={getMediaUrl(playlist.imageUrl)} className="w-full h-full object-cover grayscale mix-blend-screen opacity-60 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="w-full h-full bg-[var(--text-color)]/5 flex items-center justify-center">
                                <Database size={64} className="text-[var(--text-color)]/10" />
                            </div>
                        )}
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black border border-[var(--text-color)]/30 text-[9px] font-bold text-[var(--text-color)] z-10 mono uppercase">
                            PL_{String(playlist.id).padStart(4, '0')}
                        </div>
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
                        <button className="w-full py-3 bg-black border border-white/10 hover:border-white/40 text-white/30 hover:text-white font-bold uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2">
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
                                    <div className="text-white/30 text-[9px] font-bold uppercase tracking-widest mt-1">SIG_ADDR: {t.artistName || 'UNKNOWN'}</div>
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

export default ProfileView;
