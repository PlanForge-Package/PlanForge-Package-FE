import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { RoomOutagePanel } from '@/components/room-outage-panel';
import { RoomStatusPanel } from '@/components/room-status';

import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { getPropertyContext } from '@/lib/property';
import type { Room, RoomOutageList, RoomStatus, RoomStatusSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** A code-to-name key at the foot of the screen. Some people read OPERA codes directly. */
const ROOM_STATUSES: RoomStatus[] = [
  'CLEAN',
  'DIRTY',
  'INSPECTED',
  'OUT_OF_ORDER',
  'OUT_OF_SERVICE',
];

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  // The hotel comes from the picker, not the URL. Taking it from the query string
  // suggests editing the address shows another hotel; in reality BE returns 403.
  const user = await requireUser('/rooms');
  const { t } = await getDictionary();
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (property.error) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.rooms.title} />
        <ErrorNotice title="호텔 목록을 불러오지 못했습니다" message={property.error} />
      </main>
    );
  }

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.rooms.title} />
        <EmptyState message={t.common.noAccess} />
      </main>
    );
  }

  const [rooms, summary, outages, allRooms] = await Promise.all([
    tryFetch(
      apiFetch<Room[]>('be', '/api/rooms', {
        query: { propertyId, status: status || undefined },
      }),
    ),
    tryFetch(apiFetch<RoomStatusSummary>('be', '/api/rooms/summary', { query: { propertyId } })),
    tryFetch(apiFetch<RoomOutageList>('be', '/api/room-outages', { query: { propertyId } })),
    // Room selection for an outage must not depend on the screen filter. Offering only
    // the filtered list would make the other rooms unpickable while a filter is on.
    status
      ? tryFetch(apiFetch<Room[]>('be', '/api/rooms', { query: { propertyId } }))
      : Promise.resolve(null),
  ]);

  const selectableRooms = allRooms?.ok ? allRooms.data : rooms.ok ? rooms.data : [];

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title={t.rooms.title}
        description={`${property.selected?.name} — ${t.rooms.description}`}
      />

      {summary.ok && (
        <section aria-label={t.rooms.summary} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t.common.all} value={summary.data.total} />
          <StatTile label={t.rooms.inUse} value={summary.data.occupied} />
          <StatTile label={t.rooms.vacant} value={summary.data.vacant} />
          <StatTile label={t.roomStatus.DIRTY} value={summary.data.byStatus.DIRTY} />
        </section>
      )}

      {!rooms.ok ? (
        <ErrorNotice title={t.rooms.loadFailed} message={rooms.message} status={rooms.status} />
      ) : rooms.data.length === 0 ? (
        <EmptyState message={t.rooms.empty} />
      ) : (
        <RoomStatusPanel rooms={rooms.data} />
      )}

      {!outages.ok ? (
        <ErrorNotice
          title="사용 불가 객실을 불러오지 못했습니다"
          message={outages.message}
          status={outages.status}
        />
      ) : (
        <RoomOutagePanel
          propertyId={propertyId}
          rooms={selectableRooms}
          outages={outages.data.items}
        />
      )}

      <p className="text-xs text-subtle">
        {ROOM_STATUSES.map((status) => `${status}=${t.roomStatus[status]}`).join(' · ')}
      </p>
    </main>
  );
}
