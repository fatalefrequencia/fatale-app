import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, User, Mail, Lock, ChevronRight, AlertCircle, Loader2, Cpu, ShieldCheck } from 'lucide-react';
import API from '../services/api';
import loginBg from '../assets/login_bg.png';

const AuthView = ({ onLoginSuccess }) => {
    const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form States
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

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

    // Inject custom CSS styling
    const customStyles = `
      @keyframes scanline {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(100%); }
      }
      @keyframes cyberPulse {
        0%, 100% { box-shadow: 0 0 15px rgba(255, 0, 110, 0.15), inset 0 0 15px rgba(255, 0, 110, 0.05); }
        50% { box-shadow: 0 0 35px rgba(255, 0, 110, 0.35), inset 0 0 25px rgba(255, 0, 110, 0.15); }
      }
      @keyframes laserSweep {
        0% { top: -10%; }
        100% { top: 110%; }
      }
      @keyframes flicker {
        0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% { opacity: 0.99; }
        20%, 21.999%, 63%, 63.999%, 65%, 69.999% { opacity: 0.45; }
      }
      .cyber-grid {
        background-size: 40px 40px;
        background-image: 
          linear-gradient(to right, rgba(255, 0, 110, 0.02) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 0, 110, 0.02) 1px, transparent 1px);
      }
      .corner-bracket::before {
        content: '';
        position: absolute;
        top: -1px;
        left: -1px;
        width: 20px;
        height: 20px;
        border-top: 3px solid #ff006e;
        border-left: 3px solid #ff006e;
        z-index: 10;
        pointer-events: none;
      }
      .corner-bracket::after {
        content: '';
        position: absolute;
        top: -1px;
        right: -1px;
        width: 20px;
        height: 20px;
        border-top: 3px solid #ff006e;
        border-right: 3px solid #ff006e;
        z-index: 10;
        pointer-events: none;
      }
      .corner-bracket-bottom::before {
        content: '';
        position: absolute;
        bottom: -1px;
        left: -1px;
        width: 20px;
        height: 20px;
        border-bottom: 3px solid #ff006e;
        border-left: 3px solid #ff006e;
        z-index: 10;
        pointer-events: none;
      }
      .corner-bracket-bottom::after {
        content: '';
        position: absolute;
        bottom: -1px;
        right: -1px;
        width: 20px;
        height: 20px;
        border-bottom: 3px solid #ff006e;
        border-right: 3px solid #ff006e;
        z-index: 10;
        pointer-events: none;
      }
      .scanline-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to bottom,
          rgba(255, 0, 110, 0) 0%,
          rgba(255, 0, 110, 0.08) 50%,
          rgba(255, 0, 110, 0) 100%
        );
        animation: scanline 6s linear infinite;
        pointer-events: none;
        z-index: 3;
      }
    `;

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative bg-[#020202] overflow-hidden font-mono text-[#ff006e]">
            {/* Inject styled definitions */}
            <style>{customStyles}</style>

            {/* Immersive Gothic Background Image (Provided by User) */}
            <div 
                className="absolute inset-0 bg-cover bg-center pointer-events-none transition-all duration-1000 z-0"
                style={{ 
                    backgroundImage: `url(${loginBg})`,
                }}
            />

            {/* Dark fuchsia tint overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/70 to-[#020202] pointer-events-none z-0" />

            {/* Futuristic Tech Grid & scan lines */}
            <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none z-0" />
            
            {/* Dynamic laser scanning line */}
            <div 
                className="absolute left-0 right-0 h-[2px] bg-[#ff006e]/30 shadow-[0_0_15px_#ff006e] pointer-events-none z-1"
                style={{ animation: 'laserSweep 8s ease-in-out infinite' }}
            />

            {/* Floating ambient radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,0,110,0.12)_0%,_transparent_75%)] animate-pulse pointer-events-none z-0" />

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="z-10 w-full max-w-[440px]"
            >
                {/* Header */}
                <div className="text-center mb-6 space-y-2">
                    <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center gap-2 px-3 py-1 border border-[#ff006e]/25 bg-black/60 rounded-full backdrop-blur-md"
                        style={{ animation: 'flicker 4s infinite' }}
                    >
                        <Cpu size={12} className="text-[#ff006e] animate-pulse" />
                        <span className="text-[9px] font-black tracking-[0.25em] uppercase opacity-85">LINK_SECURE_ESTABLISHED // NODE:0xDF1A</span>
                    </motion.div>

                    <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_#ff006e] uppercase">
                        FATALE<span className="text-[#ff006e]">_GATEWAY</span>
                    </h1>
                </div>

                {/* Main Cyber Terminal Card */}
                <div 
                    className="bg-black/85 border border-[#ff006e]/35 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(255,0,110,0.18)] relative backdrop-blur-xl corner-bracket corner-bracket-bottom"
                    style={{ animation: 'cyberPulse 6s infinite' }}
                >
                    {/* Retro Scanline shader */}
                    <div className="scanline-overlay" />

                    {/* Console Info Bar */}
                    <div className="flex justify-between items-center bg-[#ff006e]/10 border-b border-[#ff006e]/25 px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-[#ff006e]/80">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-[#ff006e] rounded-full animate-ping" />
                            <span>SYS_STATUS: READY</span>
                        </div>
                        <div>MEM_LOC: C000:0F12</div>
                    </div>

                    {/* Tabs / Subsystem selectors */}
                    <div className="flex border-b border-[#ff006e]/20 bg-black/40">
                        <button
                            onClick={() => { setActiveTab('login'); setError(''); }}
                            type="button"
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'login' ? 'text-black bg-[#ff006e]' : 'text-[#ff006e]/60 hover:text-[#ff006e] hover:bg-[#ff006e]/5'}`}
                        >
                            {activeTab === 'login' && <div className="absolute inset-0 bg-[#ff006e]/15 blur-sm" />}
                            <span className="relative z-10">[ 01. INITIALISE_LINK ]</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('register'); setError(''); }}
                            type="button"
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'register' ? 'text-black bg-[#ff006e]' : 'text-[#ff006e]/60 hover:text-[#ff006e] hover:bg-[#ff006e]/5'}`}
                        >
                            {activeTab === 'register' && <div className="absolute inset-0 bg-[#ff006e]/15 blur-sm" />}
                            <span className="relative z-10">[ 02. CREATE_NODE ]</span>
                        </button>
                    </div>

                    {/* Interactive Form Area */}
                    <div className="p-6 relative z-10">
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Error Warning Terminal Block */}
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
                                            <p className="font-black uppercase tracking-widest text-[9px] text-red-500">WARNING: TRANSACTION_DENIED</p>
                                            <p className="opacity-90">{error}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Username Input Field */}
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-[0.2em] text-[#ff006e]/70 pl-1">01_USER_IDENTIFIER</label>
                                <div className="relative group">
                                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff006e]/40 group-focus-within:text-[#ff006e] transition-colors" />
                                    <input
                                        type="text"
                                        name="username"
                                        placeholder="INPUT USERNAME..."
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-black/60 border border-[#ff006e]/20 rounded-xl py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-[#ff006e] focus:shadow-[0_0_15px_rgba(255,0,110,0.25)] transition-all placeholder:text-[#ff006e]/20"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#ff006e]/10 group-focus-within:bg-[#ff006e] rounded-full transition-all" />
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
                                            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-[#ff006e]/70 pl-1">02_COMMS_LINK</label>
                                            <div className="relative group">
                                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff006e]/40 group-focus-within:text-[#ff006e] transition-colors" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    placeholder="INPUT EMAIL ADDRESS..."
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full bg-black/60 border border-[#ff006e]/20 rounded-xl py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-[#ff006e] focus:shadow-[0_0_15px_rgba(255,0,110,0.25)] transition-all placeholder:text-[#ff006e]/20"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#ff006e]/10 group-focus-within:bg-[#ff006e] rounded-full transition-all" />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-[#ff006e]/70">03_ACCESS_CODE</label>
                                </div>
                                <div className="relative group">
                                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff006e]/40 group-focus-within:text-[#ff006e] transition-colors" />
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="INPUT PASS CODE..."
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-black/60 border border-[#ff006e]/20 rounded-xl py-3 pl-12 pr-4 text-white text-xs font-bold focus:outline-none focus:border-[#ff006e] focus:shadow-[0_0_15px_rgba(255,0,110,0.25)] transition-all placeholder:text-[#ff006e]/20"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#ff006e]/10 group-focus-within:bg-[#ff006e] rounded-full transition-all" />
                                </div>
                            </div>

                            {/* Secure Authentication Trigger Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#ff006e] hover:bg-white text-black font-black py-3.5 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 uppercase tracking-[0.12em] text-xs shadow-[0_0_20px_rgba(255,0,110,0.35)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent hover:border-[#ff006e]/40"
                                >
                                    {loading ? (
                                        <Loader2 size={16} className="animate-spin text-black" />
                                    ) : (
                                        <>
                                            <span>{activeTab === 'login' ? 'INITIALISE LINK' : 'ESTABLISH IDENTITY'}</span>
                                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform text-black" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {activeTab === 'login' && (
                                <div className="text-center pt-2">
                                    <button 
                                        type="button" 
                                        className="text-[9px] uppercase font-bold text-[#ff006e]/40 hover:text-[#ff006e] tracking-[0.2em] transition-colors"
                                    >
                                        [ OVERRIDE_ACCESS_CODES? ]
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Security Signature Footer */}
                    <div className="bg-[#ff006e]/5 p-3 text-center border-t border-[#ff006e]/15 flex items-center justify-center gap-2">
                        <ShieldCheck size={12} className="text-[#ff006e]/40 animate-pulse" />
                        <p className="text-[8px] text-[#ff006e]/45 uppercase tracking-[0.22em] font-black">
                            ENCRYPTED SECURE LINK v9.12 // PROTOCOL: AES_256
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthView;
