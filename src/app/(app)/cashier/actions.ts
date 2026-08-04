'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';

function readMoney(value: FormDataEntryValue | null, label: string): number | string {
  const raw = String(value ?? '').trim();
  if (!raw) return `${label}을 입력해 주세요.`;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return `${label}은 0 이상의 정수여야 합니다.`;
  }
  return parsed;
}

export async function openShiftAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, ['openingFloat']);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) return actionError('호텔을 선택해 주세요.', values);

  const openingFloat = readMoney(formData.get('openingFloat'), '시작 시재');
  if (typeof openingFloat === 'string') return actionError(openingFloat, values);

  try {
    await apiFetch('be', '/api/cashier/shifts', {
      method: 'POST',
      json: { propertyId, openingFloat },
    });
  } catch (error) {
    return actionError(backendMessage(error, '근무조를 열지 못했습니다.'), values);
  }

  revalidatePath('/cashier');
  return actionSuccess('근무조를 시작했습니다.');
}

export async function closeShiftAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, ['countedCash', 'notes']);

  const shiftId = String(formData.get('shiftId') ?? '').trim();
  if (!shiftId) return actionError('마감할 근무조를 찾을 수 없습니다.', values);

  const countedCash = readMoney(formData.get('countedCash'), '센 현금');
  if (typeof countedCash === 'string') return actionError(countedCash, values);

  const notes = String(formData.get('notes') ?? '').trim();

  let result: { summary: { difference: string | null } };
  try {
    result = await apiFetch('be', `/api/cashier/shifts/${encodeURIComponent(shiftId)}/close`, {
      method: 'POST',
      json: { countedCash, ...(notes ? { notes } : {}) },
    });
  } catch (error) {
    return actionError(backendMessage(error, '마감하지 못했습니다.'), values);
  }

  revalidatePath('/cashier');

  /*
   * 차이가 있으면 성공 메시지에 그대로 적는다.
   *
   * 마감은 됐지만 5천 원이 비었다는 사실이 화면 어딘가에만 있으면 그냥 넘어간다.
   */
  const difference = Number(result.summary.difference ?? 0);
  if (difference === 0) {
    return actionSuccess('마감했습니다. 현금이 정확히 맞습니다.');
  }
  return actionSuccess(
    difference > 0
      ? `마감했습니다. 현금이 ${difference.toLocaleString('ko-KR')}원 남습니다.`
      : `마감했습니다. 현금이 ${Math.abs(difference).toLocaleString('ko-KR')}원 부족합니다.`,
  );
}
