import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ChevronRight, AlertCircle, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import API from '../services/api';
import loginBg from '../assets/login_bg.png';
import { API_BASE_URL } from '../constants';

const AuthView = ({ onLoginSuccess, onBackToOrbit, deferredPrompt, onInstall }) => {
    const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
        setDesktopDownloadUrl('https://github.com/fatalefrequencia/FataleCore/releases/download/v1.0.0/fatale-desktop.zip');

        // Check if URL contains a reset token
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
        const token = params.get('token');
        if (token) {
            setResetToken(token);
            setActiveTab('reset');
        }
    }, []);

    // Form States
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Typewriter
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [blinkCount, setBlinkCount] = useState(0);
    const [showCursor, setShowCursor] = useState(true);
    const fullText = "fatale.fm";

    useEffect(() => {
        let timer;
        if (blinkCount > 0) {
            timer = setTimeout(() => {
                setShowCursor(prev => !prev);
                setBlinkCount(prev => prev - 1);
            }, 350);
            return () => clearTimeout(timer);
        }
        if (!isDeleting && displayText === fullText) {
            setShowCursor(true);
            setBlinkCount(6);
            setIsDeleting(true);
            return;
        }
        if (isDeleting && displayText === '') {
            timer = setTimeout(() => {
                setIsDeleting(false);
                setShowCursor(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
        const speed = isDeleting ? 80 : 150;
        timer = setTimeout(() => {
            if (!isDeleting) {
                setDisplayText(fullText.substring(0, displayText.length + 1));
            } else {
                setDisplayText(fullText.substring(0, displayText.length - 1));
            }
        }, speed);
        return () => clearTimeout(timer);
    }, [displayText, isDeleting, blinkCount]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
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

            const rawUser = response.data.user || response.data;
            const uid = rawUser?.id || rawUser?.Id || rawUser?.userId || rawUser?.UserId || response.data.userId || response.data.id;
            const finalUser = {
                ...(rawUser || {}),
                id: uid,
                username: rawUser?.username || rawUser?.Username || formData.username,
                email: rawUser?.email || rawUser?.Email || formData.email || 'user@system.local'
            };

            if (onLoginSuccess) {
                onLoginSuccess({ token: response.data.token, user: finalUser });
            }
        } catch (err) {
            let msg = 'Connection failed';
            if (err.response) {
                const data = err.response.data;
                if (typeof data === 'string') msg = data;
                else if (data?.message) msg = data.message;
                else if (data?.title) msg = data.title;
                else if (data?.error) msg = data.inner ? `${data.error} (Details: ${data.inner})` : data.error;
                else msg = `Server Error (${err.response.status})`;
            } else if (err.message) {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await API.Auth.forgotPassword(forgotEmail);
            setSuccess('If that email exists, a reset link has been sent. Check your inbox.');
            setForgotEmail('');
        } catch (err) {
            setError('Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await API.Auth.resetPassword(resetToken, newPassword);
            setSuccess('Password updated successfully. You can now log in.');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                setActiveTab('login');
                setSuccess('');
                // Clear token from URL
                window.history.replaceState(null, '', window.location.pathname);
            }, 2000);
        } catch (err) {
            const data = err.response?.data;
            setError(data?.message || 'Invalid or expired reset link. Please request a new one.');
        } finally {
            setLoading(false);
        }
    };

    const customStyles = `
      .login-red-theme {
        --theme-primary: 255 0 60 !important;
        --theme-primary-rgb: 255, 0, 60 !important;
        --text-color: rgb(255, 0, 60) !important;
        --theme-color: rgb(255, 0, 60) !important;
      }
      @keyframes cyberPulse {
        0%, 100% { box-shadow: 0 0 15px rgba(255, 0, 60, 0.15), inset 0 0 15px rgba(255, 0, 60, 0.05); }
        50% { box-shadow: 0 0 30px rgba(255, 0, 60, 0.35), inset 0 0 20px rgba(255, 0, 60, 0.12); }
      }
      .crt-text-glow {
        color: #ff003c;
        text-shadow: 
          0 0 2px rgba(255, 0, 60, 0.95), 
          0 0 8px rgba(255, 0, 60, 0.75), 
          0 0 15px rgba(255, 0, 60, 0.4);
      }
      .crt-cursor-glow {
        color: #ff003c;
        text-shadow: 
          0 0 2px rgba(255, 0, 60, 0.95), 
          0 0 10px rgba(255, 0, 60, 0.8), 
          0 0 18px rgba(255, 0, 60, 0.55);
      }
      .corner-bracket::before {
        content: '';
        position: absolute;
        top: -1px;
        left: -1px;
        width: 16px;
        height: 16px;
        border-top: 2px solid #ff003c;
        border-left: 2px solid #ff003c;
        z-index: 10;
        pointer-events: none;
        filter: drop-shadow(0 0 3px rgba(255, 0, 60, 0.6));
      }
      .corner-bracket::after {
        content: '';
        position: absolute;
        top: -1px;
        right: -1px;
        width: 16px;
        height: 16px;
        border-top: 2px solid #ff003c;
        border-right: 2px solid #ff003c;
        z-index: 10;
        pointer-events: none;
        filter: drop-shadow(0 0 3px rgba(255, 0, 60, 0.6));
      }
      .corner-bracket-bottom::before {
        content: '';
        position: absolute;
        bottom: -1px;
        left: -1px;
        width: 16px;
        height: 16px;
        border-bottom: 2px solid #ff003c;
        border-left: 2px solid #ff003c;
        z-index: 10;
        pointer-events: none;
        filter: drop-shadow(0 0 3px rgba(255, 0, 60, 0.6));
      }
      .corner-bracket-bottom::after {
        content: '';
        position: absolute;
        bottom: -1px;
        right: -1px;
        width: 16px;
        height: 16px;
        border-bottom: 2px solid #ff003c;
        border-right: 2px solid #ff003c;
        z-index: 10;
        pointer-events: none;
        filter: drop-shadow(0 0 3px rgba(255, 0, 60, 0.6));
      }
    `;

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative bg-[#020202] overflow-hidden font-mono text-fatale login-red-theme tui-crt tui-flicker">
            <style>{customStyles}</style>

            <div
                className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-1000 z-0 opacity-40 filter grayscale contrast-125"
                style={{ backgroundImage: `url(${loginBg})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/90 to-[#020202] pointer-events-none z-0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_30%,_rgba(10,0,0,0.95)_100%)] pointer-events-none z-0 mix-blend-multiply" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,0,60,0.1)_0%,_transparent_75%)] animate-pulse pointer-events-none z-0" />
            
            {/* Retro scanline & glass filter */}
            <div className="tui-scanlines" />
            <div className="tui-red-crt-overlay" />

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="z-10 w-full max-w-[420px] relative"
            >
                {/* Header with Typewriter "fatale.fm" */}
                <div className="text-center mb-6 h-12 flex items-center justify-center">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-widest text-[#ff003c] drop-shadow-[0_0_10px_#ff003c] font-mono lowercase crt-text-glow">
                        {displayText}
                        <span className={`crt-cursor-glow ${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-75 font-normal ml-0.5`}>_</span>
                    </h1>
                </div>

                <div
                    className="bg-black/90 border border-fatale/35 rounded-sm overflow-hidden shadow-[0_0_25px_rgba(255,0,60,0.15)] relative backdrop-blur-xl corner-bracket corner-bracket-bottom"
                    style={{ animation: 'cyberPulse 6s infinite' }}
                >
                    <AnimatePresence mode="wait">

                        {/* ── FORGOT PASSWORD VIEW ── */}
                        {activeTab === 'forgot' && (
                            <motion.div
                                key="forgot"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-fatale/25 bg-black/40">
                                    <button
                                        onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
                                        className="text-fatale/50 hover:text-fatale transition-colors"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-fatale/80">
                                        RESET_PASSWORD
                                    </span>
                                </div>

                                <div className="p-6 space-y-4">
                                    <p className="text-[10px] text-fatale/60 uppercase tracking-widest leading-relaxed">
                                        Enter your email address and we'll transmit a reset link to your frequency.
                                    </p>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="p-3 bg-red-950/40 border border-red-500/50 rounded-sm flex items-start gap-3 text-red-400 text-xs"
                                            >
                                                <AlertCircle size={16} className="mt-0.5 shrink-0 animate-bounce" />
                                                <p>{error}</p>
                                            </motion.div>
                                        )}
                                        {success && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="p-3 bg-green-950/40 border border-green-500/50 rounded-sm text-green-400 text-xs"
                                            >
                                                <p className="font-black uppercase tracking-widest text-[9px] text-green-500 mb-1">SIGNAL_TRANSMITTED</p>
                                                <p>{success}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <form onSubmit={handleForgotPassword} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-fatale/75 pl-1">EMAIL ADDRESS</label>
                                            <div className="relative group">
                                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fatale/40 group-focus-within:text-fatale transition-colors" />
                                                <input
                                                    type="email"
                                                    placeholder="Enter your email"
                                                    value={forgotEmail}
                                                    onChange={(e) => { setForgotEmail(e.target.value); setError(''); }}
                                                    required
                                                    className="w-full bg-black/60 border border-fatale/25 rounded-sm py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-fatale focus:shadow-[0_0_15px_rgba(255,0,60,0.3)] transition-all placeholder:text-fatale/25"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-fatale/10 group-focus-within:bg-fatale rounded-full transition-all" />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-fatale hover:bg-white text-black font-black py-3.5 rounded-sm transition-all flex items-center justify-center gap-2.5 uppercase tracking-[0.12em] text-xs shadow-[0_0_20px_rgba(255,0,60,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? <Loader2 size={16} className="animate-spin" /> : '[ TRANSMIT_RESET_LINK ]'}
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {/* ── RESET PASSWORD VIEW ── */}
                        {activeTab === 'reset' && (
                            <motion.div
                                key="reset"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-fatale/25 bg-black/40">
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-fatale/80">
                                        NEW_PASSWORD
                                    </span>
                                </div>

                                <div className="p-6 space-y-4">
                                    <p className="text-[10px] text-fatale/60 uppercase tracking-widest leading-relaxed">
                                        Enter your new password below.
                                    </p>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="p-3 bg-red-950/40 border border-red-500/50 rounded-sm flex items-start gap-3 text-red-400 text-xs"
                                            >
                                                <AlertCircle size={16} className="mt-0.5 shrink-0 animate-bounce" />
                                                <p>{error}</p>
                                            </motion.div>
                                        )}
                                        {success && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="p-3 bg-green-950/40 border border-green-500/50 rounded-sm text-green-400 text-xs"
                                            >
                                                <p className="font-black uppercase tracking-widest text-[9px] text-green-500 mb-1">PASSWORD_UPDATED</p>
                                                <p>{success}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <form onSubmit={handleResetPassword} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-fatale/75 pl-1">NEW PASSWORD</label>
                                            <div className="relative group">
                                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fatale/40 group-focus-within:text-fatale transition-colors" />
                                                <input
                                                    type="password"
                                                    placeholder="Min. 6 characters"
                                                    value={newPassword}
                                                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                                                    required
                                                    className="w-full bg-black/60 border border-fatale/25 rounded-sm py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-fatale focus:shadow-[0_0_15px_rgba(255,0,60,0.3)] transition-all placeholder:text-fatale/25"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-fatale/10 group-focus-within:bg-fatale rounded-full transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-fatale/75 pl-1">CONFIRM PASSWORD</label>
                                            <div className="relative group">
                                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fatale/40 group-focus-within:text-fatale transition-colors" />
                                                <input
                                                    type="password"
                                                    placeholder="Repeat new password"
                                                    value={confirmPassword}
                                                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                                    required
                                                    className="w-full bg-black/60 border border-fatale/25 rounded-sm py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-fatale focus:shadow-[0_0_15px_rgba(255,0,60,0.3)] transition-all placeholder:text-fatale/25"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-fatale/10 group-focus-within:bg-fatale rounded-full transition-all" />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-fatale hover:bg-white text-black font-black py-3.5 rounded-sm transition-all flex items-center justify-center gap-2.5 uppercase tracking-[0.12em] text-xs shadow-[0_0_20px_rgba(255,0,60,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? <Loader2 size={16} className="animate-spin" /> : '[ UPDATE_PASSWORD ]'}
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {/* ── LOGIN / REGISTER VIEW ── */}
                        {(activeTab === 'login' || activeTab === 'register') && (
                            <motion.div
                                key="auth"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="flex border-b border-fatale/25 bg-black/40">
                                    <button
                                        onClick={() => { setActiveTab('login'); setError(''); }}
                                        type="button"
                                        className={`flex-1 py-3.5 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'login' ? 'text-black bg-fatale font-black' : 'text-fatale/60 hover:text-fatale hover:bg-fatale/5'}`}
                                    >
                                        {activeTab === 'login' && <div className="absolute inset-0 bg-fatale/20 blur-sm" />}
                                        <span className="relative z-10">[ LOGIN ]</span>
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('register'); setError(''); }}
                                        type="button"
                                        className={`flex-1 py-3.5 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'register' ? 'text-black bg-fatale font-black' : 'text-fatale/60 hover:text-fatale hover:bg-fatale/5'}`}
                                    >
                                        {activeTab === 'register' && <div className="absolute inset-0 bg-fatale/20 blur-sm" />}
                                        <span className="relative z-10">[ CREATE ACCOUNT ]</span>
                                    </button>
                                </div>

                                <div className="p-6 relative z-10">
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <AnimatePresence mode="wait">
                                            {error && (
                                                <motion.div
                                                    key="error-message"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="p-3 bg-red-950/40 border border-red-500/50 rounded-sm flex items-start gap-3 text-red-400 text-xs font-mono"
                                                >
                                                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500 animate-bounce" />
                                                    <div className="space-y-1">
                                                        <p className="font-black uppercase tracking-widest text-[9px] text-red-500">AUTHENTICATION ERROR</p>
                                                        <p className="opacity-90">{error}</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-fatale/75 pl-1">USERNAME</label>
                                            <div className="relative group">
                                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fatale/40 group-focus-within:text-fatale transition-colors" />
                                                <input
                                                    type="text"
                                                    name="username"
                                                    placeholder="Enter Username"
                                                    value={formData.username}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-black/60 border border-fatale/25 rounded-sm py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-fatale focus:shadow-[0_0_15px_rgba(255,0,60,0.3)] transition-all placeholder:text-fatale/25"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-fatale/10 group-focus-within:bg-fatale rounded-full transition-all" />
                                            </div>
                                        </div>

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
                                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-fatale/75 pl-1">EMAIL ADDRESS</label>
                                                        <div className="relative group">
                                                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fatale/40 group-focus-within:text-fatale transition-colors" />
                                                            <input
                                                                type="email"
                                                                name="email"
                                                                placeholder="Enter Email Address"
                                                                value={formData.email}
                                                                onChange={handleChange}
                                                                required
                                                                className="w-full bg-black/60 border border-fatale/25 rounded-sm py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-fatale focus:shadow-[0_0_15px_rgba(255,0,60,0.3)] transition-all placeholder:text-fatale/25"
                                                            />
                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-fatale/10 group-focus-within:bg-fatale rounded-full transition-all" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-fatale/75 pl-1">PASSWORD</label>
                                            <div className="relative group">
                                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fatale/40 group-focus-within:text-fatale transition-colors" />
                                                <input
                                                    type="password"
                                                    name="password"
                                                    placeholder="Enter Password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-black/60 border border-fatale/25 rounded-sm py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-fatale focus:shadow-[0_0_15px_rgba(255,0,60,0.3)] transition-all placeholder:text-fatale/25"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-fatale/10 group-focus-within:bg-fatale rounded-full transition-all" />
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-fatale hover:bg-white text-black font-black py-3.5 rounded-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 uppercase tracking-[0.12em] text-xs shadow-[0_0_20px_rgba(255,0,60,0.4)] hover:shadow-[0_0_25px_rgba(255,255,255,0.45)] disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent hover:border-fatale/40"
                                            >
                                                {loading ? (
                                                    <Loader2 size={16} className="animate-spin text-black" />
                                                ) : (
                                                    <>
                                                        <span>{activeTab === 'login' ? '[ LOGIN ]' : '[ CREATE ACCOUNT ]'}</span>
                                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform text-black" />
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {activeTab === 'login' && (
                                            <div className="text-center pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setActiveTab('forgot'); setError(''); setSuccess(''); }}
                                                    className="text-[9px] uppercase font-bold text-fatale/50 hover:text-fatale tracking-[0.2em] transition-colors"
                                                >
                                                    Forgot Password?
                                                </button>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="bg-fatale/5 p-3 text-center border-t border-fatale/20 flex items-center justify-center gap-2">
                        <ShieldCheck size={12} className="text-fatale/45 animate-pulse" />
                        <p className="text-[8px] text-fatale/50 uppercase tracking-[0.22em] font-black">
                            PROTECTED BY CYBERSEC v9.0
                        </p>
                    </div>
                </div>

                {deferredPrompt && (
                    <div className="w-full mt-4 bg-black/90 border border-fatale/35 rounded-sm p-4 text-center shadow-[0_0_20px_rgba(255,0,60,0.15)] backdrop-blur-xl relative corner-bracket corner-bracket-bottom flex flex-col items-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 text-white">[ INSTALL_SYSTEM_SHELL ]</div>
                        <p className="text-[9px] text-fatale/70 leading-relaxed mb-3.5 uppercase tracking-wider max-w-[340px]">
                            Download Fatale directly to your device for standalone immersive HUD execution and faster loading times.
                        </p>
                        <button
                            onClick={handleInstallApp}
                            type="button"
                            className="w-full bg-fatale hover:bg-white text-black font-black py-3 rounded-sm transition-all uppercase tracking-[0.15em] text-[10px] shadow-[0_0_15px_rgba(255,0,60,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                        >
                            INSTALL APP
                        </button>
                    </div>
                )}

                {isIOS && !isStandalone && (
                    <div className="w-full mt-4 bg-black/90 border border-fatale/35 rounded-sm p-4 text-center shadow-[0_0_20px_rgba(255,0,60,0.15)] backdrop-blur-xl relative corner-bracket corner-bracket-bottom flex flex-col items-center">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 text-white">[ INSTALL_SYSTEM_SHELL ]</div>
                        <p className="text-[9px] text-[#ff003c]/75 leading-relaxed uppercase tracking-wider max-w-[340px]">
                            To install on iOS: Tap <span className="text-white font-black">Share</span> at the bottom of Safari, then select <span className="text-white font-black">"Add to Home Screen"</span>.
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default AuthView;