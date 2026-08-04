'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import {
  createAccountAction,
  createInvoiceAction,
  recordPaymentAction,
  updateInvoiceStatusAction,
} from '@/app/(app)/ar/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ArAccountDetail, ArAccountList, ArInvoiceStatus } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

export const INVOICE_STATUS_LABELS: Record<ArInvoiceStatus, string> = {
  DRAFT: '발행',
  SENT: '보냄',
  PAID: '수금',
  VOID: '무효',
};

const TYPE_LABELS: Record<string, string> = {
  CHARGE: '청구',
  PAYMENT: '입금',
  ADJUSTMENT: '조정',
};

function money(amount: string | null): string {
  if (amount === null) return '—';
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  return `${value.toLocaleString('ko-KR')}원`;
}

const smallButton =
  'rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50';

/** 거래처 목록과 등록. */
export function ArAccountsPanel({
  propertyId,
  data,
  canCreate,
}: {
  propertyId: string;
  data: ArAccountList;
  canCreate: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createAccountAction, IDLE);

  return (
    <section aria-label="거래처" className="flex flex-col gap-3">
      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {canCreate && (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="propertyId" value={propertyId} />

          <label className="flex flex-col gap-1 text-xs text-subtle">
            코드
            <input
              type="text"
              name="code"
              defaultValue={state.values?.code ?? ''}
              required
              maxLength={20}
              placeholder="SPACEPL"
              className="w-32 rounded-md border border-current/20 bg-transparent px-2 py-1.5 font-mono text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            이름
            <input
              type="text"
              name="name"
              defaultValue={state.values?.name ?? ''}
              required
              maxLength={120}
              placeholder="스페이스플래닝"
              className="w-56 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            여신 한도
            <input
              type="number"
              name="creditLimit"
              min={0}
              // 원 단위. step 을 크게 잡으면 그 배수가 아닌 금액이 브라우저 검증에
              // 걸려 제출 자체가 조용히 막힌다.
              step={1}
              defaultValue={state.values?.creditLimit ?? ''}
              placeholder="비우면 한도 없음"
              className="w-40 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            결제 조건(일)
            <input
              type="number"
              name="termDays"
              min={0}
              defaultValue={state.values?.termDays ?? '30'}
              className="w-28 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <SubmitButton pendingLabel="등록 중…">거래처 등록</SubmitButton>
        </form>
      )}

      {data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-8 text-center text-sm text-subtle">
          등록된 거래처가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">거래처 목록</caption>
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  코드
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  이름
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  미수 잔액
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  여신 한도
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  결제 조건
                </th>
                <th scope="col" className="py-2 font-medium">
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const balance = Number(item.balance);
                const overLimit = item.creditLimit !== null && balance > Number(item.creditLimit);
                return (
                  <tr key={item.id} className="border-b border-current/5">
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      <Link href={`/ar/${item.id}`} className="underline underline-offset-4">
                        {item.code}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">{item.name}</td>
                    <td
                      className={`py-2.5 pr-4 text-right tabular-nums ${
                        overLimit ? 'text-red-700 dark:text-red-300' : ''
                      }`}
                    >
                      {money(item.balance)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                      {item.creditLimit === null ? '없음' : money(item.creditLimit)}
                    </td>
                    <td className="py-2.5 pr-4 text-subtle">{item.termDays}일</td>
                    <td className="py-2.5 text-subtle">{item.active ? '거래 중' : '중지'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-subtle">
        미수 잔액은 거래 합계입니다 — 청구는 더하고 입금은 뺍니다. 여신 한도를 넘으면 새 이관이
        막힙니다.
      </p>
    </section>
  );
}

/** 거래처 상세 — 입금·청구서 발행과 원장. */
export function ArAccountDetailPanel({
  data,
  canManage,
}: {
  data: ArAccountDetail;
  canManage: boolean;
}) {
  const [paymentState, paymentAction] = useActionState<ActionState, FormData>(
    recordPaymentAction.bind(null, data.account.id),
    IDLE,
  );
  const [invoiceState, invoiceAction] = useActionState<ActionState, FormData>(
    createInvoiceAction.bind(null, data.account.id),
    IDLE,
  );
  const [statusState, statusAction] = useActionState<ActionState, FormData>(
    updateInvoiceStatusAction.bind(null, data.account.id),
    IDLE,
  );

  /*
   * 마지막에 실행한 동작의 결과를 보여 준다.
   *
   * 셋 다 같은 화면을 바꾸는데, 고정된 우선순위를 두면 앞선 동작의 오류가
   * 방금 한 일의 결과를 가린다 — 입금을 기록했는데 조금 전 청구서 오류가
   * 그대로 떠 있으면 입금이 실패한 것으로 읽힌다.
   */
  // 아직 다 받지 못한 청구서. 입금을 붙일 수 있는 대상이다.
  const open = data.invoices.filter(
    (invoice) =>
      invoice.status !== 'PAID' && invoice.status !== 'VOID' && Number(invoice.outstanding) > 0,
  );

  const [last, setLast] = useState<'payment' | 'invoice' | 'status' | null>(null);
  const state =
    last === 'status'
      ? statusState
      : last === 'invoice'
        ? invoiceState
        : last === 'payment'
          ? paymentState
          : IDLE;

  return (
    <div className="flex flex-col gap-8">
      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      <section aria-label="잔액" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="미수 잔액" value={money(data.balance)} />
        <Figure label="미청구" value={money(data.unbilled)} />
        <Figure
          label="여신 한도"
          value={data.account.creditLimit === null ? '없음' : money(data.account.creditLimit)}
        />
        <Figure label="결제 조건" value={`${data.account.termDays}일`} />
      </section>

      {canManage && (
        <section aria-label="거래처 처리" className="flex flex-wrap items-end gap-4">
          <form
            action={paymentAction}
            onSubmit={() => setLast('payment')}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="flex flex-col gap-1 text-xs text-subtle">
              입금액
              <input
                type="number"
                name="amount"
                min={1}
                step={1}
                defaultValue={paymentState.values?.amount ?? ''}
                required
                className="w-40 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-subtle">
              적요
              <input
                type="text"
                name="description"
                defaultValue={paymentState.values?.description ?? ''}
                required
                maxLength={200}
                placeholder="10월분 입금"
                className="w-56 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-subtle">
              배분
              <select
                name="apply"
                defaultValue="auto"
                className="w-56 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
              >
                <option value="auto">만기 빠른 순으로 자동</option>
                <option value="none">배분하지 않음</option>
                {open.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.number} (남은 {money(invoice.outstanding)})
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton pendingLabel="기록 중…">입금 기록</SubmitButton>
          </form>

          <form
            action={invoiceAction}
            onSubmit={() => setLast('invoice')}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="flex flex-col gap-1 text-xs text-subtle">
              청구서 메모
              <input
                type="text"
                name="note"
                maxLength={500}
                placeholder="10월분"
                className="w-56 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
              />
            </label>
            <SubmitButton pendingLabel="발행 중…">청구서 발행</SubmitButton>
          </form>
        </section>
      )}

      <section aria-label="청구서" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">청구서</h2>
        {data.invoices.length === 0 ? (
          <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
            발행한 청구서가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    번호
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    금액
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    받은 금액
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    남은 금액
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    발행
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    만기
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    상태
                  </th>
                  {canManage && (
                    <th scope="col" className="py-2 font-medium">
                      상태 변경
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-current/5">
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      <Link
                        href={`/ar/invoices/${invoice.id}`}
                        className="underline underline-offset-4"
                      >
                        {invoice.number}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{money(invoice.total)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                      {money(invoice.paid)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {money(invoice.outstanding)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums text-subtle">
                      {invoice.issuedAt.slice(0, 10)}
                    </td>
                    <td
                      className={`py-2.5 pr-4 tabular-nums ${
                        invoice.overdue ? 'text-red-700 dark:text-red-300' : 'text-subtle'
                      }`}
                    >
                      {invoice.dueDate.slice(0, 10)}
                      {invoice.overdue && <span className="ml-1.5 text-xs">연체</span>}
                    </td>
                    <td className="py-2.5 pr-4">{INVOICE_STATUS_LABELS[invoice.status]}</td>
                    {canManage && (
                      <td className="py-2.5">
                        {invoice.status === 'VOID' ? (
                          <span className="text-xs text-subtle">—</span>
                        ) : (
                          <form
                            action={statusAction}
                            onSubmit={() => setLast('status')}
                            className="flex items-center gap-1"
                          >
                            <input type="hidden" name="invoiceId" value={invoice.id} />
                            <input type="hidden" name="number" value={invoice.number} />
                            <select
                              name="status"
                              defaultValue={invoice.status}
                              aria-label={`${invoice.number} 상태`}
                              className="rounded-md border border-current/20 bg-transparent px-1.5 py-0.5 text-xs"
                            >
                              {(Object.keys(INVOICE_STATUS_LABELS) as ArInvoiceStatus[]).map(
                                (value) => (
                                  <option key={value} value={value}>
                                    {INVOICE_STATUS_LABELS[value]}
                                  </option>
                                ),
                              )}
                            </select>
                            <SubmitButton pendingLabel="…" className={smallButton}>
                              적용
                            </SubmitButton>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-subtle">
          청구서에 묶인 거래는 다시 다른 청구서에 들어가지 않습니다 — 두 번 청구하면 거래처가 두 번
          냅니다. 무효로 돌리면 묶여 있던 거래가 풀립니다.
        </p>
      </section>

      <section aria-label="원장" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">거래 내역</h2>
        {data.transactions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
            거래가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    일시
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    종류
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    적요
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    금액
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    청구서
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => {
                  const value = Number(tx.amount);
                  return (
                    <tr key={tx.id} className="border-b border-current/5">
                      <td className="py-2.5 pr-4 tabular-nums text-subtle">
                        {tx.postedAt.slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="py-2.5 pr-4">{TYPE_LABELS[tx.type] ?? tx.type}</td>
                      <td className="py-2.5 pr-4">
                        {tx.description}
                        {tx.reservation && (
                          <Link
                            href={`/reservations/${tx.reservation.id}`}
                            className="ml-1.5 font-mono text-xs underline underline-offset-4 text-subtle"
                          >
                            {tx.reservation.confirmationNumber}
                          </Link>
                        )}
                      </td>
                      <td
                        className={`py-2.5 pr-4 text-right tabular-nums ${
                          value < 0 ? 'text-emerald-700 dark:text-emerald-300' : ''
                        }`}
                      >
                        {money(tx.amount)}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-subtle">
                        {tx.invoice?.number ?? '미청구'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-current/10 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-subtle">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
