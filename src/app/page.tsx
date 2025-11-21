"use client";

import { useRouter } from "next/navigation";
import SpaceCard from "@/components/SpaceCard";
import { Space } from "@/types";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import EditSpaceModal from "@/components/EditSpaceModal";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Home() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [editingSpace, setEditingSpace] = useState<Space | null>(null);
    const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    // Fetch spaces from Firestore
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "spaces"),
            where("ownerId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const spacesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Space[];
            setSpaces(spacesData);
            setIsLoadingSpaces(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (loading || isLoadingSpaces) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
        );
    }

    if (!user) return null;

    const handleCreateSpace = async () => {
        if (!user) return;

        try {
            const newSpace = {
                name: `New Space ${spaces.length + 1}`,
                theme: "blue",
                ownerId: user.uid,
                createdAt: Date.now(),
            };
            await addDoc(collection(db, "spaces"), newSpace);
        } catch (error) {
            console.error("Error creating space:", error);
        }
    };

    const handleDeleteSpace = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this space?")) return;

        try {
            await deleteDoc(doc(db, "spaces", id));
        } catch (error) {
            console.error("Error deleting space:", error);
        }
    };

    const handleUpdateSpace = async (id: string, updates: Partial<Space>) => {
        try {
            await updateDoc(doc(db, "spaces", id), updates);
            setEditingSpace(null);
        } catch (error) {
            console.error("Error updating space:", error);
        }
    };

    return (
        <div className="mx-auto max-w-4xl">
            <header className="mb-8 flex items-center justify-between">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-bold tracking-tight text-white"
                >
                    My Spaces
                </motion.h1>
                <button
                    onClick={() => router.push("/account")}
                    className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
                >
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="h-10 w-10 rounded-full" />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-white/10" />
                    )}
                </button>
            </header>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
            >
                {spaces.map((space) => (
                    <SpaceCard
                        key={space.id}
                        space={space}
                        onClick={() => router.push(`/space/${space.id}`)}
                        onDelete={(e) => handleDeleteSpace(e, space.id)}
                        onEdit={(e) => {
                            e.stopPropagation();
                            setEditingSpace(space);
                        }}
                    />
                ))}
                <SpaceCard isNew onClick={handleCreateSpace} />
            </motion.div>

            <EditSpaceModal
                space={editingSpace}
                isOpen={!!editingSpace}
                onClose={() => setEditingSpace(null)}
                onSave={handleUpdateSpace}
            />
        </div>
    );
}
