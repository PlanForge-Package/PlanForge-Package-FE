'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import type { Block, BlockStatus } from '@/lib/types';

/** Input fields handed back on failure. Counts are an array and handled separately. */
const KEEP = ['code', 'name', 'startDate', 'endDate', 'cutoffDate', 'ratePlanCode'];

// This file exports async functions only. Types and constants live in @/lib/action-state.

const BLOCK_STATUSES: BlockStatus[] = ['INQUIRY', 'TENTATIVE', 'DEFINITE', 'CANCELLED', 'ACTUAL'];

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

/**
 * Reads the per-room-type allotments from the form.
 *
 * 0 means "do not hold this type", so it is not sent. Passing a zero allotment puts
 * an empty line in OPERA and leaves a meaningless row on the screen.
 */
function readAllotments(formData: FormData) {
  const codes = formData.getAll('roomTypeCode').map(String);
  const counts = formData.getAll('blocked').map((value) => Number(value));
  const ratePlan = text(formData, 'ratePlanCode');

  return codes
    .map((code, index) => ({
      roomTypeCode: code,
      blocked: counts[index] ?? 0,
      // Negotiated rates differ per type. Empty sells at the rate code's price.
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
  // Every failure returns the input. Making them retype it repeats the same mistake.
  const kept = {
    ...formValues(formData, KEEP),
    // Counts arrive in room-type order. The screen re-seeds them in the same order.
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
   * Negotiated rate change.
   *
   * A blank box means leave it alone. Sending 0 would sell it free and split the price
   * between bookings already picked up and those still to come.
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
