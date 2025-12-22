"use client";

/**
 * VoiceInput Component
 * 
 * Voice recording button with visual feedback.
 * Handles microphone permission, recording state, and audio level visualization.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MicOff, Square, Loader2, AlertCircle } from "lucide-react";
import { VoiceWaveIcon } from "@/components/icons/CustomIcons";
import {
    AudioRecorder,
    RecordingState,
    RecordingResult,
    RecorderError,
    isRecordingSupported,
    requestMicrophonePermission,
    formatDuration,
} from "@/lib/audio/recorder";

interface VoiceInputProps {
    onRecordingComplete: (result: RecordingResult) => void;
    onError?: (error: RecorderError) => void;
    maxDuration?: number; // in seconds
    disabled?: boolean;
    className?: string;
}

export default function VoiceInput({
    onRecordingComplete,
    onError,
    maxDuration = 120,
    disabled = false,
    className = "",
}: VoiceInputProps) {
    const [isSupported, setIsSupported] = useState(true);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [recordingState, setRecordingState] = useState<RecordingState>({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioLevel: 0,
    });
    const [error, setError] = useState<string | null>(null);
    
    const recorderRef = useRef<AudioRecorder | null>(null);
    
    // Check browser support on mount
    useEffect(() => {
        setIsSupported(isRecordingSupported());
    }, []);
    
    // Initialize recorder - use ref for callbacks to avoid recreating on every render
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;
    
    useEffect(() => {
        recorderRef.current = new AudioRecorder({
            maxDuration,
            onStateChange: (state) => {
                setRecordingState(state);
            },
            onError: (err) => {
                setError(err.message);
                onErrorRef.current?.(err);
            },
        });
        
        return () => {
            recorderRef.current?.cancel();
        };
    }, [maxDuration]); // Only recreate when maxDuration changes
    
    // Handle recording toggle
    const handleToggleRecording = useCallback(async () => {
        if (disabled || !isSupported) return;
        
        setError(null);
        
        const recorder = recorderRef.current;
        if (!recorder) return;
        
        if (recordingState.isRecording) {
            // Stop recording
            const result = await recorder.stop();
            if (result) {
                onRecordingComplete(result);
            }
        } else {
            // Check/request permission first
            if (hasPermission === null) {
                const granted = await requestMicrophonePermission();
                setHasPermission(granted);
                
                if (!granted) {
                    setError("Microphone access is required for voice logging.");
                    return;
                }
            } else if (!hasPermission) {
                setError("Microphone access is required for voice logging.");
                return;
            }
            
            // Start recording
            await recorder.start();
        }
    }, [disabled, isSupported, recordingState.isRecording, hasPermission, onRecordingComplete]);
    
    // Handle cancel
    const handleCancel = useCallback(() => {
        recorderRef.current?.cancel();
        setError(null);
    }, []);
    
    // Not supported
    if (!isSupported) {
        return (
            <div className={`flex items-center gap-2 text-neutral-500 ${className}`}>
                <MicOff className="w-5 h-5" />
                <span className="text-sm">Voice recording not supported</span>
            </div>
        );
    }
    
    const isRecording = recordingState.isRecording;
    const duration = recordingState.duration;
    const audioLevel = recordingState.audioLevel;
    
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Error message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-2 text-red-400 text-sm"
                    >
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Recording indicator */}
            <AnimatePresence>
                {isRecording && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-3"
                    >
                        {/* Duration */}
                        <span className="text-white font-mono text-sm min-w-[50px]">
                            {formatDuration(duration)}
                        </span>
                        
                        {/* Audio level visualization */}
                        <div className="flex items-center gap-0.5 h-6">
                            {[...Array(8)].map((_, i) => {
                                // Calculate target height based on audio level
                                // Each bar has a different sensitivity threshold
                                const sensitivity = 1 - (i / 8); // First bars more sensitive
                                const scaledLevel = audioLevel * (1 + sensitivity);
                                const minHeight = 4;
                                const maxHeight = 24;
                                const targetHeight = Math.max(
                                    minHeight,
                                    Math.min(maxHeight, minHeight + scaledLevel * (maxHeight - minHeight))
                                );
                                const isActive = audioLevel > 0.02; // Any sound detected
                                
                                return (
                                    <motion.div
                                        key={i}
                                        className={`w-1 rounded-full ${
                                            isActive ? "bg-green-400" : "bg-neutral-600"
                                        }`}
                                        animate={{ height: targetHeight }}
                                        transition={{ 
                                            type: "spring", 
                                            stiffness: 300, 
                                            damping: 20,
                                            mass: 0.5
                                        }}
                                    />
                                );
                            })}
                        </div>
                        
                        {/* Cancel button */}
                        <button
                            onClick={handleCancel}
                            className="text-neutral-400 hover:text-red-400 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Main recording button */}
            <motion.button
                onClick={handleToggleRecording}
                disabled={disabled}
                className={`
                    relative p-3 rounded-full transition-all
                    ${isRecording
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-[#2a2a2a] hover:bg-[#333] border border-neutral-700"
                    }
                    ${disabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
                whileHover={{ scale: disabled ? 1 : 1.05 }}
                whileTap={{ scale: disabled ? 1 : 0.95 }}
            >
                {/* Pulsing ring when recording */}
                {isRecording && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-red-500"
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                )}
                
                {/* Icon */}
                {isRecording ? (
                    <Square className="w-5 h-5 text-white relative z-10" />
                ) : (
                    <VoiceWaveIcon className="w-5 h-5 relative z-10" animate={recordingState.audioLevel > 0} />
                )}
            </motion.button>
            
            {/* Hint text */}
            {!isRecording && !error && (
                <span className="text-neutral-500 text-sm hidden sm:inline">
                    {hasPermission === false
                        ? "Microphone blocked"
                        : "Voice log"
                    }
                </span>
            )}
        </div>
    );
}

/**
 * Compact Voice Input variant for inline use
 */
export function VoiceInputCompact({
    onRecordingComplete,
    onError,
    maxDuration = 120,
    disabled = false,
}: Omit<VoiceInputProps, "className">) {
    const [isSupported, setIsSupported] = useState(true);
    const [recordingState, setRecordingState] = useState<RecordingState>({
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioLevel: 0,
    });
    const [isProcessing, setIsProcessing] = useState(false);
    
    const recorderRef = useRef<AudioRecorder | null>(null);
    
    useEffect(() => {
        setIsSupported(isRecordingSupported());
    }, []);
    
    useEffect(() => {
        recorderRef.current = new AudioRecorder({
            maxDuration,
            onStateChange: setRecordingState,
            onError,
        });
        
        return () => {
            recorderRef.current?.cancel();
        };
    }, [maxDuration, onError]);
    
    const handleToggle = useCallback(async () => {
        if (disabled || !isSupported) return;
        
        const recorder = recorderRef.current;
        if (!recorder) return;
        
        if (recordingState.isRecording) {
            setIsProcessing(true);
            const result = await recorder.stop();
            setIsProcessing(false);
            if (result) {
                onRecordingComplete(result);
            }
        } else {
            const granted = await requestMicrophonePermission();
            if (granted) {
                await recorder.start();
            }
        }
    }, [disabled, isSupported, recordingState.isRecording, onRecordingComplete]);
    
    if (!isSupported) {
        return null;
    }
    
    const isRecording = recordingState.isRecording;
    
    return (
        <motion.button
            onClick={handleToggle}
            disabled={disabled || isProcessing}
            className={`
                p-2 rounded-lg transition-colors
                ${isRecording
                    ? "bg-red-500/20 text-red-400"
                    : "hover:bg-neutral-700 text-neutral-400 hover:text-white"
                }
                ${disabled || isProcessing ? "opacity-50 cursor-not-allowed" : ""}
            `}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            title={isRecording ? "Stop recording" : "Start voice log"}
        >
            {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
                <Square className="w-4 h-4" />
            ) : (
                <VoiceWaveIcon className="w-4 h-4" animate={recordingState.audioLevel > 0} />
            )}
        </motion.button>
    );
}
