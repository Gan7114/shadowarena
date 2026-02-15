import React, { useEffect, useRef, useState } from 'react';
import { shortAddress } from '../lib/onchain';

type Point = { x: number; y: number };

interface Room {
    id: string;
    name: string;
    x: number; // Center X (0-100)
    y: number; // Center Y (0-100)
    w: number;
    h: number;
    color: string;
}

const ROOMS: Room[] = [
    { id: 'R0', name: 'Meeting', x: 50, y: 50, w: 20, h: 20, color: '#3b82f6' }, // Blue
    { id: 'R1', name: 'Reactor', x: 10, y: 50, w: 15, h: 15, color: '#ef4444' }, // Red
    { id: 'R2', name: 'Elec', x: 30, y: 20, w: 10, h: 15, color: '#f59e0b' }, // Amber
    { id: 'R3', name: 'Nav', x: 90, y: 50, w: 12, h: 12, color: '#10b981' }, // Emerald
    { id: 'R4', name: 'Medbay', x: 30, y: 80, w: 12, h: 15, color: '#14b8a6' }, // Teal
    { id: 'R5', name: 'Sec', x: 15, y: 65, w: 10, h: 10, color: '#6366f1' }, // Indigo
    { id: 'R6', name: 'O2', x: 70, y: 20, w: 12, h: 10, color: '#06b6d4' }, // Cyan
    { id: 'R7', name: 'Weapons', x: 75, y: 80, w: 15, h: 12, color: '#8b5cf6' }, // Violet
];

// Simple connections for visualization (star topology from Meeting Room + cycle)
const CONNECTIONS: string[][] = [
    ['R0', 'R1'], ['R0', 'R2'], ['R0', 'R3'], ['R0', 'R4'], ['R0', 'R5'], ['R0', 'R6'], ['R0', 'R7'],
    ['R1', 'R5'], ['R5', 'R4'], ['R4', 'R7'], ['R7', 'R3'], ['R3', 'R6'], ['R6', 'R2'], ['R2', 'R1']
];

interface Agent {
    address: string;
    x: number;
    y: number;
    isAlive: boolean;
    color: string;
    targetRoom?: string;
}

interface ImposterVisualizerProps {
    players: any[];
    isSabotaged: boolean;
}

