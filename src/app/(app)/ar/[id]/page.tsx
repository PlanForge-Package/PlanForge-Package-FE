import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArAccountDetailPanel } from '@/components/ar-panels';
import { ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { ApiError, apiFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';
import type { ArAccountDetail } from '@/lib/types';
import { translateError } from '@/lib/translate-error';

/** Recording payments and issuing invoices is receivables management, so a manager owns it. */
const CAN_MANAGE = ['ADMIN', 'MANAGER'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AR account — PlanForge',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ArAccountPage({ params }: Props) {
  const { t } = await getDictionary();
  const { id } = await params;
  const user = await requireUser(`/ar/${id}`);

  let data: ArAccountDetail;
  try {
    data = await apiFetch<ArAccountDetail>('be', `/api/ar/accounts/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.notFound) notFound();

    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.ar.accountTitle} />
        <ErrorNotice
          title={t.ar.loadAccountsFailed}
          message={translateError(error, t, t.ar.loadAccountsFailed)}
          status={error instanceof ApiError ? error.status : 0}
        />
        <Link href="/ar" className="text-sm underline underline-offset-4 text-subtle">
          {t.ar.backToAccountsLong}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/ar" className="text-sm underline underline-offset-4 text-subtle">
          {t.ar.backToAccounts}
        </Link>
        <PageHeader
          title={data.account.name}
          description={`${fill(t.ar.accountCode, { code: data.account.code })}${
            data.account.active ? '' : t.ar.suspended
          }`}
        />
      </div>

      <ArAccountDetailPanel data={data} canManage={CAN_MANAGE.includes(user.role)} />
    </main>
  );
}
