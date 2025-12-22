/**
 * Firebase Admin SDK for Server-Side Operations
 * 
 * This bypasses Firestore security rules and should only be used in API routes.
 * Uses service account credentials or application default credentials.
 */

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let adminApp: App;
let adminDb: Firestore;

export function getAdminApp(): App {
    if (adminApp) return adminApp;

    // Check if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
        adminApp = existingApps[0];
        return adminApp;
    }

    // Initialize with environment variables
    // For local development: Use service account key or application default credentials
    // For production: Use environment-based credentials
    
    try {
        // Try to initialize with service account if available
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            try {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
                adminApp = initializeApp({
                    credential: cert(serviceAccount),
                });
                console.log("[Firebase Admin] Initialized with service account");
            } catch (parseError) {
                console.error("[Firebase Admin] Failed to parse service account key:", parseError);
                throw parseError;
            }
        } else {
            // Use minimal config for development (no credentials needed for emulator or public access)
            // In production, use proper credentials or Cloud Functions environment
            console.log("[Firebase Admin] Initializing with project ID only (development mode)");
            adminApp = initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        }
        
        console.log("[Firebase Admin] Initialized successfully");
        return adminApp;
    } catch (error) {
        console.error("[Firebase Admin] Initialization error:", error);
        throw new Error("Failed to initialize Firebase Admin SDK");
    }
}

export function getAdminDb(): Firestore {
    if (adminDb) return adminDb;
    
    const app = getAdminApp();
    adminDb = getFirestore(app);
    
    return adminDb;
}
