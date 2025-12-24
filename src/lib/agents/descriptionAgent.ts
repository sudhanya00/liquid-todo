import { getGeminiModel } from "@/lib/gemini";
import { Task } from "@/types";
import { retryWithBackoff, AIError, getUserFriendlyErrorMessage } from "@/lib/aiRetry";

export async function generatePolishedDescription(task: Task): Promise<string> {
    const hasActivity = task.updates && task.updates.length > 0;
    
    const timelineText = hasActivity
        ? task.updates!.map(u => `- [${new Date(u.timestamp).toLocaleDateString()}] ${u.content} (${u.type})`).join('\n')
        : "";

    // Different prompts for new tasks vs tasks with history
    const prompt = hasActivity 
        ? `You are a Technical Documentation Expert. Maintain a "living document" description for this task.

TASK INFORMATION:
- Title: ${task.title}
- Status: ${task.status}
- Priority: ${task.priority}
- Due Date: ${task.dueDate || 'Not set'}

ACTIVITY HISTORY:
${timelineText}

INSTRUCTIONS:
Generate a concise, high-level summary of what this task is about and its current state.

CRITICAL RULES:
1. DO NOT include a "Status" or "Priority" section - already visible in UI
2. DO NOT include a "Progress Log" or "History" section - timeline visible in UI
3. DO NOT use emojis
4. Output PURE MARKDOWN
5. Keep it professional and objective

Structure as a cohesive narrative:
- Clear statement of the task's objective
- Important context from activity history woven in
- Use "## Key Notes" section if there's important information`
        : `Write ONE sentence describing this task. Be extremely brief.

Task: ${task.title}
${task.description ? `Context: ${task.description}` : ''}

RULES:
- ONE sentence only, max 15 words
- No headers, no markdown formatting
- No emojis
- Just describe what needs to be done
- Do NOT add details not in the title

Example:
- Title: "Fix login bug" → "Investigate and resolve the authentication issue preventing users from logging in."
- Title: "Review PR #42" → "Review and approve the pull request for the new feature."`;

    try {
        return await retryWithBackoff<string>(
            async () => {
                const model = getGeminiModel();
                const result = await model.generateContent(prompt);
                const response = result.response;
                const text = response.text();
                
                if (!text || text.trim().length === 0) {
                    throw new Error("Empty response from AI");
                }
                
                return text;
            },
            {
                maxRetries: 2,
                initialDelayMs: 1000,
                timeoutMs: 20000, // 20 seconds
            },
            "Description Generation"
        );
    } catch (error) {
        console.error("[Description Agent] Error:", error);
        
        if (error instanceof AIError) {
            console.error("[Description Agent] AI Error:", getUserFriendlyErrorMessage(error));
        }
        
        // Return a simple fallback description
        return `Task: ${task.title}`;
    }
}

