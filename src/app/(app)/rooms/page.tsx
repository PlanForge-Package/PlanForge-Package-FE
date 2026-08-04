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

/** 화면 아래에 코드-이름 대응을 적어 둔다. OPERA 코드를 그대로 보는 사람이 있다. */
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

  // 호텔은 URL 이 아니라 선택기가 정한다. 쿼리스트링으로 받으면 주소만 고치면
  // 남의 호텔을 볼 수 있다는 인상을 주는데, 실제로는 BE 가 403 을 낸다.
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
    // 사용 불가 등록의 객실 선택은 화면 필터와 무관해야 한다. 청소 상태로 걸러
    // 놓은 목록만 주면, 필터가 걸린 동안에는 나머지 객실을 고를 수 없다.
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
