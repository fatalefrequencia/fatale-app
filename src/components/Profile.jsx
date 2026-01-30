import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Library, Send, MoreHorizontal, MessageSquare,
    BookOpen, Zap, MapPin, Calendar, ChevronDown, Frown, Upload, Settings, X, LogOut, RefreshCw
} from 'lucide-react';
import UploadTrackView from './UploadTrackView';

// --- VISTA: PERFIL (DISEÑO SLAVA KORNILOV) ---
// --- VISTA: PERFIL (DISEÑO SLAVA KORNILOV) ---
export const ProfileView = ({ user, onLogout, onAddCredits, onRefreshProfile }) => {
    const [activeTab, setActiveTab] = useState('Music');
    const [studioSubTab, setStudioSubTab] = useState('All');

    const [isAboutOpen, setIsAboutOpen] = useState(true);
    const [isStatsOpen, setIsStatsOpen] = useState(true);

    const [showUpload, setShowUpload] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Editing State
    const [editMode, setEditMode] = useState(false);
    const [tempUsername, setTempUsername] = useState(user?.username || '');
    const [tempBio, setTempBio] = useState(user?.bio || 'Músico independiente explorando sonidos.');
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    // Sync state when user prop updates
    React.useEffect(() => {
        if (user) {
            setTempUsername(user.username || '');
            setTempBio(user.bio || 'Músico independiente explorando sonidos.');
        }
    }, [user]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewImage(URL.createObjectURL(file));
            setEditMode(true); // Auto-enable edit mode on interaction
        }
    };

    const handleSaveProfile = async () => {
        try {
            const formData = new FormData();
            formData.append('username', tempUsername);
            formData.append('bio', tempBio);
            if (selectedFile) {
                formData.append('profileImage', selectedFile);
            }

            await import('../services/api').then(mod => mod.default.Users.updateProfile(formData));

            // Refresh global user state
            if (onRefreshProfile) onRefreshProfile(true);

            setEditMode(false);
            alert("Perfil actualizado correctamente");
        } catch (error) {
            console.error("Error updating profile:", error);

            // Construct detailed error message for debugging
            let report = `Status: ${error.response?.status || 'Active (Network Error)'}\n`;
            report += `URL: ${error.config?.url || 'Unknown'}\n`;
            if (error.response?.data) {
                const d = error.response.data;
                // Check if it's a validation error object or string
                const dataStr = typeof d === 'object' ? JSON.stringify(d, null, 2) : d;
                report += `Response Data: ${dataStr}\n`;
            } else {
                report += `Message: ${error.message}\n`;
            }

            alert(`ERROR AL ACTUALIZAR PERFIL:\n\n${report}`);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-h-screen bg-[#020202]">
            {/* Sección Hero con Imagen Grande */}
            <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden">
                <div className="absolute inset-0 bg-[#0a0a0a]">
                    <div className="w-full h-full bg-gradient-to-t from-[#020202] via-transparent to-transparent z-10 absolute" />
                    {/* Background Image if available, otherwise text */}
                    {user?.profileImageUrl ? (
                        <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url(${user.profileImageUrl.startsWith('http') ? user.profileImageUrl : `http://localhost:5264${user.profileImageUrl}`})` }} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20 italic font-black text-[18vw] text-[#ff006e] tracking-tighter select-none uppercase">
                            {user?.username || 'SYSTEM'}
                        </div>
                    )}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                </div>

                {/* Botones Flotantes Superiores */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
                    <button className="p-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/5 text-white hover:bg-[#ff006e]/20 transition-colors">
                        <Library size={22} />
                    </button>
                    <div className="flex gap-4">
                        <button
                            onClick={onLogout}
                            title="Cerrar Sesión"
                            className="p-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/5 text-[#ff006e] hover:bg-[#ff006e] hover:text-black transition-colors"
                        >
                            <LogOut size={22} />
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/5 text-white hover:bg-[#ff006e]/20 transition-colors group"
                        >
                            <Settings size={22} className="group-hover:rotate-90 transition-transform" />
                        </button>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="p-3 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/5 text-white hover:bg-[#ff006e]/20 transition-colors"
                        >
                            <Upload size={22} />
                        </button>
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
                        <h2 className="text-7xl md:text-9xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-2xl">{user?.username || 'GUEST_USER'}</h2>
                        <div className="flex items-center gap-3 text-[#ff006e] font-black tracking-widest uppercase text-xs">
                            <span>iAm @{user?.username || 'guest'}</span>
                            <span className="w-2 h-2 bg-[#ff006e] rounded-full shadow-[0_0_10px_#ff006e]" />
                            <span className="opacity-60">{user ? 'System User' : 'Unregistered Object'}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-4 bg-black/20 backdrop-blur-md p-2 pr-6 rounded-full border border-white/5">
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-12 h-12 rounded-full border-2 border-black bg-[#111] flex items-center justify-center text-[10px] font-black text-[#ff006e] ring-1 ring-[#ff006e]/20">
                                        {i}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white leading-none">3,484</div>
                                <div className="text-[9px] uppercase font-black text-[#ff006e]/50 tracking-widest">Seguidores</div>
                            </div>
                        </div>

                        <div className="flex gap-3 ml-auto">
                            <button className="px-10 py-4 bg-white text-black rounded-full font-black text-xs uppercase shadow-[0_10px_30px_rgba(255,255,255,0.2)] hover:bg-[#ff006e] hover:text-white transition-all transform hover:-translate-y-1">Apoyar</button>
                            <button className="p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white hover:bg-[#ff006e]/20 transition-all"><MessageSquare size={24} /></button>
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
                            {user?.bio || 'Músico independiente explorando sonidos. Del vacío digital a tus oídos.'}
                            <div className="space-y-2 pt-4 border-t border-[#ff006e]/10">
                                <span className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest"><MapPin size={14} /> Miami, Florida</span>
                                <span className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest"><Calendar size={14} /> Miembro desde 2024</span>
                            </div>
                        </div>
                    </Accordion>

                    <Accordion title="Estadísticas" isOpen={isStatsOpen} onToggle={() => setIsStatsOpen(!isStatsOpen)}>
                        <div className="space-y-4 p-3">
                            <StatItem label="Tracks" value="12" />
                            <StatItem label="Playlists" value="4" />
                            <StatItem label="Reproducciones" value="42.5k" />
                            <StatItem label="Posts de Estudio" value="8" />
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
                            {activeTab === 'Studio' ? (
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

                {/* SETTINGS / CONFIGURATION OVERLAY */}
                {showSettings && (
                    <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} className="fixed inset-0 z-[60] bg-[#050505] backdrop-blur-2xl p-6 flex flex-col overflow-y-auto">
                        <div className="flex justify-between items-center mb-12">
                            <div className="flex items-center gap-3">
                                <Settings size={32} className="text-[#ff006e] animate-spin-slow" />
                                <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter">Configuración</h2>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="p-4 bg-white/5 rounded-full hover:bg-[#ff006e] hover:text-black transition-colors"><X size={24} /></button>
                        </div>

                        <div className="max-w-4xl mx-auto w-full space-y-12">
                            {/* USER INFO CARD (EDITABLE) */}
                            <div className="p-8 border border-[#ff006e]/20 rounded-3xl bg-[#111] relative overflow-hidden group">
                                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start justify-between">
                                    <div className="flex items-start gap-6 flex-1">
                                        <div className="relative group/avatar cursor-pointer">
                                            <input type="file" onChange={handleFileSelect} className="hidden" id="avatar-upload" accept="image/*" />
                                            <label htmlFor="avatar-upload" className="block w-24 h-24 rounded-full border-4 border-[#ff006e] shadow-[0_0_30px_#ff006e50] flex items-center justify-center bg-black overflow-hidden relative cursor-pointer">
                                                {previewImage || user?.profileImageUrl ? (
                                                    <img src={previewImage || (user?.profileImageUrl?.startsWith('http') ? user.profileImageUrl : `http://localhost:5264${user.profileImageUrl}`)} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl font-black text-white">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                                    <Upload size={20} className="text-white" />
                                                </div>
                                            </label>
                                        </div>

                                        <div className="flex-1 space-y-4 w-full">
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-black text-[#ff006e]/50 tracking-widest">Username</label>
                                                <input
                                                    value={tempUsername}
                                                    onChange={(e) => { setTempUsername(e.target.value); setEditMode(true); }}
                                                    className="w-full bg-transparent text-2xl font-black text-white uppercase outline-none border-b border-transparent focus:border-[#ff006e] placeholder-white/10 transition-colors"
                                                    placeholder="USERNAME"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-black text-[#ff006e]/50 tracking-widest">Biography</label>
                                                <textarea
                                                    value={tempBio}
                                                    onChange={(e) => { setTempBio(e.target.value); setEditMode(true); }}
                                                    className="w-full bg-transparent text-[#ff006e]/80 font-mono text-sm outline-none border-b border-transparent focus:border-[#ff006e] resize-none placeholder-[#ff006e]/20 transition-colors h-16"
                                                    placeholder="Escribe tu biografía..."
                                                />
                                            </div>
                                            <p className="text-[#ff006e]/60 font-mono text-xs">{user?.email || 'Sin Email'}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => { setShowSettings(false); onLogout(); }}
                                            className="px-6 py-2 border border-[#ff006e]/30 text-[#ff006e]/60 rounded-full hover:bg-[#ff006e] hover:text-black transition-colors font-bold uppercase tracking-widest text-xs"
                                        >
                                            Cerrar Sesión
                                        </button>

                                        {editMode && (
                                            <button
                                                onClick={handleSaveProfile}
                                                className="px-6 py-3 bg-[#ff006e] text-black rounded-full shadow-[0_0_20px_#ff006e] hover:scale-105 transition-transform font-bold uppercase tracking-widest text-xs animate-pulse"
                                            >
                                                Guardar Cambios
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-[#ff006e]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            </div>

                            {/* CREDITS SECTION */}
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white px-4 border-l-4 border-[#ff006e]">HYBRID ECONOMY / CRÉDITOS</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* BALANCE CARD */}
                                    <div className="p-8 bg-black border border-[#333] rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-[#ff006e] transition-colors">
                                        <span className="text-[#ff006e] text-xs font-black tracking-[0.3em] uppercase">Saldo Actual</span>
                                        <div className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] flex items-center gap-2">
                                            {user?.credits || 0} <span className="text-2xl text-[#ff006e]">CRD</span>
                                            {onRefreshProfile && (
                                                <button onClick={onRefreshProfile} title="Verificar Saldo en Servidor" className="ml-2 p-2 bg-[#111] rounded-full border border-[#ff006e]/30 hover:bg-[#ff006e] hover:text-black transition-colors">
                                                    <RefreshCw size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* BUY CARD */}
                                    <div className="p-8 bg-[#111] border border-[#333] rounded-3xl flex flex-col items-center justify-center gap-6 hover:border-[#ff006e] transition-colors">
                                        <div className="text-center space-y-2">
                                            <div className="text-white font-black text-xl">Recargar Créditos</div>
                                            <p className="text-xs text-white/50 max-w-[200px]">Adquiere más créditos para desbloquear contenido exclusivo.</p>
                                        </div>
                                        <button
                                            onClick={onAddCredits}
                                            className="px-8 py-3 bg-[#ff006e] text-black font-black uppercase tracking-widest rounded-full hover:scale-105 hover:shadow-[0_0_30px_#ff006e] transition-all"
                                        >
                                            Comprar 100 CRD
                                        </button>
                                    </div>
                                </div>
                            </div>
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

const StatItem = ({ label, value }) => (
    <div className="flex justify-between items-center text-[10px] font-black uppercase group py-1">
        <span className="text-[#ff006e]/40 group-hover:text-[#ff006e] tracking-widest">{label}</span>
        <span className="text-white bg-[#111] px-3 py-1 rounded-lg border border-[#ff006e]/10">{value}</span>
    </div>
);
