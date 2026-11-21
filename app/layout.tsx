import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Google Classroom Course & Roster Hub',
  description:
    'Select active Google Classroom courses and view enrolled student rosters with real-time sync.',
  openGraph: {
    title: 'Google Classroom Course & Roster Hub',
    description:
      'Select active Google Classroom courses and view enrolled student rosters with real-time sync.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Google Classroom Course & Roster Hub',
    description:
      'Select active Google Classroom courses and view enrolled student rosters with real-time sync.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-canvas text-ink-primary font-sans antialiased transition-colors duration-200 selection:bg-accent-soft selection:text-accent-soft-ink"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
