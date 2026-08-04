'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import {
  authorizePaymentAction,
  capturePaymentAction,
  refundPaymentAction,
  voidPaymentAction,
} from '@/app/(app)/reservations/[id]/payment-actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { PaymentListResponse, PaymentMethod, PaymentStatus } from '@/lib/types';
import { useI18n } from '@/lib/i18n/provider';
import { ActionMessage, SubmitButton } from './action-feedback';

const STATUS_TONES: Record<PaymentStatus, string> = {
  AUTHORIZED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  CAPTURED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  VOIDED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  REFUNDED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  FAILED: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

/** Display order. The wording comes from the dictionary. */
const METHODS: PaymentMethod[] = ['CARD', 'CASH', 'TRANSFER'];

const inputClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';
const smallButton =
  'rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50';

function money(value: string, currency = 'KRW'): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('ko-KR')} ${currency}`;
  }
}

/**
 * Payments.
 *
 * The panel holds the state of all four actions. Capturing removes the row's button,
 * so state tied to the row would take the result message with it.
 */
export function PaymentPanel({
  data,
  canRefund,
}: {
  data: PaymentListResponse;
  /** A refund sends money out. Managers and above only. */
  canRefund: boolean;
}) {
  const t = useI18n();
  const [authState, authorize] = useActionState<ActionState, FormData>(
    authorizePaymentAction,
    IDLE,
  );
  const [captureState, capture] = useActionState<ActionState, FormData>(capturePaymentAction, IDLE);
  const [voidState, voidPayment] = useActionState<ActionState, FormData>(voidPaymentAction, IDLE);
  const [refundState, refund] = useActionState<ActionState, FormData>(refundPaymentAction, IDLE);
  const [last, setLast] = useState<'auth' | 'capture' | 'void' | 'refund' | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CARD');

  const uid = useId();

  /*
   * A fresh idempotency key per attempt.
   *
   * It must not come from useId — that value is fixed by component position and is
   * the same every time the page is opened. A new payment would then count as a
   * resend of the previous one and **a different amount is reported as succeeded**.
   *
   * Left empty on the server render and filled after mount. A random initial value
   * would differ between server and client and break hydration.
   */
  const [idempotencyKey, setIdempotencyKey] = useState('');
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  // Holding on to a succeeded key makes the next payment count as that one.
  useEffect(() => {
    if (authState.status === 'success') setIdempotencyKey(crypto.randomUUID());
  }, [authState]);

  const feedback =
    last === 'auth'
      ? authState
      : last === 'capture'
        ? captureState
        : last === 'void'
          ? voidState
          : last === 'refund'
            ? refundState
            : IDLE;

  const kept = authState.status === 'error' ? authState.values : undefined;

  return (
    <section aria-label={t.payments.title} className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{t.payments.title}</h2>

      {data.driverMode === 'mock' && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          <span className="font-medium">{t.payments.mockMode}</span>{' '}
          <span className="text-subtle">{t.payments.mockNote}</span>
        </p>
      )}

      <div aria-live="polite">
        <ActionMessage state={feedback} />
      </div>

      <form
        action={(formData) => {
          setLast('auth');
          authorize(formData);
        }}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-current/10 px-4 py-3"
      >
        <input type="hidden" name="reservationId" value={data.reservationId} />
        <input type="hidden" name="window" value="1" />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-method`} className="text-xs text-subtle">
            {t.payments.method}
          </label>
          <select
            id={`${uid}-method`}
            name="method"
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            className={inputClass}
          >
            {METHODS.map((value) => (
              <option key={value} value={value}>
                {t.payments.methods[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-amount`} className="text-xs text-subtle">
            {t.common.amount}
          </label>
          <input
            id={`${uid}-amount`}
            name="amount"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={kept?.amount ?? ''}
            className={`w-32 tabular-nums ${inputClass}`}
          />
        </div>

        {method === 'CARD' && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-token`} className="text-xs text-subtle">
              {t.payments.token}
            </label>
            <input
              id={`${uid}-token`}
              name="paymentToken"
              placeholder="tok_..."
              defaultValue={kept?.paymentToken ?? ''}
              className={`w-48 font-mono ${inputClass}`}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-desc`} className="text-xs text-subtle">
            {t.payments.memo}
          </label>
          <input
            id={`${uid}-desc`}
            name="description"
            maxLength={120}
            placeholder={t.payments.memoPlaceholder}
            defaultValue={kept?.description ?? ''}
            className={`w-40 ${inputClass}`}
          />
        </div>

        <SubmitButton pendingLabel={t.common.processing}>
          {method === 'CARD' ? t.payments.authorize : t.payments.collect}
        </SubmitButton>

        <p className="w-full text-xs text-subtle">
          {method === 'CARD' ? t.payments.cardNote : t.payments.cashNote}
        </p>
      </form>

      {data.items.length === 0 ? (
        <p className="text-sm text-subtle">{t.payments.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.payments.method}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t.common.amount}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.payments.card}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.common.status}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {t.payments.action}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const refundable = Number(item.amount) - Number(item.refundedAmount);
                return (
                  <tr key={item.id} className="border-b border-current/5">
                    <td className="py-2.5 pr-4">{t.payments.methods[item.method]}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {money(item.amount, item.currency)}
                      {Number(item.refundedAmount) > 0 && (
                        <span className="ml-1.5 text-xs text-subtle">
                          {t.payments.refunded} {money(item.refundedAmount, item.currency)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-subtle">
                      {item.maskedCard ?? '—'}
                      {item.approvalNumber && (
                        <span className="ml-1.5">
                          {t.payments.approvalNumber} {item.approvalNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONES[item.status]}`}
                      >
                        {t.payments.statuses[item.status]}
                      </span>
                      {item.failureReason && (
                        <span className="ml-1.5 text-xs text-subtle">{item.failureReason}</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.status === 'AUTHORIZED' && (
                          <>
                            <form
                              action={(formData) => {
                                setLast('capture');
                                capture(formData);
                              }}
                            >
                              <input type="hidden" name="paymentId" value={item.id} />
                              <input
                                type="hidden"
                                name="reservationId"
                                value={data.reservationId}
                              />
                              <SubmitButton pendingLabel="…" className={smallButton}>
                                {t.payments.capture}
                              </SubmitButton>
                            </form>
                            <form
                              action={(formData) => {
                                setLast('void');
                                voidPayment(formData);
                              }}
                            >
                              <input type="hidden" name="paymentId" value={item.id} />
                              <input
                                type="hidden"
                                name="reservationId"
                                value={data.reservationId}
                              />
                              <SubmitButton
                                pendingLabel="…"
                                confirm={t.payments.voidConfirm}
                                className={smallButton}
                              >
                                {t.payments.void}
                              </SubmitButton>
                            </form>
                          </>
                        )}

                        {canRefund &&
                          (item.status === 'CAPTURED' || item.status === 'REFUNDED') &&
                          refundable > 0 && (
                            <form
                              action={(formData) => {
                                setLast('refund');
                                refund(formData);
                              }}
                              className="flex flex-wrap items-center gap-1.5"
                            >
                              <input type="hidden" name="paymentId" value={item.id} />
                              <input
                                type="hidden"
                                name="reservationId"
                                value={data.reservationId}
                              />
                              <input
                                name="refundAmount"
                                type="number"
                                min={1}
                                max={refundable}
                                defaultValue={refundable}
                                aria-label={t.payments.refundAmount}
                                className="w-24 rounded-md border border-current/20 bg-transparent px-2 py-1 text-xs tabular-nums"
                              />
                              <SubmitButton
                                pendingLabel="…"
                                confirm={t.payments.refundConfirm}
                                className={smallButton}
                              >
                                {t.payments.refund}
                              </SubmitButton>
                            </form>
                          )}

                        {item.status === 'VOIDED' || item.status === 'FAILED' ? (
                          <span className="text-xs text-subtle">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
