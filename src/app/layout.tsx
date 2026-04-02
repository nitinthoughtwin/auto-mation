import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/session-provider";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export const metadata: Metadata = {
  title: "YouTube Automation Dashboard",
  description: "Multi-platform video scheduling and automation tool",
  keywords: ["YouTube", "Instagram", "Facebook", "automation", "scheduler"],
  verification: {
    google: "lO3DnryssZxgIAK8CXuRoiX2h96yUyRf2nDSYZlMmGw",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 mx-auto max-w-7xl pb-20 md:pb-6">
              {children}
            </main>
            <BottomNav />
          </div>
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
