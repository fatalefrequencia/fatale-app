import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Globe, Shield, User, Bell, ChevronRight, Check, Activity, Zap, 
    AlertTriangle, Lock, Eye, EyeOff, Save, Trash2, Volume2, Laptop, FileText 
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import API from '../services/api';
import { SECTORS } from '../constants';

export default function SettingsView({ user, setUser, appThemeColor, setAppThemeColor, appBackgroundColor, setAppBackgroundColor, lowSpecMode, setLowSpecMode }) {
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
    const [themeColor, setThemeColor] = React.useState(appThemeColor || '#ffffff');
    const [backgroundColor, setBackgroundColor] = React.useState(appBackgroundColor || '#000000');
    const [secondaryColor, setSecondaryColor] = React.useState(user?.secondaryColor || user?.SecondaryColor || '#00ffff');
    const [colorBorder, setColorBorder] = React.useState(user?.colorBorder || user?.ColorBorder || '#ff006e');
    const [colorLabel, setColorLabel] = React.useState(user?.colorLabel || user?.ColorLabel || '#ff00ff');
    const [colorDataPrimary, setColorDataPrimary] = React.useState(user?.colorDataPrimary || user?.ColorDataPrimary || '#00ffff');
    const [colorDataSecondary, setColorDataSecondary] = React.useState(user?.colorDataSecondary || user?.ColorDataSecondary || '#00ff00');
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

    // --- Journal Reading Custom Settings States ---
    const [journalBgColor, setJournalBgColor] = React.useState(() => localStorage.getItem('fatale_journal_bg_color') || '#020202');
    const [journalTextColor, setJournalTextColor] = React.useState(() => localStorage.getItem('fatale_journal_text_color') || '#ff7096');
    const [journalFont, setJournalFont] = React.useState(() => localStorage.getItem('fatale_journal_font') || 'SERIF');
    const [journalScale, setJournalScale] = React.useState(() => parseInt(localStorage.getItem('fatale_journal_scale') || '16', 10));

    React.useEffect(() => {
        localStorage.setItem('fatale_journal_bg_color', journalBgColor);
    }, [journalBgColor]);
    React.useEffect(() => {
        localStorage.setItem('fatale_journal_text_color', journalTextColor);
    }, [journalTextColor]);
    React.useEffect(() => {
        localStorage.setItem('fatale_journal_font', journalFont);
    }, [journalFont]);
    React.useEffect(() => {
        localStorage.setItem('fatale_journal_scale', String(journalScale));
    }, [journalScale]);

    React.useEffect(() => {
        if (user) {
            setUsername(user.username || user.Username || '');
            setBiography(user.biography || user.Biography || '');
            setResidentSectorId(user.residentSectorId || user.ResidentSectorId || 0);
            setThemeColor(user.themeColor || user.ThemeColor || '#ffffff');
            setBackgroundColor(user.backgroundColor || user.BackgroundColor || '#000000');
            setSecondaryColor(user.secondaryColor || user.SecondaryColor || 'rgb(var(--theme-secondary))');
            setColorBorder(user.colorBorder || user.ColorBorder || '#ff006e');
            setColorLabel(user.colorLabel || user.ColorLabel || '#ff00ff');
            setColorDataPrimary(user.colorDataPrimary || user.ColorDataPrimary || '#00ffff');
            setColorDataSecondary(user.colorDataSecondary || user.ColorDataSecondary || '#00ff00');
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
            formData.append('BackgroundColor', backgroundColor);
            formData.append('SecondaryColor', secondaryColor);
            formData.append('ColorBorder', colorBorder);
            formData.append('ColorLabel', colorLabel);
            formData.append('ColorDataPrimary', colorDataPrimary);
            formData.append('ColorDataSecondary', colorDataSecondary);
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
                
                // Update Local App Theme
                setAppThemeColor(themeColor);
                localStorage.setItem('appThemeColor', themeColor);
                setAppBackgroundColor(backgroundColor);
                localStorage.setItem('appBackgroundColor', backgroundColor);
                
                // Set CSS Variables directly so changes reflect instantly
                document.documentElement.style.setProperty('--color-border', colorBorder);
                document.documentElement.style.setProperty('--color-label', colorLabel);
                document.documentElement.style.setProperty('--color-data-primary', colorDataPrimary);
                document.documentElement.style.setProperty('--color-data-secondary', colorDataSecondary);
                
                showNotification("IDENTITY_UPDATED", "Identity profile and interface theme successfully synchronized.", "success");
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
            <div className="space-y-2 border-b border-fatale/10 pb-6">
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
                            ? 'bg-fatale/10 border-fatale/40 text-white' 
                            : 'border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Globe size={16} className={activeSection === 'language' ? "text-fatale" : ""} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('LANGUAGE')}</span>
                        </div>
                        <ChevronRight size={14} className={activeSection === 'language' ? "opacity-100 text-fatale" : "opacity-20"} />
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            console.log("[SettingsView] Changing active section to: identity");
                            setActiveSection('identity');
                        }}
                        className={`w-full flex items-center justify-between p-4 transition-all group border ${
                            activeSection === 'identity' 
                            ? 'bg-fatale/10 border-fatale/40 text-white' 
                            : 'border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Laptop size={16} className={activeSection === 'identity' ? "text-fatale" : ""} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('APPEARANCE') || 'Appearance'}</span>
                        </div>
                        <ChevronRight size={14} className={activeSection === 'identity' ? "opacity-100 text-fatale" : "opacity-20"} />
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            console.log("[SettingsView] Changing active section to: security");
                            setActiveSection('security');
                        }}
                        className={`w-full flex items-center justify-between p-4 transition-all group border ${
                            activeSection === 'security' 
                            ? 'bg-fatale/10 border-fatale/40 text-white' 
                            : 'border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Shield size={16} className={activeSection === 'security' ? "text-fatale" : ""} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('SECURITY')}</span>
                        </div>
                        <ChevronRight size={14} className={activeSection === 'security' ? "opacity-100 text-fatale" : "opacity-20"} />
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            console.log("[SettingsView] Changing active section to: notifications");
                            setActiveSection('notifications');
                        }}
                        className={`w-full flex items-center justify-between p-4 transition-all group border ${
                            activeSection === 'notifications' 
                            ? 'bg-fatale/10 border-fatale/40 text-white' 
                            : 'border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Bell size={16} className={activeSection === 'notifications' ? "text-fatale" : ""} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('NOTIFICATIONS')}</span>
                        </div>
                        <ChevronRight size={14} className={activeSection === 'notifications' ? "opacity-100 text-fatale" : "opacity-20"} />
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            console.log("[SettingsView] Changing active section to: privacy");
                            setActiveSection('privacy');
                        }}
                        className={`w-full flex items-center justify-between p-4 transition-all group border ${
                            activeSection === 'privacy' 
                            ? 'bg-fatale/10 border-fatale/40 text-white' 
                            : 'border-white/5 text-white/40 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <FileText size={16} className={activeSection === 'privacy' ? "text-fatale" : ""} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('PRIVACY_POLICY') || 'Privacy Policy'}</span>
                        </div>
                        <ChevronRight size={14} className={activeSection === 'privacy' ? "opacity-100 text-fatale" : "opacity-20"} />
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
                                        <h2 className="text-xs font-black text-fatale uppercase tracking-widest">{t('INTERFACE_LANGUAGE')}</h2>
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
                                                    ? 'border-fatale bg-fatale/5 text-white' 
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
                                                    <div className="w-5 h-5 bg-fatale flex items-center justify-center rounded-full shadow-[0_0_10px_rgb(var(--theme-primary))]">
                                                        <Check size={12} className="text-black" strokeWidth={4} />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5">
                                            <div className="p-2 bg-fatale/10 text-fatale">
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
                                        <h2 className="text-xs font-black text-fatale uppercase tracking-widest">APPEARANCE & THEMES</h2>
                                        <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-mono">UI_PERSONALIZATION_MATRIX</p>
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

                                    {/* System Performance (Low Spec Mode) */}
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <h3 className="text-[9px] font-black text-fatale uppercase tracking-widest">System Performance</h3>
                                        <div className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.01]">
                                            <div className="space-y-1 flex items-start gap-3">
                                                <Zap size={16} className="text-fatale mt-0.5" />
                                                <div>
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-white">Performance Mode (Low Spec)</span>
                                                    <p className="text-[7px] font-mono text-white/30 uppercase tracking-widest">Disables intensive 3D globe, animations, blur effects, and glows for older CPUs/GPUs</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextVal = !lowSpecMode;
                                                    setLowSpecMode(nextVal);
                                                    showNotification("PERF_MODE_UPDATED", `Performance Mode (Low Spec) ${nextVal ? "ENABLED" : "DISABLED"}`, "info");
                                                }}
                                                className={`w-10 h-5 border transition-all flex items-center p-0.5 ${
                                                    lowSpecMode ? 'border-fatale bg-fatale/20' : 'border-white/10 bg-transparent'
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 transition-all ${
                                                    lowSpecMode ? 'translate-x-5 bg-fatale' : 'translate-x-0 bg-white/40'
                                                }`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Journal Reading Custom Settings */}
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <h3 className="text-[9px] font-black text-fatale uppercase tracking-widest">Journal Reading Settings (Custom Mode)</h3>
                                        <div className="p-4 border border-white/5 bg-white/[0.01] space-y-4">
                                            <p className="text-[7px] font-mono text-white/30 uppercase tracking-widest">Configure typography parameters used when CUSTOM mode is selected in the log reader.</p>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                                                <div className="space-y-1.5">
                                                    <label className="text-[7px] font-black uppercase tracking-widest text-white/40">Custom Background</label>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="color" 
                                                            value={journalBgColor}
                                                            onChange={(e) => setJournalBgColor(e.target.value)}
                                                            className="w-8 h-8 bg-transparent border-0 cursor-pointer"
                                                        />
                                                        <span className="text-[8px] font-mono text-white/60 uppercase">{journalBgColor}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[7px] font-black uppercase tracking-widest text-white/40">Custom Text Color</label>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="color" 
                                                            value={journalTextColor}
                                                            onChange={(e) => setJournalTextColor(e.target.value)}
                                                            className="w-8 h-8 bg-transparent border-0 cursor-pointer"
                                                        />
                                                        <span className="text-[8px] font-mono text-white/60 uppercase">{journalTextColor}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[7px] font-black uppercase tracking-widest text-white/40">Default Font Face</label>
                                                    <select
                                                        value={journalFont}
                                                        onChange={(e) => setJournalFont(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/10 px-2 py-1.5 text-[10px] text-white mono focus:outline-none focus:border-fatale/50"
                                                    >
                                                        <option value="SERIF">SERIF (BOOK STYLE)</option>
                                                        <option value="SANS">SANS (MODERN STYLE)</option>
                                                        <option value="MONO">MONO (TERMINAL STYLE)</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[7px] font-black uppercase tracking-widest text-white/40">Default Font Scale</label>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="range"
                                                            min="12"
                                                            max="26"
                                                            step="2"
                                                            value={journalScale}
                                                            onChange={(e) => setJournalScale(parseInt(e.target.value, 10))}
                                                            className="w-2/3 accent-fatale cursor-pointer"
                                                        />
                                                        <span className="text-[9px] font-mono text-white/70 font-bold">{journalScale}PX</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personalization (Colors) */}
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <h3 className="text-[9px] font-black text-fatale uppercase tracking-widest">Interface Theme Colors</h3>
                                        
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
                                                <label className="text-[7px] font-black uppercase tracking-widest text-white/40 flex flex-col">
                                                    <span>Secondary Accent</span>
                                                    <span className="text-[6px] normal-case opacity-60">For the rotating globe</span>
                                                </label>
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
                                            {/* BORDER COLOR */}
                                            <div className="space-y-1.5">
                                                <label className="text-[7px] font-black uppercase tracking-widest text-white/40 flex flex-col">
                                                    <span>Border Hue</span>
                                                    <span className="text-[6px] normal-case opacity-60">For panels, tables, dividers</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={colorBorder}
                                                        onChange={e => setColorBorder(e.target.value)}
                                                        className="w-8 h-8 bg-transparent border-0 cursor-pointer"
                                                    />
                                                    <span className="text-[8px] font-mono text-white/60 uppercase">{colorBorder}</span>
                                                </div>
                                            </div>

                                            {/* LABEL COLOR */}
                                            <div className="space-y-1.5">
                                                <label className="text-[7px] font-black uppercase tracking-widest text-white/40 flex flex-col">
                                                    <span>Label Hue</span>
                                                    <span className="text-[6px] normal-case opacity-60">For column headers/static text</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={colorLabel}
                                                        onChange={e => setColorLabel(e.target.value)}
                                                        className="w-8 h-8 bg-transparent border-0 cursor-pointer"
                                                    />
                                                    <span className="text-[8px] font-mono text-white/60 uppercase">{colorLabel}</span>
                                                </div>
                                            </div>

                                            {/* DATA PRIMARY COLOR */}
                                            <div className="space-y-1.5">
                                                <label className="text-[7px] font-black uppercase tracking-widest text-white/40 flex flex-col">
                                                    <span>Primary Data Hue</span>
                                                    <span className="text-[6px] normal-case opacity-60">For main content or names</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={colorDataPrimary}
                                                        onChange={e => setColorDataPrimary(e.target.value)}
                                                        className="w-8 h-8 bg-transparent border-0 cursor-pointer"
                                                    />
                                                    <span className="text-[8px] font-mono text-white/60 uppercase">{colorDataPrimary}</span>
                                                </div>
                                            </div>

                                            {/* DATA SECONDARY COLOR */}
                                            <div className="space-y-1.5">
                                                <label className="text-[7px] font-black uppercase tracking-widest text-white/40 flex flex-col">
                                                    <span>Secondary Data Hue</span>
                                                    <span className="text-[6px] normal-case opacity-60">For numbers, stats, secondary</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={colorDataSecondary}
                                                        onChange={e => setColorDataSecondary(e.target.value)}
                                                        className="w-8 h-8 bg-transparent border-0 cursor-pointer"
                                                    />
                                                    <span className="text-[8px] font-mono text-white/60 uppercase">{colorDataSecondary}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-1.5">
                                                <label className="text-[7px] font-black uppercase tracking-widest text-white/40">Background Color</label>
                                                <div className="flex items-center gap-2 opacity-50">
                                                    <div className="w-8 h-8 bg-black border border-white/20" />
                                                    <span className="text-[8px] font-mono text-white/60 uppercase">#000000 (LOCKED)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>



                                    {/* Asset Node Uploads */}
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <h3 className="text-[9px] font-black text-fatale uppercase tracking-widest">Digital Asset Uplink</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="space-y-1.5 border border-white/5 p-3 bg-white/[0.01]">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Banner Layer</label>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={(e) => setBannerFile(e.target.files[0])}
                                                    className="w-full text-[8px] text-white/40 file:bg-white/5 file:border-white/10 file:text-white/60 file:text-[8px] file:font-black file:uppercase file:py-1.5 file:px-3 file:mr-2 hover:file:bg-fatale/20 hover:file:border-fatale/40"
                                                />
                                            </div>
                                            <div className="space-y-1.5 border border-white/5 p-3 bg-white/[0.01]">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Wallpaper Video</label>
                                                <input 
                                                    type="file" 
                                                    accept="video/*"
                                                    onChange={(e) => setVideoFile(e.target.files[0])}
                                                    className="w-full text-[8px] text-white/40 file:bg-white/5 file:border-white/10 file:text-white/60 file:text-[8px] file:font-black file:uppercase file:py-1.5 file:px-3 file:mr-2 hover:file:bg-fatale/20 hover:file:border-fatale/40"
                                                />
                                            </div>
                                            <div className="space-y-1.5 border border-white/5 p-3 bg-white/[0.01] relative">
                                                <label className="text-[8px] font-black uppercase tracking-widest text-white/60">Monitor Background</label>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    disabled={clearMonitor}
                                                    onChange={(e) => setMonitorFile(e.target.files[0])}
                                                    className="w-full text-[8px] text-white/40 file:bg-white/5 file:border-white/10 file:text-white/60 file:text-[8px] file:font-black file:uppercase file:py-1.5 file:px-3 file:mr-2 hover:file:bg-fatale/20 hover:file:border-fatale/40 disabled:opacity-30"
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
                                            className="px-6 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all bg-fatale text-black shadow-[0_0_25px_rgba(var(--theme-primary-rgb),0.4)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95 disabled:opacity-40 disabled:cursor-wait"
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
                                        <h2 className="text-xs font-black text-fatale uppercase tracking-widest">{t('SECURITY')}</h2>
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
                                                    className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-fatale outline-none font-mono uppercase tracking-wider"
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
                                                    className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-fatale outline-none font-mono uppercase tracking-wider pr-10"
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
                                                        className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-fatale outline-none font-mono uppercase tracking-wider pr-10"
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
                                                    className="w-full bg-black/50 border border-white/10 p-3 text-[10px] text-white focus:border-fatale outline-none font-mono uppercase tracking-wider"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-6 border-t border-white/5 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="px-6 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all bg-fatale text-black shadow-[0_0_25px_rgba(var(--theme-primary-rgb),0.4)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95 disabled:opacity-40 disabled:cursor-wait"
                                        >
                                            {isSaving ? "UPDATING KEY..." : "[ RECALIBRATE_KEY ]"}
                                        </button>
                                    </div>
                                </form>

                                {/* Terminal Telemetry */}
                                <div className="bg-black/40 border border-white/5 p-6 space-y-4">
                                    <h3 className="text-[9px] font-black text-fatale uppercase tracking-widest">System Telemetry</h3>
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
                                            <div className="text-white text-fatale">{user?.creditsBalance || user?.CreditsBalance || 0} CR</div>
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
                                        <h2 className="text-xs font-black text-fatale uppercase tracking-widest">{t('NOTIFICATIONS')}</h2>
                                        <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-mono">NOTIFICATION_PREFERENCES</p>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Toggle 1: Sound Alerts */}
                                        <div className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.01]">
                                            <div className="space-y-1 flex items-start gap-3">
                                                <Volume2 size={16} className="text-fatale mt-0.5" />
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
                                                    soundAlerts ? 'border-fatale bg-fatale/20' : 'border-white/10 bg-transparent'
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 transition-all ${
                                                    soundAlerts ? 'translate-x-5 bg-fatale' : 'translate-x-0 bg-white/40'
                                                }`} />
                                            </button>
                                        </div>

                                        {/* Toggle 2: Visual Flash */}
                                        <div className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.01]">
                                            <div className="space-y-1 flex items-start gap-3">
                                                <Zap size={16} className="text-fatale mt-0.5" />
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
                                                    visualFlash ? 'border-fatale bg-fatale/20' : 'border-white/10 bg-transparent'
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 transition-all ${
                                                    visualFlash ? 'translate-x-5 bg-fatale' : 'translate-x-0 bg-white/40'
                                                }`} />
                                            </button>
                                        </div>


                                        {/* Toggle 4: Tip Alerts */}
                                        <div className="flex items-center justify-between p-4 border border-white/5 bg-white/[0.01]">
                                            <div className="space-y-1 flex items-start gap-3">
                                                <Check size={16} className="text-fatale mt-0.5" />
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
                                                    tipAlerts ? 'border-fatale bg-fatale/20' : 'border-white/10 bg-transparent'
                                                }`}
                                            >
                                                <div className={`w-3.5 h-3.5 transition-all ${
                                                    tipAlerts ? 'translate-x-5 bg-fatale' : 'translate-x-0 bg-white/40'
                                                }`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Duration Slider */}
                                    <div className="pt-6 border-t border-white/5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-white">Notification Persist Duration</span>
                                            <span className="text-[9px] font-mono text-fatale font-black">{notificationDuration}S</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="2" 
                                            max="15" 
                                            value={notificationDuration}
                                            onChange={(e) => setNotificationDuration(parseInt(e.target.value, 10))}
                                            className="w-full h-1 bg-white/10 appearance-none outline-none accent-fatale"
                                        />
                                        <div className="flex justify-between text-[6px] mono text-white/20 uppercase tracking-widest">
                                            <span>2 Seconds</span>
                                            <span>15 Seconds</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {activeSection === 'privacy' && (
                            <motion.div 
                                key="privacy"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="bg-black/40 border border-white/5 p-6 space-y-6">
                                    <div className="space-y-1 border-b border-white/5 pb-4">
                                        <h2 className="text-xs font-black text-fatale uppercase tracking-widest">{t('PRIVACY_POLICY') || 'PRIVACY POLICY & TERMS OF SERVICE (EULA)'}</h2>
                                        <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-mono">LEGAL_COMPLIANCE_PROTOCOL</p>
                                    </div>

                                    <div className="space-y-4 text-[11px] font-mono text-white/70 leading-relaxed uppercase tracking-wider">
                                        <div className="border border-white/5 p-4 bg-white/[0.01] space-y-2">
                                            <div className="text-[10px] font-black text-fatale">// 1. ZERO GEOLOCATION & IP BUFFERS</div>
                                            <p className="text-[9px] text-white/50">
                                                FATALE DOES NOT LOG, STORE, OR TRANSMIT ANY GEOLOCATED IP ADDRESS INFORMATION. WE HAVE COMPLETELY DECOUPLED ALL GEOLOCALIZATION MATRIX LAYERS TO PREVENT STALKING, PHYSICAL TRACKING, AND DOCKING THREATS. USER IP PRIVACY IS SAFEGUARDED BY MULTIPLE LAYERS OF ROUTING PROXIES.
                                            </p>
                                        </div>

                                        <div className="border border-white/5 p-4 bg-white/[0.01] space-y-2">
                                            <div className="text-[10px] font-black text-fatale">// 2. STAGE & AUDIO STREAM TRANSMISSION PROTECTION</div>
                                            <p className="text-[9px] text-white/50">
                                                ALL REAL-TIME BROADCASTS (RADIO STATIONS, AUDIO STREAMS) UTILIZE END-TO-END SYSTEM RELAY CHANNELS. WE STRICTLY DISABLE NATIVE PEER-TO-PEER IP LEAKS. THERE IS ABSOLUTELY NO METHOD FOR ARBITRARY CLIENT NODES TO DISCOVER YOUR PUBLIC IP ADDRESS THROUGH TURN/STUN BACKWORK HOOKS.
                                            </p>
                                        </div>

                                        <div className="border border-white/5 p-4 bg-white/[0.01] space-y-2">
                                            <div className="text-[10px] font-black text-fatale">// 3. DECENTRALIZED CURATION (BLOCK & MUTE MATRIX)</div>
                                            <p className="text-[9px] text-white/50">
                                                YOU HAVE THE INHERENT RIGHTS OF NODE CURATION. BLOCKING A TARGET USER REMOVES THEIR BROADCAST TRANSMISSIONS, FEED POSTS, REPOSTS, AND DIRECT SIGNALS FROM YOUR HUD SCREEN IMMEDIATELY. THEY ARE SILENTLY DISCONNECTED FROM YOUR FREQUENCY.
                                            </p>
                                        </div>

                                        <div className="border-t border-white/5 pt-4 my-2 text-[10px] font-black text-fatale tracking-[0.2em]">// TERMS OF SERVICE & EULA DOCUMENTATION</div>

                                        <div className="border border-white/5 p-4 bg-white/[0.01] space-y-2">
                                            <div className="text-[10px] font-black text-fatale">// 4. MUSIC & CONTENT COPYRIGHT LICENSE</div>
                                            <p className="text-[9px] text-white/50">
                                                YOU RETAIN SOLE AND ABSOLUTE OWNERSHIP OF ALL MUSIC, AUDIO TRACKS, COVER ARTWORK, AND JOURNAL ENTRIES TRANSMITTED FROM YOUR NODE. BY UPLOADING CONTENT, YOU GRANT FATALE A WORLDWIDE, NON-EXCLUSIVE, ROYALTY-FREE LICENSE TO BROADCAST, CONVERT, AND STREAM YOUR FREQUENCY TO PEER NODES WITHIN THE APPLICABLE BOUNDS OF THE SYSTEM.
                                            </p>
                                        </div>

                                        <div className="border border-white/5 p-4 bg-white/[0.01] space-y-2">
                                            <div className="text-[10px] font-black text-fatale">// 5. SYSTEM CREDIT & ECONOMY CORE RULES</div>
                                            <p className="text-[9px] text-white/50">
                                                FATALE UTILIZES SYSTEM CREDITS FOR PEER-TO-PEER TIPPING, SUBSCRIPTIONS, AND TRANSMISSION BANDWIDTH ENHANCEMENT. ALL TRANSACTIONS RECORDED ON THE LEDGER ARE FINAL. CREDITS ARE NON-REFUNDABLE AND ARE BOUND EXCLUSIVELY TO YOUR UNIQUE CRYPTOGRAPHIC NODE ACCOUNT.
                                            </p>
                                        </div>

                                        <div className="border border-white/5 p-4 bg-white/[0.01] space-y-2">
                                            <div className="text-[10px] font-black text-fatale">// 6. RIGHT TO BE FORGOTTEN (NODE DELETION)</div>
                                            <p className="text-[9px] text-white/50">
                                                YOUR SOVEREIGN RIGHT TO BE FORGOTTEN IS CODIFIED IN THE SYSTEM FIRMWARE. USERS CAN INITIATE A COMPLETE NODE DELETION REQUEST DIRECTLY THROUGH THE SETTINGS INTERFACE. UPON EXECUTION, ALL ACCOUNT CREDENTIALS, PROFILE IMAGES, UPLOADED AUDIO FILES, AND SOCIAL DATA RECORDED IN THE COGNITIVE REPOSITORY WILL BE PERMANENTLY WIPED.
                                            </p>
                                            <p className="text-[9px] text-white/50">
                                                HOWEVER, ANY OTHER USER NODE WHO HAS PURCHASED A PERMANENT LICENSE OR OFF-LINE LISTENING RIGHTS TO YOUR TRANSMITTED MEDIA PRIOR TO DELETION RETAINS THE RIGHT TO KEEP, STREAM, AND LISTEN TO THAT DATA IN THEIR LOCAL VAULT. DELETION PREVENTS NEW DISCOVERIES AND REMOVES THE CONTENT FROM GENERAL FEEDS, BUT DOES NOT VOID PREVIOUSLY ACQUIRED PEER LICENSES.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Dedicated Programmatic Force Update Card */}
                    <div className={`border p-6 space-y-4 relative overflow-hidden transition-all duration-700 ${
                        updateAvailable 
                        ? 'border-fatale bg-fatale/5 shadow-[0_0_35px_rgba(var(--theme-primary-rgb),0.12),inset_0_0_15px_rgba(var(--theme-primary-rgb),0.05)]' 
                        : 'border-white/5 bg-black/40 shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.01)]'
                    }`}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-fatale/5 to-transparent pointer-events-none" />
                        <div className="space-y-1">
                            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity size={14} className={`text-fatale ${updateAvailable ? 'animate-bounce' : 'animate-pulse opacity-40'}`} />
                                [ SYSTEM_FORCE_UPDATE ]
                                {updateAvailable && (
                                    <span className="ml-2 text-[7px] font-black bg-fatale text-black px-1.5 py-0.5 rounded-sm animate-pulse tracking-widest leading-none">
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
                                     ? 'bg-fatale/20 text-white/40 cursor-wait' 
                                     : updateAvailable 
                                       ? 'bg-fatale text-black shadow-[0_0_25px_rgba(var(--theme-primary-rgb),0.4)] hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]'
                                       : 'bg-transparent border border-white/10 text-white/40 hover:text-white hover:border-fatale hover:bg-fatale/5 hover:shadow-[0_0_15px_rgba(var(--theme-primary-rgb),0.1)]'
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


