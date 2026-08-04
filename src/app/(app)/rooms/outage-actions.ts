'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import type { RoomOutageKind, RoomStatus } from '@/lib/types';

const KINDS: RoomOutageKind[] = ['OUT_OF_ORDER', 'OUT_OF_SERVICE'];
const RETURN_STATUSES: RoomStatus[] = ['CLEAN', 'DIRTY', 'INSPECTED'];

/** 실패해도 입력을 되돌려 주기 위해 되짚는 필드. */
const FIELDS = ['roomNumber', 'kind', 'startDate', 'endDate', 'reason', 'returnStatus'];

export async function createOutageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  /*
   * 실패하면 입력값을 그대로 돌려준다.
   *
   * React 19 는 폼 액션이 끝나면 비제어 입력을 초기화한다. 값을 돌려주지 않으면
   * 날짜와 사유를 다 채운 폼이 오류 한 줄만 남기고 비워진다.
   */
  const values = formValues(formData, FIELDS);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) return actionError('호텔을 선택해 주세요.', values);

  const roomNumber = String(formData.get('roomNumber') ?? '').trim();
  if (!roomNumber) return actionError('객실을 선택해 주세요.', values);

  const kind = String(formData.get('kind') ?? '');
  if (!KINDS.includes(kind as RoomOutageKind)) {
    return actionError('사용 불가 구분을 선택해 주세요.', values);
  }

  const startDate = String(formData.get('startDate') ?? '').trim();
  const endDate = String(formData.get('endDate') ?? '').trim();
  if (!startDate || !endDate) return actionError('기간을 입력해 주세요.', values);
  if (endDate < startDate) {
    return actionError('종료일이 시작일보다 앞설 수 없습니다.', values);
  }

  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) return actionError('사유를 입력해 주세요.', values);

  const returnStatus = String(formData.get('returnStatus') ?? 'DIRTY');
  if (!RETURN_STATUSES.includes(returnStatus as RoomStatus)) {
    return actionError('복귀 상태를 선택해 주세요.', values);
  }

  try {
    await apiFetch('be', '/api/room-outages', {
      method: 'POST',
      json: { propertyId, roomNumber, kind, startDate, endDate, reason, returnStatus },
    });
  } catch (error) {
    return actionError(backendMessage(error, '사용 불가로 등록하지 못했습니다.'), values);
  }

  revalidatePath('/rooms');
  revalidatePath('/reports');
  return actionSuccess(`객실 ${roomNumber} 를 ${startDate} ~ ${endDate} 사용 불가로 등록했습니다.`);
}

export async function releaseOutageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get('outageId') ?? '').trim();
  if (!id) return actionError('대상 기록을 찾을 수 없습니다.');

  const roomNumber = String(formData.get('roomNumber') ?? '객실');
  const reason = String(formData.get('reason') ?? '').trim();

  try {
    await apiFetch('be', `/api/room-outages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      json: reason ? { reason } : {},
    });
  } catch (error) {
    return actionError(backendMessage(error, '사용 불가를 해제하지 못했습니다.'));
  }

  revalidatePath('/rooms');
  revalidatePath('/reports');
  return actionSuccess(`객실 ${roomNumber} 사용 불가를 해제했습니다.`);
}
