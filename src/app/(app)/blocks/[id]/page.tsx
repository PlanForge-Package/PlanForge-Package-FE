import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BlockEditor } from '@/components/block-form';
import { ErrorNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { BlockStatusBadge } from '@/components/status-badge';
import { ApiError, apiFetch, backendMessage, tryFetch } from '@/lib/api';
import { logoutUrl, requireUser } from '@/lib/auth';
import type { Block, BlockRoomingList } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '블록 상세 — PlanForge',
};

/** Editing holds inventory, so managers and above. BE enforces the same rule. */
const CAN_EDIT = ['ADMIN', 'MANAGER'];

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * A 404 goes to its own screen; other failures are handled as a notice in the page.
 * A brief BE outage must not look like "no such block".
 */
async function loadBlock(
  id: string,
): Promise<{ ok: true; data: Block } | { ok: false; message: string; status: number }> {
  try {
    return { ok: true, data: await apiFetch<Block>('be', `/api/blocks/${encodeURIComponent(id)}`) };
  } catch (error) {
    if (error instanceof ApiError && error.notFound) {
      notFound();
    }
    if (error instanceof ApiError && error.unauthorized) {
      redirect(logoutUrl(`/blocks/${id}`, 'expired'));
    }
    return {
      ok: false,
      message: backendMessage(error, '블록을 불러오지 못했습니다.'),
      status: error instanceof ApiError ? error.status : 0,
    };
  }
}

function date(value: string): string {
  return value.slice(0, 10);
}

export default async function BlockDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser(`/blocks/${id}`);

  const block = await loadBlock(id);

  if (!block.ok) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="블록 상세" />
        <ErrorNotice
          title="블록을 불러오지 못했습니다"
          message={block.message}
          status={block.status}
        />
      </main>
    );
  }

  // A failed rooming list still shows the block. That is why they are separate calls.
  const rooming = await tryFetch(
    apiFetch<BlockRoomingList>('be', `/api/blocks/${encodeURIComponent(id)}/reservations`),
  );

  const data = block.data;
  const remaining = data.totalBlocked - data.totalPickedUp;
  const dates = [...new Set(data.allotments.map((slot) => date(slot.date)))].sort();
  const roomTypes = [...new Set(data.allotments.map((slot) => slot.roomTypeCode))].sort();

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/blocks" className="text-sm underline underline-offset-4 text-subtle">
          ← 단체 블록 목록
        </Link>
        <PageHeader
          title={data.name}
          description={`${data.code} · ${date(data.startDate)} ~ ${date(data.endDate)}${
            data.cutoffDate ? ` · 컷오프 ${date(data.cutoffDate)}` : ''
          }`}
          actions={<BlockStatusBadge status={data.status} />}
        />
      </div>

      <section aria-label="요약" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="확보" value={data.totalBlocked} />
        <StatTile label="픽업" value={data.totalPickedUp} />
        <StatTile label="잔여" value={remaining} />
        <StatTile
          label="소진율"
          value={
            data.totalBlocked === 0
              ? '—'
              : `${Math.round((data.totalPickedUp / data.totalBlocked) * 100)}%`
          }
        />
      </section>

      {CAN_EDIT.includes(user.role) && (
        <BlockEditor
          blockId={data.id}
          status={data.status}
          name={data.name}
          cutoffDate={data.cutoffDate}
          // Room types repeat per date. Adjustments are per type, so only one is kept.
          rates={[
            ...new Map(
              data.allotments.map((slot) => [
                slot.roomTypeCode,
                { roomTypeCode: slot.roomTypeCode, amount: slot.amount },
              ]),
            ).values(),
          ]}
        />
      )}

      <section aria-label="일자별 할당" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">일자별 할당</h2>
        {dates.length === 0 ? (
          <p className="text-sm text-subtle">할당된 객실이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">일자와 객실 타입별 확보·픽업 수량</caption>
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    날짜
                  </th>
                  {roomTypes.map((code) => (
                    <th key={code} scope="col" className="py-2 pr-4 text-right font-medium">
                      {code}
                    </th>
                  ))}
                  <th scope="col" className="py-2 text-right font-medium">
                    합계
                  </th>
                </tr>
              </thead>
              <tbody>
                {dates.map((day) => {
                  const row = data.allotments.filter((slot) => date(slot.date) === day);
                  const blocked = row.reduce((sum, slot) => sum + slot.blocked, 0);
                  const pickedUp = row.reduce((sum, slot) => sum + slot.pickedUp, 0);

                  return (
                    <tr key={day} className="border-b border-current/5">
                      <th scope="row" className="py-2.5 pr-4 text-left font-normal tabular-nums">
                        {day}
                      </th>
                      {roomTypes.map((code) => {
                        const slot = row.find((item) => item.roomTypeCode === code);
                        return (
                          <td key={code} className="py-2.5 pr-4 text-right tabular-nums">
                            {slot ? (
                              <>
                                {slot.pickedUp}
                                <span className="text-subtle"> / {slot.blocked}</span>
                              </>
                            ) : (
                              <span className="text-subtle">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 text-right tabular-nums">
                        {pickedUp}
                        <span className="text-subtle"> / {blocked}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-subtle">픽업 / 확보 순으로 표시합니다.</p>
      </section>

      <section aria-label="룸리스트" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">룸리스트</h2>
        {!rooming.ok ? (
          <ErrorNotice
            title="룸리스트를 불러오지 못했습니다"
            message={rooming.message}
            status={rooming.status}
          />
        ) : rooming.data.items.length === 0 ? (
          <p className="text-sm text-subtle">
            아직 이 블록에서 빠져나간 예약이 없습니다. 새 예약에서 블록 {data.code} 를 고르면 여기에
            나타납니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
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
                    타입
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    객실
                  </th>
                </tr>
              </thead>
              <tbody>
                {rooming.data.items.map((item) => (
                  <tr key={item.reservationId} className="border-b border-current/5">
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {item.confirmationNumber ?? item.reservationId}
                    </td>
                    <td className="py-2.5 pr-4">
                      {[item.guest?.lastName, item.guest?.firstName].filter(Boolean).join(' ') ||
                        '(이름 없음)'}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">{date(item.arrivalDate)}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{date(item.departureDate)}</td>
                    <td className="py-2.5 pr-4">{item.roomTypeCode ?? '—'}</td>
                    <td className="py-2.5 tabular-nums">{item.roomNumber ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
