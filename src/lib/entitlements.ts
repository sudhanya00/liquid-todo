/**
 * Entitlement Service
 * 
 * Centralized entitlement checking for Smera.
 * Enforces plan limits for Free and Pro tiers.
 */

import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

/**
 * Get the limits for a specific plan tier
 */
export function getPlanLimits(tier: PlanTier): PlanLimits {
    return PLAN_LIMITS[tier];
}

/**
 * Get the start of the current month (for voice log reset)
 */
function getMonthStart(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

/**
 * Check if voice logs should be reset (new month)
 */
function shouldResetVoiceLogs(plan: UserPlan): boolean {
    const currentMonthStart = getMonthStart();
    return plan.voiceLogsResetAt < currentMonthStart;
}

// ============================================
// User Plan CRUD
// ============================================

/**
 * Get a user's plan. Creates a default Free plan if none exists.
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
    const planRef = doc(db, "userPlans", userId);
    const planSnap = await getDoc(planRef);

    if (planSnap.exists()) {
        const plan = planSnap.data() as UserPlan;

        // Check if we need to reset voice logs for new month
        if (shouldResetVoiceLogs(plan)) {
            const updatedPlan: Partial<UserPlan> = {
                voiceLogsUsed: 0,
                voiceLogsResetAt: getMonthStart(),
                updatedAt: Date.now(),
            };
            await updateDoc(planRef, updatedPlan);
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await setDoc(planRef, defaultPlan);
    return defaultPlan;
}

/**
 * Upgrade a user to Pro tier
 */
export async function upgradeToPro(userId: string): Promise<UserPlan> {
    const planRef = doc(db, "userPlans", userId);
    const updates: Partial<UserPlan> = {
        tier: "pro",
        updatedAt: Date.now(),
    };
    await updateDoc(planRef, updates);
    return getUserPlan(userId);
}

// ============================================
// Entitlement Checks
// ============================================

export interface EntitlementResult {
    allowed: boolean;
    reason?: string;
    currentUsage?: number;
    limit?: number | null;
}

/**
 * Check if a user can perform a specific action
 */
export async function canPerform(
    userId: string,
    action: EntitlementAction
): Promise<EntitlementResult> {
    const plan = await getUserPlan(userId);
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

        case "create_space":
            // Note: This requires knowing current space count
            // The caller should pass this context or we query it here
            return { allowed: true }; // Will be enhanced with space count check

        case "access_github_integration":
            if (!limits.hasGitHubIntegration) {
                return {
                    allowed: false,
                    reason: "GitHub integration is available on the Pro plan.",
                };
            }
            return { allowed: true };

        case "access_calendar_integration":
            if (!limits.hasCalendarIntegration) {
                return {
                    allowed: false,
                    reason: "Calendar integration is available on the Pro plan.",
                };
            }
            return { allowed: true };

        case "access_daily_summary":
            if (!limits.hasDailySummary) {
                return {
                    allowed: false,
                    reason: "Daily AI summaries are available on the Pro plan.",
                };
            }
            return { allowed: true };

        default:
            return { allowed: true };
    }
}

/**
 * Check if user can create a new space (requires space count)
 */
export async function canCreateSpace(
    userId: string,
    currentSpaceCount: number
): Promise<EntitlementResult> {
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan.tier);

    if (limits.maxSpaces === null) {
        return { allowed: true };
    }

    if (currentSpaceCount >= limits.maxSpaces) {
        return {
            allowed: false,
            reason: `You've reached the limit of ${limits.maxSpaces} spaces. Upgrade to Pro for unlimited spaces.`,
            currentUsage: currentSpaceCount,
            limit: limits.maxSpaces,
        };
    }

    return {
        allowed: true,
        currentUsage: currentSpaceCount,
        limit: limits.maxSpaces,
    };
}

// ============================================
// Usage Tracking
// ============================================

/**
 * Increment usage for a tracked action (e.g., voice logs)
 */
export async function incrementUsage(
    userId: string,
    action: "voice_log"
): Promise<void> {
    const planRef = doc(db, "userPlans", userId);

    switch (action) {
        case "voice_log":
            await updateDoc(planRef, {
                voiceLogsUsed: increment(1),
                updatedAt: Date.now(),
            });
            break;
    }
}

/**
 * Get remaining quota for an action
 */
export async function getRemainingQuota(
    userId: string,
    action: EntitlementAction
): Promise<number | null> {
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan.tier);

    switch (action) {
        case "create_voice_log":
            if (limits.maxVoiceLogs === null) return null; // Unlimited
            return Math.max(0, limits.maxVoiceLogs - plan.voiceLogsUsed);

        default:
            return null; // Unlimited or not tracked
    }
}

// ============================================
// UI Helpers
// ============================================

/**
 * Get a user-friendly description of remaining quota
 */
export async function getQuotaDisplay(
    userId: string,
    action: EntitlementAction
): Promise<string | null> {
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan.tier);

    switch (action) {
        case "create_voice_log":
            if (limits.maxVoiceLogs === null) return null;
            const remaining = limits.maxVoiceLogs - plan.voiceLogsUsed;
            return `${remaining}/${limits.maxVoiceLogs} voice logs remaining`;

        default:
            return null;
    }
}
