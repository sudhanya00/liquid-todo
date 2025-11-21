"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import clsx from "clsx";

interface TaskInputProps {
    onSubmit: (text: string) => void;
    isProcessing?: boolean;
}

export default function TaskInput({ onSubmit, isProcessing }: TaskInputProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = () => {
        if (!input.trim() || isProcessing) return;
        onSubmit(input);
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    }, [input]);

    return (
        <div className="relative w-full">
            <div className="glass-input relative flex items-center gap-3 rounded-2xl p-5 transition-all focus-within:ring-2 focus-within:ring-[var(--accent-blue)] shadow-lg">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What do you need to get done?"
                    className="max-h-40 min-h-[28px] w-full resize-none bg-transparent text-[17px] leading-relaxed text-white placeholder:text-white/40 focus:outline-none font-medium"
                    rows={1}
                    disabled={isProcessing}
                />

                <button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isProcessing}
                    className={clsx(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all shadow-md",
                        input.trim() && !isProcessing
                            ? "bg-[var(--accent-blue)] text-black hover:scale-105 active:scale-95 shadow-blue-500/30"
                            : "bg-white/10 text-white/30 cursor-not-allowed"
                    )}
                >
                    {isProcessing ? (
                        <Sparkles className="h-5 w-5 animate-spin" />
                    ) : (
                        <Send className="h-5 w-5" />
                    )}
                </button>
            </div>
        </div>
    );
}
