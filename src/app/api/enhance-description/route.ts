import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { taskTitle, currentDescription, question, answer } = await req.json();

    if (!taskTitle || !question || !answer) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
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
    const enhancedDescription = result.response.text()?.trim() || currentDescription;

    return NextResponse.json({ enhancedDescription });
  } catch (error) {
    console.error("[Enhance-Description] Error:", error);
    return NextResponse.json(
      { error: "Failed to enhance description" },
      { status: 500 }
    );
  }
}
