import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, ErrorNotice, InfoNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary, type Dictionary } from '@/lib/i18n';
import { getPropertyContext } from '@/lib/property';
import type { JournalReport } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '마감 분개 — PlanForge',
};

const fieldClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';

function day(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function money(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return `${amount.toLocaleString('ko-KR')}원`;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  // Today is not over yet. A close normally looks at yesterday.
  const date = params.date ?? day(-1);

  const user = await requireUser('/reports/journal');
  const { t } = await getDictionary();
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="마감 분개" />
        <EmptyState message="접근 가능한 호텔이 없습니다." />
      </main>
    );
  }

  const report = await tryFetch(
    apiFetch<JournalReport>('be', '/api/reports/journal', { query: { propertyId, date } }),
  );

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/reports" className="text-sm underline underline-offset-4 text-subtle">
          ← 실적
        </Link>
        <PageHeader
          title="마감 분개"
          description={`${property.selected?.name} — 그날 올라간 금액을 거래 코드별로 모으고 세금을 갈라냅니다.`}
        />
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-xs text-subtle">
            영업일
          </label>
          <input id="date" name="date" type="date" defaultValue={date} className={fieldClass} />
        </div>
        <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
          조회
        </button>
      </form>

      {!report.ok ? (
        <ErrorNotice
          title="마감 분개를 불러오지 못했습니다"
          message={report.message}
          status={report.status}
        />
      ) : (
        <Journal report={report.data} t={t} />
      )}

      <p className="text-xs text-subtle">
        이 숫자는 로컬 사본에서 계산한 값입니다. 세무 신고에 쓰는 공식 수치는 OPERA 의 마감 리포트를
        따릅니다 — 여기 값은 그날의 돈이 맞는지 보기 위한 것입니다.
      </p>
    </main>
  );
}

function Journal({ report, t }: { report: JournalReport; t: Dictionary }) {
  const { revenue, payments, ledger } = report;

  return (
    <div className="flex flex-col gap-8">
      {!ledger.balanced && (
        <ErrorNotice
          title="장부가 맞지 않습니다"
          message={`계산한 마감 잔액 ${money(ledger.closingBalance)} 과 열린 폴리오 잔액 ${money(
            ledger.outstanding,
          )} 이 다릅니다. 어딘가 포스팅이 새고 있습니다.`}
        />
      )}

      {report.unmappedCodes.length > 0 && (
        <InfoNotice
          title="설정에 없는 거래 코드가 있습니다"
          message={`${report.unmappedCodes.join(', ')} — 매출 그룹과 세율을 정하기 전에는 세금을 나누지 않고 그대로 둡니다.`}
        />
      )}

      <section aria-label="합계" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="총 매출 (세포함)" value={money(revenue.total.gross)} />
        <StatTile label="공급가액" value={money(revenue.total.net)} />
        <StatTile label="봉사료" value={money(revenue.total.serviceCharge)} />
        <StatTile label="부가세" value={money(revenue.total.vat)} />
      </section>

      <section aria-label="매출 분개" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">매출 분개</h2>

        {revenue.groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-current/20 px-4 py-8 text-center text-sm text-subtle">
            그날 올라간 금액이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <caption className="sr-only">거래 코드별 매출</caption>
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    코드
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    이름
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    건수
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    표시가격
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    공급가액
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    봉사료
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    부가세
                  </th>
                </tr>
              </thead>
              {revenue.groups.map((group) => (
                <tbody key={group.group}>
                  <tr className="border-b border-current/10 bg-current/5">
                    <th scope="rowgroup" colSpan={2} className="py-2 pr-4 text-left font-medium">
                      {group.label}
                    </th>
                    <td className="py-2 pr-4 text-right tabular-nums">{group.count}</td>
                    <td className="py-2 pr-4 text-right font-medium tabular-nums">
                      {money(group.gross)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{money(group.net)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {money(group.serviceCharge)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{money(group.vat)}</td>
                  </tr>
                  {group.codes.map((code) => (
                    <tr key={code.transactionCode} className="border-b border-current/5">
                      <td className="py-2.5 pr-4 pl-4 font-mono text-xs">
                        {code.transactionCode}
                        {code.unmapped && (
                          <span className="ml-1.5 text-red-700 dark:text-red-300">미설정</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-subtle">{code.name}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                        {code.count}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{money(code.gross)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                        {money(code.net)}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                        {money(code.serviceCharge)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-subtle">
                        {money(code.vat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </section>

      <section aria-label="수납" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">수납</h2>

        {payments.methods.length === 0 ? (
          <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
            그날 매입된 수납이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <caption className="sr-only">결제 수단별 수납</caption>
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    수단
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    건수
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    금액
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.methods.map((row) => (
                  <tr key={row.method} className="border-b border-current/5">
                    <td className="py-2.5 pr-4">
                      {/* BE 가 주는 수단 코드는 문자열이다. 사전에 없으면 코드 그대로 보여 준다. */}
                      {(t.payments.methods as Record<string, string>)[row.method] ?? row.method}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">{row.count}</td>
                    <td className="py-2.5 text-right tabular-nums">{money(row.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                    합계
                  </th>
                  <td />
                  <td className="py-2.5 text-right font-medium tabular-nums">
                    {money(payments.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-subtle">
          매입된 결제만 셉니다 — 승인만 된 카드는 아직 받은 돈이 아닙니다. 환불한 만큼은 뺍니다.
        </p>
      </section>

      <section aria-label="대사" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">장부 대사</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="전일 미수" value={money(ledger.openingBalance)} />
          <StatTile label="당일 청구" value={money(ledger.charges)} />
          <StatTile label="당일 수납" value={money(ledger.payments)} />
          <StatTile
            label="마감 미수"
            value={money(ledger.closingBalance)}
            hint={ledger.balanced ? '폴리오 잔액과 일치' : '폴리오 잔액과 불일치'}
          />
        </div>
        <p className="text-xs text-subtle">
          전일 미수 + 당일 청구 − 당일 수납 = 마감 미수. 이 값이 열린 폴리오 잔액의 합(
          {money(ledger.outstanding)})과 같아야 합니다.
        </p>
      </section>
    </div>
  );
}
