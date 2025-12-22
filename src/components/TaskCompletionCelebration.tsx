/**
 * Task Completion Celebration
 * 
 * Displays a beautiful confetti animation when a task is marked as complete.
 * Apple-like smooth animation with premium feel.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { CheckCircleIcon } from "./icons/CustomIcons";

interface ConfettiPiece {
    id: number;
    x: number;
    y: number;
    rotation: number;
    color: string;
    delay: number;
}

interface TaskCompletionCelebrationProps {
    show: boolean;
    onComplete?: () => void;
    taskTitle?: string;
}

const confettiColors = [
    "#A78BFA", // Purple
    "#60A5FA", // Blue
    "#34D399", // Green
    "#FBBF24", // Yellow
    "#F472B6", // Pink
    "#FB923C", // Orange
];

export default function TaskCompletionCelebration({
    show,
    onComplete,
    taskTitle,
}: TaskCompletionCelebrationProps) {
    const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

    useEffect(() => {
        if (show) {
            // Generate confetti pieces
            const pieces: ConfettiPiece[] = [];
            for (let i = 0; i < 30; i++) {
                pieces.push({
                    id: i,
                    x: Math.random() * 100 - 50,
                    y: Math.random() * -100 - 20,
                    rotation: Math.random() * 720 - 360,
                    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                    delay: Math.random() * 0.3,
                });
            }
            setConfetti(pieces);

            // Auto-hide after animation completes
            const timer = setTimeout(() => {
                if (onComplete) onComplete();
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                >
                    {/* Dark overlay with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black backdrop-blur-sm"
                    />

                    {/* Center celebration card */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 20 }}
                        animate={{
                            scale: 1,
                            opacity: 1,
                            y: 0,
                            transition: {
                                type: "spring",
                                stiffness: 200,
                                damping: 20,
                            },
                        }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="relative z-10 glass-card rounded-3xl p-8 max-w-sm mx-4 text-center"
                    >
                        {/* Check icon with pulse */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{
                                scale: [0, 1.2, 1],
                                transition: {
                                    duration: 0.6,
                                    times: [0, 0.6, 1],
                                    ease: "easeOut",
                                },
                            }}
                            className="flex justify-center mb-4"
                        >
                            <div className="relative">
                                <CheckCircleIcon className="w-20 h-20" animate />
                                
                                {/* Expanding ring */}
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0.8 }}
                                    animate={{
                                        scale: 2,
                                        opacity: 0,
                                        transition: {
                                            duration: 1,
                                            ease: "easeOut",
                                        },
                                    }}
                                    className="absolute inset-0 rounded-full border-4 border-green-400"
                                />
                            </div>
                        </motion.div>

                        {/* Text content */}
                        <motion.h3
                            initial={{ opacity: 0, y: 10 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                transition: { delay: 0.2 },
                            }}
                            className="text-2xl font-bold text-white mb-2"
                        >
                            Task Complete! 🎉
                        </motion.h3>

                        {taskTitle && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: { delay: 0.3 },
                                }}
                                className="text-white/60 text-sm"
                            >
                                {taskTitle}
                            </motion.p>
                        )}
                    </motion.div>

                    {/* Confetti pieces */}
                    {confetti.map((piece) => (
                        <motion.div
                            key={piece.id}
                            initial={{
                                x: "50vw",
                                y: "50vh",
                                opacity: 1,
                                rotate: 0,
                            }}
                            animate={{
                                x: `calc(50vw + ${piece.x}vw)`,
                                y: `calc(100vh + ${piece.y}px)`,
                                opacity: [1, 1, 0],
                                rotate: piece.rotation,
                                transition: {
                                    duration: 2,
                                    delay: piece.delay,
                                    ease: "easeOut",
                                },
                            }}
                            className="absolute w-3 h-3 rounded-sm"
                            style={{
                                backgroundColor: piece.color,
                            }}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
