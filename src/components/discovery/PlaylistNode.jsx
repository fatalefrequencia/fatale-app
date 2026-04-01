import React, { useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getMediaUrl } from '../../constants';
import { ListMusic } from 'lucide-react';

const PlaylistNode = ({ data }) => {
    const [hovered, setHovered] = React.useState(false);
    const {
        name,
        imageUrl,
        trackCount = 0,
        creatorName,
        onClick,
        zoom = 1,
    } = data;
    const showLabel = zoom > 0.55;
    const mediaUrl = imageUrl ? getMediaUrl(imageUrl) : null;
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 130,
                height: 130,
                border: '2px solid #ffd1dc', // Pastel Pink 
                boxShadow: hovered 
                    ? '0 0 25px rgba(255, 209, 220, 0.7)' 
                    : '0 0 15px rgba(255, 209, 220, 0.4)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                background: '#0a0a0a',
                transition: 'box-shadow 0.2s, transform 0.15s',
                userSelect: 'none',
                zIndex: 1,
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
        >
            <Handle type="target" position={Position.Left} style={{ opacity: 0, pointerEvents: 'none' }} />
            <Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} />

            {/* Playlist art */}
            {mediaUrl ? (
                <img
                    src={mediaUrl}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }}
                />
            ) : (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                }}>
                    <ListMusic size={40} color="rgba(255,255,255,0.3)" />
                </div>
            )}

            {/* Overlay */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: '60%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)',
                pointerEvents: 'none',
            }} />

            {/* Playlist badge */}
            <div style={{
                position: 'absolute', top: 8, left: 8,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(4px)',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 20,
                letterSpacing: '0.1em',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
            }}>
                <ListMusic size={8} />
                PLAYLIST
            </div>

            {/* Label */}
            {showLabel && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '4px 6px 6px',
                    pointerEvents: 'auto',
                }}>
                    <div 
                        className={`terminal-hover-scroll ${hovered ? 'is-hovered' : ''}`}
                        style={{
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                            fontFamily: "'Share Tech Mono', monospace"
                        }}
                    >
                        <span>{`> ${name}`}</span>
                    </div>
                    {creatorName && (
                        <div style={{
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: 8,
                            fontFamily: "'Share Tech Mono', monospace",
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {`ID_${creatorName.substring(0, 8)} // TRK_${trackCount} _`}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(PlaylistNode);
