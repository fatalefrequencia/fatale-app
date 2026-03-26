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
    large:  { w: 180, h: 200 },
    medium: { w: 140, h: 155 },
    small:  { w: 100, h: 110 },
};

const ArtistNode = ({ data }) => {
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
            style={{
                width: w,
                height: h,
                border: `2px solid ${sectorColor}`,
                boxShadow: isLive
                    ? `0 0 18px ${sectorColor}80, 0 0 4px ${sectorColor}`
                    : `0 0 8px ${sectorColor}40`,
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                background: '#0a0a0a',
                transition: 'box-shadow 0.2s, transform 0.15s',
                userSelect: 'none',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 0 24px ${sectorColor}cc, 0 0 8px ${sectorColor}`;
                e.currentTarget.style.transform = 'scale(1.04)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.boxShadow = isLive
                    ? `0 0 18px ${sectorColor}80, 0 0 4px ${sectorColor}`
                    : `0 0 8px ${sectorColor}40`;
                e.currentTarget.style.transform = 'scale(1)';
            }}
        >
            {/* No handles needed — these are display-only nodes */}
            <Handle type="target" position={Position.Left} style={{ opacity: 0, pointerEvents: 'none' }} />
            <Handle type="source" position={Position.Right} style={{ opacity: 0, pointerEvents: 'none' }} />

            {/* Profile image */}
            {mediaUrl ? (
                <img
                    src={mediaUrl}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }}
                />
            ) : (
                <div style={{
                    width: '100%', height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, #0a0a0a 0%, ${sectorColor}22 100%)`,
                    fontSize: tier === 'large' ? 48 : tier === 'medium' ? 36 : 26,
                }}>
                    🎵
                </div>
            )}

            {/* Bottom gradient overlay */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: showLabel ? '55%' : '30%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)',
                pointerEvents: 'none',
            }} />

            {/* Live badge */}
            {showLive && (
                <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: '#ff006e',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 900,
                    padding: '2px 7px',
                    borderRadius: 20,
                    letterSpacing: '0.12em',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    animation: 'pulse 1.5s infinite',
                    boxShadow: '0 0 8px #ff006e',
                }}>
                    LIVE
                </div>
            )}

            {/* Label */}
            {showLabel && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '6px 8px 8px',
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        color: '#fff',
                        fontSize: tier === 'large' ? 13 : 11,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                    }}>
                        {name}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(ArtistNode);
