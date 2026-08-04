import Link from 'next/link';
import type { ArAging } from '@/lib/types';

const BUCKET_LABELS: Array<[keyof ArAging['totals'], string]> = [
  ['current', '만기 전'],
  ['days30', '1~30일'],
  ['days60', '31~60일'],
  ['days90', '61~90일'],
  ['over90', '90일 초과'],
];

function money(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return `${amount.toLocaleString('ko-KR')}원`;
}

/**
 * 연체 현황.
 *
 * 오래된 미수일수록 받기 어려워진다. 총액만 보면 어디부터 손대야 하는지 알 수
 * 없어, 경과 구간으로 나눠 보여 준다.
 */
export function ArAgingPanel({ data }: { data: ArAging }) {
  if (data.items.length === 0) {
    return (
      <section aria-label="연체" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">연체 현황</h2>
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          받지 못한 청구서가 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="연체" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
        연체 현황 ({data.asOf} 기준)
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <caption className="sr-only">거래처별 경과 구간</caption>
          <thead>
            <tr className="border-b border-current/10 text-left">
              <th scope="col" className="py-2 pr-4 font-medium">
                거래처
              </th>
              {BUCKET_LABELS.map(([key, label]) => (
                <th key={key} scope="col" className="py-2 pr-4 text-right font-medium">
                  {label}
                </th>
              ))}
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                연체 합계
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                미수 합계
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.account.id} className="border-b border-current/5">
                <td className="py-2.5 pr-4">
                  <Link
                    href={`/ar/${row.account.id}`}
                    className="font-mono text-xs underline underline-offset-4"
                  >
                    {row.account.code}
                  </Link>
                  <span className="ml-2">{row.account.name}</span>
                </td>
                {BUCKET_LABELS.map(([key]) => {
                  const value = row.buckets[key as keyof typeof row.buckets];
                  return (
                    <td
                      key={key}
                      className={`py-2.5 pr-4 text-right tabular-nums ${
                        key === 'over90' && Number(value) > 0
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-subtle'
                      }`}
                    >
                      {Number(value) > 0 ? money(value) : '—'}
                    </td>
                  );
                })}
                <td
                  className={`py-2.5 pr-4 text-right tabular-nums ${
                    Number(row.overdue) > 0 ? 'font-medium text-red-700 dark:text-red-300' : ''
                  }`}
                >
                  {money(row.overdue)}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums">{money(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-current/20">
              <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                합계
              </th>
              {BUCKET_LABELS.map(([key]) => (
                <td key={key} className="py-2.5 pr-4 text-right tabular-nums">
                  {money(data.totals[key])}
                </td>
              ))}
              <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                {money(data.totals.overdue)}
              </td>
              <td className="py-2.5 text-right font-semibold tabular-nums">
                {money(data.totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-subtle">청구서별로 보기</summary>
        <div className="mt-3 flex flex-col gap-4">
          {data.items.map((row) => (
            <div key={row.account.id} className="flex flex-col gap-1">
              <p className="text-xs font-medium">
                {row.account.code} · {row.account.name}
              </p>
              <ul className="flex flex-col gap-0.5">
                {row.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex flex-wrap gap-2 text-xs text-subtle">
                    <Link
                      href={`/ar/invoices/${invoice.id}`}
                      className="font-mono underline underline-offset-4"
                    >
                      {invoice.number}
                    </Link>
                    <span className="tabular-nums">만기 {invoice.dueDate}</span>
                    <span className="tabular-nums">
                      {invoice.daysOverdue > 0 ? `${invoice.daysOverdue}일 지남` : '만기 전'}
                    </span>
                    <span className="tabular-nums">남은 {money(invoice.outstanding)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      <p className="text-xs text-subtle">
        받은 만큼 뺀 금액입니다. 오래 묵은 미수일수록 받기 어려우니 90일 초과부터 확인해 주세요.
      </p>
    </section>
  );
}
