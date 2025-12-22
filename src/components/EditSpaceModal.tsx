import { Space, SpaceTheme } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface EditSpaceModalProps {
    space: Space | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (spaceId: string, updates: Partial<Space>) => void;
}

const THEMES = [
    { id: "blue", color: "var(--accent-blue)", gradient: "from-blue-500/10 to-blue-600/5" },
    { id: "purple", color: "var(--accent-purple)", gradient: "from-purple-500/10 to-purple-600/5" },
    { id: "pink", color: "var(--accent-pink)", gradient: "from-pink-500/10 to-pink-600/5" },
    { id: "emerald", color: "#10b981", gradient: "from-emerald-500/10 to-emerald-600/5" },
    { id: "amber", color: "#f59e0b", gradient: "from-amber-500/10 to-amber-600/5" },
    { id: "cyan", color: "#06b6d4", gradient: "from-cyan-500/10 to-cyan-600/5" },
    { id: "default", color: "#ffffff", gradient: "from-white/5 to-white/0" },
];

export default function EditSpaceModal({ space, isOpen, onClose, onSave }: EditSpaceModalProps) {
    const [name, setName] = useState("");
    const [theme, setTheme] = useState<SpaceTheme>("default");

    useEffect(() => {
        if (space) {
            if (space.name !== name) setName(space.name);
            if (space.theme !== theme) setTheme(space.theme);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [space]);

    const handleSave = () => {
        if (space) {
            onSave(space.id, { name, theme });
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && space && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-white/10 p-4">
                                <h2 className="text-lg font-semibold text-white">Edit Space</h2>
                                <button onClick={onClose} className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40">
                                        Space Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-lg bg-white/5 p-3 text-white placeholder-white/20 outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-3 block text-xs font-medium uppercase tracking-wider text-white/40">
                                        Theme Color
                                    </label>
                                    <div className="grid grid-cols-7 gap-2">
                                        {THEMES.map((t) => (
                                            <motion.button
                                                key={t.id}
                                                onClick={() => setTheme(t.id)}
                                                whileHover={{ scale: 1.15 }}
                                                whileTap={{ scale: 0.95 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                className={`relative h-12 w-12 rounded-xl transition-all ${
                                                    theme === t.id 
                                                        ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a] scale-110" 
                                                        : "ring-1 ring-white/10 hover:ring-white/30"
                                                }`}
                                                style={{ backgroundColor: t.color }}
                                            >
                                                {theme === t.id && (
                                                    <motion.div
                                                        layoutId="theme-selected"
                                                        className="absolute inset-0 rounded-xl border-2 border-white"
                                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                                    />
                                                )}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <motion.button
                                        onClick={handleSave}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                        className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 py-3.5 font-semibold text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                                    >
                                        Save Changes
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
