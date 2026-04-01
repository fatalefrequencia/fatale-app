import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users } from 'lucide-react';
import OrganicSkull from './OrganicSkull';

const SectorHubNode = ({ data }) => {
    const {
        name,
        color = '#ff006e',
        communityCount = 0,
        isMember = false,
        zoom = 1,
    } = data;

    // Node scales up slightly when zoomed out to remain a landmark
    const scale = zoom < 0.4 ? 1.2 : 1;
    const showDetails = zoom > 0.3;

    return (
        <div
            onClick={data.onClick}
            style={{
                width: 260,
                height: 260,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                background: `radial-gradient(circle at center, ${color}33 0%, #080808 90%)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                transform: `scale(${scale})`,
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s',
                zIndex: 50,
                filter: `drop-shadow(0 0 15px ${color}44)`,
                border: 'none', // Clip-path handles the shape, border won't follow it easily
            }}
            onMouseEnter={e => {
                e.currentTarget.style.filter = `drop-shadow(0 0 30px ${color}88) brightness(1.2)`;
                e.currentTarget.style.transform = `scale(${scale * 1.08})`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.filter = `drop-shadow(0 0 15px ${color}44)`;
                e.currentTarget.style.transform = `scale(${scale})`;
            }}
        >
            {/* Hexagonal Inner Border Emulation */}
            <div style={{
                position: 'absolute',
                inset: 2,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                background: '#050505',
                zIndex: -1,
                opacity: 0.95
            }} />

            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

            {/* Pulsing Hexagonal highlight if member */}
            {isMember && (
                <div style={{
                    position: 'absolute',
                    inset: -5,
                    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                    background: color,
                    animation: 'pulse 2s infinite',
                    opacity: 0.2,
                    zIndex: -2
                }} />
            )}

            <div style={{
                color: color,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.4em',
                textTransform: 'uppercase',
                fontFamily: "'Share Tech Mono', monospace",
                marginBottom: 6,
                opacity: 0.6
            }}>
                Sector_Hub
            </div>

            <div style={{
                color: '#fff',
                fontSize: 26,
                fontWeight: 900,
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textShadow: `0 0 15px ${color}88`,
                maxWidth: '85%',
                lineHeight: 1,
                fontFamily: "'Share Tech Mono', monospace"
            }}>
                {`> ${name}`}
            </div>

            {showDetails && (
                <div style={{
                    marginTop: 15,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(255,255,255,0.05)',
                    padding: '6px 14px',
                    borderRadius: 4,
                    border: `1px solid ${color}33`,
                    fontFamily: "'Share Tech Mono', monospace"
                }}>
                    <Users size={16} style={{ color }} />
                    <span style={{
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700
                    }}>
                        {`HUB_${communityCount} _`}
                    </span>
                </div>
            )}

            {/* Ambient icon at top */}
            <div style={{
                position: 'absolute',
                top: 40,
                opacity: 0.3
            }}>
                <OrganicSkull size={24} color={color} />
            </div>
        </div>
    );
};

export default React.memo(SectorHubNode);
