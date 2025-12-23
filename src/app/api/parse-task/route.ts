import { NextResponse } from "next/server";
import { orchestrateIntent } from "@/lib/agents/orchestrator";
import { handleUpdateTask } from "@/lib/agents/updater";
import { Task } from "@/types";
import { checkEntitlement, incrementUsage } from "@/lib/middleware/entitlementMiddleware";

export async function POST(req: Request) {
  try {
    const { text, tasks, spaceName, recentActivity, userId } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 });
    }

    // SERVER-SIDE SECURITY: Verify auth and check entitlement
    const entitlementCheck = await checkEntitlement(req, userId, "create_ai_request");
    if (!entitlementCheck.allowed) {
      return entitlementCheck.error!;
    }

    const currentDate = new Date().toLocaleString("en-US", {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 1. Smart Orchestration with full context (NO fuzzy matching!)
    console.log("[Parse-Task] Input:", text);
    console.log("[Parse-Task] Context:", { taskCount: tasks?.length || 0, spaceName });
    
    const orchestration = await orchestrateIntent(
      text, 
      tasks || [], 
      currentDate,
      spaceName,
      recentActivity
    );
    
    console.log("[Parse-Task] Classification:", {
      intent: orchestration.intent,
      confidence: orchestration.confidence,
      reasoning: orchestration.reasoning,
      taskDetails: orchestration.taskDetails,
      targetTaskId: orchestration.suggestedTaskId,
    });

    // Increment usage AFTER successful AI processing (atomic, server-side)
    await incrementUsage(entitlementCheck.userId, "ai_request");

    // 2. Handle clarify intent or low confidence
    if (orchestration.intent === "clarify") {
      return NextResponse.json({
        action: "clarify",
        question: orchestration.clarifyingQuestion,
        missingInfo: orchestration.classification.missingInfo,
        confidence: orchestration.confidence,
        reasoning: orchestration.reasoning,
        followUpQuestions: orchestration.followUpQuestions,
      });
    }

    // 3. Route to appropriate agent based on intent
    if (orchestration.intent === "create") {
      // Use task details from classifier
      const taskDetails = orchestration.taskDetails;
      const followUps = orchestration.followUpQuestions || [];
      const title = taskDetails?.title || text;
      const vaguenessScore = orchestration.classification.vaguenessScore ?? 50;
      
      console.log("[Parse-Task] Vagueness score:", vaguenessScore, "Reason:", orchestration.classification.vagueReason);
      
      // Separate date questions from contextual clarifying questions
      const dateQuestions = followUps.filter(q => 
        q.toLowerCase().includes('when') || 
        q.toLowerCase().includes('deadline') ||
        q.toLowerCase().includes('due') ||
        q.toLowerCase().includes('timeline')
      );
      
      const contextQuestions = followUps.filter(q => 
        !q.toLowerCase().includes('when') && 
        !q.toLowerCase().includes('deadline') &&
        !q.toLowerCase().includes('due') &&
        !q.toLowerCase().includes('timeline')
      );
      
      // HIGH VAGUENESS (61+): Combine ALL questions into ONE smart question
      // Ask context + date together: "What are you deploying, to which environment, and when?"
      const VAGUENESS_THRESHOLD = 60;
      
      if (vaguenessScore > VAGUENESS_THRESHOLD && contextQuestions.length > 0) {
        console.log("[Parse-Task] High vagueness - asking combined smart question");
        
        // Build a combined question with all context questions + date
        const allQuestions = [...contextQuestions];
        if (!taskDetails?.dueDate) {
          allQuestions.push(dateQuestions[0] || "what's the deadline?");
        }
        
        // Combine into one natural question
        let combinedQuestion: string;
        if (allQuestions.length === 1) {
          combinedQuestion = allQuestions[0];
        } else if (allQuestions.length === 2) {
          // "What service? And when?" -> "What service and when is it due?"
          combinedQuestion = `${allQuestions[0].replace(/\?$/, '')} and ${allQuestions[1].toLowerCase()}`;
        } else {
          // Multiple questions: "What service, to which env, and when?"
          const lastQ = allQuestions.pop()!;
          combinedQuestion = `${allQuestions.map(q => q.replace(/\?$/, '')).join(', ')}, and ${lastQ.toLowerCase()}`;
        }
        
        return NextResponse.json({
          action: "clarify",
          question: combinedQuestion,
          pendingTask: {
            title: title,
            description: taskDetails?.description,
            priority: taskDetails?.priority || "medium",
          },
          vaguenessScore: vaguenessScore,
          confidence: orchestration.confidence,
          reasoning: orchestration.classification.vagueReason || "Need more context to understand the task",
        });
      }
      
      // MEDIUM/LOW VAGUENESS: Only ask for due date if missing
      if (!taskDetails?.dueDate) {
        console.log("[Parse-Task] Missing due date, asking user");
        const dateQuestion = dateQuestions[0] || "When do you need this done by?";
        
        // If there are context questions but task isn't super vague, store them as suggestions
        return NextResponse.json({
          action: "clarify",
          question: dateQuestion,
          pendingTask: {
            title: title,
            description: taskDetails?.description,
            priority: taskDetails?.priority || "medium",
            // Pass remaining context questions as optional improvements
            suggestedImprovements: contextQuestions.length > 0 ? contextQuestions : undefined,
          },
          confidence: orchestration.confidence,
          reasoning: "Due date is required to create a task",
        });
      }
      
      // We have due date - create the task immediately
      // Include improvement suggestions as optional enhancements user can answer later
      return NextResponse.json({ 
        action: "create", 
        task: {
          title: taskDetails.title,
          description: taskDetails.description,
          priority: taskDetails.priority || "medium",
          dueDate: taskDetails.dueDate,
          // Store suggestions on the task - user can optionally answer these later
          suggestedImprovements: contextQuestions.length > 0 ? contextQuestions : undefined,
        },
        confidence: orchestration.confidence,
        reasoning: orchestration.reasoning,
      });

    } else if (orchestration.intent === "update") {
      // Use the target task ID from classifier
      const targetTaskId = orchestration.suggestedTaskId;
      
      if (!targetTaskId) {
        // Classifier couldn't find a matching task - this shouldn't happen
        // but if it does, fall back to create
        console.log("[Parse-Task] No target task for update, falling back to create");
        return NextResponse.json({
          action: "create",
          task: { title: text },
          followUpQuestions: ["I couldn't find the task you're referring to. Want me to create a new task instead?"],
          confidence: 50,
          reasoning: "Could not identify target task for update",
        });
      }

      const result = await handleUpdateTask(
        text,
        tasks || [],
        currentDate,
        targetTaskId
      );
      
      // Merge updates from classifier
      if (orchestration.updates) {
        result.updates = { ...result.updates, ...orchestration.updates };
      }

      return NextResponse.json({ 
        action: "update", 
        ...result,
        followUpQuestions: orchestration.followUpQuestions,
        confidence: orchestration.confidence,
        reasoning: orchestration.reasoning,
      });

    } else if (orchestration.intent === "delete") {
      const targetTaskId = orchestration.suggestedTaskId;
      
      if (!targetTaskId) {
        return NextResponse.json({
          action: "clarify",
          question: "Which task would you like to delete?",
          confidence: 50,
        });
      }

      const targetTask = tasks?.find((t: Task) => t.id === targetTaskId);

      return NextResponse.json({ 
        action: "delete", 
        taskId: targetTaskId,
        taskTitle: targetTask?.title,
        confidence: orchestration.confidence,
        reasoning: orchestration.reasoning,
      });

    } else if (orchestration.intent === "query") {
      return NextResponse.json({
        action: "query",
        queryType: orchestration.classification.queryType,
        message: "Query support coming soon! For now I can create and update tasks.",
        followUpQuestions: ["Would you like me to create a task instead?"],
      });
    }

    // Fallback
    return NextResponse.json({
      action: "create",
      task: { title: text },
      confidence: 50,
      reasoning: "Unknown intent, defaulting to create",
    });

  } catch (error) {
    console.error("[Parse-Task] Error:", error);
    return NextResponse.json({ error: "Failed to parse task" }, { status: 500 });
  }
}
