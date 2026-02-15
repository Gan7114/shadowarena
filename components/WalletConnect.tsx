import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { connectWallet, hasWallet, shortAddress } from '../lib/onchain';
import { GlowWrapper } from './GlowWrapper';
import { GlitchText } from './GlitchText';

export const WalletConnect: React.FC = () => {
    const [account, setAccount] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [error, setError] = useState<string | null>(null);



    const handleConnect = async () => {
        if (account) {
            // Disconnect logic (Client-side only)
            setAccount(null);
            return;
        }

        try {
            setError(null);
            const address = await connectWallet();
            setAccount(address);
        } catch (err: any) {
            console.error("Wallet connection failed:", err);
            setError("CONNECTION_FAILED");
            setTimeout(() => setError(null), 3000);
        }
    };

    return (
        <GlowWrapper color="cyan">
            <button
                onClick={handleConnect}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="px-8 py-3 bg-black text-cyber-cyan border border-cyber-cyan text-2xl uppercase tracking-widest hover:bg-cyber-cyan hover:text-black transition-colors flex items-center justify-center space-x-2 w-full h-full min-w-[200px]"
            >
                <Terminal size={24} />
                <span>
                    {error ? <GlitchText text={error} speed={20} /> :
                        account ? (isHovered ? <GlitchText text="DISCONNECT" speed={30} /> : shortAddress(account)) :
                            <GlitchText text="CONNECT" speed={30} />}
                </span>
            </button>
        </GlowWrapper>
    );
};
