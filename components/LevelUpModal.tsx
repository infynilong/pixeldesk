"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    newLevel: number;
    levelName: string;
    rewards?: string[]; // Optional: list of unlocked features
}

export default function LevelUpModal({
    isOpen,
    onClose,
    newLevel,
    levelName,
    rewards = []
}: LevelUpModalProps) {
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            // Play sound?
            const audio = new Audio('/sounds/levelup.mp3'); // hypothetical
            audio.volume = 0.5;
            audio.play().catch(() => { }); // ignore error
        } else {
            setShowConfetti(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        // Trigger a global data refresh when closing the modal to ensure UI is in sync
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refresh-user-data'));
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Confetti Effect (Simple CSS or Canvas placeholder) */}
                    {showConfetti && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {/* CSS Particles could go here */}
                        </div>
                    )}

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.5, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", damping: 15, stiffness: 100 }}
                        className="relative w-full max-w-md bg-gradient-to-br from-indigo-900 to-purple-900 border-2 border-yellow-400 p-8 rounded-2xl shadow-[0_0_50px_rgba(250,204,21,0.3)] text-center overflow-hidden"
                    >
                        {/* Background rays */}
                        <div className="absolute inset-0 animate-[spin_10s_linear_infinite] opacity-20" style={{
                            background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, yellow 20deg, transparent 40deg, yellow 60deg, transparent 80deg, yellow 100deg, transparent 120deg)'
                        }}></div>

                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white ring-4 ring-yellow-500/50"
                            >
                                <span className="text-4xl font-black text-white drop-shadow-md">{newLevel}</span>
                            </motion.div>

                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-3xl font-bold font-pixel text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-white to-yellow-200 drop-shadow-sm uppercase tracking-widest"
                            >
                                LEVEL UP!
                            </motion.h2>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="space-y-2"
                            >
                                <p className="text-indigo-200 font-retro">You are now a</p>
                                <div className="text-xl font-bold text-white bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                                    {levelName}
                                </div>
                            </motion.div>

                            {rewards.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.8 }}
                                    className="mt-4 bg-black/30 w-full rounded-xl p-4 border border-white/10"
                                >
                                    <h4 className="text-xs uppercase text-white/50 mb-2 font-bold tracking-wider">Unlocked Features</h4>
                                    <ul className="space-y-1">
                                        {rewards.map((r, i) => (
                                            <li key={i} className="text-sm text-yellow-300 flex items-center justify-center gap-2">
                                                <span>🔓</span> {r}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleClose}
                                className="mt-6 px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg border-b-4 border-orange-700 active:border-b-0 active:mt-[27px]"
                            >
                                CONTINUE
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
