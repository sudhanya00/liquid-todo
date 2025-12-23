/**
 * Firebase Admin SDK for Server-Side Operations
 * 
 * This bypasses Firestore security rules and should only be used in API routes.
 * PRODUCTION: Requires proper service account credentials.
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

    // SECURITY: Always require proper credentials
    try {
        // Production: Use service account key from environment variable
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            try {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
                adminApp = initializeApp({
                    credential: cert(serviceAccount),
                });
                console.log("[Firebase Admin] Initialized with service account");
                return adminApp;
            } catch (parseError) {
                console.error("[Firebase Admin] Failed to parse service account key:", parseError);
                throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY format");
            }
        }
        
        // Development: Allow fallback ONLY in development mode
        if (process.env.NODE_ENV === "development") {
            console.warn("[Firebase Admin] WARNING: Running without credentials in development mode");
            console.warn("[Firebase Admin] This will NOT work in production!");
            adminApp = initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
            return adminApp;
        }
        
        // Production without credentials = FAIL
        throw new Error(
            "FIREBASE_SERVICE_ACCOUNT_KEY is required in production. " +
            "Set this environment variable with your Firebase service account JSON."
        );
        
    } catch (error) {
        console.error("[Firebase Admin] Initialization error:", error);
        throw error;
    }
}

export function getAdminDb(): Firestore {
    if (adminDb) return adminDb;
    
    const app = getAdminApp();
    adminDb = getFirestore(app);
    
    return adminDb;
}
