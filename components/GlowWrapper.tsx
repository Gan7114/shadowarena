import React from 'react';
import { motion } from 'framer-motion';

interface GlowWrapperProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    color?: 'cyan' | 'purple' | 'green' | 'multi';
}

export const GlowWrapper: React.FC<GlowWrapperProps> = ({ children, className = '', onClick, color = 'multi' }) => {

    const getGradient = () => {
        switch (color) {
            case 'cyan': return 'linear-gradient(90deg, #06b6d4, #22d3ee, #06b6d4)';
            case 'purple': return 'linear-gradient(90deg, #9333ea, #c084fc, #9333ea)';
            case 'green': return 'linear-gradient(90deg, #10b981, #34d399, #10b981)';
            case 'multi':
            default:
                return 'linear-gradient(90deg, #06b6d4, #9333ea, #10b981, #06b6d4)';
        }
    };

    return (
        <motion.div
            className={`relative group inline-block ${className}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
        >
            {/* Animated Glow Border */}
            <div
                className="absolute -inset-0.5 rounded-lg opacity-70 blur group-hover:opacity-100 transition duration-200"
                style={{
                    background: getGradient(),
                    backgroundSize: '200% 200%',
                    animation: 'border-spin 3s linear infinite'
                }}
            />

            {/* Content Container */}
            <div className="relative bg-black rounded-lg">
                {children}
            </div>
        </motion.div>
    );
};
