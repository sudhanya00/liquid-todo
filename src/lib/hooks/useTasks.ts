"use client";

/**
 * useTasks Hook
 * 
 * React hook for managing tasks with Firestore.
 * Handles real-time updates, local caching, and migration.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Task, TaskUpdate } from "@/types";
import {
    subscribeToTasks,
    createTask,
    updateTask,
    deleteTask,
    addTaskUpdate,
    migrateLocalTasks,
    isMigrated,
    markAsMigrated,
    getLocalTasks,
    clearLocalTasks,
    TaskServiceError,
} from "@/lib/services/taskService";
import {
    queueOperation,
    getPendingOperationsBySpace,
    removeOperation,
    updateOperationRetry,
    type OfflineOperation,
} from "@/lib/offlineQueue";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";

interface UseTasksOptions {
    spaceId: string;
    enableMigration?: boolean; // Auto-migrate from localStorage
}

interface UseTasksReturn {
    // State
    tasks: Task[];
    loading: boolean;
    error: TaskServiceError | null;
    isMigrating: boolean;
    migrationStatus: { success: number; failed: number } | null;
    isOnline: boolean;
    pendingOperations: number;

    // Actions
    addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "spaceId">) => Promise<Task | null>;
    editTask: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
    removeTask: (taskId: string) => Promise<boolean>;
    addUpdate: (taskId: string, update: Omit<TaskUpdate, "id">) => Promise<boolean>;

    // Migration
    triggerMigration: () => Promise<void>;
    
    // Sync
    syncPendingOperations: () => Promise<void>;

    // Utilities
    getTaskById: (taskId: string) => Task | undefined;
    clearError: () => void;
}

export function useTasks({ spaceId, enableMigration = true }: UseTasksOptions): UseTasksReturn {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<TaskServiceError | null>(null);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState<{ success: number; failed: number } | null>(null);
    const [pendingOperations, setPendingOperations] = useState(0);
    
    // Track if we've attempted migration
    const migrationAttempted = useRef(false);
    
    // Network status
    const { isOnline, wasOffline } = useNetworkStatus();

    // Clear error helper
    const clearError = useCallback(() => setError(null), []);
    
    // Sync pending operations when back online
    const syncPendingOperations = useCallback(async () => {
        if (!spaceId || !isOnline) return;
        
        try {
            const pending = await getPendingOperationsBySpace(spaceId);
            setPendingOperations(pending.length);
            
            if (pending.length === 0) return;
            
            console.log(`[Sync] Processing ${pending.length} pending operations`);
            
            for (const queued of pending) {
                try {
                    const op = queued.operation;
                    
                    switch (op.type) {
                        case "create":
                            await createTask(op.spaceId, op.task as any);
                            break;
                        case "update":
                            await updateTask(op.spaceId, op.taskId, op.updates);
                            break;
                        case "delete":
                            await deleteTask(op.spaceId, op.taskId);
                            break;
                        case "addUpdate":
                            await addTaskUpdate(op.spaceId, op.taskId, op.update);
                            break;
                    }
                    
                    await removeOperation(queued.id);
                    console.log(`[Sync] Completed operation ${queued.id}`);
                    
                } catch (err) {
                    console.error(`[Sync] Failed operation ${queued.id}:`, err);
                    await updateOperationRetry(queued.id, err instanceof Error ? err.message : "Unknown error");
                }
            }
            
            // Update count after sync
            const remaining = await getPendingOperationsBySpace(spaceId);
            setPendingOperations(remaining.length);
            
        } catch (err) {
            console.error("[Sync] Failed to sync operations:", err);
        }
    }, [spaceId, isOnline]);
    
    // Auto-sync when coming back online
    useEffect(() => {
        if (wasOffline && isOnline) {
            console.log("[Sync] Network restored, syncing pending operations");
            syncPendingOperations();
        }
    }, [wasOffline, isOnline, syncPendingOperations]);
    
    // Update pending operation count on mount and when space changes
    useEffect(() => {
        if (!spaceId) return;
        
        getPendingOperationsBySpace(spaceId).then(ops => {
            setPendingOperations(ops.length);
        });
    }, [spaceId]);

    // Migration function
    const triggerMigration = useCallback(async () => {
        if (!spaceId || isMigrated(spaceId)) return;

        const localTasks = getLocalTasks(spaceId);
        if (localTasks.length === 0) {
            markAsMigrated(spaceId);
            return;
        }

        setIsMigrating(true);
        setMigrationStatus(null);

        try {
            const result = await migrateLocalTasks(spaceId, localTasks);
            setMigrationStatus(result);

            if (result.failed === 0) {
                markAsMigrated(spaceId);
                clearLocalTasks(spaceId);
            }
        } catch (err) {
            console.error("Migration failed:", err);
            setError({
                code: "UNKNOWN",
                message: "Failed to migrate tasks to cloud. Your local tasks are preserved.",
            });
        } finally {
            setIsMigrating(false);
        }
    }, [spaceId]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!spaceId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = subscribeToTasks(
            spaceId,
            (updatedTasks) => {
                setTasks(updatedTasks);
                setLoading(false);

                // Check for migration after first load
                if (enableMigration && !migrationAttempted.current) {
                    migrationAttempted.current = true;
                    
                    // Only migrate if Firestore is empty and localStorage has data
                    if (updatedTasks.length === 0 && !isMigrated(spaceId)) {
                        triggerMigration();
                    } else if (!isMigrated(spaceId)) {
                        // Cloud has data, mark as migrated to avoid future attempts
                        markAsMigrated(spaceId);
                    }
                }
            },
            (err) => {
                setError(err);
                setLoading(false);

                // Fall back to localStorage on error
                const localTasks = getLocalTasks(spaceId);
                if (localTasks.length > 0) {
                    setTasks(localTasks);
                }
            }
        );

        return () => unsubscribe();
    }, [spaceId, enableMigration, triggerMigration]);

    // Add task
    const addTask = useCallback(
        async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "spaceId">): Promise<Task | null> => {
            if (!spaceId) return null;

            // Generate temp ID for optimistic update
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const optimisticTask: Task = {
                ...taskData,
                id: tempId,
                spaceId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: taskData.status || "todo",
            };

            // Optimistic update
            setTasks(prev => [optimisticTask, ...prev]);

            try {
                if (!isOnline) {
                    // Queue for later
                    await queueOperation({
                        type: "create",
                        task: taskData,
                        spaceId,
                        tempId,
                    });
                    setPendingOperations(prev => prev + 1);
                    console.log("[Offline] Task queued for creation");
                    return optimisticTask;
                }

                const newTask = await createTask(spaceId, {
                    ...taskData,
                    spaceId,
                    status: taskData.status || "todo",
                });
                
                // Replace optimistic with real task
                setTasks(prev => prev.map(t => t.id === tempId ? newTask : t));
                
                return newTask;
            } catch (err) {
                console.error("Failed to create task:", err);
                
                // Revert optimistic update on error
                setTasks(prev => prev.filter(t => t.id !== tempId));
                
                setError({
                    code: "UNKNOWN",
                    message: "Failed to create task. Please try again.",
                });
                return null;
            }
        },
        [spaceId, isOnline]
    );

    // Edit task
    const editTask = useCallback(
        async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
            if (!spaceId) return false;

            // Optimistic update
            const previousTasks = tasks;
            setTasks(prev => prev.map(t => 
                t.id === taskId 
                    ? { ...t, ...updates, updatedAt: Date.now() }
                    : t
            ));

            try {
                if (!isOnline) {
                    // Queue for later
                    await queueOperation({
                        type: "update",
                        taskId,
                        updates,
                        spaceId,
                    });
                    setPendingOperations(prev => prev + 1);
                    console.log("[Offline] Task update queued");
                    return true;
                }

                await updateTask(spaceId, taskId, updates);
                return true;
            } catch (err) {
                console.error("Failed to update task:", err);
                
                // Revert optimistic update on error
                setTasks(previousTasks);
                
                setError({
                    code: "UNKNOWN",
                    message: "Failed to update task. Please try again.",
                });
                return false;
            }
        },
        [spaceId, tasks, isOnline]
    );

    // Remove task
    const removeTask = useCallback(
        async (taskId: string): Promise<boolean> => {
            if (!spaceId) return false;

            // Optimistic update
            const previousTasks = tasks;
            setTasks(prev => prev.filter(t => t.id !== taskId));

            try {
                if (!isOnline) {
                    // Queue for later
                    await queueOperation({
                        type: "delete",
                        taskId,
                        spaceId,
                    });
                    setPendingOperations(prev => prev + 1);
                    console.log("[Offline] Task deletion queued");
                    return true;
                }

                await deleteTask(spaceId, taskId);
                return true;
            } catch (err) {
                console.error("Failed to delete task:", err);
                
                // Revert optimistic update on error
                setTasks(previousTasks);
                
                setError({
                    code: "UNKNOWN",
                    message: "Failed to delete task. Please try again.",
                });
                return false;
            }
        },
        [spaceId, tasks, isOnline]
    );

    // Add timeline update
    const addUpdate = useCallback(
        async (taskId: string, update: Omit<TaskUpdate, "id">): Promise<boolean> => {
            if (!spaceId) return false;

            try {
                await addTaskUpdate(spaceId, taskId, update);
                return true;
            } catch (err) {
                console.error("Failed to add update:", err);
                setError({
                    code: "UNKNOWN",
                    message: "Failed to add update. Please try again.",
                });
                return false;
            }
        },
        [spaceId]
    );

    // Get task by ID
    const getTaskById = useCallback(
        (taskId: string): Task | undefined => {
            return tasks.find((t) => t.id === taskId);
        },
        [tasks]
    );

    return {
        tasks,
        loading,
        error,
        isMigrating,
        migrationStatus,
        isOnline,
        pendingOperations,
        addTask,
        editTask,
        removeTask,
        addUpdate,
        triggerMigration,
        syncPendingOperations,
        getTaskById,
        clearError,
    };
}
