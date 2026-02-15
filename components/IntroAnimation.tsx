import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PixelEarth } from './PixelEarth';

export const IntroAnimation: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const [zooming, setZooming] = useState(false);

  const bootText = [
    "INITIALIZING KERNEL...",
    "LOADING NEURAL NETWORKS...",
    "VERIFYING BLOCKCHAIN HASH...",
    "CONNECTING TO NODE 88...",
    "ACCESS GRANTED."
  ];

  useEffect(() => {
    // Progress Bar Simulation
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 8; // Faster loading
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, 80); // Slower interval to reduce main thread blocking

    // Text Cycling
    const textTimer = setInterval(() => {
      setTextIndex(prev => (prev < bootText.length - 1 ? prev + 1 : prev));
    }, 600);

    return () => {
      clearInterval(timer);
      clearInterval(textTimer);
    };
  }, []);

  // Safety Failsafe: Ensure animation completes eventually even if logic stalls
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!zooming) {
        console.warn("Animation stalled, forcing completion");
        setZooming(true);
        setTimeout(onComplete, 1200);
      }
    }, 8000); // 8s max wait

    return () => clearTimeout(safetyTimer);
  }, [zooming, onComplete]);

  // Trigger Zoom when progress hits 100%
  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        setZooming(true);
        // Delay onComplete to match the zoom duration (1.5s)
        setTimeout(onComplete, 1200);
      }, 500);
    }
  }, [progress, onComplete]);

  // Calculate base scale during load
  const loadingScale = 1 + (progress / 200);

  return (
    <div className="fixed inset-0 bg-[#050505] z-[100] flex flex-col items-center justify-center font-pixel text-white overflow-hidden perspective-1000">
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20 z-50"></div>

      <AnimatePresence>
        <motion.div
          key="intro-container"
          className="relative z-10 flex flex-col items-center justify-center w-full h-full"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Earth - Centered & Scaling */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-0"
            animate={{
              scale: zooming ? 100 : loadingScale, // Zoom into Earth (100x scale)
              opacity: zooming ? 0 : 1 // Fade out at the very end of zoom to avoid clipping artifacts
            }}
            transition={{
              duration: zooming ? 1.5 : 0.1,
              ease: zooming ? "easeInOut" : "linear"
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-cyber-cyan/30 blur-2xl rounded-full animate-pulse"></div>
              {/* Render Earth */}
              <PixelEarth size={300} />
            </div>
          </motion.div>

          {/* Content Overlay - Fades out when zooming starts */}
          <motion.div
            className="z-10 flex flex-col items-center max-w-2xl px-8 bg-black/40 p-12 rounded-2xl backdrop-blur-sm border border-cyber-cyan/10"
            animate={{ opacity: zooming ? 0 : 1, scale: zooming ? 1.5 : 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* ASCII Art Logo */}
            <pre className="text-[8px] md:text-xs text-cyber-cyan leading-none mb-8 opacity-80 select-none hidden md:block">
              {`
   _____ _    _          _____   ______          __           _____  ______ _   _          
  / ____| |  | |   /\   |  __ \\ / __ \\ \\        / /   /\\     |  __ \\|  ____| \\ | |   /\    
 | (___ | |__| |  /  \\  | |  | | |  | \\ \\  /\\  / /   /  \\    | |__) | |__  |  \\| |  /  \\   
  \\___ \\|  __  | / /\\ \\ | |  | | |  | |\\ \\/  \\/ /   / /\\ \\   |  _  /|  __| | . \` | / /\\ \\  
  ____) | |  | |/ ____ \\| |__| | |__| | \\  /\\  /   / ____ \\  | | \\ \\| |____| |\\  |/ ____ \\ 
 |_____/|_|  |_/_/    \\_\\_____/ \\____/   \\/  \\/   /_/    \\_\\ |_|  \\_\\______|_| \\_/_/    \\_\\
`}
            </pre>

            <h1 className="md:hidden text-4xl text-cyber-cyan tracking-widest mb-8 text-center text-shadow-glow">SHADOW_ARENA</h1>

            {/* Loading Bar */}
            <div className="w-full h-2 border border-gray-600 p-[2px] mb-4 relative bg-black/80">
              <div
                className="h-full bg-cyber-cyan shadow-[0_0_15px_#06b6d4] transition-all duration-75 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>

            {/* Status Text */}
            <div className="flex justify-between items-end w-full">
              <div className="text-sm text-cyber-green animate-pulse font-mono">
                {'>'} {bootText[textIndex]}<span className="animate-[blink_1s_infinite]">_</span>
              </div>
              <div className="text-xl text-cyber-cyan font-bold font-mono">
                {Math.min(Math.floor(progress), 100)}%
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
