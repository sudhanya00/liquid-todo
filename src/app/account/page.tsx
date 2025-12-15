/* eslint-disable @next/next/no-img-element */
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, LogOut, User, Pencil, Check, X } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";

export default function AccountPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState({ totalSpaces: 0, totalTasks: 0, completedTasks: 0 });
    const [loadingStats, setLoadingStats] = useState(true);
    
    // Edit name state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [savingName, setSavingName] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            try {
                // Fetch spaces count
                const spacesQuery = query(collection(db, "spaces"), where("ownerId", "==", user.uid));
                const spacesSnapshot = await getDocs(spacesQuery);
                const totalSpaces = spacesSnapshot.size;

                // For tasks, we'd need to iterate through spaces or have a global tasks collection
                // For now, we'll use localStorage as a fallback
                let totalTasks = 0;
                let completedTasks = 0;

                spacesSnapshot.docs.forEach((spaceDoc) => {
                    const savedTasks = localStorage.getItem(`tasks_${spaceDoc.id}`);
                    if (savedTasks) {
                        const tasks = JSON.parse(savedTasks);
                        totalTasks += tasks.length;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        completedTasks += tasks.filter((t: any) => t.status === "done").length;
                    }
                });

                setStats({ totalSpaces, totalTasks, completedTasks });
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
    }, [user]);

    if (loading || loadingStats) {
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
                className="glass-card rounded-2xl p-8 space-y-8"
            >
                {/* Profile Section */}
                <div className="flex items-center gap-6">
                    {user.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName || "User"}
                            className="h-20 w-20 rounded-full border-2 border-white/10"
                        />
                    ) : (
                        <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
                            <User className="h-10 w-10 text-white/50" />
                        </div>
                    )}
                    <div className="flex-1">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="bg-white/10 rounded-lg px-3 py-2 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-white/20"
                                    autoFocus
                                    disabled={savingName}
                                />
                                <button
                                    onClick={handleSaveName}
                                    disabled={savingName || !editedName.trim()}
                                    className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                                >
                                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={handleCancelEditName}
                                    disabled={savingName}
                                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-white">{user.displayName || "User"}</h1>
                                <button
                                    onClick={handleStartEditName}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                    title="Edit name"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        <p className="text-white/50">{user.email}</p>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-white">{stats.totalSpaces}</div>
                        <div className="text-sm text-white/50 mt-1">Spaces</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-white">{stats.totalTasks}</div>
                        <div className="text-sm text-white/50 mt-1">Total Tasks</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 text-center">
                        <div className="text-3xl font-bold text-green-400">{stats.completedTasks}</div>
                        <div className="text-sm text-white/50 mt-1">Completed</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={() => router.push("/")}
                        className="w-full px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                        Back to Spaces
                    </button>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        Logout
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
