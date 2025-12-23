/**
 * Firebase Auth Token Verification for API Routes
 * 
 * Verifies that the request comes from an authenticated user
 * and that the userId matches the authenticated user.
 */

import { auth } from "firebase-admin";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface VerifiedUser {
    uid: string;
    email: string | null;
    emailVerified: boolean;
}

export class AuthError extends Error {
    constructor(
        message: string,
        public statusCode: number = 401
    ) {
        super(message);
        this.name = 'AuthError';
    }
}

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Verify Firebase Auth token and return user info
 * 
 * @throws AuthError if token is invalid or missing
 */
export async function verifyAuthToken(request: Request): Promise<VerifiedUser> {
    const authHeader = request.headers.get('Authorization');
    const token = extractToken(authHeader);

    if (!token) {
        throw new AuthError('Missing authentication token', 401);
    }

    try {
        const app = getAdminApp();
        const decodedToken = await auth(app).verifyIdToken(token);
        
        return {
            uid: decodedToken.uid,
            email: decodedToken.email || null,
            emailVerified: decodedToken.email_verified || false,
        };
    } catch (error) {
        console.error('[Auth] Token verification failed:', error);
        throw new AuthError('Invalid or expired authentication token', 401);
    }
}

/**
 * Verify that the userId in the request matches the authenticated user
 * 
 * @throws AuthError if userId doesn't match or user is not authenticated
 */
export async function verifyUserOwnership(
    request: Request,
    claimedUserId: string
): Promise<VerifiedUser> {
    const user = await verifyAuthToken(request);
    
    if (user.uid !== claimedUserId) {
        throw new AuthError(
            'User ID mismatch: You can only access your own resources',
            403
        );
    }
    
    return user;
}
