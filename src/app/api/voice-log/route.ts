/**
 * Voice Log API Route
 * 
 * Handles voice recording transcription and action parsing.
 * 
 * Flow:
 * 1. Receive audio blob from client
 * 2. Check user entitlements
 * 3. Transcribe using Gemini
 * 4. Parse transcript into actions
 * 5. Return parsed actions for user confirmation
 */

import { NextResponse } from "next/server";
import { transcribeWithGemini, parseVoiceLogActions, VoiceLogAction } from "@/lib/services/speechToText";

export interface VoiceLogRequest {
    audioBase64: string;
    mimeType: string;
    spaceId: string;
    existingTasks: { id: string; title: string; status: string }[];
}

export interface VoiceLogResponse {
    success: boolean;
    transcript?: string;
    actions?: VoiceLogAction[];
    error?: string;
}

export async function POST(request: Request): Promise<NextResponse<VoiceLogResponse>> {
    try {
        const body: VoiceLogRequest = await request.json();
        
        // Validate required fields
        if (!body.audioBase64 || !body.mimeType || !body.spaceId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing required fields: audioBase64, mimeType, spaceId",
                },
                { status: 400 }
            );
        }
        
        // TODO: Check user authentication and entitlements
        // This would verify:
        // 1. User is authenticated (from Firebase token)
        // 2. User has voice log quota remaining
        // 3. User owns the space
        
        // For now, we'll proceed without auth checks (development mode)
        // In production, add:
        // const { userId, canProceed } = await checkEntitlement('voice_log');
        // if (!canProceed) {
        //     return NextResponse.json({
        //         success: false,
        //         error: "Voice log limit reached. Upgrade to Pro for unlimited voice logs.",
        //     }, { status: 403 });
        // }
        
        // Step 1: Transcribe audio
        console.log("[Voice Log] Transcribing audio...");
        const transcription = await transcribeWithGemini(body.audioBase64, body.mimeType);
        
        if (!transcription.transcript) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Could not transcribe audio. Please try again.",
                },
                { status: 422 }
            );
        }
        
        console.log("[Voice Log] Transcript:", transcription.transcript);
        
        // Step 2: Parse transcript into actions
        console.log("[Voice Log] Parsing actions...");
        const actions = await parseVoiceLogActions(
            transcription.transcript,
            body.existingTasks || []
        );
        
        console.log("[Voice Log] Parsed actions:", actions);
        
        // TODO: Increment user's voice log usage
        // await incrementUsage(userId, 'voice_log');
        
        return NextResponse.json({
            success: true,
            transcript: transcription.transcript,
            actions,
        });
        
    } catch (error) {
        console.error("[Voice Log] Error:", error);
        
        // Handle specific error types
        if (error && typeof error === "object" && "code" in error) {
            const typedError = error as { code: string; message: string };
            
            if (typedError.code === "NO_SPEECH") {
                return NextResponse.json(
                    {
                        success: false,
                        error: "No speech detected. Please try again and speak clearly.",
                    },
                    { status: 422 }
                );
            }
        }
        
        return NextResponse.json(
            {
                success: false,
                error: "Failed to process voice log. Please try again.",
            },
            { status: 500 }
        );
    }
}
