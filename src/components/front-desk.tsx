'use client';

import { useActionState } from 'react';
import { checkInAction, checkOutAction } from '@/app/(app)/reservations/[id]/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ReservationStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n/provider';
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
  const t = useI18n();
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
      <h2 className="text-sm font-medium">{t.frontDesk.panelTitle}</h2>

      {canCheckIn && (
        <form action={checkIn} className="mt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="roomNumber" className="text-xs text-subtle">
                {t.frontDesk.roomNumber}
              </label>
              <input
                id="roomNumber"
                name="roomNumber"
                defaultValue={assignedRoomNumber ?? ''}
                placeholder={t.frontDesk.roomPlaceholder}
                inputMode="numeric"
                className="rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
              />
            </div>
            <SubmitButton pendingLabel={t.frontDesk.checkingIn}>{t.frontDesk.checkIn}</SubmitButton>
          </div>
          <p className="mt-1.5 text-xs text-subtle">{t.frontDesk.roomHint}</p>
        </form>
      )}

      {canCheckOut && (
        <form action={checkOut} className="mt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="notes" className="text-xs text-subtle">
                {t.frontDesk.checkOutNote}
              </label>
              <input
                id="notes"
                name="notes"
                placeholder={t.frontDesk.checkOutPlaceholder}
                className="w-64 rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
              />
            </div>
            <SubmitButton
              pendingLabel={t.frontDesk.checkingOut}
              confirm={t.frontDesk.checkOutConfirm}
            >
              {t.frontDesk.checkOut}
            </SubmitButton>
          </div>
          <p className="mt-1.5 text-xs text-subtle">{t.frontDesk.balanceNote}</p>
        </form>
      )}

      {!canCheckIn && !canCheckOut && (
        <p className="mt-1 text-sm text-subtle">{t.frontDesk.notAvailable}</p>
      )}

      <div data-testid="front-desk-feedback">
        <ActionMessage state={feedback} />
      </div>
    </section>
  );
}
