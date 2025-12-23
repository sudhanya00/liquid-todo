/**
 * Offline Write Queue
 * 
 * Manages pending writes when offline and syncs when back online.
 * Uses IndexedDB for persistent storage across sessions.
 */

import { Task, TaskUpdate } from "@/types";

export type OfflineOperation = 
  | { type: "create"; task: Omit<Task, "id" | "createdAt" | "updatedAt" | "spaceId">; spaceId: string; tempId: string }
  | { type: "update"; taskId: string; updates: Partial<Task>; spaceId: string }
  | { type: "delete"; taskId: string; spaceId: string }
  | { type: "addUpdate"; taskId: string; update: Omit<TaskUpdate, "id">; spaceId: string };

export interface QueuedOperation {
  id: string;
  operation: OfflineOperation;
  timestamp: number;
  retries: number;
  lastError?: string;
}

const DB_NAME = "smera_offline_queue";
const DB_VERSION = 1;
const STORE_NAME = "operations";
const MAX_RETRIES = 3;

/**
 * Initialize IndexedDB for offline queue
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("spaceId", "operation.spaceId", { unique: false });
      }
    };
  });
}

/**
 * Add operation to offline queue
 */
export async function queueOperation(operation: OfflineOperation): Promise<string> {
  const db = await initDB();
  
  const queuedOp: QueuedOperation = {
    id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    operation,
    timestamp: Date.now(),
    retries: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(queuedOp);

    request.onsuccess = () => resolve(queuedOp.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending operations
 */
export async function getPendingOperations(): Promise<QueuedOperation[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("timestamp");
    const request = index.openCursor();

    const operations: QueuedOperation[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        operations.push(cursor.value);
        cursor.continue();
      } else {
        resolve(operations);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get pending operations for a specific space
 */
export async function getPendingOperationsBySpace(spaceId: string): Promise<QueuedOperation[]> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("spaceId");
    const request = index.openCursor(IDBKeyRange.only(spaceId));

    const operations: QueuedOperation[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        operations.push(cursor.value);
        cursor.continue();
      } else {
        resolve(operations);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove operation from queue
 */
export async function removeOperation(operationId: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(operationId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update operation retry count and error
 */
export async function updateOperationRetry(
  operationId: string,
  error: string
): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(operationId);

    getRequest.onsuccess = () => {
      const operation = getRequest.result as QueuedOperation;
      if (!operation) {
        reject(new Error("Operation not found"));
        return;
      }

      operation.retries += 1;
      operation.lastError = error;

      // If max retries reached, remove from queue
      if (operation.retries >= MAX_RETRIES) {
        store.delete(operationId);
        console.error(`[OfflineQueue] Operation ${operationId} failed after ${MAX_RETRIES} retries:`, error);
        resolve();
        return;
      }

      const putRequest = store.put(operation);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Clear all operations (use with caution)
 */
export async function clearAllOperations(): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get operation count
 */
export async function getOperationCount(): Promise<number> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
