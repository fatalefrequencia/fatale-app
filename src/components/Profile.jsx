import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TrackActionsDropdown from './TrackActionsDropdown';
import UploadTrackView from './UploadTrackView';
import ContentModal from './ContentModal';
import './SpatialProfile.css';
import {
    Terminal, Cpu, Database, Hash, Shield, Code, ChevronRight, Play, X,
    RefreshCw, Plus, Frown, Globe, Lock, PlayCircle, Edit3, Send, Library,
    ChevronDown, LogOut, Upload, MessageSquare, MapPin, Calendar, Activity,
    Eye, Cpu as Processor, Zap, Search, Palette, Type, Layout, Maximize2, Monitor,
    Camera, Video, Book, ChevronLeft, Star, Share2
} from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

// --- TERMINAL STYLING UTILITIES ---
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 0, 110';
};

const TerminalFrame = ({ title, children, className = "" }) => (
    <div className={`border border-[#ff006e]/30 bg-black/80 relative ${className}`}>
        <div className="absolute -top-3 left-4 px-2 bg-black text-[#ff006e] mono text-[10px] font-bold tracking-[0.2em] z-10">
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
    <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none mono text-[8px] leading-none text-[#ff006e] break-all select-none">
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
                className="absolute w-[1px] h-[1px] bg-[#ff006e]/30"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    boxShadow: '0 0 5px #ff006e'
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
        transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
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
        <div className="mt-6 pt-4 border-t border-[#ff006e]/10 text-[8px] opacity-30 flex justify-between">
            <span>SECURE_LINK::ENABLED</span>
            <span>v4.0.2</span>
        </div>
    </motion.div>
);

const SpatialRoomLayout = ({ children, leftContent, rightContent, monitorTitle, leftOpen, rightOpen, onToggleLeft, onToggleRight, bannerUrl, wallpaperVideoUrl, themeColor, textColor, backgroundColor, isGlass, previewThemeColor, previewTextColor, previewBackgroundColor, previewIsGlass, roomMode = 'monitor', setRoomMode, tracks = [], gallery = [], onUpload, journal = [], onExpandContent }) => {
    // Use preview colors if available, otherwise fall back to saved user props
    const activeTheme = previewThemeColor || themeColor || '#ff006e';
    const activeText = previewTextColor || textColor || '#ffffff';
    const activeBackground = previewBackgroundColor || backgroundColor || '#000000';

    const activeIsGlass = (previewIsGlass !== undefined && previewIsGlass !== null) ? previewIsGlass : (isGlass !== undefined ? isGlass : false);

    return (
        <div className={`spatial-container ${roomMode === 'room' ? 'room-mode-active' : ''}`} style={{
            '--theme-color': activeTheme,
            '--text-color': activeText,
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
                        src={wallpaperVideoUrl.startsWith('http') ? wallpaperVideoUrl : `http://localhost:5264${wallpaperVideoUrl}`}
                        className={`w-full h-full object-cover transition-all duration-[1200ms] ${roomMode === 'room' ? 'opacity-100 scale-110' : 'opacity-70 scale-100'}`}
                        style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : bannerUrl ? (
                    <img
                        src={bannerUrl.startsWith('http') ? bannerUrl : `http://localhost:5264${bannerUrl}`}
                        className={`w-full h-full object-cover transition-all duration-[1200ms] ${roomMode === 'room' ? 'opacity-100 scale-110' : 'opacity-60 scale-100'}`}
                        style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                    />
                ) : null}
                <div className={`absolute inset-0 bg-black transition-opacity duration-[1200ms] ${roomMode === 'room' ? 'opacity-20' : 'opacity-60'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }} />
            </div>
            <div className="desk-surface" />
            <CyberDust />
            <DisplayWall tracks={tracks} gallery={gallery} journal={journal} themeColor={activeTheme} onExpand={onExpandContent} />

            <SideTerminal title="STATUS_MONITOR" side="left" isOpen={leftOpen} onClose={() => onToggleLeft(false)} roomMode={roomMode}>
                {leftContent}
            </SideTerminal>

            <motion.div
                className="monitor-frame"
                initial={{ rotateX: 5, y: 30, opacity: 0, scale: 0.95, translateZ: -100 }}
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
                transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
            >
                <div className="bg-[#111] border-b border-[#ff006e]/20 px-4 py-2 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#ff006e] animate-pulse shadow-[0_0_8px_#ff006e]" />
                        <span className="mono text-[9px] font-bold text-white/60 tracking-[0.2em] uppercase">SYSTEM_CORE // {monitorTitle}</span>
                    </div>

                    {/* Mobile Toggles */}
                    <div className="flex lg:hidden gap-2">
                        <button
                            onClick={() => onToggleLeft(!leftOpen)}
                            className={`px-2 py-1 border border-[#ff006e]/20 text-[8px] mono uppercase tracking-widest ${leftOpen ? 'bg-[#ff006e] text-black' : 'text-[#ff006e]'}`}
                        >
                            [ STATS ]
                        </button>
                        <button
                            onClick={() => onToggleRight(!rightOpen)}
                            className={`px-2 py-1 border border-[#ff006e]/20 text-[8px] mono uppercase tracking-widest ${rightOpen ? 'bg-[#ff006e] text-black' : 'text-[#ff006e]'}`}
                        >
                            [ META ]
                        </button>
                    </div>

                    <div className="hidden lg:flex gap-2">
                        <div className="w-8 h-1 bg-white/5" />
                        <div className="w-4 h-1 bg-[#ff006e]/20" />
                    </div>
                </div>
                <div className="monitor-screen custom-scrollbar relative">
                    <DataStream />
                    <div className="relative z-10 h-full overflow-y-auto custom-scrollbar">
                        {children}
                    </div>
                </div>

                {/* Mobile Backdrop */}
                {(leftOpen || rightOpen) && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/60 z-[190]"
                        onClick={() => { onToggleLeft(false); onToggleRight(false); }}
                    />
                )}
            </motion.div>

            <SideTerminal title="ENTITY_METADATA" side="right" isOpen={rightOpen} onClose={() => onToggleRight(false)} roomMode={roomMode}>
                {rightContent}
            </SideTerminal>

            <PeripheralDock roomMode={roomMode} setRoomMode={setRoomMode} themeColor={activeTheme} onUpload={onUpload} isMe={true} />

            {/* Dynamic Journal Display replacing static Note Buffer */}
            {journal && journal.length > 0 && (
                (() => {
                    const pinned = journal.find(j => j.IsPinned || j.isPinned);
                    // Fallback to latest POSTED journal if nothing is pinned
                    const displayEntry = pinned || journal.find(j => j.IsPosted || j.isPosted);
                    const [isDetailed, setIsDetailed] = useState(false);
                    const isExplicitlyPinned = !!pinned;

                    if (!displayEntry) return null; // Hide if nothing pinned and nothing posted

                    return (
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className={`prop-tablet hidden xl:flex flex-col transition-all duration-500 cursor-pointer ${isDetailed ? 'max-w-md w-96 max-h-[70vh] z-50' : 'w-64 max-h-48'}`}
                            onClick={() => setIsDetailed(!isDetailed)}
                        >
                            <div className="text-[10px] mono text-[#ff006e] uppercase mb-4 border-b border-[#ff006e]/20 pb-2 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="opacity-40">{(displayEntry?.IsPinned || displayEntry?.isPinned) ? '[ PINNED_SIGNAL ]' : '[ LATEST_SIGNAL ]'}</span>
                                    <span className="font-bold">{displayEntry?.Title || displayEntry?.title || '// CORE_LOG'}</span>
                                </div>
                                {(displayEntry?.IsPinned || displayEntry?.isPinned) && <Zap size={10} className="text-[#ff006e] animate-pulse" />}
                            </div>
                            <div className={`overflow-y-auto custom-scrollbar-minimal ${isDetailed ? 'flex-1' : ''}`}>
                                <p className={`text-[9px] text-white/40 leading-relaxed italic tracking-wider ${isDetailed ? '' : 'line-clamp-4'}`}>
                                    {displayEntry?.Content || displayEntry?.content}
                                </p>
                            </div>
                            <div className="mt-4 flex justify-between items-center shrink-0">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDetailed(!isDetailed);
                                    }}
                                    className="text-[7px] mono uppercase font-bold text-[#ff006e] hover:underline z-10"
                                >
                                    {isDetailed ? '[ MINIMIZE_LOG ]' : '[ READ_FULL_LOG ]'}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onExpandContent) onExpandContent({ ...displayEntry, type: 'JOURNAL' });
                                    }}
                                    className="text-[7px] mono uppercase font-bold text-white/40 hover:text-[#ff006e] z-10 hover:underline"
                                >
                                    [ EXPAND_VIEW ]
                                </button>
                            </div>
                        </motion.div>
                    );
                })()
            )}
        </div>
    );
};

