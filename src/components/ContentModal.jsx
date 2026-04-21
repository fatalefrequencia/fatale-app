import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Book, Camera, Video, Share2, Download, ExternalLink } from 'lucide-react';
import { API_BASE_URL, getMediaUrl } from '../constants';
import { useNotification } from '../contexts/NotificationContext';

const ContentModal = ({ content, onClose, type = 'JOURNAL', hasMiniPlayer = true, themeColor = '#ff006e', backgroundColor = '#000000', isGlass = false, monitorImageUrl = null, monitorBackgroundColor = '#000000', monitorIsGlass = false }) => {
    const { showNotification } = useNotification();
    if (!content) return null;
    const normalizedType = (type || '').toUpperCase();
    console.log("[ContentModal] Received content:", content, "type:", normalizedType);

    const handleShare = (e) => {
        e.stopPropagation();
        try {
            const ownerId = content.userId || content.UserId || content.OwnerId || content.ownerId;
            let baseUrl = window.location.origin;
            
            // If we have an owner, link to their profile with the content param
            // Otherwise just link to current view with content param
            const shareUrl = ownerId 
                ? `${baseUrl}/profile/${ownerId}?content=${content.id || content.Id}`
                : `${baseUrl}${window.location.pathname}?content=${content.id || content.Id}`;

            navigator.clipboard.writeText(shareUrl);
            showNotification("LINK_COPIED", "SIGNAL_ADDRESS_SECURED", "success");
        } catch (err) {
            console.error("Failed to copy link:", err);
            showNotification("SYNC_ERROR", "FAILED_TO_COPY_SIGNAL_ADDRESS", "error");
        }
    };

    const activeTheme = themeColor || '#ff006e';
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${isNaN(r) ? 157 : r}, ${isNaN(g) ? 0 : g}, ${isNaN(b) ? 255 : b}, ${alpha})`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed top-0 left-0 right-0 bottom-0 ${hasMiniPlayer ? 'lg:bottom-[72px]' : ''} z-[9999] flex items-center justify-center p-4 md:p-10 bg-black/40 backdrop-blur-[12px]`}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                style={{ 
                    boxShadow: `0 0 80px ${hexToRgba(activeTheme, 0.15)}`,
                    borderColor: hexToRgba(activeTheme, 0.3),
                    backdropFilter: monitorIsGlass ? 'blur(20px)' : 'blur(12px)',
                    backgroundImage: (monitorImageUrl && monitorImageUrl !== 'none') ? `url(${getMediaUrl(monitorImageUrl)})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundBlendMode: monitorIsGlass ? 'overlay' : 'normal',
                    backgroundColor: (monitorImageUrl && monitorImageUrl !== 'none') ? 'transparent' : (monitorIsGlass ? hexToRgba(monitorBackgroundColor, 0.4) : hexToRgba(monitorBackgroundColor, 0.8)),
                }}
                className="relative w-full max-w-4xl border overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Holographic Corner Accents */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 opacity-40 z-20" style={{ borderColor: activeTheme }} />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 opacity-40 z-20" style={{ borderColor: activeTheme }} />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 opacity-40 z-20" style={{ borderColor: activeTheme }} />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 opacity-40 z-20" style={{ borderColor: activeTheme }} />

                {/* Pulsing Scanline Effect */}
                {!monitorImageUrl && (
                    <div className="absolute inset-0 z-0 pointer-events-none bg-[length:100%_2px,3px_100%]" 
                         style={{ backgroundImage: `linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.1) 50%), linear-gradient(90deg, ${hexToRgba(activeTheme, 0.03)}, ${hexToRgba(activeTheme, 0.01)}, ${hexToRgba(activeTheme, 0.03)})` }} 
                    />
                )}

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-black/40 relative z-10">
                    <div className="flex items-center gap-3" style={{ color: activeTheme }}>
                        {['JOURNAL', 'TEXT'].includes(normalizedType) && <Book size={18} />}
                        {['PHOTO', 'IMAGE', 'PICTURE'].includes(normalizedType) && <Camera size={18} />}
                        {['VIDEO', 'MEDIA'].includes(normalizedType) && <Video size={18} />}
                        <div className="flex flex-col">
                            <span className="mono text-[10px] font-black tracking-[0.3em] uppercase">
                                {['JOURNAL', 'TEXT'].includes(normalizedType) ? 'ARCHIVED_LOG_ENTRY' : ['PHOTO', 'IMAGE', 'PICTURE'].includes(normalizedType) ? 'VISUAL_DATA_FRAGMENT' : 'SIGNAL_FEED_RECORDING'}
                            </span>
                            <span className="text-[7px] text-[#ff006e]/40 mono uppercase">:: ACCESS_PROTOCOL_SECURED ::</span>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                    <div className="p-8 md:p-12 relative">
                        {['JOURNAL', 'TEXT'].includes(normalizedType) && (
                            <div className="space-y-8">
                                <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-tight">
                                    {content.Title || content.title || '// UNTITLED_LOG'}
                                </h2>
                                <div className="w-24 h-1 bg-gradient-to-r from-[#ff006e] to-transparent"></div>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-sm md:text-base text-white/80 leading-relaxed font-mono whitespace-pre-wrap tracking-wide">
                                        {content.Content || content.content || content.Text || content.text}
                                    </p>
                                </div>
                            </div>
                        )}

                        {['PHOTO', 'IMAGE', 'PICTURE'].includes(normalizedType) && (
                            <div className="flex flex-col items-center justify-center min-h-[400px]">
                                <div className="relative group">
                                    <div className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${activeTheme}1A` }} />
                                    <img
                                        src={getMediaUrl(content.Url || content.url || content.imageUrl || content.ImageUrl || content.thumbnailUrl || content.ThumbnailUrl || content.source || content.Source)}
                                        alt="Expanded Visual"
                                        className="max-w-full max-h-[65vh] object-contain border border-white/10 shadow-2xl relative z-10"
                                    />
                                </div>
                                {(content.caption || content.Caption || content.description || content.Description || content.Content || content.content) && (
                                    <p className="mt-8 text-[10px] text-white/60 mono uppercase tracking-[0.3em] text-center border-t border-white/5 pt-4">
                                        {content.caption || content.Caption || content.description || content.Description || content.Content || content.content}
                                    </p>
                                )}
                            </div>
                        )}

                        {['VIDEO', 'MEDIA'].includes(normalizedType) && (
                            <div className="flex flex-col items-center justify-center min-h-[400px]">
                                <video
                                    src={getMediaUrl(content.Url || content.url || content.videoUrl || content.VideoUrl || content.mediaUrl || content.MediaUrl || content.source || content.Source)}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[65vh] border border-white/10 shadow-2xl relative z-10"
                                />
                                <div className="mt-6 flex items-center gap-4 text-[10px] mono uppercase tracking-[0.3em] font-black" style={{ color: activeTheme }}>
                                    <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: activeTheme }} />
                                    SIGNAL_LIVE_DECODING_ACTIVE
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer / Metadata */}
                <div className="p-6 border-t border-white/5 bg-black/40 flex flex-wrap justify-between items-center gap-4 text-[9px] mono uppercase tracking-widest text-white/30 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col gap-1">
                            <span className="text-[#9d00ff]/40 tracking-tighter">PACKAGE_ID</span>
                            <span className="text-white/60 font-bold">{content.Id || content.id || 'NULL_SIGNAL'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[#9d00ff]/40 tracking-tighter">TIMESTAMP</span>
                            <span className="text-white/60 font-bold">{content.CreatedAt ? new Date(content.CreatedAt).toLocaleString() : 'UNDEFINED'}</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={handleShare}
                            className="px-4 py-2 bg-white/5 border border-white/10 hover:border-[#9d00ff]/50 hover:text-white transition-all text-white/60 flex items-center gap-2"
                        >
                            <Share2 size={12} /> SHARE_SIGNAL
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-[#9d00ff]/80 text-black font-black px-6 py-2 uppercase transition-all hover:bg-[#9d00ff] hover:shadow-[0_0_20px_#9d00ff60]"
                        >
                            CLOSE_FEED
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div >
    );
};

export default ContentModal;
