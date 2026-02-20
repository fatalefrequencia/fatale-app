import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ActionModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", type = "confirm" }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="w-full max-w-sm bg-black/95 border border-[#ff006e]/40 backdrop-blur-xl relative overflow-hidden group shadow-[0_0_30px_rgba(255,0,110,0.15)]"
                    >
                        {/* Corner Accent */}
                        <div className="absolute top-0 right-0 p-1.5 opacity-40">
                            <div className="w-8 h-0.5 bg-[#ff006e]/40 mb-0.5"></div>
                            <div className="w-4 h-0.5 bg-[#ff006e]/40 ml-auto"></div>
                        </div>

                        <div className="p-6 md:p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div
                                    className="text-[10px] font-extrabold uppercase italic tracking-[0.2em] text-[#ff006e] flex items-center gap-2"
                                    style={{ transform: 'skewX(-2deg)' }}
                                >
                                    <span className="w-1.5 h-1.5 bg-[#ff006e] rounded-full animate-pulse shadow-[0_0_8px_rgba(255,0,110,0.8)]" />
                                    {title}
                                </div>
                            </div>

                            <div className="text-white/60 text-xs font-mono uppercase tracking-widest leading-relaxed border-l border-white/5 pl-4">
                                {message}
                            </div>

                            <div className="flex gap-3 pt-4">
                                {type === "confirm" && (
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all border border-white/5 hover:bg-white/5 rounded-lg"
                                    >
                                        Abort
                                    </button>
                                )}
                                <button
                                    onClick={() => { if (onConfirm) onConfirm(); onClose(); }}
                                    className="flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest bg-[#ff006e] text-black hover:bg-white transition-all rounded-lg shadow-[0_0_15px_rgba(255,0,110,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ActionModal;
