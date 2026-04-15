import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Koral',
  description: 'Community platform for passionate hobbyists',
};

// This is a temporary root layout used until Plan 05 implements
// the full tenant-aware root layout with CSS custom property injection.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
