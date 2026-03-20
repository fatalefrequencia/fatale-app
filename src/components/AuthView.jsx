import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, User, Mail, Lock, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import API from '../services/api';

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

    return (
        <div className="h-screen flex flex-col items-center justify-center p-6 relative bg-black overflow-hidden font-mono text-[#ff006e]">
            {/* Background FX */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ff006e10_0%,_transparent_70%)] animate-pulse pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 w-full max-w-md"
            >
                {/* Header */}
                <div className="text-center mb-10 space-y-2">
                    <motion.div
                        initial={{ y: -20 }} animate={{ y: 0 }}
                        className="flex items-center justify-center gap-2 mb-4"
                    >
                        <Zap size={32} className="text-[#ff006e] fill-[#ff006e]/20" />
                        <span className="text-sm font-black tracking-[0.3em] uppercase opacity-70">Secure Access Terminal</span>
                    </motion.div>

                    <h1 className="text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_#ff006e]">
                        CYBER<span className="text-[#ff006e]">AUTH</span>
                    </h1>
                </div>

                {/* Main Card */}
                <div className="bg-[#0a0a0a] border border-[#ff006e]/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(255,0,110,0.15)] relative backdrop-blur-xl">
                    {/* Tabs */}
                    <div className="flex border-b border-[#ff006e]/20">
                        <button
                            onClick={() => { setActiveTab('login'); setError(''); }}
                            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'login' ? 'text-black bg-[#ff006e]' : 'text-[#ff006e]/50 hover:text-[#ff006e] hover:bg-[#ff006e]/5'}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setActiveTab('register'); setError(''); }}
                            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'register' ? 'text-black bg-[#ff006e]' : 'text-[#ff006e]/50 hover:text-[#ff006e] hover:bg-[#ff006e]/5'}`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Form Area */}
                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Error Message */}
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        key="error-message"
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-400 text-xs font-bold"
                                    >
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Username Field */}
                            <div className="relative group">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff006e]/50 group-focus-within:text-[#ff006e] transition-colors" />
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#050505] border border-[#ff006e]/20 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:outline-none focus:border-[#ff006e] focus:shadow-[0_0_15px_rgba(255,0,110,0.2)] transition-all placeholder:text-[#ff006e]/20"
                                />
                            </div>

                            {/* Email Field (Only for Register) */}
                            <AnimatePresence mode="wait">
                                {activeTab === 'register' && (
                                    <motion.div
                                        key="email-field"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="relative group">
                                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff006e]/50 group-focus-within:text-[#ff006e] transition-colors" />
                                            <input
                                                type="email"
                                                name="email"
                                                placeholder="Email Address"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-[#050505] border border-[#ff006e]/20 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:outline-none focus:border-[#ff006e] focus:shadow-[0_0_15px_rgba(255,0,110,0.2)] transition-all placeholder:text-[#ff006e]/20"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Password Field */}
                            <div className="relative group">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff006e]/50 group-focus-within:text-[#ff006e] transition-colors" />
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#050505] border border-[#ff006e]/20 rounded-xl py-3 pl-12 pr-4 text-white text-sm font-bold focus:outline-none focus:border-[#ff006e] focus:shadow-[0_0_15px_rgba(255,0,110,0.2)] transition-all placeholder:text-[#ff006e]/20"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#ff006e] text-black font-black py-4 rounded-xl hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wide shadow-[0_0_20px_rgba(255,0,110,0.4)] disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : (
                                        <>
                                            {activeTab === 'login' ? 'Initialise Link' : 'Create Identity'}
                                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {activeTab === 'login' && (
                                <div className="text-center">
                                    <button type="button" className="text-[10px] uppercase font-bold text-[#ff006e]/50 hover:text-[#ff006e] transition-colors">
                                        Forgot Access Codes?
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="bg-[#ff006e]/5 p-4 text-center border-t border-[#ff006e]/10">
                        <p className="text-[9px] text-[#ff006e]/30 uppercase tracking-[0.2em] font-black">Protected by CyberSec v9.0</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthView;
