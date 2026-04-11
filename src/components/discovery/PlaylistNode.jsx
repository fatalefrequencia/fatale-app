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
        sectorColor = '#ff006e', // Default to Fatale Pink
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
                border: `1px solid ${sectorColor}33`,
                boxShadow: hovered 
                    ? `0 0 30px ${sectorColor}cc, inset 0 0 15px ${sectorColor}44` 
                    : `0 0 18px ${sectorColor}66`,
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                background: '#0a0a0a',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                userSelect: 'none',
                zIndex: 1,
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
        >
            <Handle type="target" position={Position.Left} style={{ opacity: 0, pointerEvents: 'none' }} />
            <Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} />

            {/* Playlist art */}
            {mediaUrl && (
                <img
                    src={mediaUrl}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }}
                />
            )}
            {!mediaUrl && (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                }} />
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
                    position: 'absolute', top: '50%', left: 0, right: 0,
                    transform: 'translateY(-50%)',
                    padding: '0 10%',
                    pointerEvents: 'auto',
                    zIndex: 10,
                    textAlign: 'center'
                }}>
                    <div 
                        className={`terminal-hover-scroll ${hovered ? 'is-hovered' : ''}`}
                        style={{
                            color: '#fff',
                            fontSize: hovered ? 11 : Math.max(6, Math.min(11, (130 * 0.8) / (name.length + 2))),
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: hovered ? '0.08em' : '0.04em',
                            textShadow: hovered ? `0 0 5px ${sectorColor}` : '0 0 4px rgba(0,0,0,1)',
                            fontFamily: "'Share Tech Mono', monospace",
                            transition: 'all 0.2s ease',
                            whiteSpace: hovered ? 'nowrap' : 'normal',
                            wordBreak: hovered ? 'normal' : 'break-all'
                        }}
                    >
                        <span>{`> ${name}`}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(PlaylistNode);
