import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/session-provider";
import { ShellProvider } from "@/components/providers/shell-provider";

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
  viewportFit: "cover",
  themeColor: "#ffffff",
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
    <html lang="en" suppressHydrationWarning style={{ background: '#ffffff' }}>
      <head>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-1GCZ0G9MHR" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-1GCZ0G9MHR');
        `}</Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <ShellProvider>
            {children}
          </ShellProvider>
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
