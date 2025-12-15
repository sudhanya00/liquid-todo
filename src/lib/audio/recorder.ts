/**
 * Audio Recorder
 * 
 * Handles voice recording using the MediaRecorder API.
 * Supports multiple audio formats with automatic fallback.
 */

export interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number; // in seconds
    audioLevel: number; // 0-1 normalized
}

export interface RecordingResult {
    blob: Blob;
    duration: number;
    mimeType: string;
}

export interface RecorderOptions {
    maxDuration?: number; // Maximum recording duration in seconds (default: 120)
    onStateChange?: (state: RecordingState) => void;
    onAudioLevel?: (level: number) => void;
    onError?: (error: RecorderError) => void;
}

export interface RecorderError {
    code: "PERMISSION_DENIED" | "NOT_SUPPORTED" | "ALREADY_RECORDING" | "NO_RECORDING" | "UNKNOWN";
    message: string;
}

// Supported MIME types in order of preference
const SUPPORTED_MIME_TYPES = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
];

/**
 * Get the best supported MIME type for the browser
 */
export function getSupportedMimeType(): string | null {
    if (typeof MediaRecorder === "undefined") return null;
    
    for (const mimeType of SUPPORTED_MIME_TYPES) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType;
        }
    }
    
    return null;
}

/**
 * Check if the browser supports audio recording
 */
export function isRecordingSupported(): boolean {
    return (
        typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices !== "undefined" &&
        typeof navigator.mediaDevices.getUserMedia === "function" &&
        typeof MediaRecorder !== "undefined" &&
        getSupportedMimeType() !== null
    );
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<boolean> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
        return true;
    } catch (error) {
        console.error("Microphone permission denied:", error);
        return false;
    }
}

/**
 * Audio Recorder Class
 */
