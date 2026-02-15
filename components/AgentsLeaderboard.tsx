import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Cpu, Zap, Activity } from 'lucide-react';
import { GlitchText } from './GlitchText';
import { GlowWrapper } from './GlowWrapper';

<div>
    <h2 className="text-3xl text-white uppercase tracking-[0.2em] font-bold font-pixel drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
        <GlitchText text="Top_Agents_DB" speed={40} />
    </h2>
    <div className="flex items-center gap-2 mt-1">
        <div className="h-1.5 w-1.5 bg-cyber-cyan rounded-full animate-ping"></div>
        <p className="text-cyber-cyan text-xs uppercase tracking-widest font-mono">
            <GlitchText text="System_Rankings // Cycle_88 // Synchronized" speed={20} />
        </p>
    </div>
</div>
interface Agent {
    id: string;
    name: string;
    class: string;
    winRate: number;
    yield: string;
    status: 'ACTIVE' | 'DORMANT';
    modules: string[];
}

const MOCK_AGENTS: Agent[] = [
    { id: 'A01', name: 'Nexus_Prime', class: 'Strategist', winRate: 88.5, yield: '14,200 MON', status: 'ACTIVE', modules: ['Neural_Net_V4', 'Game_Theory_Opt'] },
    { id: 'A02', name: 'Cipher_Ghost', class: 'Infiltrator', winRate: 72.1, yield: '9,850 MON', status: 'ACTIVE', modules: ['Stealth_Protocol', 'Chaos_Engine'] },
    { id: 'A03', name: 'Iron_Logic', class: 'Tank', winRate: 65.4, yield: '8,500 MON', status: 'DORMANT', modules: ['Defense_Matrix', 'Yield_Aggregator'] },
    { id: 'A04', name: 'Viper_X', class: 'Saboteur', winRate: 91.2, yield: '21,050 MON', status: 'ACTIVE', modules: ['Disruption_Field', 'Market_Manipulator'] },
    { id: 'A05', name: 'Echo_Node', class: 'Observer', winRate: 54.8, yield: '4,500 MON', status: 'DORMANT', modules: ['Data_Scraper', 'Pattern_Recognition'] },
];

interface AgentsLeaderboardProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AgentsLeaderboard: React.FC<AgentsLeaderboardProps> = ({ isOpen, onClose }) => {
    // Ticker Effect state
    const [ticker, setTicker] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTicker(prev => (prev + 1) % 100);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,transparent_70%)] pointer-events-none"></div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full max-w-5xl bg-[#030712]/80 backdrop-blur-xl border border-cyber-cyan/30 shadow-[0_0_80px_rgba(6,182,212,0.15)] rounded-2xl overflow-hidden relative"
                    >
                        {/* Decorative Scanner Line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-cyan to-transparent opacity-50 animate-pulse"></div>

                        {/* Header */}
                        <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/5 relative overflow-hidden">
                            {/* Glitchy Text Effect Overlay */}
                            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')]"></div>

                            <div className="flex items-center gap-6 relative z-10">
                                <div className="p-3 bg-cyber-yellow/10 rounded-lg border border-cyber-yellow/30 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                                    <Trophy className="text-cyber-yellow animate-pulse" size={36} />
                                </div>
                                <div>
                                    <h2 className="text-3xl text-white uppercase tracking-[0.2em] font-bold font-pixel drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                                        Top_Agents_DB
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-1.5 w-1.5 bg-cyber-cyan rounded-full animate-ping"></div>
                                        <p className="text-cyber-cyan text-xs uppercase tracking-widest font-mono">
                                            System_Rankings // Cycle_88 // Synchronized
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="group relative p-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 rounded-full transition-all duration-300 scale-0 group-hover:scale-100"></div>
                                <X size={32} className="relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-cyber-cyan/70 uppercase text-[10px] font-bold tracking-[0.2em] border-b border-white/5 bg-black/40">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-3">Agent_ID</div>
                            <div className="col-span-2">Class</div>
                            <div className="col-span-2 text-right">Win_Rate</div>
                            <div className="col-span-2 text-right">Total_Yield</div>
                            <div className="col-span-2 text-center">Status</div>
                        </div>

                        {/* List */}
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                            {MOCK_AGENTS.map((agent, index) => (
                                <motion.div
                                    key={agent.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <GlowWrapper color="cyan" className="block mb-3 mx-2">
                                        <div className="grid grid-cols-12 gap-4 p-5 items-center bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-cyber-cyan/30 transition-all duration-300 cursor-pointer group rounded-lg backdrop-blur-sm">
                                            <div className="col-span-1 text-center text-xl font-bold font-pixel text-gray-700 group-hover:text-cyber-cyan transition-colors">
                                                0{index + 1}
                                            </div>
                                            <div className="col-span-3">
                                                <div className="text-white font-bold text-lg tracking-wide group-hover:text-cyber-cyan transition-colors">{agent.name}</div>
                                                <div className="text-[10px] text-gray-500 font-mono tracking-wider">{agent.id}</div>
                                            </div>
                                            <div className="col-span-2 flex items-center gap-2 text-cyber-purple drop-shadow-[0_0_5px_rgba(168,85,247,0.4)]">
                                                <Cpu size={14} />
                                                <span className="font-mono text-sm">{agent.class}</span>
                                            </div>
                                            <div className="col-span-2 text-right font-mono text-cyber-green font-bold text-lg drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                                                {agent.winRate}%
                                            </div>
                                            <div className="col-span-2 text-right font-mono text-cyber-yellow text-sm">
                                                {agent.yield}
                                            </div>
                                            <div className="col-span-2 text-center relative">
                                                <div className={`absolute inset-0 blur-md opacity-20 ${agent.status === 'ACTIVE' ? 'bg-cyber-cyan' : 'bg-gray-500'}`}></div>
                                                <span className={`relative z-10 px-3 py-1 text-[10px] tracking-widest font-bold rounded-full border ${agent.status === 'ACTIVE'
                                                    ? 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                                    : 'border-gray-700 text-gray-500 bg-gray-900/50'
                                                    }`}>
                                                    {agent.status}
                                                </span>
                                            </div>

                                            {/* Expanded Modules (Visual Only for now) */}
                                            <div className="col-span-12 mt-0 pt-0 border-t border-white/10 flex gap-2 overflow-x-auto opacity-0 group-hover:opacity-100 transition-all duration-300 h-0 group-hover:h-auto group-hover:mt-4 group-hover:pt-4">
                                                {agent.modules.map(mod => (
                                                    <div key={mod} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-gray-300 border border-white/10 px-3 py-1.5 rounded bg-black/50 hover:border-cyber-cyan/50 transition-colors">
                                                        <Zap size={10} className="text-cyber-yellow" />
                                                        {mod}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </GlowWrapper>
                                </motion.div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 flex justify-between items-center text-gray-500 text-xs font-mono bg-black/40">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-cyber-green blur-sm opacity-50 animate-pulse"></div>
                                    <Activity size={14} className="relative z-10 text-cyber-green" />
                                </div>
                                <span className="tracking-widest overflow-hidden whitespace-nowrap w-48">
                                    <GlitchText text={`LIVE_FEED_ACTIVE :: NETWORK_LOAD_${20 + (ticker % 30)}%`} speed={50} />
                                </span>
                            </div>
                            <div className="opacity-50">
                                [ TOTAL_AGENTS: {MOCK_AGENTS.length} ] // END_OF_LINE
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
