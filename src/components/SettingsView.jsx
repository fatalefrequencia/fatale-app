import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Globe, Shield, User, Bell, ChevronRight, Check, Activity, Zap, 
    AlertTriangle, Lock, Eye, EyeOff, Save, Trash2, Volume2, Laptop 
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import API from '../services/api';
import { SECTORS } from '../constants';

const SettingsView = ({ user, setUser }) => {
    const { language, setLanguage, t } = useLanguage();
    const { showNotification } = useNotification();
    const [activeSection, setActiveSection] = React.useState('language');
    const [isSaving, setIsSaving] = React.useState(false);
    const [updateAvailable, setUpdateAvailable] = React.useState(false);
    const [isOnline, setIsOnline] = React.useState(navigator.onLine);

    // --- Identity States ---
    const [username, setUsername] = React.useState(user?.username || user?.Username || '');
    const [biography, setBiography] = React.useState(user?.biography || user?.Biography || '');
    const [residentSectorId, setResidentSectorId] = React.useState(user?.residentSectorId || user?.ResidentSectorId || 0);
    const [themeColor, setThemeColor] = React.useState(user?.themeColor || user?.ThemeColor || '#ff006e');
    const [textColor, setTextColor] = React.useState(user?.textColor || user?.TextColor || '#ffffff');
    const [backgroundColor, setBackgroundColor] = React.useState(user?.backgroundColor || user?.BackgroundColor || '#000000');
    const [secondaryColor, setSecondaryColor] = React.useState(user?.secondaryColor || user?.SecondaryColor || '#00ffff');
    const [isGlass, setIsGlass] = React.useState(user?.isGlass || user?.IsGlass || false);
    const [statusMessage, setStatusMessage] = React.useState(user?.statusMessage || user?.StatusMessage || '');
    
    // Files
    const [pfpFile, setPfpFile] = React.useState(null);
    const [pfpPreview, setPfpPreview] = React.useState(null);
    const [bannerFile, setBannerFile] = React.useState(null);
    const [videoFile, setVideoFile] = React.useState(null);
    const [monitorFile, setMonitorFile] = React.useState(null);
    const [clearMonitor, setClearMonitor] = React.useState(false);

    // --- Security States ---
    const [email, setEmail] = React.useState('');
    const [currentPassword, setCurrentPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmNewPassword, setConfirmNewPassword] = React.useState('');
    const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
    const [showNewPassword, setShowNewPassword] = React.useState(false);

    // --- Notification States ---
    const [soundAlerts, setSoundAlerts] = React.useState(() => localStorage.getItem('fatale_sound_alerts') !== 'false');
    const [visualFlash, setVisualFlash] = React.useState(() => localStorage.getItem('fatale_visual_flash') !== 'false');
    const [tipAlerts, setTipAlerts] = React.useState(() => localStorage.getItem('fatale_tip_alerts') !== 'false');
    const [notificationDuration, setNotificationDuration] = React.useState(() => parseInt(localStorage.getItem('fatale_notification_duration') || '5', 10));

    React.useEffect(() => {
        if (user) {
            setUsername(user.username || user.Username || '');
            setBiography(user.biography || user.Biography || '');
            setResidentSectorId(user.residentSectorId || user.ResidentSectorId || 0);
            setThemeColor(user.themeColor || user.ThemeColor || '#ff006e');
            setTextColor(user.textColor || user.TextColor || '#ffffff');
            setBackgroundColor(user.backgroundColor || user.BackgroundColor || '#000000');
            setSecondaryColor(user.secondaryColor || user.SecondaryColor || '#00ffff');
            setIsGlass(user.isGlass || user.IsGlass || false);
            setStatusMessage(user.statusMessage || user.StatusMessage || '');
            setEmail(user.email || user.Email || '');
        }
    }, [user]);

    React.useEffect(() => {
        localStorage.setItem('fatale_sound_alerts', String(soundAlerts));
    }, [soundAlerts]);
    React.useEffect(() => {
        localStorage.setItem('fatale_visual_flash', String(visualFlash));
    }, [visualFlash]);
    React.useEffect(() => {
        localStorage.setItem('fatale_tip_alerts', String(tipAlerts));
    }, [tipAlerts]);
    React.useEffect(() => {
        localStorage.setItem('fatale_notification_duration', String(notificationDuration));
    }, [notificationDuration]);

    React.useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (let registration of registrations) {
                    if (registration.waiting) {
                        setUpdateAvailable(true);
                    }
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed') {
                                    setUpdateAvailable(true);
                                }
                            });
                        }
                    });
                }
            });
        }

        const checkByteDifference = async () => {
            if (!navigator.onLine) return;
            try {
                const res = await fetch(`/sw.js?t=${Date.now()}`, { cache: 'no-store' });
                if (!res.ok) return;
                const text = await res.text();
                if (!text || text.length < 100) return;

                let hash = 0;
                for (let i = 0; i < text.length; i++) {
                    hash = (hash << 5) - hash + text.charCodeAt(i);
                    hash |= 0;
                }
                const serverHash = String(hash);
                
                const localHashKey = 'fatale_sw_hash';
                const localHash = localStorage.getItem(localHashKey);
                
                if (localHash && localHash !== serverHash) {
                    console.log("[PWA Update] Server service worker bytecode changed! Update ready.");
                    setUpdateAvailable(true);
                } else if (!localHash) {
                    localStorage.setItem(localHashKey, serverHash);
                }
            } catch (e) {
                console.debug("PWA build check skipped:", e);
            }
        };

        checkByteDifference();
        const checkInterval = setInterval(checkByteDifference, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(checkInterval);
        };
    }, []);

    const languages = [
        { code: 'en', name: 'English (US)', flag: '🇺🇸' },
        { code: 'es', name: 'Español (ES)', flag: '🇪🇸' },
        { code: 'jp', name: '日本語 (JP)', flag: '🇯🇵' },
        { code: 'ru', name: 'Русский (RU)', flag: '🇷🇺' },
    ];

    const handleLanguageChange = async (code) => {
        setLanguage(code);
        if (!user) return;

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('PreferredLanguage', code);
            
            const response = await API.Users.updateProfile(formData, user?.id || user?.Id);
            if (response.data?.user) {
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            showNotification("SYNC_COMPLETE", `${t('INTERFACE_RECALIBRATED')} ${code.toUpperCase()}.`, "success");
        } catch (error) {
            console.error("Failed to sync language preference:", error);
            showNotification("SYNC_FAILURE", "Failed to persist language choice to core.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleIdentitySubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('Username', username);
            formData.append('Biography', biography);
            formData.append('ResidentSectorId', String(residentSectorId));
            formData.append('ThemeColor', themeColor);
            formData.append('TextColor', textColor);
            formData.append('BackgroundColor', backgroundColor);
            formData.append('SecondaryColor', secondaryColor);
            formData.append('IsGlass', String(isGlass));
            formData.append('StatusMessage', statusMessage);

            if (pfpFile) formData.append('ProfilePicture', pfpFile);
            if (bannerFile) formData.append('Banner', bannerFile);
            if (videoFile) formData.append('WallpaperVideo', videoFile);
            if (monitorFile) formData.append('MonitorImage', monitorFile);
            if (clearMonitor) formData.append('ClearMonitorImage', 'true');

            const response = await API.Users.updateProfile(formData, user?.id || user?.Id);
            if (response.data?.user) {
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                showNotification("IDENTITY_UPDATED", "Identity profile successfully synchronized with database.", "success");
            }
        } catch (error) {
            console.error("Failed to update profile:", error);
            showNotification("SYNC_FAILURE", "Failed to persist identity parameters.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEmailChangeSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('Email', email);

            const response = await API.Users.updateProfile(formData, user?.id || user?.Id);
            if (response.data?.user) {
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                showNotification("SECURITY_SYNC", "Email routing address updated.", "success");
            }
        } catch (error) {
            console.error("Failed to update email:", error);
            showNotification("SECURITY_FAILURE", "Failed to update email address.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChangeSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        if (newPassword !== confirmNewPassword) {
            showNotification("VALIDATION_ERROR", "New passwords do not match.", "error");
            return;
        }

        setIsSaving(true);
        try {
            await API.Auth.changePassword(currentPassword, newPassword);
            showNotification("SECURITY_SYNC", "Cybernetic access key successfully updated.", "success");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            console.error("Failed to change password:", error);
            const msg = error.response?.data?.message || error.response?.data || "Failed to update access key.";
            showNotification("SECURITY_FAILURE", String(msg), "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleForceUpdate = async () => {
        setIsSaving(true);
        showNotification("RECALIBRATING", "Purging local memory cache and unregistering network nodes...", "info");
        
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }
            
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (let name of cacheNames) {
                    await caches.delete(name);
                }
            }

            const token = localStorage.getItem('token');
            const userItem = localStorage.getItem('user');
            localStorage.clear();
            sessionStorage.clear();
            if (token) localStorage.setItem('token', token);
            if (userItem) localStorage.setItem('user', userItem);
            
            showNotification("SYNC_COMPLETE", "Recalibration complete. Reloading system matrix...", "success");
            
            setTimeout(() => {
                window.location.href = window.location.origin + '?u=' + Date.now();
            }, 1200);
        } catch (error) {
            console.error("Force Update Error:", error);
            showNotification("SYNC_FAILURE", "Recalibration failed. Please clear browser cache manually.", "error");
            setIsSaving(false);
        }
    };

    const handlePfpChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPfpFile(file);
            setPfpPreview(URL.createObjectURL(file));
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="space-y-2 border-b border-[#ff006e]/10 pb-6">
                <h1 className="text-3xl font-black italic text-white tracking-tighter uppercase">
                    {t('SYS_CONF')}
                </h1>
                <p className="text-[10px] mono text-white/30 uppercase tracking-[0.4em]">{t('CALIBRATING_SENSORS')}...</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Navigation Sidebar */}
                <div className="space-y-2 col-span-1">
                    <button 
                        type="button"
                        onClick={() => {
                            console.log("[SettingsView] Changing active section to: language");
                            setActiveSection('language');
                        }}
                        className={`w-full flex items-center justify-between p-4 transition-all group border ${
                            activeSection === 'language' 
                            ? 'bg-[#ff006e]/10 border-[#ff006e]/40 text-white' 
                            : 'border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Globe size={16} className={activeSection === 'language' ? "text-[#ff006e]" : ""} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('LANGUAGE')}</span>
                        </div>
                        <ChevronRight size={14} className={activeSection === 'language' ? "opacity-100 text-[#ff006e]" : "opacity-20"} />
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            console.log("[SettingsView] Changing active section to: identity");
                            setActiveSection('identity');
                        }}
                        className={`w-full flex items-center justify-between p-4 transition-all group border ${
                            activeSection === 'identity' 
                            ? 'bg-[#ff006e]/10 border-[#ff006e]/40 text-white' 
                            : 'border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <User size={16} className={activeSection === 'identity' ? "text-[#ff006e]" : ""} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('IDENTITY')}</span>
                        </div>
                        <ChevronRight size={14} className={activeSection === 'identity' ? "opacity-100 text-[#ff006e]" : "opacity-20"} />
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            console.log("[SettingsView] Changing active section to: security");
                            setActiveSection('security');
                        }}
                        className={`w-full flex items-center justify-between p-4 transition-all group border ${
                            activeSection === 'security' 
                            ? 'bg-[#ff006e]/10 border-[#ff006e]/40 text-white' 
                            : 'border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Shield size={16} className={activeSection === 'security' ? "text-[#ff006e]" : ""} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('SECURITY')}</span>
                        </div>
                        <ChevronRight size={14} className={activeSection === 'security' ? "opacity-100 text-[#ff006e]" : "opacity-20"} />
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            console.log("[SettingsView] Changing active section to: notifications");
                            setActiveSection('notifications');
                        }}
                        className={`w-full flex items-center justify-between p-4 transition-all group border ${
                            activeSection === 'notifications' 
                            ? 'bg-[#ff006e]/10 border-[#ff006e]/40 text-white' 
                            : 'border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Bell size={16} className={activeSection === 'notifications' ? "text-[#ff006e]" : ""} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('NOTIFICATIONS')}</span>
                        </div>
                        <ChevronRight size={14} className={activeSection === 'notifications' ? "opacity-100 text-[#ff006e]" : "opacity-20"} />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="md:col-span-3 space-y-6">
                    <AnimatePresence mode="wait">
                        {activeSection === 'language' && (
                            <motion.div 
                                key="language"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="bg-black/40 border border-white/5 p-6 space-y-6">
                                    <div className="space-y-1">
                                        <h2 className="text-xs font-black text-[#ff006e] uppercase tracking-widest">{t('INTERFACE_LANGUAGE')}</h2>
                                        <p className="text-[9px] text-white/20 uppercase tracking-widest">{t('WAITING_INPUT')}</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {languages.map((lang) => (
                                            <button
                                                key={lang.code}
                                                disabled={isSaving}
                                                onClick={() => handleLanguageChange(lang.code)}
                                                className={`relative flex items-center justify-between p-4 border transition-all group ${
                                                    language === lang.code 
                                                    ? 'border-[#ff006e] bg-[#ff006e]/5 text-white' 
                                                    : 'border-white/5 bg-white/[0.02] text-white/40 hover:border-white/20'
                                                } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{lang.flag}</span>
                                                    <div className="flex flex-col items-start">
                                                        <span className="text-[10px] font-black uppercase tracking-tight">{lang.name}</span>
                                                        <span className="text-[7px] mono opacity-40 uppercase tracking-widest">Region_{lang.code.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                                {language === lang.code && (
                                                    <div className="w-5 h-5 bg-[#ff006e] flex items-center justify-center rounded-full shadow-[0_0_10px_#ff006e]">
                                                        <Check size={12} className="text-black" strokeWidth={4} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5">
                                            <div className="p-2 bg-[#ff006e]/10 text-[#ff006e]">
                                                <Globe size={16} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] text-white/60 uppercase leading-relaxed tracking-wider">
                                                    {t('BIO_SYNC')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeSection === 'identity' && (
                            <motion.div 
                                key="identity"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                            >
                                <form onSubmit={handleIdentitySubmit} className="bg-black/40 border border-white/5 p-6 space-y-6">
                                    <div className="space-y-1 border-b border-white/5 pb-4">
                                        <h2 className="text-xs font-black text-[#ff006e] uppercase tracking-widest">{t('MODIFY_IDENTITY')}</h2>
                                        <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-mono">CORE_IDENTITY_MGMT</p>
                                    </div>

                                    {/* Profile Image Preview & Select */}
                                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                                        <div className="relative w-24 h-24 border border-white/10 overflow-hidden bg-black flex items-center justify-center group">
                                            {pfpPreview || user?.profilePictureUrl ? (
                                                <img 
                                                    src={pfpPreview || user?.profilePictureUrl} 
                                                    alt="Avatar Preview" 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                                />
                                            ) : (
                                                <User size={32} className="text-white/20" />
                                            )}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer">
                                                <span className="text-[8px] font-black uppercase text-[#ff006e] tracking-wider">REPLACE</span>
                                            </div>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handlePfpChange}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-[#ff006e]">AVATAR_SIGNAL</label>
                                            <p className="text-[9px] text-white/40 leading-relaxed uppercase tracking-wider font-mono">
                                                Upload custom jpeg/png format neural representation. Maximum size recommended: 2MB.
                                            </p>
                                            <div className="relative inline-block">
                                                <button type="button" className="px-3 py-1.5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-[#ff006e] transition-all">
                                                    CHOOSE IMAGE
                                                </button>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handlePfpChange}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Name & Status */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Display Name</label>
                                            <input 
                                                type="text" 
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-[#ff006e] outline-none font-mono uppercase tracking-wider"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Uplink Status Msg</label>
                                            <input 
                                                type="text" 
                                                value={statusMessage}
                                                onChange={(e) => setStatusMessage(e.target.value)}
                                                className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-[#ff006e] outline-none font-mono uppercase tracking-wider"
                                            />
                                        </div>
                                    </div>

                                    {/* Biography */}
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Biography Buffer</label>
                                        <textarea 
                                            rows={3}
                                            value={biography}
                                            onChange={(e) => setBiography(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-[#ff006e] outline-none font-mono uppercase tracking-wider leading-relaxed"
                                        />
                                    </div>

                                    {/* Resident Sector */}
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Resident Sector Grid</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {SECTORS.map((sector) => (
                                                <button
                                                    key={sector.id}
                                                    type="button"
                                                    onClick={() => setResidentSectorId(sector.id)}
                                                    className={`p-3 border text-left transition-all relative ${
                                                        residentSectorId === sector.id 
                                                        ? 'bg-white/5 border-white text-white' 
                                                        : 'border-white/5 text-white/30 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sector.color }} />
                                                        {sector.name}
                                                    </div>
                                                    <div className="text-[7px] text-white/20 font-mono mt-1 uppercase tracking-tight">{sector.desc}</div>
                                                    {residentSectorId === sector.id && (
                                                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white animate-pulse" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Personalization (Colors) */}
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <h3 className="text-[9px] font-black text-[#ff006e] uppercase tracking-widest">Interface Theme Colors</h3>
                                        
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[7px] font-black uppercase tracking-widest text-white/40">Theme Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={themeColor}
                                                        onChange={(e) => setThemeColor(e.target.value)}
                                                        className="w-8 h-8 bg-transparent border-0 cursor-pointer"
                                                    />
                                                    <span className="text-[8px] font-mono text-white/60 uppercase">{themeColor}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[7px] font-black uppercase tracking-widest text-white/40">Secondary Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={secondaryColor}
                                                        onChange={(e) => setSecondaryColor(e.target.value)}
                                                        className="w-8 h-8 bg-transparent border-0 cursor-pointer"
                                                    />
                                                    <span className="text-[8px] font-mono text-white/60 uppercase">{secondaryColor}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[7px] font-black uppercase tracking-widest text-white/40">Background Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={backgroundColor}
                                                        onChange={(e) => setBackgroundColor(e.target.value)}
                                                        className="w-8 h-8 bg-transparent border-0 cursor-pointer"
                                                    />
                                                    <span className="text-[8px] font-mono text-white/60 uppercase">{backgroundColor}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[7px] font-black uppercase tracking-widest text-white/40">Text Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={textColor}
                                                        onChange={(e) => setTextColor(e.target.value)}
                                                        className="w-8 h-8 bg-transparent border-0 cursor-pointer"
                                                    />
                                                    <span className="text-[8px] font-mono text-white/60 uppercase">{textColor}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 border border-white/5 bg-white/[0.01]">
                                            <div className="space-y-0.5">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-white">Glassmorphism UI Engine</span>
                                                <p className="text-[7px] font-mono text-white/30 uppercase tracking-widest">Enables glass background-blur effects across subsystems</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsGlass(!isGlass)}
                                                className={`w-10 h-5 border transition-all flex items-center p-0.5 ${
                                                    isGlass ? 'border-[#ff006e] bg-[#ff006e]/20' : 'border-white/10 bg-transparent'
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 transition-all ${
                                                    isGlass ? 'translate-x-5 bg-[#ff006e]' : 'translate-x-0 bg-white/40'
                                                }`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Asset Node Uploads */}
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <h3 className="text-[9px] font-black text-[#ff006e] uppercase tracking-widest">Digital Asset Uplink</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="space-y-1.5 border border-white/5 p-3 bg-white/[0.01]">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Banner Layer</label>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={(e) => setBannerFile(e.target.files[0])}
                                                    className="w-full text-[8px] text-white/40 file:bg-white/5 file:border-white/10 file:text-white/60 file:text-[8px] file:font-black file:uppercase file:py-1.5 file:px-3 file:mr-2 hover:file:bg-[#ff006e]/20 hover:file:border-[#ff006e]/40"
                                                />
                                            </div>
                                            <div className="space-y-1.5 border border-white/5 p-3 bg-white/[0.01]">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Wallpaper Video</label>
                                                <input 
                                                    type="file" 
                                                    accept="video/*"
                                                    onChange={(e) => setVideoFile(e.target.files[0])}
                                                    className="w-full text-[8px] text-white/40 file:bg-white/5 file:border-white/10 file:text-white/60 file:text-[8px] file:font-black file:uppercase file:py-1.5 file:px-3 file:mr-2 hover:file:bg-[#ff006e]/20 hover:file:border-[#ff006e]/40"
                                                />
                                            </div>
                                            <div className="space-y-1.5 border border-white/5 p-3 bg-white/[0.01] relative">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Monitor Background</label>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    disabled={clearMonitor}
                                                    onChange={(e) => setMonitorFile(e.target.files[0])}
                                                    className="w-full text-[8px] text-white/40 file:bg-white/5 file:border-white/10 file:text-white/60 file:text-[8px] file:font-black file:uppercase file:py-1.5 file:px-3 file:mr-2 hover:file:bg-[#ff006e]/20 hover:file:border-[#ff006e]/40 disabled:opacity-30"
                                                />
                                                <div className="mt-2 flex items-center justify-between">
                                                    <span className="text-[7px] font-mono text-white/40 uppercase">Clear Current Monitor Image</span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setClearMonitor(!clearMonitor)}
                                                        className={`p-1 border text-[7px] font-black uppercase transition-all ${
                                                            clearMonitor ? 'border-red-500 text-red-400 bg-red-500/10' : 'border-white/10 text-white/30'
                                                        }`}
                                                    >
                                                        {clearMonitor ? "CLEAR ACTIVE" : "KEEP"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-6 border-t border-white/5 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="px-6 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all bg-[#ff006e] text-black shadow-[0_0_25px_rgba(255,0,110,0.4)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95 disabled:opacity-40 disabled:cursor-wait"
                                        >
                                            {isSaving ? "SYNCING..." : "[ COMMIT_CHANGES ]"}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {activeSection === 'security' && (
                            <motion.div 
                                key="security"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <form onSubmit={handlePasswordChangeSubmit} className="bg-black/40 border border-white/5 p-6 space-y-6">
                                    <div className="space-y-1 border-b border-white/5 pb-4">
                                        <h2 className="text-xs font-black text-[#ff006e] uppercase tracking-widest">{t('SECURITY')}</h2>
                                        <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-mono">SECURITY_PROTOCOLS</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Primary Routing Address (Email)</label>
                                            <div className="flex gap-4">
                                                <input 
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                    className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-[#ff006e] outline-none font-mono uppercase tracking-wider"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={isSaving || email === (user?.email || user?.Email)}
                                                    onClick={handleEmailChangeSubmit}
                                                    className="px-6 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all bg-white/5 text-white hover:bg-white/10 hover:border-white/30 active:scale-95 disabled:opacity-40 disabled:cursor-wait shrink-0 border border-white/10"
                                                >
                                                    [ UPDATE_EMAIL ]
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1 border-b border-white/5 pt-4 pb-4">
                                        <h3 className="text-[10px] font-black text-white/80 uppercase tracking-widest">ACCESS KEY OVERRIDE</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Current Security Key</label>
                                            <div className="relative">
                                                <input 
                                                    type={showCurrentPassword ? "text" : "password"}
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    required
                                                    className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-[#ff006e] outline-none font-mono uppercase tracking-wider pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white"
                                                >
                                                    {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-white/60">New Access Key</label>
                                                <div className="relative">
                                                    <input 
                                                        type={showNewPassword ? "text" : "password"}
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        required
                                                        className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-[#ff006e] outline-none font-mono uppercase tracking-wider pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white"
                                                    >
                                                        {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Confirm New Access Key</label>
                                                <input 
                                                    type="password"
                                                    value={confirmNewPassword}
                                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                    required
                                                    className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-[#ff006e] outline-none font-mono uppercase tracking-wider"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-6 border-t border-white/5 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="px-6 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all bg-[#ff006e] text-black shadow-[0_0_25px_rgba(255,0,110,0.4)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95 disabled:opacity-40 disabled:cursor-wait"
                                        >
                                            {isSaving ? "UPDATING KEY..." : "[ RECALIBRATE_KEY ]"}
                                        </button>
                                    </div>
                                </form>

                                {/* Terminal Telemetry */}
                                <div className="bg-black/40 border border-white/5 p-6 space-y-4">
                                    <h3 className="text-[9px] font-black text-[#ff006e] uppercase tracking-widest">System Telemetry</h3>
                                    <div className="grid grid-cols-2 gap-4 text-[8px] mono text-white/40 uppercase tracking-widest">
                                        <div className="border border-white/5 p-3 bg-white/[0.01] space-y-1">
                                            <div className="text-white/20">SYSTEM ID NODE</div>
                                            <div className="text-white">0x{user?.id?.toString().slice(0, 8).toUpperCase() || 'ANON'}</div>
                                        </div>
                                        <div className="border border-white/5 p-3 bg-white/[0.01] space-y-1">
                                            <div className="text-white/20">LOCALE SYNC</div>
                                            <div className="text-white">{language.toUpperCase()} // ACTIVE</div>
                                        </div>
                                        <div className="border border-white/5 p-3 bg-white/[0.01] space-y-1">
                                            <div className="text-white/20">REGISTRATION DATE</div>
                                            <div className="text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</div>
                                        </div>
                                        <div className="border border-white/5 p-3 bg-white/[0.01] space-y-1">
                                            <div className="text-white/20">CREDIT BALANCE</div>
                                            <div className="text-white text-[#ff006e]">{user?.creditsBalance || user?.CreditsBalance || 0} CR</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeSection === 'notifications' && (
                            <motion.div 
                                key="notifications"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="bg-black/40 border border-white/5 p-6 space-y-6">
                                    <div className="space-y-1 border-b border-white/5 pb-4">
                                        <h2 className="text-xs font-black text-[#ff006e] uppercase tracking-widest">{t('NOTIFICATIONS')}</h2>
                                        <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-mono">NOTIFICATION_PREFERENCES</p>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Toggle 1: Sound Alerts */}
                                        <div className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.01]">
                                            <div className="space-y-1 flex items-start gap-3">
                                                <Volume2 size={16} className="text-[#ff006e] mt-0.5" />
                                                <div>
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-white">Interface Audio Cues</span>
                                                    <p className="text-[7px] font-mono text-white/30 uppercase tracking-widest">Enables audio signal hums on notifications</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSoundAlerts(!soundAlerts);
                                                    showNotification("AUDIO_STATE_MODIFIED", `Sound Alerts ${!soundAlerts ? "ONLINE" : "MUTED"}`, "info");
                                                }}
                                                className={`w-10 h-5 border transition-all flex items-center p-0.5 ${
                                                    soundAlerts ? 'border-[#ff006e] bg-[#ff006e]/20' : 'border-white/10 bg-transparent'
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 transition-all ${
                                                    soundAlerts ? 'translate-x-5 bg-[#ff006e]' : 'translate-x-0 bg-white/40'
                                                }`} />
                                            </button>
                                        </div>

                                        {/* Toggle 2: Visual Flash */}
                                        <div className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.01]">
                                            <div className="space-y-1 flex items-start gap-3">
                                                <Zap size={16} className="text-[#ff006e] mt-0.5" />
                                                <div>
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-white">Visual Matrix Flashes</span>
                                                    <p className="text-[7px] font-mono text-white/30 uppercase tracking-widest">Flash screen borders on key notifications</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setVisualFlash(!visualFlash);
                                                    showNotification("MATRIX_FLASH_UPDATED", `Visual flashing ${!visualFlash ? "ENABLED" : "DISABLED"}`, "info");
                                                }}
                                                className={`w-10 h-5 border transition-all flex items-center p-0.5 ${
                                                    visualFlash ? 'border-[#ff006e] bg-[#ff006e]/20' : 'border-white/10 bg-transparent'
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 transition-all ${
                                                    visualFlash ? 'translate-x-5 bg-[#ff006e]' : 'translate-x-0 bg-white/40'
                                                }`} />
                                            </button>
                                        </div>


                                        {/* Toggle 4: Tip Alerts */}
                                        <div className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.01]">
                                            <div className="space-y-1 flex items-start gap-3">
                                                <Check size={16} className="text-[#ff006e] mt-0.5" />
                                                <div>
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-white">Tip Resonances</span>
                                                    <p className="text-[7px] font-mono text-white/30 uppercase tracking-widest">Trigger notification banner whenever credits are received</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTipAlerts(!tipAlerts);
                                                    showNotification("TIP_ALERT_SYNC", `Tip Resonance Alerts ${!tipAlerts ? "ONLINE" : "MUTED"}`, "info");
                                                }}
                                                className={`w-10 h-5 border transition-all flex items-center p-0.5 ${
                                                    tipAlerts ? 'border-[#ff006e] bg-[#ff006e]/20' : 'border-white/10 bg-transparent'
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 transition-all ${
                                                    tipAlerts ? 'translate-x-5 bg-[#ff006e]' : 'translate-x-0 bg-white/40'
                                                }`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Duration Slider */}
                                    <div className="pt-6 border-t border-white/5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-white">Notification Persist Duration</span>
                                            <span className="text-[9px] font-mono text-[#ff006e] font-black">{notificationDuration}S</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="2" 
                                            max="15" 
                                            value={notificationDuration}
                                            onChange={(e) => setNotificationDuration(parseInt(e.target.value, 10))}
                                            className="w-full h-1 bg-white/10 appearance-none outline-none accent-[#ff006e]"
                                        />
                                        <div className="flex justify-between text-[6px] mono text-white/20 uppercase tracking-widest">
                                            <span>2 Seconds</span>
                                            <span>15 Seconds</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Dedicated Programmatic Force Update Card */}
                    <div className={`border p-6 space-y-4 relative overflow-hidden transition-all duration-700 ${
                        updateAvailable 
                        ? 'border-[#ff006e] bg-[#ff006e]/5 shadow-[0_0_35px_rgba(255,0,110,0.12),inset_0_0_15px_rgba(255,0,110,0.05)]' 
                        : 'border-white/5 bg-black/40 shadow-[0_0_15px_rgba(255,0,110,0.01)]'
                    }`}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#ff006e]/5 to-transparent pointer-events-none" />
                        <div className="space-y-1">
                            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity size={14} className={`text-[#ff006e] ${updateAvailable ? 'animate-bounce' : 'animate-pulse opacity-40'}`} />
                                [ SYSTEM_FORCE_UPDATE ]
                                {updateAvailable && (
                                    <span className="ml-2 text-[7px] font-black bg-[#ff006e] text-black px-1.5 py-0.5 rounded-sm animate-pulse tracking-widest leading-none">
                                        UPDATE AVAILABLE
                                    </span>
                                )}
                            </h2>
                            <p className="text-[8px] text-white/30 uppercase tracking-[0.3em] font-mono">RECALIBRATE CORE SERVICE WORKER NODES</p>
                            <div className="flex items-center gap-2 mt-1">
                                {isOnline ? (
                                    <div className="flex items-center gap-1.5 text-green-500 text-[8px] uppercase tracking-wider font-mono bg-green-500/5 px-2 py-0.5 rounded border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                                        <Zap size={10} className="text-green-500 fill-green-500 animate-[pulse_1.5s_infinite]" />
                                        <span>CONNECTED // LISTENING FOR UPDATES (30S INTERVAL)</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-rose-500 text-[8px] uppercase tracking-wider font-mono bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/20">
                                        <AlertTriangle size={10} className="text-rose-500 fill-rose-500/20" />
                                        <span>DISCONNECTED // LISTENING PAUSED</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <p className="text-[9px] text-white/50 leading-relaxed uppercase tracking-wider font-mono">
                            {updateAvailable 
                                ? 'A newer version of the application shell has been detected on the network nodes! Apply recalibration to synchronize immediately.'
                                : 'Purges cached local application shell memory, unregisters all background service worker network layers, and re-fetches the absolute latest production deployment directly from the primary server.'
                            }
                        </p>

                        <div className="pt-2 flex justify-start">
                             <button 
                                 type="button"
                                 disabled={isSaving}
                                 onClick={handleForceUpdate}
                                 className={`px-6 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                     isSaving 
                                     ? 'bg-[#ff006e]/20 text-white/40 cursor-wait' 
                                     : updateAvailable 
                                       ? 'bg-[#ff006e] text-black shadow-[0_0_25px_rgba(255,0,110,0.4)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]'
                                       : 'bg-transparent border border-white/10 text-white/40 hover:text-white hover:border-[#ff006e] hover:bg-[#ff006e]/5 hover:shadow-[0_0_15px_rgba(255,0,110,0.1)]'
                                 }`}
                             >
                                 {isSaving 
                                     ? 'RECALIBRATING...' 
                                     : updateAvailable 
                                       ? 'INSTALL UPDATE NOW' 
                                       : 'RECALIBRATE & FORCE UPDATE'
                                 }
                             </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Tech Info */}
            <div className="flex items-center justify-between text-[7px] mono text-white/10 uppercase tracking-[0.4em] pt-12">
                <span>Kernel_Build: v4.2.0-STABLE</span>
                <span>Locale_Sync: {language.toUpperCase()} // ACTIVE</span>
                <span>Node_ID: 0x{user?.id?.toString().slice(0, 8).toUpperCase() || 'ANON'}</span>
            </div>
        </div>
    );
};

export default SettingsView;
