import type { Metadata } from 'next';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { CreateOutletForm, OutletBoard } from '@/components/outlet-admin';
import { PageHeader } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { OutletListResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'POS 아웃렛 — PlanForge',
};

export default async function PosOutletsPage() {
  const user = await requireUser('/pos-outlets');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="POS 아웃렛" />
        <EmptyState message="접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요." />
      </main>
    );
  }

  const result = await tryFetch(
    apiFetch<OutletListResponse>('be', '/api/pos-outlets', { query: { propertyId } }),
  );

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="POS 아웃렛"
        description={`${property.selected?.name} — 레스토랑·바 단말이 객실로 요금을 다는 통로입니다.`}
      />

      <section
        aria-label="주의"
        className="rounded-lg border border-current/10 px-4 py-3 text-sm text-subtle"
      >
        아웃렛 키는 <strong className="font-medium">요금을 달 수 있는 자격</strong>입니다. 직원
        계정을 단말에 심지 않기 위해 따로 발급하며, 이 키로 할 수 있는 일은 재실 객실에 요금을 달고
        자기가 단 요금을 취소하는 것뿐입니다. 예약이나 손님 정보는 읽지 못합니다.
        <br />
        키는 발급 순간에만 보입니다. 잃어버리면 재발급하세요 — 이전 키는 즉시 막힙니다.
      </section>

      <CreateOutletForm propertyId={propertyId} />

      {!result.ok ? (
        <ErrorNotice
          title="아웃렛을 불러오지 못했습니다"
          message={result.message}
          status={result.status}
        />
      ) : result.data.items.length === 0 ? (
        <EmptyState message="등록된 POS 아웃렛이 없습니다." />
      ) : (
        <OutletBoard outlets={result.data.items} />
      )}
    </main>
  );
}
