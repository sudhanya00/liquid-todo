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

    // Actions
    addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "spaceId">) => Promise<Task | null>;
    editTask: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
    removeTask: (taskId: string) => Promise<boolean>;
    addUpdate: (taskId: string, update: Omit<TaskUpdate, "id">) => Promise<boolean>;

    // Migration
    triggerMigration: () => Promise<void>;

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
    
    // Track if we've attempted migration
    const migrationAttempted = useRef(false);

    // Clear error helper
    const clearError = useCallback(() => setError(null), []);

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

            try {
                const newTask = await createTask(spaceId, {
                    ...taskData,
                    spaceId,
                    status: taskData.status || "todo",
                });
                return newTask;
            } catch (err) {
                console.error("Failed to create task:", err);
                setError({
                    code: "UNKNOWN",
                    message: "Failed to create task. Please try again.",
                });
                return null;
            }
        },
        [spaceId]
    );

    // Edit task
    const editTask = useCallback(
        async (taskId: string, updates: Partial<Task>): Promise<boolean> => {
            if (!spaceId) return false;

            try {
                await updateTask(spaceId, taskId, updates);
                return true;
            } catch (err) {
                console.error("Failed to update task:", err);
                setError({
                    code: "UNKNOWN",
                    message: "Failed to update task. Please try again.",
                });
                return false;
            }
        },
        [spaceId]
    );

    // Remove task
    const removeTask = useCallback(
        async (taskId: string): Promise<boolean> => {
            if (!spaceId) return false;

            try {
                await deleteTask(spaceId, taskId);
                return true;
            } catch (err) {
                console.error("Failed to delete task:", err);
                setError({
                    code: "UNKNOWN",
                    message: "Failed to delete task. Please try again.",
                });
                return false;
            }
        },
        [spaceId]
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
        addTask,
        editTask,
        removeTask,
        addUpdate,
        triggerMigration,
        getTaskById,
        clearError,
    };
}
