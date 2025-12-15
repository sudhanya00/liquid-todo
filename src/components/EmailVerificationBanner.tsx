"use client";

/**
 * EmailVerificationBanner Component
 * 
 * Shows a non-intrusive banner for users who haven't verified their email.
 * Allows them to resend the verification email.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, X, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function EmailVerificationBanner() {
    const { needsEmailVerification, resendVerificationEmail, user } = useAuth();
    const [isDismissed, setIsDismissed] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    if (!needsEmailVerification || isDismissed) {
        return null;
    }

    const handleResend = async () => {
        setIsResending(true);
        setResendSuccess(false);
        
        try {
            await resendVerificationEmail();
            setResendSuccess(true);
            
            // Reset success message after 5 seconds
            setTimeout(() => setResendSuccess(false), 5000);
        } catch {
            // Error handled in AuthContext
        } finally {
            setIsResending(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-amber-500/10 border-b border-amber-500/20"
            >
                <div className="mx-auto max-w-4xl px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-amber-400 flex-shrink-0" />
                            <div className="text-sm">
                                <span className="text-amber-200">
                                    Please verify your email address ({user?.email}).
                                </span>
                                {resendSuccess ? (
                                    <span className="ml-2 inline-flex items-center gap-1 text-green-400">
                                        <CheckCircle className="h-4 w-4" />
                                        Email sent!
                                    </span>
                                ) : (
                                    <button
                                        onClick={handleResend}
                                        disabled={isResending}
                                        className="ml-2 font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
                                    >
                                        {isResending ? (
                                            <Loader2 className="h-4 w-4 animate-spin inline" />
                                        ) : (
                                            "Resend email"
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setIsDismissed(true)}
                            className="text-amber-400/50 hover:text-amber-400 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
