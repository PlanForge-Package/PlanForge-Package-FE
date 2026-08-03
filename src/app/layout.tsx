import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlanForge — Hotel Management Platform',
  description: 'Oracle OPERA(OHIP) 기반 호텔 관리 플랫폼',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
