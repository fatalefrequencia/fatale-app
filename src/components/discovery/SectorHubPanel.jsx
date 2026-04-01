import React from 'react';
import { X, Users, Plus, ChevronRight, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OrganicSkull from './OrganicSkull';
import { getMediaUrl } from '../../constants';

const SectorHubPanel = ({ 
    sector, 
    communities, 
    onClose, 
    onOpenCommunity, 
    onCreateCommunity,
    currentUser 
}) => {
    if (!sector) return null;

    const color = sector.color || '#ff006e';

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                maxWidth: 400,
                background: 'rgba(4, 4, 4, 0.98)',
                backdropFilter: 'blur(10px)',
                borderLeft: `1px solid ${color}40`,
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: `-10px 0 30px rgba(0,0,0,0.5)`
            }}
        >
            {/* Header */}
            <div style={{
                padding: '24px 20px',
                borderBottom: `1px solid ${color}22`,
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: color,
                    filter: 'blur(60px)',
                    opacity: 0.15
                }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: `${color}15`,
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: `1px solid ${color}33`
                    }}>
                        <span style={{
                            color,
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            fontFamily: 'monospace'
                        }}>
                            Sector_Hub
                        </span>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'rgba(255,255,255,0.3)', 
                            cursor: 'pointer',
                            padding: '12px',
                            marginRight: '-12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1100,
                            position: 'relative',
                            pointerEvents: 'auto'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <h2 className="mono" style={{
                    fontSize: 22,
                    fontWeight: 400,
                    color: color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <span style={{ opacity: 0.5 }}>&gt;</span>
                    {sector.name}
                    <motion.span 
                        animate={{ opacity: [1, 0, 1] }} 
                        transition={{ duration: 1, repeat: Infinity, ease: "steps(1)" }}
                        style={{ color }}
                    >
                        _
                    </motion.span>
                </h2>
                <p style={{
                    fontSize: 11,
                    color: `${color}cc`,
                    lineHeight: 1.5,
                    fontFamily: "'Share Tech Mono', monospace",
                    letterSpacing: '0.03em'
                }}>
                    {`> ${sector.desc || 'Establish your frequency in this sector.'}`}
                </p>
            </div>

            {/* Community List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
            }}>
                <div style={{ 
                    fontSize: 10, 
                    fontWeight: 900, 
                    color: 'rgba(255,255,255,0.3)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.1em',
                    marginBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <Users size={12} />
                    Active Communities ({communities.length})
                </div>

                {communities.length === 0 ? (
                    <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 8,
                        border: '1px dashed rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: 'monospace' }}>
                            No communities have been founded in this sector yet.
                        </div>
                    </div>
                ) : (
                    communities.map(comm => (
                        <button
                            key={comm.id}
                            onClick={() => onOpenCommunity(comm)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: 8,
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                                e.currentTarget.style.borderColor = `${color}44`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                            }}
                        >
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 4,
                                background: `${color}15`,
                                border: `1px solid ${color}33`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                overflow: 'hidden'
                            }}>
                                {comm.imageUrl ? (
                                    <img 
                                        src={getMediaUrl(comm.imageUrl)} 
                                        alt="" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                ) : (
                                    <OrganicSkull size={20} color={color} />
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                    color: '#fff', 
                                    fontSize: 14, 
                                    fontWeight: 700, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.02em',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {comm.name}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                        {comm.memberCount || 0} Members
                                    </span>
                                    {comm.founderId === currentUser?.id && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, color, fontSize: 8, fontWeight: 900 }}>
                                            <Shield size={8} />
                                            OWN
                                        </div>
                                    )}
                                </div>
                            </div>
                            <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
                        </button>
                    ))
                )}
            </div>

            {/* Footer / Create Button */}
            <div style={{
                padding: '20px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                background: 'rgba(0,0,0,0.2)'
            }}>
                <button
                    onClick={() => onCreateCommunity(sector.id)}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: 'transparent',
                        border: `1px solid ${color}88`,
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: `0 0 15px ${color}22`
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = `${color}22`;
                        e.currentTarget.style.boxShadow = `0 0 25px ${color}44`;
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.boxShadow = `0 0 15px ${color}22`;
                    }}
                >
                    <Plus size={14} style={{ color }} />
                    Found a Community
                </button>
                <div style={{ 
                    textAlign: 'center', 
                    color: `${color}88`, 
                    fontSize: 8, 
                    marginTop: 12, 
                    fontFamily: "'Share Tech Mono', monospace", 
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                }}>
                    {`> Establish a new point of frequency in ${sector.name}.`}
                </div>
            </div>
        </motion.div>
    );
};

export default SectorHubPanel;
