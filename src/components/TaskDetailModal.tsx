import { Task } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Trash2, Calendar, Flag, AlignLeft, CheckCircle, FileText, Zap, Activity, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { getRelativeTime } from "@/lib/timeUtils";

import ReactMarkdown from "react-markdown";

interface TaskDetailModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (taskId: string, updates: Partial<Task>) => void;
    onDelete: (taskId: string) => void;
    onPolish?: (task: Task) => Promise<void>;
}

export default function TaskDetailModal({ task, isOpen, onClose, onUpdate, onDelete, onPolish }: TaskDetailModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [dueDate, setDueDate] = useState("");
    const [dueTime, setDueTime] = useState("");
    const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
    const [status, setStatus] = useState<"todo" | "done">("todo");

    useEffect(() => {
        if (task) {
            setTitle(task.title || "");
            setDescription(task.description || "");
            setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
            setDueTime(task.dueTime || "");
            setPriority(task.priority || "medium");
            setStatus(task.status as "todo" | "done");
        }
    }, [task]);

    const handlePolish = async () => {
        if (task && onPolish) {
            setIsPolishing(true);
            try {
                await onPolish(task);
            } finally {
                setIsPolishing(false);
            }
        }
    };

    const handleSave = () => {
        if (task) {
            onUpdate(task.id, {
                title,
                description,
                dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                dueTime: dueTime || undefined,
                priority,
                status
            });
            onClose();
        }
    };

    const handleDelete = () => {
        if (task) {
            onDelete(task.id);
            onClose();
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'high': return 'text-red-400 bg-red-400/10';
            case 'medium': return 'text-yellow-400 bg-yellow-400/10';
            case 'low': return 'text-blue-400 bg-blue-400/10';
            default: return 'text-white/50 bg-white/5';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && task && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[#121212] border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/10 p-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-white/30 uppercase">Task-{task.id.slice(-4)}</span>
                                    <div className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${status === 'done' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}`}>
                                        {status === 'done' ? 'Done' : 'To Do'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleDelete} className="p-2 rounded-lg text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                    <button onClick={onClose} className="p-2 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {/* Title */}
                                <div>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-transparent text-2xl font-bold text-white placeholder-white/20 outline-none border-none p-0 focus:ring-0"
                                        placeholder="Task Title"
                                    />
                                </div>

                                {/* Main Layout */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Left Column: Description */}
                                    <div className="md:col-span-2 space-y-4 flex flex-col">
                                        <div className="flex items-center justify-between text-white/50 mb-2">
                                            <div className="flex items-center gap-2">
                                                <AlignLeft className="h-4 w-4" />
                                                <span className="text-sm font-medium">Description</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {onPolish && (
                                                    <button
                                                        onClick={handlePolish}
                                                        disabled={isPolishing}
                                                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                                                    >
                                                        <Sparkles className={`h-3 w-3 ${isPolishing ? 'animate-spin' : ''}`} />
                                                        {isPolishing ? 'Polishing...' : 'Polish'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setIsEditingDescription(!isEditingDescription)}
                                                    className="text-xs hover:text-white transition-colors uppercase tracking-wider font-medium"
                                                >
                                                    {isEditingDescription ? "Preview" : "Edit"}
                                                </button>
                                            </div>
                                        </div>

                                        {isEditingDescription ? (
                                            <textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className="w-full min-h-[400px] rounded-xl bg-white/5 p-6 text-white/90 placeholder-white/20 outline-none focus:ring-2 focus:ring-[var(--accent-blue)] resize-none text-sm leading-relaxed font-mono"
                                                placeholder="Add a more detailed description..."
                                            />
                                        ) : (
                                            <div
                                                className="w-full min-h-[400px] rounded-xl bg-white/5 p-6 text-white/90 text-sm leading-relaxed overflow-y-auto cursor-pointer hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 whitespace-normal break-words"
                                                onClick={() => setIsEditingDescription(true)}
                                            >
                                                {description ? (
                                                    <ReactMarkdown
                                                        components={{
                                                            h1: ({ ...props }: any) => <h1 className="text-xl font-bold text-white mb-4 mt-2" {...props} />,
                                                            h2: ({ ...props }: any) => <h2 className="text-lg font-bold text-white/90 mb-3 mt-6 border-b border-white/10 pb-2" {...props} />,
                                                            h3: ({ ...props }: any) => <h3 className="text-base font-bold text-white/90 mb-2 mt-4" {...props} />,
                                                            p: ({ ...props }: any) => <p className="mb-4 text-white/80 leading-7" {...props} />,
                                                            ul: ({ ...props }: any) => <ul className="list-disc pl-5 mb-4 space-y-2 text-white/80" {...props} />,
                                                            ol: ({ ...props }: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-white/80" {...props} />,
                                                            li: ({ ...props }: any) => <li className="pl-1" {...props} />,
                                                            strong: ({ ...props }: any) => <strong className="font-semibold text-white" {...props} />,
                                                            blockquote: ({ ...props }: any) => <blockquote className="border-l-4 border-white/20 pl-4 italic text-white/60 my-4" {...props} />,
                                                            code: ({ ...props }: any) => <code className="bg-black/30 rounded px-1.5 py-0.5 font-mono text-xs text-blue-300 whitespace-pre-wrap break-all" {...props} />,
                                                        }}
                                                    >
                                                        {description.trim()}
                                                    </ReactMarkdown>
                                                ) : (
                                                    <span className="text-white/20 italic">No description provided. Click to add one...</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Meta Fields */}
                                    <div className="space-y-6">
                                        {/* Status */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Status</label>
                                            <button
                                                onClick={() => setStatus(status === "todo" ? "done" : "todo")}
                                                className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border border-white/5 ${status === "done"
                                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                                    : "bg-white/5 text-white hover:bg-white/10"
                                                    }`}
                                            >
                                                {status === "done" ? <Check className="h-4 w-4" /> : null}
                                                {status === "done" ? "Completed" : "Mark as Done"}
                                            </button>
                                        </div>

                                        {/* Priority */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Priority</label>
                                            <div className="flex gap-2">
                                                {(['low', 'medium', 'high'] as const).map((p) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setPriority(p)}
                                                        className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all border border-transparent ${priority === p
                                                            ? getPriorityColor(p) + ' border-white/10 shadow-lg'
                                                            : 'text-white/30 hover:bg-white/5'
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Due Date */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Due Date</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                                                <input
                                                    type="date"
                                                    value={dueDate}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    className="w-full rounded-lg bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[var(--accent-blue)] [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>

                                        {/* Due Time */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Due Time</label>
                                            <input
                                                type="time"
                                                value={dueTime}
                                                onChange={(e) => setDueTime(e.target.value)}
                                                className="w-full rounded-lg bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[var(--accent-blue)] [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Timeline */}
                                {task.updates && task.updates.length > 0 && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-white/50">
                                            <Activity className="h-4 w-4" />
                                            <span className="text-sm font-medium">Activity</span>
                                        </div>

                                        <div className="space-y-3">
                                            {[
                                                // Existing updates
                                                ...[...task.updates].reverse().map((update) => ({
                                                    ...update,
                                                    isCreation: false
                                                })),
                                                // Creation event (always last in the reversed list)
                                                {
                                                    id: 'creation',
                                                    type: 'creation',
                                                    content: 'Task created',
                                                    timestamp: task.createdAt,
                                                    isCreation: true
                                                }
                                            ].map((update, index, array) => {
                                                // Determine icon and color based on update type
                                                const getUpdateStyle = () => {
                                                    if (update.isCreation) {
                                                        return {
                                                            icon: <Flag className="h-4 w-4" />,
                                                            color: "text-purple-400 bg-purple-400/10 border-purple-400/20"
                                                        };
                                                    }

                                                    switch (update.type) {
                                                        case "status_change":
                                                            return {
                                                                icon: <CheckCircle className="h-4 w-4" />,
                                                                color: "text-green-400 bg-green-400/10 border-green-400/20"
                                                            };
                                                        case "note":
                                                            return {
                                                                icon: <FileText className="h-4 w-4" />,
                                                                color: "text-blue-400 bg-blue-400/10 border-blue-400/20"
                                                            };
                                                        case "field_update":
                                                            return {
                                                                icon: <Zap className="h-4 w-4" />,
                                                                color: "text-orange-400 bg-orange-400/10 border-orange-400/20"
                                                            };
                                                        default:
                                                            return {
                                                                icon: <FileText className="h-4 w-4" />,
                                                                color: "text-white/40 bg-white/5 border-white/10"
                                                            };
                                                    }
                                                };

                                                const style = getUpdateStyle();

                                                return (
                                                    <div key={update.id} className="flex gap-3 group">
                                                        {/* Timeline connector */}
                                                        <div className="flex flex-col items-center">
                                                            <div className={`p-2 rounded-full border ${style.color} transition-all group-hover:scale-110`}>
                                                                {style.icon}
                                                            </div>
                                                            {index < array.length - 1 && (
                                                                <div className="flex-1 w-px bg-white/10 my-1" />
                                                            )}
                                                        </div>

                                                        {/* Update content */}
                                                        <div className="flex-1 pb-4">
                                                            <div className="rounded-lg bg-white/5 p-3 hover:bg-white/10 transition-colors border border-white/5">
                                                                <p className="text-sm text-white/90 leading-relaxed">
                                                                    {update.content}
                                                                </p>
                                                                {/* @ts-expect-error */}
                                                                {update.field && update.oldValue && update.newValue && (
                                                                    <p className="text-xs text-white/40 mt-1">
                                                                        {/* @ts-expect-error */}
                                                                        {update.field}: <span className="line-through">{update.oldValue}</span> → {update.newValue}
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-white/30 mt-2">
                                                                    {getRelativeTime(update.timestamp)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-white/10 p-6 bg-white/5">
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-8 py-2.5 rounded-xl bg-[var(--accent-blue)] text-sm font-bold text-white hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
