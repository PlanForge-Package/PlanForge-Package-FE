'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';

// 이 파일은 async 함수만 export 한다. 타입·상수는 @/lib/action-state 에 있다.

/**
 * 노쇼 처리.
 *
 * 도착일이 지났는지·이미 들어온 손님은 아닌지 판단하는 것은 OPERA 다. 화면에서
 * 미리 막으면 규칙이 두 곳으로 갈라지고, 거절 사유도 OPERA 쪽이 더 정확하다.
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
