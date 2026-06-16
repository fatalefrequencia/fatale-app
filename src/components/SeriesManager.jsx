import React, { useState, useEffect } from 'react';
import { 
    Plus, Trash2, Edit2, BookOpen, Upload, X, Save, AlertCircle, Loader2 
} from 'lucide-react';
import API from '../services/api';
import { getMediaUrl } from '../constants';

export default function SeriesManager({ onClose, onUpdate }) {
    const [seriesList, setSeriesList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [isEditing, setIsEditing] = useState(false); // false (list), 'create', or seriesId (number)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('NOVEL');
    const [coverImage, setCoverImage] = useState('');
    const [uploadingCover, setUploadingCover] = useState(false);

    useEffect(() => {
        loadSeries();
    }, []);

    const loadSeries = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await API.JournalSeries.getMySeries();
            setSeriesList(res.data || []);
        } catch (err) {
            console.error('Failed to load series', err);
            setError('FAILED_TO_LOAD_SERIES: Server error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCoverUpload = async (file) => {
        if (!file) return;
        setUploadingCover(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await API.Files.upload(formData);
            if (res?.data?.path) {
                setCoverImage(res.data.path);
            }
        } catch (err) {
            console.error('Failed to upload cover image', err);
            setError('COVER_UPLOAD_FAILED: Check file size/type');
        } finally {
            setUploadingCover(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        if (!title.trim()) {
            setError('VALIDATION_ERROR: Title is required');
            return;
        }

        setIsSaving(true);
        setError(null);
        const payload = {
            id: typeof isEditing === 'number' ? isEditing : 0,
            title: title.trim(),
            description: description.trim(),
            type: type,
            coverImagePath: coverImage
        };

        try {
            if (typeof isEditing === 'number') {
                await API.JournalSeries.update(isEditing, payload);
            } else {
                await API.JournalSeries.create(payload);
            }
            // Reset state
            setIsEditing(false);
            setTitle('');
            setDescription('');
            setType('NOVEL');
            setCoverImage('');
            // Reload
            await loadSeries();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Failed to save series', err);
            setError('SAVE_FAILED: Network/Server error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditStart = (series) => {
        setIsEditing(series.id);
        setTitle(series.title);
        setDescription(series.description);
        setType(series.type || 'NOVEL');
        setCoverImage(series.coverImagePath || '');
    };

    const handleDeleteSeries = async (id) => {
        if (!window.confirm('WARNING: Deleting this series will unlink all chapters. Chapters will NOT be deleted, but will become standalone journal entries. Proceed?')) {
            return;
        }

        setError(null);
        try {
            await API.JournalSeries.delete(id);
            await loadSeries();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Failed to delete series', err);
            setError('DELETE_FAILED: Server error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col justify-start overflow-y-auto p-4 md:p-6 select-text">
            <div className="max-w-3xl w-full mx-auto bg-black border border-[var(--text-color)]/20 rounded p-6 space-y-6 flex flex-col relative">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-[var(--text-color)]/10 pb-4">
                    <div>
                        <h3 className="mono text-[12px] font-black text-[var(--text-color)] uppercase tracking-[0.3em]">
                            SERIES_PROTOCOL_MANAGER
                        </h3>
                        <p className="mono text-[9px] text-white/40 mt-1 uppercase tracking-wider">
                            manage book series, novels, and collections
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-white/5 border border-transparent hover:border-white/10 rounded transition-all text-white/50 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-950/40 border border-red-500/30 p-3 rounded flex items-center gap-3 text-red-400 text-[10px] mono">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Loader */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--text-color)] mono text-[10px]">
                        <Loader2 className="animate-spin w-8 h-8 mb-2" />
                        <span>FETCHING_SERIES_METADATA...</span>
                    </div>
                )}

                {/* Main panel */}
                {!isLoading && (
                    <>
                        {isEditing === false ? (
                            /* LIST VIEW */
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="mono text-[10px] text-white/40 uppercase tracking-wider">
                                        ACTIVE_SERIES: {seriesList.length}
                                    </span>
                                    <button
                                        onClick={() => setIsEditing('create')}
                                        className="px-4 py-2 bg-[var(--text-color)]/10 border border-[var(--text-color)]/30 text-[var(--text-color)] text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[var(--text-color)] hover:text-black transition-all rounded mono flex items-center gap-2"
                                    >
                                        <Plus size={12} />
                                        <span>CREATE_NEW_SERIES</span>
                                    </button>
                                </div>

                                {seriesList.length === 0 ? (
                                    <div className="border border-dashed border-white/5 py-12 text-center text-white/30 mono text-[10px] uppercase tracking-widest">
                                        [ NO_SERIES_DEFINED ]
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {seriesList.map(series => (
                                            <div 
                                                key={series.id} 
                                                className="border border-white/5 bg-black/40 p-4 rounded flex gap-4 hover:border-[var(--text-color)]/20 transition-all group"
                                            >
                                                {/* Cover */}
                                                <div className="w-16 h-24 bg-white/5 border border-white/10 shrink-0 relative overflow-hidden flex items-center justify-center">
                                                    {series.coverImagePath ? (
                                                        <img 
                                                            src={getMediaUrl(series.coverImagePath)} 
                                                            alt="" 
                                                            className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all" 
                                                        />
                                                    ) : (
                                                        <BookOpen size={20} className="text-white/20" />
                                                    )}
                                                </div>

                                                {/* Text detail */}
                                                <div className="flex flex-col justify-between flex-1 min-w-0">
                                                    <div className="space-y-1">
                                                        <span className="mono text-[8px] bg-[var(--text-color)]/10 border border-[var(--text-color)]/20 px-2 py-0.5 rounded text-[var(--text-color)]">
                                                            {series.type}
                                                        </span>
                                                        <h4 className="mono text-[11px] font-bold text-white truncate mt-1">
                                                            {series.title.toUpperCase()}
                                                        </h4>
                                                        <p className="mono text-[9px] text-white/50 line-clamp-2 leading-relaxed">
                                                            {series.description || 'No description provided.'}
                                                        </p>
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="flex gap-4 pt-2 border-t border-white/5 mt-2">
                                                        <button
                                                            onClick={() => handleEditStart(series)}
                                                            className="mono text-[8px] text-white/40 hover:text-[var(--text-color)] flex items-center gap-1 transition-all"
                                                        >
                                                            <Edit2 size={10} /> EDIT
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSeries(series.id)}
                                                            className="mono text-[8px] text-red-500/50 hover:text-red-500 flex items-center gap-1 transition-all"
                                                        >
                                                            <Trash2 size={10} /> DELETE
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* CREATE/EDIT FORM */
                            <div className="space-y-6 animate-fade-in">
                                <div className="mono text-[10px] text-white/40 border-b border-white/5 pb-2 uppercase tracking-widest">
                                    {isEditing === 'create' ? 'CREATE_NEW_SERIES_FORM' : 'EDIT_SERIES_FORM'}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Cover Image Upload Column */}
                                    <div className="space-y-2 flex flex-col items-center">
                                        <label className="mono text-[8px] text-white/40 uppercase tracking-widest self-start">
                                            cover_image
                                        </label>
                                        <div className="w-32 h-44 bg-white/5 border border-white/10 rounded overflow-hidden relative flex flex-col items-center justify-center group">
                                            {coverImage ? (
                                                <>
                                                    <img 
                                                        src={getMediaUrl(coverImage)} 
                                                        alt="" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                    <button
                                                        onClick={() => setCoverImage('')}
                                                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black border border-white/10 rounded text-white"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-center p-4">
                                                    {uploadingCover ? (
                                                        <Loader2 className="animate-spin w-8 h-8 text-[var(--text-color)] mx-auto mb-1" />
                                                    ) : (
                                                        <Upload className="w-8 h-8 text-white/20 mx-auto mb-1" />
                                                    )}
                                                    <span className="mono text-[8px] text-white/30 uppercase tracking-wider block mt-1">
                                                        {uploadingCover ? 'UPLOADING...' : 'UPLOAD_COVER'}
                                                    </span>
                                                </div>
                                            )}
                                            {!coverImage && !uploadingCover && (
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={(e) => handleCoverUpload(e.target.files[0])}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Text Fields Column */}
                                    <div className="md:col-span-2 space-y-4">
                                        {/* Title */}
                                        <div className="space-y-1">
                                            <label className="mono text-[8px] text-white/40 uppercase tracking-widest">
                                                series_title
                                            </label>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="E.G. CHRONICLES OF NEON..."
                                                className="w-full bg-black/40 border border-white/5 p-3 text-[11px] text-white mono outline-none focus:border-[var(--text-color)]/40 transition-all tracking-wider"
                                            />
                                        </div>

                                        {/* Series Type */}
                                        <div className="space-y-1">
                                            <label className="mono text-[8px] text-white/40 uppercase tracking-widest">
                                                format_type
                                            </label>
                                            <select
                                                value={type}
                                                onChange={(e) => setType(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 p-3 text-[11px] text-white mono outline-none focus:border-[var(--text-color)]/40 transition-all"
                                            >
                                                <option value="NOVEL">NOVEL (BOOK)</option>
                                                <option value="COMIC">COMIC (MANGA/GRAPHIC)</option>
                                                <option value="ESSAY">ESSAY / ANTHOLOGY</option>
                                                <option value="SERIES">GENERAL SERIES</option>
                                            </select>
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-1">
                                            <label className="mono text-[8px] text-white/40 uppercase tracking-widest">
                                                description
                                            </label>
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="WRITE_DEEP_SYNOPSIS_FOR_SERIES..."
                                                className="w-full bg-black/40 border border-white/5 p-3 text-[10px] text-white mono outline-none focus:border-[var(--text-color)]/40 transition-all min-h-[80px] resize-none tracking-wide leading-relaxed"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Form Action buttons */}
                                <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setTitle('');
                                            setDescription('');
                                            setCoverImage('');
                                        }}
                                        className="px-6 py-2 border border-white/15 text-white/60 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all rounded mono"
                                    >
                                        [ CANCEL ]
                                    </button>
                                    <button
                                        onClick={handleCreateOrUpdate}
                                        disabled={isSaving}
                                        className="px-8 py-2 bg-[var(--text-color)]/10 border border-[var(--text-color)]/40 text-[var(--text-color)] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[var(--text-color)] hover:text-black disabled:opacity-40 transition-all rounded mono flex items-center gap-2"
                                    >
                                        <Save size={12} />
                                        <span>{isSaving ? 'SAVING...' : '[ SAVE_SERIES_RECORD ]'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
