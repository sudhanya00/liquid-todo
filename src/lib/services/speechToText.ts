/**
 * Speech-to-Text Service
 * 
 * Handles transcription of audio recordings.
 * Uses Web Speech API with Gemini fallback for processing.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { retryWithBackoff, parseAIResponse, AIError, getUserFriendlyErrorMessage } from "@/lib/aiRetry";

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
    
    try {
        // Use retry logic with timeout protection
        return await retryWithBackoff<TranscriptionResult>(
            async () => {
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
            },
            {
                maxRetries: 2, // 3 total attempts
                initialDelayMs: 1000,
                timeoutMs: 45000, // 45 seconds (audio processing takes longer)
            },
            "Audio Transcription"
        );
    } catch (error) {
        console.error("Gemini transcription error:", error);
        
        // Handle NO_SPEECH separately
        if ((error as TranscriptionError).code === "NO_SPEECH") {
            throw error;
        }
        
        // Handle AIError
        if (error instanceof AIError) {
            throw {
                code: "SERVICE_ERROR" as const,
                message: getUserFriendlyErrorMessage(error),
            };
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
    
    try {
        // Use retry logic with timeout protection
        return await retryWithBackoff<VoiceLogAction[]>(
            async () => {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                
                const taskList = existingTasks.length > 0 
                    ? existingTasks.map(t => `- "${t.title}" (ID: ${t.id}, Status: ${t.status})`).join("\n")
                    : "No existing tasks in this space yet.";
                
                const prompt = `You are an expert voice command parser for Smera task management.

## USER'S VOICE INPUT
"${transcript}"

## EXISTING TASKS
${taskList}

## YOUR OBJECTIVE
Parse the voice input into discrete task actions. Voice input often contains multiple tasks - split them properly.

## ACTION TYPES

**1. CREATE** (Default for any new work mentioned)
- User describes work to be done
- New tasks, reminders, to-dos
- DEFAULT when uncertain

**2. UPDATE** (Requires explicit task reference)
- User references existing task by name
- Wants to modify task properties
- Must clearly identify which task

**3. COMPLETE** (Requires explicit task reference)
- User says they finished an existing task
- References task by name + completion indicator

## PARSING RULES (Critical):

### Rule 1: ONE action per distinct work item
**Each separate task/work = separate CREATE action**

**Examples:**
- "Fix the login bug and review PR 42" → TWO CREATE actions
- "Write tests, update docs, and deploy" → THREE CREATE actions
- "Call John about the project" → ONE CREATE action

### Rule 2: CREATE is the default
**Always CREATE unless explicitly updating/completing existing task**

**Phrases indicating CREATE:**
- "I need to...", "I have to...", "Don't forget to..."
- "Remind me to...", "Add task for..."
- "I should...", "Make sure to..."
- Any description of work to be done

### Rule 3: UPDATE/COMPLETE requires explicit reference
**Must reference existing task from the list above**

**COMPLETE examples:**
- "I finished [existing task name]" → COMPLETE
- "[existing task name] is done" → COMPLETE
- "Completed [existing task name]" → COMPLETE

**UPDATE examples:**
- "Change [existing task name] to high priority" → UPDATE
- "Move [existing task name] to tomorrow" → UPDATE

**NOT UPDATE/COMPLETE:**
- "Complete the deployment" → CREATE (task title, no reference)
- "Update the API" → CREATE (describes work, no reference)

### Rule 4: Never merge unrelated tasks
**Different topics = different actions**

### Rule 5: Voice patterns to handle
**Natural speech needs special handling:**
- Filler words ("um", "uh", "like") → Ignore
- Run-on sentences → Split into separate actions
- Incomplete thoughts → Best-effort interpretation
- Ambiguous references → Default to CREATE

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

                console.log("[Voice Log] Sending to Gemini for action parsing...");
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().trim();
                
                console.log("[Voice Log] Raw Gemini response:", text.substring(0, 200) + "...");
                
                // Parse with fallback
                const fallback = { actions: [] };
                const parsed = parseAIResponse<{ actions: VoiceLogAction[] }>(text, fallback);
                
                const actions = parsed.actions || [];
                
                // Validate we got at least something
                if (actions.length === 0) {
                    console.warn("[Voice Log] No actions parsed, returning empty array");
                }
                
                console.log("[Voice Log] Parsed actions count:", actions.length);
                
                return actions;
            },
            {
                maxRetries: 2, // 3 total attempts
                initialDelayMs: 1000,
                timeoutMs: 30000, // 30 seconds
            },
            "Voice Log Action Parsing"
        );
    } catch (error) {
        console.error("[Voice Log] Failed to parse voice log:", error);
        
        if (error instanceof AIError) {
            console.error("[Voice Log] AI Error:", getUserFriendlyErrorMessage(error));
        }
        
        // Return empty array rather than failing completely
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
