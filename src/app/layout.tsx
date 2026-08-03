import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlanForge — Hotel Management Platform',
  description: 'Oracle OPERA(OHIP) 기반 호텔 관리 플랫폼',
};

/**
 * 껍데기만 둔다. 내비게이션과 본문 컨테이너는 (app) 그룹의 레이아웃이 맡는다 —
 * 로그인 화면에는 메뉴가 보이면 안 되기 때문이다.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
