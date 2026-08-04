'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import type { ArInvoiceStatus } from '@/lib/types';

const STATUSES: ArInvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'VOID'];

function readAmount(value: FormDataEntryValue | null, label: string): number | string {
  const raw = String(value ?? '').trim();
  const parsed = Number(raw);
  if (!raw || !Number.isInteger(parsed) || parsed <= 0) {
    return `${label}은 0보다 큰 정수여야 합니다.`;
  }
  return parsed;
}

export async function createAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, ['code', 'name', 'creditLimit', 'termDays', 'billingEmail']);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) return actionError('호텔을 선택해 주세요.', values);

  const code = String(formData.get('code') ?? '').trim();
  if (!code) return actionError('거래처 코드를 입력해 주세요.', values);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return actionError('거래처 이름을 입력해 주세요.', values);

  const rawLimit = String(formData.get('creditLimit') ?? '').trim();
  const rawTerm = String(formData.get('termDays') ?? '').trim();
  const billingEmail = String(formData.get('billingEmail') ?? '').trim();

  try {
    await apiFetch('be', '/api/ar/accounts', {
      method: 'POST',
      json: {
        propertyId,
        code,
        name,
        // 비우면 한도 없음이다. 0 과 구분해야 한다.
        ...(rawLimit ? { creditLimit: Number(rawLimit) } : {}),
        ...(rawTerm ? { termDays: Number(rawTerm) } : {}),
        ...(billingEmail ? { billingEmail } : {}),
      },
    });
  } catch (error) {
    return actionError(backendMessage(error, '거래처를 등록하지 못했습니다.'), values);
  }

  revalidatePath('/ar');
  return actionSuccess(`거래처 ${code} 를 등록했습니다.`);
}

export async function recordPaymentAction(
  accountId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, ['amount', 'description']);

  const amount = readAmount(formData.get('amount'), '입금액');
  if (typeof amount === 'string') return actionError(amount, values);

  const description = String(formData.get('description') ?? '').trim();
  if (!description) return actionError('적요를 입력해 주세요.', values);

  try {
    await apiFetch('be', `/api/ar/accounts/${encodeURIComponent(accountId)}/payments`, {
      method: 'POST',
      json: { amount, description },
    });
  } catch (error) {
    return actionError(backendMessage(error, '입금을 기록하지 못했습니다.'), values);
  }

  revalidatePath(`/ar/${accountId}`);
  revalidatePath('/ar');
  return actionSuccess(`입금 ${amount.toLocaleString('ko-KR')}원을 기록했습니다.`);
}

export async function createInvoiceAction(
  accountId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const note = String(formData.get('note') ?? '').trim();

  let invoice: { number: string; total: string };
  try {
    invoice = await apiFetch('be', `/api/ar/accounts/${encodeURIComponent(accountId)}/invoices`, {
      method: 'POST',
      json: note ? { note } : {},
    });
  } catch (error) {
    return actionError(backendMessage(error, '청구서를 발행하지 못했습니다.'));
  }

  revalidatePath(`/ar/${accountId}`);
  return actionSuccess(
    `청구서 ${invoice.number} 를 발행했습니다 (${Number(invoice.total).toLocaleString('ko-KR')}원).`,
  );
}

export async function updateInvoiceStatusAction(
  accountId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const invoiceId = String(formData.get('invoiceId') ?? '').trim();
  if (!invoiceId) return actionError('대상 청구서를 찾을 수 없습니다.');

  const status = String(formData.get('status') ?? '');
  if (!STATUSES.includes(status as ArInvoiceStatus)) {
    return actionError('상태를 선택해 주세요.');
  }

  const number = String(formData.get('number') ?? '청구서');

  try {
    await apiFetch('be', `/api/ar/invoices/${encodeURIComponent(invoiceId)}/status`, {
      method: 'PATCH',
      json: { status },
    });
  } catch (error) {
    return actionError(backendMessage(error, '상태를 바꾸지 못했습니다.'));
  }

  revalidatePath(`/ar/${accountId}`);
  return actionSuccess(
    status === 'VOID'
      ? `${number} 를 무효 처리했습니다. 묶여 있던 거래는 다시 청구할 수 있습니다.`
      : `${number} 상태를 바꿨습니다.`,
  );
}

/** 폴리오 잔액을 거래처로 넘긴다. 예약 상세에서 쓴다. */
export async function transferToArAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, ['accountId', 'window', 'description']);

  const accountId = String(formData.get('accountId') ?? '').trim();
  if (!accountId) return actionError('거래처를 선택해 주세요.', values);

  const window = Number(String(formData.get('window') ?? ''));
  if (!Number.isInteger(window) || window < 1) {
    return actionError('창구를 선택해 주세요.', values);
  }

  const description = String(formData.get('description') ?? '').trim();

  let result: { transaction: { amount: string } };
  try {
    result = await apiFetch(
      'be',
      `/api/reservations/${encodeURIComponent(reservationId)}/ar/transfer`,
      { method: 'POST', json: { accountId, window, ...(description ? { description } : {}) } },
    );
  } catch (error) {
    return actionError(backendMessage(error, '거래처로 넘기지 못했습니다.'), values);
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath('/ar');
  return actionSuccess(
    `${Number(result.transaction.amount).toLocaleString('ko-KR')}원을 거래처로 넘겼습니다.`,
  );
}
