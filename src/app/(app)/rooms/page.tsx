import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { RoomStatusPanel } from '@/components/room-status';
import { ROOM_LABELS } from '@/components/status-badge';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { Room, RoomStatusSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  // 호텔은 URL 이 아니라 선택기가 정한다. 쿼리스트링으로 받으면 주소만 고치면
  // 남의 호텔을 볼 수 있다는 인상을 주는데, 실제로는 BE 가 403 을 낸다.
  const user = await requireUser('/rooms');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (property.error) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="객실" />
        <ErrorNotice title="호텔 목록을 불러오지 못했습니다" message={property.error} />
      </main>
    );
  }

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="객실" />
        <EmptyState message="접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요." />
      </main>
    );
  }

  const [rooms, summary] = await Promise.all([
    tryFetch(
      apiFetch<Room[]>('be', '/api/rooms', {
        query: { propertyId, status: status || undefined },
      }),
    ),
    tryFetch(apiFetch<RoomStatusSummary>('be', '/api/rooms/summary', { query: { propertyId } })),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="객실"
        description={`${property.selected?.name} — 하우스키핑 상태와 재실 현황입니다.`}
      />

      {summary.ok && (
        <section aria-label="객실 요약" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="전체" value={summary.data.total} />
          <StatTile label="재실" value={summary.data.occupied} />
          <StatTile label="공실" value={summary.data.vacant} />
          <StatTile label="청소 필요" value={summary.data.byStatus.DIRTY} />
        </section>
      )}

      {!rooms.ok ? (
        <ErrorNotice
          title="객실을 불러오지 못했습니다"
          message={rooms.message}
          status={rooms.status}
        />
      ) : rooms.data.length === 0 ? (
        <EmptyState message="등록된 객실이 없습니다. 먼저 예약 동기화를 실행해 주세요." />
      ) : (
        <RoomStatusPanel rooms={rooms.data} />
      )}

      <p className="text-xs text-subtle">
        상태 표기:{' '}
        {Object.entries(ROOM_LABELS)
          .map(([key, label]) => `${key}=${label}`)
          .join(' · ')}
      </p>
    </main>
  );
}
