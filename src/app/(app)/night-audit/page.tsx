import type { Metadata } from 'next';
import { NightAuditBoard } from '@/components/night-audit-board';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { NightAuditReview } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '야간 감사 — PlanForge',
};

export default async function NightAuditPage() {
  const user = await requireUser('/night-audit');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="야간 감사" />
        <EmptyState message="접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요." />
      </main>
    );
  }

  const review = await tryFetch(
    apiFetch<NightAuditReview>('be', '/api/night-audit', { query: { propertyId } }),
  );

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="야간 감사"
        description={`${property.selected?.name} — 마감은 OPERA 가 돌립니다. 여기서는 지금 마감하면 무엇이 잘못 남는지 봅니다.`}
      />

      {!review.ok ? (
        <ErrorNotice
          title="점검표를 불러오지 못했습니다"
          message={review.message}
          status={review.status}
        />
      ) : (
        <>
          <section aria-label="요약" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="영업일" value={review.data.businessDate.slice(0, 10)} />
            <StatTile label="달력 날짜" value={review.data.calendarDate.slice(0, 10)} />
            <StatTile label="남은 항목" value={review.data.outstanding} />
          </section>

          {!review.data.businessDateFromOpera && (
            <ErrorNotice
              title="영업일을 OPERA 에서 읽지 못했습니다"
              message="달력 날짜로 대신 표시하고 있습니다. 마감 전에 OPERA 의 영업일을 직접 확인해 주세요."
            />
          )}

          {review.data.businessDateFromOpera &&
            review.data.businessDate !== review.data.calendarDate && (
              <p className="rounded-lg border border-current/10 px-4 py-3 text-sm text-subtle">
                영업일이 달력 날짜보다 앞서 있습니다. 아직 야간 감사가 돌지 않았다는 뜻입니다.
              </p>
            )}

          {review.data.ready ? (
            <p
              role="status"
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm"
            >
              <span className="font-medium text-emerald-700 dark:text-emerald-300">
                마감을 막는 항목이 없습니다.
              </span>{' '}
              <span className="text-subtle">
                실제 마감은 OPERA 에서 실행합니다. PlanForge 는 영업일을 넘기지 않습니다.
              </span>
            </p>
          ) : (
            <p
              role="alert"
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
            >
              <span className="font-medium">{review.data.outstanding}건</span>
              <span className="text-subtle">
                {' '}
                을 정리하지 않고 마감하면 재고·매출이 어긋납니다.
              </span>
            </p>
          )}

          <NightAuditBoard sections={review.data.sections} />
        </>
      )}
    </main>
  );
}
