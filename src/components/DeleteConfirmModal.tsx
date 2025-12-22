/**
 * Delete Confirmation Modal
 * 
 * Premium confirmation dialog for destructive actions
 */

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Trash2 } from "lucide-react";

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
}

export default function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Delete Space?",
    message = "Are you sure you want to delete this space? This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel",
}: DeleteConfirmModalProps) {
    const handleConfirm = () => {
        onConfirm();
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
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full max-w-md overflow-hidden rounded-2xl glass-card border border-red-500/20 shadow-2xl shadow-red-500/10">
                            {/* Icon */}
                            <div className="flex justify-center pt-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ 
                                        type: "spring", 
                                        stiffness: 150, 
                                        damping: 20,
                                        delay: 0.15,
                                        duration: 0.5
                                    }}
                                    className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30"
                                >
                                    <AlertCircle className="h-8 w-8 text-red-400" />
                                </motion.div>
                            </div>

                            {/* Content */}
                            <div className="p-6 text-center">
                                <motion.h3
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
                                    className="text-xl font-bold text-white mb-2"
                                >
                                    {title}
                                </motion.h3>
                                
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                                    className="text-white/60 text-sm leading-relaxed"
                                >
                                    {message}
                                </motion.p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 p-6 pt-0">
                                <motion.button
                                    onClick={onClose}
                                    whileHover={{ scale: 1.02, y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white hover:bg-white/10 transition-all duration-300"
                                >
                                    {cancelText}
                                </motion.button>
                                <motion.button
                                    onClick={handleConfirm}
                                    whileHover={{ scale: 1.02, y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-4 py-3 font-semibold text-white hover:from-red-600 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {confirmText}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
