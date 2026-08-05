'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch } from '@/lib/api';
import type { Payment } from '@/lib/types';
import { translateError } from '@/lib/translate-error';
import { getDictionary } from '@/lib/i18n';

// This file exports async functions only. Types and constants live in @/lib/action-state.

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
  const { t } = await getDictionary();
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
   * The screen makes the idempotency key.
   *
   * Made on the server, a resend cannot be told from a new payment. Holding the same
   * value while the form is open is what makes pressing "pay" twice charge once.
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
    return fail(translateError(error, t, '결제하지 못했습니다.'));
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
  const { t } = await getDictionary();
  const paymentId = text(formData, 'paymentId');
  const reservationId = text(formData, 'reservationId');
  if (!paymentId) return actionError('대상 결제를 찾을 수 없습니다.');

  try {
    await apiFetch('be', `/api/payments/${encodeURIComponent(paymentId)}/capture`, {
      method: 'POST',
      json: {},
    });
  } catch (error) {
    return actionError(translateError(error, t, '매입하지 못했습니다.'));
  }

  if (reservationId) revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess('매입했습니다. 폴리오에 결제가 반영되었습니다.');
}

export async function voidPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const paymentId = text(formData, 'paymentId');
  const reservationId = text(formData, 'reservationId');
  if (!paymentId) return actionError('대상 결제를 찾을 수 없습니다.');

  try {
    await apiFetch('be', `/api/payments/${encodeURIComponent(paymentId)}/void`, {
      method: 'POST',
      json: {},
    });
  } catch (error) {
    return actionError(translateError(error, t, '승인을 취소하지 못했습니다.'));
  }

  if (reservationId) revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess('승인을 취소했습니다.');
}

export async function refundPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
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
    return actionError(translateError(error, t, '환불하지 못했습니다.'));
  }

  if (reservationId) revalidatePath(`/reservations/${reservationId}`);
  return actionSuccess(`${money(String(amount))}원을 환불했습니다.`);
}
