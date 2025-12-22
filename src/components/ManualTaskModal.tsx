/**
 * Manual Task Creation Modal
 * 
 * Allows users to create tasks manually without AI assistance
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";

interface ManualTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (title: string) => void;
}

export default function ManualTaskModal({ isOpen, onClose, onCreate }: ManualTaskModalProps) {
    const [title, setTitle] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onCreate(title.trim());
            setTitle("");
            onClose();
        }
    };

    const handleClose = () => {
        setTitle("");
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-md bg-[#1a1a2e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-600/20">
                                        <Plus className="h-5 w-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-white">Create Task Manually</h2>
                                        <p className="text-sm text-white/50">No AI credits used</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/5 text-white/40 hover:text-white/60 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="mb-6">
                                    <label htmlFor="task-title" className="block text-sm font-medium text-white/70 mb-2">
                                        Task Title
                                    </label>
                                    <input
                                        id="task-title"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="What needs to be done?"
                                        autoFocus
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                                    />
                                    <p className="mt-2 text-xs text-white/40">
                                        You can add more details after creating the task
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!title.trim()}
                                        className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white font-medium hover:shadow-lg hover:shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Create Task
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
