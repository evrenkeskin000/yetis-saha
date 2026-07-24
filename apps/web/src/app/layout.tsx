import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yetiş+ Saha Yönetim Paneli',
  description: 'Yetiş+ Saha Ekip Takip ve Pazarlama Yönetim Sistemi Admin Paneli',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="h-full bg-slate-100">
      <body className="h-full font-sans antialiased text-slate-800" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
