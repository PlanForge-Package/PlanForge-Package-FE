import Link from 'next/link';
import { DailyTraces } from '@/components/daily-traces';
import { ErrorNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { getPropertyContext } from '@/lib/property';
import type { DailyTraceList, ReservationListResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // There is no property picker UI yet, so the counts come from all reservations by status.
  // Once a property selection exists this moves to BE's /api/reservations/summary.
  const user = await requireUser('/');
  const property = await getPropertyContext(user);
  const { t } = await getDictionary();

  // A failed instruction read must not hide the overview. That is why they are separate calls.
  const [result, traces] = await Promise.all([
    tryFetch(
      apiFetch<ReservationListResponse>('be', '/api/reservations', {
        query: { propertyId: property.selected?.id, limit: 200 },
      }),
    ),
    tryFetch(
      apiFetch<DailyTraceList>('be', '/api/traces', {
        query: { propertyId: property.selected?.id },
      }),
    ),
  ]);

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
        title={t.dashboard.title}
        description={property.selected?.name ?? t.login.subtitle}
      />

      {!result.ok ? (
        <ErrorNotice title={t.dashboard.loadFailed} message={result.message} />
      ) : (
        counts && (
          <section
            aria-label={t.dashboard.reservationSummary}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <StatTile label={t.dashboard.totalReservations} value={counts.total} />
            <StatTile label={t.dashboard.inHouse} value={counts.inHouse} />
            <StatTile label={t.dashboard.arrivals} value={counts.arriving} />
            <StatTile label={t.dashboard.checkedOut} value={counts.checkedOut} />
          </section>
        )
      )}

      {traces.ok ? (
        <DailyTraces traces={traces.data.items} />
      ) : (
        <ErrorNotice
          title={t.dashboard.tracesFailed}
          message={traces.message}
          status={traces.status}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
          {t.dashboard.shortcuts}
        </h2>
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
