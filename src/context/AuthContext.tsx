"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    AuthError,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { getUserPlan } from "@/lib/entitlements";

// Auth state machine states
type AuthState = "initializing" | "authenticated" | "unauthenticated";

// Human-readable error messages
const AUTH_ERROR_MESSAGES: Record<string, string> = {
    "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/operation-not-allowed": "This sign-in method is not enabled.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-blocked": "Sign-in popup was blocked. Please allow popups and try again.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/network-request-failed": "Network error. Please check your connection.",
    default: "An error occurred. Please try again.",
};

function getAuthErrorMessage(error: AuthError): string {
    return AUTH_ERROR_MESSAGES[error.code] || AUTH_ERROR_MESSAGES.default;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    authState: AuthState;
    error: string | null;
    
    // Auth methods
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    resendVerificationEmail: () => Promise<void>;
    
    // State management
    clearError: () => void;
    
    // Derived state
    isEmailVerified: boolean;
    needsEmailVerification: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    authState: "initializing",
    error: null,
    signInWithGoogle: async () => {},
    signInWithEmail: async () => {},
    signUpWithEmail: async () => {},
    logout: async () => {},
    resetPassword: async () => {},
    resendVerificationEmail: async () => {},
    clearError: () => {},
    isEmailVerified: false,
    needsEmailVerification: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authState, setAuthState] = useState<AuthState>("initializing");
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Initialize auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            
            if (firebaseUser) {
                setAuthState("authenticated");
                
                // Initialize user plan if not exists (for new users)
                try {
                    await getUserPlan(firebaseUser.uid);
                } catch (e) {
                    console.error("Failed to initialize user plan:", e);
                }
            } else {
                setAuthState("unauthenticated");
            }
            
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const clearError = useCallback(() => setError(null), []);

    const signInWithGoogle = useCallback(async () => {
        setError(null);
        setLoading(true);
        
        try {
            await signInWithPopup(auth, googleProvider);
            router.push("/");
        } catch (err) {
            const authError = err as AuthError;
            setError(getAuthErrorMessage(authError));
            console.error("Google sign-in error:", authError.code);
        } finally {
            setLoading(false);
        }
    }, [router]);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        setError(null);
        setLoading(true);
        
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            
            // Check if email is verified (optional enforcement)
            if (!result.user.emailVerified) {
                // Allow login but show warning
                console.warn("User email not verified");
            }
            
            router.push("/");
        } catch (err) {
            const authError = err as AuthError;
            setError(getAuthErrorMessage(authError));
            console.error("Email sign-in error:", authError.code);
        } finally {
            setLoading(false);
        }
    }, [router]);

    const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
        setError(null);
        setLoading(true);
        
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            
            // Set display name if provided
            if (displayName) {
                await updateProfile(result.user, { displayName });
            }
            
            // Send verification email
            await sendEmailVerification(result.user);
            
            router.push("/");
        } catch (err) {
            const authError = err as AuthError;
            setError(getAuthErrorMessage(authError));
            console.error("Email sign-up error:", authError.code);
        } finally {
            setLoading(false);
        }
    }, [router]);

    const logout = useCallback(async () => {
        setError(null);
        
        try {
            await signOut(auth);
            router.push("/login");
        } catch (err) {
            const authError = err as AuthError;
            setError(getAuthErrorMessage(authError));
            console.error("Logout error:", authError.code);
        }
    }, [router]);

    const resetPassword = useCallback(async (email: string) => {
        setError(null);
        
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (err) {
            const authError = err as AuthError;
            setError(getAuthErrorMessage(authError));
            console.error("Password reset error:", authError.code);
            throw err; // Re-throw so caller knows it failed
        }
    }, []);

    const resendVerificationEmail = useCallback(async () => {
        if (!user) {
            setError("No user signed in");
            return;
        }
        
        try {
            await sendEmailVerification(user);
        } catch (err) {
            const authError = err as AuthError;
            setError(getAuthErrorMessage(authError));
            console.error("Verification email error:", authError.code);
        }
    }, [user]);

    // Derived state
    const isEmailVerified = user?.emailVerified ?? false;
    const needsEmailVerification = !!user && !user.emailVerified && user.providerData[0]?.providerId === "password";

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                authState,
                error,
                signInWithGoogle,
                signInWithEmail,
                signUpWithEmail,
                logout,
                resetPassword,
                resendVerificationEmail,
                clearError,
                isEmailVerified,
                needsEmailVerification,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
