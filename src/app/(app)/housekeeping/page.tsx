import type { Metadata } from 'next';
import { GenerateTasksForm, HousekeepingBoard } from '@/components/housekeeping-board';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { Discrepancy, DiscrepancyResponse, ManagedUser, TaskListResponse } from '@/lib/types';

interface AttendantResponse {
  propertyId: string;
  items: Pick<ManagedUser, 'id' | 'name' | 'role'>[];
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '하우스키핑 — PlanForge',
};

/** 배정과 작업 생성은 매니저·프론트데스크가 한다. */
const CAN_MANAGE = ['ADMIN', 'MANAGER', 'FRONT_DESK'];

const DISCREPANCY_LABELS: Record<Discrepancy['kind'], string> = {
  OCCUPIED_WITHOUT_RESERVATION: '재실 표시인데 재실 예약이 없습니다 — 체크아웃 누락 가능성',
  RESERVATION_WITHOUT_OCCUPANCY: '재실 예약이 있는데 객실이 비어 있습니다 — 배정 확인 필요',
  OCCUPIED_BUT_CLEAN: '재실 중인데 청소 완료로 표시되어 있습니다',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function HousekeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const workDate = date ?? today();

  const user = await requireUser('/housekeeping');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;
  const canManage = CAN_MANAGE.includes(user.role);

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="하우스키핑" />
        <EmptyState message="접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요." />
      </main>
    );
  }

  // 담당자 목록은 배정 권한이 있을 때만 필요하다. 없으면 부르지 않는다.
  const [tasks, discrepancies, attendants] = await Promise.all([
    tryFetch(
      apiFetch<TaskListResponse>('be', '/api/housekeeping/tasks', {
        query: { propertyId, date: workDate },
      }),
    ),
    canManage
      ? tryFetch(
          apiFetch<DiscrepancyResponse>('be', '/api/housekeeping/discrepancies', {
            query: { propertyId },
          }),
        )
      : Promise.resolve(null),
    // 계정 목록은 ADMIN 전용이라 매니저가 부를 수 없다. 배정에 필요한
    // 최소 정보만 주는 전용 엔드포인트를 쓴다.
    canManage
      ? tryFetch(
          apiFetch<AttendantResponse>('be', '/api/housekeeping/attendants', {
            query: { propertyId },
          }),
        )
      : Promise.resolve(null),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="하우스키핑"
        description={`${property.selected?.name} — ${workDate} 근무 작업입니다.`}
      />

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-xs text-subtle">
            근무일
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={workDate}
            className="rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
          조회
        </button>
      </form>

      {canManage && <GenerateTasksForm propertyId={propertyId} date={workDate} />}

      {discrepancies?.ok && discrepancies.data.total > 0 && (
        <section
          aria-label="불일치"
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3"
        >
          <h2 className="text-sm font-medium">확인이 필요한 객실 {discrepancies.data.total}건</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {discrepancies.data.items.map((item) => (
              <li key={`${item.room.id}-${item.kind}`}>
                <span className="font-medium tabular-nums">{item.room.number}</span>
                <span className="ml-2 text-subtle">{DISCREPANCY_LABELS[item.kind]}</span>
                {item.reservation && (
                  <span className="ml-2 font-mono text-xs">{item.reservation}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!tasks.ok ? (
        <ErrorNotice
          title="작업을 불러오지 못했습니다"
          message={tasks.message}
          status={tasks.status}
        />
      ) : tasks.data.items.length === 0 ? (
        <EmptyState
          message={
            canManage
              ? '이 날짜의 작업이 없습니다. 위의 작업 생성을 눌러 만들 수 있습니다.'
              : '배정된 작업이 없습니다.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-subtle">전체 {tasks.data.total}건</p>
          <HousekeepingBoard
            tasks={tasks.data.items}
            attendants={attendants?.ok ? attendants.data.items : []}
            canAssign={canManage}
            myId={user.id}
          />
        </>
      )}
    </main>
  );
}
