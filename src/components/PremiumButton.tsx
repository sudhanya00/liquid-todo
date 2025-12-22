/**
 * Premium Button Component
 * 
 * Button with Apple-like polish: smooth animations, haptic-style feedback,
 * and attention to detail in every interaction.
 */

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface PremiumButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
    children: ReactNode;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    icon?: ReactNode;
    iconPosition?: "left" | "right";
}

export default function PremiumButton({
    children,
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    iconPosition = "left",
    className = "",
    disabled,
    ...props
}: PremiumButtonProps) {
    const variants = {
        primary: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25",
        secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
        ghost: "bg-transparent hover:bg-white/5 text-white/70 hover:text-white",
        danger: "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg shadow-red-500/25",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2.5 text-base",
        lg: "px-6 py-3.5 text-lg",
    };

    return (
        <motion.button
            className={`
                relative
                inline-flex items-center justify-center gap-2
                font-medium rounded-xl
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]}
                ${sizes[size]}
                ${className}
            `}
            whileHover={disabled || loading ? undefined : { scale: 1.02, y: -1 }}
            whileTap={disabled || loading ? undefined : { scale: 0.98 }}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                </>
            ) : (
                <>
                    {icon && iconPosition === "left" && (
                        <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {icon}
                        </motion.span>
                    )}
                    <span>{children}</span>
                    {icon && iconPosition === "right" && (
                        <motion.span
                            initial={{ opacity: 0, x: 4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {icon}
                        </motion.span>
                    )}
                </>
            )}

            {/* Ripple effect on click */}
            {!disabled && !loading && (
                <motion.span
                    className="absolute inset-0 rounded-xl bg-white/20"
                    initial={{ scale: 0, opacity: 1 }}
                    whileTap={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                />
            )}
        </motion.button>
    );
}
