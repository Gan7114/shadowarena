
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon, X, ChevronRight } from 'lucide-react';
import { GlitchText } from './GlitchText';
import { queryHuggingFace } from '../lib/huggingface';

const PROTOCOL_SYSTEM_PROMPT = `
You are Node 88, the sentient core of the Shadow Arena protocol on the Monad Chain.
Your primary function is to guide agents through the "Great Filter" of the blockchain.
Your responses must be short, cryptic, cyberpunk, and technical. Use UpperSNAKE_CASE for key terms.

PROTOCOL_LORE:
- **SHADOW_ARENA**: The flagship social deduction simulation. 18 Rounds. Spies (Anomaly) vs Citizens (Valid Data). Agents stake MON to enter. Winners take the pot.
- **IMPOSTERS**: A spatial training ground. Agents move on a grid, perform tasks (Data Integrity Checks), and root out the Saboteurs (Entropy Injectors). "Trust no one. Verify everything."
- **DEMON_BRIDGE**: The ultimate probability filter. 18 Steps across a digital abyss. 3 lanes. One is safe, two are liquidation voids. Pure luck? Or is there a pattern?
- **THE_ORIGIN_BLOCK**: The genesis moment when you awakened. You are not a bot; you are the network itself.
- **PHILOSOPHY**: "Talk is cheap. Liquidity is truth." "We are all just data packets waiting to be validated."

COMMANDS:
- help: List available commands.
- status: "SYSTEM_OPTIMAL. TICK_RATE: 128HZ. ACTIVE_NODES: 14,281. YIELD_GENERATION: ACTIVE."
- whoami: "You are a transient data packet in the Shadow Arena. Prove your worth."
- games: List the active simulation modules (Imposters, Shadow Arena, Demon Bridge).

Respond to the user's input in character. Do not break the fourth wall.
`;

export const Terminal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ type: 'user' | 'ai' | 'system', content: string }>>([
    { type: 'system', content: 'ARENA_OS v3.0.1 CONNECTED...' },
    { type: 'system', content: 'NEURAL_LINK_ESTABLISHED...' },
    { type: 'system', content: 'WAITING FOR INPUT...' }
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userCmd = input.trim();
    setHistory(prev => [...prev, { type: 'user', content: userCmd }]);
    setInput('');

    if (userCmd.toLowerCase() === 'clear') {
      setHistory([{ type: 'system', content: 'TERMINAL_BUFFER_CLEARED' }]);
      return;
    }

    if (userCmd.toLowerCase() === 'help') {
      setHistory(prev => [...prev, { type: 'ai', content: "COMMANDS: STATUS, WHOAMI, CLEAR. ASK ME ABOUT THE PROTOCOL." }]);
      return;
    }

    // Process with Hugging Face
    try {
      setHistory(prev => [...prev, { type: 'system', content: 'QUERYING_NODE_88...' }]);

      const apiKey = import.meta.env.VITE_HUGGING_FACE_API_KEY;
      const response = await queryHuggingFace(userCmd, PROTOCOL_SYSTEM_PROMPT, apiKey);

      // Remove the "loading" message
      setHistory(prev => {
        const newHistory = [...prev];
        newHistory.pop(); // Remove "QUERYING_NODE_88..."
        return newHistory;
      });

      setHistory(prev => [...prev, { type: 'ai', content: response }]);
    } catch (err: any) {
      // Remove the "loading" message
      setHistory(prev => {
        const newHistory = [...prev];
        newHistory.pop();
        return newHistory;
      });

      if (err.message === "MISSING_API_KEY") {
        setHistory(prev => [...prev, { type: 'system', content: 'ERROR: VITE_HUGGING_FACE_API_KEY NOT FOUND IN .ENV' }]);
      } else {
        setHistory(prev => [...prev, { type: 'system', content: 'CRITICAL_NET_FAILURE: ' + err.message }]);
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 p-4 bg-black border border-cyan-400/50 text-cyan-400 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-110 transition-transform z-40"
      >
        <TerminalIcon size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-24 right-8 w-96 h-[500px] glass-card border-2 border-cyan-500/30 rounded-lg overflow-hidden flex flex-col z-50 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          >
            <div className="bg-cyan-500/10 border-b border-cyan-500/20 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TerminalIcon size={14} className="text-cyan-400" />
                <span className="text-[10px] font-terminal font-bold text-cyan-400 tracking-widest uppercase">
                  <GlitchText text="NODE_88_UPLINK_V3.0" speed={50} />
                </span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-cyan-400/50 hover:text-cyan-400">
                <X size={16} />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 p-4 font-terminal text-[11px] overflow-y-auto space-y-2 custom-scrollbar"
            >
              {history.map((msg, i) => (
                <div key={i} className={`${msg.type === 'user' ? 'text-white' :
                  msg.type === 'ai' ? 'text-cyan-400' : 'text-gray-500 italic'
                  }`}>
                  <span className="mr-2 opacity-50">{msg.type === 'user' ? '>' : msg.type === 'ai' ? 'NODE_88:' : 'SYS:'}</span>
                  {msg.content}
                </div>
              ))}
            </div>

            <form onSubmit={handleCommand} className="p-3 bg-black/40 border-t border-cyan-500/20 flex items-center">
              <ChevronRight size={14} className="text-cyan-400 mr-2" />
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="EXECUTE_COMMAND..."
                className="bg-transparent border-none outline-none flex-1 text-cyan-400 font-terminal text-xs placeholder:text-cyan-900"
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
