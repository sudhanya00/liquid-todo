/**
 * API Client with Retry Logic and Error Handling
 * 
 * Provides robust API calling with:
 * - Automatic retries on failure
 * - Exponential backoff
 * - Proper error messages
 * - Type-safe responses
 */

export interface ApiCallOptions {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public details?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make an API call with retry logic
 */
export async function apiCall<T>(
    url: string,
    options: RequestInit,
    config: ApiCallOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        retryDelay = 1000,
        timeout = 30000,
    } = config;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Parse response
            const data = await response.json();

            // Handle HTTP errors
            if (!response.ok) {
                // Don't retry on 4xx errors (client errors)
                if (response.status >= 400 && response.status < 500) {
                    throw new ApiError(
                        data.error || `Request failed with status ${response.status}`,
                        response.status,
                        data
                    );
                }

                // Retry on 5xx errors (server errors)
                throw new ApiError(
                    data.error || `Server error: ${response.status}`,
                    response.status,
                    data
                );
            }

            return data as T;

        } catch (error) {
            lastError = error as Error;

            // Don't retry on abort (timeout) or client errors
            if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
                throw error;
            }

            // Don't retry on the last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Exponential backoff
            const delay = retryDelay * Math.pow(2, attempt);
            console.warn(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }

    // All retries exhausted
    throw new ApiError(
        `API call failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
        undefined,
        lastError
    );
}

/**
 * Convenience wrapper for POST requests
 */
export async function apiPost<T>(
    url: string,
    body: unknown,
    config?: ApiCallOptions
): Promise<T> {
    return apiCall<T>(
        url,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        },
        config
    );
}
