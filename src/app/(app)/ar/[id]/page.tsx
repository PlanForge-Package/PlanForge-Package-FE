import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArAccountDetailPanel } from '@/components/ar-panels';
import { ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { ApiError, apiFetch, backendMessage } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import type { ArAccountDetail } from '@/lib/types';

/** Recording payments and issuing invoices is receivables management, so a manager owns it. */
const CAN_MANAGE = ['ADMIN', 'MANAGER'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '거래처 상세 — PlanForge',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ArAccountPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser(`/ar/${id}`);

  let data: ArAccountDetail;
  try {
    data = await apiFetch<ArAccountDetail>('be', `/api/ar/accounts/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.notFound) notFound();

    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="거래처" />
        <ErrorNotice
          title="거래처를 불러오지 못했습니다"
          message={backendMessage(error, '거래처를 불러오지 못했습니다.')}
          status={error instanceof ApiError ? error.status : 0}
        />
        <Link href="/ar" className="text-sm underline underline-offset-4 text-subtle">
          ← 거래처 목록으로
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/ar" className="text-sm underline underline-offset-4 text-subtle">
          ← 거래처 목록
        </Link>
        <PageHeader
          title={data.account.name}
          description={`코드 ${data.account.code}${data.account.active ? '' : ' · 거래 중지'}`}
        />
      </div>

      <ArAccountDetailPanel data={data} canManage={CAN_MANAGE.includes(user.role)} />
    </main>
  );
}
