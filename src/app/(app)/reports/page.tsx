import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import { CHANNEL_LABELS, MARKET_LABELS, SOURCE_LABELS, label } from '@/lib/channel-labels';
import type { BreakdownRow, DailyReport } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '실적 — PlanForge',
};

const fieldClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';

function day(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function money(value: string, currency: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('ko-KR')} ${currency}`;
  }
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  // 기본은 지난 7일. 오늘은 아직 끝나지 않아 실적이 반쪽이라 어제까지 본다.
  const from = params.from ?? day(-7);
  const to = params.to ?? day(-1);

  const user = await requireUser('/reports');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="실적" />
        <EmptyState message="접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요." />
      </main>
    );
  }

  const report = await tryFetch(
    apiFetch<DailyReport>('be', '/api/reports/daily', { query: { propertyId, from, to } }),
  );

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="실적"
        description={`${property.selected?.name} — 점유율·ADR·RevPAR 과 폴리오 청구 현황입니다.`}
      />

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-xs text-subtle">
            시작일
          </label>
          <input id="from" name="from" type="date" defaultValue={from} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-xs text-subtle">
            종료일
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className={fieldClass} />
        </div>
        <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
          조회
        </button>

        {/* 판매 지표와 회계 마감은 다른 질문이다. 화면을 갈라 두고 오갈 수 있게 한다. */}
        <Link
          href={`/reports/journal?date=${to}`}
          className="rounded-md border border-current/20 px-3 py-1.5 text-sm transition-colors hover:bg-current/5"
        >
          마감 분개
        </Link>
      </form>

      {!report.ok ? (
        <ErrorNotice
          title="실적을 불러오지 못했습니다"
          message={report.message}
          status={report.status}
        />
      ) : (
        <Report data={report.data} />
      )}
    </main>
  );
}

function BreakdownTable({
  title,
  rows,
  labels,
  currency,
}: {
  title: string;
  rows: BreakdownRow[];
  labels: Record<string, string>;
  currency: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs uppercase tracking-wide text-subtle">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-subtle">판매 실적이 없습니다.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-current/10 text-left">
              <th scope="col" className="py-2 pr-2 font-medium">
                구분
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                판매
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                비중
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                매출
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="border-b border-current/5">
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  {label(labels, row.code)}
                </th>
                <td className="py-2 pr-2 text-right tabular-nums">{row.roomsSold}</td>
                <td className="py-2 pr-2 text-right tabular-nums text-subtle">
                  {percent(row.share)}
                </td>
                <td className="py-2 text-right tabular-nums">{money(row.roomRevenue, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Report({ data }: { data: DailyReport }) {
  const { currency } = data;

  return (
    <>
      <section aria-label="기간 요약" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="점유율" value={percent(data.totals.occupancy)} />
        <StatTile label="ADR" value={money(data.totals.adr, currency)} />
        <StatTile label="RevPAR" value={money(data.totals.revpar, currency)} />
        <StatTile label="객실 매출" value={money(data.totals.roomRevenue, currency)} />
      </section>

      <p className="text-xs text-subtle">
        {data.nights}박 · 판매 가능 객실 {data.roomsAvailable}실 · 판매 {data.totals.roomsSold}실.{' '}
        {data.basis} 객실 매출은 예약 총액을 박수로 나눠 배분한 계약 기준 금액입니다.
      </p>

      <section aria-label="폴리오 청구" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">폴리오 청구 (실제 계상)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="청구" value={money(data.postings.charges, currency)} />
          <StatTile label="결제" value={money(data.postings.payments, currency)} />
          <StatTile label="조정" value={money(data.postings.adjustments, currency)} />
          <StatTile label="미수" value={money(data.postings.outstanding, currency)} />
        </div>
        <p className="text-xs text-subtle">
          폴리오에 실제로 올라간 금액입니다. 위의 객실 매출과 다른 값이며, 정산 대사에는 이쪽을
          씁니다. 회계 마감용 공식 수치는 OPERA 의 리포트를 따릅니다.
        </p>
      </section>

      <section aria-label="채널 분해" className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium">경로별 실적</h2>
          <p className="mt-1 text-xs text-subtle">
            어디서 들어온 예약이 얼마를 남기는지 봅니다. 수수료를 물고도 계속 파는 채널을 여기서
            골라냅니다. 합계는 위의 기간 요약과 같습니다.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <BreakdownTable
            title="판매 채널"
            rows={data.breakdown.channel}
            labels={CHANNEL_LABELS}
            currency={currency}
          />
          <BreakdownTable
            title="예약 출처"
            rows={data.breakdown.source}
            labels={SOURCE_LABELS}
            currency={currency}
          />
          <BreakdownTable
            title="시장 구분"
            rows={data.breakdown.market}
            labels={MARKET_LABELS}
            currency={currency}
          />
        </div>
      </section>

      <section aria-label="일별 실적" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">일별</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  날짜
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  판매
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  예약분
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  점유율
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  ADR
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  RevPAR
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  객실 매출
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.date} className="border-b border-current/5">
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal tabular-nums">
                    {row.date}
                  </th>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {row.roomsSold}
                    <span className="text-subtle"> / {row.roomsAvailable}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                    {row.roomsBooked || '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{percent(row.occupancy)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {money(row.adr, currency)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {money(row.revpar, currency)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {money(row.roomRevenue, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
