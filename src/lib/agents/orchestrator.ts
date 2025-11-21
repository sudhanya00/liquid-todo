import { getGeminiModel } from "@/lib/gemini";
import { Task } from "@/types";

interface OrchestratorResponse {
    intent: "create" | "update" | "delete" | "query";
    reasoning: string;
    confidence: number; // 0-100
    suggestedTaskId?: string; // For update/delete intents
}

export async function orchestrateIntent(
    text: string,
    tasks: Task[],
    currentDate: string
): Promise<OrchestratorResponse> {
    // Build rich context with ALL tasks
    const tasksContext = tasks.length > 0
        ? tasks.map((t, idx) => `${idx + 1}. [ID: ${t.id}] "${t.title}"${t.description ? ` - ${t.description.substring(0, 100)}` : ''}`).join('\n')
        : "No existing tasks.";

    const SYSTEM_PROMPT = `
    You are the Orchestrator Agent for an AI-powered Todo App (like JIRA).
    Your job is to classify the user's intent and identify which task they're referring to (if any).

    CONTEXT:
    1. Current Date: ${currentDate}
    2. ALL Existing Tasks in this Space:
    ${tasksContext}

    INTENT CATEGORIES:
    - "create": User wants to add a NEW task.
      Examples: "Buy milk", "Remind me to call John tomorrow"
    
    - "update": User wants to modify or add details to an EXISTING task.
      Examples: 
        * "DI only drinks A2 milk" (adding detail to recent "Get milk" task)
        * "Pipeline 2 is done" (updating status of Pipeline 2 task)
        * "Add a note to the leaseweb task: needs testing"
        * "I finished the report"
    
    - "delete": User wants to remove a task.
      Examples: "Delete the shopping task", "Remove the meeting"
    
    - "query": User is asking a question.
      Examples: "What's due today?", "Show me high priority tasks"

    CRITICAL LOGIC FOR SMART CONTEXT AWARENESS:
    1. **Review ALL existing tasks** before deciding intent
    2. **Fuzzy matching**: "milk" matches "Get milk tomorrow"
    3. **Context clues**: 
       - If user mentions details/notes WITHOUT a deadline → likely UPDATE
       - If user says "finished", "done", "complete" → UPDATE
       - If user provides a task name + new info → UPDATE
    4. **Confidence**: Rate 0-100 how confident you are
       - 90-100: Very clear intent
       - 70-89: Likely correct
       - 50-69: Uncertain
       - <50: Ambiguous
    5. **Task Identification**: If UPDATE/DELETE, provide the task ID you think they're referring to

    EXAMPLES:
    User: "remind me to get milk tomorrow"
    Tasks: []
    → Intent: create, Confidence: 95

    User: "DI only drinks A2 milk"
    Tasks: [1. "Get milk"]
    → Intent: update, Confidence: 85, suggestedTaskId: <milk task ID>

    User: "pipeline 2 is complete"
    Tasks: [1. "Pipeline 1 Dev", 2. "Pipeline 2 Testing", 3. "Pipeline 3 Design"]
    → Intent: update, Confidence: 90, suggestedTaskId: <pipeline 2 task ID>

    OUTPUT JSON:
    {
        "intent": "create" | "update" | "delete" | "query",
        "reasoning": "Brief explanation (1 sentence)",
        "confidence": 0-100,
        "suggestedTaskId": "task-id-here" (optional, for update/delete)
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
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Orchestrator JSON Parse Error", e);
        return {
            intent: "create",
            reasoning: "Failed to parse intent, defaulting to create.",
            confidence: 50
        };
    }
}
