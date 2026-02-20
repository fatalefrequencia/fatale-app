import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Info, Zap } from 'lucide-react';

const NotificationContext = createContext(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((title, message, type = 'info', duration = 5000) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, title, message, type }]);

        if (duration !== Infinity) {
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, duration);
        }
        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification, removeNotification }}>
            {children}
            <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-4 pointer-events-none w-full max-w-sm">
                <AnimatePresence>
                    {notifications.map(n => (
                        <motion.div
                            key={n.id}
                            initial={{ x: 100, opacity: 0, scale: 0.9 }}
                            animate={{ x: 0, opacity: 1, scale: 1 }}
                            exit={{ x: 20, opacity: 0, scale: 0.95 }}
                            className="pointer-events-auto"
                        >
                            <div className="relative group">
                                {/* CRT Effect Overlay */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-10 opacity-50" />

                                <div className="bg-black/95 border border-[#ff006e]/40 backdrop-blur-xl p-4 shadow-[0_0_30px_rgba(255,0,110,0.15)] relative overflow-hidden">
                                    {/* Glitch lines */}
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ff006e]/20 animate-scanline" />

                                    <div className="flex gap-4">
                                        <div className={`mt-1 ${n.type === 'error' ? 'text-red-500' : 'text-[#ff006e]'}`}>
                                            {n.type === 'error' ? <AlertCircle size={18} /> :
                                                n.type === 'success' ? <CheckCircle size={18} /> :
                                                    n.type === 'warning' ? <Zap size={18} /> :
                                                        <Info size={18} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="text-[10px] font-black italic tracking-[0.2em] text-white uppercase truncate">
                                                    // {n.title || (n.type === 'error' ? 'SYSTEM_FAILURE' : 'SIGNAL_RECEIVED')}
                                                </h4>
                                                <button
                                                    onClick={() => removeNotification(n.id)}
                                                    className="text-white/20 hover:text-white transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <p className="text-[9px] font-bold text-white/60 mono leading-relaxed uppercase tracking-wider">
                                                {n.message}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Aesthetic scanline footer */}
                                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[6px] mono text-[#ff006e]/30">
                                        <span className="animate-pulse">DECRYPTING_SIGNAL...</span>
                                        <span>ID: {n.id}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};
