import Link from 'next/link';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { ReservationStatusBadge } from '@/components/status-badge';
import { apiFetch, tryFetch } from '@/lib/api';
import { label } from '@/lib/channel-labels';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { getPropertyContext } from '@/lib/property';
import type { ReservationListResponse, ReservationStatus } from '@/lib/types';
import { control, primaryButton } from '@/components/ui';

export const dynamic = 'force-dynamic';

/** Statuses used in the filter. Names come from the dictionary and follow the screen language. */
const STATUS_FILTERS: Array<ReservationStatus | ''> = [
  '',
  'CONFIRMED',
  'IN_HOUSE',
  'CHECKED_OUT',
  'CANCELLED',
];

function guestName(
  reservation: ReservationListResponse['items'][number],
  fallback: string,
): string {
  const { lastName, firstName } = reservation.profile;
  const name = [lastName, firstName].filter(Boolean).join(' ');
  return name || fallback;
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; channelCode?: string }>;
}) {
  const { status, q, channelCode } = await searchParams;

  // Narrowed to the selected hotel. A head-office account with none chosen sees them all.
  const user = await requireUser('/reservations');
  const { t } = await getDictionary();
  const property = await getPropertyContext(user);

  const result = await tryFetch(
    apiFetch<ReservationListResponse>('be', '/api/reservations', {
      query: {
        propertyId: property.selected?.id,
        status: status || undefined,
        q: q || undefined,
        channelCode: channelCode || undefined,
        limit: 50,
      },
    }),
  );

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title={t.reservations.title}
        description={`${property.selected?.name ?? t.common.allProperties} — ${t.reservations.description}`}
        actions={
          <Link href="/reservations/new" className={primaryButton()}>
            {t.reservations.newReservation}
          </Link>
        }
      />

      <form className="flex flex-wrap items-center gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          {t.reservations.searchLabel}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q ?? ''}
          placeholder={t.reservations.searchPlaceholder}
          className={control('lg')}
        />
        <label htmlFor="status" className="sr-only">
          {t.common.status}
        </label>
        <select id="status" name="status" defaultValue={status ?? ''} className={control('lg')}>
          {STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {value ? t.reservationStatus[value] : t.common.all}
            </option>
          ))}
        </select>
        <label htmlFor="channelCode" className="sr-only">
          {t.reservations.channel}
        </label>
        <select
          id="channelCode"
          name="channelCode"
          defaultValue={channelCode ?? ''}
          className={control('lg')}
        >
          <option value="">{t.reservations.allChannels}</option>
          {Object.entries(t.channelCodes).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <button type="submit" className={primaryButton()}>
          {t.common.search}
        </button>
      </form>

      {!result.ok ? (
        <ErrorNotice
          title={t.reservations.loadFailed}
          message={result.message}
          status={result.status}
        />
      ) : result.data.items.length === 0 ? (
        <EmptyState message={t.reservations.empty} />
      ) : (
        <>
          <p className="text-sm text-subtle">
            {t.common.all} {result.data.total.toLocaleString()}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.reservations.confirmationNumber}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.reservations.guest}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.reservations.arrival}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.reservations.departure}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.reservations.roomType}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.reservations.room}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.reservations.source}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t.common.status}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((reservation) => (
                  <tr key={reservation.id} className="border-b border-current/5">
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      <Link
                        href={`/reservations/${reservation.id}`}
                        className="underline underline-offset-4 hover:no-underline"
                      >
                        {reservation.confirmationNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      {guestName(reservation, t.reservations.unnamed)}
                      {reservation.profile.vip && (
                        <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">
                          VIP
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {formatDate(reservation.arrivalDate)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {formatDate(reservation.departureDate)}
                    </td>
                    <td className="py-2.5 pr-4">{reservation.roomType.code}</td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {reservation.assignedRoomNumber ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      {label(t.channelCodes, reservation.channelCode) === '—'
                        ? label(t.sourceCodes, reservation.sourceCode)
                        : label(t.channelCodes, reservation.channelCode)}
                    </td>
                    <td className="py-2.5">
                      <ReservationStatusBadge status={reservation.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
