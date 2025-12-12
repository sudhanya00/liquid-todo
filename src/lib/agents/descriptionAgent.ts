import { getGeminiModel } from "@/lib/gemini";
import { Task } from "@/types";

export async function generatePolishedDescription(task: Task): Promise<string> {
    const timelineText = task.updates && task.updates.length > 0
        ? task.updates.map(u => `- [${new Date(u.timestamp).toLocaleDateString()}] ${u.content} (${u.type})`).join('\n')
        : "No activity yet.";

    const prompt = `
    You are a Technical Documentation Expert. Your goal is to maintain a "living document" description for a task.
    
    Current Task Context:
    Title: ${task.title}
    Status: ${task.status}
    Priority: ${task.priority}
    Due Date: ${task.dueDate || 'Not set'}
    
    Activity History (Newest First):
    ${timelineText}
    
    Your Goal:
    Generate a concise, high-level summary of what this task is about and its current state. 
    
    CRITICAL RULES:
    1. DO NOT include a "Current Status" section (e.g. "Status: Todo", "Priority: Medium"). This is already visible in the UI.
    2. DO NOT include a "Progress Log" or "History" section. The timeline is already visible in the UI.
    3. DO NOT use emojis.
    4. Output PURE MARKDOWN.
    5. DO NOT indent your output. Start lines at the beginning of the string.
    
    Structure your response as a cohesive narrative. 
    - Start with a clear statement of the task's objective.
    - If there are important notes or context from the history, weave them into the narrative or add a "Context" or "Key Notes" section.
    - Keep it professional and objective.
    `;

    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
}
