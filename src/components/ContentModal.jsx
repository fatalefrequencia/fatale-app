import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Book, Camera, Video, Share2, Download, ExternalLink } from 'lucide-react';
import { API_BASE_URL, getMediaUrl } from '../constants';

const ContentModal = ({ content, onClose, type = 'JOURNAL', hasMiniPlayer = true }) => {
    if (!content) return null;
    const normalizedType = (type || '').toUpperCase();
    console.log("[ContentModal] Received content:", content, "type:", normalizedType);

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
                className="relative w-full max-w-4xl bg-black/60 backdrop-blur-xl border border-[#9d00ff]/30 shadow-[0_0_80px_rgba(157,0,255,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Holographic Corner Accents */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#9d00ff] opacity-40 z-20" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-[#9d00ff] opacity-40 z-20" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-[#9d00ff] opacity-40 z-20" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#9d00ff] opacity-40 z-20" />

                {/* Pulsing Scanline Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(157,0,255,0.03),rgba(80,0,255,0.01),rgba(157,0,255,0.03))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%]" />

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-black/40 relative z-10">
                    <div className="flex items-center gap-3 text-[#9d00ff]">
                        {['JOURNAL', 'TEXT'].includes(normalizedType) && <Book size={18} />}
                        {['PHOTO', 'IMAGE', 'PICTURE'].includes(normalizedType) && <Camera size={18} />}
                        {['VIDEO', 'MEDIA'].includes(normalizedType) && <Video size={18} />}
                        <div className="flex flex-col">
                            <span className="mono text-[10px] font-black tracking-[0.3em] uppercase">
                                {['JOURNAL', 'TEXT'].includes(normalizedType) ? 'ARCHIVED_LOG_ENTRY' : ['PHOTO', 'IMAGE', 'PICTURE'].includes(normalizedType) ? 'VISUAL_DATA_FRAGMENT' : 'SIGNAL_FEED_RECORDING'}
                            </span>
                            <span className="text-[7px] text-[#9d00ff]/40 mono uppercase">:: ACCESS_PROTOCOL_SECURED ::</span>
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
                                <div className="w-24 h-1 bg-gradient-to-r from-[#9d00ff] to-transparent"></div>
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
                                    <div className="absolute inset-0 bg-[#9d00ff]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
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
                                <div className="mt-6 flex items-center gap-4 text-[10px] mono text-[#9d00ff] uppercase tracking-[0.3em] font-black">
                                    <div className="w-2 h-2 rounded-full bg-[#9d00ff] animate-ping" />
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
                        <button className="px-4 py-2 bg-white/5 border border-white/10 hover:border-[#9d00ff]/50 hover:text-white transition-all text-white/60 flex items-center gap-2">
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
