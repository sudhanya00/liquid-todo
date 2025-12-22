/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import SpaceCard from "@/components/SpaceCard";
import { Space } from "@/types";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import EditSpaceModal from "@/components/EditSpaceModal";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { FolderIcon } from "@/components/icons/CustomIcons";
import { SpaceGridSkeleton } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEntitlements } from "@/lib/hooks/useEntitlements";
import UpgradePrompt, { QuotaDisplay } from "@/components/UpgradePrompt";

export default function Home() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { checkCanCreateSpace, limits, isPro } = useEntitlements();
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [editingSpace, setEditingSpace] = useState<Space | null>(null);
    const [isLoadingSpaces, setIsLoadingSpaces] = useState(true);
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState("");
    const [deletingSpaceId, setDeletingSpaceId] = useState<string | null>(null);

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
            where("ownerId", "==", user.uid)
            // orderBy("createdAt", "desc") // Temporarily removed to avoid missing index error
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const spacesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Space[];
            // Client-side sort since we removed the server-side sort
            spacesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setSpaces(spacesData);
            setIsLoadingSpaces(false);
        }, (error) => {
            console.error("Error fetching spaces:", error);
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

        // Check entitlement before creating
        const entitlement = await checkCanCreateSpace(spaces.length);
        if (!entitlement.allowed) {
            setUpgradeMessage(entitlement.reason || "Space limit reached.");
            setShowUpgradePrompt(true);
            return;
        }

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

    const handleDeleteSpace = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeletingSpaceId(id);
    };

    const confirmDeleteSpace = async () => {
        if (!deletingSpaceId) return;
        
        try {
            await deleteDoc(doc(db, "spaces", deletingSpaceId));
        } catch (error) {
            console.error("Error deleting space:", error);
        } finally {
            setDeletingSpaceId(null);
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
                <div className="flex items-center gap-4">
                    {/* Space quota indicator for free users */}
                    {!isPro && limits?.maxSpaces && (
                        <div className="hidden sm:block w-32">
                            <QuotaDisplay
                                used={spaces.length}
                                limit={limits.maxSpaces}
                                label="Spaces"
                            />
                        </div>
                    )}
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
                </div>
            </header>

            {isLoadingSpaces ? (
                <SpaceGridSkeleton count={6} />
            ) : spaces.length === 0 ? (
                <EmptyState
                    icon={FolderIcon}
                    title="No spaces yet"
                    description="Create your first space to organize your tasks and projects"
                    action={{
                        label: "Create Your First Space",
                        onClick: handleCreateSpace,
                    }}
                />
            ) : (
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
            )}

            <EditSpaceModal
                space={editingSpace}
                isOpen={!!editingSpace}
                onClose={() => setEditingSpace(null)}
                onSave={handleUpdateSpace}
            />

            <DeleteConfirmModal
                isOpen={!!deletingSpaceId}
                onClose={() => setDeletingSpaceId(null)}
                onConfirm={confirmDeleteSpace}
                title="Delete Space?"
                message="Are you sure you want to delete this space? All tasks within this space will be permanently removed."
            />

            {/* Upgrade prompt modal */}
            {showUpgradePrompt && (
                <UpgradePrompt
                    message={upgradeMessage}
                    variant="modal"
                    onDismiss={() => setShowUpgradePrompt(false)}
                />
            )}
        </div>
    );
}
