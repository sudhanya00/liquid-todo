// ============================================
// Plan & Entitlement Types
// ============================================

export type PlanTier = "free" | "pro";

export type EntitlementAction =
    | "create_voice_log"
    | "create_space"
    | "access_github_integration"
    | "access_calendar_integration"
    | "access_daily_summary";

export interface PlanLimits {
    maxVoiceLogs: number | null; // null = unlimited
    maxSpaces: number | null; // null = unlimited
    hasGitHubIntegration: boolean;
    hasCalendarIntegration: boolean;
    hasDailySummary: boolean;
}

export interface UserPlan {
    userId: string;
    tier: PlanTier;
    voiceLogsUsed: number;
    voiceLogsResetAt: number; // Timestamp for monthly reset
    createdAt: number;
    updatedAt: number;
}

// Plan limits configuration
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
    free: {
        maxVoiceLogs: 10,
        maxSpaces: 2,
        hasGitHubIntegration: false,
        hasCalendarIntegration: false,
        hasDailySummary: false,
    },
    pro: {
        maxVoiceLogs: null,
        maxSpaces: null,
        hasGitHubIntegration: true,
        hasCalendarIntegration: true,
        hasDailySummary: true,
    },
};

// ============================================
// Space Types
// ============================================

export interface Space {
    id: string;
    name: string;
    theme: string;
    createdAt: number;
    ownerId: string;
}

// ============================================
// Task Types
// ============================================

export interface TaskUpdate {
    id: string;
    timestamp: number;
    type: "status_change" | "note" | "field_update";
    content: string;
    field?: string; // e.g., "priority", "dueDate", "status"
    oldValue?: string;
    newValue?: string;
}

export interface Task {
    id: string;
    spaceId: string;
    title: string;
    description?: string;
    dueDate?: string | null;
    dueTime?: string; // e.g., "14:00" or "2:00 PM"
    priority?: "low" | "medium" | "high";
    status: "todo" | "in-progress" | "done";
    createdAt: number;
    updatedAt: number;
    updates?: TaskUpdate[]; // Activity timeline
    
    // AI-suggested improvements - optional questions user can answer to enrich the task
    suggestedImprovements?: string[];
    
    // Future: Sync metadata
    // syncVersion?: number;
    // lastSyncedAt?: number;
}
