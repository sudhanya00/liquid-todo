import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
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
                className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
                suppressHydrationWarning
            >
                <div className="liquid-gradient-bg" />
                <AuthProvider>
                    <EmailVerificationBanner />
                    <main className="relative z-10 min-h-screen p-4 md:p-8">
                        {children}
                    </main>
                </AuthProvider>
            </body>
        </html>
    );
}
