"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import TaskInput from "@/components/TaskInput";
import TaskDetailModal from "@/components/TaskDetailModal";
import { Task } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLoadingMessage } from "@/lib/loadingMessages";

export default function SpacePage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading } = useAuth();
    const spaceId = params.id as string;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiQuestion, setAiQuestion] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [context, setContext] = useState<string>("");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [spaceName, setSpaceName] = useState<string>("");

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

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

    // Load tasks from localStorage on mount
    useEffect(() => {
        const savedTasks = localStorage.getItem(`tasks_${spaceId}`);
        if (savedTasks) {
            try {
                setTasks(JSON.parse(savedTasks));
            } catch (e) {
                console.error("Failed to load tasks", e);
            }
        }
        setIsLoaded(true);
    }, [spaceId]);

    // Save tasks to localStorage whenever they change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(`tasks_${spaceId}`, JSON.stringify(tasks));
        }
    }, [tasks, spaceId, isLoaded]);

    const handleTaskSubmit = async (text: string) => {
        setIsProcessing(true);
        setAiQuestion(null);
        setLoadingMessage(getLoadingMessage(text));

        const fullText = context ? `${context} \nUser Answer: ${text}` : text;

        try {
            const res = await fetch("/api/parse-task", {
                method: "POST",
                body: JSON.stringify({ text: fullText, tasks }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                console.error("API Error:", data.error);
                setAiQuestion(`Error: ${data.error || "Failed to parse task"}. Please try again.`);
                return;
            }

            if (data.missingInfo) {
                setAiQuestion(data.missingInfo);
                setContext(fullText);
            } else {
                if (data.action === "create" && data.newTask) {
                    const newTask: Task = {
                        id: Date.now().toString(),
                        spaceId,
                        title: data.newTask.title || "Untitled Task",
                        description: data.newTask.description,
                        dueDate: data.newTask.dueDate,
                        dueTime: data.newTask.dueTime,
                        priority: data.newTask.priority || "medium",
                        status: "todo",
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        updates: [], // Initialize empty timeline
                    };
                    setTasks([newTask, ...tasks]);
                } else if (data.action === "update" && data.taskId) {
                    setTasks(tasks.map(t => {
                        if (t.id === data.taskId) {
                            // Handle description updates (append if provided)
                            const newDescription = data.updates?.description
                                ? (t.description ? `${t.description}\n\n${data.updates.description}` : data.updates.description)
                                : t.description;

                            // Add timeline entry if provided
                            const newUpdates = data.timeline
                                ? [...(t.updates || []), { ...data.timeline, id: Date.now().toString() }]
                                : t.updates;

                            // Build update object - only include fields that are explicitly in data.updates
                            const updatedTask: any = {
                                ...t,
                                description: newDescription,
                                updates: newUpdates,
                                updatedAt: Date.now()
                            };

                            // Only update fields that are explicitly provided in data.updates
                            if (data.updates) {
                                if ('status' in data.updates && data.updates.status) {
                                    updatedTask.status = data.updates.status;
                                }
                                if ('priority' in data.updates && data.updates.priority) {
                                    updatedTask.priority = data.updates.priority;
                                }
                                if ('dueDate' in data.updates) {
                                    updatedTask.dueDate = data.updates.dueDate;
                                }
                                if ('dueTime' in data.updates) {
                                    updatedTask.dueTime = data.updates.dueTime;
                                }
                                if ('title' in data.updates && data.updates.title) {
                                    updatedTask.title = data.updates.title;
                                }
                            }

                            return updatedTask;
                        }
                        return t;
                    }));
                }
                setContext("");
            }
        } catch (error) {
            console.error("Error:", error);
            setAiQuestion("Sorry, something went wrong. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
        setTasks(tasks.map(t => {
            if (t.id === taskId) {
                // CRITICAL: Only update fields that are explicitly provided
                // Preserve all existing fields that aren't being changed
                return {
                    ...t,
                    ...(updates.status !== undefined && { status: updates.status }),
                    ...(updates.priority !== undefined && { priority: updates.priority }),
                    ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
                    ...(updates.dueTime !== undefined && { dueTime: updates.dueTime }),
                    ...(updates.title !== undefined && { title: updates.title }),
                    ...(updates.description !== undefined && { description: updates.description }),
                    updatedAt: Date.now()
                };
            }
            return t;
        }));
    };

    const handleDeleteTask = (taskId: string) => {
        setTasks(tasks.filter(t => t.id !== taskId));
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="mx-auto max-w-3xl">
            <header className="mb-8 flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-white">{spaceName || "Loading..."}</h1>
            </header>

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
                <TaskInput onSubmit={handleTaskSubmit} isProcessing={isProcessing} />
            </div>

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
