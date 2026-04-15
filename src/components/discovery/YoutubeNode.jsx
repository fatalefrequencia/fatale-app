import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Youtube } from 'lucide-react';

const YoutubeNode = ({ data }) => {
    const [hovered, setHovered] = React.useState(false);
    const {
        title,
        author,
        thumbnailUrl,
        id,
        sectorColor = '#ff006e',
        onPlay,
        zoom = 1,
    } = data;
    const showLabel = zoom > 0.55;
    return (
        <div
            onClick={() => onPlay && onPlay(data)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 160,
                height: 160,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: hovered
                    ? '0 0 20px rgba(255, 255, 255, 0.4)'
                    : 'none',
                borderRadius: 8,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                background: '#0a0a0a',
                transition: 'all 0.2s',
                userSelect: 'none',
                transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
        >
            <Handle type="target" position={Position.Left} style={{ opacity: 0, pointerEvents: 'none' }} />
            <Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} />

            {/* Thumbnail */}
            {thumbnailUrl ? (
                <img
                    src={thumbnailUrl}
                    alt={title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            ) : (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#111',
                }}>
                    <Youtube size={32} color={sectorColor} />
                </div>
            )}

            {/* Overlay gradient */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)',
                pointerEvents: 'none',
            }} />

            {/* Play button */}
            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 30, height: 30,
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
            }}>
                <Play size={12} fill="#fff" color="#fff" />
            </div>

            {/* YT badge */}
            <div style={{
                position: 'absolute', top: 6, right: 6,
                background: '#ff0000',
                borderRadius: 4,
                padding: '1px 4px',
                display: 'flex', alignItems: 'center', gap: 2,
            }}>
                <Youtube size={8} color="#fff" fill="#fff" />
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
                            fontSize: hovered ? 11 : Math.max(6, Math.min(11, (120 * 0.8) / (title.length + 2))),
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: hovered ? '0.08em' : '0.04em',
                            textShadow: hovered ? '0 0 5px #fff' : '0 1px 3px rgba(0,0,0,0.9)',
                            fontFamily: "'Share Tech Mono', monospace",
                            transition: 'all 0.2s ease',
                            whiteSpace: hovered ? 'nowrap' : 'normal',
                            wordBreak: hovered ? 'normal' : 'break-all'
                        }}
                    >
                        <span>{`> ${title}`}</span>
                    </div>
                    {author && (
                        <div style={{
                            color: 'rgba(255,255,255,0.5)', fontSize: 8,
                            fontFamily: "'Share Tech Mono', monospace",
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {`SRC_${author.substring(0, 12)} _`}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(YoutubeNode);
