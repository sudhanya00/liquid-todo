/**
 * Speech-to-Text Service
 * 
 * Handles transcription of audio recordings.
 * Uses Web Speech API with Gemini fallback for processing.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface TranscriptionResult {
    transcript: string;
    confidence?: number;
    duration: number;
}

export interface TranscriptionError {
    code: "NO_SPEECH" | "AUDIO_ERROR" | "SERVICE_ERROR" | "UNKNOWN";
    message: string;
}

/**
 * Transcribe audio using Gemini's multimodal capabilities
 * Gemini 2.0 Flash supports audio input natively
 */
export async function transcribeWithGemini(
    audioBase64: string,
    mimeType: string
): Promise<TranscriptionResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Prepare audio part
    const audioPart = {
        inlineData: {
            mimeType,
            data: audioBase64,
        },
    };
    
    const prompt = `Please transcribe the following audio recording. 
Return ONLY the transcription text, nothing else. 
If the audio is unclear or contains no speech, return "[NO_SPEECH]".
Do not add any commentary, timestamps, or speaker labels.`;
    
    try {
        const result = await model.generateContent([prompt, audioPart]);
        const response = await result.response;
        const transcript = response.text().trim();
        
        if (transcript === "[NO_SPEECH]" || !transcript) {
            throw {
                code: "NO_SPEECH" as const,
                message: "No speech detected in the audio.",
            };
        }
        
        return {
            transcript,
            confidence: 0.9, // Gemini doesn't provide confidence scores
            duration: 0, // Duration should be provided by caller
        };
    } catch (error) {
        console.error("Gemini transcription error:", error);
        
        if ((error as TranscriptionError).code) {
            throw error;
        }
        
        throw {
            code: "SERVICE_ERROR" as const,
            message: "Failed to transcribe audio. Please try again.",
        };
    }
}

/**
 * Parse a voice log transcript into structured actions
 * This uses Gemini to understand natural language voice commands
 */
export async function parseVoiceLogActions(
    transcript: string,
    existingTasks: { id: string; title: string; status: string }[]
): Promise<VoiceLogAction[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("[Voice Log] GEMINI_API_KEY is not configured");
        throw new Error("GEMINI_API_KEY is not configured");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const taskList = existingTasks.length > 0 
        ? existingTasks.map(t => `- "${t.title}" (ID: ${t.id}, Status: ${t.status})`).join("\n")
        : "No existing tasks in this space yet.";
    
    const prompt = `You are an AI assistant parsing voice commands for a task management app called Smera.

USER'S VOICE INPUT: "${transcript}"

EXISTING TASKS IN THIS SPACE:
${taskList}

YOUR JOB: Convert the user's voice input into separate, individual actions.

ACTION TYPES:
1. **CREATE** - User mentions NEW work they need to do. DEFAULT ACTION for any task/work mentioned.
2. **UPDATE** - ONLY when user explicitly references an existing task BY NAME to modify it
3. **COMPLETE** - ONLY when user explicitly says an existing task BY NAME is done/finished

⚠️ CRITICAL RULES - READ CAREFULLY:

1. **EACH distinct piece of work = ONE CREATE action.** If user mentions multiple things, create MULTIPLE actions.
   Example: "I need to fix the login bug and also review the PR" → TWO CREATE actions

2. **CREATE is the default.** If user says:
   - "I need to...", "I have to...", "Create a task for...", "Add...", "Make a task..."
   - Describes ANY work that needs doing
   → Always CREATE a new task

3. **UPDATE/COMPLETE only for EXPLICIT references:**
   - User must mention an existing task by its exact or very similar name
   - "Mark the database migration as done" → COMPLETE (if "database migration" task exists)
   - "Set the auth task to high priority" → UPDATE (if "auth" task exists)

4. **NEVER merge unrelated tasks.** Two separate topics = two separate CREATE actions.

5. **Do NOT assume user wants to update.** A new description of work is ALWAYS a new task, even if vaguely related to existing tasks.

OUTPUT RULES:
- "high priority", "urgent", "important", "priority", "tonight", "today" → priority: "high"
- "low priority" → priority: "low"  
- Default priority is "medium"
- For dates: "tomorrow" = ${new Date(Date.now() + 86400000).toISOString().split("T")[0]}, "tonight"/"today" = ${new Date().toISOString().split("T")[0]}

OUTPUT FORMAT (JSON only, no markdown):
{
  "actions": [
    {
      "type": "CREATE",
      "task": {
        "title": "Clear, concise task title",
        "description": "Brief description if user provided context",
        "dueDate": null,
        "priority": "medium"
      }
    }
  ]
}

For UPDATE/COMPLETE, include taskId from the existing tasks list:
{
  "actions": [
    {
      "type": "COMPLETE",
      "taskId": "the-task-id-from-list-above"
    }
  ]
}

Return ONLY valid JSON:`;

    try {
        console.log("[Voice Log] Sending to Gemini for action parsing...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        
        console.log("[Voice Log] Raw Gemini response:", text);
        
        // Remove markdown code blocks if present
        text = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
        
        // Try to find JSON in the response if it's wrapped in other text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }
        
        console.log("[Voice Log] Cleaned JSON:", text);
        
        const parsed = JSON.parse(text);
        const actions = parsed.actions || [];
        
        console.log("[Voice Log] Parsed actions count:", actions.length);
        
        return actions;
    } catch (error) {
        console.error("[Voice Log] Failed to parse voice log:", error);
        console.error("[Voice Log] This may indicate a JSON parsing issue or API error");
        // Return empty array but log the error for debugging
        return [];
    }
}

/**
 * Supported action types from voice logs
 */
export interface VoiceLogAction {
    type: "CREATE" | "UPDATE" | "COMPLETE";
    task?: {
        title: string;
        description?: string;
        dueDate?: string | null;
        priority?: "low" | "medium" | "high";
    };
    taskId?: string;
    updates?: {
        status?: "todo" | "in-progress" | "done";
        priority?: "low" | "medium" | "high";
        note?: string;
    };
}
