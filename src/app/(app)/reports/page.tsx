import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary, type Dictionary } from '@/lib/i18n';
import { fill, money } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/locales';
import { getPropertyContext } from '@/lib/property';
import { label } from '@/lib/channel-labels';
import type { BreakdownRow, DailyReport } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reports — PlanForge',
};

const fieldClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';

function day(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
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
  // Defaults to the last 7 days. Today is unfinished and only half counted, so it ends yesterday.
  const from = params.from ?? day(-7);
  const to = params.to ?? day(-1);

  const user = await requireUser('/reports');
  const { locale, t } = await getDictionary();
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.reports.title} />
        <EmptyState message={t.common.noAccess} />
      </main>
    );
  }

  const report = await tryFetch(
    apiFetch<DailyReport>('be', '/api/reports/daily', { query: { propertyId, from, to } }),
  );

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title={t.reports.title}
        description={fill(t.reports.description, { property: property.selected?.name ?? '' })}
      />

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-xs text-subtle">
            {t.reports.startDate}
          </label>
          <input id="from" name="from" type="date" defaultValue={from} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-xs text-subtle">
            {t.reports.endDate}
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className={fieldClass} />
        </div>
        <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
          {t.common.search}
        </button>

        {/* Sales metrics and the accounting close are different questions, so they are
            separate screens with a link between them. */}
        <Link
          href={`/reports/journal?date=${to}`}
          className="rounded-md border border-current/20 px-3 py-1.5 text-sm transition-colors hover:bg-current/5"
        >
          {t.reports.journalLink}
        </Link>
      </form>

      {!report.ok ? (
        <ErrorNotice
          title={t.reports.loadFailed}
          message={report.message}
          status={report.status}
        />
      ) : (
        <Report data={report.data} t={t} locale={locale} />
      )}
    </main>
  );
}

function BreakdownTable({
  title,
  rows,
  labels,
  currency,
  t,
  locale,
}: {
  title: string;
  rows: BreakdownRow[];
  labels: Record<string, string>;
  currency: string;
  t: Dictionary;
  locale: Locale;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs uppercase tracking-wide text-subtle">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-subtle">{t.reports.noSales}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-current/10 text-left">
              <th scope="col" className="py-2 pr-2 font-medium">
                {t.reports.breakdownGroup}
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                {t.reports.breakdownSold}
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                {t.reports.breakdownShare}
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {t.reports.breakdownRevenue}
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
                <td className="py-2 text-right tabular-nums">
                  {money(row.roomRevenue, locale, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Report({
  data,
  t,
  locale,
}: {
  data: DailyReport;
  t: Dictionary;
  locale: Locale;
}) {
  const { currency } = data;

  return (
    <>
      <section aria-label={t.reports.periodSummary} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t.reports.occupancy} value={percent(data.totals.occupancy)} />
        <StatTile label="ADR" value={money(data.totals.adr, locale, currency)} />
        <StatTile label="RevPAR" value={money(data.totals.revpar, locale, currency)} />
        <StatTile
          label={t.reports.roomRevenue}
          value={money(data.totals.roomRevenue, locale, currency)}
        />
      </section>

      <p className="text-xs text-subtle">
        {fill(t.reports.basisNote, {
          nights: data.nights,
          available: data.roomsAvailable,
          sold: data.totals.roomsSold,
          basis: data.basis,
        })}
      </p>

      <section aria-label={t.reports.postingsSection} className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t.reports.postingsTitle}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t.reports.charges} value={money(data.postings.charges, locale, currency)} />
          <StatTile
            label={t.reports.payments}
            value={money(data.postings.payments, locale, currency)}
          />
          <StatTile
            label={t.reports.adjustments}
            value={money(data.postings.adjustments, locale, currency)}
          />
          <StatTile
            label={t.reports.outstanding}
            value={money(data.postings.outstanding, locale, currency)}
          />
        </div>
        <p className="text-xs text-subtle">{t.reports.postingsNote}</p>
      </section>

      <section aria-label={t.reports.channelSection} className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium">{t.reports.channelTitle}</h2>
          <p className="mt-1 text-xs text-subtle">{t.reports.channelNote}</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <BreakdownTable
            title={t.reports.channelHeading}
            rows={data.breakdown.channel}
            labels={t.channelCodes}
            currency={currency}
            t={t}
            locale={locale}
          />
          <BreakdownTable
            title={t.reports.sourceHeading}
            rows={data.breakdown.source}
            labels={t.sourceCodes}
            currency={currency}
            t={t}
            locale={locale}
          />
          <BreakdownTable
            title={t.reports.marketHeading}
            rows={data.breakdown.market}
            labels={t.marketCodes}
            currency={currency}
            t={t}
            locale={locale}
          />
        </div>
      </section>

      <section aria-label={t.reports.dailySection} className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t.reports.dailyTitle}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.reports.date}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t.reports.sold}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t.reports.onBooks}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t.reports.occupancy}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  ADR
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  RevPAR
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  {t.reports.roomRevenue}
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
                    {money(row.adr, locale, currency)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {money(row.revpar, locale, currency)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {money(row.roomRevenue, locale, currency)}
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
