import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Skull, Terminal, AlertTriangle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowWrapper } from './GlowWrapper';

const TERMINAL_LOGS = [
    "INITIALIZING SECURE CONNECTION...",
    "HANDSHAKE_PROTOCOL_V4 [OK]",
    "DECRYPTING BRIDGE_DATA...",
    "ERROR: SECTOR_7 LOCKED",
    "WARNING: HIGH ENTROPY DETECTED",
    "RETRYING ACCESS...",
    "ACCESS_DENIED: WAIT FOR PROTOCOL LAUNCH",
    "SYSTEM_STANDBY_MODE_ENGAGED",
];

export const DemonBridge: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [glitch, setGlitch] = useState(false);

    useEffect(() => {
        let delay = 0;
        TERMINAL_LOGS.forEach((log, i) => {
            delay += Math.random() * 800 + 200;
            setTimeout(() => {
                setLogs((prev) => [...prev, log].slice(-5));
            }, delay);
        });

        const glitchInterval = setInterval(() => {
            setGlitch(true);
            setTimeout(() => setGlitch(false), 200);
        }, 3000);
        return () => clearInterval(glitchInterval);
    }, []);

    return (
        <div className="min-h-screen bg-[#020202] text-white flex flex-col font-pixel relative overflow-hidden selection:bg-purple-500/30">

            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#120a1f_1px,transparent_1px),linear-gradient(to_bottom,#120a1f_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none" />

            {/* Header */}
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="relative z-10 p-6 flex justify-between items-center border-b border-purple-900/30 bg-black/60 backdrop-blur-md"
            >
                <Link to="/" className="group flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <div className="p-1 border border-gray-600 rounded group-hover:border-white transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    <span className="tracking-[0.2em] text-xs font-bold">RETURN_TO_NEXUS</span>
                </Link>
                <div className="flex items-center gap-3 text-purple-500">
                    <span className="text-xs bg-purple-900/20 px-2 py-1 rounded border border-purple-900/50 animate-pulse">
                        ERR_CODE: 403
                    </span>
                    <div className="h-6 w-[1px] bg-purple-900/50" />
                    <Skull size={20} />
                    <span className="text-xl tracking-[0.2em] font-bold text-shadow-purple">DEMON_BRIDGE</span>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center relative p-4 md:p-8">

                {/* HUD Frame */}
                <div className="absolute inset-4 md:inset-8 border border-purple-900/20 pointer-events-none rounded-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-500 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-500 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-500 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-500 rounded-br-lg" />
                </div>

                {/* Video Container */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "circOut" }}
                    className="w-full max-w-5xl aspect-video relative rounded-lg overflow-hidden border border-purple-900/50 bg-black shadow-[0_0_100px_rgba(147,51,234,0.15)] group"
                >
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20 backdrop-blur-[2px] transition-all duration-500 group-hover:bg-black/40 group-hover:backdrop-blur-0">

                        {/* Glitch Text Overlay */}
                        <div className="relative z-30 text-center space-y-6 mix-blend-screen">
                            <motion.div
                                animate={glitch ? { x: [-2, 2, -1, 0], skewX: [0, 10, -10, 0] } : {}}
                                className="relative inline-block"
                            >
                                <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-600 tracking-tighter select-none relative z-10">
                                    COMING<br />SOON
                                </h1>
                                <h1 className="absolute top-0 left-0 text-7xl md:text-9xl font-black text-red-500 opacity-30 animate-[pulse_0.1s_infinite] select-none pointer-events-none translate-x-[2px]" style={{ display: glitch ? 'block' : 'none' }}>
                                    COMING<br />SOON
                                </h1>
                            </motion.div>

                            <div className="flex items-center justify-center gap-4 text-purple-300/80 tracking-[0.3em] text-xs uppercase font-medium">
                                <Lock size={12} />
                                <span>Protocol Locked</span>
                                <div className="w-1 h-1 bg-purple-500 rounded-full" />
                                <span>Sector 7</span>
                            </div>
                        </div>

                        {/* Scanline Effect */}
                        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.8)_50%)] bg-[size:100%_3px] opacity-30 pointer-events-none" />
                        <div className="absolute inset-0 bg-purple-500/5 mix-blend-overlay pointer-events-none" />
                    </div>

                    {/* Terminal Feed */}
                    <div className="absolute bottom-4 left-4 z-30 font-mono text-[10px] text-green-500/80 space-y-1 p-2 bg-black/80 rounded border border-green-900/30 w-64">
                        <div className="flex items-center gap-2 border-b border-green-900/30 pb-1 mb-1 text-green-400 font-bold">
                            <Terminal size={10} />
                            SYSTEM_LOG_v9.2
                        </div>
                        {logs.map((log, i) => (
                            <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className="mr-2 opacity-50">{`>`}</span>
                                {log}
                            </div>
                        ))}
                    </div>

                    {/* Animated Pixel Art Background */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <motion.img
                            src="/demon_bridge_run.png"
                            alt="Cybernetic Exodus"
                            className="w-full h-full object-cover opacity-60 grayscale-[0.3]"
                            initial={{ scale: 1.1 }}
                            animate={{
                                scale: 1.2,
                                x: [0, -20, 0],
                                y: [0, -10, 0]
                            }}
                            transition={{
                                duration: 20,
                                repeat: Infinity,
                                repeatType: "reverse",
                                ease: "linear"
                            }}
                        />

                        {/* CRT Scanline Overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.9)_50%)] bg-[size:100%_4px] pointer-events-none z-10 opacity-60" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10" />
                    </div>
                </motion.div>

                {/* Footer Lore */}
                <div className="mt-12 flex items-center gap-8 text-purple-500/30 text-[10px] tracking-[0.2em] uppercase select-none">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={12} />
                        <span>High Risk Zone</span>
                    </div>
                    <div className="h-px w-12 bg-purple-900/30" />
                    <div>Monad Chain ID: 10143</div>
                </div>

            </div>
        </div>
    );
};
