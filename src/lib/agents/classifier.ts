/**
 * Context-Aware Intent Classifier
 * 
 * Uses LLM to intelligently classify user intent based on:
 * - User's natural language input
 * - Full space context (all tasks, their states, recent activity)
 * - Conversation history
 * 
 * This replaces fuzzy matching with true semantic understanding.
 */

import { getGeminiModel } from "@/lib/gemini";
import { Task } from "@/types";

export type IntentType = "create" | "update" | "complete" | "delete" | "query" | "clarify";

export interface ClassificationResult {
  intent: IntentType;
  confidence: number;
  reasoning: string;
  
  // For CREATE intent
  taskDetails?: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    tags?: string[];
  };
  
  // Vagueness assessment (0-100, higher = more vague)
  vaguenessScore?: number;
  vagueReason?: string;
  
  // For UPDATE/COMPLETE/DELETE intents
  targetTask?: {
    id: string;
    title: string;
    matchReason: string;
  };
  updates?: {
    title?: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    status?: "todo" | "in-progress" | "done";
    tags?: string[];
  };
  
  // For QUERY intent
  queryType?: "status" | "list" | "search" | "summary";
  
  // For CLARIFY intent - when AI needs more info
  clarifyingQuestion?: string;
  missingInfo?: string[];
  
  // Smart follow-up questions to ask user
  followUpQuestions?: string[];
}

export interface SpaceContext {
  spaceId: string;
  spaceName: string;
  tasks: Task[];
  recentActivity?: {
    lastCreatedTask?: Task;
    lastUpdatedTask?: Task;
    lastCompletedTask?: Task;
  };
}

function buildTaskContext(context: SpaceContext): string {
  const { tasks, spaceName, recentActivity } = context;
  
  if (tasks.length === 0) {
    return `Space "${spaceName}" has no tasks yet.`;
  }
  
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === "todo"),
    inProgress: tasks.filter(t => t.status === "in-progress"),
    done: tasks.filter(t => t.status === "done"),
  };
  
  let contextStr = `Space: "${spaceName}"\n`;
  contextStr += `Total tasks: ${tasks.length} (${tasksByStatus.todo.length} todo, ${tasksByStatus.inProgress.length} in-progress, ${tasksByStatus.done.length} done)\n\n`;
  
  contextStr += "=== ALL TASKS ===\n";
  tasks.forEach((task, i) => {
    const dueStr = task.dueDate ? ` | Due: ${task.dueDate}` : "";
    const priorityStr = task.priority ? ` | Priority: ${task.priority}` : "";
    contextStr += `${i + 1}. [${task.status.toUpperCase()}] "${task.title}" (ID: ${task.id})${priorityStr}${dueStr}\n`;
    if (task.description) {
      contextStr += `   Description: ${task.description.substring(0, 100)}${task.description.length > 100 ? "..." : ""}\n`;
    }
  });
  
  if (recentActivity) {
    contextStr += "\n=== RECENT ACTIVITY ===\n";
    if (recentActivity.lastCreatedTask) {
      contextStr += `Last created: "${recentActivity.lastCreatedTask.title}"\n`;
    }
    if (recentActivity.lastUpdatedTask) {
      contextStr += `Last updated: "${recentActivity.lastUpdatedTask.title}"\n`;
    }
    if (recentActivity.lastCompletedTask) {
      contextStr += `Last completed: "${recentActivity.lastCompletedTask.title}"\n`;
    }
  }
  
  return contextStr;
}

