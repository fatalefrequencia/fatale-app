const fs = require('fs');

let content = fs.readFileSync('Profile.jsx', 'utf8');

// 1. Add Pin to lucide-react imports if missing
if (!content.includes('Pin,')) {
    content = content.replace(/}( *from 'lucide-react')/, 'Pin, $1');
}

// 2. Fix the Latest_Transmissions wall logic around line 1270
const oldWallLogic = `{(item.thumbnailUrl || item.ThumbnailUrl || item.cover || item.Url) ? (
                                                    <img
                                                        src={getMediaUrl(item.thumbnailUrl || item.ThumbnailUrl || item.cover || item.Url)}
                                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[var(--text-color)]/40">
                                                        {(item.type || item.Type) === 'VIDEO' ? <Video size={14} /> : <Music size={14} />}
                                                    </div>
                                                )}`;
const newWallLogic = `{(() => {
                                                    const isVideo = (item.type || item.Type) === 'VIDEO';
                                                    const coverUrl = item.thumbnailUrl || item.ThumbnailUrl || item.cover || (!isVideo ? item.Url : null);
                                                    if (coverUrl) {
                                                        return (
                                                            <div className="w-full h-full relative">
                                                                <img
                                                                    src={getMediaUrl(coverUrl)}
                                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                                    loading="lazy"
                                                                />
                                                                {isVideo && (
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <Video size={16} className="text-white drop-shadow-md" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-color)]/40">
                                                            {isVideo ? <Video size={14} /> : <Music size={14} />}
                                                        </div>
                                                    );
                                                })()}`;
content = content.replace(oldWallLogic, newWallLogic);

// 3. Replace "Pin to Wall" icons with <Pin />
content = content.replace(/title="Pin to Wall"\s*>\s*<Star size={12}/g, 'title="Pin to Wall">\n                                                                        <Pin size={12}');
content = content.replace(/title="Pin to Wall"\s*>\s*<Share2 size={10} \/>/g, 'title="Pin to Wall">\n                                                                        <Pin size={10} />');

// 4. Change right absolute buttons to left aligned
content = content.replace(/className="absolute top-2 right-2 z-30 flex gap-2"/g, 'className="absolute top-2 left-2 z-30 flex gap-2"');
content = content.replace(/className="absolute top-2 right-2 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-all"/g, 'className="absolute top-2 left-2 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-all"');

// 5. Change the top-right Video overlay to a centered large camera/video overlay
const oldVideoOverlay = `{(content.thumbnailUrl || content.ThumbnailUrl) && (
                                                                        <div className="absolute top-2 right-2 p-1 bg-black/60 backdrop-blur-sm border border-white/10">
                                                                            <Video size={8} className="text-white/60" />
                                                                        </div>
                                                                    )}`;
const newVideoOverlay = `{(content.thumbnailUrl || content.ThumbnailUrl) && (
                                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                                                            <div className="p-3 bg-black/40 backdrop-blur-sm rounded-full border border-[var(--text-color)]/20 shadow-[0_0_15px_rgba(var(--theme-color-rgb),0.3)]">
                                                                                <Video size={32} className="text-[var(--text-color)]/80 drop-shadow-lg" fill="currentColor" />
                                                                            </div>
                                                                        </div>
                                                                    )}`;
content = content.replace(oldVideoOverlay, newVideoOverlay);

fs.writeFileSync('Profile.jsx', content);
console.log('Update Complete');
