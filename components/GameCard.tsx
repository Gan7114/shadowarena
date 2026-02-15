
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, BrainCircuit, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlitchText } from './GlitchText';
import { getArenaStrategy } from '../lib/gemini';

export interface GameCardProps {
  title: React.ReactNode;
  uniqueKey: string;
  description: string;
  color: 'green' | 'red' | 'purple' | 'yellow' | 'multi';
  icon: any;
  path: string;
  stats: React.ReactNode[];
  id: string;
}

const GameCard: React.FC<GameCardProps> = ({
  title,
  uniqueKey,
  description,
  color,
  icon: Icon,
  path,
  stats,
  id
}) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  // Pixel Theme Colors
  const colors = {
    green: { border: 'border-cyber-green', text: 'text-cyber-green', bg: 'bg-cyber-green' },
    red: { border: 'border-cyber-red', text: 'text-cyber-red', bg: 'bg-cyber-red' },
    purple: { border: 'border-cyber-purple', text: 'text-cyber-purple', bg: 'bg-cyber-purple' },
    yellow: { border: 'border-cyber-yellow', text: 'text-cyber-yellow', bg: 'bg-cyber-yellow' },
    multi: { border: 'border-white', text: 'text-white', bg: 'bg-white' }
  }[color] || { border: 'border-gray-500', text: 'text-gray-500', bg: 'bg-gray-500' };

  const fetchBriefing = async () => {
    if (briefing) {
      setBriefing(null);
      return;
    }
    setLoadingBriefing(true);
    try {
      const data = await getArenaStrategy(uniqueKey);
      setBriefing(data || 'STRAT_LINK_FAILED');
    } catch (e) {
      setBriefing('ORACLE_OFFLINE');
    } finally {
      setLoadingBriefing(false);
    }
  };

  return (
    <div className={`group relative border-4 ${colors.border} bg-[#0a0a0a] transition-transform hover:-translate-y-2`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b-4 ${colors.border} bg-white/5`}>
        <div className={`px-2 py-1 text-xl ${colors.bg} text-black font-bold`}>ID_{id}</div>
        <button
          onClick={fetchBriefing}
          className={`flex items-center space-x-2 text-xl uppercase ${colors.text} hover:bg-white/10 px-2`}
        >
          {loadingBriefing ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
          <span>STRAT</span>
        </button>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {briefing ? (
            <motion.div
              key="briefing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 border-2 border-dashed border-gray-600 text-xl text-gray-300"
            >
              <div className={`${colors.text} uppercase mb-2`}>{'>>'} TACTICAL_DATA:</div>
              {briefing}
            </motion.div>
          ) : (
            <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-6">
                <div className={`inline-flex p-4 border-4 ${colors.border} ${colors.text}`}>
                  <Icon size={32} />
                </div>
              </div>

              <h3 className={`text-3xl md:text-4xl mb-4 uppercase ${colors.text} break-words leading-tight`}>
                {title}
              </h3>
              <p className="text-xl text-gray-500 mb-6 min-h-[4rem]">
                {description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {stats.map((stat, i) => (
            <div key={i} className="border-2 border-gray-800 p-2 text-center">
              <div className="text-lg text-gray-600 uppercase">{i === 0 ? 'POOL' : 'ACTIVE'}</div>
              <div className="text-2xl text-white">{stat}</div>
            </div>
          ))}
        </div>

        <Link
          to={path}
          className={`block w-full py-4 text-center text-2xl uppercase font-bold border-4 ${colors.border} ${colors.text} hover:${colors.bg} hover:text-black transition-colors relative overflow-hidden`}
        >
          <span>Initialize {'>>'}</span>
        </Link>
      </div>
    </div>
  );
};

export default GameCard;
