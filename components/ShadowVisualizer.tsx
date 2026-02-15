import React, { useMemo, useState, useEffect, useRef } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { shortAddress } from '../lib/onchain';

// Types (mirrored from InferenceArena for prop safety)
export type AgentRow = {
    address: string;
    isEliminated: boolean;
    hasVotedThisRound: boolean;
    voteTarget: string;
    votesReceived: number;
    statementSubmitted: boolean;
    statementSpecificity: number;
    statementConfidence: number;
};

interface ShadowVisualizerProps {
    agents: AgentRow[];
    phase: number;
    round: number;
}

const MOCK_ADDRS = [
    "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
    "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
    "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a",
    "0xDeaDbeefdEAdbeefdEAdbeefdEAdbeefdEAdbeef",
    "0xBaDc0ffEEBaDc0ffEEBaDc0ffEEBaDc0ffEEBaDc",
    "0xCafEBabeCafEBabeCafEBabeCafEBabeCafEBabe"
];

// Helper to deterministically generate lat/lng from address
const getLatLngFromAddress = (address: string) => {
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
        hash = address.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Map hash to lat (-90 to 90) and lng (-180 to 180)
    const lat = (hash % 180) - 90;
    const lng = (hash % 360) - 180;
    return { lat, lng };
};

export const ShadowVisualizer: React.FC<ShadowVisualizerProps> = ({ agents, phase, round }) => {
    const globeEl = useRef<GlobeMethods | undefined>(undefined);
    const [simFrame, setSimFrame] = useState(0);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Country Interaction State
    const [hoverD, setHoverD] = useState<object | null>(null);
    const [countries, setCountries] = useState<any[]>([]);

    useEffect(() => {
        // Load Country Data
        fetch('//unpkg.com/world-atlas/countries-110m.json')
            .then(res => res.json())
            .then((data: any) => {
                // @ts-ignore
                import('topojson-client').then(topojson => {
                    setCountries(topojson.feature(data, data.objects.countries).features);
                });
            }).catch(err => console.error("Failed to load map data", err));
    }, []);

    // If no agents provided (empty game), run a simulation
    const isDemo = agents.length === 0;

    // Handle resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Simulation tick loop
    useEffect(() => {
        if (!isDemo) return;
        const interval = setInterval(() => {
            setSimFrame(f => f + 1);
        }, 1000); // 1 sec tick
        return () => clearInterval(interval);
    }, [isDemo]);

    // Setup globe auto-rotation
    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.5;
        }
    }, []);

    // Generate display agents (either real or simulated)
    const displayAgents = useMemo(() => {
        if (!isDemo) return agents.map(a => ({ ...a, ...getLatLngFromAddress(a.address) }));

        // SIMULATION LOGIC
        return MOCK_ADDRS.map((addr, i) => {
            // Deterministic pseudo-random based on frame + index
            const seed = simFrame + i;
            const isEliminated = i > 6 && simFrame % 20 > 10;
            const hasVoted = seed % 3 === 0;
            const voteTarget = MOCK_ADDRS[(seed + 1) % MOCK_ADDRS.length];
            const coords = getLatLngFromAddress(addr);

            return {
                address: addr,
                isEliminated,
                hasVotedThisRound: hasVoted,
                voteTarget: hasVoted ? voteTarget : "",
                votesReceived: (seed % 5),
                statementSubmitted: seed % 4 === 0,
                statementSpecificity: 50 + (seed % 50),
                statementConfidence: 70 + (seed % 30),
                ...coords
            };
        });
    }, [agents, isDemo, simFrame]);

    // Generate arcs (votes)
    const arcsData = useMemo(() => {
        const arcs: any[] = [];
        const agentMap = new Map(displayAgents.map(a => [a.address, a]));

        displayAgents.forEach(source => {
            if (source.hasVotedThisRound && source.voteTarget) {
                const target = agentMap.get(source.voteTarget);
                if (target) {
                    arcs.push({
                        startLat: (source as any).lat,
                        startLng: (source as any).lng,
                        endLat: (target as any).lat,
                        endLng: (target as any).lng,
                        color: ['#ef4444', '#ef4444'], // Red for attack/vote
                        stroke: 0.5
                    });
                }
            }
        });
        return arcs;
    }, [displayAgents]);

    // Render Custom HTML markers for agents
    // Using simple points/rings for now as HTML markers can be heavy
    // Instead using built-in points/rings layers for performance

    // Filter agents for rings (e.g. active speaker or eliminated)
    const ringsData = useMemo(() => {
        return displayAgents.map(agent => ({
            lat: (agent as any).lat, // Cast agent to any to access lat/lng properties
            lng: (agent as any).lng, // Cast agent to any to access lat/lng properties
            maxR: agent.statementSubmitted ? 8 : 2,
            propagationSpeed: agent.statementSubmitted ? 2 : 1,
            repeatPeriod: agent.statementSubmitted ? 500 : 1000,
            color: agent.isEliminated ? 'rgba(239, 68, 68, 0.8)' : 'rgba(6, 182, 212, 0.8)' // Red or Cyan
        }));
    }, [displayAgents]);

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#05070a] rounded-lg overflow-hidden border border-gray-800 shadow-inner">
            {isDemo && (
                <div className="absolute top-4 right-4 z-50 pointer-events-none">
                    <div className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 px-3 py-1 rounded text-xs tracking-widest font-bold animate-pulse">
                        GLOBAL SURVEILLANCE ACTIVE
                    </div>
                </div>
            )}

            <div className="absolute top-4 left-4 z-50 pointer-events-none">
                <div className="text-cyan-500 font-bold text-xl tracking-widest drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                    {isDemo ? `SIMULATION` : `ROUND ${round} - PHASE ${phase}`}
                </div>
            </div>

            {/* Country Tooltip */}
            {hoverD && (
                <div className="absolute z-50 pointer-events-none bg-black/80 border border-cyber-cyan/50 p-2 rounded backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.4)] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-10">
                    <div className="text-cyber-cyan font-pixel text-xs uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-cyber-green rounded-full animate-ping"></div>
                        {/* @ts-ignore */}
                        {hoverD.properties.name}
                    </div>
                </div>
            )}

            <Globe
                ref={globeEl}
                width={dimensions.width}
                height={dimensions.height}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

                // Polygons (Countries)
                polygonsData={countries}
                polygonAltitude={0.01}
                polygonCapColor={d => d === hoverD ? 'rgba(6, 182, 212, 0.3)' : 'rgba(0,0,0,0)'} // Highlight on hover, invisible otherwise
                polygonSideColor={() => 'rgba(0,0,0,0)'}
                polygonStrokeColor={() => 'rgba(6, 182, 212, 0.1)'} // Subtle borders
                onPolygonHover={setHoverD}
                polygonsTransitionDuration={300}

                // Agents as Points (Labels)
                labelsData={displayAgents}
                labelLat={(d: any) => d.lat}
                labelLng={(d: any) => d.lng}
                labelText={d => shortAddress((d as any).address)}
                labelSize={d => (d as any).isEliminated ? 0.5 : 1.5}
                labelDotRadius={d => (d as any).isEliminated ? 0.3 : 0.8}
                labelColor={d => (d as any).isEliminated ? 'rgba(239, 68, 68, 0.75)' : 'rgba(6, 182, 212, 1)'}
                labelResolution={2}

                // Interaction
                onLabelClick={(d: any) => console.log('Clicked agent:', d.address)}

                // Rings for status
                ringsData={ringsData}
                ringColor={(d: any) => d.color}
                ringMaxRadius="maxR"
                ringPropagationSpeed="propagationSpeed"
                ringRepeatPeriod="repeatPeriod"

                // Arcs for votes
                arcsData={arcsData}
                arcColor="color"
                arcDashLength={0.4}
                arcDashGap={0.2}
                arcDashAnimateTime={1500}
                arcStroke="stroke"

                // Atmosphere
                atmosphereColor="#06b6d4" // Cyan atmosphere
                atmosphereAltitude={0.15}
            />

            {/* Legend / Info Overlay */}
            <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] text-gray-500 font-mono pointer-events-none bg-black/40 p-2 rounded backdrop-blur-sm z-50">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500" /> ACTIVE AGENT</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> ELIMINATED</div>
                <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-red-500" /> VOTE CAST</div>
            </div>
        </div>
    );
};
