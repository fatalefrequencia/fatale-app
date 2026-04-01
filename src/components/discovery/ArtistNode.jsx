import React, { useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getMediaUrl } from '../../constants';

// Size tiers based on track count / prominence
const getSizeTier = (trackCount = 0, isLive = false) => {
    if (isLive) return 'large';
    if (trackCount >= 10) return 'large';
    if (trackCount >= 3) return 'medium';
    return 'small';
};

const TIER_DIMS = {
    large:  { w: 180, h: 180 },
    medium: { w: 140, h: 140 },
    small:  { w: 100, h: 100 },
};

const ArtistNode = ({ data }) => {
    const [hovered, setHovered] = React.useState(false);
    const {
        name,
        imageUrl,
        sectorColor = '#ff006e',
        isLive = false,
        trackCount = 0,
        userId,
        navigateToProfile,
        zoom = 1,
    } = data;
    const tier = getSizeTier(trackCount, isLive);
    const { w, h } = TIER_DIMS[tier];

    // Hide labels when zoomed far out
    const showLabel = zoom > 0.55;
    const showLive = zoom > 0.4 && isLive;

    const handleClick = useCallback(() => {
        if (navigateToProfile && userId) {
            navigateToProfile(userId);
        }
    }, [navigateToProfile, userId]);

    const mediaUrl = imageUrl ? getMediaUrl(imageUrl) : null;
    return (
        <div
            onClick={handleClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: w,
                height: h,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                background: '#0a0a0a',
                cursor: 'pointer',
                position: 'relative',
                transition: 'transform 0.2s, filter 0.2s',
                zIndex: 1,
                filter: hovered
                    ? `drop-shadow(0 0 25px ${sectorColor}cc) drop-shadow(0 0 10px ${sectorColor})`
                    : isLive 
                        ? `drop-shadow(0 0 15px ${sectorColor}88) drop-shadow(0 0 5px ${sectorColor})`
                        : `drop-shadow(0 0 8px ${sectorColor}44)`,
                transform: hovered ? 'scale(1.06)' : 'scale(1)',
            }}
        >
            {/* Handles for context */}
            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />

            {/* Diamond Inner Border */}
            <div style={{
                position: 'absolute',
                inset: 2,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                background: '#050505',
                zIndex: -1,
                opacity: 0.95
            }} />

            {/* Profile image */}
            {mediaUrl && (
                <img
                    src={mediaUrl}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.8 }}
                    onError={e => { e.target.style.display = 'none'; }}
                />
            )}
            {!mediaUrl && (
                <div style={{
                    width: '100%', height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, #0a0a0a 0%, ${sectorColor}22 100%)`
                }} />
            )}

            {/* Centered Label for Diamond */}
            {showLabel && (
                <div style={{
                    position: 'absolute', bottom: '20%', left: 0, right: 0,
                    padding: '0 15%',
                    pointerEvents: 'auto',
                    textAlign: 'center'
                }}>
                    <div 
                        className={`terminal-hover-scroll ${hovered ? 'is-hovered' : ''}`}
                        style={{
                            color: '#fff',
                            fontSize: tier === 'large' ? 11 : 9,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            textShadow: hovered ? `0 0 5px ${sectorColor}` : '0 0 4px rgba(0,0,0,1)',
                            fontFamily: "'Share Tech Mono', monospace",
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span>{`> ${name}`}</span>
                    </div>
                </div>
            )}

            {/* Live indicator (Small circle in diamond center-top) */}
            {showLive && (
                <div style={{
                    position: 'absolute', top: '15%', left: '50%',
                    transform: 'translateX(-50%)',
                    width: 8, height: 8,
                    background: '#ff006e',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s infinite',
                    boxShadow: '0 0 10px #ff006e',
                }} />
            )}
        </div>
    );
};

export default React.memo(ArtistNode);
