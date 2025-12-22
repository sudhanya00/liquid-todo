"use client";

/**
 * UpgradePrompt Component
 * 
 * Shows upgrade messaging when users hit plan limits.
 * Designed to be non-intrusive but clear.
 */

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SparkleIcon, CheckCircleIcon } from "./icons/CustomIcons";

interface UpgradePromptProps {
    message: string;
    feature?: string;
    onDismiss?: () => void;
    variant?: "inline" | "modal" | "toast";
}

export default function UpgradePrompt({
    message,
    feature,
    onDismiss,
    variant = "inline",
}: UpgradePromptProps) {
    if (variant === "inline") {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 shadow-lg shadow-amber-500/5"
            >
                <SparkleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" animate />
                <div className="flex-1">
                    <p className="text-sm text-amber-200 font-medium">{message}</p>
                    {feature && (
                        <p className="mt-1 text-xs text-amber-300/70">
                            {feature} is available on the Pro plan.
                        </p>
                    )}
                    <motion.button 
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        className="mt-3 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                    >
                        Upgrade to Pro →
                    </motion.button>
                </div>
                {onDismiss && (
                    <motion.button
                        onClick={onDismiss}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="text-amber-400/50 hover:text-amber-400 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </motion.button>
                )}
            </motion.div>
        );
    }

    if (variant === "toast") {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-4 right-4 z-50 max-w-sm"
                >
                    <div className="glass-card flex items-start gap-3 rounded-xl border border-amber-500/30 p-4 shadow-2xl shadow-amber-500/10">
                        <SparkleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" animate />
                        <div className="flex-1">
                            <p className="text-sm text-white font-medium">{message}</p>
                            <motion.button 
                                whileHover={{ scale: 1.02, x: 2 }}
                                whileTap={{ scale: 0.98 }}
                                className="mt-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                            >
                                Upgrade to Pro →
                            </motion.button>
                        </div>
                        {onDismiss && (
                            <motion.button
                                onClick={onDismiss}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </motion.button>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    }

    // Modal variant
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={onDismiss}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-3"
                        >
                            <SparkleIcon className="h-6 w-6" animate />
                        </motion.div>
                        <h3 className="text-xl font-bold text-white">
                            Upgrade to Pro
                        </h3>
                    </div>

                    <p className="text-zinc-300 mb-6 text-base">{message}</p>

                    <div className="space-y-3 mb-6">
                        <FeatureItem>Unlimited AI requests</FeatureItem>
                        <FeatureItem>Unlimited spaces</FeatureItem>
                        <FeatureItem>Priority support</FeatureItem>
                        <FeatureItem>Advanced analytics</FeatureItem>
                        <FeatureItem>Early access to new features</FeatureItem>
                    </div>

                    <div className="flex gap-3">
                        <motion.button
                            onClick={onDismiss}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                            Maybe later
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-black hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/25"
                        >
                            Upgrade now
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-sm text-zinc-300"
        >
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            {children}
        </motion.div>
    );
}

// Usage quota display component
interface QuotaDisplayProps {
    used: number;
    limit: number;
    label: string;
}

export function QuotaDisplay({ used, limit, label }: QuotaDisplayProps) {
    const percentage = (used / limit) * 100;
    const isNearLimit = percentage >= 80;
    const isAtLimit = used >= limit;

    return (
        <div className="text-sm">
            <div className="flex justify-between mb-1">
                <span className="text-zinc-400">{label}</span>
                <span
                    className={
                        isAtLimit
                            ? "text-red-400"
                            : isNearLimit
                            ? "text-amber-400"
                            : "text-zinc-300"
                    }
                >
                    {used}/{limit}
                </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${
                        isAtLimit
                            ? "bg-red-500"
                            : isNearLimit
                            ? "bg-amber-500"
                            : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    );
}
