import { NextResponse } from "next/server";
import { generatePolishedDescription } from "@/lib/agents/descriptionAgent";
import { Task } from "@/types";
import { AIError, getUserFriendlyErrorMessage } from "@/lib/aiRetry";

export async function POST(req: Request) {
    try {
        const { task } = await req.json();

        if (!task) {
            return NextResponse.json({ error: "Task is required" }, { status: 400 });
        }

        const description = await generatePolishedDescription(task as Task);

        return NextResponse.json({ description });
    } catch (error) {
        console.error("Error generating description:", error);
        
        // Handle AIError
        if (error instanceof AIError) {
            const message = getUserFriendlyErrorMessage(error);
            const statusCode = error.retryable ? 503 : 500;
            
            return NextResponse.json(
                { error: message, retryable: error.retryable },
                { status: statusCode }
            );
        }
        
        return NextResponse.json(
            { error: "Failed to generate description. Please try again." },
            { status: 500 }
        );
    }
}
