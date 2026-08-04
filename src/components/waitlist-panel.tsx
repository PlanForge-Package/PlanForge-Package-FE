'use client';

import { useActionState } from 'react';
import { confirmWaitlistAction } from '@/app/(app)/reservations/[id]/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ReservationStatus } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

/**
 * 대기 확정.
 *
 * 대기 예약은 재고를 차지하지 않는다. 자리가 났는지는 확정하는 순간 OPERA 가
 * 세어 보므로, 여기서 미리 판단해 버튼을 감추지 않는다 — 그 사이 다른 대기
 * 건이 먼저 확정됐을 수도 있고, 그 사실은 눌러 봐야 알 수 있다.
 *
 * 확정하면 대기 상태가 풀려 이 패널을 감춰야 하는데, 그대로 사라지면 결과
 * 메시지도 함께 사라진다. 확정한 사람이 무엇이 일어났는지 알 수 없으므로,
 * 대기가 아니게 된 뒤에도 마지막 결과는 남긴다.
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