export const ImposterVisualizer: React.FC<ImposterVisualizerProps> = ({ players, isSabotaged }) => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>();

    // Initialize or Update Agents
    useEffect(() => {
        if (players.length > 0) {
            // Use real data if available
            const realAgents = players.map(p => ({
                address: p.address,
                x: p.x,
                y: p.y,
                isAlive: p.isAlive,
                color: p.isAlive ? '#22d3ee' : '#ef4444', // Cyan or Red
            }));
            setAgents(realAgents);
        } else {
            // Initialize Simulation Agents
            const simAgents = Array.from({ length: 8 }).map((_, i) => ({
                address: `0x${Math.random().toString(16).substr(2, 4)}...`,
                x: 50 + (Math.random() - 0.5) * 10,
                y: 50 + (Math.random() - 0.5) * 10,
                isAlive: true,
                color: '#22d3ee',
                targetRoom: ROOMS[Math.floor(Math.random() * ROOMS.length)].id
            }));
            setAgents(simAgents);
        }
    }, [players]);

    // Simulation Loop
    const animate = (time: number) => {
        if (players.length === 0) {
            setAgents(prev => prev.map(agent => {
                if (!agent.isAlive) return agent;

                let target = ROOMS.find(r => r.id === agent.targetRoom);
                if (!target) return agent;

                // Move towards target
                const dx = target.x - agent.x;
                const dy = target.y - agent.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const speed = 0.05; // speed factor

                if (dist < 2) {
                    // Reached target, pick new one
                    return {
                        ...agent,
                        targetRoom: ROOMS[Math.floor(Math.random() * ROOMS.length)].id
                    };
                }

                return {
                    ...agent,
                    x: agent.x + (dx / dist) * speed,
                    y: agent.y + (dy / dist) * speed
                };
            }));
        }
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [players.length]); // Re-bind if mode changes

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#05070a] rounded-lg overflow-hidden border border-gray-800 shadow-inner flex items-center justify-center p-4 group">

            {/* Radar Sweep Effect */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
                <div className="w-[150%] h-[150%] absolute top-[-25%] left-[-25%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(6,182,212,0.3)_360deg)] animate-[spin_4s_linear_infinite] rounded-full blur-xl"></div>
            </div>

            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#1f2937 1px, transparent 1px), linear-gradient(90deg, #1f2937 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />

            {/* Sabotage Overlay */}
            {isSabotaged && (
                <div className="absolute inset-0 z-0 bg-red-900/20 animate-pulse pointer-events-none" />
            )}

            <svg viewBox="0 0 100 100" className="w-full h-full max-w-[600px] max-h-[600px] overflow-visible relative z-10">
                {/* Connections with Data Flow Animation */}
                {CONNECTIONS.map(([id1, id2], i) => {
                    const r1 = ROOMS.find(r => r.id === id1);
                    const r2 = ROOMS.find(r => r.id === id2);
                    if (!r1 || !r2) return null;
                    return (
                        <g key={`conn-${i}`}>
                            <line
                                x1={r1.x} y1={r1.y}
                                x2={r2.x} y2={r2.y}
                                stroke="#1f2937"
                                strokeWidth="2"
                            />
                            <line
                                x1={r1.x} y1={r1.y}
                                x2={r2.x} y2={r2.y}
                                stroke="#374151"
                                strokeWidth="1"
                                strokeDasharray="4"
                                className="opacity-50"
                            >
                                <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
                            </line>
                        </g>
                    );
                })}

                {/* Rooms */}
                {ROOMS.map(room => (
                    <g key={room.id} className="transition-transform duration-300 hover:scale-110 origin-center">
                        <rect
                            x={room.x - room.w / 2}
                            y={room.y - room.h / 2}
                            width={room.w}
                            height={room.h}
                            fill="#0f172a"
                            fillOpacity="0.9"
                            stroke={room.color}
                            strokeWidth="0.5"
                            className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                        />
                        {/* Inner Pulse */}
                        <rect
                            x={room.x - room.w / 2}
                            y={room.y - room.h / 2}
                            width={room.w}
                            height={room.h}
                            fill={room.color}
                            className="animate-pulse opacity-20"
                        />

                        <text
                            x={room.x}
                            y={room.y} // Center
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="white"
                            fontSize="2.5"
                            fontWeight="bold"
                            pointerEvents="none"
                            style={{ textShadow: `0 0 5px ${room.color}` }}
                            className="font-pixel"
                        >
                            {room.name}
                        </text>
                    </g>
                ))}

                {/* Agents */}
                {agents.map((agent, i) => (
                    <g key={`agent-${i}`} style={{ transform: `translate(${agent.x}px, ${agent.y}px)` }}
                        className="transition-transform duration-100 ease-linear"
                    >
                        {/* Vision Cone (Flashlight Effect) */}
                        {agent.isAlive && (
                            <circle cx="0" cy="0" r="12" fill="url(#visionGradient)" opacity="0.15" />
                        )}

                        {/* Agent Ripple */}
                        {agent.isAlive && (
                            <circle cx="0" cy="0" r="3" fill="none" stroke={agent.color} strokeWidth="0.2" opacity="0.5">
                                <animate attributeName="r" from="1" to="4" dur="1.5s" repeatCount="indefinite" />
                                <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                        )}

                        {/* Agent Dot */}
                        <circle
                            cx="0"
                            cy="0"
                            r={agent.isAlive ? 2 : 1.2}
                            fill={agent.color}
                            stroke="white"
                            strokeWidth="0.5"
                            className="drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                        />

                        {/* Agent Label */}
                        <g transform="translate(0, -4)">
                            <rect x="-6" y="-3" width="12" height="3" rx="1" fill="black" fillOpacity="0.7" />
                            <text
                                x="0"
                                y="-1"
                                textAnchor="middle"
                                fill={agent.color}
                                fontSize="1.8"
                                fontWeight="bold"
                                pointerEvents="none"
                                className="font-mono"
                            >
                                {shortAddress(agent.address)}
                            </text>
                        </g>

                    </g>
                ))}

                {/* Defs for gradients */}
                <defs>
                    <radialGradient id="visionGradient">
                        <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                </defs>
            </svg>

            {/* Status Overlays */}
            {players.length === 0 && (
                <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur px-3 py-1 rounded border border-cyber-cyan/50 text-cyber-cyan text-xs font-mono animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    SIMULATION MODE // V4.2
                </div>
            )}

            {isSabotaged && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 backdrop-blur-md px-8 py-3 rounded-lg border-2 border-red-500 text-white font-bold tracking-[0.2em] animate-bounce shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                    ⚠️ CRITICAL SABOTAGE ⚠️
                </div>
            )}
        </div>
    );
};
