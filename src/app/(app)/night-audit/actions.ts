'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';

// This file exports async functions only. Types and constants live in @/lib/action-state.

/**
 * No-show.
 *
 * OPERA judges whether the arrival date has passed and whether the guest is already
 * in. Blocking it on screen splits the rules, and OPERA's reason is more accurate.
 */
export async function markNoShowAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reservationId = String(formData.get('reservationId') ?? '').trim();
  if (!reservationId) return actionError('대상 예약을 찾을 수 없습니다.');

  const reason = String(formData.get('reason') ?? '').trim();
  const label = String(formData.get('confirmationNumber') ?? '해당 예약');

  try {
    await apiFetch(
      'be',
      `/api/night-audit/reservations/${encodeURIComponent(reservationId)}/no-show`,
      {
        method: 'POST',
        json: reason ? { reason } : {},
      },
    );
  } catch (error) {
    return actionError(backendMessage(error, '노쇼로 처리하지 못했습니다.'));
  }

  revalidatePath('/night-audit');
  revalidatePath('/reservations');
  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess(`${label} 을(를) 노쇼로 처리했습니다. OPERA 에 반영되었습니다.`);
}
