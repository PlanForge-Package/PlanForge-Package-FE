'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch } from '@/lib/api';
import type { PostingType } from '@/lib/types';
import { translateError } from '@/lib/translate-error';
import { getDictionary } from '@/lib/i18n';

// This file exports async functions only. Types and constants live in @/lib/action-state.

const POSTING_TYPES: PostingType[] = ['CHARGE', 'PAYMENT', 'ADJUSTMENT', 'TAX'];

/** Form values all arrive as strings, so the server validates them again. */
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
  const { t } = await getDictionary();
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
    return actionError(translateError(error, t, '거래를 등록하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess('거래를 등록했습니다.');
}

export async function checkInAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const roomNumber = String(formData.get('roomNumber') ?? '').trim();

  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/check-in`, {
      method: 'POST',
      json: roomNumber ? { roomNumber } : {},
    });
  } catch (error) {
    return actionError(translateError(error, t, '체크인하지 못했습니다.'));
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
  const { t } = await getDictionary();
  const notes = String(formData.get('notes') ?? '').trim();

  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/check-out`, {
      method: 'POST',
      json: notes ? { notes } : {},
    });
  } catch (error) {
    return actionError(translateError(error, t, '체크아웃하지 못했습니다.'));
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
  const { t } = await getDictionary();
  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/folios`, {
      method: 'POST',
      json: {},
    });
  } catch (error) {
    return actionError(translateError(error, t, '폴리오를 열지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess('폴리오 윈도를 열었습니다.');
}

/** Reads a date from the form. Empty is treated as "no change". */
function optionalDate(
  raw: FormDataEntryValue | null,
  label: string,
): string | undefined | { error: string } {
  const value = String(raw ?? '').trim();
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: `${label}을(를) 올바른 날짜로 입력해 주세요.` };
  }
  return value;
}

function optionalCount(
  raw: FormDataEntryValue | null,
  label: string,
  min: number,
  max: number,
): number | undefined | { error: string } {
  const text = String(raw ?? '').trim();
  if (!text) return undefined;
  const value = Number(text);
  if (!Number.isInteger(value) || value < min || value > max) {
    return { error: `${label}은(는) ${min}~${max} 사이의 정수여야 합니다.` };
  }
  return value;
}

export async function updateReservationAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const arrivalDate = optionalDate(formData.get('arrivalDate'), '도착일');
  if (arrivalDate && typeof arrivalDate !== 'string') return actionError(arrivalDate.error);

  const departureDate = optionalDate(formData.get('departureDate'), '출발일');
  if (departureDate && typeof departureDate !== 'string') return actionError(departureDate.error);

  if (arrivalDate && departureDate && departureDate <= arrivalDate) {
    return actionError('출발일은 도착일보다 뒤여야 합니다.');
  }

  const adults = optionalCount(formData.get('adults'), '성인', 1, 10);
  if (adults !== undefined && typeof adults !== 'number') return actionError(adults.error);

  const children = optionalCount(formData.get('children'), '아동', 0, 10);
  if (children !== undefined && typeof children !== 'number') return actionError(children.error);

  const roomTypeCode = String(formData.get('roomTypeCode') ?? '').trim();

  const payload = {
    ...(arrivalDate ? { arrivalDate } : {}),
    ...(departureDate ? { departureDate } : {}),
    ...(roomTypeCode ? { roomTypeCode } : {}),
    ...(adults === undefined ? {} : { adults }),
    ...(children === undefined ? {} : { children }),
  };

  if (Object.keys(payload).length === 0) {
    return actionError('변경할 내용이 없습니다.');
  }

  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}`, {
      method: 'PATCH',
      json: payload,
    });
  } catch (error) {
    return actionError(translateError(error, t, '예약을 변경하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath('/reservations');
  return actionSuccess('예약을 변경했습니다. 총액은 OPERA 가 다시 계산했습니다.');
}

export async function cancelReservationAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const reason = String(formData.get('reason') ?? '').trim();

  let cancelled: { cancellationPenalty?: string | null };
  try {
    cancelled = await apiFetch(
      'be',
      `/api/reservations/${encodeURIComponent(reservationId)}/cancel`,
      {
        method: 'POST',
        json: reason ? { reason } : {},
      },
    );
  } catch (error) {
    return actionError(translateError(error, t, '예약을 취소하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath('/reservations');

  // Without stating the amount charged there is nothing to tell the guest.
  const penalty = Number(cancelled.cancellationPenalty ?? 0);
  return actionSuccess(
    penalty > 0
      ? `예약을 취소했습니다. 위약금 ${penalty.toLocaleString('ko-KR')}원이 폴리오에 달렸습니다.`
      : '예약을 취소했습니다. 위약금은 없습니다.',
  );
}

/** Guarantee change. It decides how a no-show is handled. */
export async function setGuaranteeAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const guaranteeCode = String(formData.get('guaranteeCode') ?? '').trim();
  if (!guaranteeCode) return actionError('보증 방식을 골라 주세요.');

  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/guarantee`, {
      method: 'PUT',
      json: { guaranteeCode },
    });
  } catch (error) {
    return actionError(translateError(error, t, '보증 방식을 바꾸지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess('보증 방식을 바꿨습니다.');
}

/**
 * Deposit receipt.
 *
 * There is no charge yet before arrival, but the money is already ours. Posting it
 * as a folio payment is what stops us taking it twice at check-in.
 */
export async function recordDepositAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const values = formValues(formData, ['amount', 'method', 'description']);

  const raw = String(formData.get('amount') ?? '').trim();
  const amount = Number(raw);
  if (!raw || !Number.isInteger(amount) || amount <= 0) {
    return actionError('보증금은 0보다 큰 정수여야 합니다.', values);
  }

  const method = String(formData.get('method') ?? '');
  if (!method) return actionError('받은 방법을 골라 주세요.', values);

  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/folios/deposit`, {
      method: 'POST',
      json: {
        amount,
        method,
        description: String(formData.get('description') ?? '').trim() || undefined,
        // Pressing twice on the same screen still takes it once.
        reference: `DEP-${reservationId}-${amount}-${String(formData.get('nonce') ?? '')}`,
      },
    });
  } catch (error) {
    return actionError(translateError(error, t, '보증금을 받지 못했습니다.'), values);
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess(`보증금 ${amount.toLocaleString('ko-KR')}원을 받았습니다.`);
}

/**
 * Waitlist confirmation.
 *
 * OPERA counts availability at the moment of confirming. If another waitlisted
 * booking was confirmed in between, the rejection comes back here.
 */
export async function confirmWaitlistAction(
  reservationId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  try {
    await apiFetch(
      'be',
      `/api/reservations/${encodeURIComponent(reservationId)}/confirm-waitlist`,
      {
        method: 'POST',
        json: {},
      },
    );
  } catch (error) {
    return actionError(translateError(error, t, '대기를 확정하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath('/reservations');
  return actionSuccess('대기를 확정했습니다.');
}

/**
 * Room share.
 *
 * Whether the dates overlap, the room types match and neither is already in another
 * room is OPERA's call — the side that knows inventory and assignment has to decide.
 */
export async function shareReservationAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const values = formValues(formData, ['withReservationId']);

  const withReservationId = String(formData.get('withReservationId') ?? '').trim();
  if (!withReservationId) return actionError('함께 묶을 예약을 골라 주세요.', values);

  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/share`, {
      method: 'POST',
      json: { withReservationId },
    });
  } catch (error) {
    return actionError(translateError(error, t, '객실을 함께 쓰도록 묶지 못했습니다.'), values);
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath(`/reservations/${withReservationId}`);
  return actionSuccess('한 객실을 함께 쓰도록 묶었습니다.');
}

export async function unshareReservationAction(
  reservationId: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/unshare`, {
      method: 'POST',
      json: {},
    });
  } catch (error) {
    return actionError(translateError(error, t, '공유를 해제하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath('/reservations');
  return actionSuccess('공유를 해제했습니다.');
}
