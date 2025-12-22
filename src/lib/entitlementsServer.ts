/**
 * Server-Side Entitlement Service
 * 
 * Uses Firebase Admin SDK to bypass security rules.
 * Only use in API routes - never expose to client.
 */

import { getAdminDb } from "./firebaseAdmin";
import {
    UserPlan,
    PlanTier,
    EntitlementAction,
    PlanLimits,
    PLAN_LIMITS,
} from "@/types";

// ============================================
// Plan Limit Helpers
// ============================================

export function getPlanLimits(tier: PlanTier): PlanLimits {
    return PLAN_LIMITS[tier];
}

function getMonthStart(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function shouldResetVoiceLogs(plan: UserPlan): boolean {
    const currentMonthStart = getMonthStart();
    return plan.voiceLogsResetAt < currentMonthStart;
}

function shouldResetAiRequests(plan: UserPlan): boolean {
    const currentMonthStart = getMonthStart();
    return plan.aiRequestsResetAt < currentMonthStart;
}

// ============================================
// User Plan CRUD (Server-Side)
// ============================================

export async function getUserPlanServer(userId: string): Promise<UserPlan> {
    const db = getAdminDb();
    const planRef = db.collection("userPlans").doc(userId);
    const planSnap = await planRef.get();

    if (planSnap.exists) {
        const plan = planSnap.data() as UserPlan;

        // Check if we need to reset usage for new month
        const needsVoiceReset = shouldResetVoiceLogs(plan);
        const needsAiReset = shouldResetAiRequests(plan);

        if (needsVoiceReset || needsAiReset) {
            const updatedPlan: Partial<UserPlan> = {
                updatedAt: Date.now(),
            };
            
            if (needsVoiceReset) {
                updatedPlan.voiceLogsUsed = 0;
                updatedPlan.voiceLogsResetAt = getMonthStart();
            }
            
            if (needsAiReset) {
                updatedPlan.aiRequestsUsed = 0;
                updatedPlan.aiRequestsResetAt = getMonthStart();
            }

            await planRef.update(updatedPlan);
            return { ...plan, ...updatedPlan } as UserPlan;
        }

        return plan;
    }

    // Create default Free plan
    const defaultPlan: UserPlan = {
        userId,
        tier: "free",
        voiceLogsUsed: 0,
        voiceLogsResetAt: getMonthStart(),
        aiRequestsUsed: 0,
        aiRequestsResetAt: getMonthStart(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await planRef.set(defaultPlan);
    return defaultPlan;
}

// ============================================
// Entitlement Checks (Server-Side)
// ============================================

export interface EntitlementResult {
    allowed: boolean;
    reason?: string;
    currentUsage?: number;
    limit?: number | null;
}

export async function canPerformServer(
    userId: string,
    action: EntitlementAction
): Promise<EntitlementResult> {
    const plan = await getUserPlanServer(userId);
    const limits = getPlanLimits(plan.tier);

    switch (action) {
        case "create_voice_log":
            if (limits.maxVoiceLogs === null) {
                return { allowed: true };
            }
            if (plan.voiceLogsUsed >= limits.maxVoiceLogs) {
                return {
                    allowed: false,
                    reason: `You've used all ${limits.maxVoiceLogs} voice logs this month. Upgrade to Pro for unlimited voice logging.`,
                    currentUsage: plan.voiceLogsUsed,
                    limit: limits.maxVoiceLogs,
                };
            }
            return {
                allowed: true,
                currentUsage: plan.voiceLogsUsed,
                limit: limits.maxVoiceLogs,
            };

        case "create_ai_request":
            if (limits.maxAiRequests === null) {
                return { allowed: true };
            }
            if (plan.aiRequestsUsed >= limits.maxAiRequests) {
                return {
                    allowed: false,
                    reason: `You've used all ${limits.maxAiRequests} AI requests this month. Upgrade to Pro for unlimited AI-powered task creation.`,
                    currentUsage: plan.aiRequestsUsed,
                    limit: limits.maxAiRequests,
                };
            }
            return {
                allowed: true,
                currentUsage: plan.aiRequestsUsed,
                limit: limits.maxAiRequests,
            };

        default:
            return { allowed: true };
    }
}

// ============================================
// Usage Tracking (Server-Side)
// ============================================

export async function incrementUsageServer(
    userId: string,
    action: "voice_log" | "ai_request"
): Promise<void> {
    const db = getAdminDb();
    const planRef = db.collection("userPlans").doc(userId);

    const updates: Partial<UserPlan> = {
        updatedAt: Date.now(),
    };

    switch (action) {
        case "voice_log":
            // Use FieldValue.increment for atomic updates
            const { FieldValue } = await import("firebase-admin/firestore");
            await planRef.update({
                voiceLogsUsed: FieldValue.increment(1),
                updatedAt: Date.now(),
            });
            break;
        case "ai_request":
            const { FieldValue: FV } = await import("firebase-admin/firestore");
            await planRef.update({
                aiRequestsUsed: FV.increment(1),
                updatedAt: Date.now(),
            });
            break;
    }
}
