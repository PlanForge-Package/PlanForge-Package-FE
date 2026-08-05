'use client';

import { useActionState, useId, useState } from 'react';
import {
  cancelReservationAction,
  updateReservationAction,
} from '@/app/(app)/reservations/[id]/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ReservationStatus } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { control } from './ui';

/** Reservation details are editable only in these states. After check-in it is front-desk work. */
const EDITABLE: ReservationStatus[] = ['RESERVED', 'CONFIRMED', 'WAITLISTED'];

/**
 * Reservation edit and cancel.
 *
 * Both action states live in this component. A successful cancel changes the status
 * and removes the form; state on each form would take the result message with it.
 */
export function ReservationEditPanel({
  reservationId,
  status,
  arrivalDate,
  departureDate,
  roomTypeCode,
  adults,
  childCount,
}: {
  reservationId: string;
  status: ReservationStatus;
  arrivalDate: string;
  departureDate: string;
  roomTypeCode: string;
  adults: number;
  childCount: number;
}) {
  const [updateState, update] = useActionState<ActionState, FormData>(
    updateReservationAction.bind(null, reservationId),
    IDLE,
  );
  const [cancelState, cancel] = useActionState<ActionState, FormData>(
    cancelReservationAction.bind(null, reservationId),
    IDLE,
  );
  const [last, setLast] = useState<'update' | 'cancel' | null>(null);
  const uid = useId();

  const editable = EDITABLE.includes(status);
  const feedback = last === 'cancel' ? cancelState : last === 'update' ? updateState : IDLE;

  if (!editable) {
    return (
      <section className="rounded-lg border border-current/10 px-4 py-3">
        <h2 className="text-sm font-medium">예약 변경</h2>
        <p className="mt-1 text-sm text-subtle">
          현재 상태에서는 예약 내용을 변경하거나 취소할 수 없습니다.
        </p>
        <ActionMessage state={feedback} />
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-current/10 px-4 py-3">
      <h2 className="text-sm font-medium">예약 변경</h2>

      <form
        action={(formData) => {
          setLast('update');
          update(formData);
        }}
        className="mt-3"
      >
        <fieldset className="flex flex-wrap items-end gap-2">
          <legend className="sr-only">예약 수정</legend>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-arrival`} className="text-xs text-subtle">
              도착일
            </label>
            <input
              id={`${uid}-arrival`}
              name="arrivalDate"
              type="date"
              defaultValue={arrivalDate}
              className={control('lg')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-departure`} className="text-xs text-subtle">
              출발일
            </label>
            <input
              id={`${uid}-departure`}
              name="departureDate"
              type="date"
              defaultValue={departureDate}
              className={control('lg')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-roomtype`} className="text-xs text-subtle">
              객실 타입
            </label>
            <input
              id={`${uid}-roomtype`}
              name="roomTypeCode"
              defaultValue={roomTypeCode}
              className={control('lg', 'w-24')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-adults`} className="text-xs text-subtle">
              성인
            </label>
            <input
              id={`${uid}-adults`}
              name="adults"
              type="number"
              min={1}
              max={10}
              defaultValue={adults}
              className={control('lg', 'w-20')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-children`} className="text-xs text-subtle">
              아동
            </label>
            <input
              id={`${uid}-children`}
              name="children"
              type="number"
              min={0}
              max={10}
              defaultValue={childCount}
              className={control('lg', 'w-20')}
            />
          </div>

          <SubmitButton pendingLabel="변경 중…">변경</SubmitButton>
        </fieldset>
        <p className="mt-1.5 text-xs text-subtle">
          변경 결과와 총액은 OPERA 가 다시 계산합니다. 재고가 없으면 거절될 수 있습니다.
        </p>
      </form>

      <form
        action={(formData) => {
          setLast('cancel');
          cancel(formData);
        }}
        className="mt-4 flex flex-wrap items-end gap-2 border-t border-current/10 pt-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-reason`} className="text-xs text-subtle">
            취소 사유 (선택)
          </label>
          <input
            id={`${uid}-reason`}
            name="reason"
            maxLength={200}
            placeholder="고객 요청"
            className={control('lg', 'w-64')}
          />
        </div>
        <SubmitButton
          pendingLabel="취소 중…"
          confirm="이 예약을 취소하시겠습니까?"
          className="rounded-md border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/5 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
        >
          예약 취소
        </SubmitButton>
      </form>

      <ActionMessage state={feedback} />
    </section>
  );
}
