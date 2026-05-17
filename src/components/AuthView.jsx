import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ChevronRight, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import API from '../services/api';
import loginBg from '../assets/login_bg.png';
import { API_BASE_URL } from '../constants';

const AuthView = ({ onLoginSuccess, onBackToOrbit, deferredPrompt, onInstall }) => {
    const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [shortcutHref, setShortcutHref] = useState('');
    const [desktopDownloadUrl, setDesktopDownloadUrl] = useState('');

    useEffect(() => {
        const checkIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const checkAndroid = /Android/.test(navigator.userAgent);
        const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        setIsIOS(checkIOS);
        setIsStandalone(!!checkStandalone);
        setIsDesktop(!checkIOS && !checkAndroid && !checkStandalone);

        const currentOrigin = window.location.origin;
        const shortcutContent = `[InternetShortcut]\r\nURL=${currentOrigin}\r\nIconIndex=0\r\n`;
        setShortcutHref(`data:application/octet-stream;base64,${btoa(shortcutContent)}`);

        // Desktop client hosted as a GitHub Release asset (2GB limit, CDN-backed, no server required)
        setDesktopDownloadUrl('https://github.com/fatalefrequencia/FataleCore/releases/download/v1.0.0/fatale-desktop.zip');
    }, []);

    // Form States
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    // Typewriter States for "fatale.fm" title animation
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [blinkCount, setBlinkCount] = useState(0);
    const [showCursor, setShowCursor] = useState(true);

    const fullText = "fatale.fm";

    useEffect(() => {
        let timer;
        
        // If we are in blinking phase
        if (blinkCount > 0) {
            timer = setTimeout(() => {
                setShowCursor(prev => !prev);
                setBlinkCount(prev => prev - 1);
            }, 350);
            return () => clearTimeout(timer);
        }

        // When fully typed
        if (!isDeleting && displayText === fullText) {
            setShowCursor(true);
            setBlinkCount(6); // Blink 6 times (3 complete cycles)
            setIsDeleting(true);
            return;
        }

        // When fully deleted
        if (isDeleting && displayText === '') {
            timer = setTimeout(() => {
                setIsDeleting(false);
                setShowCursor(true);
            }, 1000); // Pause before starting typing again
            return () => clearTimeout(timer);
        }

        // Typing and backspacing speeds
        const speed = isDeleting ? 80 : 150;
        
        timer = setTimeout(() => {
            if (!isDeleting) {
                // Type next character
                setDisplayText(fullText.substring(0, displayText.length + 1));
            } else {
                // Delete last character
                setDisplayText(fullText.substring(0, displayText.length - 1));
            }
        }, speed);

        return () => clearTimeout(timer);
    }, [displayText, isDeleting, blinkCount]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(''); // Clear error on type
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;
            if (activeTab === 'login') {
                response = await API.Auth.login({
                    username: formData.username,
                    password: formData.password
                });
            } else {
                response = await API.Auth.register({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password
                });
            }

            console.log('[AUTH] Backend Response:', response.data);

            const rawUser = response.data.user || response.data;
            const uid = rawUser?.id || rawUser?.Id || rawUser?.userId || rawUser?.UserId || response.data.userId || response.data.id;
            
            const finalUser = {
                ...(rawUser || {}),
                id: uid,
                username: rawUser?.username || rawUser?.Username || formData.username,
                email: rawUser?.email || rawUser?.Email || formData.email || 'user@system.local'
            };

            console.log('[AUTH] Final User Object:', finalUser);

            const finalAuthData = {
                token: response.data.token,
                user: finalUser
            };

            if (onLoginSuccess) {
                onLoginSuccess(finalAuthData);
            }

        } catch (err) {
            console.error('Auth Error:', err);

            let msg = 'Connection failed';

            if (err.response) {
                const data = err.response.data;
                if (typeof data === 'string') {
                    msg = data;
                } else if (data?.message) {
                    msg = data.message;
                } else if (data?.title) {
                    msg = data.title;
                } else if (data?.error) {
                    msg = data.inner ? `${data.error} (Details: ${data.inner})` : data.error;
                } else {
                    msg = `Server Error (${err.response.status})`;
                }
            } else if (err.message) {
                msg = err.message;
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Inject custom CSS styling with authentic CRT-glowing text shadow in deep raspberry red-pink (#d60036)
    const customStyles = `
      @keyframes cyberPulse {
        0%, 100% { box-shadow: 0 0 15px rgba(214, 0, 54, 0.15), inset 0 0 15px rgba(214, 0, 54, 0.05); }
        50% { box-shadow: 0 0 35px rgba(214, 0, 54, 0.32), inset 0 0 25px rgba(214, 0, 54, 0.12); }
      }
      .crt-text-glow {
        color: #d60036;
        text-shadow: 
          0 0 2px rgba(214, 0, 54, 0.95), 
          0 0 8px rgba(214, 0, 54, 0.75), 
          0 0 15px rgba(214, 0, 54, 0.5);
      }
      .crt-cursor-glow {
        color: #d60036;
        text-shadow: 
          0 0 2px rgba(214, 0, 54, 0.95), 
          0 0 10px rgba(214, 0, 54, 0.8), 
          0 0 18px rgba(214, 0, 54, 0.55);
      }
      .corner-bracket::before {
        content: '';
        position: absolute;
        top: -1px;
        left: -1px;
        width: 20px;
        height: 20px;
        border-top: 3px solid #d60036;
        border-left: 3px solid #d60036;
        z-index: 10;
        pointer-events: none;
        filter: drop-shadow(0 0 3px rgba(214, 0, 54, 0.6));
      }
      .corner-bracket::after {
        content: '';
        position: absolute;
        top: -1px;
        right: -1px;
        width: 20px;
        height: 20px;
        border-top: 3px solid #d60036;
        border-right: 3px solid #d60036;
        z-index: 10;
        pointer-events: none;
        filter: drop-shadow(0 0 3px rgba(214, 0, 54, 0.6));
      }
      .corner-bracket-bottom::before {
        content: '';
        position: absolute;
        bottom: -1px;
        left: -1px;
        width: 20px;
        height: 20px;
        border-bottom: 3px solid #d60036;
        border-left: 3px solid #d60036;
        z-index: 10;
        pointer-events: none;
        filter: drop-shadow(0 0 3px rgba(214, 0, 54, 0.6));
      }
      .corner-bracket-bottom::after {
        content: '';
        position: absolute;
        bottom: -1px;
        right: -1px;
        width: 20px;
        height: 20px;
        border-bottom: 3px solid #d60036;
        border-right: 3px solid #d60036;
        z-index: 10;
        pointer-events: none;
        filter: drop-shadow(0 0 3px rgba(214, 0, 54, 0.6));
      }
    `;

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative bg-[#020202] overflow-hidden font-mono text-[#d60036]">
            {/* Inject styled definitions */}
            <style>{customStyles}</style>

            {/* Immersive Gothic Background Image (Provided by User) */}
            <div 
                className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-1000 z-0"
                style={{ 
                    backgroundImage: `url(${loginBg})`,
                }}
            />

            {/* Dark, raspberry-tinted backdrop vignettes to push that underground dark web ambiance */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#d60036]/06 to-[#020202] pointer-events-none z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_rgba(10,0,0,0.85)_100%)] pointer-events-none z-0 mix-blend-multiply" />

            {/* Floating ambient radial raspberry-red glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(214,0,54,0.15)_0%,_transparent_75%)] animate-pulse pointer-events-none z-0" />

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="z-10 w-full max-w-[420px]"
            >
                {/* Header with CRT-glowing Typewriter "fatale.fm" */}
                <div className="text-center mb-6 h-12 flex items-center justify-center">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-widest font-mono lowercase crt-text-glow">
                        {displayText}
                        <span className={`crt-cursor-glow ${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-75 font-normal ml-0.5`}>|</span>
                    </h1>
                </div>

                {/* Main Cyber Terminal Card */}
                <div 
                    className="bg-black/85 border border-[#d60036]/35 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(214,0,54,0.22)] relative backdrop-blur-xl corner-bracket corner-bracket-bottom"
                    style={{ animation: 'cyberPulse 6s infinite' }}
                >
                    {/* Tabs / Subsystem selectors */}
                    <div className="flex border-b border-[#d60036]/25 bg-black/40">
                        <button
                            onClick={() => { setActiveTab('login'); setError(''); }}
                            type="button"
                            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'login' ? 'text-black bg-[#d60036]' : 'text-[#d60036]/60 hover:text-[#d60036] hover:bg-[#d60036]/5'}`}
                        >
                            {activeTab === 'login' && <div className="absolute inset-0 bg-[#d60036]/20 blur-sm" />}
                            <span className="relative z-10">LOGIN</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('register'); setError(''); }}
                            type="button"
                            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'register' ? 'text-black bg-[#d60036]' : 'text-[#d60036]/60 hover:text-[#d60036] hover:bg-[#d60036]/5'}`}
                        >
                            {activeTab === 'register' && <div className="absolute inset-0 bg-[#d60036]/20 blur-sm" />}
                            <span className="relative z-10">CREATE ACCOUNT</span>
                        </button>
                    </div>

                    {/* Interactive Form Area */}
                    <div className="p-6 relative z-10">
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Error Warning Block */}
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        key="error-message"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-400 text-xs font-mono"
                                    >
                                        <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500 animate-bounce" />
                                        <div className="space-y-1">
                                            <p className="font-black uppercase tracking-widest text-[9px] text-red-500">AUTHENTICATION ERROR</p>
                                            <p className="opacity-90">{error}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Username Input Field */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#d60036]/75 pl-1">USERNAME</label>
                                <div className="relative group">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d60036]/40 group-focus-within:text-[#d60036] transition-colors" />
                                    <input
                                        type="text"
                                        name="username"
                                        placeholder="Enter Username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-black/60 border border-[#d60036]/25 rounded-xl py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-[#d60036] focus:shadow-[0_0_15px_rgba(214,0,54,0.3)] transition-all placeholder:text-[#d60036]/25"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#d60036]/10 group-focus-within:bg-[#d60036] rounded-full transition-all" />
                                </div>
                            </div>

                            {/* Email Address Field (Only for Register) */}
                            <AnimatePresence mode="wait">
                                {activeTab === 'register' && (
                                    <motion.div
                                        key="email-field"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#d60036]/75 pl-1">EMAIL ADDRESS</label>
                                            <div className="relative group">
                                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d60036]/40 group-focus-within:text-[#d60036] transition-colors" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    placeholder="Enter Email Address"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-black/60 border border-[#d60036]/25 rounded-xl py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-[#d60036] focus:shadow-[0_0_15px_rgba(214,0,54,0.3)] transition-all placeholder:text-[#d60036]/25"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#d60036]/10 group-focus-within:bg-[#d60036] rounded-full transition-all" />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#d60036]/75 pl-1">PASSWORD</label>
                                <div className="relative group">
                                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d60036]/40 group-focus-within:text-[#d60036] transition-colors" />
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Enter Password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-black/60 border border-[#d60036]/25 rounded-xl py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-[#d60036] focus:shadow-[0_0_15px_rgba(214,0,54,0.3)] transition-all placeholder:text-[#d60036]/25"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#d60036]/10 group-focus-within:bg-[#d60036] rounded-full transition-all" />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#d60036] hover:bg-white text-black font-black py-3.5 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 uppercase tracking-[0.12em] text-xs shadow-[0_0_20px_rgba(214,0,54,0.4)] hover:shadow-[0_0_25px_rgba(255,255,255,0.45)] disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent hover:border-[#d60036]/40"
                                >
                                    {loading ? (
                                        <Loader2 size={16} className="animate-spin text-black" />
                                    ) : (
                                        <>
                                            <span>{activeTab === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}</span>
                                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform text-black" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {activeTab === 'login' && (
                                <div className="text-center pt-2">
                                    <button 
                                        type="button" 
                                        className="text-[9px] uppercase font-bold text-[#d60036]/50 hover:text-[#d60036] tracking-[0.2em] transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Security Signature Footer */}
                    <div className="bg-[#d60036]/5 p-3 text-center border-t border-[#d60036]/20 flex items-center justify-center gap-2">
                        <ShieldCheck size={12} className="text-[#d60036]/45 animate-pulse" />
                        <p className="text-[8px] text-[#d60036]/50 uppercase tracking-[0.22em] font-black">
                            PROTECTED BY CYBERSEC v9.0
                        </p>
                    </div>
                </div>

                {/* Render PWA Prompts INSIDE the motion.div container to ensure perfect rendering constraints */}
                {deferredPrompt && (
                    <div className="w-full mt-4 bg-black/85 border border-[#d60036]/35 rounded-2xl p-4 text-center shadow-[0_0_20px_rgba(214,0,54,0.15)] backdrop-blur-xl relative corner-bracket corner-bracket-bottom flex flex-col items-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 text-white">
                            [ INSTALL_SYSTEM_SHELL ]
                        </div>
                        <p className="text-[9px] text-[#d60036]/70 leading-relaxed mb-3.5 uppercase tracking-wider max-w-[340px]">
                            Download Fatale directly to your device for standalone immersive HUD execution and faster loading times.
                        </p>
                        <button
                            onClick={onInstall}
                            type="button"
                            className="w-full bg-[#d60036] hover:bg-white text-black font-black py-3 rounded-xl transition-all uppercase tracking-[0.15em] text-[10px] shadow-[0_0_15px_rgba(214,0,54,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                        >
                            INSTALL APP
                        </button>
                    </div>
                )}

                {isIOS && !isStandalone && (
                    <div className="w-full mt-4 bg-black/85 border border-[#d60036]/35 rounded-2xl p-4 text-center shadow-[0_0_20px_rgba(214,0,54,0.15)] backdrop-blur-xl relative corner-bracket corner-bracket-bottom flex flex-col items-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 text-white">
                            [ INSTALL_SYSTEM_SHELL ]
                        </div>
                        <p className="text-[9px] text-[#d60035]/75 leading-relaxed uppercase tracking-wider max-w-[340px]">
                            To install on iOS: Tap <span className="text-white font-black">Share</span> at the bottom of Safari, then select <span className="text-white font-black">"Add to Home Screen"</span>.
                        </p>
                    </div>
                )}

                {!isStandalone && !deferredPrompt && !isIOS && (
                    <div className="w-full mt-4 bg-black/85 border border-[#d60036]/35 rounded-2xl p-4 text-center shadow-[0_0_20px_rgba(214,0,54,0.15)] backdrop-blur-xl relative corner-bracket corner-bracket-bottom flex flex-col items-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 text-white animate-pulse">
                            [ DESKTOP_SYSTEM_SHELL ]
                        </div>
                        <p className="text-[9px] text-[#d60036]/70 leading-relaxed mb-1 uppercase tracking-wider max-w-[340px]">
                            Run fatale as a high-performance, borderless desktop application directly on your workstation.
                        </p>
                        <a
                            href={desktopDownloadUrl}
                            download="fatale-desktop.zip"
                            className="mt-3.5 text-[9px] font-black uppercase tracking-[0.25em] text-[#d60036] hover:text-white transition-all duration-300 underline underline-offset-4 cursor-pointer hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]"
                        >
                            [ DOWNLOAD CLIENT TO DESKTOP ]
                        </a>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default AuthView;
