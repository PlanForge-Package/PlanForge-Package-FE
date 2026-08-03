'use client';

import { useActionState } from 'react';
import { checkInAction, checkOutAction } from '@/app/(app)/reservations/[id]/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ReservationStatus } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

/** BE 와 같은 규칙. 여기서 미리 걸러 불필요한 왕복을 줄이되, 판단의 근거는 BE 다. */
const CHECK_IN_ALLOWED: ReservationStatus[] = ['RESERVED', 'CONFIRMED'];

/**
 * 체크인·체크아웃 패널.
 *
 * 두 액션 상태를 모두 이 컴포넌트가 들고 있는 이유: 체크인에 성공하면 상태가
 * IN_HOUSE 로 바뀌어 체크인 폼이 체크아웃 폼으로 교체된다. 상태를 각 폼이 들고
 * 있으면 폼이 언마운트되면서 "체크인했습니다" 가 그대로 사라져, 사용자는 성공
 * 여부를 알 수 없다.
 */
export function FrontDeskPanel({
  reservationId,
  status,
  assignedRoomNumber,
}: {
  reservationId: string;
  status: ReservationStatus;
  assignedRoomNumber: string | null;
}) {
  const [checkInState, checkIn] = useActionState<ActionState, FormData>(
    checkInAction.bind(null, reservationId),
    IDLE,
  );
  const [checkOutState, checkOut] = useActionState<ActionState, FormData>(
    checkOutAction.bind(null, reservationId),
    IDLE,
  );

  const canCheckIn = CHECK_IN_ALLOWED.includes(status);
  const canCheckOut = status === 'IN_HOUSE';

  // 가장 최근에 일어난 일을 보여준다. 체크아웃을 시도했다면 그 결과가 우선한다.
  const feedback = checkOutState.status !== 'idle' ? checkOutState : checkInState;

  return (
    <section className="rounded-lg border border-current/10 px-4 py-3">
      <h2 className="text-sm font-medium">프론트데스크</h2>

      {canCheckIn && (
        <form action={checkIn} className="mt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="roomNumber" className="text-xs opacity-70">
                객실 번호
              </label>
              <input
                id="roomNumber"
                name="roomNumber"
                defaultValue={assignedRoomNumber ?? ''}
                placeholder="예: 1501"
                inputMode="numeric"
                className="rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
              />
            </div>
            <SubmitButton pendingLabel="체크인 중…">체크인</SubmitButton>
          </div>
          <p className="mt-1.5 text-xs opacity-50">
            비워 두면 예약에 이미 배정된 객실을 사용합니다.
          </p>
        </form>
      )}

      {canCheckOut && (
        <form action={checkOut} className="mt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="notes" className="text-xs opacity-70">
                메모 (선택)
              </label>
              <input
                id="notes"
                name="notes"
                placeholder="체크아웃 메모"
                className="w-64 rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
              />
            </div>
            <SubmitButton pendingLabel="체크아웃 중…" confirm="체크아웃하시겠습니까?">
              체크아웃
            </SubmitButton>
          </div>
          <p className="mt-1.5 text-xs opacity-50">
            미결제 잔액이 남아 있으면 체크아웃할 수 없습니다.
          </p>
        </form>
      )}

      {!canCheckIn && !canCheckOut && (
        <p className="mt-1 text-sm opacity-60">현재 상태에서는 체크인·체크아웃할 수 없습니다.</p>
      )}

      <div data-testid="front-desk-feedback">
        <ActionMessage state={feedback} />
      </div>
    </section>
  );
}
