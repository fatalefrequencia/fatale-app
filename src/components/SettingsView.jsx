import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, User, Bell, ChevronRight, Check, Activity } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import API from '../services/api';

const SettingsView = ({ user, setUser }) => {
    const { language, setLanguage, t } = useLanguage();
    const { showNotification } = useNotification();
    const [isSaving, setIsSaving] = React.useState(false);

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
            formData.append('preferredLanguage', code);
            formData.append('preferred_language', code);
            
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

    const handleForceUpdate = async () => {
        setIsSaving(true);
        showNotification("RECALIBRATING", "Purging local memory cache and unregistering network nodes...", "info");
        
        try {
            // Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }
            
            // Delete all service worker caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (let name of cacheNames) {
                    await caches.delete(name);
                }
            }

            // Clear non-essential localStorage items but preserve login identity
            const token = localStorage.getItem('token');
            const userItem = localStorage.getItem('user');
            localStorage.clear();
            sessionStorage.clear();
            if (token) localStorage.setItem('token', token);
            if (userItem) localStorage.setItem('user', userItem);
            
            showNotification("SYNC_COMPLETE", "Recalibration complete. Reloading system matrix...", "success");
            
            // Hard reload with cache-busting timestamp
            setTimeout(() => {
                window.location.href = window.location.origin + '?u=' + Date.now();
            }, 1200);
        } catch (error) {
            console.error("Force Update Error:", error);
            showNotification("SYNC_FAILURE", "Recalibration failed. Please clear browser cache manually.", "error");
            setIsSaving(false);
        }
    };


    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="space-y-2 border-b border-[#ff006e]/10 pb-6">
                <h1 className="text-3xl font-black italic text-white tracking-tighter uppercase">
                    {t('SYS_CONF')}
                </h1>
                <p className="text-[10px] mono text-white/30 uppercase tracking-[0.4em]">{t('CALIBRATING_SENSORS')}...</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Navigation Sidebar (Inner) */}
                <div className="space-y-2">
                    <button className="w-full flex items-center justify-between p-4 bg-[#ff006e]/10 border border-[#ff006e]/40 text-white group">
                        <div className="flex items-center gap-3">
                            <Globe size={16} className="text-[#ff006e]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('LANGUAGE')}</span>
                        </div>
                        <ChevronRight size={14} className="opacity-40" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 border border-white/5 text-white/40 hover:bg-white/5 hover:text-white transition-all group">
                        <div className="flex items-center gap-3">
                            <User size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('IDENTITY')}</span>
                        </div>
                        <ChevronRight size={14} className="opacity-20" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 border border-white/5 text-white/40 hover:bg-white/5 hover:text-white transition-all group">
                        <div className="flex items-center gap-3">
                            <Shield size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('SECURITY')}</span>
                        </div>
                        <ChevronRight size={14} className="opacity-20" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 border border-white/5 text-white/40 hover:bg-white/5 hover:text-white transition-all group">
                        <div className="flex items-center gap-3">
                            <Bell size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('NOTIFICATIONS')}</span>
                        </div>
                        <ChevronRight size={14} className="opacity-20" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="md:col-span-2 space-y-6">
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

                    {/* Dedicated Programmatic Force Update Card */}
                    <div className="bg-black/40 border border-[#ff006e]/20 p-6 space-y-4 shadow-[0_0_35px_rgba(255,0,110,0.03)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#ff006e]/5 to-transparent pointer-events-none" />
                        <div className="space-y-1">
                            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <Activity size={14} className="text-[#ff006e] animate-pulse" />
                                [ SYSTEM_FORCE_UPDATE ]
                            </h2>
                            <p className="text-[8px] text-white/30 uppercase tracking-[0.3em] font-mono">RECALIBRATE CORE SERVICE WORKER NODES</p>
                        </div>
                        
                        <p className="text-[9px] text-white/50 leading-relaxed uppercase tracking-wider">
                            Purges cached local application shell memory, unregisters all background service worker network layers, and re-fetches the absolute latest production deployment directly from the primary server. Keeps your active session identity authenticated.
                        </p>

                        <div className="pt-2 flex justify-start">
                             <button 
                                 disabled={isSaving}
                                 onClick={handleForceUpdate}
                                 className={`px-6 py-2.5 bg-[#ff006e] text-black text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(255,0,110,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] active:scale-95 ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                             >
                                 {isSaving ? 'RECALIBRATING...' : 'RECALIBRATE & FORCE UPDATE'}
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
