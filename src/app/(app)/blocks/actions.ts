'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import type { Block, BlockStatus } from '@/lib/types';

/** 실패했을 때 화면에 되돌려 줄 입력 필드. 수량은 배열이라 따로 다룬다. */
const KEEP = ['code', 'name', 'startDate', 'endDate', 'cutoffDate', 'ratePlanCode'];

// 이 파일은 async 함수만 export 한다. 타입·상수는 @/lib/action-state 에 있다.

const BLOCK_STATUSES: BlockStatus[] = ['INQUIRY', 'TENTATIVE', 'DEFINITE', 'CANCELLED', 'ACTUAL'];

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

/**
 * 객실 타입별 할당을 폼에서 읽는다.
 *
 * 0 은 "이 타입은 안 잡는다" 는 뜻이므로 보내지 않는다. 0 짜리 할당을 그대로
 * 넘기면 OPERA 에 빈 줄이 생기고 화면에도 의미 없는 행이 남는다.
 */
function readAllotments(formData: FormData) {
  const codes = formData.getAll('roomTypeCode').map(String);
  const counts = formData.getAll('blocked').map((value) => Number(value));
  const ratePlan = text(formData, 'ratePlanCode');

  return codes
    .map((code, index) => ({
      roomTypeCode: code,
      blocked: counts[index] ?? 0,
      // 협의 요금은 타입마다 다르다. 비우면 요금 코드가 정한 값으로 판다.
      amount: Number(String(formData.get(`amount:${code}`) ?? '').trim()),
    }))
    .filter((slot) => slot.roomTypeCode && Number.isFinite(slot.blocked) && slot.blocked > 0)
    .map(({ amount, ...slot }) => ({
      ...slot,
      ...(ratePlan ? { ratePlanCode: ratePlan } : {}),
      ...(Number.isInteger(amount) && amount > 0 ? { amount } : {}),
    }));
}

export async function createBlockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // 실패는 전부 입력값을 되돌려 준다. 다시 채우게 하면 같은 실수를 반복한다.
  const kept = {
    ...formValues(formData, KEEP),
    // 수량은 객실 타입 순서대로 온다. 화면이 같은 순서로 다시 심는다.
    blocked: formData.getAll('blocked').map(String).join(','),
  };
  const fail = (message: string) => actionError(message, kept);

  const propertyId = text(formData, 'propertyId');
  if (!propertyId) return fail('호텔을 선택해 주세요.');

  const code = text(formData, 'code').toUpperCase();
  const name = text(formData, 'name');
  const startDate = text(formData, 'startDate');
  const endDate = text(formData, 'endDate');
  const cutoffDate = text(formData, 'cutoffDate');

  if (!code) return fail('블록 코드를 입력해 주세요.');
  if (!name) return fail('블록 이름을 입력해 주세요.');
  if (!startDate || !endDate) return fail('기간을 입력해 주세요.');
  if (endDate <= startDate) return fail('종료일은 시작일보다 뒤여야 합니다.');
  if (cutoffDate && cutoffDate > startDate) {
    return fail('컷오프 날짜는 블록 시작일보다 앞이어야 합니다.');
  }

  const allotments = readAllotments(formData);
  if (allotments.length === 0) {
    return fail('객실 타입별 수량을 하나 이상 입력해 주세요.');
  }

  let created: Block;
  try {
    created = await apiFetch<Block>('be', '/api/blocks', {
      method: 'POST',
      json: {
        propertyId,
        code,
        name,
        startDate,
        endDate,
        ...(cutoffDate ? { cutoffDate } : {}),
        allotments,
      },
    });
  } catch (error) {
    return fail(backendMessage(error, '블록을 만들지 못했습니다.'));
  }

  revalidatePath('/blocks');
  return actionSuccess(
    `블록 ${created.code} 를 만들었습니다. 객실 ${created.totalBlocked}실을 잡았습니다.`,
  );
}

export async function updateBlockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const blockId = text(formData, 'blockId');
  if (!blockId) return actionError('대상 블록을 찾을 수 없습니다.');

  const status = text(formData, 'status');
  if (status && !BLOCK_STATUSES.includes(status as BlockStatus)) {
    return actionError('블록 상태를 선택해 주세요.');
  }

  const name = text(formData, 'name');
  const cutoffDate = text(formData, 'cutoffDate');

  /*
   * 협의 요금 조정.
   *
   * 비운 칸은 건드리지 않는다는 뜻이다. 0 으로 보내면 공짜로 파는 것이 되고,
   * 이미 빠져나간 예약과 앞으로 빠질 예약의 값이 어긋난다.
   */
  const rates: Array<{ roomTypeCode: string; amount: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('rate:')) continue;
    const raw = String(value).trim();
    if (!raw) continue;

    const amount = Number(raw);
    const roomTypeCode = key.slice('rate:'.length);
    if (!Number.isInteger(amount) || amount < 0) {
      return actionError(`${roomTypeCode} 협의 요금은 0 이상의 정수여야 합니다.`);
    }
    rates.push({ roomTypeCode, amount });
  }

  if (!status && !name && !cutoffDate && rates.length === 0) {
    return actionError('바꿀 내용이 없습니다.');
  }

  try {
    await apiFetch('be', `/api/blocks/${encodeURIComponent(blockId)}`, {
      method: 'PATCH',
      json: {
        ...(name ? { name } : {}),
        ...(status ? { status } : {}),
        ...(cutoffDate ? { cutoffDate } : {}),
        ...(rates.length ? { rates } : {}),
      },
    });
  } catch (error) {
    return actionError(backendMessage(error, '블록을 수정하지 못했습니다.'));
  }

  revalidatePath('/blocks');
  revalidatePath(`/blocks/${blockId}`);
  return actionSuccess('블록을 수정했습니다. OPERA 에 반영되었습니다.');
}
