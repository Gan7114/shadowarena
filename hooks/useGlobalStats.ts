import { useState, useEffect } from 'react';

interface GlobalStats {
    activeNodes: string;
    activeAgents: string;
    totalYield: string;
    tickRate: string;
}

export const useGlobalStats = (): GlobalStats => {
    // Initial State
    const [stats, setStats] = useState({
        nodes: 14281,
        agents: 42,
        yieldVal: 842.0,
        tick: 128
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => {
                // Random fluctuation logic
                const nodeChange = Math.floor(Math.random() * 5) - 2; // -2 to +2
                const agentChange = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0;
                const yieldChange = Math.random() * 0.05; // Always grows slightly
                const tickFluctuation = Math.floor(Math.random() * 3) - 1;

                return {
                    nodes: Math.max(1000, prev.nodes + nodeChange),
                    agents: Math.max(10, prev.agents + agentChange),
                    yieldVal: prev.yieldVal + yieldChange,
                    tick: Math.min(144, Math.max(60, prev.tick + tickFluctuation))
                };
            });
        }, 2000); // Update every 2 seconds

        return () => clearInterval(interval);
    }, []);

    // Formatters
    return {
        activeNodes: stats.nodes.toLocaleString(),
        activeAgents: stats.agents.toString(),
        totalYield: `${stats.yieldVal.toFixed(4)} ETH`,
        tickRate: `${stats.tick}Hz`
    };
};
