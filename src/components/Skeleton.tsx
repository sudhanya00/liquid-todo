/**
 * Skeleton Loader Components
 * 
 * Reusable skeleton loaders that match the shape of actual content.
 */

import { motion } from "framer-motion";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <motion.div
            className={`bg-white/5 rounded animate-pulse ${className}`}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
        />
    );
}

export function TaskSkeleton() {
    return (
        <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 flex-1 max-w-xs" />
            </div>
        </div>
    );
}

export function TaskListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <TaskSkeleton key={i} />
            ))}
        </div>
    );
}

export function SpaceCardSkeleton() {
    return (
        <div className="glass-card rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
            </div>
        </div>
    );
}

export function SpaceGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <SpaceCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-4 ${
                        i === lines - 1 ? "w-3/4" : "w-full"
                    }`}
                />
            ))}
        </div>
    );
}

export function AvatarSkeleton() {
    return <Skeleton className="h-10 w-10 rounded-full" />;
}

export function ButtonSkeleton() {
    return <Skeleton className="h-10 w-24 rounded-lg" />;
}
