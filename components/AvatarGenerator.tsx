import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Download, RefreshCw, Cpu } from 'lucide-react';
import { createAvatar } from '@dicebear/core';
import { bottts } from '@dicebear/collection';
import { generateAvatarImage } from '../lib/huggingface';
import { GlitchText } from './GlitchText';

export const AvatarGenerator: React.FC = () => {
  const [seed, setSeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [mode] = useState<'ai' | 'dicebear'>('ai');

  // --- 3D Tilt Logic ---
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleGenerate = async () => {
    if (!seed.trim()) return;
    setLoading(true);
    setGeneratedAvatar(null);

    if (mode === 'ai') {
      try {
        const apiKey = import.meta.env.VITE_HUGGING_FACE_API_KEY;
        const prompt = `cyberpunk avatar, ${seed}, neon style, digital art, high contrast, futuristic, glitch effect, portrait`;
        const imageUrl = await generateAvatarImage(prompt, apiKey);
        setGeneratedAvatar(imageUrl);
        setLoading(false);
        return;
      } catch (err) {
        console.warn("AI Generation failed, falling back to DiceBear", err);
      }
    }

    try {
      const avatar = createAvatar(bottts, {
        seed: seed,
        backgroundColor: ['transparent'],
        scale: 120,
      });
      const svg = avatar.toString();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      setGeneratedAvatar(url);
    } catch (e) {
      console.error("Avatar generation failed", e);
    } finally {
      setLoading(false);
    }
  };

  const downloadAvatar = () => {
    if (generatedAvatar) {
      const link = document.createElement('a');
      link.href = generatedAvatar;
      link.download = `shadow_identity_${seed}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row gap-16 items-center justify-between">

        {/* Controls Section */}
        <div className="flex-1 space-y-8 w-full z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 text-cyber-cyan animate-pulse">
              <Cpu size={20} />
              <h3 className="text-xl tracking-widest font-bold uppercase font-pixel">
                <GlitchText text="Bio_Synthesis_Module" speed={30} />
              </h3>
            </div>
            <h2 className="text-5xl text-white font-bold mb-6 font-pixel leading-tight">
              <GlitchText text="GENERATE" speed={60} /> <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan to-cyber-purple drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                <GlitchText text="IDENT_CHIP" speed={60} />
              </span>
            </h2>
            <p className="text-gray-400 font-mono text-sm leading-relaxed border-l-2 border-cyber-cyan pl-4">
              <GlitchText text="Enter unique seed phrase. System will forge a deterministic visual identity." speed={5} />
              <br />
              <span className="text-cyber-green"> &gt;&gt; <GlitchText text="AI Generation Active." speed={20} /></span>
            </p>
          </div>

          <div className="space-y-6 relative">
            {/* Input Glitch effect container */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyber-cyan to-cyber-purple rounded opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt blur"></div>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="ENTER SEED PHRASE..."
                className="relative w-full bg-black border border-gray-800 p-6 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyber-cyan transition-all font-mono text-xl uppercase tracking-wider"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !seed}
              className={`w-full py-5 text-xl tracking-[0.2em] font-bold uppercase transition-all flex items-center justify-center gap-3 relative overflow-hidden group
                          ${loading || !seed
                  ? 'bg-gray-900 text-gray-600 cursor-not-allowed border border-gray-800'
                  : 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan hover:bg-cyber-cyan hover:text-black shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)]'
                }`}
            >
              {loading ? <RefreshCw className="animate-spin" /> : <Cpu />}
              <span className="relative z-10">
                {loading ? <GlitchText text="SYNTHESIZING..." speed={50} /> : <GlitchText text="EXECUTE_SYNTHESIS" speed={30} />}
              </span>
              {!loading && seed && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>}
            </button>
          </div>
        </div>

        {/* 3D Holographic Card Preview */}
        <motion.div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          className="relative w-80 h-96 rounded-xl perspective-1000 cursor-pointer"
        >
          <div
            className="absolute inset-0 holographic-card rounded-xl transform transition-transform duration-200"
            style={{ transform: "translateZ(20px)" }}
          >
            {/* Card Content Layer */}
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center" style={{ transform: "translateZ(30px)" }}>

              {/* Corner Accents */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyber-cyan opacity-50"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyber-cyan opacity-50"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyber-cyan opacity-50"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyber-cyan opacity-50"></div>

              {/* Image Container */}
              <div className="relative w-48 h-48 mb-6 border-2 border-cyber-cyan/30 bg-black/50 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                {generatedAvatar ? (
                  <img
                    src={generatedAvatar}
                    alt="Generated Identity"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-cyber-cyan/20 animate-pulse">
                    <span className="text-4xl">?</span>
                  </div>
                )}
                {/* Scanline Overlay on Image */}
                <div className="scanline-overlay absolute inset-0"></div>
              </div>

              {/* Footer Info */}
              <div className="text-center w-full">
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyber-cyan/50 to-transparent mb-4"></div>
                <h4 className="text-cyber-cyan font-mono text-sm tracking-widest mb-1">
                  {generatedAvatar ? "IDENTITY_CONFIRMED" : "NO_DATA"}
                </h4>
                <p className="text-[10px] text-gray-500 font-mono">
                  {generatedAvatar ? `HASH: ${seed.slice(0, 8).toUpperCase()}...` : "WAITING FOR INPUT"}
                </p>
              </div>

              {/* Download Action */}
              {generatedAvatar && (
                <button
                  onClick={(e) => { e.stopPropagation(); downloadAvatar(); }}
                  className="absolute -bottom-16 flex items-center gap-2 text-cyber-cyan hover:text-white transition-colors text-sm font-mono tracking-widest bg-black/80 px-4 py-2 border border-cyber-cyan/30 rounded-full hover:bg-cyber-cyan/20"
                >
                  <Download size={14} />
                  SAVE_ASSET -&gt;
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

