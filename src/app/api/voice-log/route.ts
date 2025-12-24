/**
 * Voice Log API Route
 * 
 * Handles voice recording transcription and action parsing.
 * 
 * Flow:
 * 1. Receive audio blob from client
 * 2. Client checks entitlements before calling
 * 3. Transcribe using Gemini
 * 4. Parse transcript into actions
 * 5. Return parsed actions for user confirmation
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { transcribeWithGemini, parseVoiceLogActions, VoiceLogAction } from "@/lib/services/speechToText";
import { checkEntitlement, incrementUsage } from "@/lib/middleware/entitlementMiddleware";
import { AIError, getUserFriendlyErrorMessage } from "@/lib/aiRetry";

// Request validation schema
const VoiceLogRequestSchema = z.object({
    audioBase64: z.string().min(1, "Audio data is required"),
    mimeType: z.string().min(1, "MIME type is required"),
    spaceId: z.string().min(1, "Space ID is required"),
    userId: z.string().min(1, "User ID is required"),
    existingTasks: z.array(z.object({
        id: z.string(),
        title: z.string(),
        status: z.string(),
    })).optional().default([]),
});

// Response validation schema
const VoiceLogResponseSchema = z.object({
    success: z.boolean(),
    transcript: z.string().optional(),
    actions: z.array(z.any()).optional(),
    error: z.string().optional(),
});

export async function POST(request: Request) {
    try {
        // Parse and validate request body
        const body = await request.json();
        const validatedData = VoiceLogRequestSchema.parse(body);
        
        const { audioBase64, mimeType, existingTasks, userId } = validatedData;
        
        // SERVER-SIDE SECURITY: Verify auth and check entitlement
        const entitlementCheck = await checkEntitlement(request, userId, "create_voice_log");
        if (!entitlementCheck.allowed) {
            return entitlementCheck.error!;
        }
        
        // Step 1: Transcribe audio
        console.log("[Voice Log] Transcribing audio...");
        const transcription = await transcribeWithGemini(audioBase64, mimeType);
        
        if (!transcription.transcript) {
            return NextResponse.json(
                VoiceLogResponseSchema.parse({
                    success: false,
                    error: "Could not transcribe audio. Please speak clearly and try again.",
                }),
                { status: 422 }
            );
        }
        
        console.log("[Voice Log] Transcript:", transcription.transcript);
        
        // Step 2: Parse transcript into actions
        console.log("[Voice Log] Parsing actions...");
        const actions = await parseVoiceLogActions(
            transcription.transcript,
            existingTasks || []
        );
        
        console.log("[Voice Log] Parsed actions:", actions);
        
        // Increment usage AFTER successful transcription (atomic, server-side)
        await incrementUsage(entitlementCheck.userId, "voice_log");
        
        // Validate and return response
        const response = VoiceLogResponseSchema.parse({
            success: true,
            transcript: transcription.transcript,
            actions,
        });
        
        return NextResponse.json(response);
        
    } catch (error) {
        console.error("[Voice Log] Error:", error);
        
        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                VoiceLogResponseSchema.parse({
                    success: false,
                    error: "Invalid request data: " + error.issues.map((e: any) => e.message).join(", "),
                }),
                { status: 400 }
            );
        }
        
        // Handle NO_SPEECH error from transcription
        if (error && typeof error === "object" && "code" in error) {
            const typedError = error as { code: string; message: string };
            
            if (typedError.code === "NO_SPEECH") {
                return NextResponse.json(
                    VoiceLogResponseSchema.parse({
                        success: false,
                        error: "No speech detected. Please try again and speak clearly.",
                    }),
                    { status: 422 }
                );
            }
            
            if (typedError.code === "SERVICE_ERROR") {
                return NextResponse.json(
                    VoiceLogResponseSchema.parse({
                        success: false,
                        error: typedError.message,
                    }),
                    { status: 503 }
                );
            }
        }
        
        // Handle AIError
        if (error instanceof AIError) {
            const message = getUserFriendlyErrorMessage(error);
            const statusCode = error.retryable ? 503 : 500;
            
            return NextResponse.json(
                VoiceLogResponseSchema.parse({
                    success: false,
                    error: message,
                }),
                { status: statusCode }
            );
        }
        
        // Generic fallback
        return NextResponse.json(
            VoiceLogResponseSchema.parse({
                success: false,
                error: "Failed to process voice log. Please try again.",
            }),
            { status: 500 }
        );
    }
}
