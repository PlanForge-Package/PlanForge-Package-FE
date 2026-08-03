import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { ReservationStatusBadge } from '@/components/status-badge';
import { apiFetch, tryFetch } from '@/lib/api';
import type { ReservationListResponse, ReservationStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS: Array<{ value: ReservationStatus | ''; label: string }> = [
  { value: '', label: '전체' },
  { value: 'CONFIRMED', label: '확정' },
  { value: 'IN_HOUSE', label: '재실' },
  { value: 'CHECKED_OUT', label: '체크아웃' },
  { value: 'CANCELLED', label: '취소' },
];

function guestName(reservation: ReservationListResponse['items'][number]): string {
  const { lastName, firstName } = reservation.profile;
  const name = [lastName, firstName].filter(Boolean).join(' ');
  return name || '(이름 없음)';
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;

  const result = await tryFetch(
    apiFetch<ReservationListResponse>('be', '/api/reservations', {
      query: { status: status || undefined, q: q || undefined, limit: 50 },
    }),
  );

  return (
    <main className="flex flex-col gap-6">
      <PageHeader title="예약" description="Core 를 통해 OPERA 에서 동기화된 예약 목록입니다." />

      <form className="flex flex-wrap items-center gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          확인 번호 또는 게스트 이름
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q ?? ''}
          placeholder="확인 번호 · 게스트 이름"
          className="rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
        />
        <label htmlFor="status" className="sr-only">
          상태
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ''}
          className="rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-current/20 px-3 py-1.5 text-sm font-medium hover:bg-current/5"
        >
          조회
        </button>
      </form>

      {!result.ok ? (
        <ErrorNotice title="예약을 불러오지 못했습니다" message={result.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState message="조건에 맞는 예약이 없습니다." />
      ) : (
        <>
          <p className="text-sm opacity-60">전체 {result.data.total.toLocaleString()}건</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    확인 번호
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    게스트
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    도착
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    출발
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    객실 타입
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    객실
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((reservation) => (
                  <tr key={reservation.id} className="border-b border-current/5">
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {reservation.confirmationNumber}
                    </td>
                    <td className="py-2.5 pr-4">
                      {guestName(reservation)}
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
