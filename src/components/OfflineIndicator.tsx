/**
 * OfflineIndicator Component
 * 
 * Shows offline status and pending sync operations
 */

import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, CloudOff, RefreshCw } from "lucide-react";

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingOperations: number;
  onSync?: () => void;
}

export function OfflineIndicator({ isOnline, pendingOperations, onSync }: OfflineIndicatorProps) {
  if (isOnline && pendingOperations === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50"
      >
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/80 px-4 py-2 backdrop-blur-sm">
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-400">Offline Mode</span>
            </>
          ) : pendingOperations > 0 ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              <span className="text-sm text-blue-400">
                Syncing {pendingOperations} {pendingOperations === 1 ? "change" : "changes"}...
              </span>
            </>
          ) : (
            <>
              <CloudOff className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Working offline</span>
            </>
          )}
          
          {pendingOperations > 0 && onSync && (
            <button
              onClick={onSync}
              className="ml-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
