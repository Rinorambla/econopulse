import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://econopulse.ai'),
  title: "EconoPulse - Advanced Financial Analysis Platform",
  description: "Discover the power of AI-driven financial insights with real-time market analysis, dynamic portfolio generation, and comprehensive economic intelligence.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EconoPulse",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "EconoPulse",
    title: "EconoPulse - AI Economic Analysis",
    description: "Professional AI-powered economic analysis and market insights platform",
  },
  icons: {
    icon: [{ url: "/icon.svg" }],
    shortcut: "/icons/icon-192x192.png",
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="application-name" content="EconoPulse" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EconoPulse" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#3b82f6" />
  <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased font-sans min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
