'use client';

import { useActionState } from 'react';
import { confirmWaitlistAction } from '@/app/(app)/reservations/[id]/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ReservationStatus } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

/**
 * Waitlist confirmation.
 *
 * A waitlisted reservation holds no inventory. OPERA counts availability at the
 * moment of confirming, so the button is not hidden on a guess here — another
 * waitlisted booking may have been confirmed first, and only pressing it tells you.
 *
 * Confirming clears the waitlist state and should hide this panel, but disappearing
 * would take the result message with it. Whoever confirmed would not know what
 * happened, so the last result stays even once it is no longer waitlisted.
 */
export function WaitlistPanel({
  reservationId,
  status,
}: {
  reservationId: string;
  status: ReservationStatus;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    confirmWaitlistAction.bind(null, reservationId),
    IDLE,
  );

  const waiting = status === 'WAITLISTED';
  if (!waiting && state.status === 'idle') return null;

  return (
    <section
      aria-label="대기 예약"
      className={`flex flex-col gap-2 rounded-lg border px-4 py-3 ${
        waiting ? 'border-amber-500/30 bg-amber-500/5' : 'border-current/10'
      }`}
    >
      {waiting && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium">대기 예약</h2>
            <p className="mt-0.5 text-sm text-subtle">
              자리가 없어 대기로 받은 예약입니다. 재고를 차지하지 않으며, 자리가 나면 확정해 주세요.
            </p>
          </div>
          <form action={action}>
            <SubmitButton pendingLabel="확정 중…">대기 확정</SubmitButton>
          </form>
        </div>
      )}

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>
    </section>
  );
}
