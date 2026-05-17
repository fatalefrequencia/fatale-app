import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
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
    const activeTimeoutRef = useRef(null);

    const showNotification = useCallback((title, message, type = 'info', duration = 5000) => {
        const id = Date.now();

        if (activeTimeoutRef.current) {
            clearTimeout(activeTimeoutRef.current);
        }

        setNotifications([{ id, title, message, type }]);

        if (duration !== Infinity) {
            activeTimeoutRef.current = setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, duration);
        }
        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        if (activeTimeoutRef.current) {
            clearTimeout(activeTimeoutRef.current);
        }
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification, removeNotification }}>
            {children}
            <div className="fixed top-[calc(env(safe-area-inset-top,0px)+80px)] md:top-6 right-4 left-4 md:left-auto md:right-6 z-[9999] flex flex-col items-center md:items-end pointer-events-none w-[calc(100%-2rem)] md:w-full md:max-w-sm">
                <AnimatePresence mode="wait">
                    {notifications.map(n => (
                        <motion.div
                            key={n.id}
                            initial={{ y: -20, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -10, opacity: 0, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            className="pointer-events-auto w-full max-w-sm"
                        >
                            <div className="relative group">
                                {/* CRT Effect Overlay */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-10 opacity-40" />

                                <div className="bg-black/90 border border-[#ff006e]/30 backdrop-blur-2xl p-3.5 px-4 shadow-[0_12px_40px_rgba(0,0,0,0.8),_0_0_20px_rgba(255,0,110,0.15)] relative overflow-hidden rounded-xl">
                                    {/* Glitch lines */}
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-[#ff006e]/20 animate-scanline" />

                                    <div className="flex gap-3">
                                        <div className={`mt-0.5 shrink-0 ${n.type === 'error' ? 'text-red-500' : 'text-[#ff006e]'}`}>
                                            {n.type === 'error' ? <AlertCircle size={16} /> :
                                                n.type === 'success' ? <CheckCircle size={16} /> :
                                                    n.type === 'warning' ? <Zap size={16} /> :
                                                        <Info size={16} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="text-[9px] font-black italic tracking-[0.2em] text-white uppercase truncate">
                                                    // {n.title || (n.type === 'error' ? 'SYSTEM_FAILURE' : 'SIGNAL_RECEIVED')}
                                                </h4>
                                                <button
                                                    onClick={() => removeNotification(n.id)}
                                                    className="text-white/20 hover:text-white transition-colors ml-2"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <p className="text-[8px] font-bold text-white/70 mono leading-relaxed uppercase tracking-wider">
                                                {n.message}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Aesthetic scanline footer */}
                                    <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-between items-center text-[5px] mono text-[#ff006e]/25">
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