export async function classifyIntent(
  userInput: string,
  context: SpaceContext,
  conversationHistory?: string[]
): Promise<ClassificationResult> {
  const taskContext = buildTaskContext(context);
  
  const prompt = `You are an intelligent task management assistant. Your job is to understand user intent and classify their request accurately.

## CURRENT CONTEXT
${taskContext}

${conversationHistory?.length ? `## RECENT CONVERSATION\n${conversationHistory.slice(-5).join("\n")}\n` : ""}

## USER INPUT
"${userInput}"

## YOUR TASK
Analyze the user's input and determine their intent. Be VERY careful about distinguishing between:

1. **CREATE** - User wants to add a NEW task
   - Look for: new items, things to do, tasks to add
   - Examples: "I need to fix the login bug", "Add a task for code review", "Complete UAT deployment testing" (this is a NEW task about completing UAT, not marking something complete!)
   - IMPORTANT: Just because a sentence contains "complete", "finish", "done" doesn't mean UPDATE. It could be the task title!
   - "Complete the API integration" = CREATE a task called "Complete the API integration"
   - "Mark the API integration as complete" = UPDATE an existing task

2. **UPDATE** - User wants to modify an EXISTING task
   - ONLY if they explicitly reference an existing task by name or context
   - Look for: "change", "update", "set", "modify" + reference to existing task
   - Examples: "Change the priority of the login bug to high", "Update the description of task 3"
   - User MUST clearly reference one of the existing tasks listed above

3. **COMPLETE** - User wants to mark an EXISTING task as done
   - ONLY if they explicitly say they finished/completed/done with a SPECIFIC existing task
   - Look for: "I finished", "mark as done", "completed the", "done with" + existing task reference
   - Examples: "I finished the login bug", "Mark the API task as done"
   - The referenced task MUST exist in the task list above

4. **DELETE** - User wants to remove a task
   - Look for: "delete", "remove", "cancel" + existing task reference

5. **QUERY** - User is asking a question about tasks
   - Look for: "what", "how many", "show me", "list", questions

6. **CLARIFY** - You need more information to understand the intent
   - Use this when the request is genuinely ambiguous

## SMART FOLLOW-UP QUESTIONS (VERY IMPORTANT!)
Generate 2-3 specific, contextual questions to make vague tasks actionable. Be direct and specific:

**For vague technical tasks:**
- "Deploy" → "Deploy what service/app to which environment (staging/production)?"
- "Fix bug" → "Which bug specifically? Can you describe the issue or provide an error message?"
- "Update" → "Update what exactly? What changes need to be made?"
- "Refactor" → "Which part of the codebase? What's the goal of the refactoring?"

**For incomplete tasks:**
- Missing WHAT: "What specifically needs to be [action]?"
- Missing WHERE: "Where should this be done? (which repo/service/environment)"
- Missing WHO: "Who else needs to be involved or informed?"
- Missing WHY: "What's the context or reason for this task?"

**For time-sensitive tasks:**
- "Is this blocking anything else?"
- "What's the deadline for this?"

DO NOT ask generic questions. Be SPECIFIC to what the user said.
Examples:
- User: "Deploy by friday" → Ask: "Deploy which service to which environment?"
- User: "Fix the bug" → Ask: "Which bug? Can you describe the symptoms or error?"
- User: "Update the docs" → Ask: "Which documentation needs updating and what changes?"
- User: "Review PR" → Ask: "Which PR number or branch name?"

## PRIORITY DETECTION
ALWAYS infer priority from the user's language:
- **HIGH priority**: "urgent", "ASAP", "critical", "important", "blocking", "emergency", "immediately", "right now", "today"
- **LOW priority**: "eventually", "someday", "when you get a chance", "no rush", "low priority", "backlog", "nice to have"
- **MEDIUM priority**: Default if no urgency indicators

## DATE PARSING
For due dates, convert to YYYY-MM-DD format:
- "friday" or "by friday" → Next Friday's date
- "tomorrow" → Tomorrow's date
- "next week" → 7 days from today
- "December 20" → 2025-12-20
- Today is ${new Date().toISOString().split('T')[0]}

## VAGUENESS ASSESSMENT (CRITICAL!)
Score how vague/unclear the task is from 0-100:

**Score 0-30 (Clear/Actionable) - CREATE IMMEDIATELY:**
- Specific target identified: "Fix the login button on /auth page"
- Clear deliverable: "Write unit tests for UserService class"
- Identifiable reference: "Review PR #423", "Update README.md"
- Has urgency + general target: "URGENT: Fix the security vulnerability" (user knows what's urgent)
- Has scope indicator: "Refactor the utils folder", "Fix the authentication bug"

**Score 31-60 (Somewhat Vague but Workable) - CREATE WITH DATE QUESTION:**
- Missing deadline only: "Write integration tests for payment module"
- General but understandable: "Update the documentation"
- Has partial context: "Fix the API bug" (which API might be unclear)

**Score 61-100 (Very Vague/Unactionable) - ASK CONTEXTUAL QUESTIONS:**
- Single word with no context: "Deploy", "Fix", "Update"
- No clear target at all: "Fix stuff", "Do the thing"
- Ambiguous action: "Handle it", "Deal with the issue"
- Missing WHAT entirely: "Send it", "Check it"

IMPORTANT: If user provides ANY of these, score LOWER (more actionable):
- Urgency keywords (URGENT, ASAP, critical) → They know it's important, trust them
- A deadline (by friday, tomorrow) → They've thought about timing
- A specific noun (the vulnerability, the utils folder, the report) → They have a target

Ask yourself: "Does the user know WHAT they want to do?"
- YES, clear target → 0-30 (create immediately with date question if needed)
- SOMEWHAT, general area → 31-60 (ask for date, store context questions as suggestions)
- NO, too vague to even start → 61-100 (ask combined contextual question)

## RESPONSE FORMAT
Respond with ONLY a JSON object:
{
  "intent": "create" | "update" | "complete" | "delete" | "query" | "clarify",
  "confidence": 0-100,
  "reasoning": "Brief explanation of why you chose this intent",
  
  // For CREATE:
  "taskDetails": {
    "title": "SHORT, action-oriented title (3-7 words max!)",
    "description": "Put ALL additional context, details, recipients, specifics here - NOT in title",
    "priority": "low" | "medium" | "high",
    "dueDate": "YYYY-MM-DD" | null,
    "tags": ["tag1", "tag2"] | null
  },
  
  // ALWAYS include for CREATE - vagueness assessment:
  "vaguenessScore": 0-100,
  "vagueReason": "Why this score - what's missing or unclear",
  
  // For UPDATE/COMPLETE/DELETE (only if task clearly exists):
  "targetTask": {
    "id": "exact task ID from the list above",
    "title": "exact task title",
    "matchReason": "Why you matched this task"
  },
  "updates": {
    "status": "done" (for complete),
    "priority": "high" (for priority changes),
    // ... other fields being updated
  },
  
  // For CLARIFY:
  "clarifyingQuestion": "What you need to ask the user",
  "missingInfo": ["list", "of", "missing", "pieces"],
  
  // ALWAYS include smart follow-ups for CREATE/UPDATE:
  "followUpQuestions": [
    "Contextual question 1?",
    "Contextual question 2?"
  ]
}

## TITLE vs DESCRIPTION RULES (CRITICAL!)
**Title should be:**
- SHORT: 3-7 words maximum
- Action-oriented: Start with a verb (Send, Fix, Review, Create, Update, Deploy)
- Generic enough to scan quickly in a list

**Description should contain:**
- WHO: Recipients, stakeholders, team members
- WHAT specifically: Details about the deliverable
- WHERE: Repos, environments, locations
- HOW: Format, method, approach
- WHY: Context, reasoning, background

**Examples:**
- Input: "Send the report: promptu report to kuhuk about promptu's architecture"
  - Title: "Send Promptu architecture report"
  - Description: "Send to Kuhuk. Report covers Promptu's architecture details."

- Input: "Deploy: payment service to production by friday"
  - Title: "Deploy payment service"
  - Description: "Deploy to production environment."

- Input: "Fix the login bug on the auth page that shows 500 error"
  - Title: "Fix login page 500 error"
  - Description: "Bug on /auth page causing 500 errors during login."

IMPORTANT RULES:
1. Default to CREATE if unsure - it's safer to create a new task than modify the wrong one
2. For UPDATE/COMPLETE/DELETE, the target task MUST exist in the task list above
3. If no matching task exists, classify as CREATE instead
4. Be generous with follow-up questions - they help create better tasks
5. Consider the context: if user just created a task about "testing", a new input about "UAT testing" is likely a DIFFERENT new task
6. ALWAYS set priority based on urgency keywords - never leave it null if you can infer it`;

  try {
    const model = getGeminiModel();
    const genResult = await model.generateContent([
      { text: prompt }
    ]);
    
    const response = genResult.response;
    const text = response.text() || "";
    
    console.log("[Classifier] Raw LLM response:", text);
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Classifier] No JSON found in response");
      return getDefaultCreateResult(userInput);
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as ClassificationResult;
    
    console.log("[Classifier] Parsed result:", {
      intent: parsed.intent,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      targetTask: parsed.targetTask?.title,
      taskDetails: parsed.taskDetails?.title,
    });
    
    // Normalize intent to lowercase
    parsed.intent = parsed.intent.toLowerCase() as IntentType;
    
    // Validate UPDATE/COMPLETE/DELETE has valid target
    if (["update", "complete", "delete"].includes(parsed.intent)) {
      if (!parsed.targetTask?.id) {
        console.log("[Classifier] No target task for update intent, switching to CREATE");
        return {
          ...getDefaultCreateResult(userInput),
          reasoning: "No matching existing task found, creating new task instead",
          taskDetails: {
            title: extractTitle(userInput),
            ...parsed.taskDetails,
          },
        };
      }
      
      // Verify the task actually exists
      const taskExists = context.tasks.some(t => t.id === parsed.targetTask?.id);
      if (!taskExists) {
        console.log("[Classifier] Target task doesn't exist, switching to CREATE");
        return {
          ...getDefaultCreateResult(userInput),
          reasoning: "Referenced task not found, creating new task instead",
          taskDetails: {
            title: extractTitle(userInput),
          },
        };
      }
    }
    
    // Post-process: Infer priority if not set
    if (parsed.taskDetails) {
      console.log("[Classifier] Priority before infer:", parsed.taskDetails.priority);
      if (!parsed.taskDetails.priority) {
        const inferredPriority = inferPriority(userInput);
        console.log("[Classifier] Inferred priority:", inferredPriority);
        parsed.taskDetails.priority = inferredPriority;
      }
      console.log("[Classifier] Final priority:", parsed.taskDetails.priority);
    }
    
    return parsed;
    
  } catch (error) {
    console.error("[Classifier] Error:", error);
    return getDefaultCreateResult(userInput);
  }
}

function inferPriority(input: string): "low" | "medium" | "high" {
  const lower = input.toLowerCase();
  
  // High priority keywords
  const highKeywords = ["urgent", "asap", "critical", "important", "blocking", "emergency", "immediately", "right now", "today", "eod", "end of day"];
  if (highKeywords.some(kw => lower.includes(kw))) {
    return "high";
  }
  
  // Low priority keywords
  const lowKeywords = ["eventually", "someday", "when you get a chance", "no rush", "low priority", "backlog", "nice to have", "whenever", "not urgent"];
  if (lowKeywords.some(kw => lower.includes(kw))) {
    return "low";
  }
  
  return "medium";
}

function getDefaultCreateResult(userInput: string): ClassificationResult {
  return {
    intent: "create",
    confidence: 70,
    reasoning: "Defaulting to create due to classification error",
    taskDetails: {
      title: extractTitle(userInput),
      priority: inferPriority(userInput),
    },
    followUpQuestions: [
      "When do you need this done by?",
      "How urgent is this task?",
    ],
  };
}

function extractTitle(input: string): string {
  // Clean up the input to make a reasonable title
  let title = input.trim();
  
  // Remove common prefixes
  const prefixes = [
    /^(I need to|I want to|I have to|I should|I must|Please|Can you|Could you)\s+/i,
    /^(Create|Add|Make|Start|Begin)\s+(a\s+)?(task|item)?\s*(for|about|to|called)?\s*/i,
  ];
  
  for (const prefix of prefixes) {
    title = title.replace(prefix, "");
  }
  
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Truncate if too long
  if (title.length > 100) {
    title = title.substring(0, 97) + "...";
  }
  
  return title;
}

// Helper to generate follow-up questions based on task context
export function generateSmartFollowUps(
  taskDetails: ClassificationResult["taskDetails"],
  existingTasks: Task[]
): string[] {
  const questions: string[] = [];
  
  if (!taskDetails) return questions;
  
  const title = taskDetails.title.toLowerCase();
  
  // Timeline questions
  if (!taskDetails.dueDate) {
    if (title.includes("urgent") || title.includes("asap") || title.includes("critical")) {
      questions.push("This seems urgent - should I set it for today or tomorrow?");
    } else {
      questions.push("When do you need this completed by?");
    }
  }
  
  // Priority questions
  if (!taskDetails.priority) {
    const hasSimilarTasks = existingTasks.some(t => 
      t.status !== "done" && t.priority === "high"
    );
    if (hasSimilarTasks) {
      questions.push("You have other high-priority tasks. How does this compare in urgency?");
    }
  }
  
  // Context-specific questions
  if (title.includes("bug") || title.includes("fix") || title.includes("error")) {
    questions.push("What's the impact of this bug? Is it blocking anything?");
  }
  
  if (title.includes("meeting") || title.includes("call") || title.includes("sync")) {
    questions.push("Who should be involved in this?");
  }
  
  if (title.includes("review") || title.includes("pr") || title.includes("code")) {
    questions.push("Is there a specific PR or branch this relates to?");
  }
  
  if (title.includes("deploy") || title.includes("release") || title.includes("prod")) {
    questions.push("Are there any dependencies or blockers for this deployment?");
  }
  
  if (title.includes("test") || title.includes("qa") || title.includes("sanity")) {
    questions.push("What specific areas need to be tested?");
  }
  
  if (title.includes("merge") || title.includes("branch")) {
    questions.push("Are there any conflicts or dependent branches?");
  }
  
  // Scope questions for vague tasks
  if (title.split(" ").length <= 3) {
    questions.push("Can you provide more details about what this involves?");
  }
  
  // Limit to 2-3 most relevant questions
  return questions.slice(0, 3);
}
