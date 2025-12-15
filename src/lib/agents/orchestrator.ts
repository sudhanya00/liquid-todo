/**
 * Smart Orchestrator - The Brain of Task Management
 * 
 * Uses LLM-powered classification (no fuzzy matching!) to:
 * 1. Understand user intent with full context awareness
 * 2. Route to appropriate agents
 * 3. Generate intelligent follow-up questions
 * 4. Handle ambiguous requests gracefully
 */

import { Task } from "@/types";
import { classifyIntent, ClassificationResult, SpaceContext, generateSmartFollowUps } from "./classifier";

// Legacy interface for backward compatibility
export interface OrchestratorResponse {
    intent: "create" | "update" | "delete" | "query" | "clarify";
    reasoning: string;
    confidence: number;
    suggestedTaskId?: string;
    clarifyingQuestion?: string;
    
    // New fields from smart classifier
    taskDetails?: ClassificationResult["taskDetails"];
    updates?: ClassificationResult["updates"];
    followUpQuestions?: string[];
}

// Enhanced response with full classification data
export interface SmartOrchestratorResponse extends OrchestratorResponse {
    classification: ClassificationResult;
    taskDetails?: ClassificationResult["taskDetails"];
}

/**
 * Main orchestration function - routes user input to appropriate handler
 */
export async function orchestrateIntent(
    text: string,
    tasks: Task[],
    currentDate: string,
    spaceName?: string,
    recentActivity?: SpaceContext["recentActivity"]
): Promise<SmartOrchestratorResponse> {
    console.log("[Orchestrator] Processing:", text);
    console.log("[Orchestrator] Context:", { taskCount: tasks.length, spaceName });
    
    // Build rich context for LLM
    const context: SpaceContext = {
        spaceId: "current",
        spaceName: spaceName || "Current Space",
        tasks,
        recentActivity,
    };
    
    // Use LLM classifier - NO fuzzy matching!
    const classification = await classifyIntent(text, context);
    
    // Normalize intent to lowercase FIRST
    const normalizedIntent = classification.intent.toLowerCase() as "create" | "update" | "complete" | "delete" | "query" | "clarify";
    
    // Backup: Infer priority from text if not set by classifier
    if (classification.taskDetails && !classification.taskDetails.priority) {
        const lower = text.toLowerCase();
        const highKeywords = ["urgent", "asap", "critical", "important", "blocking", "emergency", "immediately", "right now", "today", "eod"];
        const lowKeywords = ["eventually", "someday", "when you get a chance", "no rush", "low priority", "backlog", "nice to have", "whenever"];
        
        if (highKeywords.some(kw => lower.includes(kw))) {
            classification.taskDetails.priority = "high";
        } else if (lowKeywords.some(kw => lower.includes(kw))) {
            classification.taskDetails.priority = "low";
        } else {
            classification.taskDetails.priority = "medium";
        }
        console.log("[Orchestrator] Inferred priority:", classification.taskDetails.priority);
    }
    
    console.log("[Orchestrator] Classification result:", {
        intent: normalizedIntent,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        taskDetails: classification.taskDetails,
        vaguenessScore: classification.vaguenessScore,
        vagueReason: classification.vagueReason,
    });
    
    // Generate additional follow-up questions if needed
    let followUpQuestions = classification.followUpQuestions || [];
    if (normalizedIntent === "create" && classification.taskDetails) {
        const additionalQuestions = generateSmartFollowUps(classification.taskDetails, tasks);
        followUpQuestions = [...new Set([...followUpQuestions, ...additionalQuestions])].slice(0, 3);
    }
    
    // Build response
    const response: SmartOrchestratorResponse = {
        intent: normalizedIntent === "complete" ? "update" : normalizedIntent,
        reasoning: classification.reasoning,
        confidence: classification.confidence,
        classification,
        followUpQuestions,
        taskDetails: classification.taskDetails, // Pass taskDetails directly
    };
    
    // Add intent-specific fields
    switch (normalizedIntent) {
        case "create":
            // taskDetails already set above
            break;
            
        case "update":
        case "complete":
            response.suggestedTaskId = classification.targetTask?.id;
            response.updates = classification.updates;
            if (classification.intent === "complete") {
                response.updates = { ...response.updates, status: "done" };
            }
            break;
            
        case "delete":
            response.suggestedTaskId = classification.targetTask?.id;
            break;
            
        case "clarify":
            response.clarifyingQuestion = classification.clarifyingQuestion;
            break;
    }
    
    return response;
}

/**
 * Quick intent check - for UI hints without full processing
 */
export function getQuickIntentHint(text: string): string {
    const lowerText = text.toLowerCase().trim();
    
    // Very obvious patterns only
    if (lowerText.startsWith("delete ") || lowerText.startsWith("remove ")) {
        return "delete";
    }
    if (lowerText.startsWith("what ") || lowerText.startsWith("how many") || lowerText.startsWith("show ") || lowerText.startsWith("list ")) {
        return "query";
    }
    if (lowerText.match(/^(mark|set)\s+.+\s+(as\s+)?(done|complete|finished)/)) {
        return "update";
    }
    
    // Default - assume create
    return "create";
}
