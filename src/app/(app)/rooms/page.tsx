import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { ROOM_LABELS, RoomStatusBadge } from '@/components/status-badge';
import { apiFetch, tryFetch } from '@/lib/api';
import type { Room, RoomStatusSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; status?: string }>;
}) {
  const { propertyId, status } = await searchParams;

  const [rooms, summary] = await Promise.all([
    tryFetch(
      apiFetch<Room[]>('be', '/api/rooms', {
        query: { propertyId: propertyId || undefined, status: status || undefined },
      }),
    ),
    // 집계는 propertyId 가 있을 때만 의미가 있다.
    propertyId
      ? tryFetch(apiFetch<RoomStatusSummary>('be', '/api/rooms/summary', { query: { propertyId } }))
      : Promise.resolve(null),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader title="객실" description="하우스키핑 상태와 재실 현황입니다." />

      {summary?.ok && (
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  객실
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  층
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  타입
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  상태
                </th>
                <th scope="col" className="py-2 font-medium">
                  재실
                </th>
              </tr>
            </thead>
            <tbody>
              {rooms.data.map((room) => (
                <tr key={room.id} className="border-b border-current/5">
                  <td className="py-2.5 pr-4 font-medium tabular-nums">{room.number}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{room.floor ?? '—'}</td>
                  <td className="py-2.5 pr-4">{room.roomType.code}</td>
                  <td className="py-2.5 pr-4">
                    <RoomStatusBadge status={room.status} />
                  </td>
                  <td className="py-2.5">{room.occupied ? '재실' : '공실'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs opacity-50">
        상태 표기:{' '}
        {Object.entries(ROOM_LABELS)
          .map(([key, label]) => `${key}=${label}`)
          .join(' · ')}
      </p>
    </main>
  );
}
