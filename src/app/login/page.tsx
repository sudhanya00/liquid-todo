/* eslint-disable @next/next/no-img-element */
"use client";

import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const { signInWithGoogle, loading } = useAuth();

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-md space-y-8 rounded-2xl p-8 text-center"
            >
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
                    <p className="text-white/60">Sign in to access your Liquid Space</p>
                </div>

                <button
                    onClick={signInWithGoogle}
                    disabled={loading}
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
            </motion.div>
        </div>
    );
}
