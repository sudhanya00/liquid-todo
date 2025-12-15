"use client";

/**
 * UpgradePrompt Component
 * 
 * Shows upgrade messaging when users hit plan limits.
 * Designed to be non-intrusive but clear.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

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
                className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
            >
                <Sparkles className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm text-amber-200">{message}</p>
                    {feature && (
                        <p className="mt-1 text-xs text-amber-300/70">
                            {feature} is available on the Pro plan.
                        </p>
                    )}
                    <button className="mt-3 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
                        Upgrade to Pro →
                    </button>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-amber-400/50 hover:text-amber-400 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
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
                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-zinc-900 p-4 shadow-xl">
                        <Sparkles className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-white">{message}</p>
                            <button className="mt-2 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">
                                Upgrade to Pro →
                            </button>
                        </div>
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
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
                        <div className="rounded-full bg-amber-500/20 p-2">
                            <Sparkles className="h-6 w-6 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">
                            Upgrade to Pro
                        </h3>
                    </div>

                    <p className="text-zinc-300 mb-6">{message}</p>

                    <div className="space-y-2 mb-6">
                        <FeatureItem>Unlimited voice logs</FeatureItem>
                        <FeatureItem>Unlimited spaces</FeatureItem>
                        <FeatureItem>GitHub integration</FeatureItem>
                        <FeatureItem>Calendar integration</FeatureItem>
                        <FeatureItem>Daily AI summaries</FeatureItem>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onDismiss}
                            className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                            Maybe later
                        </button>
                        <button className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 transition-colors">
                            Upgrade now
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
            <svg
                className="h-4 w-4 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                />
            </svg>
            {children}
        </div>
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
