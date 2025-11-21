import { Task } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Trash2, Calendar, Flag, AlignLeft } from "lucide-react";
import { useState, useEffect } from "react";

interface TaskDetailModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (taskId: string, updates: Partial<Task>) => void;
    onDelete: (taskId: string) => void;
}

export default function TaskDetailModal({ task, isOpen, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
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
                                    <div className="md:col-span-2 space-y-4">
                                        <div className="flex items-center gap-2 text-white/50 mb-2">
                                            <AlignLeft className="h-4 w-4" />
                                            <span className="text-sm font-medium">Description</span>
                                        </div>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full h-40 rounded-xl bg-white/5 p-4 text-white/90 placeholder-white/20 outline-none focus:ring-2 focus:ring-[var(--accent-blue)] resize-none text-sm leading-relaxed"
                                            placeholder="Add a more detailed description..."
                                        />
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
