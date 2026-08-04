import Link from 'next/link';
import { getDictionary } from '@/lib/i18n';
import { fill, money } from '@/lib/i18n/format';
import type { ArAging } from '@/lib/types';

const BUCKETS: Array<keyof ArAging['totals']> = ['current', 'days30', 'days60', 'days90', 'over90'];

/**
 * Aging.
 *
 * The older a receivable, the harder it is to collect. A total alone hides where to
 * start, so it is broken out by how long each is past due.
 */
export async function ArAgingPanel({ data }: { data: ArAging }) {
  const { locale, t } = await getDictionary();
  const bucketLabel = (key: keyof ArAging['totals']) =>
    t.ar.buckets[key as keyof typeof t.ar.buckets] ?? key;

  if (data.items.length === 0) {
    return (
      <section aria-label={t.ar.aging} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
          {t.ar.agingTitle}
        </h2>
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          {t.ar.agingEmpty}
        </p>
      </section>
    );
  }

  return (
    <section aria-label={t.ar.aging} className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
        {fill(t.ar.agingTitleAsOf, { date: data.asOf })}
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <caption className="sr-only">{t.ar.agingCaption}</caption>
          <thead>
            <tr className="border-b border-current/10 text-left">
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.ar.agingAccount}
              </th>
              {BUCKETS.map((key) => (
                <th key={key} scope="col" className="py-2 pr-4 text-right font-medium">
                  {bucketLabel(key)}
                </th>
              ))}
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {t.ar.agingOverdueTotal}
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {t.ar.agingOutstandingTotal}
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
                {BUCKETS.map((key) => {
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
                      {Number(value) > 0 ? money(value, locale) : '—'}
                    </td>
                  );
                })}
                <td
                  className={`py-2.5 pr-4 text-right tabular-nums ${
                    Number(row.overdue) > 0 ? 'font-medium text-red-700 dark:text-red-300' : ''
                  }`}
                >
                  {money(row.overdue, locale)}
                </td>
                <td className="py-2.5 text-right font-medium tabular-nums">
                  {money(row.total, locale)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-current/20">
              <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                {t.ar.agingTotal}
              </th>
              {BUCKETS.map((key) => (
                <td key={key} className="py-2.5 pr-4 text-right tabular-nums">
                  {money(data.totals[key], locale)}
                </td>
              ))}
              <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                {money(data.totals.overdue, locale)}
              </td>
              <td className="py-2.5 text-right font-semibold tabular-nums">
                {money(data.totals.total, locale)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-subtle">{t.ar.agingByInvoice}</summary>
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
                    <span className="tabular-nums">
                      {fill(t.ar.agingDue, { date: invoice.dueDate })}
                    </span>
                    <span className="tabular-nums">
                      {invoice.daysOverdue > 0
                        ? fill(t.ar.agingDaysOverdue, { count: invoice.daysOverdue })
                        : t.ar.agingNotDue}
                    </span>
                    <span className="tabular-nums">
                      {fill(t.ar.agingRemaining, { amount: money(invoice.outstanding, locale) })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      <p className="text-xs text-subtle">{t.ar.agingNote}</p>
    </section>
  );
}
