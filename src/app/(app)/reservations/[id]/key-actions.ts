'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import type { RoomKey } from '@/lib/types';

// 이 파일은 async 함수만 export 한다. 타입·상수는 @/lib/action-state 에 있다.

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

export async function issueKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const reservationId = text(formData, 'reservationId');
  if (!reservationId) return actionError('대상 예약을 찾을 수 없습니다.');

  // 체크박스는 켜진 것만 온다. 기본은 이전 카드를 죽이는 쪽이다.
  const replaceExisting = formData.get('keepExisting') !== 'on';

  let key: RoomKey;
  try {
    key = await apiFetch<RoomKey>(
      'be',
      `/api/reservations/${encodeURIComponent(reservationId)}/keys`,
      { method: 'POST', json: { replaceExisting } },
    );
  } catch (error) {
    return actionError(backendMessage(error, '카드를 발급하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess(
    `${key.roomNumber}호 카드를 발급했습니다 (${key.sequence}번째).` +
      (replaceExisting ? ' 이전 카드는 무효화했습니다.' : ' 기존 카드도 그대로 열립니다.'),
  );
}

export async function revokeKeyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const keyId = text(formData, 'keyId');
  const reservationId = text(formData, 'reservationId');
  if (!keyId) return actionError('대상 카드를 찾을 수 없습니다.');

  const reason = text(formData, 'reason');

  try {
    await apiFetch('be', `/api/door-keys/${encodeURIComponent(keyId)}/revoke`, {
      method: 'POST',
      json: reason ? { reason } : {},
    });
  } catch (error) {
    return actionError(backendMessage(error, '카드를 무효화하지 못했습니다.'));
  }

  if (reservationId) revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess('카드를 무효화했습니다. 이 카드로는 더 이상 문이 열리지 않습니다.');
}
