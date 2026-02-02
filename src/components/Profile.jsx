import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Library, Send, MoreHorizontal, MessageSquare,
    BookOpen, Zap, MapPin, Calendar, ChevronDown, Frown, Upload, Settings, X, LogOut, RefreshCw, ChevronLeft, Edit3, Plus, Lock, Globe, Heart, PlayCircle, Trash2
} from 'lucide-react';
import UploadTrackView from './UploadTrackView';

// --- VISTA: PERFIL (DISEÑO SLAVA KORNILOV) ---
export const ProfileView = ({ user: currentUser, tracks: allTracks, onLogout, onAddCredits, onRefreshProfile, onRefreshTracks, targetUserId, navigateToProfile }) => {
    const [activeTab, setActiveTab] = useState('Music');
    const [studioSubTab, setStudioSubTab] = useState('All');

    // Profile Data State
    const [profileData, setProfileData] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [profileTracks, setProfileTracks] = useState([]);
    const [myLikes, setMyLikes] = useState([]);

    const [isAboutOpen, setIsAboutOpen] = useState(true);
    const [isStatsOpen, setIsStatsOpen] = useState(true);

    const [showUpload, setShowUpload] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);

    // Playlist State
    const [playlists, setPlaylists] = useState([]);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isPlaylistPublic, setIsPlaylistPublic] = useState(true);

    // Selected Playlist State
    const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
    const [playlistDetails, setPlaylistDetails] = useState(null); // { Playlist, Tracks }
    const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);

    const isMe = !targetUserId || String(targetUserId) === String(currentUser?.id || currentUser?.Id);
    const displayUser = isMe ? currentUser : profileData;

    // Fetch Playlists
    React.useEffect(() => {
        if (activeTab === 'Playlists') {
            const fetchPlaylists = async () => {
                try {
                    const API = await import('../services/api').then(mod => mod.default);
                    const targetId = isMe ? (currentUser?.id || currentUser?.Id) : targetUserId;
                    if (targetId) {
                        const res = await API.Playlists.getUserPlaylists(targetId);
                        setPlaylists(res.data || []);
                    }
                } catch (err) {
                    console.error("Failed to fetch playlists", err);
                }
            };
            fetchPlaylists();
        }
    }, [activeTab, targetUserId, currentUser, isMe]);

    const handleCreatePlaylist = async (_e) => {
        _e.preventDefault();
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Playlists.create({
                Name: newPlaylistName,
                IsPublic: isPlaylistPublic,
                Description: ''
            }); // DTO expects PascalCase keys or matching properties
            setShowCreatePlaylist(false);
            setNewPlaylistName('');
            // Refresh
            const targetId = currentUser?.id || currentUser?.Id;
            const res = await API.Playlists.getUserPlaylists(targetId);
            setPlaylists(res.data || []);
        } catch (err) {
            console.error("Failed to create playlist", err);
        }
    };

    const handleOpenPlaylist = async (playlistId) => {
        setSelectedPlaylistId(playlistId);
        setIsLoadingPlaylist(true);
        try {
            const API = await import('../services/api').then(mod => mod.default);
            const res = await API.Playlists.getById(playlistId);
            setPlaylistDetails(res.data);
        } catch (err) {
            console.error("Failed to fetch playlist details", err);
        } finally {
            setIsLoadingPlaylist(false);
        }
    };

    const handleUpdatePlaylist = async (id, data) => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Playlists.update(id, data);

            // Refresh list
            const targetId = currentUser?.id || currentUser?.Id;
            const res = await API.Playlists.getUserPlaylists(targetId);
            setPlaylists(res.data || []);

            // Refresh details if open
            if (selectedPlaylistId === id) {
                handleOpenPlaylist(id);
            }
        } catch (err) {
            console.error("Failed to update playlist", err);
        }
    };

    const handleDeletePlaylist = async (id) => {
        if (!window.confirm("Are you sure you want to delete this playlist? This cannot be undone.")) return;
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Playlists.delete(id);

            setPlaylistDetails(null);
            setSelectedPlaylistId(null);

            // Refresh list
            const targetId = currentUser?.id || currentUser?.Id;
            const res = await API.Playlists.getUserPlaylists(targetId);
            setPlaylists(res.data || []);
        } catch (err) {
            console.error("Failed to delete playlist", err);
        }
    };

    const handleUpdateProfile = async (formData) => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Users.updateProfile(formData);
            setShowEditProfile(false);
            if (onRefreshProfile) onRefreshProfile();
        } catch (err) {
            console.error("Update failed", err);
        }
    };

    // Fetch Target Profile
    React.useEffect(() => {
        const fetchTargetProfile = async () => {
            if (isMe) {
                setProfileData(null);
                return;
            }

            setIsLoadingProfile(true);
            try {
                const API = await import('../services/api').then(mod => mod.default);

                // Fetch basic user data first
                const userRes = await API.Users.getUserById(targetUserId).catch(() => ({ data: null }));
                if (userRes.data) {
                    setProfileData(userRes.data);
                }

                // Fetch My Likes to sync state
                try {
                    const lResp = await API.Likes.getMyLikes();
                    setMyLikes(Array.isArray(lResp.data) ? lResp.data : []);
                } catch (e) {
                    console.error("Failed to fetch likes", e);
                }

                // Try to resolve ArtistId if this user is an artist
                const artistRes = await API.Artists.getByUserId(targetUserId).catch(() => ({ data: null }));
                const artistId = artistRes.data?.id || artistRes.data?.Id;

                const [tracksRes, followingRes] = await Promise.all([
                    API.Tracks.getAllTracks(),
                    API.Users.getFollowing(currentUser?.id || currentUser?.Id).catch(() => ({ data: [] }))
                ]);

                // Check following status (Compare User IDs since GetFollowing returns Users)
                const following = followingRes.data || [];
                setIsFollowing(following.some(a => String(a.id || a.Id) === String(targetUserId)));

                const tracks = tracksRes.data || [];

                const filtered = tracks.filter(t => {
                    const tUserId = t.artistUserId || t.ArtistUserId ||
                        t.album?.artist?.userId || t.Album?.Artist?.UserId ||
                        t.album?.Artist?.UserId || t.Album?.artist?.userId; // Combinations

                    return String(tUserId) === String(targetUserId);
                }).map(t => ({
                    ...t,
                    id: t.id || t.Id,
                    cover: t.coverImageUrl || t.CoverImageUrl ? (t.coverImageUrl || t.CoverImageUrl).startsWith('http') ? (t.coverImageUrl || t.CoverImageUrl) : `http://localhost:5264${t.coverImageUrl || t.CoverImageUrl}` : null
                }));
                setProfileTracks(filtered);

            } catch (err) {
                console.error("Failed to fetch target profile", err);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchTargetProfile();
    }, [targetUserId, isMe, currentUser]);


    const handleFollow = async () => {
        try {
            const API = await import('../services/api').then(mod => mod.default);

            // Always use targetUserId. The backend handles resolution and lazy creation of artist profile.
            await API.Artists.likeArtist(targetUserId);
            setIsFollowing(!isFollowing);

            if (onRefreshProfile) onRefreshProfile();
        } catch (err) {
            console.error("Follow action failed", err);
        }
    };


    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-h-screen bg-[#020202]">
            {/* Sección Hero con Imagen Grande */}
            <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden">
                <div className="absolute inset-0 bg-[#0a0a0a]">
                    <div className="w-full h-full bg-gradient-to-t from-[#020202] via-transparent to-transparent z-10 absolute" />
                    {/* Background Image if available, otherwise text */}
                    {displayUser?.profileImageUrl ? (
                        <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url(${displayUser.profileImageUrl.startsWith('http') ? displayUser.profileImageUrl : `http://localhost:5264${displayUser.profileImageUrl}`})` }} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20 italic font-black text-[18vw] text-[#ff006e] tracking-tighter select-none uppercase">
                            {displayUser?.username || 'SYSTEM'}
                        </div>
                    )}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                </div>

                {/* Botones Flotantes Superiores */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
                    <button onClick={() => navigateToProfile(null)} className="p-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/5 text-white hover:bg-[#ff006e]/20 transition-colors">
                        {isMe ? <Library size={22} /> : <ChevronLeft size={22} />}
                    </button>
                    <div className="flex gap-4">
                        {isMe && (
                            <>
                                <button
                                    onClick={onLogout}
                                    title="Cerrar Sesión"
                                    className="p-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/5 text-[#ff006e] hover:bg-[#ff006e] hover:text-black transition-colors"
                                >
                                    <LogOut size={22} />
                                </button>
                                <button
                                    onClick={() => setShowEditProfile(true)}
                                    title="Editar Perfil"
                                    className="p-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/5 text-white hover:bg-[#ff006e]/20 transition-colors"
                                >
                                    <Edit3 size={22} />
                                </button>
                                <button
                                    onClick={() => setShowUpload(true)}
                                    className="p-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/5 text-white hover:bg-[#ff006e]/20 transition-colors"
                                >
                                    <Upload size={22} />
                                </button>
                            </>
                        )}
                        <button className="p-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/5 text-white hover:bg-[#ff006e]/20 transition-colors">
                            <Send size={22} />
                        </button>
                        <button className="p-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/5 text-white hover:bg-[#ff006e]/20 transition-colors">
                            <MoreHorizontal size={22} />
                        </button>
                    </div>
                </div>

                {/* Información del Perfil */}
                <div className="absolute bottom-12 left-8 right-8 z-20 space-y-8">
                    <div className="space-y-3">
                        <div className="flex items-end gap-6">
                            <h2 className="text-7xl md:text-9xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-2xl">{displayUser?.username || 'GUEST_USER'}</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-[#ff006e] font-black tracking-widest uppercase text-xs">
                            <span>iAm @{displayUser?.username || 'guest'}</span>
                            <span className="w-2 h-2 bg-[#ff006e] rounded-full shadow-[0_0_10px_#ff006e]" />
                            <span className="opacity-60">{displayUser ? isMe ? 'System Owner' : 'Verified Signature' : 'Unregistered Object'}</span>
                            {isMe && (
                                <>
                                    <span className="text-white/20">|</span>
                                    <span className="flex items-center gap-2 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        {currentUser?.credits || 0} CRD
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-4 bg-black/20 backdrop-blur-md p-2 pr-6 rounded-full border border-white/5">
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-12 h-12 rounded-full border-2 border-black bg-[#111] flex items-center justify-center text-[10px] font-black text-[#ff006e] ring-1 ring-[#ff006e]/20 hover:scale-110 transition-transform cursor-pointer">
                                        {i}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white leading-none">3,484</div>
                                <div className="text-[9px] uppercase font-black text-[#ff006e]/50 tracking-widest">Seguidores</div>
                            </div>
                        </div>

                        <div className="flex gap-8 ml-auto">
                            {!isMe && (
                                <>
                                    <button
                                        onClick={handleFollow}
                                        className={`px-10 py-4 backdrop-blur-md rounded-full font-black text-xs uppercase transition-all transform hover:-translate-y-1 ${isFollowing
                                            ? 'bg-[#ff006e]/20 text-[#ff006e] border border-[#ff006e] shadow-[0_0_30px_#ff006e]'
                                            : 'bg-white/10 text-white border border-white/20 hover:bg-[#ff006e] hover:border-[#ff006e]'
                                            }`}
                                    >
                                        {isFollowing ? 'Linked' : 'Link'}
                                    </button>
                                    <button className="p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-[#ff006e]/20 hover:border-[#ff006e]/50 hover:text-[#ff006e] transition-all"><MessageSquare size={24} /></button>
                                </>
                            )}
                            {isMe && (
                                <button className="px-10 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full font-black text-xs uppercase shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-[#ff006e] hover:border-[#ff006e] hover:shadow-[0_0_30px_#ff006e] transition-all transform hover:-translate-y-1">Apoyar</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navegación del Perfil */}
            <div className="sticky top-0 bg-black/80 backdrop-blur-2xl border-b border-[#ff006e]/10 flex items-center justify-center gap-16 py-5 z-40">
                <ProfileTabIcon icon={<Library size={28} />} label="Música" active={activeTab === 'Music'} onClick={() => setActiveTab('Music')} />
                <ProfileTabIcon icon={<BookOpen size={28} />} label="Listas" active={activeTab === 'Playlists'} onClick={() => setActiveTab('Playlists')} />
                <ProfileTabIcon icon={<Zap size={28} />} label="Estudio" active={activeTab === 'Studio'} onClick={() => setActiveTab('Studio')} />
            </div>

            <div className="p-6 md:p-12 flex flex-col lg:flex-row gap-10 max-w-7xl mx-auto w-full">
                {/* Sidebars */}
                <aside className="w-full lg:w-80 space-y-5 shrink-0">
                    <Accordion title="Sobre mí" isOpen={isAboutOpen} onToggle={() => setIsAboutOpen(!isAboutOpen)}>
                        <div className="text-[12px] text-[#ff006e]/70 leading-relaxed italic p-3 space-y-4">
                            {displayUser?.biography || displayUser?.bio || 'Músico independiente explorando sonidos. Del vacío digital a tus oídos.'}
                            <div className="space-y-2 pt-4 border-t border-[#ff006e]/10">
                                <span className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest">
                                    <MapPin size={14} />
                                    {['Unknown', 'Central Hub', 'Neon Wastes', 'Deep Data', 'Outer Rim'][displayUser?.residentSectorId] || 'Drifting / No Residency'}
                                </span>
                                <span className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest"><Calendar size={14} /> Miembro desde 2024</span>
                            </div>
                        </div>
                    </Accordion>

                    <Accordion title="Estadísticas" isOpen={isStatsOpen} onToggle={() => setIsStatsOpen(!isStatsOpen)}>
                        <div className="space-y-4 p-3">
                            <StatItem label="Tracks" value={isMe ? (allTracks?.filter(t => String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)).length || 0) : profileTracks.length} />
                            <StatItem label="Playlists" value={playlists.length} />
                            <StatItem label="Reproducciones" value={(isMe ? allTracks?.filter(t => String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)) : profileTracks).reduce((acc, t) => acc + (t.playCount || 0), 0).toLocaleString()} />
                            <StatItem label="Posts de Estudio" value="0" />
                        </div>
                    </Accordion>
                </aside>

                {/* Contenedor Principal de Pestañas */}
                <div className="flex-1">
                    <div className="bg-[#080808] border border-[#ff006e]/10 rounded-[2rem] min-h-[600px] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                        <div className="flex border-b border-[#ff006e]/10 bg-[#0a0a0a]">
                            {['Music', 'Playlists', 'Studio'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setActiveTab(t)}
                                    className={`flex-1 py-6 text-[11px] font-black uppercase tracking-[0.3em] relative transition-all ${activeTab === t ? 'text-white' : 'text-[#ff006e]/30 hover:text-[#ff006e]'}`}
                                >
                                    {t}
                                    {activeTab === t && <motion.div layoutId="profile-underline" className="absolute bottom-0 left-8 right-8 h-1 bg-[#ff006e] shadow-[0_0_20px_#ff006e]" />}
                                </button>
                            ))}
                        </div>

                        <div className="p-8 flex-1">
                            {activeTab === 'Music' && (isMe ? allTracks?.filter(t => String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)).length > 0 : profileTracks.length > 0) ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff006e]">System_Uploads ({(isMe ? allTracks?.filter(t => String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)) : profileTracks).length})</h4>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {(isMe ? allTracks?.filter(t => String(t.artistUserId || t.ArtistUserId) === String(currentUser?.id || currentUser?.Id)) : profileTracks).map((track) => (
                                            <div key={track.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl group hover:border-[#ff006e]/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg bg-black border border-white/10 overflow-hidden relative">
                                                        {track.cover ? (
                                                            <img src={track.cover} alt="Cover" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[#ff006e]/30"><Music size={20} /></div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-white uppercase tracking-tighter truncate max-w-[200px]">{track.title}</div>
                                                        <div className="text-[9px] font-bold text-[#ff006e]/60 uppercase tracking-widest">{track.genre || 'Electronic'} • {track.playCount || 0} scans</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    {track.isLocked && <div className="text-[8px] font-black bg-[#ff006e] text-black px-2 py-0.5 rounded uppercase tracking-tighter">Encrypted</div>}
                                                    {isMe && (
                                                        <TrackActionsDropdown
                                                            track={track}
                                                            isOwner={isMe}
                                                            playlists={playlists}
                                                            myLikes={myLikes}
                                                            isLikedInitial={myLikes.some(l => (l.trackId || l.TrackId) === (track.id || track.Id))}
                                                            onDelete={() => handleDeleteTrack(track)}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : activeTab === 'Studio' ? (
                                <div className="space-y-10">
                                    <div className="flex flex-wrap gap-4">
                                        {['All', 'Journal', 'Photos', 'Videos', 'Art'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setStudioSubTab(s)}
                                                className={`px-6 py-2 text-[10px] font-black uppercase rounded-full transition-all border-2 ${studioSubTab === s ? 'bg-[#ff006e] border-[#ff006e] text-black shadow-[0_0_15px_#ff006e]' : 'bg-transparent border-[#ff006e]/20 text-[#ff006e]/40 hover:border-[#ff006e]'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex flex-col items-center justify-center py-28 text-center space-y-6 opacity-30">
                                        <BookOpen size={60} />
                                        <h4 className="text-lg font-black uppercase tracking-tighter text-white">Contenido próximamente</h4>
                                    </div>
                                </div>
                            ) : activeTab === 'Playlists' ? (
                                <div className="space-y-6">
                                    {isMe && (
                                        <button
                                            onClick={() => setShowCreatePlaylist(true)}
                                            className="w-full py-4 border border-dashed border-[#ff006e]/30 rounded-xl text-[#ff006e]/50 hover:text-[#ff006e] hover:border-[#ff006e] hover:bg-[#ff006e]/5 transition-all font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18} /> New Playlist
                                        </button>
                                    )}

                                    {playlists.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {playlists.map(p => (
                                                <div key={p.id} onClick={() => handleOpenPlaylist(p.id)} className="group flex flex-col gap-3 cursor-pointer">
                                                    <div className="aspect-square bg-black/40 border border-white/5 rounded-2xl relative overflow-hidden hover:border-[#ff006e]/30 transition-all">
                                                        {p.imageUrl ? (
                                                            <img src={p.imageUrl.startsWith('http') ? p.imageUrl : `http://localhost:5264${p.imageUrl}`} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500" />
                                                        ) : (
                                                            <div className="absolute inset-0 bg-gradient-to-br from-[#ff006e]/20 to-black opacity-50" />
                                                        )}

                                                        <div className="absolute top-3 right-3 z-10">
                                                            {p.isPublic ? <Globe size={14} className="text-white/40" /> : <Lock size={14} className="text-[#ff006e]" />}
                                                        </div>
                                                    </div>

                                                    <div className="px-1">
                                                        <h4 className="text-white font-bold text-sm tracking-wide group-hover:text-[#ff006e] transition-colors truncate">{p.name}</h4>
                                                        <p className="text-[10px] text-white/40 mt-1 font-mono">{p.trackCount} Tracks</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 text-white/20 font-mono uppercase tracking-widest text-xs">No Playlists Found</div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center py-40 opacity-10 italic uppercase tracking-[0.5em] text-xs text-center">
                                    <Frown size={48} className="mx-auto mb-4" />
                                    No se encontraron datos en {activeTab}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {/* UPLOAD OVERLAY */}
                {showUpload && (
                    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-2xl p-6 flex flex-col overflow-y-auto">
                        <button onClick={() => setShowUpload(false)} className="self-end p-4 bg-white/5 rounded-full hover:bg-[#ff006e] hover:text-black transition-colors mb-6"><X size={24} /></button>
                        <UploadTrackView onClose={() => setShowUpload(false)} />
                    </motion.div>
                )}

                {/* CREATE PLAYLIST MODAL */}
                {showCreatePlaylist && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
                        <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
                            <button onClick={() => setShowCreatePlaylist(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={20} /></button>

                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8">New Playlist</h3>

                            <form onSubmit={handleCreatePlaylist} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#ff006e] uppercase tracking-widest">Name</label>
                                    <input
                                        type="text"
                                        value={newPlaylistName}
                                        onChange={e => setNewPlaylistName(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#ff006e]"
                                        placeholder="MY_MIXTAPE_01"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer" onClick={() => setIsPlaylistPublic(!isPlaylistPublic)}>
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold uppercase tracking-wide text-sm">Visibility</span>
                                        <span className="text-[10px] text-white/40 uppercase">{isPlaylistPublic ? 'Public System' : 'Private Encrypted'}</span>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isPlaylistPublic ? 'bg-[#ff006e]' : 'bg-white/20'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${isPlaylistPublic ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-4 bg-[#ff006e] text-black font-black uppercase tracking-widest rounded-xl hover:bg-white hover:text-[#ff006e] transition-colors">
                                    Initialise
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}

                {/* EDIT PROFILE MODAL */}
                {showEditProfile && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
                        <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative">
                            <button onClick={() => setShowEditProfile(false)} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={20} /></button>
                            <EditProfileForm user={currentUser} onSubmit={handleUpdateProfile} />
                        </div>
                    </motion.div>
                )}

                {/* PLAYLIST DETAILS MODAL */}
                {selectedPlaylistId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
                        <div className="bg-[#0a0a0a] border border-white/10 p-0 rounded-3xl w-full max-w-4xl shadow-2xl relative h-[80vh] flex flex-col overflow-hidden">
                            <button onClick={() => setSelectedPlaylistId(null)} className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white/40 hover:text-white hover:bg-[#ff006e] transition-all"><X size={20} /></button>

                            {isLoadingPlaylist ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <RefreshCw className="animate-spin text-[#ff006e]" size={32} />
                                </div>
                            ) : !playlistDetails ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-white/40">
                                    <Frown size={48} className="mb-4 text-[#ff006e]" />
                                    <p className="font-bold uppercase tracking-widest text-xs">Failed to load playlist data</p>
                                </div>
                            ) : (
                                <PlaylistDetailsModal
                                    playlist={playlistDetails.playlist || playlistDetails.Playlist}
                                    tracks={playlistDetails.tracks || playlistDetails.Tracks}
                                    isOwner={isMe}
                                    onUpdate={handleUpdatePlaylist}
                                    onDelete={handleDeletePlaylist}
                                    playlists={playlists}
                                    myLikes={myLikes}
                                />
                            )}
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
        </motion.div>
    );
};

// --- SUB-COMPONENTES AUXILIARES ---

const ProfileTabIcon = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`group flex flex-col items-center gap-2 transition-all duration-300 ${active ? 'text-[#ff006e] scale-110' : 'text-white/20 hover:text-white'}`}
    >
        <div className={`p-4 rounded-2xl transition-all ${active ? 'bg-[#ff006e]/10 shadow-[0_0_20px_rgba(255,0,110,0.1)]' : ''}`}>
            {icon}
        </div>
        <span className={`text-[8px] font-black uppercase tracking-widest transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>
            {label}
        </span>
    </button>
);

const Accordion = ({ title, isOpen, onToggle, children }) => (
    <div className="border border-[#ff006e]/20 rounded-2xl overflow-hidden bg-[#0a0a0a]/80 backdrop-blur-md">
        <button
            onClick={onToggle}
            className="w-full flex justify-between items-center p-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#ff006e] hover:bg-[#ff006e]/5"
        >
            <span>{title}</span>
            <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={16} />
            </div>
        </button>
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-black/40 border-t border-[#ff006e]/10 p-5 pt-3"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

const EditProfileForm = ({ user, onSubmit }) => {
    const [name, setName] = useState(user?.username || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [file, setFile] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('Username', name);
        formData.append('Biography', bio);
        if (file) formData.append('ProfilePicture', file);
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-8 pt-10">Edit Signal</h3>

            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-black border border-white/10 flex items-center justify-center overflow-hidden relative group">
                    {file ? (
                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                    ) : user?.profileImageUrl ? (
                        <img src={user.profileImageUrl.startsWith('http') ? user.profileImageUrl : `http://localhost:5264${user.profileImageUrl}`} className="w-full h-full object-cover" />
                    ) : (
                        <Upload className="text-white/20" />
                    )}
                    <input
                        type="file"
                        onChange={e => setFile(e.target.files[0])}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload size={16} className="text-white" />
                    </div>
                </div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest max-w-[200px]">
                    Upload new visual identifier. Max 5MB.
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-[#ff006e] uppercase tracking-widest">Designation</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#ff006e]"
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-[#ff006e] uppercase tracking-widest">Bio-Data</label>
                <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-medium outline-none focus:border-[#ff006e] min-h-[100px]"
                />
            </div>

            <button type="submit" className="w-full py-4 bg-[#ff006e] text-black font-black uppercase tracking-widest rounded-xl hover:bg-white hover:text-[#ff006e] transition-colors">
                Update Identity
            </button>
        </form>
    );
};

const StatItem = ({ label, value }) => (
    <div className="flex justify-between items-center text-[10px] font-black uppercase group py-2 border-b border-white/5 last:border-none">
        <span className="text-[#ff006e]/40 group-hover:text-[#ff006e] tracking-widest transition-colors">{label}</span>
        <span className="text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10 group-hover:border-[#ff006e]/30 transition-all shadow-inner">{value}</span>
    </div>
);

const PlaylistDetailsModal = ({ playlist, tracks, isOwner, onUpdate, onDelete, playlists = [], myLikes = [] }) => {
    const [isEditing, setIsEditing] = useState(false);

    // Edit State
    const [name, setName] = useState(playlist.name);
    const [isPublic, setIsPublic] = useState(playlist.isPublic);
    const [description, setDescription] = useState(playlist.description || '');

    // Reset state when playlist changes
    React.useEffect(() => {
        setName(playlist.name);
        setIsPublic(playlist.isPublic);
        setDescription(playlist.description || '');
    }, [playlist]);

    const handleSave = () => {
        onUpdate(playlist.id, { Name: name, Description: description, IsPublic: isPublic });
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex-1 flex flex-col p-8 pt-16 gap-6 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Edit Playlist</h3>
                </div>

                <div className="space-y-6 max-w-lg mx-auto w-full pb-10">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#ff006e] uppercase tracking-widest">Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-[#ff006e]" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#ff006e] uppercase tracking-widest">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-4 text-white font-medium outline-none focus:border-[#ff006e] min-h-[100px]" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer" onClick={() => setIsPublic(!isPublic)}>
                        <div className="flex flex-col">
                            <span className="text-white font-bold uppercase tracking-wide text-sm">Visibility</span>
                            <span className="text-[10px] text-white/40 uppercase">{isPublic ? 'Public System' : 'Private Encrypted'}</span>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isPublic ? 'bg-[#ff006e]' : 'bg-white/20'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setIsEditing(false)} className="w-full py-4 border border-white/10 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="w-full py-4 bg-[#ff006e] text-black font-black uppercase tracking-widest rounded-xl hover:bg-white hover:text-[#ff006e] transition-colors shadow-[0_0_20px_#ff006e]/20">
                            Save Changes
                        </button>
                    </div>

                    <button onClick={() => onDelete(playlist.id)} className="w-full py-4 border border-white/5 text-red-500/60 hover:text-red-500 font-bold uppercase tracking-widest rounded-xl hover:border-red-500/50 transition-colors text-[10px] mt-4">
                        Delete Playlist
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col md:flex-row h-full pt-12 md:pt-0">
            {/* Sidebar / Info */}
            <div className="w-full md:w-80 bg-black/20 border-r border-[#ff006e]/10 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
                <div className="aspect-square rounded-2xl overflow-hidden relative group shadow-2xl">
                    {playlist.imageUrl ? (
                        <img src={playlist.imageUrl.startsWith('http') ? playlist.imageUrl : `http://localhost:5264${playlist.imageUrl}`} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#ff006e]/20 to-black flex items-center justify-center">
                            <Library size={48} className="text-[#ff006e]/40" />
                        </div>
                    )}
                </div>

                <div className="space-y-2 mt-10 md:mt-0">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none break-words">{playlist.name}</h2>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#ff006e] uppercase tracking-widest">
                        {playlist.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                        {playlist.isPublic ? 'Public' : 'Private'}
                        <span className="text-white/20">|</span>
                        {tracks.length} Tracks
                    </div>
                    {playlist.description && <p className="text-xs text-white/60 font-mono leading-relaxed mt-4">{playlist.description}</p>}
                </div>

                {isOwner && (
                    <div className="mt-auto pt-6 border-t border-white/5 space-y-3">
                        <button onClick={() => setIsEditing(true)} className="w-full py-3 bg-white/5 hover:bg-[#ff006e] text-white hover:text-black rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2">
                            <Edit3 size={14} /> Edit Playlist
                        </button>
                        <button className="w-full py-3 border border-white/10 hover:border-[#ff006e] text-white/40 hover:text-[#ff006e] rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2">
                            <Send size={14} /> Share
                        </button>
                    </div>
                )}
            </div>

            {/* Track List */}
            <div className="flex-1 p-6 pt-16 overflow-y-auto bg-black/40">
                {tracks.length > 0 ? (
                    <div className="space-y-2">
                        {tracks.map((t, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 group border border-transparent hover:border-white/5 transition-all">
                                <span className="text-[#ff006e]/50 font-mono text-xs w-6 text-center">{idx + 1}</span>
                                <div className="w-10 h-10 rounded-lg bg-black overflow-hidden relative shrink-0">
                                    {t.coverImageUrl ? (
                                        <img src={t.coverImageUrl.startsWith('http') ? t.coverImageUrl : `http://localhost:5264${t.coverImageUrl}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-[#111]" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pr-10">
                                    <div className="text-white font-bold text-sm truncate">{t.title}</div>
                                    <div className="text-white/40 text-[10px] tracking-wider">{t.artistName || 'Unknown Artist'}</div>
                                </div>
                                <TrackActionsDropdown
                                    track={t}
                                    isOwner={isOwner}
                                    playlists={playlists}
                                    myLikes={myLikes}
                                    isLikedInitial={myLikes.some(l => (l.trackId || l.TrackId) === (t.id || t.Id))}
                                    onDelete={() => {/* Handle remove from playlist locally */ }}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-white italic font-black uppercase tracking-tighter">
                        <Library size={48} className="mb-4" />
                        Empty Playlist
                    </div>
                )}
            </div>
        </div>
    );
};

const ActionModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", type = "confirm" }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-sm bg-black border-2 border-[#ff006e] rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(255,0,110,0.2)]"
                    >
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#ff006e] animate-pulse" />
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ff006e]">{title}</div>
                            </div>

                            <div className="text-white/80 text-sm font-bold uppercase tracking-tight leading-relaxed">
                                {message}
                            </div>

                            <div className="flex gap-3 pt-2">
                                {type === "confirm" && (
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all border border-white/10 rounded-xl"
                                    >
                                        Abort
                                    </button>
                                )}
                                <button
                                    onClick={() => { if (onConfirm) onConfirm(); onClose(); }}
                                    className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] bg-[#ff006e] text-black hover:bg-white transition-all rounded-xl shadow-[0_0_20px_rgba(255,0,110,0.3)]"
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const TrackActionsDropdown = ({ track, isOwner, onDelete, onLike, playlists = [], isLikedInitial = false, myLikes = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showPlaylists, setShowPlaylists] = useState(false);
    const [isLiked, setIsLiked] = useState(isLikedInitial);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null, confirmText: 'Confirm' });

    // Sync if initial changes
    useEffect(() => {
        setIsLiked(isLikedInitial);
    }, [isLikedInitial]);

    const handleAddTrackToPlaylist = async (playlistId, playlistName) => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            await API.Playlists.addTrack(playlistId, track.id || track.Id);
            setModalConfig({
                isOpen: true,
                title: 'Signal_Synced',
                message: `Track successfully routed to: ${playlistName}`,
                type: 'alert',
                confirmText: 'Acknowledge'
            });
            setIsOpen(false);
        } catch (err) {
            console.error(err);
            setModalConfig({
                isOpen: true,
                title: 'Sync_Error',
                message: err.response?.data?.message || err.response?.data || "Failed to add track to playlist.",
                type: 'alert',
                confirmText: 'Back'
            });
        }
    };

    const handleToggleLike = async () => {
        try {
            const API = await import('../services/api').then(mod => mod.default);
            if (isLiked) {
                await API.Social.unlikeTrack(track.id || track.Id);
            } else {
                await API.Social.likeTrack(track.id || track.Id);
            }
            setIsLiked(!isLiked);
            onLike?.(!isLiked);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePurchase = async () => {
        const price = track.price || track.Price || 0;
        setModalConfig({
            isOpen: true,
            title: 'Authorization_Required',
            message: `Purchase license for "${track.title}"? Cost: ${price} CRD. This signal will be permanently allocated to your collection.`,
            type: 'confirm',
            confirmText: 'Execute',
            onConfirm: async () => {
                try {
                    const API = await import('../services/api').then(mod => mod.default);
                    await API.Purchases.purchaseTrack(track.id || track.Id);
                    setModalConfig({
                        isOpen: true,
                        title: 'Acquisition_Complete',
                        message: "License secured. Track has been initialized in your collection.",
                        type: 'alert',
                        confirmText: 'Clear'
                    });
                    setIsOpen(false);
                } catch (err) {
                    console.error(err);
                    setModalConfig({
                        isOpen: true,
                        title: 'Acquisition_Failed',
                        message: err.response?.data?.message || err.response?.data || "Insufficient CRD or system connection error.",
                        type: 'alert',
                        confirmText: 'Back'
                    });
                }
            }
        });
    };

    const handleDelete = () => {
        setModalConfig({
            isOpen: true,
            title: 'Delist_Verification',
            message: `Are you sure you want to delist "${track.title}"? This action is permanent.`,
            type: 'confirm',
            confirmText: 'Delete',
            onConfirm: () => {
                onDelete?.();
                setIsOpen(false);
            }
        });
    };

    return (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); setShowPlaylists(false); }}
                className={`p-2 rounded-xl transition-all border-2 ${isOpen ? 'border-[#ff006e] bg-[#ff006e]/10 text-[#ff006e] shadow-[0_0_20px_rgba(255,0,110,0.2)]' : 'text-[#ff006e]/60 border-[#ff006e]/10 hover:border-[#ff006e]/40 hover:text-[#ff006e] bg-white/5'}`}
            >
                <MoreHorizontal size={20} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="absolute right-0 top-full mt-3 w-64 bg-[#0a0a0a]/95 backdrop-blur-2xl border border-[#ff006e]/30 rounded-2xl z-50 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_20px_rgba(255,0,110,0.1)] ring-1 ring-white/5"
                        >
                            <div className="p-2 space-y-1">
                                {!showPlaylists ? (
                                    <>
                                        <button className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/90 hover:bg-[#ff006e]/10 hover:text-[#ff006e] transition-all rounded-xl group/item">
                                            <PlayCircle size={16} className="text-[#ff006e]/50 group-hover/item:text-[#ff006e]" /> Add to Queue
                                        </button>
                                        <button
                                            onClick={() => setShowPlaylists(true)}
                                            className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/90 hover:bg-[#ff006e]/10 hover:text-[#ff006e] transition-all rounded-xl group/item"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Library size={16} className="text-[#ff006e]/50 group-hover/item:text-[#ff006e]" /> Add to Playlist
                                            </div>
                                            <ChevronLeft size={14} className="rotate-180 opacity-40 group-hover/item:opacity-100" />
                                        </button>
                                        <button
                                            onClick={handleToggleLike}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all rounded-xl group/item ${isLiked ? 'text-[#ff006e] bg-[#ff006e]/5' : 'text-white/90 hover:bg-[#ff006e]/10 hover:text-[#ff006e]'}`}
                                        >
                                            <Heart size={16} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "text-[#ff006e]" : "text-[#ff006e]/50 group-hover/item:text-[#ff006e]"} /> {isLiked ? 'Liked' : 'Like'}
                                        </button>
                                        <button
                                            onClick={handlePurchase}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-white/90 hover:bg-[#ff006e]/10 hover:text-[#ff006e] transition-all rounded-xl group/item"
                                        >
                                            <Zap size={16} className="text-[#ff006e]/50 group-hover/item:text-[#ff006e]" /> Purchase License
                                        </button>
                                        {isOwner && (
                                            <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-red-500/80 hover:bg-red-500/10 hover:text-red-500 transition-all rounded-xl group/item">
                                                <Trash2 size={16} className="opacity-50 group-hover/item:opacity-100" /> Delete / Delist
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setShowPlaylists(false)}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff006e] hover:bg-[#ff006e]/5 transition-all"
                                        >
                                            <ChevronLeft size={14} /> Back
                                        </button>
                                        <div className="max-h-64 overflow-y-auto pt-1 scrollbar-hide">
                                            {playlists.length > 0 ? playlists.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleAddTrackToPlaylist(p.id, p.name)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70 hover:bg-[#ff006e]/10 hover:text-[#ff006e] transition-all rounded-xl"
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${p.isPublic ? 'bg-[#ff006e]' : 'bg-white/20'}`} />
                                                    {p.name}
                                                </button>
                                            )) : (
                                                <div className="px-4 py-8 text-center text-[9px] font-black uppercase text-white/20 tracking-tighter">No Playlists Detected</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <ActionModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                confirmText={modalConfig.confirmText}
            />
        </div>
    );
};
