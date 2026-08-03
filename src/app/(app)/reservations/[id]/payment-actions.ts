'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import type { Payment } from '@/lib/types';

// 이 파일은 async 함수만 export 한다. 타입·상수는 @/lib/action-state 에 있다.

const KEEP = ['amount', 'description', 'paymentToken'];

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

function money(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString('ko-KR') : value;
}

export async function authorizePaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reservationId = text(formData, 'reservationId');
  const window = text(formData, 'window');
  if (!reservationId || !window) return actionError('대상 폴리오를 찾을 수 없습니다.');

  const kept = formValues(formData, KEEP);
  const fail = (message: string) => actionError(message, kept);

  const method = text(formData, 'method') || 'CARD';
  const amount = Number(text(formData, 'amount'));
  if (!Number.isFinite(amount) || amount <= 0) return fail('금액은 0보다 커야 합니다.');

  const paymentToken = text(formData, 'paymentToken');
  if (method === 'CARD' && !paymentToken) {
    return fail('카드 결제에는 결제 토큰이 필요합니다. 단말에서 카드를 읽어 주세요.');
  }

  /*
   * 멱등키는 화면이 만든다.
   *
   * 서버에서 만들면 재전송인지 새 결제인지 구분할 수 없다. 폼이 열려 있는 동안
   * 같은 값을 유지해야 "결제" 를 두 번 눌러도 한 번만 긁힌다.
   */
  const idempotencyKey = text(formData, 'idempotencyKey');
  if (!idempotencyKey) return fail('요청 키가 없습니다. 화면을 새로 고친 뒤 다시 시도해 주세요.');

  let payment: Payment;
  try {
    payment = await apiFetch<Payment>(
      'be',
      `/api/reservations/${encodeURIComponent(reservationId)}/folios/${encodeURIComponent(window)}/payments`,
      {
        method: 'POST',
        json: {
          method,
          amount,
          idempotencyKey,
          ...(paymentToken ? { paymentToken } : {}),
          ...(text(formData, 'description') ? { description: text(formData, 'description') } : {}),
        },
      },
    );
  } catch (error) {
    return fail(backendMessage(error, '결제하지 못했습니다.'));
  }

  revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess(
    payment.status === 'CAPTURED'
      ? `${money(payment.amount)}원을 받았습니다. 폴리오에 반영되었습니다.`
      : `${money(payment.amount)}원 승인했습니다. 매입해야 폴리오에 반영됩니다.`,
  );
}

export async function capturePaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const paymentId = text(formData, 'paymentId');
  const reservationId = text(formData, 'reservationId');
  if (!paymentId) return actionError('대상 결제를 찾을 수 없습니다.');

  try {
    await apiFetch('be', `/api/payments/${encodeURIComponent(paymentId)}/capture`, {
      method: 'POST',
      json: {},
    });
  } catch (error) {
    return actionError(backendMessage(error, '매입하지 못했습니다.'));
  }

  if (reservationId) revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess('매입했습니다. 폴리오에 결제가 반영되었습니다.');
}

export async function voidPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const paymentId = text(formData, 'paymentId');
  const reservationId = text(formData, 'reservationId');
  if (!paymentId) return actionError('대상 결제를 찾을 수 없습니다.');

  try {
    await apiFetch('be', `/api/payments/${encodeURIComponent(paymentId)}/void`, {
      method: 'POST',
      json: {},
    });
  } catch (error) {
    return actionError(backendMessage(error, '승인을 취소하지 못했습니다.'));
  }

  if (reservationId) revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess('승인을 취소했습니다.');
}

export async function refundPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const paymentId = text(formData, 'paymentId');
  const reservationId = text(formData, 'reservationId');
  if (!paymentId) return actionError('대상 결제를 찾을 수 없습니다.');

  const amount = Number(text(formData, 'refundAmount'));
  if (!Number.isFinite(amount) || amount <= 0) {
    return actionError('환불 금액은 0보다 커야 합니다.');
  }

  try {
    await apiFetch('be', `/api/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      json: { amount, ...(text(formData, 'reason') ? { reason: text(formData, 'reason') } : {}) },
    });
  } catch (error) {
    return actionError(backendMessage(error, '환불하지 못했습니다.'));
  }

  if (reservationId) revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess(`${money(String(amount))}원을 환불했습니다.`);
}
