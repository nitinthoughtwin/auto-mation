import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

// SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL('https://gpmart.in'),
  title: {
    default: 'GPMart Studio - YouTube Automation Dashboard',
    template: '%s | GPMart Studio',
  },
  description: 'Automate your YouTube video uploads. Schedule videos, manage multiple channels, and grow your YouTube presence with GPMart Studio.',
  keywords: [
    'YouTube automation',
    'video scheduler',
    'YouTube upload',
    'channel management',
    'video automation',
    'GPMart Studio',
  ],
  authors: [{ name: 'GPMart Studio' }],
  creator: 'GPMart Studio',
  publisher: 'GPMart Studio',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gpmart.in',
    siteName: 'GPMart Studio',
    title: 'GPMart Studio - YouTube Automation Dashboard',
    description: 'Automate your YouTube video uploads. Schedule videos, manage multiple channels, and grow your YouTube presence.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GPMart Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GPMart Studio - YouTube Automation Dashboard',
    description: 'Automate your YouTube video uploads. Schedule videos, manage multiple channels.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'YOUR_GOOGLE_VERIFICATION_CODE', // Add your Google Search Console verification code
  },
  alternates: {
    canonical: 'https://gpmart.in',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Canonical URL */}
        <link rel="canonical" href="https://gpmart.in" />
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
