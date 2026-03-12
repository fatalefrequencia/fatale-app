import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Music, Image as ImageIcon, CheckCircle, AlertCircle, Plus, Trash2, Lock, Unlock } from 'lucide-react';
import API from '../services/api';

// ─── Empty track template ────────────────────────────────────────────────────
const emptyTrack = () => ({
    id: Date.now() + Math.random(),
    title: '',
    genre: '',
    audioFile: null,
    coverFile: null,
    price: 0,
    isLocked: false,
});

// ─── Per-track row for album mode ────────────────────────────────────────────
const AlbumTrackRow = ({ track, index, onChange, onRemove, canRemove }) => {
    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) onChange(index, { [type]: file });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border border-white/10 bg-black/40 p-5 space-y-4 relative group rounded-sm"
        >
            {/* HUD Brackets for track unit */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff006e]/40 transition-colors group-hover:border-[#ff006e]" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff006e]/40 transition-colors group-hover:border-[#ff006e]" />

            {/* Track unit metadata */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-[#ff006e] rotate-45" />
                    <span className="text-[8px] mono text-[#ff006e]/80 tracking-[0.4em] uppercase font-black">UN_ID // TRACK_{String(index + 1).padStart(2, '0')}</span>
                </div>
                {canRemove && (
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="text-[8px] mono text-white/20 hover:text-[#ff006e] transition-colors border border-white/5 px-2 py-0.5 hover:border-[#ff006e]/30"
                    >
                        [ DELETE_SEQ ]
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Title */}
                <div className="col-span-2">
                    <input
                        type="text"
                        placeholder="track_id"
                        value={track.title}
                        onChange={e => onChange(index, { title: e.target.value })}
                        className="w-full bg-white/[0.02] border border-white/5 p-3 text-white text-[10px] font-black outline-none focus:border-[#ff006e] tracking-[0.1em] transition-all rounded-sm"
                        required
                    />
                </div>
                {/* Genre */}
                <div>
                    <input
                        type="text"
                        placeholder="genre_tag"
                        value={track.genre}
                        onChange={e => onChange(index, { genre: e.target.value })}
                        className="w-full bg-white/[0.02] border border-white/5 p-3 text-white text-[10px] font-bold outline-none focus:border-[#ff006e]/30 tracking-widest transition-all rounded-sm"
                    />
                </div>
                {/* Price */}
                <div className="space-y-1">
                    <label className="text-[7px] mono text-white/30 uppercase tracking-[0.2em] ml-1">download_cost</label>
                    <input
                        type="number"
                        min="0"
                        max="1"
                        placeholder="0"
                        value={track.price || ''}
                        onChange={e => {
                            const val = parseFloat(e.target.value);
                            onChange(index, { price: isNaN(val) ? 0 : Math.min(1, Math.max(0, val)) });
                        }}
                        className="w-full bg-white/[0.02] border border-white/5 p-3 text-white text-[10px] font-bold outline-none focus:border-[#ff006e]/30 tracking-widest transition-all rounded-sm"
                    />
                </div>
            </div>

            {/* Audio file picker */}
            <div className={`relative border p-3 flex items-center justify-between cursor-pointer transition-all rounded-sm ${track.audioFile ? 'border-[#ff006e]/50 bg-[#ff006e]/5' : 'border-white/5 bg-white/[0.02] hover:border-[#ff006e]/30'}`}>
                <input type="file" accept="audio/*" onChange={e => handleFileChange(e, 'audioFile')} className="hidden" id={`audio-${track.id}`} />
                <label htmlFor={`audio-${track.id}`} className="flex items-center gap-3 cursor-pointer w-full">
                    <div className={`w-8 h-8 rounded-sm border flex items-center justify-center transition-all ${track.audioFile ? 'border-[#ff006e] bg-[#ff006e]/20' : 'border-white/10'}`}>
                        <Music size={12} className={track.audioFile ? 'text-[#ff006e]' : 'text-white/20'} />
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${track.audioFile ? 'text-[#ff006e]' : 'text-white/30'}`}>
                            {track.audioFile ? track.audioFile.name : 'UPLOAD_SIGNAL_STREAM'}
                        </span>
                        <span className="text-[6px] mono text-white/10 uppercase">MIME: AUDIO/WAV_MP3</span>
                    </div>
                </label>
            </div>

            {/* Encryption toggle */}
            <div className="space-y-2">
                <div
                    onClick={() => onChange(index, { isLocked: !track.isLocked })}
                    className={`flex items-center justify-between p-3 border cursor-pointer transition-all rounded-sm ${track.isLocked ? 'bg-[#ff006e]/10 border-[#ff006e]/40 shadow-[inset_0_0_10px_#ff006e10]' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                >
                    <div className="flex items-center gap-2">
                        {track.isLocked
                            ? <Lock size={12} className="text-[#ff006e]" />
                            : <Unlock size={12} className="text-white/20" />
                        }
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${track.isLocked ? 'text-[#ff006e]' : 'text-white/30'}`}>
                            {track.isLocked ? 'PROTOCOL: LOCKED' : 'PROTOCOL: OPEN'}
                        </span>
                    </div>
                    <div className={`w-3 h-3 rounded-full transition-all ${track.isLocked ? 'bg-[#ff006e] animate-pulse shadow-[0_0_8px_#ff006e]' : 'bg-white/5'}`} />
                </div>
                {track.isLocked && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="px-3 py-2 border-l border-[#ff006e]/30 bg-[#ff006e]/5 flex items-start gap-2"
                    >
                        <AlertCircle size={10} className="text-[#ff006e] mt-0.5 shrink-0" />
                        <span className="text-[7px] mono text-[#ff006e]/70 uppercase leading-relaxed tracking-wider">
                            ENCRYPTION DETECTED. ACCESS REQUIRES [{track.price || 0} CRD] TRANSFER.
                        </span>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

// ─── Main Upload Modal ────────────────────────────────────────────────────────
const UploadTrackView = ({ onClose, onRefreshTracks }) => {
    const [mode, setMode] = useState('single'); // 'single' | 'album'

    // Single track state
    const [formData, setFormData] = useState({
        title: '',
        genre: '',
        audioFile: null,
        coverFile: null,
        price: 0,
        isLocked: false
    });

    // Album state
    const [albumData, setAlbumData] = useState({
        title: '',
        coverFile: null,
    });
    const [albumTracks, setAlbumTracks] = useState([emptyTrack()]);

    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('idle');
    const [errorDetails, setErrorDetails] = useState(null);

    // ── Single upload ──────────────────────────────────────────────────────────
    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.audioFile) return;

        setUploading(true);
        setStatus('idle');
        setErrorDetails(null);

        try {
            const data = new FormData();
            data.append('TrackTitle', formData.title);
            data.append('Genre', formData.genre || 'Unknown');
            data.append('Price', formData.price || 0);
            data.append('IsLocked', formData.isLocked || false);
            data.append('AudioFile', formData.audioFile);
            if (formData.coverFile) data.append('CoverImage', formData.coverFile);

            await API.Tracks.uploadTrack(data);
            setStatus('success');
            if (onRefreshTracks) await onRefreshTracks();
            setTimeout(() => onClose(), 1200);
        } catch (error) {
            setErrorDetails(error.response?.data || error.message);
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    // ── Album upload ───────────────────────────────────────────────────────────
    const handleAlbumSubmit = async (e) => {
        e.preventDefault();
        if (!albumData.title || albumTracks.some(t => !t.title || !t.audioFile)) return;

        setUploading(true);
        setStatus('idle');
        setErrorDetails(null);

        try {
            const data = new FormData();
            data.append('AlbumTitle', albumData.title);
            if (albumData.coverFile) data.append('CoverImage', albumData.coverFile);

            albumTracks.forEach((track, i) => {
                data.append(`Tracks[${i}].Title`, track.title);
                data.append(`Tracks[${i}].Genre`, track.genre || 'Unknown');
                data.append(`Tracks[${i}].Price`, track.price || 0);
                data.append(`Tracks[${i}].IsLocked`, track.isLocked);
                data.append(`Tracks[${i}].AudioFile`, track.audioFile);
                if (track.coverFile) data.append(`Tracks[${i}].CoverImage`, track.coverFile);
            });

            await API.Albums.uploadAlbum(data);
            setStatus('success');
            if (onRefreshTracks) await onRefreshTracks();
            setTimeout(() => onClose(), 1200);
        } catch (error) {
            setErrorDetails(error.response?.data || error.message);
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    // ── Album track helpers ────────────────────────────────────────────────────
    const updateTrack = (index, changes) => {
        setAlbumTracks(prev => prev.map((t, i) => i === index ? { ...t, ...changes } : t));
    };
    const addTrack = () => setAlbumTracks(prev => [...prev, emptyTrack()]);
    const removeTrack = (index) => setAlbumTracks(prev => prev.filter((_, i) => i !== index));

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6"
        >
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[12px]"
                onClick={() => !uploading && onClose()}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="relative w-full max-w-lg rounded-sm overflow-visible"
                style={{
                    background: 'rgba(5, 5, 5, 0.92)',
                    backdropFilter: 'blur(30px)',
                    border: '1px solid rgba(255, 0, 110, 0.2)',
                    boxShadow: '0 0 50px -10px rgba(0,0,0,0.5)',
                }}
            >
                {/* 4-Corner Brackets */}
                <div className="hud-bracket-tl text-[#ff006e]" />
                <div className="hud-bracket-tr text-[#ff006e]" />
                <div className="hud-bracket-bl text-[#ff006e]" />
                <div className="hud-bracket-br text-[#ff006e]" />

                {/* Animated Scan Line */}
                <motion.div
                    className="absolute inset-x-0 h-[1px] bg-[#ff006e]/20 blur-[1px] z-10 pointer-events-none"
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />

                <div className="p-8 relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 mt-1 ml-1 cursor-default">
                        <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-[#ff006e]/10 border border-[#ff006e]/20 rounded-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#ff006e] animate-pulse shadow-[0_0_8px_#ff006e]" />
                            <span className="text-[8px] mono font-black text-[#ff006e] tracking-[0.3em] uppercase">
                                + UPLOAD_SIGNAL
                            </span>
                        </div>
                        <button onClick={onClose} className="p-2 -mr-2 text-white/40 hover:text-white transition-colors group">
                            <X size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    {/* Mode tabs */}
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => { setMode('single'); setStatus('idle'); }}
                            className={`flex-1 py-3 px-4 transition-all flex items-center justify-center gap-2 mono text-[10px] font-black tracking-[0.2em] border rounded-sm ${mode === 'single' ? 'bg-[#ff006e]/10 border-[#ff006e] text-[#ff006e] shadow-[0_0_20px_rgba(255,0,110,0.2)]' : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'}`}
                        >
                            [ SINGLE_SIG ]
                        </button>
                        <button
                            onClick={() => { setMode('album'); setStatus('idle'); }}
                            className={`flex-1 py-3 px-4 transition-all flex items-center justify-center gap-2 mono text-[10px] font-black tracking-[0.2em] border rounded-sm ${mode === 'album' ? 'bg-[#ff006e]/10 border-[#ff006e] text-[#ff006e] shadow-[0_0_20px_rgba(255,0,110,0.2)]' : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'}`}
                        >
                            [ BATCH_LINK ]
                        </button>
                    </div>

                    {/* Success state */}
                    {status === 'success' ? (
                        <div className="text-center py-20 space-y-8">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-24 h-24 bg-[#ff006e]/5 border border-[#ff006e] flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(255,0,110,0.2)] relative"
                            >
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#ff006e]" />
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#ff006e]" />
                                <CheckCircle size={48} className="text-[#ff006e]" />
                            </motion.div>
                            <div className="space-y-4">
                                <p className="text-2xl font-black text-white tracking-[0.3em] uppercase italic">
                                    TRANSMISSION_COMPLETE
                                </p>
                                <div className="text-[10px] mono text-[#ff006e] opacity-60 uppercase tracking-[0.5em] animate-pulse">
                                    SYNCING_CORE_GRID...
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-h-[65vh] overflow-y-auto no-scrollbar pr-1">
                            {/* ─── SINGLE MODE ─────────────────────────── */}
                            {mode === 'single' && (
                                <form onSubmit={handleSingleSubmit} className="space-y-5 pb-4">
                                    <div>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 p-4 text-white font-black outline-none focus:border-[#ff006e] tracking-[0.2em] transition-all rounded-sm"
                                            placeholder="track_id"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <input
                                                type="text"
                                                value={formData.genre}
                                                onChange={e => setFormData({ ...formData, genre: e.target.value })}
                                                className="w-full bg-white/[0.03] border border-white/10 p-4 text-white font-black outline-none focus:border-[#ff006e]/40 transition-all text-[11px] tracking-widest rounded-sm"
                                                placeholder="genre_tag"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[7px] mono text-white/30 uppercase tracking-[0.2em] ml-1">download_cost</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="1"
                                                value={formData.price || 0}
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value);
                                                    setFormData({ ...formData, price: isNaN(val) ? 0 : Math.min(1, Math.max(0, val)) });
                                                }}
                                                className="w-full bg-white/[0.03] border border-white/10 p-4 text-white font-black outline-none focus:border-[#ff006e]/40 transition-all text-[11px] tracking-widest rounded-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {/* Encryption */}
                                    <div className="space-y-1">
                                        <div
                                            onClick={() => setFormData({ ...formData, isLocked: !formData.isLocked })}
                                            className={`flex items-center justify-between p-4 border cursor-pointer transition-all group ${formData.isLocked ? 'bg-[#ff006e]/5 border-[#ff006e]/40' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${formData.isLocked ? 'border-[#ff006e] bg-[#ff006e]/20 shadow-[0_0_10px_#ff006e40]' : 'border-white/20'}`}>
                                                    {formData.isLocked && <div className="w-1.5 h-1.5 bg-[#ff006e]" />}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${formData.isLocked ? 'text-[#ff006e]' : 'text-white/40 group-hover:text-white'}`}>
                                                    TOGGLE_ENCRYPTION_PROTOCOL
                                                </span>
                                            </div>
                                            <span className={`text-[8px] mono font-bold uppercase ${formData.isLocked ? 'text-[#ff006e] animate-pulse' : 'text-white/10'}`}>
                                                {formData.isLocked ? 'ENCRYPTED' : 'OPEN_SOURCE'}
                                            </span>
                                        </div>
                                        {formData.isLocked && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="px-4 py-2 border border-dashed border-[#ff006e]/30 bg-[#ff006e]/5"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle size={10} className="text-[#ff006e] mt-0.5 shrink-0" />
                                                    <span className="text-[7px] mono text-[#ff006e]/80 uppercase leading-relaxed tracking-wider">
                                                        Protocol_Active: Encryption restricts signal access. Users will be required to commit the specified [CRD] balance to decrypt and interact with this transmission.
                                                    </span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* File pickers */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className={`relative border border-dashed p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all rounded-sm ${formData.audioFile ? 'bg-[#ff006e]/10 border-[#ff006e]/50' : 'border-white/5 bg-white/[0.02] hover:border-[#ff006e]/30'}`}>
                                            <input type="file" accept="audio/*" onChange={e => { const f = e.target.files[0]; if (f) setFormData(p => ({ ...p, audioFile: f })); }} className="hidden" id="audio-upload" />
                                            <label htmlFor="audio-upload" className="flex flex-col items-center cursor-pointer text-center w-full">
                                                <div className={`w-12 h-12 border flex items-center justify-center mb-2 transition-all ${formData.audioFile ? 'border-[#ff006e] bg-[#ff006e]/20' : 'border-white/10'}`}>
                                                    <Music size={20} className={formData.audioFile ? 'text-[#ff006e]' : 'text-white/20'} />
                                                </div>
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${formData.audioFile ? 'text-[#ff006e]' : 'text-white/40'}`}>
                                                    {formData.audioFile ? formData.audioFile.name : 'UPLOAD_SIGNAL'}
                                                </span>
                                                <div className="text-[6px] mono text-white/10 mt-2 uppercase tracking-tight">MP3 / WAV / OGG</div>
                                            </label>
                                        </div>
                                        <div className={`relative border border-dashed p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all rounded-sm ${formData.coverFile ? 'bg-[#ff006e]/10 border-[#ff006e]/50' : 'border-white/5 bg-white/[0.02] hover:border-[#ff006e]/30'}`}>
                                            <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) setFormData(p => ({ ...p, coverFile: f })); }} className="hidden" id="cover-upload" />
                                            <label htmlFor="cover-upload" className="flex flex-col items-center cursor-pointer text-center w-full">
                                                <div className={`w-12 h-12 border flex items-center justify-center mb-2 transition-all ${formData.coverFile ? 'border-[#ff006e] bg-[#ff006e]/20' : 'border-white/10'}`}>
                                                    <ImageIcon size={20} className={formData.coverFile ? 'text-[#ff006e]' : 'text-white/20'} />
                                                </div>
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${formData.coverFile ? 'text-[#ff006e]' : 'text-white/40'}`}>
                                                    {formData.coverFile ? formData.coverFile.name : 'ATTACH_VISUAL'}
                                                </span>
                                                <div className="text-[6px] mono text-white/10 mt-2 uppercase tracking-tight">JPG / PNG / WEBP</div>
                                            </label>
                                        </div>
                                    </div>

                                    {status === 'error' && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-red-500/10 border border-red-500/30 flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest">
                                                <AlertCircle size={14} /> ERROR // UpLink_Interrupted
                                            </div>
                                            {errorDetails && <div className="text-[8px] mono text-red-500/70 uppercase max-h-20 overflow-y-auto no-scrollbar">{typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : String(errorDetails)}</div>}
                                        </motion.div>
                                    )}

                                    <div className="flex gap-4 pt-2">
                                        <button type="button" onClick={onClose} className="flex-1 px-8 py-4 bg-black border border-white/10 text-white/40 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white hover:border-white/30 transition-all">Abort</button>
                                        <button type="submit" disabled={uploading} className={`flex-[2] py-4 border border-[#ff006e] bg-[#ff006e]/20 text-[#ff006e] font-black uppercase text-[10px] tracking-[0.2em] relative overflow-hidden group active:scale-95 transition-all shadow-[0_0_30px_#ff006e10] ${uploading ? 'opacity-50' : 'hover:bg-[#ff006e] hover:text-black hover:shadow-[0_0_50px_#ff006e40]'}`}>
                                            {uploading ? <div className="flex items-center justify-center gap-3"><div className="w-2 h-2 bg-black animate-ping" /> TRANSMITTING...</div> : 'INIT_UPLOAD'}
                                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* ─── ALBUM MODE ──────────────────────────── */}
                            {mode === 'album' && (
                                <form onSubmit={handleAlbumSubmit} className="space-y-5 pb-4">
                                    {/* Album title */}
                                    <div>
                                        <input
                                            type="text"
                                            value={albumData.title}
                                            onChange={e => setAlbumData({ ...albumData, title: e.target.value })}
                                            className="w-full bg-white/[0.03] border border-white/10 p-4 text-white font-black outline-none focus:border-[#ff006e] tracking-[0.2em] transition-all rounded-sm"
                                            placeholder="album_title"
                                            required
                                        />
                                    </div>

                                    {/* Album cover */}
                                    <div className={`relative border border-dashed p-4 flex items-center gap-4 cursor-pointer transition-all ${albumData.coverFile ? 'border-[#ff006e]/50 bg-[#ff006e]/5' : 'border-white/10 hover:border-[#ff006e]/30'}`}>
                                        <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) setAlbumData(p => ({ ...p, coverFile: f })); }} className="hidden" id="album-cover-upload" />
                                        <label htmlFor="album-cover-upload" className="flex items-center gap-4 cursor-pointer w-full">
                                            <ImageIcon size={20} className={albumData.coverFile ? 'text-[#ff006e]' : 'text-white/20'} />
                                            <div>
                                                <div className={`text-[9px] font-black uppercase tracking-widest ${albumData.coverFile ? 'text-[#ff006e]' : 'text-white/40'}`}>
                                                    {albumData.coverFile ? albumData.coverFile.name : 'Album_Cover_Image'}
                                                </div>
                                                <div className="text-[7px] text-white/20">Shared across all tracks unless overridden per-track</div>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Track list */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-black text-[#ff006e]/50 uppercase tracking-[0.3em]">Tracks ({albumTracks.length})</label>
                                            <button
                                                type="button"
                                                onClick={addTrack}
                                                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#ff0000]/40 text-[#ff0000] hover:bg-[#ff0000]/10 transition-all mono text-[8px] uppercase tracking-widest"
                                            >
                                                <Plus size={10} /> Add_Track
                                            </button>
                                        </div>
                                        <AnimatePresence>
                                            {albumTracks.map((track, index) => (
                                                <AlbumTrackRow
                                                    key={track.id}
                                                    track={track}
                                                    index={index}
                                                    onChange={updateTrack}
                                                    onRemove={removeTrack}
                                                    canRemove={albumTracks.length > 1}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>

                                    {status === 'error' && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-red-500/10 border border-red-500/30 flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest">
                                                <AlertCircle size={14} /> ERROR // Album_Upload_Failed
                                            </div>
                                            {errorDetails && <div className="text-[8px] mono text-red-500/70 uppercase">{typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : String(errorDetails)}</div>}
                                        </motion.div>
                                    )}

                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={onClose} className="flex-1 px-8 py-4 hud-panel border-white/10 text-white/30 font-black uppercase text-[10px] tracking-[0.3em] hover:text-[#ff006e] hover:border-[#ff006e]/30 transition-all outline-none rounded-sm">ABORT_INIT</button>
                                        <button type="submit" disabled={uploading} className={`flex-[2] py-4 border border-[#ff006e] bg-[#ff006e]/20 text-[#ff006e] font-black uppercase text-[10px] tracking-[0.2em] relative overflow-hidden group active:scale-95 transition-all shadow-[0_0_30px_#ff006e10] ${uploading ? 'opacity-50' : 'hover:bg-[#ff006e] hover:text-black hover:shadow-[0_0_50px_#ff006e40]'}`}>
                                            {uploading ? <div className="flex items-center justify-center gap-3"><div className="w-2 h-2 bg-black animate-ping" /> TRANSMITTING...</div> : 'INIT_UPLOAD'}
                                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default UploadTrackView;
