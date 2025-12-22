/**
 * Error Message Component
 * 
 * Reusable component for displaying error messages with retry actions.
 */

import { AlertCircle, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    type?: "error" | "warning" | "info";
    className?: string;
}

export default function ErrorMessage({
    message,
    onRetry,
    onDismiss,
    type = "error",
    className = "",
}: ErrorMessageProps) {
    const colors = {
        error: {
            bg: "bg-red-500/10",
            border: "border-red-500/30",
            text: "text-red-400",
            icon: "text-red-400",
        },
        warning: {
            bg: "bg-amber-500/10",
            border: "border-amber-500/30",
            text: "text-amber-400",
            icon: "text-amber-400",
        },
        info: {
            bg: "bg-blue-500/10",
            border: "border-blue-500/30",
            text: "text-blue-400",
            icon: "text-blue-400",
        },
    };

    const style = colors[type];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`rounded-xl border ${style.border} ${style.bg} backdrop-blur-sm p-4 ${className}`}
            >
                <div className="flex items-start gap-3">
                    <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.icon}`} />
                    
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed ${style.text}`}>
                            {message}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors ${style.icon}`}
                                title="Retry"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        )}
                        {onDismiss && (
                            <button
                                onClick={onDismiss}
                                className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors ${style.icon}`}
                                title="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
