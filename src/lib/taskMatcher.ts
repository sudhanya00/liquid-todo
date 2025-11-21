import Fuse from 'fuse.js';
import { Task } from '@/types';

export interface TaskMatchResult {
    task: Task;
    taskId: string;
    confidence: number;
}

/**
 * Fuzzy match user input to existing tasks
 * Uses Fuse.js for fuzzy string matching with custom scoring
 */
export function findBestTaskMatch(
    userInput: string,
    tasks: Task[],
    minConfidence: number = 0.3
): TaskMatchResult | null {
    if (tasks.length === 0) return null;

    // Configure Fuse.js for fuzzy matching
    const fuse = new Fuse(tasks, {
        keys: [
            { name: 'title', weight: 0.7 },
            { name: 'description', weight: 0.3 }
        ],
        threshold: 0.6, // Lower = stricter matching
        includeScore: true,
        ignoreLocation: true,
    });

    const results = fuse.search(userInput);

    if (results.length === 0) return null;

    const bestMatch = results[0];

    // Convert Fuse score (0 = perfect, 1 = no match) to confidence (0-1)
    const confidence = 1 - (bestMatch.score || 1);

    if (confidence < minConfidence) return null;

    return {
        task: bestMatch.item,
        taskId: bestMatch.item.id,
        confidence
    };
}

/**
 * Extract keywords from user input for better matching
 */
export function extractKeywords(text: string): string[] {
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'for', 'of', 'in', 'on', 'at'];
    return text
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
}

/**
 * Score tasks by recency (more recent = higher score)
 */
export function scoreByRecency(tasks: Task[]): Map<string, number> {
    const scores = new Map<string, number>();
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

    tasks.forEach(task => {
        const age = now - task.updatedAt;
        const recencyScore = Math.max(0, 1 - (age / maxAge));
        scores.set(task.id, recencyScore);
    });

    return scores;
}
