/**
 * Error Boundary Component
 * 
 * Catches React errors and displays a fallback UI instead of crashing the app.
 * Prevents white screen of death.
 */

"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        
        this.setState({
            error,
            errorInfo,
        });

        // TODO: Log to error tracking service (Sentry, LogRocket, etc.)
        // logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a0a1e] via-[#1a1a3e] to-[#0a0a1e]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center"
                    >
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-red-500/10 rounded-full">
                                <AlertTriangle className="w-12 h-12 text-red-400" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-3">
                            Oops! Something went wrong
                        </h1>
                        
                        <p className="text-white/60 mb-6">
                            We encountered an unexpected error. Don't worry, your data is safe.
                        </p>

                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="cursor-pointer text-sm text-white/40 hover:text-white/60 mb-2">
                                    Error details (dev only)
                                </summary>
                                <div className="p-3 bg-black/20 rounded-lg text-xs text-red-300 font-mono overflow-auto max-h-40">
                                    <div className="mb-2 font-bold">{this.state.error.name}:</div>
                                    <div className="mb-2">{this.state.error.message}</div>
                                    {this.state.error.stack && (
                                        <pre className="text-[10px] text-white/30 whitespace-pre-wrap">
                                            {this.state.error.stack}
                                        </pre>
                                    )}
                                </div>
                            </details>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                        </div>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
