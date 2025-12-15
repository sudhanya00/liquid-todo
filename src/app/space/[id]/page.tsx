"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Cloud, CloudOff, AlertCircle } from "lucide-react";
import TaskInput from "@/components/TaskInput";
import TaskDetailModal from "@/components/TaskDetailModal";
import VoiceInput from "@/components/VoiceInput";
import VoicePreviewModal from "@/components/VoicePreviewModal";
import { Task } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLoadingMessage } from "@/lib/loadingMessages";
import { useTasks } from "@/lib/hooks/useTasks";
import { RecordingResult } from "@/lib/audio/recorder";
import { blobToBase64 } from "@/lib/audio/recorder";
import { VoiceLogAction } from "@/lib/services/speechToText";

export default function SpacePage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const spaceId = params.id as string;

    // Use cloud-based task management
    const {
        tasks,
        loading: tasksLoading,
        error: tasksError,
        isMigrating,
        migrationStatus,
        addTask,
        editTask,
        removeTask,
        clearError,
    } = useTasks({ spaceId, enableMigration: true });

    const [isProcessing, setIsProcessing] = useState(false);
    const [aiQuestion, setAiQuestion] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [context, setContext] = useState<string>("");
    const [pendingTask, setPendingTask] = useState<Partial<Task> | null>(null); // Task waiting for clarification
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [spaceName, setSpaceName] = useState<string>("");
    
    // Voice log state
    const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
    const [voicePreviewOpen, setVoicePreviewOpen] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState("");
    const [voiceActions, setVoiceActions] = useState<VoiceLogAction[]>([]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    // Fetch Space Details
    useEffect(() => {
        if (!spaceId) return;
        const fetchSpace = async () => {
            try {
                const spaceDoc = await getDoc(doc(db, "spaces", spaceId));
                if (spaceDoc.exists()) {
                    setSpaceName(spaceDoc.data().name);
                } else {
                    setSpaceName(`Space ${spaceId.slice(-4)}`);
                }
            } catch (error) {
                console.error("Error fetching space:", error);
                setSpaceName(`Space ${spaceId.slice(-4)}`);
            }
        };
        fetchSpace();
    }, [spaceId]);

    // Keep selectedTask in sync with tasks updates
    useEffect(() => {
        if (selectedTask) {
            const updated = tasks.find(t => t.id === selectedTask.id);
            if (updated) {
                setSelectedTask(updated);
            }
        }
    }, [tasks, selectedTask]);

    const handleTaskSubmit = async (text: string) => {
        setIsProcessing(true);
        setAiQuestion(null);
        setLoadingMessage(getLoadingMessage(text));

        // Check if we have a pending task waiting for clarification
        if (pendingTask && context) {
            // User answered the combined question (context + date in one)
            // Enrich the task with their answer and create
            const enrichedText = `${pendingTask.title}: ${text}`;
            
            console.log(`[Follow-up] User answered: "${text}" for task: "${pendingTask.title}"`);
            
            try {
                const res = await fetch("/api/parse-task", {
                    method: "POST",
                    body: JSON.stringify({ 
                        text: enrichedText, 
                        tasks,
                        spaceName,
                    }),
                });
                
                const data = await res.json();
                console.log(`[Follow-up] API response:`, data);
                
                // If STILL vague after user's answer, ask again (but only once more)
                if (data.action === "clarify" && data.question && data.vaguenessScore > 60) {
                    console.log(`[Follow-up] Still vague, asking again: ${data.question}`);
                    setAiQuestion(data.question);
                    setPendingTask({
                        ...pendingTask,
                        title: data.pendingTask?.title || enrichedText,
                        description: data.pendingTask?.description || pendingTask.description,
                        priority: data.pendingTask?.priority || pendingTask.priority,
                    });
                    setContext(enrichedText);
                    setIsProcessing(false);
                    return;
                }
                
                // Ready to create - use today as fallback if no date
                const today = new Date().toISOString().split('T')[0];
                const finalDueDate = data.task?.dueDate || data.pendingTask?.dueDate || today;
                const finalTitle = data.task?.title || data.pendingTask?.title || pendingTask.title || "Untitled Task";
                const finalPriority = data.task?.priority || pendingTask.priority || "medium";
                
                // Get suggested improvements from API response OR from the original pending task
                const suggestedImprovements = data.task?.suggestedImprovements || 
                    data.pendingTask?.suggestedImprovements || 
                    (pendingTask as any).suggestedImprovements;
                
                // Create the task
                const newTask = await addTask({
                    title: finalTitle,
                    description: data.task?.description || pendingTask.description,
                    dueDate: finalDueDate,
                    dueTime: data.task?.dueTime,
                    priority: finalPriority,
                    status: "todo",
                    updates: [],
                    suggestedImprovements: suggestedImprovements,
                });

                if (newTask) {
                    generateDescription(newTask);
                }
                
                // Clear ALL pending state
                setPendingTask(null);
                setContext("");
            } catch (error) {
                console.error("Error creating task:", error);
                setAiQuestion("Sorry, something went wrong creating the task.");
            } finally {
                setIsProcessing(false);
            }
            return;
        }

        const fullText = text;

        // Build recent activity context for smarter classification
        const sortedTasks = [...tasks].sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        const recentActivity = {
            lastCreatedTask: sortedTasks[0],
            lastUpdatedTask: tasks.find(t => t.updates?.length),
            lastCompletedTask: tasks.find(t => t.status === "done"),
        };

        try {
            const res = await fetch("/api/parse-task", {
                method: "POST",
                body: JSON.stringify({ 
                    text: fullText, 
                    tasks,
                    spaceName,
                    recentActivity,
                }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                console.error("API Error:", data.error);
                setAiQuestion(`Error: ${data.error || "Failed to parse task"}. Please try again.`);
                return;
            }

            // Handle clarify action - ask combined question (context + date)
            if (data.action === "clarify" && data.question) {
                console.log(`[New Task] Needs clarification: ${data.question}`);
                console.log(`[New Task] Vagueness score: ${data.vaguenessScore || 'N/A'}`);
                setAiQuestion(data.question);
                setContext(fullText);
                // Store pending task
                if (data.pendingTask) {
                    setPendingTask(data.pendingTask);
                }
                return;
            }
            
            // Handle create action
            if (data.action === "create") {
                const taskData = data.task || data.newTask;
                if (taskData) {
                    // Create task in Firestore with suggested improvements
                    const newTask = await addTask({
                        title: taskData.title || "Untitled Task",
                        description: taskData.description,
                        dueDate: taskData.dueDate,
                        dueTime: taskData.dueTime,
                        priority: taskData.priority || "medium",
                        status: "todo",
                        updates: [],
                        // Save AI-generated improvement suggestions
                        suggestedImprovements: taskData.suggestedImprovements,
                    });

                    // Generate description in background
                    if (newTask) {
                        generateDescription(newTask);
                    }
                }
            } else if (data.action === "update" && data.taskId) {
                const existingTask = tasks.find(t => t.id === data.taskId);
                if (existingTask) {
                    // Build updates object
                    const updates: Partial<Task> = {};

                    // Handle description updates - always enhance with AI, never replace
                    if (data.updates?.description) {
                        try {
                            const enhanceRes = await fetch("/api/enhance-description", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    taskTitle: existingTask.title,
                                    currentDescription: existingTask.description || "",
                                    question: data.timeline?.type === "note" ? "Progress update" : "Update",
                                    answer: data.updates.description,
                                }),
                            });
                            if (enhanceRes.ok) {
                                const enhanceData = await enhanceRes.json();
                                updates.description = enhanceData.enhancedDescription;
                            }
                        } catch (e) {
                            console.error("Failed to enhance description:", e);
                            // Fallback: append the update
                            updates.description = (existingTask.description || "") + 
                                `\n\n**Update:** ${data.updates.description}`;
                        }
                    }

                    // Add timeline entry if provided
                    if (data.timeline) {
                        const newUpdates = [
                            ...(existingTask.updates || []),
                            { ...data.timeline, id: Date.now().toString(), timestamp: Date.now() }
                        ];
                        updates.updates = newUpdates;
                    }

                    // Only update fields that are explicitly provided
                    if (data.updates) {
                        if ('status' in data.updates && data.updates.status) {
                            updates.status = data.updates.status;
                        }
                        if ('priority' in data.updates && data.updates.priority) {
                            updates.priority = data.updates.priority;
                        }
                        if ('dueDate' in data.updates) {
                            updates.dueDate = data.updates.dueDate;
                        }
                        if ('dueTime' in data.updates) {
                            updates.dueTime = data.updates.dueTime;
                        }
                        if ('title' in data.updates && data.updates.title) {
                            updates.title = data.updates.title;
                        }
                    }

                    await editTask(data.taskId, updates);
                    
                    // DON'T regenerate description on status/field updates
                    // Description should only be generated on task creation
                }
            }
            setContext("");
        } catch (error) {
            console.error("Error:", error);
            setAiQuestion("Sorry, something went wrong. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const generateDescription = async (task: Task) => {
        try {
            const res = await fetch("/api/generate-description", {
                method: "POST",
                body: JSON.stringify({ task }),
            });
            const data = await res.json();
            if (data.description) {
                await editTask(task.id, { description: data.description });
            }
        } catch (error) {
            console.error("Failed to generate description:", error);
        }
    };

    // Voice log handlers
    const handleVoiceRecordingComplete = useCallback(async (result: RecordingResult) => {
        setIsVoiceProcessing(true);
        
        try {
            // Convert audio blob to base64
            const audioBase64 = await blobToBase64(result.blob);
            
            // Prepare existing tasks for context
            const existingTasks = tasks.map(t => ({
                id: t.id,
                title: t.title,
                status: t.status,
            }));
            
            // Call voice-log API
            const res = await fetch("/api/voice-log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    audioBase64,
                    mimeType: result.mimeType,
                    spaceId,
                    existingTasks,
                }),
            });
            
            const data = await res.json();
            
            if (!data.success) {
                setAiQuestion(data.error || "Failed to process voice log.");
                return;
            }
            
            // Show preview modal with transcript and actions
            setVoiceTranscript(data.transcript);
            setVoiceActions(data.actions || []);
            setVoicePreviewOpen(true);
            
        } catch (error) {
            console.error("Voice log error:", error);
            setAiQuestion("Failed to process voice recording. Please try again.");
        } finally {
            setIsVoiceProcessing(false);
        }
    }, [tasks, spaceId]);
    
    const handleVoiceActionsConfirm = useCallback(async (actions: VoiceLogAction[]) => {
        for (const action of actions) {
            try {
                switch (action.type) {
                    case "CREATE":
                        if (action.task) {
                            const newTask = await addTask({
                                title: action.task.title,
                                description: action.task.description,
                                dueDate: action.task.dueDate,
                                priority: action.task.priority || "medium",
                                status: "todo",
                                updates: [],
                            });
                            if (newTask) {
                                generateDescription(newTask);
                            }
                        }
                        break;
                    
                    case "UPDATE":
                        if (action.taskId && action.updates) {
                            const updates: Partial<Task> = {};
                            if (action.updates.status) updates.status = action.updates.status;
                            if (action.updates.priority) updates.priority = action.updates.priority;
                            if (action.updates.note) {
                                const existingTask = tasks.find(t => t.id === action.taskId);
                                if (existingTask) {
                                    updates.updates = [
                                        ...(existingTask.updates || []),
                                        {
                                            id: Date.now().toString(),
                                            type: "note",
                                            content: action.updates.note,
                                            timestamp: Date.now(),
                                        },
                                    ];
                                }
                            }
                            await editTask(action.taskId, updates);
                        }
                        break;
                    
                    case "COMPLETE":
                        if (action.taskId) {
                            await editTask(action.taskId, { status: "done" });
                        }
                        break;
                }
            } catch (error) {
                console.error(`Failed to execute action ${action.type}:`, error);
            }
        }
    }, [addTask, editTask, tasks]);

    const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
        await editTask(taskId, updates);
        // Don't regenerate description on updates - it overwrites user's changes
        // Description generation should only happen on task creation
    };

    const handleDeleteTask = async (taskId: string) => {
        await removeTask(taskId);
        setSelectedTask(null);
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="mx-auto max-w-3xl">
            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">{spaceName || "Loading..."}</h1>
                </div>
                
                {/* Cloud sync indicator */}
                <div className="flex items-center gap-2 text-sm">
                    {tasksLoading ? (
                        <span className="flex items-center gap-1.5 text-white/40">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Syncing...
                        </span>
                    ) : tasksError ? (
                        <span className="flex items-center gap-1.5 text-amber-400">
                            <CloudOff className="h-4 w-4" />
                            Offline
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-green-400/70">
                            <Cloud className="h-4 w-4" />
                            Synced
                        </span>
                    )}
                </div>
            </header>

            {/* Migration status banner */}
            <AnimatePresence>
                {isMigrating && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200"
                    >
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Migrating your tasks to the cloud...
                        </div>
                    </motion.div>
                )}
                
                {migrationStatus && migrationStatus.success > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200"
                    >
                        Successfully migrated {migrationStatus.success} task(s) to the cloud!
                        {migrationStatus.failed > 0 && (
                            <span className="text-amber-300"> ({migrationStatus.failed} failed)</span>
                        )}
                    </motion.div>
                )}

                {tasksError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
                    >
                        <div className="flex items-start gap-2 text-sm text-amber-200">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <p>{tasksError.message}</p>
                                <button
                                    onClick={clearError}
                                    className="mt-1 text-amber-400 hover:text-amber-300"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mb-8 space-y-4">
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white/80 backdrop-blur-sm"
                    >
                        <p className="text-[15px] font-medium leading-relaxed">{loadingMessage}</p>
                    </motion.div>
                )}
                {aiQuestion && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 px-5 py-4 text-[var(--accent-blue)] backdrop-blur-sm shadow-lg shadow-blue-500/10"
                    >
                        <p className="text-[15px] font-medium leading-relaxed">
                            <span className="text-white/50 text-sm mr-2">AI:</span>
                            {aiQuestion}
                        </p>
                    </motion.div>
                )}
                
                {/* Voice processing indicator */}
                {isVoiceProcessing && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-4 text-indigo-300 backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <p className="text-[15px] font-medium">Processing voice log...</p>
                        </div>
                    </motion.div>
                )}
                
                {/* Task input with voice button */}
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <TaskInput onSubmit={handleTaskSubmit} isProcessing={isProcessing} />
                    </div>
                    <VoiceInput
                        onRecordingComplete={handleVoiceRecordingComplete}
                        disabled={isProcessing || isVoiceProcessing}
                        maxDuration={120}
                    />
                </div>
            </div>
            
            {/* Voice Preview Modal */}
            <VoicePreviewModal
                isOpen={voicePreviewOpen}
                onClose={() => setVoicePreviewOpen(false)}
                transcript={voiceTranscript}
                actions={voiceActions}
                onConfirm={handleVoiceActionsConfirm}
            />

            {/* Loading skeleton */}
            {tasksLoading && tasks.length === 0 && (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="glass-card animate-pulse rounded-xl p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-4 rounded-full bg-white/10" />
                                <div className="h-4 w-48 rounded bg-white/10" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!tasksLoading && tasks.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                >
                    <p className="text-white/40 mb-2">No tasks yet</p>
                    <p className="text-white/30 text-sm">
                        Type something above to create your first task
                    </p>
                </motion.div>
            )}

            {/* Tasks list */}
            <div className="space-y-4">
                {tasks.map((task) => (
                    <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedTask(task)}
                        className="glass-card flex cursor-pointer items-center justify-between rounded-xl p-4 transition-transform hover:scale-[1.01]"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`h-4 w-4 rounded-full border-2 ${task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-white/30'}`} />
                            <span className={`text-white ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                                {task.title}
                            </span>
                        </div>
                        {task.priority && (
                            <span className="text-xs uppercase tracking-wider text-white/40">
                                {task.priority}
                            </span>
                        )}
                    </motion.div>
                ))}
            </div>

            <TaskDetailModal
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
            />
        </div>
    );
}
