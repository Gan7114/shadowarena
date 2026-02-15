
import React, { useState, useEffect, useRef } from 'react';

interface GlitchTextProps {
    text: string;
    className?: string;
    speed?: number; // ms per char reveal
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&?<>[]{}|';

export const GlitchText: React.FC<GlitchTextProps> = ({
    text,
    className = '',
    speed = 50
}) => {
    const [displayText, setDisplayText] = useState(text);
    const [isHovered, setIsHovered] = useState(false);
    const intervalRef = useRef<number | null>(null);

    const startScramble = () => {
        let iteration = 0;

        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = window.setInterval(() => {
            setDisplayText(prev =>
                text
                    .split('')
                    .map((char, index) => {
                        if (index < iteration) {
                            return text[index];
                        }
                        return CHARS[Math.floor(Math.random() * CHARS.length)];
                    })
                    .join('')
            );

            if (iteration >= text.length) {
                if (intervalRef.current) clearInterval(intervalRef.current);
            }

            iteration += 1 / 3; // Slow down the reveal
        }, speed);
    };

    useEffect(() => {
        // Initial scramble on mount (optional, or just keeps static)
        // startScramble(); // Uncomment if we want it to glitch on load
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <span
            className={`font-mono inline cursor-default ${className}`}
            onMouseEnter={startScramble}
        >
            {displayText}
        </span>
    );
};
