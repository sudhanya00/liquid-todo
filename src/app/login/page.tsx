/* eslint-disable @next/next/no-img-element */
"use client";

import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, AlertCircle, CheckCircle, ArrowLeft, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "signin" | "signup" | "forgot-password";

export default function LoginPage() {
    const {
        user,
        loading,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        clearError,
    } = useAuth();
    const router = useRouter();

    const [mode, setMode] = useState<AuthMode>("signin");
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (user && !loading) {
            router.push("/");
        }
    }, [user, loading, router]);

    // Clear errors when switching modes
    useEffect(() => {
        clearError();
        setLocalError(null);
        setSuccessMessage(null);
    }, [mode, clearError]);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        setSuccessMessage(null);

        // Validation
        if (!email.trim()) {
            setLocalError("Please enter your email address.");
            return;
        }

        if (mode !== "forgot-password" && !password) {
            setLocalError("Please enter your password.");
            return;
        }

        if (mode === "signup" && !displayName.trim()) {
            setLocalError("Please enter your name.");
            return;
        }

        if (mode === "signup" && password !== confirmPassword) {
            setLocalError("Passwords do not match.");
            return;
        }

        if (mode === "signup" && password.length < 6) {
            setLocalError("Password must be at least 6 characters.");
            return;
        }

        setIsSubmitting(true);

        try {
            if (mode === "signin") {
                await signInWithEmail(email, password);
            } else if (mode === "signup") {
                await signUpWithEmail(email, password, displayName.trim());
            } else if (mode === "forgot-password") {
                await resetPassword(email);
                setSuccessMessage("Password reset email sent. Check your inbox.");
            }
        } catch {
            // Error is handled in AuthContext
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayError = error || localError;

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-md space-y-6 rounded-2xl p-8"
            >
                {/* Header */}
                <div className="space-y-2 text-center">
                    {mode === "forgot-password" && (
                        <button
                            onClick={() => setMode("signin")}
                            className="mb-4 flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to sign in
                        </button>
                    )}
                    <h1 className="text-3xl font-bold text-white">
                        {mode === "signin" && "Welcome Back"}
                        {mode === "signup" && "Create Account"}
                        {mode === "forgot-password" && "Reset Password"}
                    </h1>
                    <p className="text-white/60">
                        {mode === "signin" && "Sign in to access your workspace"}
                        {mode === "signup" && "Start organizing your work with AI"}
                        {mode === "forgot-password" && "Enter your email to reset your password"}
                    </p>
                </div>

                {/* Error Message */}
                <AnimatePresence mode="wait">
                    {displayError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3"
                        >
                            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-200">{displayError}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Success Message */}
                <AnimatePresence mode="wait">
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3"
                        >
                            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-green-200">{successMessage}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    {/* Display Name Input (Sign Up Only) */}
                    {mode === "signup" && (
                        <div className="space-y-2">
                            <label htmlFor="displayName" className="text-sm font-medium text-white/80">
                                Your Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                                <input
                                    id="displayName"
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full rounded-xl bg-white/10 py-3 pl-10 pr-4 text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-white/80">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full rounded-xl bg-white/10 py-3 pl-10 pr-4 text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    {mode !== "forgot-password" && (
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-white/80">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl bg-white/10 py-3 pl-10 pr-4 text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    )}

                    {/* Confirm Password (Sign Up Only) */}
                    {mode === "signup" && (
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium text-white/80">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl bg-white/10 py-3 pl-10 pr-4 text-white placeholder:text-white/40 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    )}

                    {/* Forgot Password Link */}
                    {mode === "signin" && (
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => setMode("forgot-password")}
                                className="text-sm text-white/60 hover:text-white transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || loading}
                        className="w-full rounded-xl bg-white py-3 font-medium text-zinc-900 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        ) : (
                            <>
                                {mode === "signin" && "Sign In"}
                                {mode === "signup" && "Create Account"}
                                {mode === "forgot-password" && "Send Reset Email"}
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                {mode !== "forgot-password" && (
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-zinc-900 px-4 text-white/40">or continue with</span>
                        </div>
                    </div>
                )}

                {/* Google Sign In */}
                {mode !== "forgot-password" && (
                    <button
                        onClick={signInWithGoogle}
                        disabled={loading || isSubmitting}
                        className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <img
                                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                    alt="Google"
                                    className="h-5 w-5"
                                />
                                <span className="font-medium">Continue with Google</span>
                            </>
                        )}
                    </button>
                )}

                {/* Toggle Sign In / Sign Up */}
                {mode !== "forgot-password" && (
                    <p className="text-center text-sm text-white/60">
                        {mode === "signin" ? (
                            <>
                                Don&apos;t have an account?{" "}
                                <button
                                    onClick={() => setMode("signup")}
                                    className="font-medium text-white hover:underline"
                                >
                                    Sign up
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{" "}
                                <button
                                    onClick={() => setMode("signin")}
                                    className="font-medium text-white hover:underline"
                                >
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                )}
            </motion.div>
        </div>
    );
}
