import { getGeminiModel } from "@/lib/gemini";
import { generateFollowUpQuestions, shouldAskFollowUp, FollowUpQuestion } from "./followUpAgent";
import { Task } from "@/types";

interface CreatorResponse {
    newTask?: {
        title: string;
        dueDate: string | null;
        dueTime?: string;
        priority: "low" | "medium" | "high";
        description: string;
    };
    task?: {
        title: string;
        dueDate: string | null;
        dueTime?: string;
        priority: "low" | "medium" | "high";
        description: string;
    };
    missingInfo?: string;
    followUpQuestions?: FollowUpQuestion[];
    taskCompleteness?: number;
}

export async function handleCreateTask(
    text: string,
    tasksContext: string,
    currentDate: string,
    existingTasks?: Task[]
): Promise<CreatorResponse> {
    const SYSTEM_PROMPT = `
    You are the Creator Agent. Your job is to extract details for a NEW task.

    CONTEXT:
    1. Current Date: ${currentDate}
    2. Existing Tasks:
    ${tasksContext}

    RUBRIC:
    1. **Title**: Required. Extract a CONCISE, actionable title (max 5-7 words).
       - BAD: "Development of Agent 2 which will retrive data from vectorDB and convert it into DAX logic"
       - GOOD: "Development of Agent 2"
       - BAD: "Pull data from the landing zone (Azure blob) and process and save it to a vector DB"
       - GOOD: "Development of Agent 1"
       
       **Title Extraction Rules:**
       - If user mentions "development of X", title = "Development of X"
       - If user mentions "agent X", include "Agent X" in title
       - Remove implementation details from title (put in description instead)
       - Keep it short and scannable
       - PRESERVE the user's language - if they say "Complete X", title is "Complete X"
       
    2. **Due Date**: Parse if mentioned, otherwise null.
       - Look for explicit dates: "tomorrow", "next Friday", "in 2 days", "by EOD"
       - Look for relative references to other tasks
       - **If no date mentioned, set to null** - we'll ask a smart follow-up
       
    3. **Due Time**: Optional but IMPORTANT. Extract if mentioned:
       - Explicit times: "at 2pm", "by 3:30", "9am" → Format as 24-hour (e.g., "14:00", "09:00")
       - Relative times: "morning"→"09:00", "afternoon"→"14:00", "evening"→"18:00"
       
    4. **Priority**: Infer from context:
       - High: "urgent", "ASAP", "critical", "blocking", "important"
       - Low: "when you get a chance", "eventually", "someday"
       - Medium: Default if unclear
    
    5. **Description**: Extract implementation details and extra context.
       - Put technical details here (APIs, tools, steps)
       - If user gives context about WHY, put it here
       - Can be empty for simple tasks

    **CRITICAL: Always return the task, even without a due date.**
    Do NOT ask for missing info - the follow-up system will handle that separately.

    OUTPUT JSON:
    {
        "newTask": {
            "title": "string (CONCISE, max 7 words)",
            "dueDate": "ISO string or null",
            "dueTime": "HH:MM (optional)",
            "priority": "low" | "medium" | "high",
            "description": "string (can be empty)"
        }
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
        
        // If we have a task, check for mandatory fields
        if (parsed.newTask) {
            // MANDATORY: Always ask for due date if not provided
            if (!parsed.newTask.dueDate) {
                parsed.missingInfo = "When do you need this done by?";
                parsed.task = parsed.newTask; // Keep the task data for after follow-up
                return parsed;
            }
            
            // Optional: Ask smart follow-up questions for additional context
            if (existingTasks) {
                const shouldAsk = shouldAskFollowUp(
                    parsed.newTask.title,
                    !!parsed.newTask.dueDate,
                    parsed.newTask.priority !== "medium"
                );
                
                if (shouldAsk) {
                    const followUpAnalysis = await generateFollowUpQuestions(
                        parsed.newTask.title,
                        parsed.newTask.description || null,
                        existingTasks
                    );
                    
                    // Only include follow-ups if task is incomplete and has critical/recommended questions
                    const importantQuestions = followUpAnalysis.questions.filter(
                        q => q.importance === "critical" || q.importance === "recommended"
                    );
                    
                    if (followUpAnalysis.taskCompleteness < 80 && importantQuestions.length > 0) {
                        parsed.followUpQuestions = importantQuestions;
                        parsed.taskCompleteness = followUpAnalysis.taskCompleteness;
                        
                        // For critical questions, also set missingInfo with the first question
                        const criticalQ = importantQuestions.find(q => q.importance === "critical");
                        if (criticalQ) {
                            parsed.missingInfo = criticalQ.question;
                        }
                    }
                }
            }
        }
        
        return parsed;
    } catch (e) {
        console.error("Creator JSON Parse Error", e);
        return { missingInfo: "I couldn't understand the task details. Could you try again?" };
    }
}
