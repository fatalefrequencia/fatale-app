import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Book, Camera, Video, Share2, Download, ExternalLink, Play, MessageSquare, Send } from 'lucide-react';
import { API_BASE_URL, getMediaUrl } from '../constants';
import { useNotification } from '../contexts/NotificationContext';
import CreditTransferModal from './CreditTransferModal';
import { Coins } from 'lucide-react';
import API from '../services/api';

const ContentModal = ({ 
    content, 
    onClose, 
    user,
    children,
    title,
    type = 'JOURNAL', 
    hasMiniPlayer = true, 
    themeColor = '#9d00ff', 
    backgroundColor = '#000000', 
    isGlass = false, 
    monitorImageUrl = null, 
    monitorBackgroundColor = '#000000', 
    monitorIsGlass = false 
}) => {
    const { t } = useLanguage();
    const { showNotification } = useNotification();
    const [showTipModal, setShowTipModal] = React.useState(false);
    const [comments, setComments] = React.useState([]);
    const [loadingComments, setLoadingComments] = React.useState(false);
    const [commentText, setCommentText] = React.useState("");
    const [isSubmittingComment, setIsSubmittingComment] = React.useState(false);

    const mediaType = (content?.mediaType || content?.MediaType || content?.type || content?.Type || type || '').toUpperCase();
    const normalizedType = mediaType;
    const isSplitLayout = ['PHOTO', 'IMAGE', 'PICTURE', 'GALLERY', 'VIDEO', 'MEDIA'].includes(normalizedType) && !children;

    React.useEffect(() => {
        const fetchComments = async () => {
            const itemId = content?.Id || content?.id;
            if (!itemId) return;
            setLoadingComments(true);
            try {
                const itemType = content.Type || content.type || mediaType;
                const { data } = await API.Social.getFeedComments(itemType, itemId);
                setComments(data || []);
            } catch (err) {
                console.error("Failed to fetch comments in ContentModal:", err);
            } finally {
                setLoadingComments(false);
            }
        };
        if (isSplitLayout) {
            fetchComments();
        }
    }, [content?.id, content?.Id, isSplitLayout]);

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        const itemId = content?.Id || content?.id;
        if (!itemId) return;
        
        setIsSubmittingComment(true);
        try {
            const itemType = content.Type || content.type || mediaType;
            const { data } = await API.Social.addFeedComment(itemType, itemId, commentText);
            setComments(data || []);
            setCommentText("");
            showNotification("COMMENT_ADDED", "SIGNAL_RESPONSE_LOGGED", "success");
        } catch (err) {
            console.error("Failed to add comment:", err);
            showNotification("SYNC_ERROR", "FAILED_TO_TRANSMIT_RESPONSE", "error");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    if (!content && !children) return null;

    const handleShare = (e) => {
        e.stopPropagation();
        try {
            const ownerId = content.userId || content.UserId || content.OwnerId || content.ownerId;
            let baseUrl = window.location.origin;
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

    const activeTheme = themeColor || '#9d00ff';
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
                className={`relative w-full ${isSplitLayout ? 'max-w-5xl' : 'max-w-4xl'} border overflow-hidden flex flex-col max-h-[90vh]`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-black/40 relative z-10">
                    <div className="flex items-center gap-3" style={{ color: activeTheme }}>
                        {['VIDEO', 'MEDIA', 'GALLERY'].includes(normalizedType) && (content.mediaType === 'VIDEO' || content.type === 'VIDEO') && <Video size={18} />}
                        {['PHOTO', 'IMAGE', 'PICTURE', 'GALLERY'].includes(normalizedType) && (content.mediaType !== 'VIDEO' && content.type !== 'VIDEO') && <Camera size={18} />}
                        <div className="flex flex-col">
                            <span className="mono text-[10px] font-black tracking-[0.3em] uppercase">
                                {title === t('MODIFY_IDENTITY') ? t('CORE_IDENTITY_MGMT') : ['JOURNAL', 'TEXT'].includes(normalizedType) ? t('ARCHIVED_LOG_ENTRY') : ['PHOTO', 'IMAGE', 'PICTURE', 'GALLERY'].includes(normalizedType) ? t('VISUAL_DATA_FRAGMENT') : t('SIGNAL_FEED_RECORDING')}
                            </span>
                            <span className="mono text-[6px] tracking-widest opacity-40 uppercase">{t('DATA_SIGNAL_DECODE_SUCCESS')}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-all p-2 hover:bg-white/10">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Body */}
                <div className={`flex-1 overflow-y-auto custom-scrollbar relative z-10 ${isSplitLayout ? 'flex flex-col md:flex-row' : ''}`}>
                    {children ? children : (
                        isSplitLayout ? (
                            <>
                                {/* Left Column: Media */}
                                <div className="flex-1 bg-black/60 flex items-center justify-center p-4 min-h-[300px]">
                                    {['PHOTO', 'IMAGE', 'PICTURE', 'GALLERY'].includes(normalizedType) && (content?.mediaType?.toUpperCase() !== 'VIDEO' && content?.type?.toUpperCase() !== 'VIDEO') && (
                                        <div className="relative group">
                                            <img
                                                src={getMediaUrl(content.Url || content.url || content.imageUrl || content.ImageUrl || content.thumbnailUrl || content.ThumbnailUrl)}
                                                alt="Visual"
                                                className="max-w-full max-h-[70vh] object-contain border border-white/10"
                                            />
                                        </div>
                                    )}

                                    {['VIDEO', 'MEDIA', 'GALLERY'].includes(normalizedType) && (content?.mediaType?.toUpperCase() === 'VIDEO' || content?.type?.toUpperCase() === 'VIDEO') && (() => {
                                        const videoUrl = content.url || content.Url || content.videoUrl || content.VideoUrl;
                                        const isYoutube = videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.startsWith('youtube:'));
                                        
                                        if (isYoutube) {
                                            let id = null;
                                            if (videoUrl.startsWith('youtube:')) id = videoUrl.split(':')[1];
                                            else {
                                                const match = videoUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
                                                id = (match && match[2].length === 11) ? match[2] : null;
                                            }
                                            return (
                                                <div className="w-full aspect-video bg-black">
                                                    {id ? (
                                                        <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1`} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/20 mono text-[10px]">FAILED_TO_RESOLVE_YT_SIGNAL</div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <video src={getMediaUrl(videoUrl)} controls autoPlay muted playsInline className="max-w-full max-h-[70vh] object-contain" />
                                        );
                                    })()}
                                </div>

                                {/* Right Column: Info & Comments */}
                                <div className="w-full md:w-96 border-l border-white/5 bg-black/40 flex flex-col max-h-[70vh] md:max-h-none">
                                    {/* Author Info */}
                                    <div className="p-4 border-b border-white/5 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-black border border-white/10 rounded-full overflow-hidden shrink-0">
                                            <img src={getMediaUrl(content.profilePictureUrl || content.ProfilePictureUrl)} className="w-full h-full object-cover" alt="" onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=USER'; }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[11px] text-white font-black uppercase truncate">
                                                {content.artist || content.Artist || content.artistName || content.username || content.Username || 'UNKNOWN_ARTIST'}
                                            </div>
                                            <div className="text-[8px] text-white/40 mono uppercase">SIGNAL_SOURCE_VERIFIED</div>
                                        </div>
                                    </div>

                                    {/* Caption & Comments List */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                        {/* Caption */}
                                        {(content.caption || content.Caption || content.description || content.Description || content.Content || content.content) && (
                                            <div className="text-[10px] text-white/80 leading-relaxed mono border-b border-white/5 pb-4">
                                                <span className="text-[#ff006e] font-black mr-2">
                                                    @{content.artist || content.Artist || content.artistName || 'user'}:
                                                </span>
                                                {content.caption || content.Caption || content.description || content.Description || content.Content || content.content}
                                            </div>
                                        )}

                                        {/* Comments */}
                                        <div className="space-y-3">
                                            <div className="text-[8px] text-white/30 mono uppercase tracking-wider">RESPONSES // {comments.length}</div>
                                            
                                            {loadingComments ? (
                                                <div className="text-[9px] text-white/30 mono animate-pulse">DECODING_RESPONSES...</div>
                                            ) : comments.length > 0 ? (
                                                comments.map(comment => (
                                                    <div key={comment.Id} className="text-[10px] text-white/70 leading-relaxed mono bg-white/5 p-2 rounded-sm border border-white/5">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[#00ffff] font-black">@{comment.Username || 'anon'}</span>
                                                            <span className="text-[7px] text-white/30">{new Date(comment.CreatedAt).toLocaleString()}</span>
                                                        </div>
                                                        <p className="text-white/90">{comment.Content}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-[9px] text-white/20 mono">NO_RESPONSES_DETECTED</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Input */}
                                    <div className="p-4 border-t border-white/5 bg-black/60">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                placeholder="ADD_RESPONSE..."
                                                className="flex-1 bg-black/40 border border-white/10 px-3 py-2 text-[10px] text-white mono focus:outline-none focus:border-[#ff006e]/50 placeholder-white/20"
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                            />
                                            <button
                                                onClick={handleAddComment}
                                                disabled={isSubmittingComment || !commentText.trim()}
                                                className="px-3 bg-[#ff006e]/10 border border-[#ff006e]/30 text-[#ff006e] hover:bg-[#ff006e] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                <Send size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-8 md:p-12 relative">
                                {['JOURNAL', 'TEXT'].includes(normalizedType) && (
                                    <div className="space-y-8">
                                        <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-tight">
                                            {content.Title || content.title || t('UNTITLED_LOG')}
                                        </h2>
                                        <div className="w-24 h-1 bg-gradient-to-r from-[#ff006e] to-transparent"></div>
                                        <div className="prose prose-invert max-w-none">
                                            <p className="text-sm md:text-base text-white/80 leading-relaxed font-mono whitespace-pre-wrap tracking-wide">
                                                {content.Content || content.content || content.Text || content.text}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/40 flex flex-wrap justify-between items-center gap-4 text-[9px] mono uppercase tracking-widest text-white/30 relative z-10">
                    <div className="flex items-center gap-8">
                        <div className="flex flex-col gap-1">
                            <span className="text-[#9d00ff]/40 tracking-tighter">PACKAGE_ID</span>
                            <span className="text-white/60 font-bold">{content?.Id || content?.id || 'GLOBAL_CORE'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[#9d00ff]/40 tracking-tighter">TIMESTAMP</span>
                            <span className="text-white/60 font-bold">{content?.CreatedAt ? new Date(content.CreatedAt).toLocaleString() : 'SYNCHRONIZED'}</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setShowTipModal(true)} className="px-4 py-2 bg-[#ff006e]/10 border border-[#ff006e]/30 hover:bg-[#ff006e] hover:text-black transition-all text-[#ff006e] font-black flex items-center gap-2 group">
                            <Coins size={12} className="group-hover:animate-bounce" /> {t('TIP_ARTIST')}
                        </button>
                        <button onClick={handleShare} className="px-4 py-2 bg-white/5 border border-white/10 hover:border-[#9d00ff]/50 hover:text-white transition-all text-white/60 flex items-center gap-2">
                            <Share2 size={12} /> {t('SHARE_SIGNAL')}
                        </button>
                        <button onClick={onClose} className="text-white font-black px-8 py-2 uppercase transition-all border border-white/40 hover:border-white hover:bg-white hover:text-black text-[10px] tracking-[0.2em]">
                            {t('CLOSE')}
                        </button>
                    </div>
                </div>

                {/* Tipping Overlay */}
                <AnimatePresence>
                    {showTipModal && (
                        <CreditTransferModal 
                            user={user}
                            initialTargetId={content?.artistId || content?.ArtistId || content?.userId || content?.UserId || content?.OwnerId || content?.ownerId || ''}
                            initialTargetName={content?.artist || content?.Artist || content?.artistName || content?.username || content?.Username || 'UNKNOWN_SIGNAL'}
                            onClose={() => setShowTipModal(false)}
                            onRefresh={() => showNotification("TIP_SENT", "Signal of appreciation transmitted.", "success")}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div >
    );
};

export default ContentModal;
