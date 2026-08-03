import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '로그인 — PlanForge',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">PlanForge</h1>
        <p className="text-sm text-subtle">호텔 관리 플랫폼</p>
      </header>

      <LoginForm next={next} reason={reason} />
    </main>
  );
}
