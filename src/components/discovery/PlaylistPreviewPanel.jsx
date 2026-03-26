import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, ListMusic, ChevronRight } from 'lucide-react';
import { getMediaUrl } from '../../constants';
import API from '../../services/api';

const PlaylistPreviewPanel = ({ playlist, onClose, onPlayTrack, onPlayPlaylist }) => {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!playlist) return;
        setLoading(true);
        API.Playlists.getById(playlist.id || playlist.Id)
            .then(res => {
                const data = res?.data;
                const t = data?.tracks || data?.Tracks || [];
                setTracks(t);
            })
            .catch(() => setTracks([]))
            .finally(() => setLoading(false));
    }, [playlist?.id, playlist?.Id]);

    const cover = getMediaUrl(playlist?.imageUrl || playlist?.ImageUrl);

    return (
        <AnimatePresence>
            {playlist && (
                <motion.div
                    key="playlist-panel"
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        width: 340,
                        height: '100dvh',
                        background: 'rgba(6,6,6,0.97)',
                        backdropFilter: 'blur(20px)',
                        borderLeft: '1px solid rgba(255,255,255,0.08)',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header art */}
                    <div style={{ position: 'relative', height: 200, flexShrink: 0 }}>
                        {cover ? (
                            <img
                                src={cover}
                                alt={playlist.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                        ) : (
                            <div style={{
                                width: '100%', height: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
                            }}>
                                <ListMusic size={60} color="rgba(255,255,255,0.2)" />
                            </div>
                        )}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(to top, rgba(6,6,6,0.95) 0%, transparent 60%)',
                        }} />
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute', top: 12, right: 12,
                                background: 'rgba(0,0,0,0.6)',
                                border: 'none',
                                borderRadius: '50%',
                                width: 32, height: 32,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#fff',
                            }}
                        >
                            <X size={16} />
                        </button>

                        {/* Title */}
                        <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
                            <div style={{
                                color: '#fff', fontSize: 16, fontWeight: 800,
                                fontFamily: 'monospace', textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                                {playlist.name || playlist.Name}
                            </div>
                            <div style={{
                                color: 'rgba(255,255,255,0.45)', fontSize: 11,
                                fontFamily: 'monospace', marginTop: 2,
                            }}>
                                {tracks.length} tracks
                            </div>
                        </div>
                    </div>

                    {/* Play All button */}
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                        <button
                            onClick={() => onPlayPlaylist && onPlayPlaylist(playlist)}
                            style={{
                                width: '100%',
                                background: '#ff006e',
                                border: 'none',
                                borderRadius: 8,
                                color: '#fff',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                fontSize: 12,
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                padding: '10px 0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Play size={14} fill="#fff" />
                            Play All
                        </button>
                    </div>

                    {/* Track list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                        {loading && (
                            <div style={{
                                textAlign: 'center', padding: 32,
                                color: 'rgba(255,255,255,0.3)',
                                fontFamily: 'monospace', fontSize: 12,
                            }}>
                                LOADING TRACKS...
                            </div>
                        )}
                        {!loading && tracks.map((track, i) => {
                            const title = track.title || track.Title || 'Unknown';
                            const artist = track.artist || track.Artist || track.artistName || '';
                            const cover = getMediaUrl(track.coverImageUrl || track.CoverImageUrl);
                            return (
                                <div
                                    key={track.id || track.Id || i}
                                    onClick={() => onPlayTrack && onPlayTrack(track, tracks, i)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '8px 14px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{
                                        width: 36, height: 36, flexShrink: 0,
                                        borderRadius: 6, overflow: 'hidden',
                                        background: '#1a1a1a',
                                    }}>
                                        {cover ? (
                                            <img src={cover} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                🎵
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'monospace',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {title}
                                        </div>
                                        {artist && (
                                            <div style={{
                                                color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {artist}
                                            </div>
                                        )}
                                    </div>
                                    <Play size={12} color="rgba(255,255,255,0.3)" />
                                </div>
                            );
                        })}
                        {!loading && tracks.length === 0 && (
                            <div style={{
                                textAlign: 'center', padding: 32,
                                color: 'rgba(255,255,255,0.2)',
                                fontFamily: 'monospace', fontSize: 11,
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                            }}>
                                No tracks in this playlist
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PlaylistPreviewPanel;
