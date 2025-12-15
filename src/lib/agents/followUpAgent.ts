import { getGeminiModel } from "@/lib/gemini";
import { Task } from "@/types";

export type FollowUpCategory = 
    | "due_date"
    | "priority" 
    | "acceptance_criteria"
    | "context"
    | "dependencies"
    | "effort_estimate"
    | "assignee"
    | "clarification";

export interface FollowUpQuestion {
    category: FollowUpCategory;
    question: string;
    importance: "critical" | "recommended" | "nice-to-have";
    examples?: string[]; // Example answers to guide user
}

export interface FollowUpAnalysis {
    questions: FollowUpQuestion[];
    taskCompleteness: number; // 0-100 how complete is the task info
    reasoning: string;
}

/**
 * Analyzes a task and generates smart follow-up questions
 * to gather missing information that would make the task actionable
 */
export async function generateFollowUpQuestions(
    taskTitle: string,
    taskDescription: string | null,
    existingTasks: Task[],
    alreadyAsked: FollowUpCategory[] = []
): Promise<FollowUpAnalysis> {
    // Build context about existing tasks for smart suggestions
    const tasksContext = existingTasks.length > 0
        ? existingTasks.slice(0, 10).map(t => 
            `- "${t.title}" (${t.priority} priority, due: ${t.dueDate || 'none'})`
        ).join('\n')
        : "No other tasks.";

    const alreadyAskedStr = alreadyAsked.length > 0 
        ? `\nAlready asked about: ${alreadyAsked.join(', ')} - DO NOT ask these again.`
        : '';

    const SYSTEM_PROMPT = `
You are a Smart Task Analysis Agent for a JIRA-like todo app.
Your job is to analyze a new task and generate INTELLIGENT follow-up questions
to make the task more actionable and complete.

TASK TO ANALYZE:
Title: "${taskTitle}"
Description: ${taskDescription || "None provided"}

CONTEXT (other tasks in this space):
${tasksContext}
${alreadyAskedStr}

FOLLOW-UP CATEGORIES (pick the most relevant):
1. "due_date" - When is this due? (CRITICAL if not set)
2. "priority" - How urgent/important? (Only if unclear from context)
3. "acceptance_criteria" - What defines "done"? (For complex tasks)
4. "context" - Background info, why this matters (For vague tasks)
5. "dependencies" - What needs to happen first? (For tasks that seem to depend on others)
6. "effort_estimate" - How long will this take? (For planning)
7. "clarification" - Ambiguous wording needs clarification

QUESTION GENERATION RULES:
1. **Be conversational, not robotic**
   - BAD: "Please specify the due date for this task."
   - GOOD: "When do you need this done by?"
   
2. **Be context-aware**
   - If task mentions "urgent" or "ASAP" → don't ask about priority
   - If task is clearly defined → don't ask for acceptance criteria
   - If it's a simple task like "Buy milk" → don't overcomplicate
   
3. **NO EMOJIS** - User hates emojis
   
4. **Provide examples when helpful**
   - For acceptance criteria: ["All tests pass", "PR approved", "Deployed to staging"]
   - For effort: ["30 minutes", "2 hours", "Half a day"]
   
5. **Limit questions** - Max 2 questions per interaction
   - Only ask "critical" if task is missing essential info
   - Only ask "recommended" for complex tasks

6. **Smart detection**:
   - "Merge X branch" → probably needs context about why, what after
   - "Testing X" → probably needs acceptance criteria
   - "Fix bug in X" → probably needs priority, steps to reproduce
   - "Review X" → probably needs deadline
   - Simple tasks like "Call John" → just need due date at most

COMPLETENESS SCORING:
- 90-100: Task is very clear and actionable
- 70-89: Task is good but could use 1 more detail
- 50-69: Task needs clarification to be actionable
- <50: Task is too vague

OUTPUT JSON:
{
    "questions": [
        {
            "category": "due_date" | "priority" | "acceptance_criteria" | "context" | "dependencies" | "effort_estimate" | "clarification",
            "question": "Conversational question",
            "importance": "critical" | "recommended" | "nice-to-have",
            "examples": ["example1", "example2"] // optional
        }
    ],
    "taskCompleteness": 0-100,
    "reasoning": "Brief explanation of what's missing"
}

EXAMPLES:

Task: "Buy milk"
→ completeness: 85, questions: [{ category: "due_date", question: "When do you need the milk?", importance: "recommended" }]

Task: "Merge lease web integration branch with dev"
→ completeness: 60, questions: [
    { category: "context", question: "Any specific changes I should note about this merge?", importance: "recommended" },
    { category: "dependencies", question: "Should anything else be done before the merge?", importance: "nice-to-have" }
]

Task: "Fix login bug"
→ completeness: 50, questions: [
    { category: "context", question: "What's the bug? How does it show up?", importance: "critical" },
    { category: "priority", question: "How urgent is this? Blocking users?", importance: "critical" }
]
`;

    const model = getGeminiModel();
    
    try {
        const result = await model.generateContent([
            { text: SYSTEM_PROMPT },
            { text: "Analyze this task and generate appropriate follow-up questions." }
        ]);

        const response = result.response;
        let jsonStr = response.text();
        jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsed = JSON.parse(jsonStr);
        
        // Filter out already asked categories
        if (alreadyAsked.length > 0) {
            parsed.questions = parsed.questions.filter(
                (q: FollowUpQuestion) => !alreadyAsked.includes(q.category)
            );
        }
        
        // Limit to 2 questions max
        parsed.questions = parsed.questions.slice(0, 2);
        
        return parsed;
    } catch (e) {
        console.error("FollowUp Agent Error:", e);
        // Default fallback - just ask about due date
        return {
            questions: [{
                category: "due_date",
                question: "When should this be done?",
                importance: "recommended"
            }],
            taskCompleteness: 70,
            reasoning: "Defaulting to basic question due to parsing error"
        };
    }
}

/**
 * Quick check if we should even ask follow-up questions
 * Returns false for simple, self-explanatory tasks
 */
export function shouldAskFollowUp(
    taskTitle: string,
    hasDueDate: boolean,
    hasPriority: boolean
): boolean {
    const simpleTaskPatterns = [
        /^(buy|get|pick up)\s+\w+$/i,  // "Buy milk", "Get groceries"
        /^call\s+\w+$/i,                // "Call John"
        /^email\s+\w+$/i,               // "Email Sarah"
        /^text\s+\w+$/i,                // "Text mom"
        /^remind\s+(me\s+)?(to\s+)?/i,  // "Remind me to..."
    ];
    
    // Don't ask follow-ups for simple tasks that already have due date
    if (hasDueDate && simpleTaskPatterns.some(p => p.test(taskTitle))) {
        return false;
    }
    
    return true;
}
