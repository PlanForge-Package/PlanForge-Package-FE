import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { ChangePasswordForm } from '@/components/change-password';
import { ROLE_LABELS } from '@/components/user-admin';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '내 계정 — PlanForge',
};

export default async function AccountPage() {
  const me = await requireUser('/account');

  return (
    <main className="flex max-w-md flex-col gap-8">
      <PageHeader title="내 계정" />

      <section aria-label="계정 정보" className="flex flex-col gap-3">
        <Field label="이름" value={me.name} />
        <Field label="이메일" value={me.email} />
        <Field label="역할" value={ROLE_LABELS[me.role]} />
      </section>

      <ChangePasswordForm />
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide opacity-50">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
