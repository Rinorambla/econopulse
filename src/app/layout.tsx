import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EconoPulse - Advanced Financial Analysis Platform",
  description: "Discover the power of AI-driven financial insights with real-time market analysis, dynamic portfolio generation, and comprehensive economic intelligence.",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
  <body className="antialiased font-sans min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
