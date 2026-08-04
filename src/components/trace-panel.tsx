'use client';

import { useActionState } from 'react';
import {
  completeTraceAction,
  createTraceAction,
  removeTraceAction,
} from '@/app/(app)/reservations/[id]/trace-actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ReservationTrace, TraceDepartment } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

export const DEPARTMENT_LABELS: Record<TraceDepartment, string> = {
  FRONT_DESK: '프론트데스크',
  HOUSEKEEPING: '하우스키핑',
  MAINTENANCE: '시설',
  FNB: '식음',
  RESERVATION: '예약',
};

const smallButton =
  'rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * 예약에 걸린 지시.
 *
 * "도착일 07:00 하우스키핑 — 유아용 침대" 처럼 특정 날짜에 특정 부서가 해야 할
 * 일이다. 예약 메모에 적어 두면 그 부서가 예약을 열어 보지 않는 한 아무도
 * 읽지 않는다.
 */
export function TracePanel({
  reservationId,
  departureDate,
  traces,
  canEdit,
}: {
  reservationId: string;
  departureDate: string;
  traces: ReservationTrace[];
  canEdit: boolean;
}) {
  const [createState, createAction] = useActionState<ActionState, FormData>(
    createTraceAction.bind(null, reservationId),
    IDLE,
  );
  const [rowState, rowAction] = useActionState<ActionState, FormData>(completeTraceAction, IDLE);
  const [removeState, removeAction] = useActionState<ActionState, FormData>(
    removeTraceAction,
    IDLE,
  );

  /*
   * 표시할 메시지는 마지막에 실행한 동작을 따른다.
   *
   * 처리한 지시는 목록에서 상태만 바뀌고 거둔 지시는 사라지므로, 행이 상태를
   * 들고 있으면 결과가 함께 사라진다.
   */
  const state =
    removeState.status !== 'idle'
      ? removeState
      : rowState.status !== 'idle'
        ? rowState
        : createState;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section aria-label="지시" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">지시 (트레이스)</h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {canEdit && (
        <form action={createAction} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-subtle">
            부서
            <select
              name="department"
              defaultValue={createState.values?.department ?? 'HOUSEKEEPING'}
              className="rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            >
              {(Object.keys(DEPARTMENT_LABELS) as TraceDepartment[]).map((value) => (
                <option key={value} value={value}>
                  {DEPARTMENT_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            날짜
            <input
              type="date"
              name="dueDate"
              max={departureDate.slice(0, 10)}
              defaultValue={createState.values?.dueDate ?? today}
              required
              className="rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            내용
            <input
              type="text"
              name="note"
              maxLength={300}
              defaultValue={createState.values?.note ?? ''}
              required
              placeholder="유아용 침대 준비"
              className="w-72 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <SubmitButton pendingLabel="거는 중…">지시 걸기</SubmitButton>
        </form>
      )}

      {traces.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          걸린 지시가 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {traces.map((trace) => {
            const done = trace.status === 'DONE';
            return (
              <li
                key={trace.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-current/10 px-3 py-2 text-sm"
              >
                <span className="tabular-nums text-subtle">{trace.dueDate.slice(0, 10)}</span>
                <span className="rounded-full bg-current/10 px-2 py-0.5 text-xs">
                  {DEPARTMENT_LABELS[trace.department]}
                </span>
                <span className={`flex-1 ${done ? 'text-subtle line-through' : ''}`}>
                  {trace.note}
                </span>

                {done ? (
                  <span className="text-xs text-subtle">
                    {trace.completedBy?.name ?? '누군가'} 처리
                  </span>
                ) : (
                  <>
                    <form action={rowAction}>
                      <input type="hidden" name="traceId" value={trace.id} />
                      <input type="hidden" name="reservationId" value={reservationId} />
                      <input type="hidden" name="note" value={trace.note} />
                      <SubmitButton pendingLabel="…" className={smallButton}>
                        처리
                      </SubmitButton>
                    </form>
                    {canEdit && (
                      <form action={removeAction}>
                        <input type="hidden" name="traceId" value={trace.id} />
                        <input type="hidden" name="reservationId" value={reservationId} />
                        <SubmitButton pendingLabel="…" className={smallButton}>
                          거두기
                        </SubmitButton>
                      </form>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-subtle">
        처리된 지시는 지울 수 없습니다 — 무엇을 했는지가 이력이고, 지우면 안 한 것과 구분되지
        않습니다. 잘못 건 지시만 거둘 수 있습니다.
      </p>
    </section>
  );
}
