import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users, Zap } from 'lucide-react';

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
            style={{
                width: 160,
                height: 160,
                borderRadius: '50%',
                border: `3px solid ${color}`,
                background: `radial-gradient(circle at center, ${color}22 0%, #050505 80%)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: `0 0 30px ${color}33, inset 0 0 20px ${color}22`,
                transform: `scale(${scale})`,
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                zIndex: 50,
            }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 0 50px ${color}66, inset 0 0 30px ${color}44`;
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.transform = `scale(${scale * 1.05})`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = `0 0 30px ${color}33, inset 0 0 20px ${color}22`;
                e.currentTarget.style.borderColor = `${color}cc`;
                e.currentTarget.style.transform = `scale(${scale})`;
            }}
        >
            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

            {/* Pulsing outer ring if member */}
            {isMember && (
                <div style={{
                    position: 'absolute',
                    inset: -8,
                    borderRadius: '50%',
                    border: `1px solid ${color}`,
                    animation: 'pulse 2s infinite',
                    opacity: 0.5
                }} />
            )}

            <div style={{
                color: color,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                fontFamily: 'monospace',
                marginBottom: 4,
                opacity: 0.8
            }}>
                Sector_Hub
            </div>

            <div style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: 900,
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textShadow: `0 0 10px ${color}88`,
                maxWidth: '90%',
                lineHeight: 1.1
            }}>
                {name}
            </div>

            {showDetails && (
                <div style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255,255,255,0.05)',
                    padding: '4px 10px',
                    borderRadius: 20,
                    border: `1px solid ${color}33`
                }}>
                    <Users size={12} style={{ color }} />
                    <span style={{
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'monospace'
                    }}>
                        {communityCount} NODES
                    </span>
                </div>
            )}

            {/* Ambient icon at top */}
            <div style={{
                position: 'absolute',
                top: 20,
                opacity: 0.3
            }}>
                <Zap size={14} style={{ color }} />
            </div>
        </div>
    );
};

export default React.memo(SectorHubNode);
