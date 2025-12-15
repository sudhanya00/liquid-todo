/**
 * Entitlement Middleware
 * 
 * Server-side enforcement of plan limits on API routes.
 * Use this to wrap API handlers that require entitlement checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { EntitlementAction } from "@/types";

// Note: This is a simplified version for Next.js API routes.
// In production, you'd verify the Firebase ID token server-side.

export interface EntitlementError {
    error: string;
    code: "ENTITLEMENT_EXCEEDED" | "UNAUTHORIZED" | "PLAN_ERROR";
    action: EntitlementAction;
    currentUsage?: number;
    limit?: number;
}

/**
 * Create a standardized entitlement error response
 */
export function entitlementError(
    action: EntitlementAction,
    message: string,
    code: EntitlementError["code"] = "ENTITLEMENT_EXCEEDED",
    usage?: { current: number; limit: number }
): NextResponse<EntitlementError> {
    return NextResponse.json(
        {
            error: message,
            code,
            action,
            currentUsage: usage?.current,
            limit: usage?.limit,
        },
        { status: 403 }
    );
}

/**
 * Wrapper for API handlers that require authentication
 * Returns userId if authenticated, or error response
 */
export async function requireAuth(
    request: NextRequest
): Promise<{ userId: string } | NextResponse> {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
            { error: "Unauthorized", code: "UNAUTHORIZED" },
            { status: 401 }
        );
    }

    // In a full implementation, you would:
    // 1. Extract the Firebase ID token from the Bearer header
    // 2. Verify it using Firebase Admin SDK
    // 3. Return the decoded user ID
    //
    // For now, we'll trust the client-side auth and expect userId in the request body
    // TODO: Implement proper server-side token verification
    
    try {
        const body = await request.clone().json();
        if (!body.userId) {
            return NextResponse.json(
                { error: "User ID required", code: "UNAUTHORIZED" },
                { status: 401 }
            );
        }
        return { userId: body.userId };
    } catch {
        return NextResponse.json(
            { error: "Invalid request body", code: "UNAUTHORIZED" },
            { status: 400 }
        );
    }
}

/**
 * Helper to check if a response is an error response
 */
export function isErrorResponse(
    response: { userId: string } | NextResponse
): response is NextResponse {
    return response instanceof NextResponse;
}
