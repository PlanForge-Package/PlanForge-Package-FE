import type { Metadata } from 'next';
import { ArAccountsPanel } from '@/components/ar-panels';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { ArAccountList } from '@/lib/types';

/** 거래처 등록은 채권 관리라 지배인이 맡는다. */
const CAN_MANAGE = ['ADMIN', 'MANAGER'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AR 거래처 — PlanForge',
};

export default async function ArPage() {
  const user = await requireUser('/ar');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (property.error) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="AR 거래처" />
        <ErrorNotice title="호텔 목록을 불러오지 못했습니다" message={property.error} />
      </main>
    );
  }

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="AR 거래처" />
        <EmptyState message="접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요." />
      </main>
    );
  }

  const accounts = await tryFetch(
    apiFetch<ArAccountList>('be', '/api/ar/accounts', { query: { propertyId } }),
  );

  return (
    <main className="flex flex-col gap-8">
      <PageHeader
        title="AR 거래처"
        description={`${property.selected?.name} — 후불 거래처의 미수와 청구를 관리합니다.`}
      />

      {!accounts.ok ? (
        <ErrorNotice
          title="거래처를 불러오지 못했습니다"
          message={accounts.message}
          status={accounts.status}
        />
      ) : (
        <ArAccountsPanel
          propertyId={propertyId}
          data={accounts.data}
          canCreate={CAN_MANAGE.includes(user.role)}
        />
      )}
    </main>
  );
}
