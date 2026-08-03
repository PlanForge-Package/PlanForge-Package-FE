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
import { ActionMessage, SubmitButton } from './action-feedback';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  AUTHORIZED: '승인',
  CAPTURED: '매입 완료',
  VOIDED: '승인 취소',
  REFUNDED: '환불',
  FAILED: '실패',
};

const STATUS_TONES: Record<PaymentStatus, string> = {
  AUTHORIZED: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  CAPTURED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  VOIDED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  REFUNDED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  FAILED: 'bg-red-500/15 text-red-700 dark:text-red-300',
};

const METHODS = Object.keys(METHOD_LABELS) as PaymentMethod[];

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
 * 결제.
 *
 * 네 액션의 상태를 패널이 함께 들고 있다. 매입하면 행의 버튼이 사라지므로 행에
 * 상태를 묶으면 결과 메시지도 같이 사라진다.
 */
export function PaymentPanel({
  data,
  canRefund,
}: {
  data: PaymentListResponse;
  /** 환불은 돈이 나가는 방향이다. 지배인 이상만 한다. */
  canRefund: boolean;
}) {
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
   * 멱등키는 시도마다 새로 만든다.
   *
   * useId 로 만들면 안 된다 — 컴포넌트 위치로 정해지는 값이라 페이지를 새로
   * 열 때마다 같다. 그러면 새 결제가 이전 결제의 재전송으로 취급되어, 실제로는
   * 긁히지 않았는데 **다른 금액이 성공으로 보고된다.**
   *
   * 서버 렌더에서는 비워 두고 마운트 후 채운다. 초기값을 난수로 두면 서버와
   * 클라이언트가 달라 하이드레이션이 깨진다.
   */
  const [idempotencyKey, setIdempotencyKey] = useState('');
  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  // 성공한 키를 계속 들고 있으면 다음 결제가 그 결제로 취급된다.
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
    <section aria-label="결제" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">결제</h2>

      {data.driverMode === 'mock' && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          <span className="font-medium">결제 대행사가 모의 모드입니다.</span>{' '}
          <span className="text-subtle">
            승인·매입 흐름은 그대로 돌지만 실제로 돈이 오가지 않습니다.
          </span>
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
            수단
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
                {METHOD_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-amount`} className="text-xs text-subtle">
            금액
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
              결제 토큰
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
            적요 (선택)
          </label>
          <input
            id={`${uid}-desc`}
            name="description"
            maxLength={120}
            placeholder="객실료 정산"
            defaultValue={kept?.description ?? ''}
            className={`w-40 ${inputClass}`}
          />
        </div>

        <SubmitButton pendingLabel="처리 중…">{method === 'CARD' ? '승인' : '수납'}</SubmitButton>

        <p className="w-full text-xs text-subtle">
          {method === 'CARD'
            ? '카드는 승인만 합니다. 매입해야 폴리오에 반영됩니다. 카드 번호는 저장하지 않습니다 — 단말이 PG 에서 받아 온 토큰만 씁니다.'
            : '현금·이체는 받은 즉시 폴리오에 반영됩니다.'}
        </p>
      </form>

      {data.items.length === 0 ? (
        <p className="text-sm text-subtle">결제 이력이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  수단
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  금액
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  카드
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  상태
                </th>
                <th scope="col" className="py-2 font-medium">
                  처리
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const refundable = Number(item.amount) - Number(item.refundedAmount);
                return (
                  <tr key={item.id} className="border-b border-current/5">
                    <td className="py-2.5 pr-4">{METHOD_LABELS[item.method]}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {money(item.amount, item.currency)}
                      {Number(item.refundedAmount) > 0 && (
                        <span className="ml-1.5 text-xs text-subtle">
                          환불 {money(item.refundedAmount, item.currency)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-subtle">
                      {item.maskedCard ?? '—'}
                      {item.approvalNumber && (
                        <span className="ml-1.5">승인 {item.approvalNumber}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
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
                                매입
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
                                confirm="승인을 취소합니다. 진행할까요?"
                                className={smallButton}
                              >
                                승인 취소
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
                                aria-label="환불 금액"
                                className="w-24 rounded-md border border-current/20 bg-transparent px-2 py-1 text-xs tabular-nums"
                              />
                              <SubmitButton
                                pendingLabel="…"
                                confirm="환불합니다. 되돌리기 어렵습니다. 진행할까요?"
                                className={smallButton}
                              >
                                환불
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
