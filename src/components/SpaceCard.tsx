import { Space } from "@/types";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil } from "lucide-react";
import clsx from "clsx";

interface SpaceCardProps {
    space?: Space;
    isNew?: boolean;
    onClick?: () => void;
    onDelete?: (e: React.MouseEvent) => void;
    onEdit?: (e: React.MouseEvent) => void;
}

export default function SpaceCard({ space, isNew, onClick, onDelete, onEdit }: SpaceCardProps) {
    if (isNew) {
        return (
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClick}
                className="glass-card flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-dashed border-white/20 hover:bg-white/5"
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                    <Plus className="h-6 w-6 text-white/70" />
                </div>
                <span className="mt-2 text-sm font-medium text-white/50">New Space</span>
            </motion.div>
        );
    }

    if (!space) return null;

    const accentColors: Record<string, string> = {
        blue: "border-l-4 border-l-[var(--accent-blue)]",
        purple: "border-l-4 border-l-[var(--accent-purple)]",
        pink: "border-l-4 border-l-[var(--accent-pink)]",
        default: "border-l-4 border-l-white/50",
    };

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={clsx(
                "glass-card relative flex h-40 w-full cursor-pointer flex-col justify-between rounded-2xl p-5 transition-colors hover:bg-white/5",
                accentColors[space.theme] || accentColors.default
            )}
        >
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-white">{space.name}</h3>
                    <div className="flex gap-1">
                        {onEdit && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(e);
                                }}
                                className="p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(e);
                                }}
                                className="p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-xs text-white/50">Updated just now</p>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                    {/* Placeholder for task count or avatars */}
                    <div className="h-6 w-6 rounded-full bg-white/10 ring-2 ring-black" />
                    <div className="h-6 w-6 rounded-full bg-white/10 ring-2 ring-black" />
                </div>

                {/* Progress Indicator Bubble */}
                <div className={clsx(
                    "h-3 w-3 rounded-full shadow-[0_0_10px]",
                    space.theme === 'blue' && "bg-[var(--accent-blue)] shadow-[var(--accent-blue)]",
                    space.theme === 'purple' && "bg-[var(--accent-purple)] shadow-[var(--accent-purple)]",
                    space.theme === 'pink' && "bg-[var(--accent-pink)] shadow-[var(--accent-pink)]",
                    space.theme === 'default' && "bg-white shadow-white"
                )} />
            </div>
        </motion.div>
    );
}
