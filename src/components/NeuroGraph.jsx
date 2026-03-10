import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import API from '../services/api';
import { RefreshCw, Zap } from 'lucide-react';

const NeuroGraph = ({ userId }) => {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchGraph = async () => {
        setLoading(true);
        try {
            const res = await API.Pulse.getNeuroGraph();
            setNodes(res.data?.nodes || []);
            setError(null);
        } catch (err) {
            console.error("[NEURO_GRAPH] Error fetching taste vector:", err);
            setError("Failed to sync neural taste vector.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGraph();
    }, [userId]);

    if (loading && nodes.length === 0) {
        return (
            <div className="w-full h-48 flex items-center justify-center bg-black/20 rounded-xl border border-[#f00060]/10">
                <RefreshCw size={24} className="text-[#f00060] animate-spin opacity-50" />
            </div>
        );
    }

    if (error && nodes.length === 0) {
        return (
            <div className="w-full p-4 text-center bg-black/20 rounded-xl border border-red-500/20">
                <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">{error}</p>
                <button onClick={fetchGraph} className="mt-2 text-[9px] text-white/40 hover:text-white underline font-mono">RETRY_SYNC</button>
            </div>
        );
    }

    // SVG dimensions
    const width = 300;
    const height = 200;
    const centerX = width / 2;
    const centerY = height / 2;

    return (
        <div className="relative w-full bg-black/60 rounded-sm border border-[var(--text-color)]/30 p-4 overflow-hidden group shadow-[0_0_30px_rgba(var(--text-color-rgb),0.1)]">
            {/* HUD Corner Brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[var(--text-color)]/50" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[var(--text-color)]/50" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[var(--text-color)]/50" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[var(--text-color)]/50" />

            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-3 bg-[var(--text-color)] animate-pulse" />
                        <h3 className="text-[10px] font-black text-white tracking-[0.4em] font-mono uppercase">Neural_Taste_Vector</h3>
                    </div>
                    <span className="text-[7px] font-mono text-[var(--text-color)]/60 ml-3 tracking-widest leading-none">STATUS::DECODING_BIO_SIGNAL</span>
                </div>
                <button onClick={fetchGraph} className="text-[var(--text-color)]/40 hover:text-[var(--text-color)] transition-all hover:rotate-180 duration-500">
                    <RefreshCw size={14} />
                </button>
            </div>

            <div className="relative h-56 w-full flex items-center justify-center border border-[var(--text-color)]/10 bg-black/40">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'linear-gradient(var(--text-color) 1px, transparent 1px), linear-gradient(90deg, var(--text-color) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="relative z-10 drop-shadow-[0_0_10px_rgba(var(--text-color-rgb),0.5)]">
                    {/* Connections with Glitchy Stroke */}
                    {nodes.map((node, i) => {
                        const angle = (i / nodes.length) * 2 * Math.PI;
                        const x = centerX + Math.cos(angle) * 70;
                        const y = centerY + Math.sin(angle) * 70;
                        return (
                            <motion.line
                                key={`line-${i}`}
                                x1={centerX}
                                y1={centerY}
                                x2={x}
                                y2={y}
                                stroke="var(--text-color)"
                                strokeWidth="0.5"
                                strokeDasharray="2,2"
                                initial={{ opacity: 0, pathLength: 0 }}
                                animate={{ opacity: 0.1 + (node.weight * 0.4), pathLength: 1 }}
                                transition={{ duration: 1.5, delay: i * 0.05 }}
                            />
                        );
                    })}

                    {/* Central Core (Oscilloscope Style) */}
                    <g>
                        <motion.circle
                            cx={centerX}
                            cy={centerY}
                            r={12}
                            fill="transparent"
                            stroke="var(--text-color)"
                            strokeWidth="1"
                            animate={{ r: [12, 15, 12], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.circle
                            cx={centerX}
                            cy={centerY}
                            r={6}
                            fill="var(--text-color)"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                        />
                        <rect x={centerX - 15} y={centerY - 0.5} width="30" height="1" fill="var(--text-color)" opacity="0.5" />
                        <rect x={centerX - 0.5} y={centerY - 15} width="1" height="30" fill="var(--text-color)" opacity="0.5" />
                    </g>

                    {/* Nodes as Hexagons / Squares for more tech feel */}
                    {nodes.map((node, i) => {
                        const angle = (i / nodes.length) * 2 * Math.PI;
                        const distance = 60 + (node.weight * 30);
                        const x = centerX + Math.cos(angle) * distance;
                        const y = centerY + Math.sin(angle) * distance;
                        const color = node.category === 'electronic' ? 'var(--text-color)' : node.category === 'urban' ? '#00f0ff' : '#00ff73';

                        return (
                            <g key={node.tag} className="cursor-pointer group/node">
                                {/* Technical Coordinates */}
                                <motion.text
                                    x={x + 10}
                                    y={y - 10}
                                    fill={color}
                                    fontSize="5"
                                    className="font-mono opacity-40"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.4 }}
                                >
                                    [{Math.round(x)},{Math.round(y)}]
                                </motion.text>

                                {/* Diagnostic Rectangles */}
                                <motion.rect
                                    x={x - 4}
                                    y={y - 4}
                                    width={8 + (node.weight * 10)}
                                    height={8 + (node.weight * 10)}
                                    fill="transparent"
                                    stroke={color}
                                    strokeWidth="1"
                                    initial={{ rotate: 45, scale: 0 }}
                                    animate={{ rotate: 45, scale: 1 }}
                                    whileHover={{ scale: 1.2, strokeWidth: 2 }}
                                />
                                <motion.rect
                                    x={x - 2}
                                    y={y - 2}
                                    width={4 + (node.weight * 5)}
                                    height={4 + (node.weight * 5)}
                                    fill={color}
                                    initial={{ rotate: 45, opacity: 0 }}
                                    animate={{ rotate: 45, opacity: 0.6 }}
                                />

                                <motion.text
                                    x={x}
                                    y={y + 20 + (node.weight * 5)}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="7"
                                    className="font-mono font-black tracking-[0.2em]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.8 }}
                                >
                                    {node.tag.toUpperCase()}
                                </motion.text>

                                <motion.text
                                    x={x}
                                    y={y + 28 + (node.weight * 5)}
                                    textAnchor="middle"
                                    fill={color}
                                    fontSize="6"
                                    className="font-mono opacity-50"
                                >
                                    PWR::{Math.round(node.weight * 100)}%
                                </motion.text>
                            </g>
                        );
                    })}
                </svg>

                {/* HUD Overlay Brackets for the SVG area */}
                <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/20" />
                <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/20" />
            </div>

            <div className="mt-4 flex justify-between items-center px-2">
                <span className="text-[7px] font-mono text-[var(--text-color)]/30 tracking-widest uppercase italic">// DATA_CLUSTERS_RECONSTRUCTED</span>
                <div className="flex gap-1 group/leds">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-color)] animate-pulse shadow-[0_0_5px_var(--text-color)]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-color)]/20" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-color)]/20" />
                </div>
            </div>
        </div>
    );
};

export default NeuroGraph;
