import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import ErrorBoundary from "@/components/ErrorBoundary";

// Inter - Premium sans-serif font used by Apple, Notion, and many modern apps
const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
    weight: ["300", "400", "500", "600", "700", "800"],
});

// JetBrains Mono - Premium monospace font for code
const jetbrainsMono = JetBrains_Mono({
    variable: "--font-mono",
    subsets: ["latin"],
    display: "swap",
    weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
    title: "Smera - AI Work Companion",
    description: "AI-powered work intake and memory system for solo developers",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen`}
                suppressHydrationWarning
            >
                <div className="liquid-gradient-bg" />
                <ErrorBoundary>
                    <AuthProvider>
                        <EmailVerificationBanner />
                        <main className="relative z-10 min-h-screen p-4 md:p-8">
                            {children}
                        </main>
                    </AuthProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
