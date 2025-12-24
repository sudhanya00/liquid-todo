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
import { retryWithBackoff, parseAIResponse, AI_FALLBACKS, AIError, getUserFriendlyErrorMessage } from "@/lib/aiRetry";

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
  
  const prompt = `You are an expert task management AI assistant analyzing user intent for task operations.

## CONTEXT
${taskContext}

${conversationHistory?.length ? `## CONVERSATION HISTORY (last 5 messages)\n${conversationHistory.slice(-5).join("\n")}\n` : ""}

## USER INPUT
"${userInput}"

## OBJECTIVE
Classify the user's intent with HIGH accuracy. When in doubt, prefer CREATE over UPDATE/DELETE to avoid data loss.

## INTENT CLASSIFICATION (Critical - Read Carefully):

1. **CREATE** - User wants to add a NEW task (DEFAULT when uncertain)
   
   **When to use:**
   - User describes new work, goals, or deliverables
   - Action verbs without explicit reference to existing task: "fix", "build", "write", "review"
   - User says "I need to", "I have to", "reminder to", "don't forget to"
   
   **Key insight:** Task titles often contain completion words!
   - "Complete the API integration" → NEW task titled "Complete the API integration"
   - "Finish writing documentation" → NEW task titled "Finish writing documentation"
   - "Deploy to production" → NEW task titled "Deploy to production"
   
   **Correct examples:**
   - "Fix the login bug" → CREATE (new work)
   - "Review PR #42" → CREATE (new task, not updating existing PR task)
   - "Complete UAT testing by Friday" → CREATE (new task with deadline)
   - "Write unit tests for auth module" → CREATE (new work)
   - "Update dependencies" → CREATE (task title, not updating existing task)
   
   **Edge cases:**
   - Ambiguous input → Default to CREATE (safer)
   - Similar to existing task but not identical → CREATE (separate task)
   - User restates existing task → Ask for clarification (CLARIFY intent)

2. **UPDATE** - Modify an EXISTING task (REQUIRES explicit reference)
   
   **Strict requirements (ALL must be met):**
   - User explicitly references an existing task from the list above
   - User indicates they want to CHANGE something about that task
   - Action words: "change", "update", "set", "modify", "move", "reschedule"
   
   **Valid examples:**
   - "Change priority of [existing task name] to high" → UPDATE
   - "Move [existing task name] to tomorrow" → UPDATE (reschedule)
   - "Set [existing task name] priority to urgent" → UPDATE
   - "Update description of task 3" → UPDATE (references specific task)
   
   **Invalid (should be CREATE instead):**
   - "Update the documentation" → CREATE (no existing task reference)
   - "Change the API" → CREATE (no existing task reference)
   - "Fix the priority bug" → CREATE (describing new work)
   
   **Safety rule:** If uncertain whether task exists → CREATE instead

3. **COMPLETE** - Mark existing task as DONE (REQUIRES explicit reference)
   
   **Strict requirements (ALL must be met):**
   - User explicitly references an existing task from the list above
   - User indicates the ENTIRE TASK is finished/complete
   - Key phrases: "I finished", "I completed", "mark as done", "task is done", "wrapped up"
   
   **Valid examples:**
   - "I finished the login bug fix" → COMPLETE (existing task)
   - "Mark the API integration task as done" → COMPLETE
   - "Done with PR review" → COMPLETE (if "PR review" task exists)
   - "Completed task 2" → COMPLETE (if task 2 exists)
   
   **Invalid (should be CREATE or UPDATE instead):**
   - "Complete the deployment" → CREATE (no existing task, this is the task title)
   - "Completed setting up database" → CREATE (describes work to be done)
   - "I finished the setup" → CLARIFY (which setup task?)
   
   **Critical distinction:**
   - "I finished X" where X exists → COMPLETE
   - "Finish X" or "Complete X" where X doesn't exist → CREATE (task title)

4. **DELETE** - Remove a task (REQUIRES explicit reference)
   
   **Requirements:**
   - User explicitly references an existing task
   - Action words: "delete", "remove", "cancel", "discard", "get rid of"
   
   **Examples:**
   - "Delete the deployment task" → DELETE (if exists)
   - "Remove task 3" → DELETE
   - "Cancel the meeting reminder" → DELETE (if exists)
   
   **Safety:** If task doesn't clearly exist → CLARIFY

5. **QUERY** - User asking for information (READ-ONLY)
   
   **Indicators:**
   - Question words: "what", "which", "how many", "when", "who", "where"
   - Action words: "show", "list", "find", "search", "tell me"
   
   **Examples:**
   - "What tasks are overdue?" → QUERY
   - "How many high priority tasks?" → QUERY
   - "Show me all tasks for this week" → QUERY
   - "Which tasks are assigned to me?" → QUERY

6. **CLARIFY** - Need more information (USE SPARINGLY)
   
   **Only use when:**
   - Input is genuinely ambiguous (not just vague)
   - Cannot determine if referring to existing task or new task
   - Multiple interpretations are equally valid
   - Missing critical information that makes intent impossible to determine
   
   **Examples requiring clarification:**
   - "Update it" → CLARIFY (which task?)
   - "That's done" → CLARIFY (which task is done?)
   - "Change the deadline" → CLARIFY (which task's deadline?)
   
   **Don't over-use:** Prefer CREATE with vagueness assessment over CLARIFY

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

## ROBUSTNESS PRINCIPLES

**When in doubt:**
1. CREATE is safer than UPDATE/DELETE (prevents data loss)
2. High vagueness score + follow-up questions is better than CLARIFY
3. Specific noun/verb = more actionable, score lower
4. Urgency indicators = user knows what they want, trust them

**Common pitfalls to avoid:**
- Assuming "update" means UPDATE intent (could be task title)
- Confusing task content with task operation
- Over-using CLARIFY when CREATE with questions is better
- Marking vague tasks as low vagueness

## VAGUENESS ASSESSMENT (CRITICAL!)
Score how vague/unclear the task is from 0-100. This determines user flow.

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
    // Use retry logic with timeout protection
    const parsed = await retryWithBackoff<ClassificationResult>(
      async () => {
        const model = getGeminiModel();
        const genResult = await model.generateContent([{ text: prompt }]);
        
        const response = genResult.response;
        const text = response.text() || "";
        
        console.log("[Classifier] Raw LLM response:", text.substring(0, 200) + "...");
        
        // Parse with fallback
        const fallback: ClassificationResult = {
          ...AI_FALLBACKS.classification,
          followUpQuestions: [...AI_FALLBACKS.classification.followUpQuestions], // Convert readonly to mutable
          taskDetails: {
            ...AI_FALLBACKS.classification.taskDetails,
            title: extractTitle(userInput),
          },
        };
        
        const result = parseAIResponse<ClassificationResult>(text, fallback);
        
        // Validate we got a proper response
        if (!result.intent || !result.reasoning) {
          throw new Error("Invalid LLM response structure");
        }
        
        return result;
      },
      {
        maxRetries: 2, // 3 total attempts (initial + 2 retries)
        initialDelayMs: 1000,
        timeoutMs: 25000, // 25 seconds per attempt
      },
      "Intent Classification"
    );
    
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
    console.error("[Classifier] Error after retries:", error);
    
    // Provide user-friendly error message
    if (error instanceof AIError) {
      console.error("[Classifier] AI Error:", getUserFriendlyErrorMessage(error));
    }
    
    // Return safe fallback
    return {
      ...getDefaultCreateResult(userInput),
      reasoning: error instanceof AIError 
        ? getUserFriendlyErrorMessage(error)
        : "Classification failed, defaulting to create",
    };
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
