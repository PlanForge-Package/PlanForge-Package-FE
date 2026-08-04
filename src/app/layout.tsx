import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n';
import { LOCALE_TAGS } from '@/lib/i18n/locales';
import './globals.css';

export const metadata: Metadata = {
  title: 'PlanForge — Hotel Management Platform',
  description: 'Oracle OPERA(OHIP) 기반 호텔 관리 플랫폼',
};

/**
 * Only the shell. Navigation and the content container belong to the (app) group's
 * layout — the login screen must not show a menu.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The document language follows the screen language. Screen readers and browser translation read it.
  const locale = await getLocale();

  return (
    <html lang={LOCALE_TAGS[locale]}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
