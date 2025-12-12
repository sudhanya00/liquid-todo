import { getGeminiModel } from "@/lib/gemini";
import { Task, TaskUpdate } from "@/types";
import { findBestTaskMatch } from "@/lib/taskMatcher";

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
    // Try fuzzy matching if no suggested task ID
    let targetTask: Task | undefined;

    if (suggestedTaskId) {
        targetTask = tasks.find(t => t.id === suggestedTaskId);
    } else {
        const match = findBestTaskMatch(text, tasks);
        if (match) {
            targetTask = match.task;
        }
    }

    // Build context with ALL tasks
    const tasksContext = tasks.length > 0
        ? tasks.map((t, idx) => `${idx + 1}. [ID: ${t.id}] "${t.title}"${t.description ? ` - ${t.description.substring(0, 80)}` : ''} [Status: ${t.status}]`).join('\n')
        : "No existing tasks.";

    const SYSTEM_PROMPT = `
    You are the Updater Agent for an AI-powered Todo App.
    Your job is to identify which task to update and generate structured updates + timeline entries.

    CONTEXT:
    1. Current Date: ${currentDate}
    2. ALL Existing Tasks:
    ${tasksContext}
    ${targetTask ? `\n3. SUGGESTED TASK (from Orchestrator): [ID: ${targetTask.id}] "${targetTask.title}"` : ''}

    RUBRIC:
    1. **Identify Task**: 
       - Use the SUGGESTED TASK if provided
       - Otherwise, FUZZY MATCH user input to closest task
       - Examples: "milk" → "Get milk", "pipeline 2" → "Pipeline 2 Testing", "DAX" → "Development of Agent 2"
    
    2. **Determine Updates**:
       **CRITICAL STATUS LOGIC:**
       - **ONLY mark status="done" if user EXPLICITLY says the ENTIRE TASK is done**
       - Examples that should mark as done:
         * "agent 1 is done"
         * "finished the agent 1 task"
         * "completed agent 1"
       - Examples that should NOT mark as done (these are progress notes):
         * "completed the embedding model setup" → This is a NOTE, not task completion
         * "completed DAX translation code" → This is a NOTE
         * "finished the database configuration" → This is a NOTE
         * "established connection" → This is a NOTE
       
       **Other Updates:**
       - **Due Date/Time**: Only update if user explicitly mentions changing the date/time
       - **Priority**: Only update if user mentions priority ("make it high priority")
       - **Description**: Only update if user EXPLICITLY asks to change the description. Do NOT put progress notes here.
       
       **IMPORTANT**: Only include fields in "updates" that should actually be changed.
       - If user is just adding a note, do NOT return description. Just return the timeline entry.
       - Do NOT return null/undefined for fields that shouldn't change
    
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

    const model = getGeminiModel();
    const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: `User Input: "${text}"` }
    ]);

    const response = result.response;
    let jsonStr = response.text();
    jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        const parsed = JSON.parse(jsonStr);

        // If we have a target task from fuzzy matching, use it
        if (targetTask && !parsed.taskId) {
            parsed.taskId = targetTask.id;
        }

        return parsed;
    } catch (e) {
        console.error("Updater JSON Parse Error", e);
        return {
            taskId: targetTask?.id || null,
            updates: {},
            missingInfo: "I'm not sure which task you want to update."
        };
    }
}
