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
import { control, ghostButton } from './ui';

export const DEPARTMENT_LABELS: Record<TraceDepartment, string> = {
  FRONT_DESK: '프론트데스크',
  HOUSEKEEPING: '하우스키핑',
  MAINTENANCE: '시설',
  FNB: '식음',
  RESERVATION: '예약',
};

/**
 * Instructions attached to a reservation.
 *
 * "07:00 on arrival, housekeeping — crib": work a given department must do on a
 * given date. Written in the reservation notes, nobody reads it unless that
 * department opens the reservation.
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
   * The message shown follows whichever action ran last.
   *
   * A completed instruction only changes status in the list while a withdrawn one
   * disappears, so state held on the row would take the result with it.
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
              className={control('md')}
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
              className={control('md')}
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
              className={control('md', 'w-72')}
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
                      <SubmitButton pendingLabel="…" className={ghostButton()}>
                        처리
                      </SubmitButton>
                    </form>
                    {canEdit && (
                      <form action={removeAction}>
                        <input type="hidden" name="traceId" value={trace.id} />
                        <input type="hidden" name="reservationId" value={reservationId} />
                        <SubmitButton pendingLabel="…" className={ghostButton()}>
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
