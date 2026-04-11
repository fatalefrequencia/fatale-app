import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const ActionModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", type = "confirm" }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="w-full max-w-sm bg-black border border-[#ff006e]/30 relative overflow-hidden group shadow-[0_0_40px_rgba(0,0,0,0.5)]"
                    >
                        {/* Corner Accent & Close */}
                        <div className="absolute top-0 right-0 p-3 flex items-start gap-4">
                            <button 
                                onClick={onClose}
                                className="text-white/20 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                            <div className="opacity-40">
                                <div className="w-8 h-0.5 bg-[#ff006e]/40 mb-0.5"></div>
                                <div className="w-4 h-0.5 bg-[#ff006e]/40 ml-auto"></div>
                            </div>
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
                                <button
                                    onClick={() => { if (onConfirm) onConfirm(); onClose(); }}
                                    className="w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest bg-[#ff006e] text-black hover:bg-white transition-all rounded-lg shadow-[0_0_15px_rgba(255,0,110,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
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
