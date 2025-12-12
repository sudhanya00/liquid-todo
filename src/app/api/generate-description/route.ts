import { NextResponse } from "next/server";
import { generatePolishedDescription } from "@/lib/agents/descriptionAgent";
import { Task } from "@/types";

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
        return NextResponse.json(
            { error: "Failed to generate description" },
            { status: 500 }
        );
    }
}
