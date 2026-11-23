import type { Metadata } from 'next';
import { geistSans, microgrammaBold } from '@/lib/fonts';
import { QueryProvider } from '@/components/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'OBCREW Command Center | Operations & Fleet Control',
  description: 'Mission Control for ObCrew Chauffeur Dispatch, Roadside Mechanics, and Fleet Agency Operations',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${microgrammaBold.variable}`}>
      <body className="font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
