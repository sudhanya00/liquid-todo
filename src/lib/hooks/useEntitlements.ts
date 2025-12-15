"use client";

/**
 * useEntitlements Hook
 * 
 * React hook for accessing user entitlements in components.
 * Provides easy access to plan info and permission checks.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    UserPlan,
    EntitlementAction,
    PlanLimits,
    PLAN_LIMITS,
} from "@/types";
import {
    getUserPlan,
    canPerform,
    canCreateSpace,
    getRemainingQuota,
    EntitlementResult,
} from "@/lib/entitlements";

interface UseEntitlementsReturn {
    // State
    plan: UserPlan | null;
    limits: PlanLimits | null;
    loading: boolean;
    error: string | null;

    // Checks
    checkPermission: (action: EntitlementAction) => Promise<EntitlementResult>;
    checkCanCreateSpace: (currentCount: number) => Promise<EntitlementResult>;
    getRemaining: (action: EntitlementAction) => Promise<number | null>;

    // Derived state
    isPro: boolean;
    voiceLogsRemaining: number | null;

    // Actions
    refresh: () => Promise<void>;
}

export function useEntitlements(): UseEntitlementsReturn {
    const { user } = useAuth();
    const [plan, setPlan] = useState<UserPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [voiceLogsRemaining, setVoiceLogsRemaining] = useState<number | null>(null);

    // Fetch plan on mount and when user changes
    const fetchPlan = useCallback(async () => {
        if (!user) {
            setPlan(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const userPlan = await getUserPlan(user.uid);
            setPlan(userPlan);

            // Pre-fetch voice logs remaining for UI
            const remaining = await getRemainingQuota(user.uid, "create_voice_log");
            setVoiceLogsRemaining(remaining);
        } catch (err) {
            console.error("Failed to fetch user plan:", err);
            setError("Failed to load plan information");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchPlan();
    }, [fetchPlan]);

    // Permission check wrapper
    const checkPermission = useCallback(
        async (action: EntitlementAction): Promise<EntitlementResult> => {
            if (!user) {
                return { allowed: false, reason: "Please sign in to continue." };
            }
            return canPerform(user.uid, action);
        },
        [user]
    );

    // Space creation check wrapper
    const checkCanCreateSpace = useCallback(
        async (currentCount: number): Promise<EntitlementResult> => {
            if (!user) {
                return { allowed: false, reason: "Please sign in to continue." };
            }
            return canCreateSpace(user.uid, currentCount);
        },
        [user]
    );

    // Get remaining quota wrapper
    const getRemaining = useCallback(
        async (action: EntitlementAction): Promise<number | null> => {
            if (!user) return null;
            return getRemainingQuota(user.uid, action);
        },
        [user]
    );

    // Derived state
    const isPro = plan?.tier === "pro";
    const limits = plan ? PLAN_LIMITS[plan.tier] : null;

    return {
        plan,
        limits,
        loading,
        error,
        checkPermission,
        checkCanCreateSpace,
        getRemaining,
        isPro,
        voiceLogsRemaining,
        refresh: fetchPlan,
    };
}
