import { Space } from "@/types";
import { motion } from "framer-motion";
import { Trash2, Pencil } from "lucide-react";
import { PlusIcon, FolderIcon } from "@/components/icons/CustomIcons";
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
                    <PlusIcon className="h-6 w-6 text-white/70" />
                </div>
                <span className="mt-2 text-sm font-medium text-white/50">New Space</span>
            </motion.div>
        );
    }

    if (!space) return null;

    const themeStyles: Record<string, { border: string; gradient: string; glow: string; dot: string }> = {
        blue: { 
            border: "border-l-4 border-l-[var(--accent-blue)]",
            gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
            glow: "shadow-blue-500/10",
            dot: "bg-[var(--accent-blue)] shadow-[var(--accent-blue)]"
        },
        purple: { 
            border: "border-l-4 border-l-[var(--accent-purple)]",
            gradient: "from-purple-500/10 via-purple-500/5 to-transparent",
            glow: "shadow-purple-500/10",
            dot: "bg-[var(--accent-purple)] shadow-[var(--accent-purple)]"
        },
        pink: { 
            border: "border-l-4 border-l-[var(--accent-pink)]",
            gradient: "from-pink-500/10 via-pink-500/5 to-transparent",
            glow: "shadow-pink-500/10",
            dot: "bg-[var(--accent-pink)] shadow-[var(--accent-pink)]"
        },
        emerald: { 
            border: "border-l-4 border-l-emerald-500",
            gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
            glow: "shadow-emerald-500/10",
            dot: "bg-emerald-500 shadow-emerald-500"
        },
        amber: { 
            border: "border-l-4 border-l-amber-500",
            gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
            glow: "shadow-amber-500/10",
            dot: "bg-amber-500 shadow-amber-500"
        },
        cyan: { 
            border: "border-l-4 border-l-cyan-500",
            gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
            glow: "shadow-cyan-500/10",
            dot: "bg-cyan-500 shadow-cyan-500"
        },
        default: { 
            border: "border-l-4 border-l-white/50",
            gradient: "from-white/5 via-white/2 to-transparent",
            glow: "shadow-white/5",
            dot: "bg-white shadow-white"
        },
    };

    const currentTheme = themeStyles[space.theme] || themeStyles.default;

    return (
        <motion.div
            whileHover={{ 
                scale: 1.02,
                y: -4,
                transition: { type: "spring", stiffness: 200, damping: 25, duration: 0.4 }
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.3 }}
            onClick={onClick}
            className={clsx(
                "glass-card relative flex h-40 w-full cursor-pointer flex-col justify-between rounded-2xl p-5 transition-all hover:shadow-2xl",
                currentTheme.border,
                `hover:${currentTheme.glow}`
            )}
        >
            {/* Theme gradient background */}
            <div className={clsx(
                "absolute inset-0 rounded-2xl bg-gradient-to-br pointer-events-none opacity-60",
                currentTheme.gradient
            )} />
            
            {/* Hover gradient overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none"
            />
            
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-white">{space.name}</h3>
                    <div className="flex gap-1">
                        {onEdit && (
                            <motion.button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(e);
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                            >
                                <Pencil className="h-4 w-4" />
                            </motion.button>
                        )}
                        {onDelete && (
                            <motion.button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(e);
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="p-1.5 rounded-full hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </motion.button>
                        )}
                    </div>
                </div>
                <p className="text-xs text-white/50">Updated just now</p>
            </div>

            <div className="relative z-10 flex items-center justify-between">
                <div className="flex -space-x-2">
                    {/* Placeholder for task count or avatars */}
                    <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className="h-6 w-6 rounded-full bg-white/10 ring-2 ring-black"
                    />
                    <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className="h-6 w-6 rounded-full bg-white/10 ring-2 ring-black"
                    />
                </div>

                {/* Progress Indicator Bubble */}
                <motion.div 
                    animate={{
                        scale: [1, 1.2, 1],
                        transition: {
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }
                    }}
                    className={clsx(
                        "h-3 w-3 rounded-full shadow-[0_0_10px]",
                        currentTheme.dot
                    )} 
                />
            </div>
        </motion.div>
    );
}
