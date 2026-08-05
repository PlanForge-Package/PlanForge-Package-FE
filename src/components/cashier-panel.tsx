'use client';

import { useActionState } from 'react';
import { closeShiftAction, openShiftAction } from '@/app/(app)/cashier/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { CashierShift, CashierSummary, PaymentMethod } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { Figure } from './field';
import { control } from './ui';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: '현금',
  CARD: '카드',
  TRANSFER: '계좌이체',
};

function money(amount: string | null): string {
  if (amount === null) return '—';
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  return `${value.toLocaleString('ko-KR')}원`;
}

function time(iso: string): string {
  return iso.slice(11, 16);
}

/**
 * Cashier shift.
 *
 * With a shift open it shows what has been taken and what should be in the drawer;
 * without one it takes an opening float and opens a shift.
 */
export function CashierPanel({
  propertyId,
  shift,
  summary,
}: {
  propertyId: string;
  shift: CashierShift | null;
  summary: CashierSummary | null;
}) {
  const [openState, openAction] = useActionState<ActionState, FormData>(openShiftAction, IDLE);
  const [closeState, closeAction] = useActionState<ActionState, FormData>(closeShiftAction, IDLE);

  /*
   * Shows the result that fits the current screen.
   *
   * Closing removes the shift, so the close message has to stay. But opening a new
   * shift right after makes the open message the right one — holding on to the close
   * result would read as if the shift just started had been closed.
   */
  const state =
    shift && openState.status === 'success'
      ? openState
      : closeState.status !== 'idle'
        ? closeState
        : openState;

  return (
    <section aria-label="근무조" className="flex flex-col gap-4">
      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {!shift || !summary ? (
        <form
          action={openAction}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-current/10 px-4 py-4"
        >
          <input type="hidden" name="propertyId" value={propertyId} />
          <p className="w-full text-sm text-subtle">
            열려 있는 근무조가 없습니다. 시작 시재를 적고 근무를 시작해 주세요.
          </p>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            시작 시재
            <input
              type="number"
              name="openingFloat"
              min={0}
              step={1}
              defaultValue={openState.values?.openingFloat ?? '0'}
              required
              className={control('lg', 'w-40')}
            />
          </label>

          <SubmitButton pendingLabel="여는 중…">근무 시작</SubmitButton>
        </form>
      ) : (
        <article className="rounded-lg border border-current/10">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">{shift.user.name} 근무조</h2>
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-300">
                진행 중
              </span>
            </div>
            <p className="text-sm text-subtle">
              {time(shift.openedAt)} 시작 · 수납 {summary.paymentCount}건
            </p>
          </header>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-4">
            <Figure label="시작 시재" value={money(summary.openingFloat)} />
            {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((method) => (
              <Figure
                key={method}
                label={METHOD_LABELS[method]}
                value={money(summary.byMethod[method])}
              />
            ))}
          </dl>

          <div className="border-t border-current/10 px-4 py-3">
            <p className="text-sm">
              <span className="text-subtle">금고에 있어야 할 현금 </span>
              <span className="font-semibold tabular-nums">{money(summary.expectedCash)}</span>
            </p>
            <p className="mt-0.5 text-xs text-subtle">
              시작 시재 + 이 조가 받은 현금입니다. 카드·계좌이체는 금고에 들어오지 않습니다.
            </p>
          </div>

          <form
            action={closeAction}
            className="flex flex-wrap items-end gap-2 border-t border-current/10 px-4 py-3"
          >
            <input type="hidden" name="shiftId" value={shift.id} />

            <label className="flex flex-col gap-1 text-xs text-subtle">
              센 현금
              <input
                type="number"
                name="countedCash"
                min={0}
                // The counted amount goes in as is. Accepting only multiples of 1000 makes closing impossible.
                step={1}
                defaultValue={closeState.values?.countedCash ?? ''}
                required
                placeholder={summary.expectedCash.split('.')[0]}
                className={control('lg', 'w-40')}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-subtle">
              메모
              <input
                type="text"
                name="notes"
                maxLength={500}
                defaultValue={closeState.values?.notes ?? ''}
                placeholder="차이가 있으면 사유를 적어 주세요"
                className={control('lg', 'w-72')}
              />
            </label>

            <SubmitButton pendingLabel="마감 중…" confirm="이 근무조를 마감하시겠습니까?">
              마감
            </SubmitButton>
          </form>

          <p className="border-t border-current/10 px-4 py-3 text-xs text-subtle">
            차이가 나도 마감은 됩니다. 맞을 때까지 미루면 다음 조의 수납이 이 조에 섞입니다 — 차이는
            메모로 남기고 다음 날 확인해 주세요.
          </p>
        </article>
      )}
    </section>
  );
}

/** Past shifts. Consulted when tracing a discrepancy. */
export function CashierHistory({
  shifts,
}: {
  shifts: Array<CashierShift & { summary: CashierSummary }>;
}) {
  if (shifts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-current/20 px-4 py-8 text-center text-sm text-subtle">
        마감한 근무조가 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <caption className="sr-only">지난 근무조</caption>
        <thead>
          <tr className="border-b border-current/10 text-left">
            <th scope="col" className="py-2 pr-4 font-medium">
              담당
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              시간
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              현금
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              카드
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              있어야 할 현금
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              센 현금
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-medium">
              차이
            </th>
            <th scope="col" className="py-2 font-medium">
              메모
            </th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => {
            const difference = shift.summary.difference;
            const value = difference === null ? null : Number(difference);
            return (
              <tr key={shift.id} className="border-b border-current/5">
                <td className="py-2.5 pr-4">{shift.user.name}</td>
                <td className="py-2.5 pr-4 tabular-nums">
                  {time(shift.openedAt)}
                  {shift.closedAt ? ` ~ ${time(shift.closedAt)}` : ' ~ 진행 중'}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums">
                  {money(shift.summary.byMethod.CASH)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums">
                  {money(shift.summary.byMethod.CARD)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums">
                  {money(shift.summary.expectedCash)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums">
                  {money(shift.summary.countedCash)}
                </td>
                <td
                  className={`py-2.5 pr-4 text-right tabular-nums ${
                    value === null || value === 0
                      ? ''
                      : value < 0
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {value === null ? '—' : value === 0 ? '맞음' : money(difference)}
                </td>
                <td className="py-2.5 text-subtle">{shift.notes ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
