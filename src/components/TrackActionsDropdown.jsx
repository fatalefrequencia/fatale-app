import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MoreHorizontal, PlayCircle, Library, Heart,
    Zap, Trash2, ChevronLeft, ChevronRight,
    Lock, Globe
} from 'lucide-react';
import ActionModal from './ActionModal';

const DropdownPortal = ({ children, triggerRef }) => {
    const [coords, setCoords] = useState({ top: 0, left: 0, right: 0 });

    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY + 8,
                right: window.innerWidth - rect.right,
            });
        }
    }, [triggerRef]);

    return createPortal(
        <div
            style={{
                position: 'absolute',
                top: coords.top,
                right: coords.right,
                zIndex: 9999,
            }}
        >
            {children}
        </div>,
        document.body
    );
};

const TrackActionsDropdown = ({
    track,
    isOwner,
    onDelete,
    onLike,
    playlists = [],
    isLikedInitial = false,
    myLikes = [],
    onAddToQueue,
    onRefreshPlaylists
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showPlaylists, setShowPlaylists] = useState(false);
    const [isLiked, setIsLiked] = useState(isLikedInitial);
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm',
        onConfirm: null,
        confirmText: 'Confirm'
    });
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const triggerRef = useRef(null);

    // Sync if initial changes
    useEffect(() => {
        setIsLiked(isLikedInitial);
    }, [isLikedInitial]);

    // Close on scroll / resize so portal position stays accurate
    useEffect(() => {
        if (!isOpen) return;
        const close = () => setIsOpen(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [isOpen]);

    // Close when trigger element leaves the viewport (e.g. monitor → room view transition)
    useEffect(() => {
        if (!isOpen || !triggerRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (!entry.isIntersecting) setIsOpen(false); },
            { threshold: 0 }
        );
        observer.observe(triggerRef.current);
        return () => observer.disconnect();
    }, [isOpen]);

    // Close immediately when EXIT_MONITOR is clicked (custom event from Profile.jsx)
    useEffect(() => {
        const handler = () => setIsOpen(false);
        document.addEventListener('exitmonitor', handler);
        return () => document.removeEventListener('exitmonitor', handler);
    }, []);

    // Always close on unmount
    useEffect(() => () => setIsOpen(false), []);

    const handleAddTrackToPlaylist = async (playlistId, playlistName) => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            let targetTrackId = track.id || track.Id;

            const isYoutube = track.category === 'YouTube' || track.source?.startsWith('youtube:') || String(track.id).startsWith('youtube:');

            if (isYoutube) {
                const isNumeric = !isNaN(parseInt(track.id)) && String(track.id).indexOf('-') === -1 && !String(track.id).startsWith('youtube:');

                if (!isNumeric) {
                    let videoId = track.id;
                    if (String(videoId).includes(':')) videoId = videoId.split(':').pop();
                    if (track.source?.includes(':')) videoId = track.source.split(':').pop();

                    const trackData = {
                        youtubeId: (videoId || "").trim(),
                        title: track.title || "Unknown Track",
                        channelTitle: track.artist || track.channelTitle || "Unknown Artist",
                        thumbnailUrl: track.cover || track.img || track.thumbnail || track.coverImageUrl || "",
                        viewCount: parseInt(track.playCount || track.viewCount || 0),
                        duration: 0
                    };

                    const savedTrackRes = await API.Youtube.saveTrack(trackData);
                    const sData = savedTrackRes.data;
                    targetTrackId = sData.id || sData.Id || sData.trackId;
                } else {
                    targetTrackId = track.id;
                }
            }

            await API.Playlists.addTrack(playlistId, targetTrackId);

            setModalConfig({
                isOpen: true,
                title: 'Signal_Synced',
                message: `Track successfully routed to: ${playlistName}`,
                type: 'alert',
                confirmText: 'Acknowledge'
            });
            setIsOpen(false);
        } catch (err) {
            console.error(err);
            setModalConfig({
                isOpen: true,
                title: 'Sync_Error',
                message: err.response?.data?.message || err.response?.data || "Failed to add track to playlist.",
                type: 'alert',
                confirmText: 'Back'
            });
        }
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        try {
            const API = await import('../services/api').then(mod => mod.default);
            // Create the playlist
            const createRes = await API.Playlists.create({
                name: newPlaylistName.trim(),
                description: '',
                isPublic: true,
                imageUrl: ''
            });
            const newPlaylist = createRes.data;
            const newPlaylistId = newPlaylist.id || newPlaylist.Id;

            // Route the track to the new playlist directly
            await handleAddTrackToPlaylist(newPlaylistId, newPlaylistName);
            setNewPlaylistName('');
            onRefreshPlaylists?.(); // Refresh global playlist state
        } catch (err) {
            console.error("Failed to create playlist:", err);
            setModalConfig({
                isOpen: true,
                title: 'Creation_Error',
                message: err.response?.data?.message || err.response?.data || "Failed to initialize new playlist.",
                type: 'alert',
                confirmText: 'Back'
            });
        }
    };

    const handleToggleLike = () => {
        // Delegate to the centralized handler in App.jsx (passed via Profile.jsx)
        onLike?.(track);
        setIsLiked(!isLiked);
    };

    const handlePurchase = async () => {
        const price = track.price || track.Price || 0;
        setModalConfig({
            isOpen: true,
            title: 'Authorization_Required',
            message: `Purchase license for "${track.title}"? Cost: ${price} CRD. This signal will be permanently allocated to your collection.`,
            type: 'confirm',
            confirmText: 'Execute',
            onConfirm: async () => {
                try {
                    const API = await import('../services/api').then(mod => mod.default);
                    await API.Purchases.purchaseTrack(track.id || track.Id);
                    setModalConfig({
                        isOpen: true,
                        title: 'Acquisition_Complete',
                        message: "License secured. Track has been initialized in your collection.",
                        type: 'alert',
                        confirmText: 'Clear'
                    });
                    setIsOpen(false);
                } catch (err) {
                    console.error(err);
                    setModalConfig({
                        isOpen: true,
                        title: 'Acquisition_Failed',
                        message: err.response?.data?.message || err.response?.data || "Insufficient CRD or system connection error.",
                        type: 'alert',
                        confirmText: 'Back'
                    });
                }
            }
        });
    };

    const handleDelete = () => {
        setModalConfig({
            isOpen: true,
            title: 'Delist_Verification',
            message: `Are you sure you want to delist "${track.title}"? This action is permanent.`,
            type: 'confirm',
            confirmText: 'Delete',
            onConfirm: () => {
                onDelete?.();
                setIsOpen(false);
            }
        });
    };

    return (
        <div className="relative" ref={triggerRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); setShowPlaylists(false); }}
                className={`p-2 rounded-sm transition-all border-2 ${isOpen ? 'border-[#ff006e] bg-[#ff006e]/10 text-[#ff006e] shadow-[0_0_20px_rgba(255,0,110,0.2)]' : 'text-[#ff006e]/60 border-[#ff006e]/10 hover:border-[#ff006e]/40 hover:text-[#ff006e] bg-white/5'}`}
            >
                <MoreHorizontal size={20} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Full-screen overlay to catch outside clicks */}
                        <div
                            className="fixed inset-0 z-[9998]"
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        />

                        <DropdownPortal triggerRef={triggerRef}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                transition={{ duration: 0.15 }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ minWidth: '220px' }}
                                className="bg-[#000000] border border-[#ff006e]/60 rounded-sm overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(255,0,110,0.2)] ring-1 ring-white/10 font-mono"
                            >
                                <div className="p-2 space-y-1">
                                    {!showPlaylists ? (
                                        <>
                                            <button 
                                                onClick={() => {
                                                    onAddToQueue?.(track);
                                                    setIsOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/90 hover:bg-[#ff006e]/10 hover:text-[#ff006e] transition-all rounded-sm group/item"
                                            >
                                                <PlayCircle size={16} className="text-[#ff006e]/50 group-hover/item:text-[#ff006e]" /> Add to Queue
                                            </button>
                                            <button
                                                onClick={() => setShowPlaylists(true)}
                                                className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/90 hover:bg-[#ff006e]/10 hover:text-[#ff006e] transition-all rounded-sm group/item"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Library size={16} className="text-[#ff006e]/50 group-hover/item:text-[#ff006e]" /> Add to Playlist
                                                </div>
                                                <ChevronRight size={14} className="opacity-40 group-hover/item:opacity-100" />
                                            </button>
                                            <button
                                                onClick={handleToggleLike}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all rounded-sm group/item ${isLiked ? 'text-[#ff006e] bg-[#ff006e]/5' : 'text-white/90 hover:bg-[#ff006e]/10 hover:text-[#ff006e]'}`}
                                            >
                                                <Heart size={16} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-[#ff006e]" : "text-[#ff006e]/50 group-hover/item:text-[#ff006e]"} /> {isLiked ? 'Liked' : 'Like'}
                                            </button>

                                            {(track.price > 0 || track.Price > 0) && (
                                                <button
                                                    onClick={handlePurchase}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/90 hover:bg-[#ff006e]/10 hover:text-[#ff006e] transition-all rounded-sm group/item"
                                                >
                                                    <Zap size={16} className="text-[#ff006e]/50 group-hover/item:text-[#ff006e]" /> Purchase License
                                                </button>
                                            )}

                                            {isOwner && (
                                                <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-red-500/80 hover:bg-red-500/10 hover:text-red-500 transition-all rounded-sm group/item">
                                                    <Trash2 size={16} className="opacity-50 group-hover/item:opacity-100" /> Delete / Delist
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setShowPlaylists(false)}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff006e] hover:bg-[#ff006e]/5 transition-all"
                                            >
                                                <ChevronLeft size={14} /> Back
                                            </button>
                                            <div className="max-h-64 overflow-y-auto pt-1 scrollbar-hide">
                                                {playlists.length > 0 ? playlists.map(p => {
                                                    const pId = p.id || p.Id;
                                                    const pName = p.name || p.Name || 'Unnamed Playlist';
                                                    const pPublic = p.isPublic ?? p.IsPublic ?? true;
                                                    return (
                                                        <button
                                                            key={pId}
                                                            onClick={() => handleAddTrackToPlaylist(pId, pName)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70 hover:bg-[#ff006e]/10 hover:text-[#ff006e] transition-all rounded-sm"
                                                        >
                                                            <div className={`w-1.5 h-1.5 rounded-full ${pPublic ? 'bg-[#ff006e]' : 'bg-white/20'}`} />
                                                            {pName}
                                                        </button>
                                                    );
                                                }) : (
                                                    <div className="px-4 py-8 text-center text-[9px] font-black uppercase text-white/20 tracking-tighter">No Playlists Detected</div>
                                                )}
                                                
                                                <div className="p-3 border-t border-white/10 mt-2">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            value={newPlaylistName}
                                                            onChange={(e) => setNewPlaylistName(e.target.value)}
                                                            placeholder="NEW_PLAYLIST_NAME" 
                                                            className="flex-1 bg-white/5 border border-white/10 text-[9px] text-white uppercase px-2 py-1 outline-none focus:border-[#ff006e]"
                                                        />
                                                        <button 
                                                            disabled={!newPlaylistName.trim()}
                                                            onClick={handleCreatePlaylist}
                                                            className="px-2 py-1 bg-[#ff006e]/20 text-[#ff006e] border border-[#ff006e]/30 text-[9px] uppercase font-bold hover:bg-[#ff006e] hover:text-white transition-all disabled:opacity-30"
                                                        >
                                                            Create
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </DropdownPortal>
                    </>
                )}
            </AnimatePresence>

            <ActionModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                confirmText={modalConfig.confirmText}
            />
        </div>
    );
};

export default TrackActionsDropdown;
