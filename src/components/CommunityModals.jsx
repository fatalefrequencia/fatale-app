import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Globe, Plus, LogOut, Loader2, Info, AlertCircle } from 'lucide-react';
import API from '../services/api';
import { SECTORS } from './DiscoveryMapView'; // We'll need to export this from DiscoveryMapView or move it to a shared constants file

// ─── COMMUNITY DETAILS MODAL ─────────────────────────────────────────────
export const CommunityDetailsModal = ({ community, onClose, onJoin, onLeave, currentUser, loadingAction }) => {
    if (!community) return null;

    const isMember = currentUser?.communityId === community.id;
    const isFounder = currentUser?.id === community.founderId;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-md rounded-lg overflow-visible"
                style={{
                    background: 'rgba(15, 5, 30, 0.35)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${community.color || '#ff006e'}50`,
                    boxShadow: `0 0 40px -10px ${community.color || '#ff006e'}40, inset 0 0 25px ${community.color || '#ff006e'}20`,
                    backgroundImage: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.15) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03))',
                    backgroundSize: '100% 2px, 3px 100%',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Holographic Corners */}
                <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2" style={{ borderColor: community.color || '#ff006e' }} />
                <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2" style={{ borderColor: community.color || '#ff006e' }} />
                <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2" style={{ borderColor: community.color || '#ff006e' }} />
                <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2" style={{ borderColor: community.color || '#ff006e' }} />

                {/* Animated Scan Line */}
                <motion.div
                    className="absolute inset-x-0 h-[1px] bg-white/20 blur-[1px] z-10 pointer-events-none"
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />

                <div className="p-7 relative z-20">
                    {/* Top row */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Globe size={14} style={{ color: community.color || '#ff006e' }} className="animate-pulse" />
                                <span className="mono text-[10px] tracking-[0.3em] uppercase font-black" style={{ color: community.color || '#ff006e', textShadow: `0 0 8px ${community.color || '#ff006e'}` }}>
                                    NODE_CONNECTED // SECTOR_{community.sectorId}
                                </span>
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">{community.name}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors group">
                            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    {/* Stats & Info */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 backdrop-blur-md rounded border border-white/10 p-4 relative group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-2 text-white/40 mb-2">
                                <Users size={12} />
                                <span className="mono text-[8px] uppercase tracking-[0.2em] font-bold">Pop_Density</span>
                            </div>
                            <div className="text-2xl font-black text-white mono tracking-tighter" style={{ textShadow: `0 0 10px ${community.color || '#ff006e'}aa` }}>
                                {community.memberCount || 0}
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded border border-white/10 p-4 relative group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-2 text-white/40 mb-2">
                                <Info size={12} />
                                <span className="mono text-[8px] uppercase tracking-[0.2em] font-bold">Origin_Key</span>
                            </div>
                            <div className="text-sm font-black text-white truncate uppercase mono">{community.founderName || 'System'}</div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-10 relative">
                        <div className="mono text-[9px] text-white/30 tracking-[0.4em] uppercase mb-3 border-b border-white/10 pb-1">Data_Stream</div>
                        <p className="text-white/90 text-sm leading-relaxed font-mono uppercase tracking-tight">
                            {community.description || 'No descriptive data found in this node.'}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        {isMember ? (
                            <button
                                onClick={() => onLeave(community.id)}
                                disabled={loadingAction}
                                className="w-full py-4 rounded-sm border border-red-500/50 text-red-400 font-black tracking-[0.3em] hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase text-xs shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                            >
                                {loadingAction ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                                DISCONNECT_NODE
                            </button>
                        ) : (
                            <button
                                onClick={() => onJoin(community.id)}
                                disabled={loadingAction || currentUser?.communityId}
                                className="w-full py-4 rounded-sm font-black tracking-[0.3em] transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden uppercase text-xs shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                style={{
                                    background: `linear-gradient(135deg, ${community.color || '#ff006e'}40, transparent)`,
                                    border: `1px solid ${community.color || '#ff006e'}80`,
                                    color: 'white',
                                }}
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                {loadingAction ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                                {currentUser?.communityId ? 'LIMIT_REACHED' : 'ESTABLISH_LINK'}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── CREATE COMMUNITY MODAL ──────────────────────────────────────────────
export const CreateCommunityModal = ({ onClose, onSubmit, loading, user_credits = 0 }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [sectorId, setSectorId] = useState(0);
    const [localError, setLocalError] = useState(null);
    const CREATION_COST = 500;

    const canAfford = (user_credits || 0) >= CREATION_COST;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);
        if (!name.trim() || !description.trim()) return;

        if (!canAfford) {
            setLocalError("INSUFFICIENT CREDITS: Access to founding protocols denied.");
            return;
        }

        try {
            await onSubmit({ name, description, sectorId });
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data || "CRITICAL: Node initialization failed.";
            setLocalError(msg.toUpperCase());
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6"
        >
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[12px]"
                onClick={() => !loading && onClose()}
            />

            <motion.div
                initial={{ opacity: 0, scaleY: 0, scaleX: 0.4, filter: "brightness(3) blur(10px)" }}
                animate={{ opacity: 1, scaleY: 1, scaleX: 1, filter: "brightness(1) blur(0px)" }}
                exit={{ opacity: 0, scaleY: 0, scaleX: 0.4, filter: "brightness(3) blur(10px)" }}
                transition={{
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                    opacity: { duration: 0.2 }
                }}
                style={{ originY: 0.5 }} // Expand from center outwards like a scroll
                className="relative w-full max-w-lg bg-[#050b18]/85 border-l border-l-[#00ffff]/10 border-r border-r-[#00ffff]/10 p-8 shadow-[0_30px_60px_rgba(0,0,0,0.6),-6px_0_15px_rgba(0,230,255,0.05),6px_0_15px_rgba(0,230,255,0.05)] backdrop-blur-2xl rounded-sm"
            >
                {/* Physical Scroll Rods - Sit "on top" for 3D effect */}
                <div className="absolute top-[-1px] left-0 right-0 h-[2px] bg-[#00ffff] shadow-[0_2px_8px_rgba(0,0,0,0.9),0_0_12px_rgba(0,255,255,0.4)] z-[60]" />
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#00ffff] shadow-[0_-2px_8px_rgba(0,0,0,0.9),0_0_12px_rgba(0,255,255,0.4)] z-[60]" />

                {/* Holographic light leaks - Intensified blue */}
                <div className="absolute -top-48 -left-48 w-96 h-96 bg-[#00ffff]/15 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -top-48 -right-48 w-96 h-96 bg-[#0088ff]/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-[#ff006e]/05 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-[#00ffff]/08 rounded-full blur-[140px] pointer-events-none" />

                {/* Scanline */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(0,255,255,0.04),rgba(0,100,255,0.02),rgba(255,0,110,0.03))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%]" />

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 mt-1 ml-1">
                        <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-[#00ffff]/10 border border-[#00ffff]/20 rounded-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00ffff] animate-pulse shadow-[0_0_8px_#00ffff]" />
                            <span className="text-[8px] mono font-black text-[#00ffff] tracking-[0.3em] uppercase">
                                + NEW_GENESIS
                            </span>
                        </div>
                        <button onClick={onClose} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors group">
                            <X size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-3xl font-black text-white tracking-widest uppercase">Found Community</h2>
                        <div className="text-[9px] mono text-white/30 uppercase tracking-widest mt-1 ml-1">
                            Initialize a new nodal collective on the grid
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <AnimatePresence>
                            {localError && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-red-500/10 border border-red-500/30 p-4 mb-2 flex flex-col gap-2 backdrop-blur-md"
                                >
                                    <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest">
                                        <AlertCircle size={14} /> [ ACCESS_DENIED ]
                                    </div>
                                    <div className="mono text-[8px] text-red-400 font-black uppercase tracking-wider">
                                        {localError}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-[#00ffff]/60 uppercase tracking-[0.3em] ml-1">Community_Identifier</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => { setName(e.target.value); if (localError) setLocalError(null); }}
                                maxLength={100}
                                required
                                className="w-full bg-black/40 border border-white/10 p-4 text-white font-black outline-none focus:border-[#00ffff] tracking-widest transition-all text-sm mono"
                                placeholder="identifier_required..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-[#00ffff]/60 uppercase tracking-[0.3em] ml-1">Data_Manifesto</label>
                            <textarea
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); if (localError) setLocalError(null); }}
                                maxLength={500}
                                required
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 p-4 text-white/70 outline-none focus:border-[#00ffff]/40 tracking-wide transition-all text-[10px] resize-none mono"
                                placeholder="purpose_string..."
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-[#00ffff]/60 uppercase tracking-[0.3em] ml-1 text-center block w-full">Geometric_Sector</label>
                            <div className="flex flex-wrap justify-center gap-2">
                                {[
                                    { id: 0, name: 'CLUB/BASS/TECHNO', color: '#ff006e' },
                                    { id: 1, name: 'POP/HYPERPOP/R&B', color: '#00ffff' },
                                    { id: 2, name: 'AMBIENT/EXPERIMENTAL', color: '#a855f7' },
                                    { id: 3, name: 'RAP/DRILL/TRAP', color: '#ffaa00' },
                                    { id: 4, name: 'ROCK/METAL/PUNK', color: '#ff3333' },
                                ].map((sector, idx, arr) => (
                                    <button
                                        key={sector.id}
                                        type="button"
                                        onClick={() => setSectorId(sector.id)}
                                        className={`w-[calc(50%-4px)] p-3 border flex items-center gap-3 transition-all relative group overflow-hidden ${sectorId === sector.id
                                            ? 'bg-white/10 border-white/40'
                                            : 'border-white/5 bg-black/20 opacity-60 hover:opacity-100 hover:border-white/20'
                                            }`}
                                        style={{
                                            borderColor: sectorId === sector.id ? sector.color : '',
                                            boxShadow: sectorId === sector.id ? `0 0 15px ${sector.color}30` : ''
                                        }}
                                    >
                                        <div className="w-2 h-2 rounded-sm rotate-45 shrink-0" style={{ backgroundColor: sector.color, boxShadow: `0 0 10px ${sector.color}` }} />
                                        <div className="text-[10px] mono font-bold text-white uppercase tracking-tight truncate">{sector.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cost & Submit */}
                        <div className="pt-4 border-t border-white/5 mt-2">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <span className="text-white/30 mono text-[9px] uppercase tracking-[0.3em] font-black">Creation_Price</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rotate-45 ${canAfford ? 'bg-[#00ffff] shadow-[0_0_8px_#00ffff]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                                    <span className={`text-base font-black mono tracking-tighter ${canAfford ? 'text-white' : 'text-red-500'}`}>
                                        {CREATION_COST} CR
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-8 py-4 bg-black border border-white/10 text-white/40 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white hover:border-white/30 transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !name.trim() || !description.trim() || !canAfford}
                                    className={`flex-[2] py-4 border border-[#00ffff] bg-[#00ffff]/20 text-[#00ffff] font-black uppercase text-[10px] tracking-[0.2em] relative overflow-hidden group active:scale-95 transition-all shadow-[0_0_30px_#00ffff10] ${loading || !canAfford ? 'opacity-50' : 'hover:bg-[#00ffff] hover:text-black hover:shadow-[0_0_50px_#00ffff40]'}`}
                                >
                                    {loading ? 'INITIALIZING...' : 'INIT_COLLECTIVE'}
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    );
};
