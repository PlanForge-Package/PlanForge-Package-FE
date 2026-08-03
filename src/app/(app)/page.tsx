import Link from 'next/link';
import { ErrorNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { ReservationListResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Property 를 고르는 UI 가 아직 없으므로, 전체 예약에서 상태별로 집계한다.
  // Property 선택이 들어오면 BE 의 /api/reservations/summary 로 바꾼다.
  const user = await requireUser('/');
  const property = await getPropertyContext(user);

  const result = await tryFetch(
    apiFetch<ReservationListResponse>('be', '/api/reservations', {
      query: { propertyId: property.selected?.id, limit: 200 },
    }),
  );

  const counts = result.ok
    ? {
        total: result.data.total,
        inHouse: result.data.items.filter((r) => r.status === 'IN_HOUSE').length,
        arriving: result.data.items.filter(
          (r) => r.status === 'RESERVED' || r.status === 'CONFIRMED',
        ).length,
        checkedOut: result.data.items.filter((r) => r.status === 'CHECKED_OUT').length,
      }
    : null;

  return (
    <main className="flex flex-col gap-8">
      <PageHeader
        title="대시보드"
        description={property.selected?.name ?? 'Oracle OPERA(OHIP) 기반 호텔 관리 플랫폼'}
      />

      {!result.ok ? (
        <ErrorNotice title="현황을 불러오지 못했습니다" message={result.message} />
      ) : (
        counts && (
          <section aria-label="예약 요약" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="전체 예약" value={counts.total} />
            <StatTile label="재실" value={counts.inHouse} />
            <StatTile label="도착 예정" value={counts.arriving} />
            <StatTile label="체크아웃" value={counts.checkedOut} />
          </section>
        )
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">바로 가기</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/reservations"
            className="rounded-lg border border-current/10 px-4 py-3 transition-colors hover:bg-current/5"
          >
            <p className="font-medium">예약</p>
            <p className="mt-1 text-sm text-subtle">
              확인 번호·게스트로 검색하고 상태를 확인합니다.
            </p>
          </Link>
          <Link
            href="/rooms"
            className="rounded-lg border border-current/10 px-4 py-3 transition-colors hover:bg-current/5"
          >
            <p className="font-medium">객실</p>
            <p className="mt-1 text-sm text-subtle">하우스키핑 상태와 재실 현황을 봅니다.</p>
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-2 text-sm text-subtle">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">플랫폼 구성</h2>
        <p>FE → BE(업무 로직·DB) → Core(OPERA 게이트웨이) → OPERA Cloud</p>
      </section>
    </main>
  );
}
