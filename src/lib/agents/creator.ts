import { getGeminiModel } from "@/lib/gemini";

interface CreatorResponse {
    newTask?: {
        title: string;
        dueDate: string | null;
        dueTime?: string;
        priority: "low" | "medium" | "high";
        description: string;
    };
    missingInfo?: string;
}

export async function handleCreateTask(
    text: string,
    tasksContext: string,
    currentDate: string
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
       
    2. **Due Date**: Required. 
       - First, check if the user mentions another task (e.g., "with milk", "same as the report", "one week after agent 1").
       - If YES, look up that task in "Existing Tasks" and calculate relative to its Due Date.
       - If NO, look for explicit dates (e.g., "tomorrow", "next Friday", "next week").
       - **CRITICAL**: If NO explicit date and NO context found, you MUST return "missingInfo". Do NOT default to today. Do NOT guess.
       
    3. **Due Time**: Optional but IMPORTANT. Extract if mentioned:
       - Explicit times: "at 2pm", "by 3:30", "9am" → Format as 24-hour (e.g., "14:00", "09:00")
       - Relative times:
         * "morning" → "09:00"
         * "afternoon" → "14:00"
         * "evening" → "18:00"
         * "night" → "21:00"
       - If user says "evening" or similar, DO NOT leave empty. Use the appropriate default time.
       
    4. **Priority**: Infer (Low/Medium/High). Default to Medium if unspecified.
    
    5. **Description**: Extract implementation details and extra context.
       - Put ALL technical details here (Azure blob, vectorDB, DAX, etc.)
       - This is where the "how" goes, not the "what"

    PHRASING GUIDELINES:
    - If you need to ask a question (missingInfo), be conversational and brief.
    - BAD: "When is the due date of this task?"
    - GOOD: "When should I remind you?" or "What's the deadline?"

    OUTPUT JSON:
    {
        "newTask": {
            "title": "string (CONCISE, max 7 words)",
            "dueDate": "ISO string or null",
            "dueTime": "HH:MM (optional)",
            "priority": "low" | "medium" | "high",
            "description": "string (detailed implementation notes)"
        },
        "missingInfo": "string or null"
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
        console.error("Creator JSON Parse Error", e);
        return { missingInfo: "I couldn't understand the task details. Could you try again?" };
    }
}
