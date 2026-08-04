'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';

const MAX_WINDOW = 8;

function readWindow(value: FormDataEntryValue | null): number | string {
  const parsed = Number(String(value ?? ''));
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_WINDOW) {
    return `창구는 1~${MAX_WINDOW} 사이여야 합니다.`;
  }
  return parsed;
}

/** Moves a transaction to another window. BE recounts both balances. */
export async function transferPostingAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const postingId = String(formData.get('postingId') ?? '').trim();
  if (!postingId) return actionError('옮길 거래를 찾을 수 없습니다.');

  const toWindow = readWindow(formData.get('toWindow'));
  if (typeof toWindow === 'string') return actionError(toWindow);

  const description = String(formData.get('description') ?? '거래');

  try {
    await apiFetch(
      'be',
      `/api/reservations/${encodeURIComponent(reservationId)}/folios/postings/${encodeURIComponent(postingId)}/transfer`,
      { method: 'POST', json: { toWindow } },
    );
  } catch (error) {
    return actionError(backendMessage(error, '거래를 옮기지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess(`${description} 을 윈도 ${toWindow} 로 옮겼습니다.`);
}

export async function setRoutingAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // The input comes back on failure. React 19 empties uncontrolled inputs when an action ends.
  const values = formValues(formData, ['transactionCode', 'targetWindow', 'note']);

  const transactionCode = String(formData.get('transactionCode') ?? '').trim();
  if (!transactionCode) return actionError('거래 코드를 입력해 주세요.', values);

  const targetWindow = readWindow(formData.get('targetWindow'));
  if (typeof targetWindow === 'string') return actionError(targetWindow, values);

  const note = String(formData.get('note') ?? '').trim();

  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/folios/routings`, {
      method: 'POST',
      json: { transactionCode, targetWindow, ...(note ? { note } : {}) },
    });
  } catch (error) {
    return actionError(backendMessage(error, '라우팅을 걸지 못했습니다.'), values);
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess(`거래 코드 ${transactionCode} 를 윈도 ${targetWindow} 로 보냅니다.`);
}

export async function removeRoutingAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const transactionCode = String(formData.get('transactionCode') ?? '').trim();
  if (!transactionCode) return actionError('해제할 지시를 찾을 수 없습니다.');

  try {
    await apiFetch(
      'be',
      `/api/reservations/${encodeURIComponent(reservationId)}/folios/routings/${encodeURIComponent(transactionCode)}`,
      { method: 'DELETE' },
    );
  } catch (error) {
    return actionError(backendMessage(error, '라우팅을 해제하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess(`거래 코드 ${transactionCode} 지시를 해제했습니다.`);
}
