/**
 * Empty State Component
 * 
 * Reusable component for displaying empty states with actions.
 */

import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { ComponentType, SVGProps } from "react";

interface EmptyStateProps {
    icon: LucideIcon | ComponentType<SVGProps<SVGSVGElement> & { animate?: boolean }>;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = "",
}: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
        >
            <motion.div 
                className="flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 250, damping: 20, duration: 0.3 }}
            >
                <Icon className="w-8 h-8 text-white/30" />
            </motion.div>
            
            <h3 className="text-lg font-semibold text-white mb-2">
                {title}
            </h3>
            
            <p className="text-sm text-white/50 max-w-sm mb-6">
                {description}
            </p>
            
            {action && (
                <motion.button
                    onClick={action.onClick}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {action.label}
                </motion.button>
            )}
        </motion.div>
    );
}
