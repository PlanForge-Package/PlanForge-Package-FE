'use client';

import { useActionState } from 'react';
import { checkInAction, checkOutAction } from '@/app/(app)/reservations/[id]/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ReservationStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n/provider';
import { ActionMessage, SubmitButton } from './action-feedback';
import { control } from './ui';

/** The same rule as BE. Filtering here saves a round trip, but BE decides. */
const CHECK_IN_ALLOWED: ReservationStatus[] = ['RESERVED', 'CONFIRMED'];

/**
 * Check-in and check-out panel.
 *
 * Both action states live in this component because a successful check-in flips the
 * status to IN_HOUSE and swaps the check-in form for the check-out one. With state
 * on each form, unmounting would take "checked in" away with it and leave the user
 * unable to tell whether it worked.
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

  // Shows whatever happened most recently. A check-out attempt takes priority.
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
                className={control('lg')}
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
                className={control('lg', 'w-64')}
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
