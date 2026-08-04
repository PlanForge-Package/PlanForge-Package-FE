'use client';

import { fill, money } from '@/lib/i18n/format';
import { useI18n, useLocale } from '@/lib/i18n/provider';
import type { ArInvoiceDetail } from '@/lib/types';

function date(value: string | null): string {
  return value ? value.slice(0, 10) : '—';
}

/**
 * The invoice sent to an account.
 *
 * Printed or saved as a PDF straight from the screen. There is no separate document
 * generator because the billed lines have to be the same values already on screen —
 * built in two places, they eventually send different amounts.
 *
 * Screen-only decoration is hidden when printing (`print:hidden`).
 */
export function InvoiceDocument({ invoice }: { invoice: ArInvoiceDetail }) {
  const t = useI18n();
  const locale = useLocale();
  const currency = invoice.currency || invoice.property.currency || 'KRW';
  const voided = invoice.status === 'VOID';

  return (
    <article
      aria-label={t.ar.invoices}
      className="flex flex-col gap-6 rounded-lg border border-current/10 px-6 py-6 print:border-0 print:px-0"
    >
      <div className="flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-subtle">
          {t.ar.documentStatuses[invoice.status] ?? invoice.status}
          {invoice.overdue && (
            <span className="ml-2 text-red-700 dark:text-red-300">{t.ar.overdue}</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium"
        >
          {t.ar.print}
        </button>
      </div>

      {voided && (
        <p
          role="status"
          className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm"
        >
          {t.ar.voidWarning}
        </p>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-current/10 pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t.ar.invoices}</h2>
          <p className="mt-1 font-mono text-sm text-subtle">{invoice.number}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{invoice.property.name}</p>
          {invoice.property.address && <p className="text-subtle">{invoice.property.address}</p>}
        </div>
      </header>

      <section aria-label={t.ar.billTo} className="grid gap-4 sm:grid-cols-2">
        <dl className="flex flex-col gap-1 text-sm">
          <dt className="text-xs uppercase tracking-wide text-subtle">{t.ar.agingAccount}</dt>
          <dd className="font-medium">{invoice.account.name}</dd>
          <dd className="font-mono text-xs text-subtle">{invoice.account.code}</dd>
          {invoice.account.billingEmail && (
            <dd className="text-subtle">{invoice.account.billingEmail}</dd>
          )}
        </dl>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-xs uppercase tracking-wide text-subtle">{t.ar.issuedOn}</dt>
          <dd className="text-right tabular-nums">{date(invoice.issuedAt)}</dd>
          <dt className="text-xs uppercase tracking-wide text-subtle">{t.ar.dueOn}</dt>
          <dd className="text-right tabular-nums">{date(invoice.dueDate)}</dd>
          <dt className="text-xs uppercase tracking-wide text-subtle">{t.ar.sentOn}</dt>
          <dd className="text-right tabular-nums">{date(invoice.sentAt)}</dd>
        </dl>
      </section>

      <section aria-label={t.ar.lines} className="flex flex-col gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wide text-subtle">{t.ar.lines}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.ar.lineDate}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.ar.memo}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.ar.lineConfirmation}
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  {t.ar.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.transactions.map((row) => (
                <tr key={row.id} className="border-b border-current/5">
                  <td className="py-2 pr-4 tabular-nums text-subtle">{date(row.postedAt)}</td>
                  <td className="py-2 pr-4">{row.description}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-subtle">
                    {row.reservation?.confirmationNumber ?? '—'}
                  </td>
                  <td className="py-2 text-right tabular-nums">{money(row.amount, locale, currency)}</td>
                </tr>
              ))}
              {invoice.transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-subtle">
                    {t.ar.noLines}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-current/20">
                <th scope="row" colSpan={3} className="py-2 pr-4 text-right font-medium">
                  {t.ar.lineTotal}
                </th>
                <td className="py-2 text-right font-semibold tabular-nums">
                  {money(invoice.total, locale, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section aria-label={t.ar.collections} className="flex flex-col gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wide text-subtle">{t.ar.collections}</h3>
        {invoice.allocations.length === 0 ? (
          <p className="text-sm text-subtle">{t.ar.noCollections}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.ar.lineDate}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.ar.memo}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    {t.ar.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.allocations.map((row) => (
                  <tr key={row.id} className="border-b border-current/5">
                    <td className="py-2 pr-4 tabular-nums text-subtle">
                      {date(row.payment.postedAt)}
                    </td>
                    <td className="py-2 pr-4">{row.payment.description}</td>
                    <td className="py-2 text-right tabular-nums">{money(row.amount, locale, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <dl className="mt-2 flex flex-col gap-1 self-end text-sm">
          <div className="flex justify-between gap-8">
            <dt className="text-subtle">{t.ar.receivedTotal}</dt>
            <dd className="tabular-nums">{money(invoice.paid, locale, currency)}</dd>
          </div>
          <div className="flex justify-between gap-8 border-t border-current/20 pt-1">
            <dt className="font-medium">{t.ar.dueTotal}</dt>
            <dd className="font-semibold tabular-nums">
              {money(invoice.outstanding, locale, currency)}
            </dd>
          </div>
        </dl>
      </section>

      {invoice.note && (
        <section aria-label={t.common.note} className="border-t border-current/10 pt-4 text-sm">
          <p className="whitespace-pre-line text-subtle">{invoice.note}</p>
        </section>
      )}

      <p className="text-xs text-subtle">
        {fill(t.ar.termsFooter, { days: invoice.account.termDays })}
      </p>
    </article>
  );
}