export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private chunks: Blob[] = [];
    private startTime: number = 0;
    private pausedDuration: number = 0;
    private pauseStartTime: number = 0;
    private animationFrameId: number | null = null;
    private maxDurationTimeout: NodeJS.Timeout | null = null;
    
    private options: RecorderOptions;
    private state: RecordingState = {
        isRecording: false,
        isPaused: false,
        duration: 0,
        audioLevel: 0,
    };
    
    constructor(options: RecorderOptions = {}) {
        this.options = {
            maxDuration: 120, // 2 minutes default
            ...options,
        };
    }
    
    /**
     * Get current recording state
     */
    getState(): RecordingState {
        return { ...this.state };
    }
    
    /**
     * Start recording
     */
    async start(): Promise<void> {
        if (this.state.isRecording) {
            this.emitError({
                code: "ALREADY_RECORDING",
                message: "Recording is already in progress.",
            });
            return;
        }
        
        const mimeType = getSupportedMimeType();
        if (!mimeType) {
            this.emitError({
                code: "NOT_SUPPORTED",
                message: "Audio recording is not supported in this browser.",
            });
            return;
        }
        
        try {
            // Get audio stream
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            
            // Set up audio analyzer for level monitoring
            this.setupAudioAnalyzer();
            
            // Create media recorder
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType,
                audioBitsPerSecond: 128000,
            });
            
            this.chunks = [];
            this.startTime = Date.now();
            this.pausedDuration = 0;
            
            // Handle data available
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.chunks.push(event.data);
                }
            };
            
            // Handle stop
            this.mediaRecorder.onstop = () => {
                this.cleanup();
            };
            
            // Handle error
            this.mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event);
                this.emitError({
                    code: "UNKNOWN",
                    message: "An error occurred during recording.",
                });
                this.cleanup();
            };
            
            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms
            
            // Update state
            this.state = {
                isRecording: true,
                isPaused: false,
                duration: 0,
                audioLevel: 0,
            };
            this.emitStateChange();
            
            // Start duration tracking
            this.trackDuration();
            
            // Set max duration timeout
            if (this.options.maxDuration) {
                this.maxDurationTimeout = setTimeout(() => {
                    this.stop();
                }, this.options.maxDuration * 1000);
            }
            
        } catch (error) {
            console.error("Failed to start recording:", error);
            
            if (error instanceof DOMException && error.name === "NotAllowedError") {
                this.emitError({
                    code: "PERMISSION_DENIED",
                    message: "Microphone access was denied. Please allow microphone access and try again.",
                });
            } else {
                this.emitError({
                    code: "UNKNOWN",
                    message: "Failed to start recording. Please try again.",
                });
            }
        }
    }
    
    /**
     * Pause recording
     */
    pause(): void {
        if (!this.state.isRecording || this.state.isPaused) return;
        
        if (this.mediaRecorder?.state === "recording") {
            this.mediaRecorder.pause();
            this.pauseStartTime = Date.now();
            this.state.isPaused = true;
            this.emitStateChange();
        }
    }
    
    /**
     * Resume recording
     */
    resume(): void {
        if (!this.state.isRecording || !this.state.isPaused) return;
        
        if (this.mediaRecorder?.state === "paused") {
            this.mediaRecorder.resume();
            this.pausedDuration += Date.now() - this.pauseStartTime;
            this.state.isPaused = false;
            this.emitStateChange();
        }
    }
    
    /**
     * Stop recording and return the result
     */
    async stop(): Promise<RecordingResult | null> {
        if (!this.mediaRecorder || !this.state.isRecording) {
            this.emitError({
                code: "NO_RECORDING",
                message: "No recording in progress.",
            });
            return null;
        }
        
        // Clear max duration timeout
        if (this.maxDurationTimeout) {
            clearTimeout(this.maxDurationTimeout);
            this.maxDurationTimeout = null;
        }
        
        return new Promise((resolve) => {
            const mimeType = this.mediaRecorder!.mimeType;
            
            this.mediaRecorder!.onstop = () => {
                const duration = this.state.duration;
                this.cleanup();
                
                if (this.chunks.length === 0) {
                    resolve(null);
                    return;
                }
                
                const blob = new Blob(this.chunks, { type: mimeType });
                
                resolve({
                    blob,
                    duration,
                    mimeType,
                });
            };
            
            this.mediaRecorder!.stop();
        });
    }
    
    /**
     * Cancel recording without saving
     */
    cancel(): void {
        if (this.maxDurationTimeout) {
            clearTimeout(this.maxDurationTimeout);
            this.maxDurationTimeout = null;
        }
        
        if (this.mediaRecorder && this.state.isRecording) {
            this.mediaRecorder.onstop = () => {
                this.cleanup();
            };
            this.mediaRecorder.stop();
        } else {
            this.cleanup();
        }
        
        this.chunks = [];
    }
    
    /**
     * Set up audio analyzer for level monitoring
     */
    private setupAudioAnalyzer(): void {
        if (!this.audioStream) return;
        
        try {
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            source.connect(this.analyser);
            
            this.monitorAudioLevel();
        } catch (error) {
            console.warn("Failed to set up audio analyzer:", error);
        }
    }
    
    /**
     * Monitor audio level for visualization
     */
    private monitorAudioLevel(): void {
        if (!this.analyser || !this.state.isRecording) return;
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate RMS (Root Mean Square) for better audio level detection
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalizedLevel = Math.min(1, rms / 128);
        
        this.state.audioLevel = normalizedLevel;
        this.options.onAudioLevel?.(normalizedLevel);
        this.emitStateChange(); // Emit state change so UI updates
        
        if (this.state.isRecording && !this.state.isPaused) {
            this.animationFrameId = requestAnimationFrame(() => this.monitorAudioLevel());
        }
    }
    
    /**
     * Track recording duration
     */
    private trackDuration(): void {
        if (!this.state.isRecording) return;
        
        const updateDuration = () => {
            if (!this.state.isRecording) return;
            
            if (!this.state.isPaused) {
                const elapsed = Date.now() - this.startTime - this.pausedDuration;
                this.state.duration = Math.floor(elapsed / 1000);
                this.emitStateChange();
            }
            
            setTimeout(updateDuration, 100);
        };
        
        updateDuration();
    }
    
    /**
     * Clean up resources
     */
    private cleanup(): void {
        // Stop animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Stop audio tracks
        if (this.audioStream) {
            this.audioStream.getTracks().forEach((track) => track.stop());
            this.audioStream = null;
        }
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== "closed") {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.analyser = null;
        this.mediaRecorder = null;
        
        // Reset state
        this.state = {
            isRecording: false,
            isPaused: false,
            duration: 0,
            audioLevel: 0,
        };
        this.emitStateChange();
    }
    
    /**
     * Emit state change
     */
    private emitStateChange(): void {
        this.options.onStateChange?.({ ...this.state });
    }
    
    /**
     * Emit error
     */
    private emitError(error: RecorderError): void {
        this.options.onError?.(error);
    }
}

/**
 * Format duration as MM:SS
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Convert audio blob to base64
 */
export async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove data URL prefix (e.g., "data:audio/webm;base64,")
            const base64Data = base64.split(",")[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
