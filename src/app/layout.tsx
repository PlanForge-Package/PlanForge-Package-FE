import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n';
import { LOCALE_TAGS } from '@/lib/i18n/locales';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlanForge — Hotel Management Platform',
  description: 'Oracle OPERA(OHIP) 기반 호텔 관리 플랫폼',
};

/**
 * 껍데기만 둔다. 내비게이션과 본문 컨테이너는 (app) 그룹의 레이아웃이 맡는다 —
 * 로그인 화면에는 메뉴가 보이면 안 되기 때문이다.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 문서 언어는 화면 언어를 따라간다. 스크린리더와 브라우저 번역이 이 값을 본다.
  const locale = await getLocale();

  return (
    <html lang={LOCALE_TAGS[locale]}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
