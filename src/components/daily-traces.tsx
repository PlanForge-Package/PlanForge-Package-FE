'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { completeTraceAction } from '@/app/(app)/reservations/[id]/trace-actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ReservationTrace } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { DEPARTMENT_LABELS } from './trace-panel';
import { ghostButton } from './ui';

/**
 * Instructions due today.
 *
 * On the reservation detail alone, only whoever opens that reservation sees them.
 * They have to be on the screen a department opens in the morning to be delivered.
 */
export function DailyTraces({ traces }: { traces: ReservationTrace[] }) {
  const [state, action] = useActionState<ActionState, FormData>(completeTraceAction, IDLE);

  const pending = traces.filter((trace) => trace.status === 'PENDING');

  return (
    <section aria-label="오늘의 지시" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">오늘의 지시</h2>
        <span className="text-xs text-subtle">
          미처리 {pending.length}건 / 전체 {traces.length}건
        </span>
      </div>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {traces.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          오늘 처리할 지시가 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {traces.map((trace) => {
            const done = trace.status === 'DONE';
            const guest =
              [trace.reservation.profile.lastName, trace.reservation.profile.firstName]
                .filter(Boolean)
                .join(' ') || '(이름 없음)';

            return (
              <li
                key={trace.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-current/10 px-3 py-2 text-sm"
              >
                <span className="rounded-full bg-current/10 px-2 py-0.5 text-xs">
                  {DEPARTMENT_LABELS[trace.department]}
                </span>
                <Link
                  href={`/reservations/${trace.reservation.id}`}
                  className="underline underline-offset-4"
                >
                  {trace.reservation.assignedRoomNumber ?? '미배정'} · {guest}
                </Link>
                <span className={`flex-1 ${done ? 'text-subtle line-through' : ''}`}>
                  {trace.note}
                </span>

                {done ? (
                  <span className="text-xs text-subtle">
                    {trace.completedBy?.name ?? '누군가'} 처리
                  </span>
                ) : (
                  <form action={action}>
                    <input type="hidden" name="traceId" value={trace.id} />
                    <input type="hidden" name="reservationId" value={trace.reservation.id} />
                    <input type="hidden" name="note" value={trace.note} />
                    <SubmitButton pendingLabel="…" className={ghostButton()}>
                      처리
                    </SubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
