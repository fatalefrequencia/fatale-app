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
            className="border border-white/5 bg-black/20 p-4 space-y-3 relative group"
        >
            {/* Track number badge */}
            <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] mono text-[#ff006e]/60 tracking-[0.3em] uppercase">// Track_{String(index + 1).padStart(2, '0')}</span>
                {canRemove && (
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        className="p-1 text-white/20 hover:text-red-500 transition-colors"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Title */}
                <input
                    type="text"
                    placeholder="enter_track_title"
                    value={track.title}
                    onChange={e => onChange(index, { title: e.target.value })}
                    className="col-span-2 bg-black/40 border border-white/10 p-3 text-white text-[10px] font-black outline-none focus:border-[#ff006e] tracking-widest transition-all"
                    required
                />
                {/* Genre */}
                <input
                    type="text"
                    placeholder="genre_"
                    value={track.genre}
                    onChange={e => onChange(index, { genre: e.target.value })}
                    className="bg-black/40 border border-white/10 p-3 text-white text-[10px] outline-none focus:border-[#ff006e]/40 tracking-widest transition-all"
                />
                {/* Price */}
                <input
                    type="number"
                    min="0"
                    placeholder="0 CRD"
                    value={track.price || ''}
                    onChange={e => onChange(index, { price: parseInt(e.target.value) || 0 })}
                    className="bg-black/40 border border-white/10 p-3 text-white text-[10px] outline-none focus:border-[#ff006e]/40 tracking-widest transition-all"
                />
            </div>

            {/* Audio file picker */}
            <div className={`relative border border-dashed p-3 flex items-center gap-3 cursor-pointer transition-all ${track.audioFile ? 'border-[#ff006e]/50 bg-[#ff006e]/5' : 'border-white/10 hover:border-[#ff006e]/30'}`}>
                <input type="file" accept="audio/*" onChange={e => handleFileChange(e, 'audioFile')} className="hidden" id={`audio-${track.id}`} />
                <label htmlFor={`audio-${track.id}`} className="flex items-center gap-3 cursor-pointer w-full">
                    <Music size={14} className={track.audioFile ? 'text-[#ff006e]' : 'text-white/20'} />
                    <span className={`text-[8px] font-black uppercase tracking-widest ${track.audioFile ? 'text-[#ff006e]' : 'text-white/40'}`}>
                        {track.audioFile ? track.audioFile.name : 'SELECT_AUDIO_FILE'}
                    </span>
                </label>
            </div>

            {/* Encryption toggle */}
            <div className="space-y-1">
                <div
                    onClick={() => onChange(index, { isLocked: !track.isLocked })}
                    className={`flex items-center justify-between p-3 border cursor-pointer transition-all ${track.isLocked ? 'bg-[#ff006e]/5 border-[#ff006e]/40' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                >
                    <div className="flex items-center gap-2">
                        {track.isLocked
                            ? <Lock size={11} className="text-[#ff006e]" />
                            : <Unlock size={11} className="text-white/30" />
                        }
                        <span className={`text-[9px] font-black uppercase tracking-widest ${track.isLocked ? 'text-[#ff006e]' : 'text-white/40'}`}>
                            TOGGLE_ENCRYPTION
                        </span>
                    </div>
                    <span className={`text-[7px] mono font-bold uppercase ${track.isLocked ? 'text-[#ff006e] animate-pulse' : 'text-white/10'}`}>
                        {track.isLocked ? 'ENCRYPTED' : 'OPEN'}
                    </span>
                </div>
                {track.isLocked && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="px-3 py-1.5 border border-dashed border-[#ff006e]/20 bg-[#ff006e]/5 flex items-start gap-2"
                    >
                        <AlertCircle size={9} className="text-[#ff006e] mt-0.5 shrink-0" />
                        <span className="text-[6px] mono text-[#ff006e]/70 uppercase leading-relaxed tracking-wider">
                            This track requires [{track.price || 0} CRD] to access.
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
                initial={{ opacity: 0, scaleY: 0, scaleX: 0.4, filter: "brightness(3) blur(10px)" }}
                animate={{ opacity: 1, scaleY: 1, scaleX: 1, filter: "brightness(1) blur(0px)" }}
                exit={{ opacity: 0, scaleY: 0, scaleX: 0.4, filter: "brightness(3) blur(10px)" }}
                transition={{
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                    opacity: { duration: 0.2 }
                }}
                style={{ originY: 0.5 }}
                className="relative w-full max-w-lg bg-[#050b18]/85 border-l border-l-[#ff006e]/10 border-r border-r-[#ff006e]/10 p-8 shadow-[0_30px_60px_rgba(0,0,0,0.6),-6px_0_15px_rgba(255,0,110,0.05),6px_0_15px_rgba(255,0,110,0.05)] backdrop-blur-2xl rounded-sm"
            >
                {/* Physical Scroll Rods - Pink Neon */}
                <div className="absolute top-[-1px] left-0 right-0 h-[2px] bg-[#ff006e] shadow-[0_2px_8px_rgba(0,0,0,0.9),0_0_12px_rgba(255,0,110,0.4)] z-[60]" />
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#ff006e] shadow-[0_-2px_8px_rgba(0,0,0,0.9),0_0_12px_rgba(255,0,110,0.4)] z-[60]" />

                {/* Holographic red light leaks (Fine-tuned) */}
                <div className="absolute -top-48 -left-48 w-96 h-96 bg-[#ff0000]/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -top-48 -right-48 w-96 h-96 bg-[#ff0000]/13 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-[#ff0000]/05 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-[#ff0000]/05 rounded-full blur-[140px] pointer-events-none" />


                {/* Clean corners (accents removed) */}

                {/* Scanline */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,110,0.03),rgba(80,0,255,0.01),rgba(255,0,110,0.03))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%]" />

                <div className="relative z-10">
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
                    <div className="flex gap-2 mb-6 border-b border-white/5 pb-4">
                        <button
                            onClick={() => { setMode('single'); setStatus('idle'); }}
                            className={`flex-1 py-2 px-4 transition-all flex items-center justify-center gap-2 mono text-[9px] font-black tracking-widest uppercase border ${mode === 'single' ? 'bg-[#ff006e]/20 border-[#ff006e] text-white shadow-[0_0_15px_rgba(255,0,110,0.3)]' : 'bg-black/40 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'}`}
                        >
                            <Music size={11} /> [ SINGLE ]
                        </button>
                        <button
                            onClick={() => { setMode('album'); setStatus('idle'); }}
                            className={`flex-1 py-2 px-4 transition-all flex items-center justify-center gap-2 mono text-[9px] font-black tracking-widest uppercase border ${mode === 'album' ? 'bg-[#ff0000]/20 border-[#ff0000] text-white shadow-[0_0_15px_rgba(255,0,0,0.3)]' : 'bg-black/40 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'}`}
                        >
                            <Upload size={11} /> [ ALBUM ]
                        </button>
                    </div>

                    {/* Success state */}
                    {status === 'success' ? (
                        <div className="text-center py-16 space-y-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 bg-[#ff006e]/10 border border-[#ff006e] rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_#ff006e40]"
                            >
                                <CheckCircle size={40} className="text-[#ff006e]" />
                            </motion.div>
                            <p className="text-xl font-black text-white italic tracking-widest uppercase">
                                {mode === 'single' ? 'Signal_Transmitted' : 'Album_Uploaded'}
                            </p>
                            <div className="text-[10px] mono text-[#ff006e]/60 uppercase tracking-widest">
                                INTEGRATING_INTO_CORE_GRID...
                            </div>
                        </div>
                    ) : (
                        <div className="max-h-[65vh] overflow-y-auto no-scrollbar pr-1">
                            {/* ─── SINGLE MODE ─────────────────────────── */}
                            {mode === 'single' && (
                                <form onSubmit={handleSingleSubmit} className="space-y-5 pb-4">
                                    <div className="space-y-2">
                                        <label className="block text-[9px] font-black text-[#ff006e]/50 uppercase tracking-[0.3em]">TRACK_ID</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-black outline-none focus:border-[#ff006e] tracking-widest transition-all"
                                            placeholder="enter_track_title"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            value={formData.genre}
                                            onChange={e => setFormData({ ...formData, genre: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-black outline-none focus:border-[#ff006e]/40 transition-all text-[10px] tracking-widest"
                                            placeholder="genre_"
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.price || 0}
                                            onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-black outline-none focus:border-[#ff006e]/40 transition-all uppercase text-[10px] tracking-widest"
                                            placeholder="0 CRD"
                                        />
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
                                        <div className={`relative border border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${formData.audioFile ? 'bg-[#ff006e]/10 border-[#ff006e]/50' : 'border-white/10 hover:border-[#ff006e]/30 hover:bg-[#ff006e]/5'}`}>
                                            <input type="file" accept="audio/*" onChange={e => { const f = e.target.files[0]; if (f) setFormData(p => ({ ...p, audioFile: f })); }} className="hidden" id="audio-upload" />
                                            <label htmlFor="audio-upload" className="flex flex-col items-center cursor-pointer text-center">
                                                <Music size={24} className={formData.audioFile ? 'text-[#ff006e]' : 'text-white/20'} />
                                                <span className={`text-[8px] font-black uppercase mt-3 tracking-widest ${formData.audioFile ? 'text-[#ff006e]' : 'text-white/40'}`}>
                                                    {formData.audioFile ? formData.audioFile.name : 'Select_Signal'}
                                                </span>
                                                <div className="text-[6px] text-white/20 mt-1">MP3 / WAV / OGG</div>
                                            </label>
                                        </div>
                                        <div className={`relative border border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${formData.coverFile ? 'bg-[#ff006e]/10 border-[#ff006e]/50' : 'border-white/10 hover:border-[#ff006e]/30 hover:bg-[#ff006e]/5'}`}>
                                            <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) setFormData(p => ({ ...p, coverFile: f })); }} className="hidden" id="cover-upload" />
                                            <label htmlFor="cover-upload" className="flex flex-col items-center cursor-pointer text-center">
                                                <ImageIcon size={24} className={formData.coverFile ? 'text-[#ff006e]' : 'text-white/20'} />
                                                <span className={`text-[8px] font-black uppercase mt-3 tracking-widest ${formData.coverFile ? 'text-[#ff006e]' : 'text-white/40'}`}>
                                                    {formData.coverFile ? formData.coverFile.name : 'Select_Visual'}
                                                </span>
                                                <div className="text-[6px] text-white/20 mt-1">JPG / PNG / WEBP</div>
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
                                    <div className="space-y-2">
                                        <label className="block text-[9px] font-black text-[#ff006e]/50 uppercase tracking-[0.3em]">Album_Title</label>
                                        <input
                                            type="text"
                                            value={albumData.title}
                                            onChange={e => setAlbumData({ ...albumData, title: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 p-4 text-white font-black outline-none focus:border-[#ff006e] tracking-widest transition-all"
                                            placeholder="enter_album_title"
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

                                    <div className="flex gap-4 pt-2">
                                        <button type="button" onClick={onClose} className="flex-1 px-8 py-4 bg-black border border-white/10 text-white/40 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white hover:border-white/30 transition-all">Abort</button>
                                        <button type="submit" disabled={uploading} className={`flex-[2] py-4 border border-[#ff0000] bg-[#ff0000]/20 text-[#ff0000] font-black uppercase text-[10px] tracking-[0.2em] relative overflow-hidden group active:scale-95 transition-all shadow-[0_0_30px_#ff000010] ${uploading ? 'opacity-50 grayscale' : 'hover:bg-[#ff0000] hover:text-black hover:shadow-[0_0_50px_#ff000040]'}`}>
                                            {uploading ? <div className="flex items-center justify-center gap-3"><div className="w-2 h-2 bg-black animate-ping" /> UPLOADING_ALBUM...</div> : 'INIT_UPLOAD'}
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
