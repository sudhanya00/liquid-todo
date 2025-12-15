"use client";

/**
 * VoicePreviewModal
 * 
 * Shows the transcript and parsed actions from a voice log.
 * Allows users to confirm, edit, or cancel actions before execution.
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Check,
    Trash2,
    Plus,
    Edit3,
    CheckCircle2,
    ArrowRight,
    Loader2,
    AlertCircle,
    Mic,
} from "lucide-react";
import { VoiceLogAction } from "@/lib/services/speechToText";

interface VoicePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    transcript: string;
    actions: VoiceLogAction[];
    onConfirm: (actions: VoiceLogAction[]) => Promise<void>;
    onEditTranscript?: (newTranscript: string) => void;
}

export default function VoicePreviewModal({
    isOpen,
    onClose,
    transcript,
    actions: initialActions,
    onConfirm,
    onEditTranscript,
}: VoicePreviewModalProps) {
    const [actions, setActions] = useState<VoiceLogAction[]>(initialActions);
    const [editingTranscript, setEditingTranscript] = useState(false);
    const [editedTranscript, setEditedTranscript] = useState(transcript);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Sync internal state when props change (critical for modal reuse)
    useEffect(() => {
        setActions(initialActions);
    }, [initialActions]);
    
    useEffect(() => {
        setEditedTranscript(transcript);
    }, [transcript]);
    
    // Remove an action
    const handleRemoveAction = useCallback((index: number) => {
        setActions((prev) => prev.filter((_, i) => i !== index));
    }, []);
    
    // Save transcript edit
    const handleSaveTranscript = useCallback(() => {
        setEditingTranscript(false);
        onEditTranscript?.(editedTranscript);
    }, [editedTranscript, onEditTranscript]);
    
    // Confirm all actions
    const handleConfirm = useCallback(async () => {
        if (actions.length === 0) {
            onClose();
            return;
        }
        
        setIsProcessing(true);
        setError(null);
        
        try {
            await onConfirm(actions);
            onClose();
        } catch (err) {
            console.error("Failed to execute actions:", err);
            setError("Failed to execute some actions. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    }, [actions, onConfirm, onClose]);
    
    if (!isOpen) return null;
    
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                        <div className="flex items-center gap-2">
                            <Mic className="w-5 h-5 text-indigo-400" />
                            <h2 className="text-lg font-semibold text-white">Voice Log Preview</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-neutral-400" />
                        </button>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Transcript */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-neutral-400">
                                    Transcript
                                </label>
                                <button
                                    onClick={() => setEditingTranscript(!editingTranscript)}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    {editingTranscript ? "Cancel" : "Edit"}
                                </button>
                            </div>
                            
                            {editingTranscript ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={editedTranscript}
                                        onChange={(e) => setEditedTranscript(e.target.value)}
                                        className="w-full p-3 bg-[#2a2a2a] border border-neutral-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-indigo-500"
                                        rows={3}
                                    />
                                    <button
                                        onClick={handleSaveTranscript}
                                        className="text-xs text-indigo-400 hover:text-indigo-300"
                                    >
                                        Save changes
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3 bg-[#2a2a2a] rounded-lg">
                                    <p className="text-sm text-neutral-300 italic">
                                        &ldquo;{transcript}&rdquo;
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        {/* Actions */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-neutral-400">
                                Actions to perform ({actions.length})
                            </label>
                            
                            {actions.length === 0 ? (
                                <div className="p-4 bg-[#2a2a2a] rounded-lg text-center">
                                    <p className="text-sm text-neutral-500">
                                        No actions detected. Try editing the transcript.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {actions.map((action, index) => (
                                        <ActionCard
                                            key={index}
                                            action={action}
                                            onRemove={() => handleRemoveAction(index)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span className="text-sm text-red-400">{error}</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 p-4 border-t border-neutral-800">
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isProcessing || actions.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Confirm {actions.length} action{actions.length !== 1 ? "s" : ""}
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * Action Card Component
 */
interface ActionCardProps {
    action: VoiceLogAction;
    onRemove: () => void;
}

function ActionCard({ action, onRemove }: ActionCardProps) {
    const getActionIcon = () => {
        switch (action.type) {
            case "CREATE":
                return <Plus className="w-4 h-4 text-green-400" />;
            case "UPDATE":
                return <Edit3 className="w-4 h-4 text-blue-400" />;
            case "COMPLETE":
                return <CheckCircle2 className="w-4 h-4 text-purple-400" />;
            default:
                return <ArrowRight className="w-4 h-4 text-neutral-400" />;
        }
    };
    
    const getActionColor = () => {
        switch (action.type) {
            case "CREATE":
                return "border-green-500/30 bg-green-500/5";
            case "UPDATE":
                return "border-blue-500/30 bg-blue-500/5";
            case "COMPLETE":
                return "border-purple-500/30 bg-purple-500/5";
            default:
                return "border-neutral-700 bg-neutral-800/50";
        }
    };
    
    const getActionDescription = () => {
        switch (action.type) {
            case "CREATE":
                return (
                    <div className="space-y-1">
                        <p className="text-sm text-white font-medium">
                            Create: {action.task?.title}
                        </p>
                        {action.task?.description && (
                            <p className="text-xs text-neutral-400 line-clamp-1">
                                {action.task.description}
                            </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                            {action.task?.dueDate && (
                                <span>Due: {action.task.dueDate}</span>
                            )}
                            {action.task?.priority && (
                                <span className={`capitalize ${
                                    action.task.priority === "high" ? "text-red-400" :
                                    action.task.priority === "low" ? "text-green-400" :
                                    "text-yellow-400"
                                }`}>
                                    {action.task.priority}
                                </span>
                            )}
                        </div>
                    </div>
                );
            
            case "UPDATE":
                return (
                    <div className="space-y-1">
                        <p className="text-sm text-white font-medium">
                            Update task
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {action.updates?.status && (
                                <span className="px-2 py-0.5 bg-neutral-700 rounded">
                                    Status → {action.updates.status}
                                </span>
                            )}
                            {action.updates?.priority && (
                                <span className="px-2 py-0.5 bg-neutral-700 rounded">
                                    Priority → {action.updates.priority}
                                </span>
                            )}
                            {action.updates?.note && (
                                <span className="px-2 py-0.5 bg-neutral-700 rounded truncate max-w-[200px]">
                                    Note: {action.updates.note}
                                </span>
                            )}
                        </div>
                    </div>
                );
            
            case "COMPLETE":
                return (
                    <p className="text-sm text-white font-medium">
                        Mark as complete
                    </p>
                );
            
            default:
                return null;
        }
    };
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`flex items-start gap-3 p-3 rounded-lg border ${getActionColor()}`}
        >
            <div className="mt-0.5">{getActionIcon()}</div>
            <div className="flex-1 min-w-0">{getActionDescription()}</div>
            <button
                onClick={onRemove}
                className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                title="Remove action"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
