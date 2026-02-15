import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu } from 'lucide-react';
import { GlitchText } from './GlitchText';
import { Background3D } from './Background3D';

const StarField = () => {
  // Generate static stars to avoid hydration issues, but let them twinkle via CSS
  const stars = Array.from({ length: 50 }).map((_, i) => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    size: Math.random() > 0.8 ? 'w-1 h-1' : 'w-0.5 h-0.5'
  }));

  return (
    <div className="absolute inset-0 pointer-events-none z-[-5]">
      {stars.map((s, i) => (
        <div
          key={i}
          className={`absolute bg-white rounded-full animate-pulse ${s.size} opacity-40`}
          style={{ top: s.top, left: s.left, animationDelay: s.delay }}
        ></div>
      ))}
    </div>
  );
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen relative font-pixel bg-[#050505] overflow-x-hidden selection:bg-cyber-cyan selection:text-black">
      {/* 3D Background Layer */}
      <Background3D />

      {/* Retro Looping Background Overlay (Optional: keep for texture) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-5">
        {/* Advanced Grid */}
        <div className="retro-grid animate-scroll-grid opacity-10"></div>
        {/* Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_70%)]"></div>
        {/* Starfield */}
        <StarField />
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
      </div>

      {/* Glassmorphism Navbar */}
      <nav className="sticky top-0 z-50 bg-[#050505]/60 backdrop-blur-md border-b border-white/10 px-6 py-4 transition-all duration-300 hover:bg-[#050505]/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group hover:opacity-100 transition-opacity">
            <div className="relative p-1">
              <div className="absolute inset-0 bg-cyber-cyan blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative border-2 border-cyber-cyan bg-black/50 p-1">
                <Cpu className="text-cyber-cyan" size={24} />
              </div>
            </div>
            <span className="text-3xl text-white tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] group-hover:drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all flex items-center gap-2">
              <GlitchText text="SHADOW" speed={30} />
              <span className="text-cyber-cyan animate-pulse">_</span>
              <GlitchText text="ARENA" speed={30} />
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            {/* System Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 border border-cyber-green/30 bg-cyber-green/5 rounded-full">
              <div className="w-2 h-2 bg-cyber-green rounded-full animate-ping"></div>
              <span className="text-cyber-green text-xs tracking-wider">
                <GlitchText text="SYSTEM_ONLINE" speed={50} />
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 pb-24 relative z-10">
        {children}
      </main>
    </div>
  );
};
