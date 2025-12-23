import { NextResponse } from "next/server";
import { z } from "zod";
import { getGeminiModel } from "@/lib/gemini";
import { checkEntitlement, incrementUsage } from "@/lib/middleware/entitlementMiddleware";

// Request validation schema
const EnhanceDescriptionRequestSchema = z.object({
  taskTitle: z.string().min(1, "Task title is required"),
  currentDescription: z.string().optional(),
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  userId: z.string().min(1, "User ID is required"),
});

// Response validation schema
const EnhanceDescriptionResponseSchema = z.object({
  enhancedDescription: z.string(),
});

export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validatedData = EnhanceDescriptionRequestSchema.parse(body);
    
    const { taskTitle, currentDescription, question, answer, userId } = validatedData;
    
    // SERVER-SIDE SECURITY: Verify auth and check entitlement
    const entitlementCheck = await checkEntitlement(req, userId, "create_ai_request");
    if (!entitlementCheck.allowed) {
      return entitlementCheck.error!;
    }

    const model = getGeminiModel();

    const prompt = `You are enhancing a task description with new information provided by the user.

## Task Title
${taskTitle}

## Current Description
${currentDescription || "(No description yet)"}

## New Information
Question asked: "${question}"
User's answer: "${answer}"

## Your Task
Integrate the new information naturally into the description. Don't just append it - weave it into the existing content to create a cohesive, well-structured description.

Rules:
1. If there's an existing description, enhance it with the new context
2. If there's no description, create a clear one using the new information
3. Keep the tone professional and actionable
4. Use markdown formatting (headers, bullets) if helpful
5. Don't mention "the user answered" or reference the Q&A format
6. Keep it concise but informative

Return ONLY the enhanced description text, nothing else.`;

    const result = await model.generateContent([{ text: prompt }]);
    const enhancedDescription = result.response.text()?.trim() || currentDescription || "";

    // Increment usage AFTER successful AI processing (atomic, server-side)
    await incrementUsage(entitlementCheck.userId, "ai_request");

    // Validate response
    const response = EnhanceDescriptionResponseSchema.parse({
      enhancedDescription,
    });

    return NextResponse.json(response);
    
  } catch (error) {
    console.error("[Enhance-Description] Error:", error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: error.issues 
        },
        { status: 400 }
      );
    }
    
    // Handle Gemini API errors
    if (error instanceof Error && error.message.includes("API")) {
      return NextResponse.json(
        { error: "AI service temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to enhance description" },
      { status: 500 }
    );
  }
}
