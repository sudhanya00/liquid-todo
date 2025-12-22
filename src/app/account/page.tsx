/* eslint-disable @next/next/no-img-element */
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, LogOut, User, Pencil, Check, X, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";

export default function AccountPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    
    // Edit name state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [savingName, setSavingName] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
        );
    }

    if (!user) return null;
    
    const handleStartEditName = () => {
        setEditedName(user.displayName || "");
        setIsEditingName(true);
    };
    
    const handleSaveName = async () => {
        if (!editedName.trim() || !auth.currentUser) return;
        
        setSavingName(true);
        try {
            await updateProfile(auth.currentUser, { displayName: editedName.trim() });
            setIsEditingName(false);
            // Force a re-render by updating local state
            window.location.reload();
        } catch (error) {
            console.error("Failed to update name:", error);
        } finally {
            setSavingName(false);
        }
    };
    
    const handleCancelEditName = () => {
        setIsEditingName(false);
        setEditedName("");
    };

    return (
        <div className="mx-auto max-w-2xl p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="glass-card rounded-2xl p-8 space-y-8"
            >
                {/* Profile Section */}
                <div className="flex items-center gap-6">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 250, damping: 20, duration: 0.3 }}
                    >
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName || "User"}
                                className="h-24 w-24 rounded-full border-2 border-white/20 shadow-lg"
                            />
                        ) : (
                            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center border-2 border-white/10">
                                <User className="h-12 w-12 text-white/50" />
                            </div>
                        )}
                    </motion.div>
                    <div className="flex-1">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="bg-white/10 rounded-lg px-4 py-2.5 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    autoFocus
                                    disabled={savingName}
                                />
                                <motion.button
                                    onClick={handleSaveName}
                                    disabled={savingName || !editedName.trim()}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="p-2.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 transition-colors"
                                >
                                    {savingName ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                                </motion.button>
                                <motion.button
                                    onClick={handleCancelEditName}
                                    disabled={savingName}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="p-2.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </motion.button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h1 className="text-3xl font-bold text-white">{user.displayName || "User"}</h1>
                                <motion.button
                                    onClick={handleStartEditName}
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                    title="Edit name"
                                >
                                    <Pencil className="h-4 w-4" />
                                </motion.button>
                            </div>
                        )}
                        <p className="text-white/60 text-lg mt-1">{user.email}</p>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10" />

                {/* Actions */}
                <div className="space-y-3">
                    <motion.button
                        onClick={() => router.push("/")}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-600/10 hover:from-blue-500/20 hover:to-purple-600/20 text-white font-medium transition-all duration-300 shadow-lg shadow-blue-500/5 hover:shadow-blue-500/10"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back to Spaces
                    </motion.button>
                    <motion.button
                        onClick={logout}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition-all border border-red-500/20 hover:border-red-500/30"
                    >
                        <LogOut className="h-5 w-5" />
                        Logout
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}