const DisplayWall = ({ tracks, gallery, journal = [], themeColor, onExpand }) => {
    // 1. Collect all wall-eligible items
    const wallItems = [];

    // Tracks (limit check later)
    if (Array.isArray(tracks)) {
        tracks.forEach(t => {
            // Use t.cover (from App mappings) or fallbacks
            const cover = t.cover || t.coverImage || t.CoverImage || t.imageUrl || t.ImageUrl || t.coverImageUrl || t.CoverImageUrl;

            if ((t.IsPosted || t.isPosted)) {
                wallItems.push({
                    id: t.id || t.Id,
                    type: 'TRACK',
                    title: t.title || t.Title,
                    url: cover, // Can be null/empty, rendering handles it
                    slots: 1,
                    original: t
                });
            }
        });
    }

    // Gallery (Photos & Videos - only Posted)
    if (Array.isArray(gallery)) {
        gallery.forEach(c => {
            if (c.IsPosted || c.isPosted) {
                wallItems.push({
                    id: c.id || c.Id,
                    type: c.Type,
                    title: c.Title,
                    url: c.Url,
                    slots: c.Type === 'VIDEO' ? 4 : 1,
                    original: c
                });
            }
        });
    }

    // Journals (only if IsPosted - repurposed as Pin to Wall)
    if (Array.isArray(journal)) {
        journal.forEach(j => {
            if (j.IsPosted || j.isPosted) {
                wallItems.push({
                    id: j.id || j.Id,
                    type: 'JOURNAL',
                    title: j.title || j.Title,
                    url: null,
                    slots: 1,
                    original: j
                });
            }
        });
    }

    // Sort by type then date (optional, for aesthetics)
    // For now just keep them as they come or shuffle

    // 2. Enforce 20-slot limit
    let totalSlots = 0;
    const itemsToShow = [];
    for (const item of wallItems) {
        if (totalSlots + item.slots <= 20) {
            itemsToShow.push(item);
            totalSlots += item.slots;
        }
    }

    return (
        <div className="display-wall">
            {itemsToShow.map((item, i) => (
                <div
                    key={`${item.type}_${item.id}_${i}`}
                    className={`wall-item ${item.type === 'VIDEO' ? 'video-panel' : 'media-print'}`}
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
                        item.url ? (
                            <img
                                src={item.url.startsWith('http') ? item.url : `http://localhost:5264${item.url}`}
                                alt={item.title}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-[#050505] text-[#ff006e]/20 p-2 text-center group">
                                {item.type === 'JOURNAL' ? <Book size={24} className="group-hover:text-[#ff006e] transition-colors" /> : <Music size={24} />}
                                {item.type === 'JOURNAL' && (
                                    <div className="mt-1 text-[5px] mono opacity-20 truncate w-full uppercase">
                                        {item.title}
                                    </div>
                                )}
                            </div>
                        )
                    )}
                    <div className="wall-label">
                        DATA_{item.type}_{String(item.title || 'UNTITLED').toUpperCase().replace(/\s+/g, '_')}
                    </div>
                </div>
            ))}
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
                            src={(track.coverImageUrl || track.CoverImageUrl).startsWith('http') ? (track.coverImageUrl || track.CoverImageUrl) : `http://localhost:5264${(track.coverImageUrl || track.CoverImageUrl)}`}
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

const PeripheralDock = ({ roomMode, setRoomMode, themeColor, onUpload, isMe }) => {
    return (
        <div className="peripheral-dock">
            <button
                onClick={() => setRoomMode('monitor')}
                className={`dock-item ${roomMode === 'monitor' ? 'active' : ''}`}
            >
                <Monitor size={16} />
                <span className="dock-label">MONITOR_CORE</span>
            </button>
            <button
                onClick={() => setRoomMode('room')}
                className={`dock-item ${roomMode === 'room' ? 'active' : ''}`}
            >
                <Maximize2 size={16} />
                <span className="dock-label">ROOM_VIEW</span>
            </button>
            {isMe && (
                <button
                    onClick={onUpload}
                    className="dock-item"
                >
                    <Upload size={16} />
                    <span className="dock-label">UPLOAD_SIGNAL</span>
                </button>
            )}
        </div>
    );
};

const NeuralPattern = ({ isLive, featuredTrack, isQuiet }) => {
    return (
        <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center">
                <div className="text-[9px] font-bold text-white/40 tracking-[0.3em]">// NEURAL_PATTERN</div>
                {isLive && (
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 border border-[#ff006e] animate-pulse">
                        <div className="w-1 h-1 bg-[#ff006e] rounded-full" />
                        <span className="text-[7px] font-black text-[#ff006e] mono">SIGNAL_LIVE</span>
                    </div>
                )}
            </div>
            <div className="flex items-end gap-[2px] h-12">
                {Array.from({ length: 24 }).map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{
                            height: isLive
                                ? [15, 45, 20, 40, 10, 35, 15, 45][(i + Math.floor(Date.now() / 80)) % 8]
                                : isQuiet
                                    ? [2, 4, 3, 5, 2][(i + i) % 5]
                                    : [18, 25, 15, 22, 12][(i + Math.floor(Date.now() / 500)) % 5]
                        }}
                        transition={{
                            duration: isLive ? 0.15 : (isQuiet ? 2 : 0.8),
                            repeat: Infinity,
                            delay: i * 0.04
                        }}
                        className={`flex-1 ${isQuiet ? 'bg-white/5 shadow-[0_0_10px_rgba(255,255,255,0.02)]' : isLive ? 'bg-[#ff006e] shadow-[0_0_15px_rgba(255,0,110,0.5)]' : 'bg-[#ff006e]/20 shadow-[0_0_10px_rgba(255,0,110,0.1)]'}`}
                    />
                ))}
            </div>
            <div className="flex justify-between text-[7px] text-white/20 mono uppercase">
                <span>Sync: {isQuiet ? 'SILENT' : isLive ? 'ESTABLISHED_LINK' : 'IDLE_SYNC'}</span>
                <span>Freq: {isQuiet ? '0.0' : isLive ? '440.0' : '97.4'} Hz</span>
            </div>
            {!isLive && !isQuiet && featuredTrack && (
                <div className="text-[7px] text-[#ff006e]/40 mono uppercase tracking-widest truncate">
                    _FEATURED_SIGNAL: {featuredTrack.title}
                </div>
            )}
        </div>
    );
};

