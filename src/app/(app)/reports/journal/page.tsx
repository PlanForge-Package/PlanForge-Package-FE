import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, ErrorNotice, InfoNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary, type Dictionary } from '@/lib/i18n';
import { fill, money } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/locales';
import { getPropertyContext } from '@/lib/property';
import type { JournalReport } from '@/lib/types';
import { control, primaryButton } from '@/components/ui';
import { dayOffset } from '@/lib/date';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Close journal — PlanForge',
};

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  // Today is not over yet. A close normally looks at yesterday.
  const date = params.date ?? dayOffset(-1);

  const user = await requireUser('/reports/journal');
  const { locale, t } = await getDictionary();
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.reports.journalTitle} />
        <EmptyState message={t.common.noAccess} />
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
          {t.reports.backToReports}
        </Link>
        <PageHeader
          title={t.reports.journalTitle}
          description={fill(t.reports.journalDescription, {
            property: property.selected?.name ?? '',
          })}
        />
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-xs text-subtle">
            {t.reports.businessDate}
          </label>
          <input id="date" name="date" type="date" defaultValue={date} className={control('lg')} />
        </div>
        <button type="submit" className={primaryButton()}>
          {t.common.search}
        </button>
      </form>

      {!report.ok ? (
        <ErrorNotice
          title={t.reports.journalLoadFailed}
          message={report.message}
          status={report.status}
        />
      ) : (
        <Journal report={report.data} t={t} locale={locale} />
      )}

      <p className="text-xs text-subtle">{t.reports.journalNote}</p>
    </main>
  );
}

function Journal({ report, t, locale }: { report: JournalReport; t: Dictionary; locale: Locale }) {
  const { revenue, payments, ledger } = report;

  return (
    <div className="flex flex-col gap-8">
      {!ledger.balanced && (
        <ErrorNotice
          title={t.reports.unbalancedTitle}
          message={fill(t.reports.unbalancedMessage, {
            closing: money(ledger.closingBalance, locale),
            outstanding: money(ledger.outstanding, locale),
          })}
        />
      )}

      {report.unmappedCodes.length > 0 && (
        <InfoNotice
          title={t.reports.unmappedTitle}
          message={fill(t.reports.unmappedMessage, { codes: report.unmappedCodes.join(', ') })}
        />
      )}

      <section aria-label={t.reports.totals} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t.reports.grossTotal} value={money(revenue.total.gross, locale)} />
        <StatTile label={t.reports.net} value={money(revenue.total.net, locale)} />
        <StatTile
          label={t.reports.serviceCharge}
          value={money(revenue.total.serviceCharge, locale)}
        />
        <StatTile label={t.reports.vat} value={money(revenue.total.vat, locale)} />
      </section>

      <section aria-label={t.reports.revenueSection} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
          {t.reports.revenueSection}
        </h2>

        {revenue.groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-current/20 px-4 py-8 text-center text-sm text-subtle">
            {t.reports.revenueEmpty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <caption className="sr-only">{t.reports.revenueCaption}</caption>
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.reports.code}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.reports.name}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.reports.count}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.reports.gross}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.reports.net}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.reports.serviceCharge}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    {t.reports.vat}
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
                      {money(group.gross, locale)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {money(group.net, locale)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {money(group.serviceCharge, locale)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{money(group.vat, locale)}</td>
                  </tr>
                  {group.codes.map((code) => (
                    <tr key={code.transactionCode} className="border-b border-current/5">
                      <td className="py-2.5 pr-4 pl-4 font-mono text-xs">
                        {code.transactionCode}
                        {code.unmapped && (
                          <span className="ml-1.5 text-red-700 dark:text-red-300">
                            {t.reports.unmappedTag}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-subtle">{code.name}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                        {code.count}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {money(code.gross, locale)}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                        {money(code.net, locale)}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                        {money(code.serviceCharge, locale)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-subtle">
                        {money(code.vat, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </section>

      <section aria-label={t.reports.collectionsSection} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
          {t.reports.collectionsSection}
        </h2>

        {payments.methods.length === 0 ? (
          <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
            {t.reports.collectionsEmpty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <caption className="sr-only">{t.reports.collectionsCaption}</caption>
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.reports.method}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.reports.count}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    {t.reports.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.methods.map((row) => (
                  <tr key={row.method} className="border-b border-current/5">
                    <td className="py-2.5 pr-4">
                      {/* BE sends the method as a plain code. Unknown codes show as they are. */}
                      {(t.payments.methods as Record<string, string>)[row.method] ?? row.method}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">{row.count}</td>
                    <td className="py-2.5 text-right tabular-nums">{money(row.amount, locale)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                    {t.reports.total}
                  </th>
                  <td />
                  <td className="py-2.5 text-right font-medium tabular-nums">
                    {money(payments.total, locale)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-subtle">{t.reports.collectionsNote}</p>
      </section>

      <section aria-label={t.reports.reconcileSection} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
          {t.reports.reconcileTitle}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t.reports.openingBalance} value={money(ledger.openingBalance, locale)} />
          <StatTile label={t.reports.dayCharges} value={money(ledger.charges, locale)} />
          <StatTile label={t.reports.dayPayments} value={money(ledger.payments, locale)} />
          <StatTile
            label={t.reports.closingBalance}
            value={money(ledger.closingBalance, locale)}
            hint={ledger.balanced ? t.reports.balancedHint : t.reports.unbalancedHint}
          />
        </div>
        <p className="text-xs text-subtle">
          {fill(t.reports.reconcileNote, { outstanding: money(ledger.outstanding, locale) })}
        </p>
      </section>
    </div>
  );
}
