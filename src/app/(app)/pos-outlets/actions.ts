'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import type { PosOutlet } from '@/lib/types';

// This file exports async functions only. Types and constants live in @/lib/action-state.

interface IssuedKey {
  outlet: PosOutlet;
  /** Exists only at the moment of issue. Stored as a hash, it cannot be seen again. */
  apiKey: string;
}

const KEEP = ['code', 'name', 'transactionCode'];

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

/**
 * The issued key rides along in the success message.
 *
 * It cannot be seen again, so the screen has to show it there and then. Storing it to
 * show later would mean keeping plaintext somewhere, which defeats hashing it in the
 * first place.
 */
export async function createOutletAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const propertyId = text(formData, 'propertyId');
  if (!propertyId) return actionError('호텔을 선택해 주세요.');

  const kept = formValues(formData, KEEP);
  const fail = (message: string) => actionError(message, kept);

  const code = text(formData, 'code').toUpperCase();
  const name = text(formData, 'name');
  const transactionCode = text(formData, 'transactionCode').toUpperCase();

  if (!code) return fail('아웃렛 코드를 입력해 주세요.');
  if (!name) return fail('아웃렛 이름을 입력해 주세요.');
  if (!transactionCode) return fail('거래 코드를 입력해 주세요.');

  let issued: IssuedKey;
  try {
    issued = await apiFetch<IssuedKey>('be', '/api/pos-outlets', {
      method: 'POST',
      json: { propertyId, code, name, transactionCode },
    });
  } catch (error) {
    return fail(backendMessage(error, '아웃렛을 등록하지 못했습니다.'));
  }

  revalidatePath('/pos-outlets');
  return actionSuccess(
    `${issued.outlet.name} 아웃렛을 등록했습니다.\n` +
      `단말에 넣을 키: ${issued.apiKey}\n` +
      '이 키는 다시 볼 수 없습니다. 지금 옮겨 적어 주세요.',
  );
}

export async function rotateOutletKeyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const outletId = text(formData, 'outletId');
  if (!outletId) return actionError('대상 아웃렛을 찾을 수 없습니다.');

  let issued: IssuedKey;
  try {
    issued = await apiFetch<IssuedKey>(
      'be',
      `/api/pos-outlets/${encodeURIComponent(outletId)}/rotate-key`,
      { method: 'POST', json: {} },
    );
  } catch (error) {
    return actionError(backendMessage(error, '키를 재발급하지 못했습니다.'));
  }

  revalidatePath('/pos-outlets');
  return actionSuccess(
    `${issued.outlet.name} 키를 재발급했습니다. 이전 키는 즉시 통하지 않습니다.\n` +
      `새 키: ${issued.apiKey}\n` +
      '이 키는 다시 볼 수 없습니다. 지금 옮겨 적어 주세요.',
  );
}

export async function setOutletActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const outletId = text(formData, 'outletId');
  if (!outletId) return actionError('대상 아웃렛을 찾을 수 없습니다.');

  const active = formData.get('active') === '1';
  const name = text(formData, 'name') || '해당 아웃렛';

  try {
    await apiFetch('be', `/api/pos-outlets/${encodeURIComponent(outletId)}`, {
      method: 'PATCH',
      json: { active },
    });
  } catch (error) {
    return actionError(backendMessage(error, '아웃렛 상태를 바꾸지 못했습니다.'));
  }

  revalidatePath('/pos-outlets');
  return actionSuccess(
    active ? `${name} 을(를) 다시 사용합니다.` : `${name} 사용을 중지했습니다. 키가 막힙니다.`,
  );
}
