/**
 * API Client with Retry Logic, Error Handling, and Authentication
 * 
 * Provides robust API calling with:
 * - Automatic Firebase Auth token injection
 * - Automatic retries on failure
 * - Exponential backoff
 * - Proper error messages
 * - Type-safe responses
 */

import { auth } from "@/lib/firebase";

export interface ApiCallOptions {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    skipAuth?: boolean; // For public endpoints only
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
 * Get Firebase Auth token for authenticated requests
 */
async function getAuthToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) {
        return null;
    }
    
    try {
        return await user.getIdToken();
    } catch (error) {
        console.error("[API Client] Failed to get auth token:", error);
        return null;
    }
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make an API call with retry logic and automatic auth
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
        skipAuth = false,
    } = config;

    let lastError: Error | null = null;

    // Get auth token if not skipping auth
    let authToken: string | null = null;
    if (!skipAuth) {
        authToken = await getAuthToken();
        if (!authToken) {
            throw new ApiError("Authentication required. Please sign in.", 401);
        }
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            // Add auth header if we have a token
            const headers = new Headers(options.headers);
            if (authToken) {
                headers.set('Authorization', `Bearer ${authToken}`);
            }

            const response = await fetch(url, {
                ...options,
                headers,
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
