import { getGeminiModel } from "@/lib/gemini";
import { Task, TaskUpdate } from "@/types";
import { retryWithBackoff, parseAIResponse, AIError, getUserFriendlyErrorMessage } from "@/lib/aiRetry";

interface UpdaterResponse {
    taskId: string | null;
    updates: {
        status?: "todo" | "in-progress" | "done";
        dueDate?: string | null;
        dueTime?: string;
        priority?: "low" | "medium" | "high";
        title?: string;
        description?: string;
    };
    timeline?: Omit<TaskUpdate, "id">; // Timeline entry to add
    missingInfo?: string;
}

export async function handleUpdateTask(
    text: string,
    tasks: Task[],
    currentDate: string,
    suggestedTaskId?: string
): Promise<UpdaterResponse> {
    // Target task is now provided by the smart classifier (no more fuzzy matching!)
    let targetTask: Task | undefined;

    if (suggestedTaskId) {
        targetTask = tasks.find(t => t.id === suggestedTaskId);
    }
    
    // If no target task found, return error (classifier should have caught this)
    if (!targetTask) {
        console.log("[Updater] No target task found for ID:", suggestedTaskId);
        return {
            taskId: null,
            updates: {},
            missingInfo: "Could not find the task you're referring to. Please specify which task you want to update.",
        };
    }

    // Build context with ALL tasks
    const tasksContext = tasks.length > 0
        ? tasks.map((t, idx) => `${idx + 1}. [ID: ${t.id}] "${t.title}"${t.description ? ` - ${t.description.substring(0, 80)}` : ''} [Status: ${t.status}]`).join('\n')
        : "No existing tasks.";

    const SYSTEM_PROMPT = `You are an expert Task Update Agent for an AI-powered task management system.

## CONTEXT
**Current Date:** ${currentDate}

**All Tasks in Space:**
${tasksContext}

**TARGET TASK (To Update):**
- ID: ${targetTask.id}
- Title: "${targetTask.title}"
- Status: ${targetTask.status}

## YOUR OBJECTIVE
Analyze the user's update request and generate:
1. Structured field updates (only fields that should change)
2. Timeline entry documenting the change

## RULES (Critical - Follow Exactly)
    
### 1. STATUS UPDATES (Most Critical)

**ONLY set status="done" when user explicitly says the ENTIRE task is complete.**

**Phrases indicating task completion:**
- "[task name] is done/finished/complete"
- "I finished [task name]"
- "Wrapped up [task name]"
- "[task name] is complete"
- "Mark [task name] as done"

**Examples - Mark as DONE:**
- "The API integration is done" → status: "done"
- "Finished the login bug fix" → status: "done"
- "PR review complete" → status: "done"

**Examples - DO NOT mark as done (Progress Notes):**
- "Completed the database schema" → NOTE (part of larger task)
- "Finished setting up environment" → NOTE (subtask)
- "Done with initial testing" → NOTE (phase of task)
- "Wrapped up the meeting" → NOTE (activity, not task)

**Critical distinction:**
- User refers to THE TASK by name + completion word → status: "done"
- User describes work completed (subtask/milestone) → Timeline NOTE only

**Status change to "in-progress":**
- "Started working on [task]"
- "Beginning [task]"
- "[task] is in progress"

**Status change to "todo":**
- "Reopen [task]"
- "Need to redo [task]"
- "Moving [task] back to todo"
       
### 2. OTHER FIELD UPDATES

**Priority (only if explicitly mentioned):**
- "Make [task] high/urgent priority" → priority: "high"
- "Lower priority of [task]" → priority: "low"
- "Set [task] to medium priority" → priority: "medium"
- "This is urgent/critical/ASAP" → priority: "high"

**Due Date (only if explicitly mentioned):**
- "Move [task] to tomorrow" → dueDate: [tomorrow's date]
- "Change deadline to Friday" → dueDate: [Friday's date]
- "Extend [task] by 2 days" → dueDate: [current + 2 days]
- "No deadline" → dueDate: null

**Description (RARELY updated):**
- Only when user says "change/update the description"
- Progress notes → Timeline entry, NOT description update
- New details → Add to description if requested

**CRITICAL RULE:** Only include fields in "updates" object that should ACTUALLY change.
- If just adding a note → Only timeline entry, empty updates: {}
- If marking complete → updates: { status: "done" }
- If no changes → updates: {}, timeline with clarification
    
    3. **Generate Timeline Entry**:
       - **type**: "status_change" | "note" | "field_update"
       - **content**: Human-readable description of what changed
       - **field/oldValue/newValue**: For field updates
       
       Examples:
       - User: "agent 1 is done" → type: "status_change", content: "Marked as complete", updates: {status: "done"}
       - User: "completed the embedding setup" → type: "note", content: "Completed the embedding setup", updates: {description: "Completed the embedding setup"}
       - User: "completed DAX translation code" → type: "note", content: "Completed DAX translation code", updates: {description: "Completed DAX translation code"}
       - User: "make it high priority" → type: "field_update", field: "priority", content: "Priority changed to high", updates: {priority: "high"}

    4. **Personality & Tone**:
       - If you need to ask for missing info (missingInfo field), be conversational and varied.
       - **NO EMOJIS**. The user hates emojis.
       - Examples:
         * "Which task are you referring to?"
         * "I'm not sure which task you mean. Could you clarify?"
         * "Do you want to mark 'Task Name' as completed?"

    OUTPUT JSON:
    {
        "taskId": "string or null",
        "updates": {
            // ONLY include fields that should actually be updated
            // Do NOT include fields with null/undefined
            "status": "todo" | "in-progress" | "done" (ONLY if explicitly marking task as done),
            "dueDate": "ISO string" (ONLY if changing due date),
            "dueTime": "HH:MM" (ONLY if changing due time),
            "priority": "low" | "medium" | "high" (ONLY if changing priority),
            "description": "string" (for progress notes - will be appended)
        },
        "timeline": {
            "timestamp": ${Date.now()},
            "type": "status_change" | "note" | "field_update",
            "content": "Human-readable description",
            "field": "optional field name",
            "oldValue": "optional old value",
            "newValue": "optional new value"
        },
        "missingInfo": "string or null" // If task is ambiguous
    }
    `;

    try {
        // Use retry logic with timeout protection
        const parsed = await retryWithBackoff<UpdaterResponse>(
            async () => {
                const model = getGeminiModel();
                const result = await model.generateContent([
                    { text: SYSTEM_PROMPT },
                    { text: `User Input: "${text}"` }
                ]);

                const response = result.response;
                const jsonStr = response.text();
                
                console.log("[Updater] Raw response:", jsonStr.substring(0, 200) + "...");
                
                // Parse with fallback
                const fallback: UpdaterResponse = {
                    taskId: targetTask?.id || null,
                    updates: {},
                    missingInfo: "I couldn't process the update request. Please try again.",
                };
                
                const result_parsed = parseAIResponse<UpdaterResponse>(jsonStr, fallback);
                
                // If we have a target task from classifier, use it
                if (targetTask && !result_parsed.taskId) {
                    result_parsed.taskId = targetTask.id;
                }
                
                return result_parsed;
            },
            {
                maxRetries: 2,
                initialDelayMs: 1000,
                timeoutMs: 20000, // 20 seconds
            },
            "Task Update"
        );
        
        return parsed;
    } catch (error) {
        console.error("[Updater] Error:", error);
        
        if (error instanceof AIError) {
            console.error("[Updater] AI Error:", getUserFriendlyErrorMessage(error));
        }
        
        // Return safe fallback
        return {
            taskId: targetTask?.id || null,
            updates: {},
            missingInfo: error instanceof AIError 
                ? getUserFriendlyErrorMessage(error)
                : "I'm not sure which task you want to update.",
        };
    }
}
