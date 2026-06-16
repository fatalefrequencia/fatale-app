import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Clock } from 'lucide-react';
import API from '../services/api';

export default function ChapterReader({ entry, onNavigateToEntry }) {
    const [seriesDetails, setSeriesDetails] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [wordCount, setWordCount] = useState(0);

    useEffect(() => {
        if (entry?.seriesId) {
            fetchSeriesDetails(entry.seriesId);
        } else {
            setSeriesDetails(null);
            setChapters([]);
            setCurrentIndex(-1);
        }
        
        // Calculate word count
        if (entry?.content) {
            // Strip HTML tags for character/word count
            const text = entry.content.replace(/<[^>]*>/g, ' ');
            const words = text.trim().split(/\s+/).filter(w => w.length > 0);
            setWordCount(words.length);
        } else {
            setWordCount(0);
        }
    }, [entry]);

    const fetchSeriesDetails = async (seriesId) => {
        try {
            const res = await API.JournalSeries.getDetails(seriesId);
            setSeriesDetails(res.data);
            const entryList = res.data?.entries || [];
            setChapters(entryList);
            
            // Find current entry index in the sorted series entries
            const idx = entryList.findIndex(e => e.id === entry.id);
            setCurrentIndex(idx);
        } catch (err) {
            console.error('Failed to load series details in reader', err);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            onNavigateToEntry(chapters[currentIndex - 1]);
        }
    };

    const handleNext = () => {
        if (currentIndex !== -1 && currentIndex < chapters.length - 1) {
            onNavigateToEntry(chapters[currentIndex + 1]);
        }
    };

    const readTime = Math.ceil(wordCount / 200); // Avg reading speed: 200 words per minute

    return (
        <div className="border border-white/5 bg-black/60 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4 select-text">
            {/* Series title & details */}
            <div className="flex items-center gap-3">
                <BookOpen size={16} className="text-[var(--text-color)]/70" />
                <div className="mono text-left">
                    {seriesDetails ? (
                        <>
                            <div className="text-[8px] text-[var(--text-color)]/60 uppercase tracking-widest">
                                SERIES: {seriesDetails.title.toUpperCase()}
                            </div>
                            <div className="text-[10px] font-bold text-white uppercase mt-0.5 tracking-wider">
                                {entry.chapterNumber ? `CHAPTER_${entry.chapterNumber}` : 'UNNUMBERED'}
                                {currentIndex !== -1 && ` / ${chapters.length}`}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-[8px] text-white/30 uppercase tracking-widest">STANDALONE_POST</div>
                            <div className="text-[10px] text-white/70 uppercase tracking-wider">CREATIVE_LOG</div>
                        </>
                    )}
                </div>
            </div>

            {/* Reading details */}
            <div className="flex items-center gap-2 mono text-[9px] text-white/40">
                <Clock size={12} />
                <span>{wordCount} WORDS ({readTime} MIN READ)</span>
            </div>

            {/* Navigation buttons */}
            {seriesDetails && chapters.length > 1 && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex <= 0}
                        className="p-1.5 border border-white/10 hover:border-white/20 bg-black/40 hover:bg-black/60 rounded text-white disabled:opacity-20 disabled:pointer-events-none transition-all flex items-center gap-1 mono text-[9px] uppercase tracking-wider"
                    >
                        <ChevronLeft size={14} /> PREV
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={currentIndex === -1 || currentIndex >= chapters.length - 1}
                        className="p-1.5 border border-white/10 hover:border-white/20 bg-black/40 hover:bg-black/60 rounded text-white disabled:opacity-20 disabled:pointer-events-none transition-all flex items-center gap-1 mono text-[9px] uppercase tracking-wider"
                    >
                        NEXT <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
