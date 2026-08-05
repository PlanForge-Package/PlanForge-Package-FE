import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { ChangePasswordForm } from '@/components/change-password';
import { Detail } from '@/components/field';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My account — PlanForge',
};

export default async function AccountPage() {
  const { t } = await getDictionary();
  const me = await requireUser('/account');

  return (
    <main className="flex max-w-md flex-col gap-8">
      <PageHeader title={t.users.accountTitle} />

      <section aria-label={t.users.accountInfo} className="flex flex-col gap-3">
        <Detail label={t.users.name} value={me.name} />
        <Detail label={t.users.email} value={me.email} />
        <Detail label={t.users.role} value={t.roles[me.role]} />
      </section>

      <ChangePasswordForm />
    </main>
  );
}
