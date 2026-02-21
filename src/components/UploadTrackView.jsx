import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Music, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import API from '../services/api';

const UploadTrackView = ({ onClose, onRefreshTracks }) => {
    const [formData, setFormData] = useState({
        title: '',
        genre: '',
        audioFile: null,
        coverFile: null
    });
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, success, error
    const [errorDetails, setErrorDetails] = useState(null);

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, [type]: file }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.audioFile) return;

        setUploading(true);
        setStatus('idle');

        try {
            const data = new FormData();
            data.append('TrackTitle', formData.title);
            // Workaround: Backend [Required] attribute might still be active if server didn't restart.
            // Sending 'Unknown' satisfies the validation.
            data.append('Genre', formData.genre || 'Unknown');
            data.append('Price', formData.price || 0);
            data.append('IsLocked', formData.isLocked || false);
            data.append('AudioFile', formData.audioFile);
            if (formData.coverFile) {
                data.append('CoverImage', formData.coverFile);
            }

            await API.Tracks.uploadTrack(data);
            setStatus('success');
            if (onRefreshTracks) await onRefreshTracks();
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (error) {
            console.error("DETALLE TÉCNICO:", error.response);
            setErrorDetails(error.response?.data || error.message);
            setStatus('error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
        >
            <div className="w-full max-w-md bg-[#0a0a0a] border border-[#ff006e]/30 rounded-sm p-8 relative shadow-[0_0_50px_rgba(255,0,110,0.1)]">

                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-8 flex items-center gap-3 font-mono">
                    <Upload size={24} className="text-[#ff006e]" /> Upload Frequency
                </h2>

                {status === 'success' ? (
                    <div className="text-center py-12 space-y-4">
                        <CheckCircle size={64} className="text-green-500 mx-auto animate-bounce" />
                        <p className="text-white font-bold uppercase tracking-widest">Upload Complete</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#ff006e] uppercase tracking-widest">Track Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:border-[#ff006e] outline-none transition-colors"
                                placeholder="Enter track name..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#ff006e] uppercase tracking-widest">Genre (Optional)</label>
                            <input
                                type="text"
                                value={formData.genre}
                                onChange={e => setFormData({ ...formData, genre: e.target.value })}
                                className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:border-[#ff006e] outline-none transition-colors"
                                placeholder="e.g. Cyberpunk, Phonk..."
                            />
                        </div>

                        {/* Economy Settings */}
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-[#ff006e] uppercase tracking-widest">Price (CRD)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.price || 0}
                                    onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-[#111] border border-[#333] rounded-lg p-3 text-white focus:border-[#ff006e] outline-none transition-colors"
                                />
                            </div>
                            <div className="flex items-end pb-3">
                                <div
                                    onClick={() => setFormData({ ...formData, isLocked: !formData.isLocked })}
                                    className={`flex items-center gap-2 cursor-pointer border px-3 py-2 rounded-lg transition-colors ${formData.isLocked ? 'border-[#ff006e] bg-[#ff006e]/10' : 'border-[#333] hover:border-[#ff006e]/50'}`}
                                >
                                    <div className={`w-4 h-4 border ${formData.isLocked ? 'bg-[#ff006e] border-[#ff006e]' : 'border-[#666]'} flex items-center justify-center`}>
                                        {formData.isLocked && <div className="w-2 h-2 bg-black" />}
                                    </div>
                                    <span className="text-[10px] font-bold text-white uppercase">Encrypt / Lock</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${formData.audioFile ? 'border-green-500/50 bg-green-500/10' : 'border-[#333] hover:border-[#ff006e]/50 hover:bg-[#ff006e]/5'}`}>
                                <input type="file" accept="audio/*" onChange={e => handleFileChange(e, 'audioFile')} className="hidden" id="audio-upload" />
                                <label htmlFor="audio-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                                    <Music size={24} className={formData.audioFile ? 'text-green-500' : 'text-[#ff006e]'} />
                                    <span className="text-[9px] font-bold text-white/50 uppercase mt-2 text-center">{formData.audioFile ? 'Audio Selected' : 'Select Audio'}</span>
                                </label>
                            </div>

                            <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${formData.coverFile ? 'border-green-500/50 bg-green-500/10' : 'border-[#333] hover:border-[#ff006e]/50 hover:bg-[#ff006e]/5'}`}>
                                <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'coverFile')} className="hidden" id="cover-upload" />
                                <label htmlFor="cover-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                                    <ImageIcon size={24} className={formData.coverFile ? 'text-green-500' : 'text-[#ff006e]'} />
                                    <span className="text-[9px] font-bold text-white/50 uppercase mt-2 text-center">{formData.coverFile ? 'Cover Selected' : 'Select Cover'}</span>
                                </label>
                            </div>
                        </div>

                        {status === 'error' && (
                            <div className="space-y-2 text-red-500 text-xs font-bold uppercase animate-pulse">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={14} /> Upload Failed.
                                </div>
                                {errorDetails && (
                                    <pre className="text-[10px] bg-red-900/20 p-2 rounded overflow-x-auto whitespace-pre-wrap font-mono">
                                        {typeof errorDetails === 'object' ? JSON.stringify(errorDetails, null, 2) : String(errorDetails)}
                                    </pre>
                                )}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-black text-white/40 font-black py-4 rounded-lg uppercase tracking-widest border border-white/5 hover:border-white/20 transition-all"
                            >
                                [ ABORT ]
                            </button>
                            <button
                                type="submit"
                                disabled={uploading}
                                className={`flex-[2] bg-[#ff006e] text-black font-black py-4 rounded-lg uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_#ff006e50] ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {uploading ? 'Transmitting...' : 'Upload to Core'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </motion.div>
    );
};

export default UploadTrackView;
