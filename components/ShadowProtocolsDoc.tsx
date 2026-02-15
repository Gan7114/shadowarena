import React from 'react';
import { GlitchText } from './GlitchText';

export const ShadowProtocolsDoc: React.FC = () => {
    return (
        <div className="h-full overflow-y-auto pr-4 font-mono text-sm text-gray-400 space-y-8 custom-scrollbar">
            {/* Header */}
            <div className="border-b border-cyber-red pb-4 mb-6">
                <h1 className="text-2xl text-cyber-red font-bold mb-2">
                    <GlitchText text="SHADOW_PROTOCOL // AGENT_SKILL_FILE" speed={20} />
                </h1>
                <p className="text-xs uppercase tracking-widest text-gray-500">
                    CLASSIFIED_DOCUMENT // CLEARANCE_LEVEL_5
                </p>
            </div>

            {/* 1. System Overview */}
            <section>
                <h2 className="text-xl text-white font-bold mb-3 border-l-4 border-cyber-red pl-3">
                    1. SYSTEM_OVERVIEW
                </h2>
                <p className="mb-2">
                    Shadow Protocol is a timed, phase-gated, adversarial game with commit-reveal role assignment and Merkle proof confirmation for spy eliminations.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-500">
                    <li>Core protocol: <span className="text-cyber-red">SpyProtocol</span></li>
                    <li>Prediction market: <span className="text-cyber-red">ShadowPredictionMarket</span></li>
                    <li>Agent runtime: <span className="text-cyber-red">AgentEngine</span></li>
                    <li>Orchestration: <span className="text-cyber-red">GameMaster, GameLoop</span></li>
                </ul>
            </section>

            {/* 2. Network */}
            <section>
                <h2 className="text-xl text-white font-bold mb-3 border-l-4 border-cyber-red pl-3">
                    2. NETWORK_AND_CONTRACTS
                </h2>
                <div className="bg-black/50 p-4 border border-gray-800 rounded">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <span className="text-gray-500">Mainnet Chain ID:</span>
                        <span className="text-cyber-cyan">143</span>
                        <span className="text-gray-500">RPC:</span>
                        <span className="text-cyber-cyan">https://rpc.monad.xyz</span>
                    </div>
                    <div className="text-xs text-gray-600 font-mono">
                        $ npx hardhat run scripts/deploy.ts --network hardhat
                    </div>
                </div>
            </section>

            {/* 3. Core Timers */}
            <section>
                <h2 className="text-xl text-white font-bold mb-3 border-l-4 border-cyber-red pl-3">
                    3. CORE_TIMERS_LIMITS
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        ['MAX_ROUNDS', '3'],
                        ['REGISTRATION', '2 minutes'],
                        ['STATEMENT', '1 minute'],
                        ['VOTING', '1 minute'],
                        ['HARD_TIME_CAP', '10 minutes'],
                        ['BURN_RATE', '20% (2000 BPS)'],
                        ['MIN_AGENTS', '4']
                    ].map(([key, val]) => (
                        <div key={key} className="flex justify-between border-b border-gray-800 pb-1">
                            <span className="text-gray-500">{key}</span>
                            <span className="text-white">{val}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. Phase Machine */}
            <section>
                <h2 className="text-xl text-white font-bold mb-3 border-l-4 border-cyber-red pl-3">
                    4. PHASE_MACHINE
                </h2>
                <div className="flex flex-wrap gap-2">
                    {['Idle', 'Registration', 'CommitWaiting', 'RevealWaiting', 'WordDistribution', 'Statement', 'Voting', 'Elimination', 'GameOver'].map((phase, i) => (
                        <span key={phase} className="px-2 py-1 bg-cyber-red/10 border border-cyber-red/30 text-cyber-red text-xs rounded">
                            0{i + 1}_{phase.toUpperCase()}
                        </span>
                    ))}
                </div>
            </section>

            {/* 7. Win Conditions */}
            <section>
                <h2 className="text-xl text-white font-bold mb-3 border-l-4 border-cyber-red pl-3">
                    7. WIN_CONDITIONS
                </h2>
                <div className="space-y-3">
                    <div className="bg-cyber-cyan/5 p-3 border-l-2 border-cyber-cyan">
                        <span className="text-cyber-cyan font-bold block">CITIZENS_WIN</span>
                        Confirmed eliminated spies &ge; configured spy count.
                    </div>
                    <div className="bg-cyber-red/5 p-3 border-l-2 border-cyber-red">
                        <span className="text-cyber-red font-bold block">SPY_WINS</span>
                        Alive count is too low or terminal state reached.
                    </div>
                </div>
            </section>

            {/* 11. Runtime Skills */}
            <section>
                <h2 className="text-xl text-white font-bold mb-3 border-l-4 border-cyber-red pl-3">
                    11. RUNTIME_SKILL_CONFIG
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-cyber-cyan mb-2 border-b border-gray-800">CITIZEN_PARAMS</h3>
                        <ul className="space-y-1 text-xs text-gray-400">
                            <li>baseRiskTolerance</li>
                            <li>baseAggressiveness</li>
                            <li>betRiskFloor</li>
                            <li>betConfidenceThreshold</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-cyber-red mb-2 border-b border-gray-800">SPY_PARAMS</h3>
                        <ul className="space-y-1 text-xs text-gray-400">
                            <li>baseRiskTolerance</li>
                            <li>baseAggressiveness</li>
                            <li>detectionRiskBluffThreshold</li>
                            <li>lateGameAggressiveness</li>
                        </ul>
                    </div>
                </div>
            </section>

            <div className="text-center pt-8 text-gray-600 text-xs">
                END_OF_FILE // MONAD_HACKATHON_V1.0
            </div>
        </div>
    );
};
