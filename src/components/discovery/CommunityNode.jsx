import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Users } from 'lucide-react';

const CommunityNode = ({ data }) => {
    const {
        name,
        color = '#ff006e',
        memberCount = 0,
        zoom = 1,
        onClick,
    } = data;

    // Logarithmic scaling for size based on members (base 80, grows with members)
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
                background: `radial-gradient(circle at center, ${color}22 0%, #0a0a0a 100%)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: `drop-shadow(0 0 10px ${color}33)`,
                border: 'none',
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
            {/* Inner Border */}
            <div style={{
                position: 'absolute',
                inset: 1.5,
                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                background: '#050505',
                zIndex: -1,
                opacity: 0.95
            }} />

            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

            <div style={{
                color: '#fff',
                fontSize: size > 110 ? 12 : 10,
                fontWeight: 900,
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                maxWidth: '80%',
                lineHeight: 1,
                marginBottom: 2
            }}>
                {name}
            </div>

            {showLabel && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    opacity: 0.6
                }}>
                    <Users size={size > 110 ? 10 : 8} style={{ color }} />
                    <span style={{
                        color: '#fff',
                        fontSize: size > 110 ? 9 : 8,
                        fontWeight: 700,
                        fontFamily: 'monospace'
                    }}>
                        {memberCount}
                    </span>
                </div>
            )}
        </div>
    );
};

export default React.memo(CommunityNode);
