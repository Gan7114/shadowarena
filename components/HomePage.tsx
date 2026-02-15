import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Target, Users, Trophy, TrendingUp, Skull, Swords } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlitchText } from './GlitchText';
import GameCard from './GameCard';
import { WalletConnect } from './WalletConnect';
import { AIOracle } from './AIOracle';
import { AvatarGenerator } from './AvatarGenerator';
import { Terminal } from './Terminal';
import { PixelEarth } from './PixelEarth';
import { GlowWrapper } from './GlowWrapper';
import { Manifesto } from './Manifesto';
import { ShadowProtocolsDoc } from './ShadowProtocolsDoc';

import { useGlobalStats } from '../hooks/useGlobalStats';
import { IMPOSTER_SKILL_MD, SHADOW_SKILL_MD } from '../data/skills';

const HomePage: React.FC = () => {
  const [showManifesto, setShowManifesto] = useState(false);
  const [activeSkill, setActiveSkill] = useState<'imposter' | 'shadow' | null>(null);
  const stats = useGlobalStats();

  const skills = {
    imposter: [
      { name: 'BASE_RISK_TOLERANCE', desc: 'Dynamic threshold for executing potentially observable sabotage.' },
      { name: 'DETECTION_RISK_BLUFF', desc: 'Calculated probability of feigning innocence when accused.' },
      { name: 'LATE_GAME_AGGRESSIVENESS', desc: 'Exponentially increasing elimination frequency as round timer decays.' },
      { name: 'END_GAME_RISK_TOLERANCE', desc: 'Maximumentropy moveset when ALIVE_COUNT <= 3.' }
    ],
    shadow: [
      { name: 'BASE_AGGRESSIVENESS', desc: 'Frequency of vote initiation against suspicious nodes.' },
      { name: 'BET_RISK_FLOOR', desc: 'Minimum confidence score required to stake MON on a prediction.' },
      { name: 'BET_CONFIDENCE_THRESHOLD', desc: 'Delta required between internal model and market odds.' },
      { name: 'AGGRESSIVENESS_BY_ROUND', desc: 'Round-dependent scaling of accusation volatility.' }
    ]
  };

  return (
    <div className="space-y-16 font-pixel relative">

      {/* Hero Section */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-7xl mx-auto gap-12 z-10">

          {/* Text Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-left space-y-6 max-w-2xl"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="h-1 w-12 bg-cyber-cyan"></div>
              <span className="px-4 py-1 border-2 border-cyber-cyan text-cyber-cyan text-xl tracking-[0.2em] bg-cyber-cyan/10">
                <GlitchText text="SYSTEM_READY" speed={40} />
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl text-white leading-none uppercase tracking-widest" style={{ textShadow: '4px 4px 0px #06b6d4' }}>
              <GlitchText text="SHADOW" speed={20} /><br /><GlitchText text="ARENA" speed={20} />
            </h1>

            <p className="text-2xl text-gray-400 uppercase tracking-wide leading-relaxed">
              <span className="text-cyber-cyan">{'>'}</span> <GlitchText text="The advanced social deduction layer." speed={10} /><br />
              <span className="text-cyber-cyan">{'>'}</span> <GlitchText text="Analyze. Bet. Survive." speed={15} /><br />
              <span className="text-cyber-cyan">{'>'}</span> <GlitchText text="Node 88 is listening." speed={20} />
            </p>

            <div className="flex flex-wrap gap-6 pt-4">
              <div className="w-full md:w-auto">
                <WalletConnect />
              </div>

              <GlowWrapper color="purple">
                <button
                  onClick={() => setShowManifesto(true)}
                  className="px-8 py-3 bg-black text-gray-300 border border-gray-600 text-2xl uppercase tracking-widest hover:border-white hover:text-white transition-colors w-full h-full"
                >
                  Manifesto
                </button>
              </GlowWrapper>
            </div>
          </motion.div>

          {/* Earth Side */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="absolute top-0 right-0 -mr-12 -mt-12 text-cyber-cyan/50 text-9xl select-none font-bold opacity-20">+</div>
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 text-cyber-purple/50 text-9xl select-none font-bold opacity-20">+</div>
            <PixelEarth />
          </motion.div>
        </div>
      </section>

      {/* AI Network Oracle */}
      <AIOracle />

      {/* Arcade Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: <GlitchText text="Network_Load" speed={10} />, value: stats.activeNodes, icon: Users, color: 'text-cyber-cyan' },
          { label: <GlitchText text="Active_Agents" speed={10} />, value: stats.activeAgents, icon: Target, color: 'text-cyber-purple' },
          { label: <GlitchText text="Total_Yield" speed={10} />, value: stats.totalYield, icon: Trophy, color: 'text-cyber-yellow' },
          { label: <GlitchText text="Tick_Rate" speed={10} />, value: stats.tickRate, icon: TrendingUp, color: 'text-cyber-green' },
        ].map((stat, i) => (
          <div
            key={i}
            className="group border-4 border-gray-800 bg-gray-900/80 p-6 relative hover:border-white transition-colors backdrop-blur-sm"
          >
            <div className="absolute top-2 right-2 text-xl text-gray-700">0{i + 1}</div>
            <div className={`mb-4 ${stat.color}`}>
              <stat.icon size={32} />
            </div>
            <div className="text-4xl text-white mb-1">{stat.value}</div>
            <div className="text-xl text-gray-500 uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Games Selection */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <GlowWrapper color="green" className="w-full">
          <GameCard
            id="01"
            title={<GlitchText text="IMPOSTERS" speed={20} />}
            uniqueKey="IMPOSTERS"
            description="Identify the anomaly. Vote. Eject. The system integrity is at risk."
            color="green"
            icon={Shield}
            path="/imposters"
            stats={[<GlitchText text="4.2 MON" speed={10} />, <GlitchText text="24 ACTIVE" speed={10} />]}
          />
        </GlowWrapper>

        <GlowWrapper color="multi" className="w-full">
          <GameCard
            id="02"
            title={<GlitchText text="SHADOW ARENA" speed={20} />}
            uniqueKey="SHADOW_ARENA"
            description="High-velocity elimination. Sabotage subroutines. Bet on survival."
            color="red"
            icon={Target}
            path="/shadow"
            stats={[<GlitchText text="12.8 MON" speed={10} />, <GlitchText text="12 ACTIVE" speed={10} />]}
          />
        </GlowWrapper>

        <GlowWrapper color="purple" className="w-full">
          <GameCard
            id="03"
            title={<GlitchText text="DEMON BRIDGE" speed={20} />}
            uniqueKey="DEMON_BRIDGE"
            description="Chaotic unit logic. Traverse 18-step probability fields."
            color="purple"
            icon={Skull}
            path="/demon"
            stats={[<GlitchText text="18.5 MON" speed={10} />, <GlitchText text="16 UNITS" speed={10} />]}
          />
        </GlowWrapper>

        <GlowWrapper color="yellow" className="w-full">
          <GameCard
            id="04"
            title={<GlitchText text="SHADOW FIGHTER" speed={20} />}
            uniqueKey="SHADOW_FIGHTER"
            description="Free-to-play deep-galaxy dogfight. Plug into a live server for multiplayer battles."
            color="yellow"
            icon={Swords}
            path="/fighter"
            stats={[<GlitchText text="FREE PLAY" speed={10} />, <GlitchText text="MULTIPLAYER" speed={10} />]}
          />
        </GlowWrapper>
      </section>

      {/* Avatar Generator */}
      <section className="pt-8 border-t-4 border-gray-800">
        <div className="text-center mb-8">
          <h2 className="text-4xl text-white tracking-widest uppercase mb-4"><GlitchText text="Identity_Forge" speed={30} /></h2>
          <div className="flex justify-center space-x-2">
            <div className="w-4 h-4 bg-cyber-cyan"></div>
            <div className="w-4 h-4 bg-cyber-purple"></div>
            <div className="w-4 h-4 bg-cyber-red"></div>
          </div>
        </div>
        <AvatarGenerator />
      </section>

      {/* Agent Skills Section */}
      <section className="pt-8 border-t-4 border-gray-800 text-center">
        <h2 className="text-4xl text-white tracking-widest uppercase mb-8"><GlitchText text="AGENT_SKILLS" speed={40} /></h2>

        <div className="flex flex-col md:flex-row justify-center gap-8 max-w-4xl mx-auto mb-12">
          <GlowWrapper color="green" className="w-full">
            <button
              onClick={() => setActiveSkill(activeSkill === 'imposter' ? null : 'imposter')}
              className={`w-full py-6 bg-black border-2 ${activeSkill === 'imposter' ? 'border-white text-white bg-cyber-green/10' : 'border-cyber-green text-cyber-green'} text-2xl font-bold uppercase tracking-widest hover:bg-cyber-green hover:text-black transition-all group relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-cyber-green/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                <GlitchText text="IMPOSTER_MIND" speed={30} />
                <span className="text-sm border border-cyber-green px-2 rounded">LVL.1</span>
              </span>
            </button>
          </GlowWrapper>

          <GlowWrapper color="red" className="w-full">
            <button
              onClick={() => setActiveSkill(activeSkill === 'shadow' ? null : 'shadow')}
              className={`w-full py-6 bg-black border-2 ${activeSkill === 'shadow' ? 'border-white text-white bg-cyber-red/10' : 'border-cyber-red text-cyber-red'} text-2xl font-bold uppercase tracking-widest hover:bg-cyber-red hover:text-black transition-all group relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-cyber-red/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                <GlitchText text="SHADOW_SIGHT" speed={30} />
                <span className="text-sm border border-cyber-red px-2 rounded">LOCKED</span>
              </span>
            </button>
          </GlowWrapper>
        </div>

        <AnimatePresence mode="wait">
          {activeSkill && (
            <motion.div
              key={activeSkill}
              initial={{ opacity: 0, height: 0, y: 20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 20 }}
              className="max-w-4xl mx-auto overflow-hidden"
            >
              <div className={`border-t-2 ${activeSkill === 'imposter' ? 'border-cyber-green' : 'border-cyber-red'} pt-8`}>
                <h3 className={`text-2xl mb-6 tracking-widest ${activeSkill === 'imposter' ? 'text-cyber-green' : 'text-cyber-red'}`}>
                  <GlitchText text={`${activeSkill.toUpperCase()}_PROTOCOLS`} speed={20} />
                </h3>

                <div className="bg-gray-900/90 p-6 border border-gray-800 rounded font-mono text-sm overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar text-left">
                  <pre className={`whitespace-pre-wrap ${activeSkill === 'imposter' ? 'text-cyber-green' : 'text-cyber-red'}`}>
                    {activeSkill === 'imposter' ? IMPOSTER_SKILL_MD : SHADOW_SKILL_MD}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <Terminal />

      {/* Modals */}
      <Manifesto isOpen={showManifesto} onClose={() => setShowManifesto(false)} />
    </div>
  );
};

export default HomePage;
