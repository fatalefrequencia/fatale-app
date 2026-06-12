import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, FolderPlus, ListMusic, ShieldCheck } from 'lucide-react';
import API from '../services/api';

const PlaylistSelectModal = ({
    isOpen,
    onClose,
    track,
    playlists,
    onRefreshPlaylists,
    showNotification
}) => {
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!track) return null;

    const handleAddTrack = async (playlistId, playlistName) => {
        setIsSubmitting(true);
        try {
            let targetTrackId = track.id || track.Id;

            // Handle YouTube resolution if needed
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
                }
            }

            await API.Playlists.addTrack(playlistId, targetTrackId);
            showNotification?.("SIGNAL_SYNCED", `Track successfully routed to: ${playlistName}`, "success");
            onClose();
        } catch (err) {
            console.error("Failed to add track to playlist:", err);
            showNotification?.("ROUTE_FAILED", "Failed to route track to playlist.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreatePlaylist = async (e) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await API.Playlists.create({
                name: newPlaylistName.trim(),
                description: "SIGNAL_CURATED_PLAYLIST",
                isPublic: false
            });

            showNotification?.("PLAYLIST_CREATED", `Curated archive: "${newPlaylistName}" created.`, "success");
            setNewPlaylistName('');
            setIsCreating(false);

            if (onRefreshPlaylists) {
                await onRefreshPlaylists();
            }

            // Automatically add track to the newly created playlist
            const newPlaylist = res.data;
            const newId = newPlaylist.id || newPlaylist.Id;
            if (newId) {
                await handleAddTrack(newId, newPlaylistName.trim());
            }
        } catch (err) {
            console.error("Failed to create playlist:", err);
            showNotification?.("CREATE_FAILED", "Failed to initialize new playlist database.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 20 }}
                        className="w-full max-w-md bg-[#050505] border border-fatale/30 relative overflow-hidden shadow-[0_0_80px_rgba(255,0,110,0.2)] rounded-sm font-mono text-white"
                    >
                        {/* Status bar line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fatale via-[#d60036] to-fatale" />

                        {/* Top header */}
                        <div className="flex justify-between items-center p-5 border-b border-white/5 bg-black/50">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fatale flex items-center gap-2">
                                <ListMusic size={14} className="text-fatale" />
                                SELECT_ROUTE_DESTINATION
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/40 hover:text-fatale transition-all hover:rotate-90 p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Track Details */}
                            <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-sm">
                                {track.cover || track.thumbnail || track.coverImageUrl ? (
                                    <img src={track.cover || track.thumbnail || track.coverImageUrl} alt="Cover" className="w-10 h-10 object-cover rounded-sm border border-fatale/30 shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded-sm bg-fatale/10 border border-fatale/20 flex items-center justify-center font-black text-fatale shrink-0 text-xs">
                                        {(track.title || "T").substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <div className="text-xs font-black uppercase text-white tracking-widest truncate">{track.title}</div>
                                    <div className="text-[8px] text-white/40 uppercase tracking-widest mt-1 truncate">{track.artist}</div>
                                </div>
                            </div>

                            {/* Main list & selector */}
                            {!isCreating ? (
                                <div className="space-y-4">
                                    <div className="text-[8px] text-white/40 uppercase tracking-widest">CHOOSE DESTINATION PLAYLIST</div>
                                    
                                    <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {playlists.length === 0 ? (
                                            <div className="text-center py-6 border border-dashed border-white/10 text-white/30 text-[9px] uppercase tracking-widest rounded-sm">
                                                No playlists found. Create one below.
                                            </div>
                                        ) : (
                                            playlists.map((pl) => (
                                                <button
                                                    key={pl.id || pl.Id}
                                                    disabled={isSubmitting}
                                                    onClick={() => handleAddTrack(pl.id || pl.Id, pl.name || pl.Name)}
                                                    className="w-full text-left p-3 bg-white/[0.01] hover:bg-fatale/5 border border-white/5 hover:border-fatale/40 transition-all rounded-sm flex items-center justify-between group"
                                                >
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/80 group-hover:text-white truncate">
                                                        {pl.name || pl.Name}
                                                    </span>
                                                    <span className="text-[7px] text-white/30 uppercase tracking-widest shrink-0">
                                                        SELECT
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="w-full py-3 text-[8px] font-black uppercase tracking-widest border border-dashed border-white/20 hover:border-fatale/50 text-white/60 hover:text-white transition-all rounded-sm flex items-center justify-center gap-1.5"
                                    >
                                        <FolderPlus size={12} /> INITIALIZE_NEW_ARCHIVE
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleCreatePlaylist} className="space-y-4">
                                    <div className="text-[8px] text-white/40 uppercase tracking-widest">INITIALIZE PLAYLIST ARCHIVE</div>
                                    <input
                                        type="text"
                                        required
                                        disabled={isSubmitting}
                                        value={newPlaylistName}
                                        onChange={(e) => setNewPlaylistName(e.target.value)}
                                        placeholder="ENTER_ARCHIVE_IDENTIFIER"
                                        className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-fatale outline-none text-[9px] text-white px-3 py-3 rounded-sm tracking-widest"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreating(false)}
                                            className="py-2.5 text-[8px] font-black uppercase tracking-widest bg-white/5 border border-white/10 hover:border-white/20 text-white transition-all rounded-sm"
                                        >
                                            CANCEL
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !newPlaylistName.trim()}
                                            className="py-2.5 text-[8px] font-black uppercase tracking-widest bg-fatale text-black hover:bg-white transition-all rounded-sm flex items-center justify-center gap-1.5 disabled:opacity-30"
                                        >
                                            <Plus size={10} /> CREATE_AND_ADD
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PlaylistSelectModal;
