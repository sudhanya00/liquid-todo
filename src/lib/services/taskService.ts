/**
 * Task Service
 * 
 * Handles all task CRUD operations with Firestore.
 * Tasks are stored as subcollections under spaces.
 * 
 * Collection structure: /spaces/{spaceId}/tasks/{taskId}
 */

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    onSnapshot,
    query,
    orderBy,
    writeBatch,
    Timestamp,
    Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskUpdate } from "@/types";

// ============================================
// Type Definitions
// ============================================

export interface TaskServiceError {
    code: "NOT_FOUND" | "PERMISSION_DENIED" | "NETWORK_ERROR" | "UNKNOWN";
    message: string;
}

export type TaskChangeCallback = (tasks: Task[]) => void;
export type TaskErrorCallback = (error: TaskServiceError) => void;

// ============================================
// Helper Functions
// ============================================

/**
 * Get the tasks collection reference for a space
 */
function getTasksCollection(spaceId: string) {
    return collection(db, "spaces", spaceId, "tasks");
}

/**
 * Get a single task document reference
 */
function getTaskDoc(spaceId: string, taskId: string) {
    return doc(db, "spaces", spaceId, "tasks", taskId);
}

/**
 * Convert Firestore document to Task object
 */
function docToTask(docId: string, data: Record<string, unknown>): Task {
    return {
        id: docId,
        spaceId: data.spaceId as string,
        title: data.title as string,
        description: data.description as string | undefined,
        dueDate: data.dueDate as string | null | undefined,
        dueTime: data.dueTime as string | undefined,
        priority: data.priority as "low" | "medium" | "high" | undefined,
        status: data.status as "todo" | "in-progress" | "done",
        createdAt: data.createdAt as number,
        updatedAt: data.updatedAt as number,
        updates: (data.updates as TaskUpdate[]) || [],
        suggestedImprovements: data.suggestedImprovements as string[] | undefined,
    };
}

/**
 * Convert Task to Firestore document data
 */
function taskToDoc(task: Partial<Task>): Record<string, unknown> {
    const doc: Record<string, unknown> = {};
    
    if (task.spaceId !== undefined) doc.spaceId = task.spaceId;
    if (task.title !== undefined) doc.title = task.title;
    if (task.description !== undefined) doc.description = task.description;
    if (task.dueDate !== undefined) doc.dueDate = task.dueDate;
    if (task.dueTime !== undefined) doc.dueTime = task.dueTime;
    if (task.priority !== undefined) doc.priority = task.priority;
    if (task.status !== undefined) doc.status = task.status;
    if (task.createdAt !== undefined) doc.createdAt = task.createdAt;
    if (task.updatedAt !== undefined) doc.updatedAt = task.updatedAt;
    if (task.updates !== undefined) doc.updates = task.updates;
    if (task.suggestedImprovements !== undefined) doc.suggestedImprovements = task.suggestedImprovements;
    
    return doc;
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new task in a space
 */
export async function createTask(
    spaceId: string,
    taskData: Omit<Task, "id" | "createdAt" | "updatedAt">
): Promise<Task> {
    const now = Date.now();
    
    const newTask = {
        ...taskData,
        spaceId,
        createdAt: now,
        updatedAt: now,
        updates: taskData.updates || [],
    };
    
    const docRef = await addDoc(getTasksCollection(spaceId), taskToDoc(newTask));
    
    return {
        ...newTask,
        id: docRef.id,
    } as Task;
}

/**
 * Update an existing task
 */
export async function updateTask(
    spaceId: string,
    taskId: string,
    updates: Partial<Task>
): Promise<void> {
    const taskRef = getTaskDoc(spaceId, taskId);
    
    await updateDoc(taskRef, {
        ...taskToDoc(updates),
        updatedAt: Date.now(),
    });
}

/**
 * Add a timeline entry to a task
 */
export async function addTaskUpdate(
    spaceId: string,
    taskId: string,
    update: Omit<TaskUpdate, "id">
): Promise<void> {
    const taskRef = getTaskDoc(spaceId, taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
        throw new Error("Task not found");
    }
    
    const currentUpdates = (taskSnap.data().updates as TaskUpdate[]) || [];
    const newUpdate: TaskUpdate = {
        ...update,
        id: Date.now().toString(),
    };
    
    await updateDoc(taskRef, {
        updates: [...currentUpdates, newUpdate],
        updatedAt: Date.now(),
    });
}

/**
 * Delete a task
 */
export async function deleteTask(spaceId: string, taskId: string): Promise<void> {
    const taskRef = getTaskDoc(spaceId, taskId);
    await deleteDoc(taskRef);
}

/**
 * Get all tasks for a space (one-time fetch)
 */
export async function getTasksBySpace(spaceId: string): Promise<Task[]> {
    const q = query(
        getTasksCollection(spaceId),
        orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => docToTask(doc.id, doc.data()));
}

/**
 * Get a single task by ID
 */
export async function getTask(spaceId: string, taskId: string): Promise<Task | null> {
    const taskRef = getTaskDoc(spaceId, taskId);
    const snapshot = await getDoc(taskRef);
    
    if (!snapshot.exists()) {
        return null;
    }
    
    return docToTask(snapshot.id, snapshot.data());
}

// ============================================
// Real-time Subscriptions
// ============================================

/**
 * Subscribe to real-time task updates for a space
 * Returns an unsubscribe function
 */
export function subscribeToTasks(
    spaceId: string,
    onTasks: TaskChangeCallback,
    onError?: TaskErrorCallback
): Unsubscribe {
    const q = query(
        getTasksCollection(spaceId),
        orderBy("createdAt", "desc")
    );
    
    return onSnapshot(
        q,
        (snapshot) => {
            const tasks = snapshot.docs.map((doc) => docToTask(doc.id, doc.data()));
            onTasks(tasks);
        },
        (error) => {
            console.error("Task subscription error:", error);
            if (onError) {
                onError({
                    code: "NETWORK_ERROR",
                    message: "Failed to sync tasks. Please check your connection.",
                });
            }
        }
    );
}

// ============================================
// Migration Functions
// ============================================

/**
 * Migrate tasks from localStorage to Firestore
 */
export async function migrateLocalTasks(
    spaceId: string,
    localTasks: Task[]
): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    // Use batch writes for efficiency
    const batch = writeBatch(db);
    
    for (const task of localTasks) {
        try {
            const taskRef = doc(getTasksCollection(spaceId));
            batch.set(taskRef, taskToDoc({
                ...task,
                spaceId,
                id: taskRef.id, // New ID in Firestore
            }));
            success++;
        } catch (error) {
            console.error(`Failed to migrate task ${task.id}:`, error);
            failed++;
        }
    }
    
    if (success > 0) {
        await batch.commit();
    }
    
    return { success, failed };
}

/**
 * Check if a space has been migrated
 */
export function isMigrated(spaceId: string): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`migrated_${spaceId}`) === "true";
}

/**
 * Mark a space as migrated
 */
export function markAsMigrated(spaceId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`migrated_${spaceId}`, "true");
}

/**
 * Get tasks from localStorage (for migration)
 */
export function getLocalTasks(spaceId: string): Task[] {
    if (typeof window === "undefined") return [];
    
    const stored = localStorage.getItem(`tasks_${spaceId}`);
    if (!stored) return [];
    
    try {
        return JSON.parse(stored) as Task[];
    } catch {
        return [];
    }
}

/**
 * Clear local tasks after successful migration
 */
export function clearLocalTasks(spaceId: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`tasks_${spaceId}`);
}
