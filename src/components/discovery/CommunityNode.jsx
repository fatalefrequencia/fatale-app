import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users } from 'lucide-react';
import { getMediaUrl } from '../../constants';

const CommunityNode = ({ data }) => {
    const {
        name,
        color = '#ff006e',
        memberCount = 0,
        imageUrl = null,
        zoom = 1,
        onClick,
    } = data;

    // Logarithmic scaling for size based on members (base 85, grows with members)
    const baseSize = 85;
    const growth = Math.log10(Math.max(memberCount, 1) + 1) * 25;
    const size = baseSize + growth;

    const showLabel = zoom > 0.45;

    return (
        <div
            onClick={onClick}
            style={{
                width: size,
                height: size,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                background: imageUrl 
                    ? `linear-gradient(45deg, ${color}44 0%, ${color}11 100%)`
                    : `radial-gradient(circle at center, ${color}22 0%, #0a0a0a 100%)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: `drop-shadow(0 0 10px ${color}33)`,
                border: 'none',
                overflow: 'hidden'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.filter = `drop-shadow(0 0 20px ${color}66) brightness(1.2)`;
                e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.filter = `drop-shadow(0 0 10px ${color}33)`;
                e.currentTarget.style.transform = 'scale(1)';
            }}
        >
            {/* Background Image / Placeholder */}
            <div style={{
                position: 'absolute',
                inset: 1.5,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                background: '#050505',
                zIndex: 0,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {imageUrl ? (
                    <img 
                        src={getMediaUrl(imageUrl)} 
                        alt="" 
                        style={{ width: '105%', height: '105%', objectFit: 'cover', opacity: 0.8 }} 
                    />
                ) : (
                    <div style={{ opacity: 0.15, transform: 'scale(0.8)' }}>
                        <Users size={size * 0.5} color={color} />
                    </div>
                )}
                {/* Overlay gradient for text readability */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(to bottom, transparent 40%, #000 100%)`,
                    opacity: imageUrl ? 0.7 : 0,
                    zIndex: 1
                }} />
            </div>

            <div 
                className="terminal-hover-scroll"
                style={{
                    color: '#fff',
                    fontSize: size > 110 ? 11 : 9,
                    fontWeight: 900,
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    maxWidth: '85%',
                    lineHeight: 1.1,
                    marginBottom: 2,
                    zIndex: 2,
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    fontFamily: "'Share Tech Mono', monospace"
                }}
            >
                <span>{`> ${name}`}</span>
            </div>

            {showLabel && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    opacity: 0.8,
                    zIndex: 2,
                    fontFamily: "'Share Tech Mono', monospace"
                }}>
                    <Users size={size > 110 ? 10 : 8} style={{ color }} />
                    <span style={{
                        color: '#fff',
                        fontSize: size > 110 ? 9 : 8,
                        fontWeight: 700
                    }}>
                        {`ID_${memberCount} _`}
                    </span>
                </div>
            )}

            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        </div>
    );
};

export default React.memo(CommunityNode);
