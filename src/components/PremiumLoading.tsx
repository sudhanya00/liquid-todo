/**
 * Premium Loading Indicator
 * 
 * Apple-inspired loading animation with smooth transitions
 */

import { motion } from "framer-motion";
import { LightningIcon } from "./icons/CustomIcons";

interface PremiumLoadingProps {
    message?: string;
    size?: "sm" | "md" | "lg";
    fullscreen?: boolean;
}

export default function PremiumLoading({
    message = "Loading...",
    size = "md",
    fullscreen = false,
}: PremiumLoadingProps) {
    const sizes = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-16 h-16",
    };

    const textSizes = {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
    };

    const content = (
        <div className="flex flex-col items-center justify-center gap-4">
            {/* Animated icon with pulsing ring */}
            <div className="relative">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 blur-xl ${sizes[size]}`}
                />
                <motion.div
                    animate={{
                        rotate: 360,
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className={`relative ${sizes[size]}`}
                >
                    <LightningIcon className={sizes[size]} animate />
                </motion.div>
            </div>

            {/* Loading message */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`text-white/70 font-medium ${textSizes[size]}`}
            >
                {message}
            </motion.p>

            {/* Animated dots */}
            <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 1, 0.3],
                        }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeInOut",
                        }}
                        className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                    />
                ))}
            </div>
        </div>
    );

    if (fullscreen) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
                {content}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center p-8"
        >
            {content}
        </motion.div>
    );
}