// --- VISTA: PERFIL (DISEÑO SLAVA KORNILOV) ---
export const ProfileView = ({ user: currentUser, tracks: allTracks, onLogout, onAddCredits, onRefreshProfile, onRefreshTracks, targetUserId, navigateToProfile, onPlayPlaylist, initialModal, onClearInitialModal }) => {
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
    const [showSettings, setShowSettings] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);

    const [leftOpen, setLeftOpen] = useState(false);
    const [rightOpen, setRightOpen] = useState(false);
    const [roomMode, setRoomMode] = useState('monitor');

    const [showIngestMenu, setShowIngestMenu] = useState(false);
    const [selectedContent, setSelectedContent] = useState(null);
    const [expandedEntries, setExpandedEntries] = useState({});
    const [showJournalForm, setShowJournalForm] = useState(false);

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

    // Playlist State
    const [playlists, setPlaylists] = useState([]);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isPlaylistPublic, setIsPlaylistPublic] = useState(true);

    // Selected Playlist State
    const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
    const [playlistDetails, setPlaylistDetails] = useState(null); // { Playlist, Tracks }
    const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

    const isMe = !targetUserId || String(targetUserId) === String(currentUser?.id || currentUser?.Id);
    const displayUser = isMe ? currentUser : profileData;

    // Fetch Playlists — always on mount/profile change so SEQ_MAPS stat is accurate
    React.useEffect(() => {
        const fetchPlaylists = async () => {
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
                        isPublic: p.isPublic !== undefined ? p.isPublic : p.IsPublic,
                        description: p.description || p.Description
                    }));
                    setPlaylists(normalized.filter(p => p.id && String(p.id).trim() !== ''));
                }
            } catch (err) {
                console.error("Failed to fetch playlists", err);
            }
        };
        fetchPlaylists();
    }, [targetUserId, currentUser, isMe]);

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
            setPlaylists(normalized.filter(p => p.id && String(p.id).trim() !== ''));
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
            setPlaylists(normalized.filter(p => p.id && String(p.id).trim() !== ''));

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
            setPlaylists(normalized.filter(p => p.id && String(p.id).trim() !== ''));
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
            await API.Users.updateProfile(formData);
            setShowEditProfile(false);
            if (onRefreshProfile) onRefreshProfile();
        } catch (err) {
            console.error("Update failed", err);
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
    React.useEffect(() => {
        const fetchTargetProfile = async () => {
            if (isMe) {
                setProfileData(null);
                return;
            }

            setIsLoadingProfile(true);
            try {
                const API = await import('../services/api').then(mod => mod.default);

                // Fetch basic user data first
                const userRes = await API.Users.getUserById(targetUserId).catch(() => ({ data: null }));
                if (userRes.data) {
                    setProfileData(userRes.data);
                }

                // Fetch My Likes to sync state
                try {
                    const lResp = await API.Likes.getMyLikes();
                    setMyLikes(Array.isArray(lResp.data) ? lResp.data : []);
                } catch (e) {
                    console.error("Failed to fetch likes", e);
                }

                // Try to resolve ArtistId if this user is an artist
                const artistRes = await API.Artists.getByUserId(targetUserId).catch(() => ({ data: null }));
                if (artistRes.data) {
                    setProfileData(prev => ({
                        ...prev,
                        isLive: artistRes.data.isLive || artistRes.data.IsLive,
                        featuredTrackId: artistRes.data.featuredTrackId || artistRes.data.FeaturedTrackId
                    }));
                }
                const artistId = artistRes.data?.id || artistRes.data?.Id;

                const [tracksRes, followingRes] = await Promise.all([
                    API.Tracks.getAllTracks(),
                    API.Users.getFollowing(currentUser?.id || currentUser?.Id).catch(() => ({ data: [] }))
                ]);

                // Check following status (Compare User IDs since GetFollowing returns Users)
                const following = followingRes.data || [];
                setIsFollowing(following.some(a => String(a.id || a.Id) === String(targetUserId)));

                const tracks = tracksRes.data || [];

                const filtered = tracks.filter(t => {
                    const tUserId = t.artistUserId || t.ArtistUserId ||
                        t.album?.artist?.userId || t.Album?.Artist?.UserId ||
                        t.album?.Artist?.UserId || t.Album?.artist?.userId; // Combinations

                    return String(tUserId) === String(targetUserId);
                }).map(t => ({
                    ...t,
                    id: t.id || t.Id,
                    cover: t.coverImageUrl || t.CoverImageUrl ? (t.coverImageUrl || t.CoverImageUrl).startsWith('http') ? (t.coverImageUrl || t.CoverImageUrl) : `http://localhost:5264${t.coverImageUrl || t.CoverImageUrl}` : null
                })).filter(t => t.id && String(t.id).trim() !== ''); // STRICT FILTER: No empty IDs
                setProfileTracks(filtered);

                try {
                    const [jRes, gRes] = await Promise.all([
                        API.Journal.getUserJournal(targetUserId).catch(() => ({ data: [] })),
                        API.Studio.getUserGallery(targetUserId).catch(() => ({ data: [] }))
                    ]);
                    setProfileJournal(jRes.data || []);
                    setProfileGallery(gRes.data || []);
                } catch (e) {
                    console.error("Failed to fetch studio content", e);
                }

            } catch (err) {
                console.error("Failed to fetch target profile", err);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchTargetProfile();
    }, [targetUserId, isMe, currentUser]);


    // Fetch Self Journal if isMe
    React.useEffect(() => {
        if (isMe && currentUser) {
            const fetchOwnStudio = async () => {
                try {
                    const API = await import('../services/api').then(mod => mod.default);
                    const [jRes, gRes] = await Promise.all([
                        API.Journal.getMyJournal().catch(() => ({ data: [] })),
                        API.Studio.getMyGallery().catch(() => ({ data: [] }))
                    ]);
                    setProfileJournal(jRes.data || []);
                    setProfileGallery(gRes.data || []);
                } catch (err) {
                    console.error("Failed to fetch own studio content", err);
                }
            };
            fetchOwnStudio();
        }
    }, [isMe, currentUser, activeTab]);

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
                monitorTitle={displayUser?.username || 'GUEST_USER'}
                leftOpen={leftOpen}
                rightOpen={rightOpen}
                onToggleLeft={setLeftOpen}
                onToggleRight={setRightOpen}
                roomMode={roomMode}
                setRoomMode={setRoomMode}
                onUpload={() => setShowUpload(true)}
                onExpandContent={setSelectedContent}
                gallery={profileGallery}
                tracks={isMe ? allTracks?.filter(t => {
                    const tUid = t.artistUserId || t.ArtistUserId;
                    const cUid = currentUser?.id || currentUser?.Id || currentUser?.userId || currentUser?.UserId;
                    return tUid !== undefined && tUid !== null && String(tUid) === String(cUid);
                }) : profileTracks}
                journal={isMe ? profileJournal : profileJournal.filter(j => j.IsPosted)}
                bannerUrl={displayUser?.bannerUrl || displayUser?.BannerUrl}
                wallpaperVideoUrl={displayUser?.wallpaperVideoUrl || displayUser?.WallpaperVideoUrl}
                themeColor={displayUser?.themeColor || displayUser?.ThemeColor}
                textColor={displayUser?.textColor || displayUser?.TextColor}
                backgroundColor={displayUser?.backgroundColor || displayUser?.BackgroundColor}
                isGlass={displayUser?.isGlass || displayUser?.IsGlass}
                // Override with preview values if editing (and isMe)
                previewThemeColor={isMe && showEditProfile ? profileData?.previewThemeColor : null}
                previewTextColor={isMe && showEditProfile ? profileData?.previewTextColor : null}
                previewBackgroundColor={isMe && showEditProfile ? profileData?.previewBackgroundColor : null}
                previewIsGlass={isMe && showEditProfile ? profileData?.previewIsGlass : null}
                leftContent={
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// BIOMETRIC_ID</div>
                            <div className="aspect-square border border-[#ff006e]/30 p-1 relative group bg-black overflow-hidden">
                                {displayUser?.profileImageUrl ? (
                                    <img src={displayUser.profileImageUrl.startsWith('http') ? displayUser.profileImageUrl : `http://localhost:5264${displayUser.profileImageUrl}`} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#ff006e]/20"><Cpu size={40} /></div>
                                )}
                                <div className="absolute inset-0 bg-[#ff006e]/5 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-[var(--text-color)]/5">
                            <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// SYSTEM_STATS</div>
                            <StatItem label="DAT_SIGNALS" value={isMe ? (allTracks?.filter(t => String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)).length || 0) : profileTracks.length} />
                            <StatItem label="SEQ_MAPS" value={playlists.length} />
                            <StatItem label="TOTAL_SCANS" value={(isMe ? allTracks?.filter(t => String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)) : profileTracks).reduce((acc, t) => acc + (t.playCount || 0), 0).toLocaleString()} />
                        </div>

                        <div className="space-y-2 pt-6 border-t border-[var(--text-color)]/5">
                            <div className="flex items-center gap-2 text-[#ff006e] animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff006e]" />
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
                        {!isMe && (
                            <div className="space-y-4">
                                <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// ACTION_PROTOCOL</div>
                                <button
                                    onClick={handleFollow}
                                    className={`w-full py-4 border font-bold text-[10px] uppercase transition-all transform hover:-translate-y-0.5 ${isFollowing
                                        ? 'bg-[#ff006e]/10 text-[#ff006e] border-[#ff006e] shadow-[0_0_20px_#ff006e20]'
                                        : 'bg-black text-[var(--text-color)] border-[var(--text-color)]/20 hover:border-[#ff006e] hover:text-[#ff006e]'
                                        }`}
                                >
                                    {isFollowing ? '[ DISCONNECT_LINK ]' : '[ ESTABLISH_LINK ]'}
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// IDENTITY_BIO</div>
                            <div className="text-[10px] text-[#ff006e]/80 leading-relaxed mono break-words border-l border-[#ff006e]/20 pl-4 py-2">
                                {displayUser?.biography || displayUser?.bio || '> NO_BIOMETRIC_DATA_AVAILABLE'}
                            </div>
                        </div>

                        <NeuralPattern
                            isLive={displayUser?.isLive || displayUser?.IsLive}
                            featuredTrack={profileTracks.find(t => String(t.id || t.Id) === String(displayUser?.featuredTrackId || displayUser?.FeaturedTrackId))}
                            isQuiet={!(displayUser?.featuredTrackId || displayUser?.FeaturedTrackId)}
                        />

                        <div className="space-y-4 pt-4 border-t border-[var(--text-color)]/5">
                            <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// NEURAL_LOCATION</div>
                            <div className="space-y-3">
                                <span className="flex items-center gap-3 text-[9px] uppercase font-bold tracking-widest text-[#ff006e]">
                                    <MapPin size={12} />
                                    SECTOR: {['NEON SLUMS', 'SILICON HEIGHTS', 'DATA VOID', 'CENTRAL HUB', 'OUTER RIM'][displayUser?.residentSectorId] || '0X00_DRIFT'}
                                </span>
                                <span className="flex items-center gap-3 text-[9px] uppercase font-bold tracking-widest text-[var(--text-color)]/40">
                                    <Calendar size={12} />
                                    INITIALIZED: 2024.Q1
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-[var(--text-color)]/5">
                            <div className="text-[9px] font-bold text-[var(--text-color)]/40 tracking-[0.3em]">// RECENT_LOGS</div>
                            {[
                                { time: '14:02', msg: 'Movement detected' },
                                { time: '14:23', msg: 'Signal interference' },
                                { time: '15:11', msg: 'Data sync complete' }
                            ].map((log, i) => (
                                <div key={i} className="flex gap-3 text-[8px] mono uppercase opacity-40 hover:opacity-100 transition-opacity">
                                    <span className="text-[var(--text-color)]">{log.time}</span>
                                    <span className="text-[#ff006e]">{log.msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                }
            >
                <div className="p-8">
                    {/* Minimal Header Inside Monitor */}
                    <div className="flex justify-between items-center mb-10 pb-6 border-b border-[#ff006e]/10">
                        <div className="flex gap-4">
                            <button onClick={() => setActiveTab('Music')} className={`text-[10px] font-bold tracking-[0.4em] uppercase transition-all ${activeTab === 'Music' ? 'text-[#ff006e]' : 'text-[var(--text-color)]/20 hover:text-[var(--text-color)]'}`}>
                                [ MUSIC ]
                            </button>
                            <button onClick={() => setActiveTab('Playlists')} className={`text-[10px] font-bold tracking-[0.4em] uppercase transition-all ${activeTab === 'Playlists' ? 'text-[#ff006e]' : 'text-[var(--text-color)]/20 hover:text-[var(--text-color)]'}`}>
                                [ SEQUENCES ]
                            </button>
                            <button onClick={() => setActiveTab('Studio')} className={`text-[10px] font-bold tracking-[0.4em] uppercase transition-all ${activeTab === 'Studio' ? 'text-[#ff006e]' : 'text-[var(--text-color)]/20 hover:text-[var(--text-color)]'}`}>
                                [ CORE_LOGS ]
                            </button>
                        </div>
                        <div className="flex gap-2">
                            {isMe && (
                                <button onClick={() => setShowEditProfile(true)} className="px-3 py-1 border border-[#ff006e]/30 text-[#ff006e]/40 hover:text-[#ff006e] transition-all mono text-[9px] uppercase">
                                    MODIFY_ID
                                </button>
                            )}
                            <button onClick={() => navigateToProfile(null)} className="px-3 py-1 border border-[var(--text-color)]/10 text-[var(--text-color)]/20 hover:text-[var(--text-color)] transition-all mono text-[9px] uppercase">
                                EXIT_CORE
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'Music' && (
                        <div className="space-y-2">
                            {(isMe ? allTracks?.filter(t => String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)) : profileTracks)
                                .sort((a, b) => {
                                    const aPinned = a.IsPinned || a.isPinned ? 1 : 0;
                                    const bPinned = b.IsPinned || b.isPinned ? 1 : 0;
                                    if (bPinned !== aPinned) return bPinned - aPinned;

                                    const dateA = new Date(a.CreatedAt || a.createdAt || 0).getTime();
                                    const dateB = new Date(b.CreatedAt || b.createdAt || 0).getTime();
                                    return dateB - dateA;
                                })
                                .map((track, idx) => (
                                    <div key={track.id || `track-${idx}`} className="flex items-center justify-between p-4 bg-black border border-[var(--text-color)]/5 hover:border-[#ff006e]/30 transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className="w-10">
                                                <span className="text-[10px] text-[#ff006e]/20 font-bold mono">[{String(idx + 1).padStart(2, '0')}]</span>
                                            </div>
                                            <div className="w-8 h-8 border border-white/10 bg-black overflow-hidden relative grayscale group-hover:grayscale-0 transition-all">
                                                {track.cover ? (
                                                    <img src={track.cover} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[#ff006e]/20"><Music size={14} /></div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-[var(--text-color)] uppercase tracking-wider group-hover:text-[#ff006e]">{track.title}</div>
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
                                                                await API.Tracks.togglePin(track.id || track.Id);
                                                                const isPinnedNow = !(track.IsPinned || track.isPinned);
                                                                showNotification(isPinnedNow ? "SIGNAL_PINNED" : "SIGNAL_UNPINNED", `TRACK_${isPinnedNow ? 'PRIORITIZED_ON' : 'REMOVED_FROM'}_MONITOR`, "success");
                                                                onRefreshTracks?.();
                                                                onRefreshProfile?.();
                                                            } catch (err) { console.error(err); }
                                                        }}
                                                        className={`p-2 border transition-all ${track.isPinned || track.IsPinned ? 'bg-white text-black border-white' : 'border-white/10 text-white/40 hover:text-white hover:border-white/30'}`}
                                                        title="Pin to Monitor"
                                                    >
                                                        <Star size={12} fill={track.isPinned || track.IsPinned ? "currentColor" : "none"} />
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                const API = await import('../services/api').then(mod => mod.default);
                                                                await API.Tracks.togglePost(track.id || track.Id);
                                                                const isPostedNow = !(track.IsPosted || track.isPosted);
                                                                showNotification(isPostedNow ? "SIGNAL_BROADCAST" : "SIGNAL_REDACTED", `TRACK_${isPostedNow ? 'ADDED_TO' : 'REMOVED_FROM'}_WALL`, "success");
                                                                // Optimistic update or refresh
                                                                if (onRefreshTracks) onRefreshTracks();
                                                                if (onRefreshProfile) onRefreshProfile();
                                                            } catch (err) { console.error(err); }
                                                        }}
                                                        className={`p-2 border transition-all ${track.isPosted || track.IsPosted ? 'bg-[#ff006e] text-black border-[#ff006e]' : 'border-[#ff006e]/20 text-[#ff006e]/40 hover:text-[#ff006e] hover:border-[#ff006e]/40'}`}
                                                        title="Pin to Wall"
                                                    >
                                                        <Share2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                            <TrackActionsDropdown track={track} isOwner={isMe} playlists={playlists} myLikes={myLikes} isLikedInitial={myLikes.some(l => (l.trackId || l.TrackId) === (track.id || track.Id))} onDelete={() => handleDeleteTrack(track)} />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {activeTab === 'Playlists' && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {isMe && (
                                <button
                                    onClick={() => setShowCreatePlaylist(true)}
                                    className="border border-dashed border-[#ff006e]/30 p-4 hover:border-[#ff006e] transition-all cursor-pointer group bg-black/40 flex flex-col items-center justify-center gap-4 text-[#ff006e]/40 hover:text-[#ff006e]"
                                >
                                    <Plus size={32} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">INIT_NEW_SEQUENCE</span>
                                </button>
                            )}
                            {playlists.map(p => (
                                <div key={p.id} onClick={() => handleOpenPlaylist(p.id)} className="border border-[var(--text-color)]/5 p-4 hover:border-[#ff006e]/40 transition-all cursor-pointer group bg-black/40">
                                    <div className="aspect-square bg-black overflow-hidden relative mb-4">
                                        {(p.imageUrl || p.ImageUrl) ? (
                                            <img src={(p.imageUrl || p.ImageUrl).startsWith('http') ? (p.imageUrl || p.ImageUrl) : `http://localhost:5264${(p.imageUrl || p.ImageUrl)}`} className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-100 transition-all" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#ff006e]/10"><Database size={32} /></div>
                                        )}
                                        <div className="absolute top-0 left-0 bg-[#ff006e] text-black text-[8px] font-bold px-1.5 py-0.5 mono">#{String(p.id).padStart(3, '0')}</div>
                                    </div>
                                    <h4 className="text-[10px] font-bold text-[var(--text-color)] uppercase truncate tracking-widest">{p.name}</h4>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'Studio' && (
                        <div className="space-y-6">
                            {/* Studio Sub-tabs + Universal Ingest */}
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
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
                                                className={`flex items-center gap-2 text-[8px] mono font-bold tracking-widest uppercase transition-all ${studioSubTab === tab ? 'text-[#ff006e]' : 'text-white/20 hover:text-white/60'}`}
                                            >
                                                {tab === 'Photos' && <Camera size={12} />}
                                                {tab === 'Video' && <Video size={12} />}
                                                {tab === 'Journal' && <Book size={12} />}
                                                {tab === 'All' && <Hash size={12} />}
                                                [{tab}] <span className="text-[#ff006e]/40">{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Universal Ingest Menu */}
                                {isMe && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowIngestMenu(!showIngestMenu)}
                                            className="px-4 py-1.5 bg-[#ff006e]/10 border border-[#ff006e]/40 text-[#ff006e] text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-[#ff006e] hover:text-black transition-all flex items-center gap-2"
                                        >
                                            <Upload size={12} /> [ INGEST_DATA ]
                                        </button>

                                        <AnimatePresence>
                                            {showIngestMenu && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute right-0 top-full mt-2 w-48 bg-black border border-[#ff006e]/30 shadow-[0_0_30px_rgba(255,0,110,0.1)] z-[100]"
                                                >
                                                    <div className="p-1 space-y-1">
                                                        <button
                                                            onClick={() => document.getElementById('ingest-log').click()}
                                                            className="w-full text-left px-4 py-2 text-[8px] font-bold text-[#ff006e]/60 hover:text-[#ff006e] hover:bg-[#ff006e]/10 transition-all uppercase mono flex items-center gap-3"
                                                        >
                                                            <Book size={12} /> [ CORE_LOG ]
                                                        </button>
                                                        <button
                                                            onClick={() => document.getElementById('ingest-visual').click()}
                                                            className="w-full text-left px-4 py-2 text-[8px] font-bold text-[#ff006e]/60 hover:text-[#ff006e] hover:bg-[#ff006e]/10 transition-all uppercase mono flex items-center gap-3"
                                                        >
                                                            <Camera size={12} /> [ VISUAL_DATA ]
                                                        </button>
                                                        <button
                                                            onClick={() => document.getElementById('ingest-signal').click()}
                                                            className="w-full text-left px-4 py-2 text-[8px] font-bold text-[#ff006e]/60 hover:text-[#ff006e] hover:bg-[#ff006e]/10 transition-all uppercase mono flex items-center gap-3"
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

                            {/* Studio Content Header / Carousel for 'All' Tab */}
                            {studioSubTab === 'All' && (
                                <div className="mb-8 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="mono text-[10px] font-black text-[#ff006e]/60 uppercase tracking-[0.3em]">SIGNAL_GALLERY</h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const el = document.getElementById('media-carousel');
                                                    if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                                                }}
                                                className="p-1 border border-[#ff006e]/20 text-[#ff006e]/40 hover:text-[#ff006e] transition-all"
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const el = document.getElementById('media-carousel');
                                                    if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                                                }}
                                                className="p-1 border border-[#ff006e]/20 text-[#ff006e]/40 hover:text-[#ff006e] transition-all"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        id="media-carousel"
                                        className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
                                    >
                                        {profileGallery
                                            .sort((a, b) => {
                                                const aPinned = a.IsPinned || a.isPinned ? 1 : 0;
                                                const bPinned = b.IsPinned || b.isPinned ? 1 : 0;
                                                if (bPinned !== aPinned) return bPinned - aPinned;
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
                                                                        showNotification((content.IsPinned || content.isPinned) ? "SIGNAL_UNPINNED" : "SIGNAL_PINNED", `CONTENT_${(content.IsPinned || content.isPinned) ? 'REMOVED_FROM' : 'PRIORITIZED_ON'}_MONITOR`, "success");
                                                                        const resArr = await API.Studio.getMyGallery();
                                                                        setProfileGallery(resArr.data || []);
                                                                    } catch (err) { console.error(err); }
                                                                }}
                                                                className={`p-1.5 border backdrop-blur-md transition-all ${(content.IsPinned || content.isPinned) ? 'bg-white text-black border-white' : 'bg-black/60 text-white/40 border-white/10 hover:text-white'}`}
                                                                title="Pin to Monitor"
                                                            >
                                                                <Star size={10} fill={(content.IsPinned || content.isPinned) ? "currentColor" : "none"} />
                                                            </button>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        const API = await import('../services/api').then(mod => mod.default);
                                                                        await API.Studio.togglePost(content.Id || content.id);
                                                                        const isPostedNow = !(content.IsPosted || content.isPosted);
                                                                        showNotification(isPostedNow ? "SIGNAL_BROADCAST" : "SIGNAL_REDACTED", `CONTENT_${isPostedNow ? 'ADDED_TO' : 'REMOVED_FROM'}_WALL`, "success");
                                                                        const resArr = await API.Studio.getMyGallery();
                                                                        setProfileGallery(resArr.data || []);
                                                                    } catch (err) { console.error(err); }
                                                                }}
                                                                className={`p-1.5 border backdrop-blur-md transition-all ${(content.IsPosted || content.isPosted) ? 'bg-[#ff006e] text-black border-[#ff006e]' : 'bg-black/60 text-[#ff006e]/40 border-[#ff006e]/10 hover:text-[#ff006e]'}`}
                                                                title="Pin to Wall"
                                                            >
                                                                <Share2 size={10} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end"
                                                        onClick={() => setSelectedContent({ ...content, type: content.Type || 'PHOTO' })}>
                                                        <div className="text-[7px] mono font-bold text-[#ff006e] tracking-widest uppercase mb-1">
                                                            {content.Type === 'PHOTO' ? '// VISUAL_DATA' : '// SIGNAL_FEED'}
                                                        </div>
                                                        <div className="text-[8px] mono text-white truncate uppercase">{content.Title}</div>
                                                    </div>
                                                    {content.Type === 'VIDEO' ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 space-y-2"
                                                            onClick={() => setSelectedContent({ ...content, type: content.Type || 'PHOTO' })}>
                                                            <Video size={16} className="text-[#ff006e]/40" />
                                                            <div className="text-[6px] mono text-white/20 uppercase">DECODING_SIGNAL...</div>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={content.Url?.startsWith('http') ? content.Url : `http://localhost:5264${content.Url}`}
                                                            alt={content.Title}
                                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500"
                                                            onClick={() => setSelectedContent({ ...content, type: content.Type || 'PHOTO' })}
                                                        />
                                                    )}
                                                </motion.div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Studio Content Grid for Photo/Video Tabs */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {profileGallery
                                    .filter(c => (studioSubTab === 'Photos' && c.Type === 'PHOTO') || (studioSubTab === 'Video' && c.Type === 'VIDEO'))
                                    .sort((a, b) => {
                                        const aPinned = (a.IsPinned || a.isPinned) ? 1 : 0;
                                        const bPinned = (b.IsPinned || b.isPinned) ? 1 : 0;
                                        if (bPinned !== aPinned) return bPinned - aPinned;
                                        return new Date(b.CreatedAt || b.createdAt) - new Date(a.CreatedAt || a.createdAt);
                                    })
                                    .map((content) => (
                                        <motion.div
                                            key={content.Id || content.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ scale: 1.02 }}
                                            className="group relative aspect-square bg-black border border-white/5 overflow-hidden cursor-pointer"
                                            onClick={() => setSelectedContent({ ...content, type: content.Type || 'PHOTO' })}
                                        >
                                            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                                                <div className="text-[7px] mono font-bold text-[#ff006e] tracking-widest uppercase mb-1">
                                                    {content.Type === 'PHOTO' ? '// VISUAL_DATA' : '// SIGNAL_FEED'}
                                                </div>
                                                <div className="text-[8px] mono text-white truncate uppercase">{content.Title}</div>
                                            </div>
                                            {content.Type === 'VIDEO' ? (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 space-y-2">
                                                    <Video size={16} className="text-[#ff006e]/40" />
                                                    <div className="text-[6px] mono text-white/20 uppercase">DECODING_SIGNAL...</div>
                                                </div>
                                            ) : (
                                                <img
                                                    src={content.Url?.startsWith('http') ? content.Url : `http://localhost:5264${content.Url}`}
                                                    alt={content.Title}
                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500"
                                                />
                                            )}
                                            {isMe && (
                                                <div className="absolute top-2 left-2 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                const API = await import('../services/api').then(mod => mod.default);
                                                                await API.Studio.togglePin(content.Id || content.id);
                                                                const isPinnedNow = !(content.IsPinned || content.isPinned);
                                                                showNotification(isPinnedNow ? "SIGNAL_PINNED" : "SIGNAL_UNPINNED", `CONTENT_${isPinnedNow ? 'PRIORITIZED_ON' : 'REMOVED_FROM'}_MONITOR`, "success");
                                                                const resArr = await API.Studio.getMyGallery();
                                                                setProfileGallery(resArr.data || []);
                                                            } catch (err) { console.error(err); }
                                                        }}
                                                        className={`p-1.5 border backdrop-blur-md transition-all ${(content.IsPinned || content.isPinned) ? 'bg-white text-black border-white' : 'bg-black/60 text-white/40 border-white/10 hover:text-white'}`}
                                                        title="Pin to Monitor"
                                                    >
                                                        <Star size={10} fill={(content.IsPinned || content.isPinned) ? "currentColor" : "none"} />
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                const API = await import('../services/api').then(mod => mod.default);
                                                                await API.Studio.togglePost(content.Id || content.id);
                                                                const isPostedNow = !(content.IsPosted || content.isPosted);
                                                                showNotification(isPostedNow ? "SIGNAL_BROADCAST" : "SIGNAL_REDACTED", `CONTENT_${isPostedNow ? 'ADDED_TO' : 'REMOVED_FROM'}_WALL`, "success");
                                                                const resArr = await API.Studio.getMyGallery();
                                                                setProfileGallery(resArr.data || []);
                                                            } catch (err) { console.error(err); }
                                                        }}
                                                        className={`p-1.5 border backdrop-blur-md transition-all ${(content.IsPosted || content.isPosted) ? 'bg-[#ff006e] text-black border-[#ff006e]' : 'bg-black/60 text-[#ff006e]/40 border-[#ff006e]/10 hover:text-[#ff006e]'}`}
                                                        title="Pin to Wall"
                                                    >
                                                        <Share2 size={10} />
                                                    </button>
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-all">
                                                {content.Type === 'PHOTO' ? <Camera size={10} className="text-white/40" /> : <Video size={10} className="text-white/40" />}
                                            </div>
                                        </motion.div>
                                    ))}

                                {studioSubTab === 'Photos' && profileGallery.filter(c => c.Type === 'PHOTO').length === 0 && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/5 opacity-20">
                                        <Camera size={24} className="mb-4 text-[#ff006e]" />
                                        <span className="mono text-[8px] uppercase tracking-[0.2em]">GALLERY_ENCRYPTED_OR_EMPTY</span>
                                    </div>
                                )}
                                {studioSubTab === 'Video' && profileGallery.filter(c => c.Type === 'VIDEO').length === 0 && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/5 opacity-20">
                                        <Video size={24} className="mb-4 text-[#ff006e]" />
                                        <span className="mono text-[8px] uppercase tracking-[0.2em]">VISUAL_FEED_OFFLINE</span>
                                    </div>
                                )}
                            </div>
                            {(studioSubTab === 'Journal' || studioSubTab === 'All') && (
                                <div className="col-span-full space-y-6">
                                    {isMe && showJournalForm && (
                                        <div className="bg-black border border-[#ff006e]/20 p-6 space-y-4">
                                            <div className="flex justify-between items-center border-b border-[#ff006e]/10 pb-4">
                                                <h3 className="mono text-[10px] font-black text-[#ff006e] uppercase tracking-[0.3em]">INIT_NEW_ENTRY</h3>
                                            </div>
                                            <input
                                                id="journal-title"
                                                type="text"
                                                placeholder="ENTRY_TITLE..."
                                                className="w-full bg-black/40 border border-white/5 p-3 text-[10px] text-white mono outline-none focus:border-[#ff006e]/40 transition-all tracking-widest"
                                            />
                                            <textarea
                                                id="journal-content"
                                                placeholder="ENCODE_CORE_LOG_DATA..."
                                                className="w-full bg-black/40 border border-white/5 p-3 text-[10px] text-white/60 mono outline-none focus:border-[#ff006e]/40 transition-all min-h-[100px] resize-none tracking-wider leading-relaxed"
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
                                                    className="px-10 py-3 bg-[#ff006e]/10 border border-[#ff006e]/40 text-[#ff006e] text-[10px] font-black uppercase tracking-[0.4em] hover:bg-[#ff006e] hover:text-black transition-all"
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

                                    <div className="grid grid-cols-1 gap-4">
                                        {profileJournal.length > 0 ? (
                                            profileJournal.sort((a, b) => {
                                                const aPinned = (a.IsPinned || a.isPinned) ? 1 : 0;
                                                const bPinned = (b.IsPinned || b.isPinned) ? 1 : 0;
                                                if (bPinned !== aPinned) return bPinned - aPinned;
                                                return new Date(b.CreatedAt || b.createdAt) - new Date(a.CreatedAt || a.createdAt);
                                            }).map((entry, idx) => (
                                                <div key={entry.Id || idx} className={`p-6 border transition-all ${(entry.IsPosted || entry.isPosted) ? 'border-[#ff006e]/40 bg-[#ff006e]/5 shadow-[0_0_20px_#ff006e05]' : 'border-white/5 bg-black'}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-3">
                                                                {(entry.IsPinned || entry.isPinned) && <Star size={12} className="text-white fill-white" />}
                                                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{entry.Title || entry.title || '// UNTITLED_LOG'}</h3>
                                                            </div>
                                                            <span className="text-[8px] text-[#ff006e] mono">{new Date(entry.CreatedAt || entry.createdAt).toLocaleString()}</span>
                                                        </div>
                                                        {isMe && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const API = await import('../services/api').then(mod => mod.default);
                                                                            await API.Journal.togglePost(entry.Id || entry.id);
                                                                            showNotification((entry.IsPosted || entry.isPosted) ? "REMOVED_FROM_WALL" : "PINNED_TO_WALL", `ENTRY_${(entry.IsPosted || entry.isPosted) ? 'DETACHED_FROM' : 'ATTACHED_TO'}_PROFILE_SURFACE`, "success");
                                                                            const res = await (isMe ? API.Journal.getMyJournal() : API.Journal.getUserJournal(targetUserId));
                                                                            setProfileJournal(res.data || []);
                                                                        } catch (err) { console.error(err); }
                                                                    }}
                                                                    className={`px-3 py-1 border text-[7px] font-bold mono uppercase transition-all ${(entry.IsPosted || entry.isPosted) ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50 shadow-[0_0_10px_#00ffff10]' : 'text-white/40 border-white/20 hover:text-white'}`}
                                                                >
                                                                    {(entry.IsPosted || entry.isPosted) ? '[ PINNED_TO_WALL ]' : '[ PIN_TO_WALL ]'}
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const API = await import('../services/api').then(mod => mod.default);
                                                                            await API.Journal.togglePin(entry.Id || entry.id);
                                                                            showNotification((entry.IsPinned || entry.isPinned) ? "LOG_UNPINNED" : "LOG_PINNED", `ENTRY_${(entry.IsPinned || entry.isPinned) ? 'REMOVED_FROM' : 'PRIORITIZED_ON'}_MONITOR`, "success");
                                                                            const res = await (isMe ? API.Journal.getMyJournal() : API.Journal.getUserJournal(targetUserId));
                                                                            setProfileJournal(res.data || []);
                                                                        } catch (err) { console.error(err); }
                                                                    }}
                                                                    className={`px-3 py-1 border text-[7px] font-bold mono uppercase transition-all ${(entry.IsPinned || entry.isPinned) ? 'bg-white text-black border-white' : 'text-white/40 border-white/20 hover:text-white'}`}
                                                                >
                                                                    {(entry.IsPinned || entry.isPinned) ? '[ PINNED_TO_MONITOR ]' : '[ PIN_TO_MONITOR ]'}
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
                                                            className="mt-2 text-[7px] font-bold text-[#ff006e] uppercase tracking-widest hover:underline"
                                                        >
                                                            [ EXPAND_SIGNAL_DATA ]
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/5 opacity-20">
                                                <Book size={32} className="mb-4" />
                                                <span className="mono text-[10px] uppercase">NO_ARCHIVED_LOGS_FOUND</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div >
            </SpatialRoomLayout >

            {/* Global Overlays */}
            < AnimatePresence >
                {showCreatePlaylist && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="bg-black border border-[#ff006e]/30 p-10 max-w-md w-full relative">
                            <button onClick={() => setShowCreatePlaylist(false)} className="absolute top-4 right-4 text-[#ff006e]/40 hover:text-[#ff006e]">[ X ]</button>
                            <h3 className="text-xl font-bold text-white uppercase tracking-tighter mb-8 pb-4 border-b border-[#ff006e]/20">// INIT_SEQ_MAP_V1</h3>
                            <form onSubmit={handleCreatePlaylist} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-[#ff006e] uppercase tracking-[0.4em]">_SEQUENCE_NAME</label>
                                    <input type="text" value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} className="w-full bg-black border border-white/10 p-4 text-white font-bold outline-none focus:border-[#ff006e] uppercase tracking-widest transition-all" placeholder="SEQUENCE_ID_0" />
                                </div>
                                <div className="flex items-center justify-between p-4 border border-white/5 cursor-pointer group" onClick={() => setIsPlaylistPublic(!isPlaylistPublic)}>
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">_ACCESS_PROTOCOL</span>
                                    <span className="text-[9px] text-[#ff006e] uppercase">{isPlaylistPublic ? 'PUBL_SYSTEM' : 'PRIV_ENCRYPTED'}</span>
                                </div>
                                <button type="submit" className="w-full py-4 bg-black border border-[#ff006e] text-[#ff006e] font-bold uppercase tracking-widest hover:bg-[#ff006e] hover:text-black transition-all">ESTABLISH_SEQUENCE</button>
                            </form>
                        </div>
                    </motion.div>
                )
                }
                {
                    showUpload && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black p-6 flex flex-col overflow-y-auto">
                            <button onClick={() => setShowUpload(false)} className="self-end px-4 py-2 border border-[#ff006e]/30 text-[#ff006e]/40 hover:text-[#ff006e] mb-10 mono text-xs uppercase">[ ABORT ]</button>
                            <div className="max-w-5xl mx-auto w-full"><UploadTrackView onClose={() => setShowUpload(false)} onRefreshTracks={onRefreshTracks} /></div>
                        </motion.div>
                    )
                }
                {
                    showEditProfile && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
                            <div className="bg-black border border-[#ff006e]/30 p-10 max-w-xl w-full relative flex flex-col">
                                <button onClick={() => setShowEditProfile(false)} className="absolute top-4 right-4 text-[#ff006e]/40 hover:text-[#ff006e]">[ X ]</button>
                                <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
                                    <EditProfileForm
                                        user={displayUser}
                                        tracks={isMe ? allTracks.filter(t => t.isOwned || t.isLiked || String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)) : profileTracks}
                                        onSubmit={handleUpdateProfile}
                                        onColorPreview={(colors) => {
                                            // Update local state to trigger re-render of SpatialRoomLayout with new colors
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
                            <div className="bg-black border border-[#ff006e]/20 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative">
                                <button onClick={() => setSelectedPlaylistId(null)} className="absolute top-4 right-4 z-50 text-[#ff006e]/40 hover:text-[#ff006e]">[ DISCONNECT ]</button>
                                {isLoadingPlaylist ? (
                                    <div className="flex-1 flex items-center justify-center"><RefreshCw className="animate-spin text-[#ff006e]" /></div>
                                ) : (
                                    <PlaylistDetailsModal
                                        playlist={playlistDetails?.playlist || playlistDetails?.Playlist}
                                        tracks={playlistDetails?.tracks || playlistDetails?.Tracks}
                                        isOwner={isMe}
                                        onUpdate={handleUpdatePlaylist}
                                        onDelete={handleDeletePlaylist}
                                        onRemoveTrack={handleRemoveTrackFromPlaylist}
                                        onPlayAll={(tracks) => onPlayPlaylist?.(tracks)}
                                        playlists={playlists}
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
            </AnimatePresence >
            <CRTOverlay />
        </>
    );
};

// --- SUB-COMPONENTES AUXILIARES ---

const ProfileTabIcon = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-8 py-2 relative transition-all duration-300 mono text-[10px] font-bold tracking-[0.4em] ${active ? 'text-[#ff006e]' : 'text-white/20 hover:text-white/60'}`}
    >
        {active ? `[ ${label} ]` : label}
    </button>
);

const Accordion = ({ title, isOpen, onToggle, children }) => (
    <div className="border border-[#ff006e]/20 rounded-2xl overflow-hidden bg-[#0a0a0a]/80 backdrop-blur-md">
        <button
            onClick={onToggle}
            className="w-full flex justify-between items-center p-5 text-[11px] font-black uppercase tracking-[0.3em] text-[#ff006e] hover:bg-[#ff006e]/5"
        >
            <span>{title}</span>
            <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={14} className="text-[#ff006e]/60" />
            </div>
        </button>
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-black/40 border-t border-[#ff006e]/10 p-5 pt-3"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);



const EditProfileForm = ({ user, tracks = [], onSubmit, onColorPreview }) => {
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
    const [themeColor, setThemeColor] = useState(user?.themeColor || user?.ThemeColor || '#ff006e');
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
            setThemeColor(user.themeColor || user.ThemeColor || '#ff006e');
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
        { id: 0, name: 'NEON SLUMS', color: '#ff006e' },
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
            // Ensure ID is sent as valid integer string
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
                    <div className="flex items-center gap-10">
                        <div className="w-28 h-28 bg-black border border-[var(--theme-color)]/30 flex items-center justify-center overflow-hidden relative group shadow-[0_0_40px_rgba(var(--theme-color-rgb),0.05)]">
                            {file ? (
                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                            ) : user?.profileImageUrl ? (
                                <img src={user.profileImageUrl.startsWith('http') ? user.profileImageUrl : `http://localhost:5264${user.profileImageUrl}`} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-[var(--theme-color)]/20 drop-shadow-[0_0_10px_#ff006e30]"><Cpu size={40} /></div>
                            )}
                            <input
                                type="file"
                                onChange={e => setFile(e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="absolute inset-0 bg-[var(--theme-color)]/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Terminal size={24} className="text-[var(--text-color)]" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] font-bold text-[var(--theme-color)] uppercase tracking-[0.5em]">BIOMETRIC_ID</div>
                            <div className="text-[9px] text-[var(--text-color)]/40 uppercase tracking-[0.3em] max-w-[250px] leading-relaxed">
                                UPLOAD NEW VISUAL IDENTIFIER. PNG/JPG ENCODING ONLY.
                            </div>
                        </div>
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-[var(--text-color)]/60 uppercase tracking-[0.4em]">_DESIGNATION</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-color)] mono">{'>'}</span>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-black border border-[var(--text-color)]/10 p-4 pl-10 text-[var(--text-color)] font-bold outline-none focus:border-[var(--theme-color)] transition-all uppercase tracking-widest"
                                    placeholder="DESIGNATION_ID"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-[var(--text-color)]/60 uppercase tracking-[0.4em]">_RESIDENCY_V2</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-color)] mono">{'>'}</span>
                                <select
                                    value={sectorId}
                                    onChange={(e) => setSectorId(parseInt(e.target.value))}
                                    className="w-full bg-black border border-[var(--text-color)]/10 p-4 pl-10 text-[var(--text-color)] font-bold outline-none focus:border-[var(--theme-color)] appearance-none uppercase transition-all tracking-widest"
                                >
                                    {SECTORS.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-color)]/20 group-hover:text-[var(--theme-color)] pointer-events-none transition-colors" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-[var(--text-color)]/60 uppercase tracking-[0.2em] truncate block overflow-hidden">_FEATURED_NEURAL_PATTERN</label>
                            <div className="relative">
                                <div
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full bg-black border p-4 pl-10 flex items-center justify-between cursor-pointer transition-all ${isDropdownOpen ? 'border-[var(--theme-color)] shadow-[0_0_15px_#ff006e30]' : 'border-[var(--text-color)]/10 hover:border-[var(--theme-color)]/40'}`}
                                >
                                    <span className="absolute left-4 text-[var(--theme-color)] mono">{'>'}</span>
                                    <span className={`text-xs font-bold uppercase tracking-widest truncate ${featuredTrackId == -1 ? 'text-[var(--theme-color)]/60 font-black' : 'text-[var(--text-color)]'}`}>
                                        {featuredTrackId == -1 ? '[ QUIET_MODE ]' : (selectedTrack?.title || 'UNKNOWN_PATTERN').toUpperCase()}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-[var(--theme-color)]' : 'text-[var(--text-color)]/20'}`} />
                                </div>

                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 5 }}
                                            className="absolute left-0 right-0 top-full mt-2 bg-[#050505] border border-[var(--theme-color)]/40 z-[100] shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col max-h-80 overflow-hidden backdrop-blur-xl"
                                        >
                                            <div className="p-3 border-b border-[var(--theme-color)]/10 bg-black/40">
                                                <div className="relative flex items-center">
                                                    <Search size={12} className="absolute left-3 text-[var(--theme-color)]/40" />
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        placeholder="FILTER_SIGNALS..."
                                                        className="w-full bg-black/80 border border-[var(--theme-color)]/20 p-2 pl-8 text-[9px] text-[var(--text-color)] outline-none focus:border-[var(--theme-color)] transition-all uppercase tracking-[0.3em] font-black"
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
                                                                className={`p-4 text-[9px] font-bold uppercase tracking-wider cursor-pointer border-b border-[var(--text-color)]/5 transition-all flex flex-col gap-1 ${isSelected ? 'bg-[var(--theme-color)]/10 border-l-4 border-l-[#ff006e] text-[var(--text-color)]' : 'text-[var(--text-color)]/60 hover:bg-white/5 hover:text-[var(--text-color)]'}`}
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
                                    className={`w-24 border flex flex-col items-center justify-center gap-2 transition-all ${isGlass ? 'bg-[#ff006e]/10 border-[#ff006e] text-[#ff006e]' : 'bg-black border-[var(--text-color)]/10 text-[var(--text-color)]/40 hover:border-[var(--text-color)] hover:text-[var(--text-color)]'}`}
                                >
                                    <div className={`w-8 h-4 rounded-full border relative transition-all ${isGlass ? 'border-[#ff006e] bg-[#ff006e]' : 'border-[var(--text-color)]/40'}`}>
                                        <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${isGlass ? 'left-[calc(100%-12px)]' : 'left-0.5'}`} />
                                    </div>
                                    <span className="text-[8px] font-bold uppercase tracking-widest">GLASS_FX</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-auto pt-10">
                <button type="submit" className="w-full py-6 bg-black border border-[var(--theme-color)] text-[var(--theme-color)] font-bold uppercase tracking-[0.5em] hover:bg-[var(--theme-color)] hover:text-black transition-all shadow-[0_0_30px_rgba(var(--theme-color-rgb),0.15)]">
                    SYNC_IDENTITY_TO_CORE
                </button>
            </div>
        </form>
    );
};

const StatItem = ({ label, value }) => (
    <div className="flex justify-between items-center text-[10px] group py-3 border-b border-[var(--text-color)]/5 last:border-none">
        <span className="text-[var(--text-color)]/40 group-hover:text-[var(--theme-color)] tracking-[0.3em] font-bold transition-all">{label}</span>
        <span className="text-[#ff006e] font-bold tabular-nums">[{value}]</span>
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
                <div className="border-b border-[#ff006e]/20 pb-4">
                    <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">// MODIFY_SEQUENCE_METADATA</h3>
                </div>

                <div className="space-y-10 max-w-lg mx-auto w-full pb-10">
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-[#ff006e] uppercase tracking-[0.4em]">_SEQUENCE_NAME</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff006e] mono">{'>'}</span>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-white/10 p-4 pl-10 text-white font-bold outline-none focus:border-[#ff006e] uppercase tracking-widest transition-all" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-[#ff006e] uppercase tracking-[0.4em]">_BLOCK_DESCRIPTION</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-white/10 p-5 text-white font-bold outline-none focus:border-[#ff006e] min-h-[120px] resize-none uppercase tracking-wide leading-relaxed transition-all" />
                    </div>

                    <div className="flex items-center justify-between p-5 border border-white/5 cursor-pointer group" onClick={() => setIsPublic(!isPublic)}>
                        <div className="flex flex-col">
                            <span className="text-white/60 font-bold uppercase tracking-widest text-xs group-hover:text-white transition-colors">_ACCESS_PROTOCOL</span>
                            <span className="text-[9px] text-[#ff006e] uppercase mt-1">{isPublic ? 'PUBL_SYSTEM' : 'PRIV_ENCRYPTED'}</span>
                        </div>
                        <div className={`w-10 h-5 border transition-colors ${isPublic ? 'border-[#ff006e] bg-[#ff006e]/20' : 'border-white/20 bg-black'}`}>
                            <div className={`w-3 h-3 bg-white transform transition-transform mt-[3px] ml-[3px] ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <button onClick={() => setIsEditing(false)} className="w-full py-4 border border-white/10 text-white/40 font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-[10px]">
                            [ ABORT ]
                        </button>
                        <button onClick={handleSave} className="w-full py-4 bg-black border border-[#ff006e] text-[#ff006e] font-bold uppercase tracking-widest hover:bg-[#ff006e] hover:text-black transition-all text-[10px] shadow-[0_0_20px_#ff006e10]">
                            [ SYNC_CHANGES ]
                        </button>
                    </div>

                    <button onClick={() => onDelete(playlist.id)} className="w-full py-4 border border-red-900/20 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 font-bold uppercase tracking-widest transition-all text-[9px] mt-4">
                        // DELETE_LOCAL_SEQUENCE_PERMANENTLY
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col md:flex-row h-full pt-12 md:pt-0">
            {/* Sidebar / Info */}
            <div className="w-full md:w-80 bg-black/40 border-r border-[#ff006e]/20 p-8 flex flex-col gap-8 shrink-0 overflow-y-auto custom-scrollbar">
                <div className="aspect-square border border-[#ff006e]/30 p-1 relative group shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                    <div className="w-full h-full relative overflow-hidden">
                        {playlist.imageUrl ? (
                            <img src={playlist.imageUrl.startsWith('http') ? playlist.imageUrl : `http://localhost:5264${playlist.imageUrl}`} className="w-full h-full object-cover grayscale mix-blend-screen opacity-60 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="w-full h-full bg-[#ff006e]/5 flex items-center justify-center">
                                <Database size={64} className="text-[#ff006e]/10" />
                            </div>
                        )}
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black border border-[#ff006e]/30 text-[9px] font-bold text-[#ff006e] z-10 mono uppercase">
                            SEQ_{String(playlist.id).padStart(4, '0')}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mt-4">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none break-words drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{playlist.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold text-[#ff006e] uppercase tracking-[0.2em]">
                        <span className="bg-[#ff006e] text-black px-1.5 py-0.5 flex items-center gap-1.5">
                            {playlist.isPublic ? <Globe size={10} /> : <Shield size={10} />}
                            {playlist.isPublic ? 'SYSTEM_PUBL' : 'ENCRYPTED'}
                        </span>
                        <span className="text-white/20">|</span>
                        <span className="text-white/60">{tracks.length} SIGNALS_MAPPED</span>
                    </div>
                    {playlist.description && <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed mt-4 border-l border-[#ff006e]/20 pl-4 italic">{playlist.description}</p>}
                </div>

                {isOwner && (
                    <div className="mt-auto pt-8 border-t border-[#ff006e]/10 space-y-4">
                        {tracks.length > 0 && (
                            <button onClick={() => onPlayAll?.(tracks)} className="w-full py-5 bg-[#ff006e]/10 border border-[#ff006e]/40 text-[#ff006e] font-bold uppercase tracking-[0.4em] text-[10px] transition-all hover:bg-[#ff006e] hover:text-black flex items-center justify-center gap-2 mb-4 shadow-[0_0_20px_#ff006e05] hover:shadow-[0_0_30px_#ff006e20]">
                                <Play size={14} fill="currentColor" /> INITIALISE_SEQ
                            </button>
                        )}
                        <button onClick={() => setIsEditing(true)} className="w-full py-3 bg-black border border-white/10 hover:border-[#ff006e] text-white/60 hover:text-[#ff006e] font-bold uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2">
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
                        <div className="flex items-center gap-4 px-4 py-2 text-[9px] font-bold text-[#ff006e]/40 uppercase tracking-[0.5em] mb-4 border-b border-[#ff006e]/10">
                            <span className="w-8">#ID</span>
                            <span className="flex-1 ml-10">SOURCE_SIGNAL</span>
                            <span className="mr-8">STATUS</span>
                        </div>
                        {tracks.map((t, idx) => (
                            <div key={t.id || `plt-${idx}`} className="flex items-center gap-6 p-4 border border-transparent hover:border-[#ff006e]/20 hover:bg-[#ff006e]/5 group transition-all">
                                <span className="text-[#ff006e]/30 group-hover:text-[#ff006e] font-bold mono text-[10px] w-8">[{String(idx + 1).padStart(2, '0')}]</span>
                                <div className="w-10 h-10 border border-white/10 bg-black overflow-hidden relative shrink-0">
                                    {t.coverImageUrl ? (
                                        <img src={t.coverImageUrl.startsWith('http') ? t.coverImageUrl : `http://localhost:5264${t.coverImageUrl}`} className="w-full h-full object-cover grayscale opacity-50 group-hover:opacity-100 transition-opacity mix-blend-screen" />
                                    ) : (
                                        <div className="w-full h-full bg-[#050505] flex items-center justify-center text-[#ff006e]/10"><Code size={20} /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pr-10">
                                    <div className="text-white font-bold text-sm truncate uppercase tracking-wider group-hover:text-[#ff006e] transition-colors">{t.title}</div>
                                    <div className="text-white/30 text-[9px] font-bold uppercase tracking-widest mt-1">SIG_ADDR: {t.artistName || 'UNKNOWN'}</div>
                                </div>
                                <div className="hidden md:block mr-4">
                                    <div className="text-[8px] font-bold border border-[#ff006e]/20 text-[#ff006e]/40 px-2 py-0.5 uppercase group-hover:border-[#ff006e] group-hover:text-[#ff006e] transition-all">VERIFIED</div>
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
