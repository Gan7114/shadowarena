import React, { useState, useEffect } from 'react';
import { Activity, Zap, BrainCircuit, RefreshCw, Trophy } from 'lucide-react';
import { getNetworkStatus } from '../lib/gemini';
import { AgentsLeaderboard } from './AgentsLeaderboard';
import { GlowWrapper } from './GlowWrapper';

export const AIOracle: React.FC = () => {
  const [status, setStatus] = useState<string>('SYNCHRONIZING_CORE...');
  const [loading, setLoading] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [metrics, setMetrics] = useState({ cpu: 14, mem: 42, threads: 128 });

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const newStatus = await getNetworkStatus();
      setStatus(newStatus || 'CORE_TIMEOUT');
    } catch (e) {
      setStatus('OFFLINE_PROTOCOL_ENGAGED');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(() => {
      setMetrics({
        cpu: Math.floor(Math.random() * 20) + 5,
        mem: Math.floor(Math.random() * 30) + 30,
        threads: 128 + Math.floor(Math.random() * 10)
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <section className="border-4 border-cyber-purple bg-black p-6 relative overflow-hidden mb-16">
        <div className="absolute top-2 left-2 right-2 h-1 bg-cyber-purple opacity-30 animate-pulse"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-4 w-full max-w-2xl">
            <div className="flex items-center space-x-3 text-cyber-purple">
              <BrainCircuit size={24} />
              <span className="text-xl tracking-widest uppercase">Oracle_V9</span>
            </div>

            <div className="flex items-center gap-6">
              <GlowWrapper color="multi">
                <button
                  onClick={() => setShowLeaderboard(true)}
                  className="flex items-center gap-3 px-6 py-3 bg-black border border-cyber-purple text-cyber-purple hover:text-white hover:bg-cyber-purple transition-all uppercase tracking-widest text-xl font-bold"
                >
                  <Trophy size={24} />
                  <span>ACCESS_LEADERBOARD</span>
                </button>
              </GlowWrapper>

              <div className="hidden md:block h-12 w-[1px] bg-gray-800"></div>

              <div className="text-gray-500 text-sm font-mono hidden md:block">
                 // VIEW TOP PERFORMING AGENTS<br />
                 // SYSTEM_RANKINGS_LIVE
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-700 p-4 text-xl text-cyber-purple min-h-[80px] flex items-center bg-[#080808]">
              {loading ? (
                <div className="flex items-center space-x-3">
                  <RefreshCw size={20} className="animate-spin" />
                  <span>DECRYPTING...</span>
                </div>
              ) : (
                <span>{'>'} {status}</span>
              )}
            </div>

            <button
              onClick={refreshStatus}
              disabled={loading}
              className="text-xl text-cyber-purple hover:bg-cyber-purple hover:text-black px-4 py-1 border-2 border-cyber-purple uppercase transition-colors"
            >
              [ FORCE_RESCAN ]
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto">
            {[
              { label: 'CPU', val: `${metrics.cpu}%`, icon: Zap, color: 'text-cyber-cyan' },
              { label: 'MEM', val: `${metrics.mem}%`, icon: Activity, color: 'text-cyber-purple' },
              { label: 'HZ', val: `${metrics.threads}`, icon: Activity, color: 'text-cyber-green' },
            ].map((m, i) => (
              <div key={i} className="border-2 border-gray-800 p-4 min-w-[120px] bg-gray-900 text-center">
                <div className={`flex justify-center mb-2 ${m.color}`}>
                  <m.icon size={24} />
                </div>
                <div className="text-3xl text-white mb-1">{m.val}</div>
                <div className="text-lg text-gray-500 uppercase">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AgentsLeaderboard isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </>
  );
};

