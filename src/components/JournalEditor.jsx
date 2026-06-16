import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import mammoth from 'mammoth/mammoth.browser';
import { 
    X, Bold, Italic, Heading, Quote, List, ListOrdered, 
    Image as ImageIcon, Upload, FileText, Check, AlertCircle, Save 
} from 'lucide-react';
import API from '../services/api';
import { getMediaUrl } from '../constants';

const CustomImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            class: {
                default: 'max-w-full h-auto mx-auto my-4 border border-[var(--text-color)]/20 shadow-lg rounded'
            }
        };
    }
});

export default function JournalEditor({ entry, seriesList, onSave, onClose }) {
    const [title, setTitle] = useState(entry?.title || '');
    const [selectedSeriesId, setSelectedSeriesId] = useState(entry?.seriesId || '');
    const [chapterNumber, setChapterNumber] = useState(entry?.chapterNumber || '');
    const [isPosted, setIsPosted] = useState(entry ? entry.isPosted : true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3, 4]
                }
            }),
            CustomImage,
            Placeholder.configure({
                placeholder: 'BEGIN_ENCODING_CREATIVE_FLOW...',
                emptyEditorClass: 'is-editor-empty'
            }),
            CharacterCount
        ],
        content: entry?.contentFormat === 'html' ? entry.content : (entry?.content ? `<p>${entry.content.replace(/\n/g, '<br />')}</p>` : ''),
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] text-[12px] mono leading-relaxed tracking-wide text-white/80 p-4 bg-black/40 border border-white/5 focus:border-[var(--text-color)]/30 rounded transition-all outline-none overflow-y-auto'
            }
        }
    });

    // Handle inline image upload
    const handleImageUpload = async (file) => {
        if (!file) return;
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await API.Files.upload(formData);
            if (res?.data?.path) {
                const url = getMediaUrl(res.data.path);
                editor.chain().focus().setImage({ src: url }).run();
            }
        } catch (err) {
            console.error('Failed to upload image', err);
            setError('IMAGE_UPLOAD_FAILED: Check file format/size');
        }
    };

    // Handle .txt and .docx file import
    const handleFileImport = async (file) => {
        if (!file) return;
        const extension = file.name.split('.').pop().toLowerCase();
        
        try {
            if (extension === 'txt') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target.result;
                    const formattedHtml = text
                        .split('\n')
                        .map(para => para.trim() ? `<p>${para}</p>` : '')
                        .join('');
                    editor.commands.setContent(formattedHtml);
                    // Autofill title if empty
                    if (!title) {
                        const fileNameNoExt = file.name.replace(/\.[^/.]+$/, "");
                        setTitle(fileNameNoExt.toUpperCase());
                    }
                };
                reader.readAsText(file);
            } else if (extension === 'docx') {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const arrayBuffer = e.target.result;
                    const result = await mammoth.convertToHtml({ arrayBuffer });
                    editor.commands.setContent(result.value);
                    if (!title) {
                        const fileNameNoExt = file.name.replace(/\.[^/.]+$/, "");
                        setTitle(fileNameNoExt.toUpperCase());
                    }
                };
                reader.readAsArrayBuffer(file);
            } else {
                setError('UNSUPPORTED_FORMAT: Only .txt and .docx files are supported.');
            }
        } catch (err) {
            console.error('File import error', err);
            setError('FILE_IMPORT_ERROR: Failed to process document.');
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragOver(false);
        setError(null);
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const file = files[0];
        const ext = file.name.split('.').pop().toLowerCase();

        if (['txt', 'docx'].includes(ext)) {
            await handleFileImport(file);
        } else if (file.type.startsWith('image/')) {
            await handleImageUpload(file);
        } else {
            setError('INVALID_DROP_ITEM: Drop .txt/.docx files or image files only.');
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            setError('VALIDATION_ERROR: Title is required.');
            return;
        }

        setIsSaving(true);
        setError(null);

        const payload = {
            id: entry?.id || 0,
            title: title.trim(),
            content: editor.getHTML(),
            contentFormat: 'html',
            isPosted: isPosted,
            isPinned: entry?.isPinned || false,
            seriesId: selectedSeriesId ? parseInt(selectedSeriesId) : null,
            chapterNumber: (selectedSeriesId && chapterNumber) ? parseInt(chapterNumber) : null
        };

        try {
            let savedEntry;
            if (entry?.id) {
                const res = await API.Journal.update(entry.id, payload);
                savedEntry = res.data;
            } else {
                const res = await API.Journal.create(payload);
                savedEntry = res.data;
            }
            onSave(savedEntry);
        } catch (err) {
            console.error('Failed to save journal entry', err);
            setError('SAVE_FAILED: Network/Server error.');
        } finally {
            setIsSaving(false);
        }
    };

    const wordCount = editor?.storage?.characterCount?.words() || 0;

    return (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col justify-start overflow-y-auto p-4 md:p-6 select-text">
            <div 
                className={`max-w-4xl w-full mx-auto bg-black border ${
                    isDragOver ? 'border-[var(--text-color)]' : 'border-[var(--text-color)]/20'
                } rounded p-6 space-y-6 flex flex-col relative transition-all duration-300`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag-drop Overlay indicator */}
                {isDragOver && (
                    <div className="absolute inset-0 bg-[var(--text-color)]/5 flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-[var(--text-color)]/50 z-50">
                        <Upload className="w-12 h-12 text-[var(--text-color)] animate-bounce mb-2" />
                        <span className="mono text-[11px] text-[var(--text-color)] uppercase tracking-widest font-black">
                            DROP_FILE_OR_IMAGE_HERE
                        </span>
                    </div>
                )}

                {/* Header */}
                <div className="flex justify-between items-center border-b border-[var(--text-color)]/10 pb-4">
                    <div>
                        <h3 className="mono text-[12px] font-black text-[var(--text-color)] uppercase tracking-[0.3em]">
                            {entry ? 'EDIT_LOG_ENTRY' : 'INIT_LOG_ENTRY'}
                        </h3>
                        <p className="mono text-[9px] text-white/40 mt-1 uppercase tracking-wider">
                            longform writing console v1.0.0
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

                {/* Inputs & Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Title */}
                    <div className="md:col-span-2 space-y-1">
                        <label className="mono text-[8px] text-white/40 uppercase tracking-widest">log_title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="ENTER_LOG_TITLE..."
                            className="w-full bg-black/40 border border-white/5 p-3 text-[11px] text-white mono outline-none focus:border-[var(--text-color)]/40 transition-all tracking-wider"
                        />
                    </div>

                    {/* Series Choice */}
                    <div className="space-y-1">
                        <label className="mono text-[8px] text-white/40 uppercase tracking-widest">link_to_series</label>
                        <select
                            value={selectedSeriesId}
                            onChange={(e) => setSelectedSeriesId(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 p-3 text-[11px] text-white mono outline-none focus:border-[var(--text-color)]/40 transition-all"
                        >
                            <option value="">[ STANDALONE_ENTRY ]</option>
                            {seriesList?.map(s => (
                                <option key={s.id} value={s.id}>{s.title.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Chapter Number */}
                    {selectedSeriesId && (
                        <div className="space-y-1 animate-fade-in">
                            <label className="mono text-[8px] text-white/40 uppercase tracking-widest">chapter_number</label>
                            <input
                                type="number"
                                min="1"
                                value={chapterNumber}
                                onChange={(e) => setChapterNumber(e.target.value)}
                                placeholder="CH_NO..."
                                className="w-full bg-black/40 border border-white/5 p-3 text-[11px] text-white mono outline-none focus:border-[var(--text-color)]/40 transition-all"
                            />
                        </div>
                    )}

                    {/* Import tools */}
                    <div className="md:col-span-2 flex items-center gap-4 py-2 border border-white/5 bg-black/20 px-3 rounded">
                        <span className="mono text-[8px] text-white/40 uppercase tracking-wider">import_document:</span>
                        <label className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded cursor-pointer text-[9px] mono text-white/80 transition-all">
                            <FileText size={12} />
                            <span>CHOOSE_FILE (.TXT/.DOCX)</span>
                            <input 
                                type="file" 
                                accept=".txt,.docx"
                                onChange={(e) => handleFileImport(e.target.files[0])}
                                className="hidden" 
                            />
                        </label>
                    </div>
                </div>

                {/* Formatting Toolbar */}
                {editor && (
                    <div className="flex flex-wrap items-center gap-1 bg-black/50 border border-white/5 p-1 rounded">
                        <button
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            disabled={!editor.can().chain().focus().toggleBold().run()}
                            className={`p-2 rounded hover:bg-white/5 transition-all ${editor.isActive('bold') ? 'text-[var(--text-color)] bg-[var(--text-color)]/5' : 'text-white/60'}`}
                            title="Bold"
                        >
                            <Bold size={14} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            disabled={!editor.can().chain().focus().toggleItalic().run()}
                            className={`p-2 rounded hover:bg-white/5 transition-all ${editor.isActive('italic') ? 'text-[var(--text-color)] bg-[var(--text-color)]/5' : 'text-white/60'}`}
                            title="Italic"
                        >
                            <Italic size={14} />
                        </button>
                        <div className="h-4 w-[1px] bg-white/10 mx-1" />
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            className={`p-2 rounded hover:bg-white/5 transition-all ${editor.isActive('heading', { level: 2 }) ? 'text-[var(--text-color)] bg-[var(--text-color)]/5' : 'text-white/60'}`}
                            title="Heading 2"
                        >
                            <Heading size={14} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            className={`p-2 rounded hover:bg-white/5 transition-all ${editor.isActive('bulletList') ? 'text-[var(--text-color)] bg-[var(--text-color)]/5' : 'text-white/60'}`}
                            title="Bullet List"
                        >
                            <List size={14} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            className={`p-2 rounded hover:bg-white/5 transition-all ${editor.isActive('orderedList') ? 'text-[var(--text-color)] bg-[var(--text-color)]/5' : 'text-white/60'}`}
                            title="Numbered List"
                        >
                            <ListOrdered size={14} />
                        </button>
                        <button
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            className={`p-2 rounded hover:bg-white/5 transition-all ${editor.isActive('blockquote') ? 'text-[var(--text-color)] bg-[var(--text-color)]/5' : 'text-white/60'}`}
                            title="Blockquote"
                        >
                            <Quote size={14} />
                        </button>
                        <div className="h-4 w-[1px] bg-white/10 mx-1" />
                        <label className="p-2 rounded hover:bg-white/5 transition-all text-white/60 cursor-pointer flex items-center" title="Insert Image">
                            <ImageIcon size={14} />
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e.target.files[0])}
                                className="hidden" 
                            />
                        </label>
                    </div>
                )}

                {/* Editor Content Area */}
                <div className="relative">
                    <EditorContent editor={editor} />
                </div>

                {/* Bottom Controls */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 pt-4 border-t border-white/5">
                    {/* Stats */}
                    <div className="flex items-center gap-6 mono text-[9px] text-white/40">
                        <span>WORDS: {wordCount}</span>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                                type="checkbox"
                                checked={isPosted}
                                onChange={(e) => setIsPosted(e.target.checked)}
                                className="accent-[var(--text-color)]"
                            />
                            <span>PUBLISH_TO_FEED</span>
                        </label>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-white/15 text-white/60 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all rounded mono"
                        >
                            [ CANCEL ]
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-8 py-2 bg-[var(--text-color)]/10 border border-[var(--text-color)]/40 text-[var(--text-color)] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-[var(--text-color)] hover:text-black disabled:opacity-40 transition-all rounded mono flex items-center gap-2"
                        >
                            {isSaving ? 'SAVING...' : '[ COMMIT_LOG_TO_ARCHIVE ]'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
