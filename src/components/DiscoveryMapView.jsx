import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Play, Target, RefreshCw } from 'lucide-react';
import API from '../services/api';

const BASE_API_URL = 'http://localhost:5264';
const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${BASE_API_URL}${path}`;
};


const DiscoveryMapView = ({ onPlayPlaylist, allTracks }) => {
    const [mapItems, setMapItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tracksRes, albumsRes, artistsRes] = await Promise.all([
                API.Tracks.getAllTracks(),
                API.Albums.getAll(),
                API.Artists.getAll()
            ]);

            const tracks = tracksRes.data || [];
            const albums = albumsRes.data || [];
            const artists = artistsRes.data || [];

            // -- COLLISION LIST --
            const placedItems = [];
            const MIN_DISTANCE = 280; // Tighter packing

            const generateNonOverlappingPosition = (maxRetries = 50) => {
                let x, y, valid;
                const boundsX = 2000;
                const boundsY = 1000;

                for (let i = 0; i < maxRetries; i++) {
                    x = Math.floor(Math.random() * boundsX) - (boundsX / 2);
                    y = Math.floor(Math.random() * boundsY) - (boundsY / 2);
                    valid = true;

                    for (const item of placedItems) {
                        const dist = Math.sqrt(Math.pow(x - item.x, 2) + Math.pow(y - item.y, 2));
                        if (dist < MIN_DISTANCE) {
                            valid = false;
                            break;
                        }
                    }

                    if (valid) return { x, y };
                }
                // Fallback if super crowded
                return {
                    x: Math.floor(Math.random() * boundsX) - (boundsX / 2),
                    y: Math.floor(Math.random() * boundsY) - (boundsY / 2)
                };
            };

            const processItem = (item, type, idPrefix) => {
                const pos = generateNonOverlappingPosition();
                const newItem = {
                    id: item.id, // Original ID
                    displayId: `${idPrefix}-${item.id}`,
                    title: item.title || item.name,
                    category: type,
                    img: type === 'Track'
                        ? (getMediaUrl(item.coverImageUrl) || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80')
                        : type === 'Album'
                            ? (getMediaUrl(item.coverImageUrl) || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80')
                            : (getMediaUrl(item.imageUrl) || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80'),
                    x: pos.x,
                    y: pos.y
                };
                placedItems.push(newItem);
                return newItem;
            };

            const newItems = [
                ...artists.map(a => processItem(a, 'Artist', 'artist')),
                ...albums.map(a => processItem(a, 'Album', 'album')),
                ...tracks.map(t => processItem(t, 'Track', 'track'))
            ];

            setMapItems(newItems);
        } catch (error) {
            console.error("Error fetching discovery data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePlayClick = (e, item) => {
        e.stopPropagation(); // Stop drag or other events

        if (!onPlayPlaylist || !allTracks || allTracks.length === 0) return;

        console.log("Play Clicked:", item.category, item.title);

        if (item.category === 'Track') {
            onPlayPlaylist([allTracks.find(t => t.id === item.id) || allTracks[0]], 0);
        }
        else if (item.category === 'Album') {
            const albumTracks = allTracks.filter(t => t.albumId === item.id);
            if (albumTracks.length > 0) {
                onPlayPlaylist(albumTracks, 0);
            }
        }
        else if (item.category === 'Artist') {
            const artistTracks = allTracks.filter(t => t.artistId === item.id);
            if (artistTracks.length > 0) {
                onPlayPlaylist(artistTracks, 0);
            }
        }
    };

    return (
        <div className="w-full h-full bg-[#020202] overflow-hidden relative isolate">
            {/* HUD de búsqueda flotante */}
            <div className="absolute top-6 left-6 z-[100] flex items-center gap-4 pointer-events-none">
                <div className="bg-black/80 backdrop-blur-xl border border-[#ff006e]/20 p-4 rounded-full flex items-center gap-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] pointer-events-auto">
                    <Search className="text-[#ff006e]" size={20} />
                    <input
                        type="text"
                        placeholder="Explorar sonidos..."
                        className="bg-transparent border-none outline-none text-white text-sm w-32 md:w-64 font-bold italic"
                    />
                </div>
                <button
                    onClick={fetchData}
                    className="bg-black/80 backdrop-blur-xl border border-[#ff006e]/20 p-4 rounded-full text-[#ff006e] hover:bg-[#ff006e] hover:text-black transition-all pointer-events-auto shadow-[0_0_20px_rgba(255,0,110,0.2)]"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Contenedor del Mapa Draggable */}
            <motion.div
                drag
                dragConstraints={{ left: -10000, right: 10000, top: -10000, bottom: 10000 }} // Infinite feel
                className="absolute w-[10000px] h-[10000px] cursor-grab active:cursor-grabbing z-0"
                initial={{ x: -5000 + window.innerWidth / 2, y: -5000 + window.innerHeight / 2 }}
            >
                {/* Grid de fondo */}
                <div className="absolute inset-0 bg-[radial-gradient(#ff006e08_1px,transparent_1px)] bg-[size:60px_60px]" />

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[200]">
                        <div className="text-[#ff006e] font-black tracking-widest animate-pulse">LOADING_SYSTEM_DATA...</div>
                    </div>
                )}

                {mapItems.map((item) => (
                    <motion.div
                        key={item.displayId}
                        style={{ x: item.x, y: item.y }}
                        className={`absolute left-1/2 top-1/2 rounded-xl overflow-hidden border border-white/5 bg-[#0a0a0a] shadow-2xl group w-60 h-60 cursor-pointer z-10 hover:z-50 hover:border-[#ff006e] transition-all`}
                        whileHover={{ scale: 1.1 }}
                    >
                        {/* Cover Art Background */}
                        <div className="absolute inset-0 z-0">
                            <img src={item.img} alt={item.title} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        </div>

                        {/* Content Overlay */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-end z-10 pointer-events-none">
                            <div className="text-[8px] font-black uppercase tracking-[0.4em] text-[#ff006e] mb-1 opacity-70 italic">{item.category}</div>
                            <h3 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-lg break-words">{item.title}</h3>
                        </div>

                        {/* Play Button - NOW FOR ALL TYPES */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <div
                                onClick={(e) => handlePlayClick(e, item)}
                                className="w-14 h-14 bg-[#ff006e] rounded-full flex items-center justify-center shadow-[0_0_30px_#ff006e] scale-75 group-hover:scale-100 transition-transform cursor-pointer pointer-events-auto hover:bg-white"
                            >
                                <Play size={24} fill="black" className="ml-1 text-black" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Footer del Mapa */}
            <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/5 text-[9px] font-black uppercase tracking-widest text-[#ff006e]/50 pointer-events-none z-[100]">
                <Target size={14} /> MAP_EXPLORER_V2
            </div>
        </div>
    );
};

export default DiscoveryMapView;
