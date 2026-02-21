import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Book, Camera, Video, Share2, Download, ExternalLink } from 'lucide-react';

const ContentModal = ({ content, onClose, type = 'JOURNAL' }) => {
    if (!content) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 bg-black backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className="relative w-full max-w-4xl bg-black border border-[#ff006e]/30 shadow-[0_0_50px_rgba(255,0,110,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black">
                    <div className="flex items-center gap-3 text-[#ff006e]">
                        {type === 'JOURNAL' && <Book size={18} />}
                        {type === 'PHOTO' && <Camera size={18} />}
                        {type === 'VIDEO' && <Video size={18} />}
                        <span className="mono text-xs font-bold tracking-[0.2em] uppercase">
                            {type === 'JOURNAL' ? 'ARCHIVED_LOG_ENTRY' : type === 'PHOTO' ? 'VISUAL_DATA_FRAGMENT' : 'SIGNAL_FEED_RECORDING'}
                        </span>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black relative">
                    <div className="p-8 md:p-12 relative z-10">
                        {type === 'JOURNAL' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wide leading-tight">
                                    {content.Title || '// UNTITLED_LOG'}
                                </h2>
                                <div className="w-20 h-1 bg-[#ff006e]/50"></div>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-sm md:text-base text-white/80 leading-loose font-mono whitespace-pre-wrap tracking-wide">
                                        {content.Content}
                                    </p>
                                </div>
                            </div>
                        )}

                        {type === 'PHOTO' && (
                            <div className="flex flex-col items-center justify-center min-h-[400px]">
                                <img
                                    src={content.Url?.startsWith('http') ? content.Url : (content.Url ? `http://localhost:5264${content.Url}` : content.url)}
                                    alt="Expanded Visual"
                                    className="max-w-full max-h-[70vh] object-contain border border-white/10 shadow-2xl"
                                />
                                {content.caption && (
                                    <p className="mt-6 text-xs text-white/60 mono uppercase tracking-widest text-center">
                                        {content.caption}
                                    </p>
                                )}
                            </div>
                        )}

                        {type === 'VIDEO' && (
                            <div className="flex flex-col items-center justify-center min-h-[400px]">
                                <video
                                    src={content.Url?.startsWith('http') ? content.Url : `http://localhost:5264${content.Url}`}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[70vh] border border-white/10 shadow-2xl"
                                />
                                <div className="mt-4 flex items-center gap-4 text-[10px] mono text-[#ff006e] uppercase tracking-widest animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#ff006e]" />
                                    SIGNAL_LIVE_DECODING_ACTIVE
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer / Metadata */}
                <div className="p-4 border-t border-white/10 bg-black flex justify-between items-center text-[9px] mono uppercase tracking-wider text-white/40">
                    <div className="flex items-center gap-4">
                        <span>ID:: {content.Id || 'UNKNOWN'}</span>
                        <span>DATE:: {content.CreatedAt ? new Date(content.CreatedAt).toLocaleDateString() : 'UNKNOWN'}</span>
                    </div>
                    <div className="flex gap-4">
                        <button className="hover:text-[#ff006e] flex items-center gap-2 transition-colors">
                            <Share2 size={12} /> SHARE_LINK
                        </button>
                        <button
                            onClick={onClose}
                            className="text-[#ff006e] hover:text-white transition-colors border border-[#ff006e]/20 px-3 py-1 hover:bg-[#ff006e]/10"
                        >
                            [ ABORT ]
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ContentModal;
