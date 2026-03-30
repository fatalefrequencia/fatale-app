import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, Youtube } from 'lucide-react';

const YoutubeNode = ({ data }) => {
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
            style={{
                width: 150,
                height: 100,
                border: '2px solid #ffffff',
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                background: '#0a0a0a',
                transition: 'box-shadow 0.2s, transform 0.15s',
                userSelect: 'none',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 255, 255, 0.7)';
                e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.transform = 'scale(1)';
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
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '3px 6px 5px',
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        color: '#fff', fontSize: 10, fontWeight: 700,
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                    }}>
                        {title}
                    </div>
                    {author && (
                        <div style={{
                            color: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: 'monospace',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {author}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(YoutubeNode);
