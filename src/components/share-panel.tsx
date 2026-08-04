'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  shareReservationAction,
  unshareReservationAction,
} from '@/app/(app)/reservations/[id]/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { Reservation } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

function guestName(reservation: Reservation): string {
  const name = [reservation.profile.lastName, reservation.profile.firstName]
    .filter(Boolean)
    .join(' ');
  return name || '(이름 없음)';
}

/**
 * 객실 공유.
 *
 * 두 손님이 한 방을 쓰되 계산은 따로 하는 편성이다. 예약은 둘이어도 객실은
 * 하나이므로 재고도 하나만 차지한다.
 *
 * 묶을 수 있는지는 우리가 판단하지 않는다 — 겹치는 기간·같은 객실 타입인지,
 * 이미 다른 방에 들어가 있지는 않은지는 재고와 배정을 아는 OPERA 가 본다.
 * 여기서는 고를 만한 후보만 추려 보여 준다.
 */
export function SharePanel({
  reservationId,
  shareGroupId,
  partners,
  candidates,
}: {
  reservationId: string;
  shareGroupId: string | null;
  partners: Reservation[];
  candidates: Reservation[];
}) {
  const [shareState, shareAction] = useActionState<ActionState, FormData>(
    shareReservationAction.bind(null, reservationId),
    IDLE,
  );
  const [unshareState, unshareAction] = useActionState<ActionState, FormData>(
    unshareReservationAction.bind(null, reservationId),
    IDLE,
  );

  /*
   * 해제하면 이 패널의 모습이 바뀌므로 그 결과를 우선 보여 준다.
   * 묶기 결과는 목록이 늘어난 것으로도 확인되지만, 해제는 줄이 사라진다.
   */
  const state = unshareState.status !== 'idle' ? unshareState : shareState;
  const shared = Boolean(shareGroupId);

  return (
    <section aria-label="객실 공유" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">객실 공유</h2>
        {shared && (
          <form action={unshareAction}>
            <SubmitButton
              pendingLabel="해제 중…"
              confirm="이 예약을 공유에서 빼시겠습니까?"
              className="rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              공유 해제
            </SubmitButton>
          </form>
        )}
      </div>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {shared ? (
        <ul className="flex flex-col gap-1.5">
          {partners.length === 0 ? (
            <li className="rounded-md border border-current/10 px-3 py-2 text-sm text-subtle">
              함께 쓰는 예약이 이 화면에 없습니다. 상대가 취소되었는지 확인해 주세요.
            </li>
          ) : (
            partners.map((partner) => (
              <li
                key={partner.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-current/10 px-3 py-2 text-sm"
              >
                <Link href={`/reservations/${partner.id}`} className="underline underline-offset-4">
                  {guestName(partner)}
                </Link>
                <span className="font-mono text-xs text-subtle">{partner.confirmationNumber}</span>
                <span className="text-subtle">
                  {partner.arrivalDate.slice(0, 10)} ~ {partner.departureDate.slice(0, 10)}
                </span>
                <span className="ml-auto text-subtle">
                  {partner.assignedRoomNumber ?? '미배정'}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : candidates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          같은 객실 타입으로 기간이 겹치는 다른 예약이 없습니다.
        </p>
      ) : (
        <form action={shareAction} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-subtle">
            함께 쓸 예약
            <select
              name="withReservationId"
              defaultValue={shareState.values?.withReservationId ?? ''}
              required
              className="w-80 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            >
              <option value="">선택</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {guestName(candidate)} · {candidate.confirmationNumber} ·{' '}
                  {candidate.arrivalDate.slice(0, 10)} ~ {candidate.departureDate.slice(0, 10)}
                </option>
              ))}
            </select>
          </label>

          <SubmitButton pendingLabel="묶는 중…">객실 함께 쓰기</SubmitButton>
        </form>
      )}

      <p className="text-xs text-subtle">
        예약은 둘이어도 객실은 하나입니다 — 재고도 하나만 차지하고, 계산서는 각자 따로입니다.
        기간이나 객실 타입이 맞지 않으면 OPERA 가 거절합니다.
      </p>
    </section>
  );
}
