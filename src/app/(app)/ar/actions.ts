'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch } from '@/lib/api';
import { getDictionary } from '@/lib/i18n';
import { fill, money } from '@/lib/i18n/format';
import type { ArInvoiceStatus } from '@/lib/types';
import { translateError } from '@/lib/translate-error';

const STATUSES: ArInvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'VOID'];

function readAmount(
  value: FormDataEntryValue | null,
  label: string,
  template: string,
): number | string {
  const raw = String(value ?? '').trim();
  const parsed = Number(raw);
  if (!raw || !Number.isInteger(parsed) || parsed <= 0) {
    return fill(template, { label });
  }
  return parsed;
}

export async function createAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const values = formValues(formData, ['code', 'name', 'creditLimit', 'termDays', 'billingEmail']);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) return actionError(t.ar.msgSelectProperty, values);

  const code = String(formData.get('code') ?? '').trim();
  if (!code) return actionError(t.ar.msgCodeRequired, values);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return actionError(t.ar.msgNameRequired, values);

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
        // Empty means no limit. It has to be distinguishable from 0.
        ...(rawLimit ? { creditLimit: Number(rawLimit) } : {}),
        ...(rawTerm ? { termDays: Number(rawTerm) } : {}),
        ...(billingEmail ? { billingEmail } : {}),
      },
    });
  } catch (error) {
    return actionError(translateError(error, t, t.ar.msgCreateFailed), values);
  }

  revalidatePath('/ar');
  return actionSuccess(fill(t.ar.msgCreated, { code }));
}

export async function recordPaymentAction(
  accountId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { locale, t } = await getDictionary();
  const values = formValues(formData, ['amount', 'description']);

  const amount = readAmount(formData.get('amount'), t.ar.paymentAmount, t.ar.msgAmountInvalid);
  if (typeof amount === 'string') return actionError(amount, values);

  const description = String(formData.get('description') ?? '').trim();
  if (!description) return actionError(t.ar.msgMemoRequired, values);

  /*
   * Allocation mode.
   *
   * `auto` fills the earliest-due invoices first and `none` only lowers the balance.
   * Naming one invoice applies it to that one alone — accounts commonly say which
   * invoice they are settling.
   */
  const apply = String(formData.get('apply') ?? 'none');
  const body: Record<string, unknown> = { amount, description };
  if (apply === 'auto') {
    body.autoApply = 'true';
  } else if (apply !== 'none') {
    body.allocations = [{ invoiceId: apply, amount }];
  }

  let result: { unapplied: string };
  try {
    result = await apiFetch('be', `/api/ar/accounts/${encodeURIComponent(accountId)}/payments`, {
      method: 'POST',
      json: body,
    });
  } catch (error) {
    return actionError(translateError(error, t, t.ar.msgPaymentFailed), values);
  }

  revalidatePath(`/ar/${accountId}`);
  revalidatePath('/ar');

  const unapplied = Number(result.unapplied);
  return actionSuccess(
    unapplied > 0 && apply !== 'none'
      ? fill(t.ar.msgPaymentUnapplied, {
          amount: money(amount, locale),
          rest: money(unapplied, locale),
        })
      : fill(t.ar.msgPaymentRecorded, { amount: money(amount, locale) }),
  );
}

export async function createInvoiceAction(
  accountId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { locale, t } = await getDictionary();
  const note = String(formData.get('note') ?? '').trim();

  let invoice: { number: string; total: string };
  try {
    invoice = await apiFetch('be', `/api/ar/accounts/${encodeURIComponent(accountId)}/invoices`, {
      method: 'POST',
      json: note ? { note } : {},
    });
  } catch (error) {
    return actionError(translateError(error, t, t.ar.msgInvoiceFailed));
  }

  revalidatePath(`/ar/${accountId}`);
  return actionSuccess(
    fill(t.ar.msgInvoiceIssued, {
      number: invoice.number,
      amount: money(invoice.total, locale),
    }),
  );
}

export async function updateInvoiceStatusAction(
  accountId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const invoiceId = String(formData.get('invoiceId') ?? '').trim();
  if (!invoiceId) return actionError(t.ar.msgInvoiceMissing);

  const status = String(formData.get('status') ?? '');
  if (!STATUSES.includes(status as ArInvoiceStatus)) {
    return actionError(t.ar.msgStatusRequired);
  }

  const number = String(formData.get('number') ?? t.ar.invoices);

  try {
    await apiFetch('be', `/api/ar/invoices/${encodeURIComponent(invoiceId)}/status`, {
      method: 'PATCH',
      json: { status },
    });
  } catch (error) {
    return actionError(translateError(error, t, t.ar.msgStatusFailed));
  }

  revalidatePath(`/ar/${accountId}`);
  return actionSuccess(
    status === 'VOID' ? fill(t.ar.msgVoided, { number }) : fill(t.ar.msgStatusChanged, { number }),
  );
}

/** Transfers a folio balance to an account. Used from the reservation detail. */
export async function transferToArAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { locale, t } = await getDictionary();
  const values = formValues(formData, ['accountId', 'window', 'description']);

  const accountId = String(formData.get('accountId') ?? '').trim();
  if (!accountId) return actionError(t.ar.msgAccountRequired, values);

  const window = Number(String(formData.get('window') ?? ''));
  if (!Number.isInteger(window) || window < 1) {
    return actionError(t.ar.msgWindowRequired, values);
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
    return actionError(translateError(error, t, t.ar.msgTransferFailed), values);
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath('/ar');
  return actionSuccess(
    fill(t.ar.msgTransferred, { amount: money(result.transaction.amount, locale) }),
  );
}
