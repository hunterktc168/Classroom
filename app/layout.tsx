import type {Metadata} from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Google Classroom Course & Roster Hub',
  description: 'Select active Google Classroom courses and view enrolled student rosters with real-time sync.',
  openGraph: {
    title: 'Google Classroom Course & Roster Hub',
    description: 'Select active Google Classroom courses and view enrolled student rosters with real-time sync.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Google Classroom Course & Roster Hub',
    description: 'Select active Google Classroom courses and view enrolled student rosters with real-time sync.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
