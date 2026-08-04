import type { Metadata } from 'next';
import { CashierHistory, CashierPanel } from '@/components/cashier-panel';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { CashierCurrent, CashierShiftList } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '캐셔 마감 — PlanForge',
};

export default async function CashierPage() {
  const user = await requireUser('/cashier');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (property.error) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="캐셔 마감" />
        <ErrorNotice title="호텔 목록을 불러오지 못했습니다" message={property.error} />
      </main>
    );
  }

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="캐셔 마감" />
        <EmptyState message="접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요." />
      </main>
    );
  }

  // A failed past-shift read must not block the current shift. That is why they are separate calls.
  const [current, history] = await Promise.all([
    tryFetch(apiFetch<CashierCurrent>('be', '/api/cashier/shifts/current')),
    tryFetch(
      apiFetch<CashierShiftList>('be', '/api/cashier/shifts', { query: { propertyId, limit: 20 } }),
    ),
  ]);

  return (
    <main className="flex flex-col gap-8">
      <PageHeader
        title="캐셔 마감"
        description={`${property.selected?.name} — 근무조별 수납과 시재를 맞춥니다.`}
      />

      {!current.ok ? (
        <ErrorNotice
          title="근무조를 불러오지 못했습니다"
          message={current.message}
          status={current.status}
        />
      ) : (
        <CashierPanel
          propertyId={propertyId}
          shift={current.data.shift}
          summary={current.data.summary}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">지난 근무조</h2>
        {!history.ok ? (
          <ErrorNotice
            title="지난 근무조를 불러오지 못했습니다"
            message={history.message}
            status={history.status}
          />
        ) : (
          <CashierHistory shifts={history.data.items} />
        )}
      </section>

      <p className="text-xs text-subtle">
        집계에는 매입된 결제만 들어갑니다. 승인만 된 카드는 아직 받은 돈이 아니고, 환불한 금액은
        빼고 셉니다. 근무조를 열지 않고 받은 수납은 어느 조에도 붙지 않아 이 집계에서 빠집니다.
      </p>
    </main>
  );
}
