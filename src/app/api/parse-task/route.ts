import { NextResponse } from "next/server";
import { orchestrateIntent } from "@/lib/agents/orchestrator";
import { handleCreateTask } from "@/lib/agents/creator";
import { handleUpdateTask } from "@/lib/agents/updater";
import { Task } from "@/types";

export async function POST(req: Request) {
  try {
    const { text, tasks } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const currentDate = new Date().toLocaleString("en-US", {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 1. Orchestrate Intent (now passes full Task objects)
    console.log("Orchestrating intent for:", text);
    const orchestration = await orchestrateIntent(text, tasks || [], currentDate);
    console.log("Intent detected:", orchestration.intent, "Confidence:", orchestration.confidence);

    // 2. Route to Specific Agent
    if (orchestration.intent === "create") {
      // Build context string for Creator (still uses string context)
      const tasksContext = tasks && tasks.length > 0
        ? tasks.map((t: Task) => `- [${t.id}] ${t.title} (Status: ${t.status}, Due: ${t.dueDate || 'None'})`).join("\n")
        : "No existing tasks.";

      const result = await handleCreateTask(text, tasksContext, currentDate);
      return NextResponse.json({ action: "create", ...result });

    } else if (orchestration.intent === "update") {
      const result = await handleUpdateTask(
        text,
        tasks || [],
        currentDate,
        orchestration.suggestedTaskId
      );
      return NextResponse.json({ action: "update", ...result });

    } else if (orchestration.intent === "delete") {
      const result = await handleUpdateTask(
        text,
        tasks || [],
        currentDate,
        orchestration.suggestedTaskId
      );
      return NextResponse.json({ action: "update", ...result });

    } else {
      // Query or Unknown
      return NextResponse.json({
        missingInfo: "I can currently only Create or Update tasks. I'm learning to answer questions soon!"
      });
    }

  } catch (error) {
    console.error("AI Parse Error:", error);
    return NextResponse.json({ error: "Failed to parse task" }, { status: 500 });
  }
}
