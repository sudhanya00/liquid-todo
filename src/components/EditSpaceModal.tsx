import { Space } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface EditSpaceModalProps {
    space: Space | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (spaceId: string, updates: Partial<Space>) => void;
}

const THEMES = ["blue", "purple", "pink", "default"];

export default function EditSpaceModal({ space, isOpen, onClose, onSave }: EditSpaceModalProps) {
    const [name, setName] = useState("");
    const [theme, setTheme] = useState("default");

    useEffect(() => {
        if (space) {
            if (space.name !== name) setName(space.name);
            if (space.theme !== theme) setTheme(space.theme as "blue" | "purple" | "pink" | "default");
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
                                    <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/40">
                                        Theme Color
                                    </label>
                                    <div className="flex gap-3">
                                        {THEMES.map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setTheme(t)}
                                                className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${theme === t ? "border-white scale-110" : "border-transparent"
                                                    }`}
                                                style={{
                                                    backgroundColor:
                                                        t === "blue" ? "var(--accent-blue)" :
                                                            t === "purple" ? "var(--accent-purple)" :
                                                                t === "pink" ? "var(--accent-pink)" :
                                                                    "#ffffff"
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleSave}
                                        className="w-full rounded-xl bg-[var(--accent-blue)] py-3 font-medium text-white hover:opacity-90"
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
