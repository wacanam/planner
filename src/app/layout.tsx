import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { OfflineIndicator } from '@/components/offline-indicator';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/theme-provider';
import { Providers } from './providers';
import { ServiceWorkerCleanup } from './ServiceWorkerCleanup';

export const metadata: Metadata = {
  title: 'Kanataran',
  description:
    'Offline-first territory management for congregations. Organize and manage ministry territory assignments with ease.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kanataran',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6B9ECC' },
    { media: '(prefers-color-scheme: dark)', color: '#4A7BA7' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <ServiceWorkerCleanup />
          <Providers>
            <OfflineIndicator />
            <Header />
            <main className="flex-1 flex flex-col overflow-x-hidden">{children}</main>
            <Footer />
            <Toaster richColors />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
