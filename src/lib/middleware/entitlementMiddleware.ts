/**
 * Server-Side Entitlement Middleware for API Routes
 * 
 * Performs server-side entitlement checks with proper security:
 * - Verifies authentication
 * - Checks quota limits
 * - Atomically increments usage
 * - Prevents race conditions
 */

import { NextResponse } from "next/server";
import { canPerformServer, incrementUsageServer } from "@/lib/entitlementsServer";
import { verifyUserOwnership, AuthError } from "@/lib/auth/verifyToken";
import { EntitlementAction } from "@/types";

export interface EntitlementCheckResult {
    allowed: boolean;
    userId: string;
    error?: NextResponse;
}

/**
 * Check entitlements server-side (SECURE)
 * 
 * This performs the actual security check on the server.
 * Never trust client-side checks for quota enforcement.
 */
export async function checkEntitlement(
    request: Request,
    claimedUserId: string,
    action: EntitlementAction
): Promise<EntitlementCheckResult> {
    try {
        // 1. Verify authentication and user ownership
        const user = await verifyUserOwnership(request, claimedUserId);
        
        // 2. Check entitlement (server-side, can't be bypassed)
        const entitlementResult = await canPerformServer(user.uid, action);
        
        if (!entitlementResult.allowed) {
            return {
                allowed: false,
                userId: user.uid,
                error: NextResponse.json(
                    {
                        success: false,
                        error: entitlementResult.reason || 'Quota exceeded',
                        action: 'quota_exceeded',
                        currentUsage: entitlementResult.currentUsage,
                        limit: entitlementResult.limit,
                    },
                    { status: 403 }
                ),
            };
        }
        
        return {
            allowed: true,
            userId: user.uid,
        };
        
    } catch (error) {
        if (error instanceof AuthError) {
            return {
                allowed: false,
                userId: claimedUserId,
                error: NextResponse.json(
                    { error: error.message },
                    { status: error.statusCode }
                ),
            };
        }
        
        console.error('[Entitlement Check] Unexpected error:', error);
        return {
            allowed: false,
            userId: claimedUserId,
            error: NextResponse.json(
                { error: 'Internal server error during entitlement check' },
                { status: 500 }
            ),
        };
    }
}

/**
 * Atomically increment usage after successful API call
 * 
 * This should be called AFTER the API operation succeeds to prevent
 * charging users for failed requests.
 */
export async function incrementUsage(
    userId: string,
    action: 'voice_log' | 'ai_request'
): Promise<void> {
    try {
        await incrementUsageServer(userId, action);
    } catch (error) {
        // Log but don't fail the request - user already got their result
        console.error('[Usage Increment] Failed to increment usage:', error);
    }
}
