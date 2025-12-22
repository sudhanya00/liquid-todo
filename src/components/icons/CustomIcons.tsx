/**
 * Custom Icon Components
 * 
 * Unique, premium icon designs that stand out from generic AI apps.
 * Inspired by Apple's attention to detail and visual refinement.
 */

import { motion } from "framer-motion";

interface IconProps {
    className?: string;
    animate?: boolean;
}

// Sparkle icon with premium gradient effect
export function SparkleIcon({ className = "w-6 h-6", animate = false }: IconProps) {
    const icon = (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="sparkle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A78BFA" />
                    <stop offset="50%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
            </defs>
            <path
                d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
                fill="url(#sparkle-gradient)"
            />
            <path
                d="M19 14L19.75 16.75L22.5 17.5L19.75 18.25L19 21L18.25 18.25L15.5 17.5L18.25 16.75L19 14Z"
                fill="url(#sparkle-gradient)"
                opacity="0.6"
            />
        </svg>
    );

    if (animate) {
        return (
            <motion.div
                animate={{
                    rotate: [0, 180, 360],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                {icon}
            </motion.div>
        );
    }

    return icon;
}

// Folder icon with depth
export function FolderIcon({ className = "w-6 h-6" }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="folder-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
            </defs>
            <path
                d="M3 6C3 4.89543 3.89543 4 5 4H9.58579C10.1162 4 10.6249 4.21071 11 4.58579L13 6.5H19C20.1046 6.5 21 7.39543 21 8.5V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z"
                fill="url(#folder-gradient)"
                fillOpacity="0.2"
            />
            <path
                d="M3 6C3 4.89543 3.89543 4 5 4H9.58579C10.1162 4 10.6249 4.21071 11 4.58579L13 6.5H19C20.1046 6.5 21 7.39543 21 8.5V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z"
                stroke="url(#folder-gradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// Check circle with smooth animation
export function CheckCircleIcon({ className = "w-6 h-6", animate = false }: IconProps) {
    return (
        <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            initial={animate ? { scale: 0, rotate: -180 } : undefined}
            animate={animate ? { scale: 1, rotate: 0 } : undefined}
            transition={animate ? { type: "spring", stiffness: 200, damping: 15 } : undefined}
        >
            <defs>
                <linearGradient id="check-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
            </defs>
            <circle
                cx="12"
                cy="12"
                r="9"
                fill="url(#check-gradient)"
                fillOpacity="0.2"
            />
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="url(#check-gradient)"
                strokeWidth="1.5"
            />
            <motion.path
                d="M8 12L11 15L16 9"
                stroke="url(#check-gradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={animate ? { pathLength: 0 } : undefined}
                animate={animate ? { pathLength: 1 } : undefined}
                transition={animate ? { duration: 0.5, delay: 0.2 } : undefined}
            />
        </motion.svg>
    );
}

// Voice wave icon with animation
export function VoiceWaveIcon({ className = "w-6 h-6", animate = false }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="voice-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#6366F1" />
                </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((i) => (
                <motion.rect
                    key={i}
                    x={4 + i * 4}
                    y={animate ? undefined : 8}
                    width="2"
                    height={animate ? undefined : 8}
                    rx="1"
                    fill="url(#voice-gradient)"
                    animate={
                        animate
                            ? {
                                  y: [8, 4 + Math.random() * 8, 8],
                                  height: [8, 12 + Math.random() * 4, 8],
                              }
                            : undefined
                    }
                    transition={
                        animate
                            ? {
                                  duration: 0.6 + Math.random() * 0.4,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: i * 0.1,
                              }
                            : undefined
                    }
                />
            ))}
        </svg>
    );
}

// Lightning bolt (for AI processing)
export function LightningIcon({ className = "w-6 h-6", animate = false }: IconProps) {
    return (
        <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            animate={animate ? { rotate: [0, -10, 10, 0] } : undefined}
            transition={animate ? { duration: 0.5, repeat: Infinity, repeatDelay: 1 } : undefined}
        >
            <defs>
                <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
            </defs>
            <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill="url(#lightning-gradient)"
                stroke="url(#lightning-gradient)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </motion.svg>
    );
}

// Minimal plus icon
export function PlusIcon({ className = "w-6 h-6" }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M12 5V19M5 12H19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

// Minimal check icon
export function CheckIcon({ className = "w-6 h-6" }: IconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M5 13L9 17L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
