'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import type { PostingType } from '@/lib/types';

// 이 파일은 async 함수만 export 한다. 타입·상수는 @/lib/action-state 에 있다.

const POSTING_TYPES: PostingType[] = ['CHARGE', 'PAYMENT', 'ADJUSTMENT', 'TAX'];

/** 폼 값은 전부 문자열로 오므로 서버에서도 한 번 더 검증한다. */
function readAmount(raw: FormDataEntryValue | null): number | string {
  const text = String(raw ?? '').trim();
  if (!text) return '금액을 입력해 주세요.';

  const value = Number(text.replace(/,/g, ''));
  if (!Number.isFinite(value)) return '금액은 숫자여야 합니다.';
  if (value <= 0) return '금액은 0보다 커야 합니다. 차감은 거래 종류로 표현합니다.';
  if (!Number.isInteger(value)) return '금액은 정수로 입력해 주세요.';
  if (value > 1_000_000_000) return '금액이 너무 큽니다.';

  return value;
}

export async function addPostingAction(
  reservationId: string,
  window: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const type = String(formData.get('type') ?? '');
  if (!POSTING_TYPES.includes(type as PostingType)) {
    return actionError('거래 종류를 선택해 주세요.');
  }

  const transactionCode = String(formData.get('transactionCode') ?? '').trim();
  if (!transactionCode) return actionError('거래 코드를 입력해 주세요.');

  const description = String(formData.get('description') ?? '').trim();
  if (!description) return actionError('적요를 입력해 주세요.');

  const amount = readAmount(formData.get('amount'));
  if (typeof amount === 'string') return actionError(amount);

  try {
    await apiFetch(
      'be',
      `/api/reservations/${encodeURIComponent(reservationId)}/folios/${window}/postings`,
      {
        method: 'POST',
        json: {
          type,
          transactionCode,
          description,
          amount,
          negative: formData.get('negative') === 'on',
        },
      },
    );
  } catch (error) {
    return actionError(backendMessage(error, '거래를 등록하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess('거래를 등록했습니다.');
}

export async function checkInAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const roomNumber = String(formData.get('roomNumber') ?? '').trim();

  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/check-in`, {
      method: 'POST',
      json: roomNumber ? { roomNumber } : {},
    });
  } catch (error) {
    return actionError(backendMessage(error, '체크인하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath('/reservations');
  revalidatePath('/rooms');
  return actionSuccess('체크인했습니다.');
}

export async function checkOutAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const notes = String(formData.get('notes') ?? '').trim();

  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/check-out`, {
      method: 'POST',
      json: notes ? { notes } : {},
    });
  } catch (error) {
    return actionError(backendMessage(error, '체크아웃하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath('/reservations');
  revalidatePath('/rooms');
  return actionSuccess('체크아웃했습니다.');
}

export async function openFolioAction(
  reservationId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/folios`, {
      method: 'POST',
      json: {},
    });
  } catch (error) {
    return actionError(backendMessage(error, '폴리오를 열지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess('폴리오 윈도를 열었습니다.');
}
