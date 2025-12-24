/**
 * AI Retry and Timeout Utilities
 * 
 * Provides robust error handling for LLM API calls:
 * - Exponential backoff retry logic
 * - Timeout protection
 * - Quota/rate limit handling
 * - Fallback responses
 * - Error classification
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  backoffMultiplier?: number;
}

export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 30000, // 30 seconds
  backoffMultiplier: 2,
};

export type AIErrorType = 
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "QUOTA_EXCEEDED"
  | "INVALID_API_KEY"
  | "SERVICE_UNAVAILABLE"
  | "INVALID_REQUEST"
  | "UNKNOWN";

export class AIError extends Error {
  constructor(
    public type: AIErrorType,
    message: string,
    public retryable: boolean = false,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "AIError";
  }
}

/**
 * Classify error from Gemini API
 */
function classifyError(error: unknown): AIError {
  if (error instanceof AIError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Timeout errors
  if (errorString.includes("timeout") || errorString.includes("timed out")) {
    return new AIError(
      "TIMEOUT",
      "AI request timed out. Please try again.",
      true,
      error
    );
  }

  // Rate limiting
  if (
    errorString.includes("rate limit") ||
    errorString.includes("too many requests") ||
    errorString.includes("429")
  ) {
    return new AIError(
      "RATE_LIMIT",
      "AI service rate limit reached. Please wait a moment and try again.",
      true,
      error
    );
  }

  // Quota exceeded
  if (
    errorString.includes("quota") ||
    errorString.includes("exceeded") ||
    errorString.includes("limit reached")
  ) {
    return new AIError(
      "QUOTA_EXCEEDED",
      "AI service quota exceeded. Please try again later.",
      false,
      error
    );
  }

  // Invalid API key
  if (
    errorString.includes("api key") ||
    errorString.includes("authentication") ||
    errorString.includes("unauthorized") ||
    errorString.includes("401")
  ) {
    return new AIError(
      "INVALID_API_KEY",
      "AI service authentication failed. Please contact support.",
      false,
      error
    );
  }

  // Service unavailable
  if (
    errorString.includes("503") ||
    errorString.includes("service unavailable") ||
    errorString.includes("temporarily unavailable") ||
    errorString.includes("connection") ||
    errorString.includes("network")
  ) {
    return new AIError(
      "SERVICE_UNAVAILABLE",
      "AI service is temporarily unavailable. Please try again.",
      true,
      error
    );
  }

  // Invalid request
  if (
    errorString.includes("400") ||
    errorString.includes("bad request") ||
    errorString.includes("invalid")
  ) {
    return new AIError(
      "INVALID_REQUEST",
      "Invalid AI request. Please try rephrasing your input.",
      false,
      error
    );
  }

  // Unknown error
  return new AIError(
    "UNKNOWN",
    "An unexpected error occurred. Please try again.",
    true,
    error
  );
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(
  attempt: number,
  config: Required<RetryConfig>
): number {
  const delay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );
  
  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Wrap a promise with timeout
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new AIError(
              "TIMEOUT",
              `${operation} timed out after ${timeoutMs}ms`,
              true
            )
          ),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Retry an AI operation with exponential backoff
 * 
 * @param operation - The async function to retry
 * @param config - Retry configuration
 * @param operationName - Name for logging
 * @returns The result of the operation
 * @throws AIError if all retries fail
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {},
  operationName: string = "AI operation"
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: AIError | undefined;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      console.log(
        `[AI Retry] ${operationName} - Attempt ${attempt + 1}/${
          fullConfig.maxRetries + 1
        }`
      );

      // Wrap operation with timeout
      const result = await withTimeout(
        operation(),
        fullConfig.timeoutMs,
        operationName
      );

      // Success!
      if (attempt > 0) {
        console.log(
          `[AI Retry] ${operationName} - Succeeded after ${attempt + 1} attempts`
        );
      }
      return result;
    } catch (error) {
      lastError = classifyError(error);

      console.error(
        `[AI Retry] ${operationName} - Attempt ${attempt + 1} failed:`,
        lastError.type,
        lastError.message
      );

      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        console.error(
          `[AI Retry] ${operationName} - Error not retryable, aborting`
        );
        throw lastError;
      }

      // Don't retry if we've exhausted retries
      if (attempt >= fullConfig.maxRetries) {
        console.error(
          `[AI Retry] ${operationName} - Max retries exhausted, aborting`
        );
        throw lastError;
      }

      // Calculate backoff delay
      const delay = calculateBackoffDelay(attempt, fullConfig);
      console.log(
        `[AI Retry] ${operationName} - Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new AIError("UNKNOWN", "Retry failed");
}

/**
 * Parse JSON response from LLM with fallback
 * 
 * @param text - Raw LLM response text
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed JSON or fallback
 */
export function parseAIResponse<T>(text: string, fallback: T): T {
  try {
    // Clean up response - remove markdown code blocks
    let cleaned = text
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    // Try to extract JSON from response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);
    return parsed as T;
  } catch (error) {
    console.error("[AI Parse] Failed to parse AI response:", error);
    console.error("[AI Parse] Raw text:", text);
    return fallback;
  }
}

/**
 * Fallback responses for when AI fails
 */
export const AI_FALLBACKS = {
  classification: {
    intent: "create" as const,
    confidence: 50,
    reasoning: "AI service temporarily unavailable - defaulting to create",
    taskDetails: {
      title: "",
      priority: "medium" as const,
    },
    followUpQuestions: [
      "The AI assistant is temporarily unavailable. I'll create this task, but could you provide more details?",
    ],
  },
  
  transcription: {
    transcript: "",
    confidence: 0,
    duration: 0,
  },
  
  voiceActions: [] as Array<{
    type: "CREATE";
    task: {
      title: string;
      priority: "medium";
    };
  }>,
} as const;

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: AIError): string {
  switch (error.type) {
    case "TIMEOUT":
      return "The request took too long. Please try again.";
    case "RATE_LIMIT":
      return "Too many requests. Please wait a moment and try again.";
    case "QUOTA_EXCEEDED":
      return "AI service quota exceeded. Please try again later or contact support.";
    case "INVALID_API_KEY":
      return "AI service configuration error. Please contact support.";
    case "SERVICE_UNAVAILABLE":
      return "AI service is temporarily unavailable. Please try again in a few moments.";
    case "INVALID_REQUEST":
      return "Invalid request. Please try rephrasing your input.";
    case "UNKNOWN":
    default:
      return "An unexpected error occurred. Please try again.";
  }
}
