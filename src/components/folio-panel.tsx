'use client';

import { useActionState, useId } from 'react';
import { addPostingAction, openFolioAction } from '@/app/(app)/reservations/[id]/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { ActionMessage, SubmitButton } from './action-feedback';
import type { Folio, PostingType } from '@/lib/types';

const POSTING_LABELS: Record<PostingType, string> = {
  CHARGE: '청구',
  PAYMENT: '결제',
  ADJUSTMENT: '조정',
  TAX: '세금',
};

/** 자주 쓰는 OPERA transactionCode 기본값. 입력은 자유롭게 바꿀 수 있다. */
const DEFAULT_CODES: Record<PostingType, string> = {
  CHARGE: '1000',
  TAX: '9000',
  PAYMENT: '5000',
  ADJUSTMENT: '7000',
};

function formatMoney(amount: string, currency: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;

  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // 알 수 없는 통화 코드가 오면 Intl 이 던진다. 숫자만이라도 보여준다.
    return `${value.toLocaleString('ko-KR')} ${currency}`;
  }
}

export function FolioPanel({
  reservationId,
  folios,
  currency,
}: {
  reservationId: string;
  folios: Folio[];
  currency: string;
}) {
  const [openState, openAction] = useActionState<ActionState, FormData>(
    openFolioAction.bind(null, reservationId),
    IDLE,
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">폴리오</h2>
        <form action={openAction}>
          <SubmitButton pendingLabel="여는 중…">윈도 추가</SubmitButton>
        </form>
      </div>
      <ActionMessage state={openState} />

      {folios.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-8 text-center text-sm text-subtle">
          아직 폴리오가 없습니다. 체크인하면 자동으로 열리며, 위 버튼으로 직접 열 수도 있습니다.
        </p>
      ) : (
        folios.map((folio) => (
          <FolioCard
            key={folio.id}
            reservationId={reservationId}
            folio={folio}
            currency={currency}
          />
        ))
      )}
    </section>
  );
}

function FolioCard({
  reservationId,
  folio,
  currency,
}: {
  reservationId: string;
  folio: Folio;
  currency: string;
}) {
  const closed = folio.status === 'CLOSED';
  const balance = Number(folio.balance);

  return (
    <article className="rounded-lg border border-current/10">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">윈도 {folio.window}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              closed
                ? 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
            }`}
          >
            {closed ? '마감' : '진행'}
          </span>
        </div>
        <p className="text-sm">
          <span className="opacity-60">잔액 </span>
          <span
            className={`font-semibold tabular-nums ${
              balance > 0 ? 'text-red-700 dark:text-red-300' : ''
            }`}
          >
            {formatMoney(folio.balance, folio.currency || currency)}
          </span>
        </p>
      </header>

      {folio.postings.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-subtle">등록된 거래가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">윈도 {folio.window} 거래 내역</caption>
            <thead>
              <tr className="border-b border-current/5 text-left">
                <th scope="col" className="px-4 py-2 font-medium">
                  종류
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  코드
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  적요
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  금액
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  일시
                </th>
              </tr>
            </thead>
            <tbody>
              {folio.postings.map((posting) => {
                const value = Number(posting.amount);
                return (
                  <tr key={posting.id} className="border-b border-current/5 last:border-0">
                    <td className="px-4 py-2">{POSTING_LABELS[posting.type] ?? posting.type}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{posting.transactionCode}</td>
                    <td className="py-2 pr-4">{posting.description}</td>
                    <td
                      className={`py-2 pr-4 text-right tabular-nums ${
                        value < 0 ? 'text-emerald-700 dark:text-emerald-300' : ''
                      }`}
                    >
                      {formatMoney(posting.amount, posting.currency || currency)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-subtle">
                      {posting.postedAt.slice(0, 16).replace('T', ' ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {closed ? (
        <p className="border-t border-current/10 px-4 py-3 text-xs text-subtle">
          마감된 폴리오에는 거래를 등록할 수 없습니다.
        </p>
      ) : (
        <PostingForm reservationId={reservationId} window={folio.window} />
      )}
    </article>
  );
}

function PostingForm({ reservationId, window }: { reservationId: string; window: number }) {
  const [state, action] = useActionState<ActionState, FormData>(
    addPostingAction.bind(null, reservationId, window),
    IDLE,
  );
  const uid = useId();

  return (
    <form action={action} className="border-t border-current/10 px-4 py-3">
      <fieldset className="flex flex-wrap items-end gap-2">
        <legend className="sr-only">윈도 {window} 거래 등록</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-type`} className="text-xs text-subtle">
            종류
          </label>
          <select
            id={`${uid}-type`}
            name="type"
            defaultValue="CHARGE"
            className="rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
          >
            {(Object.keys(POSTING_LABELS) as PostingType[]).map((type) => (
              <option key={type} value={type}>
                {POSTING_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-code`} className="text-xs text-subtle">
            코드
          </label>
          <input
            id={`${uid}-code`}
            name="transactionCode"
            defaultValue={DEFAULT_CODES.CHARGE}
            required
            className="w-24 rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-desc`} className="text-xs text-subtle">
            적요
          </label>
          <input
            id={`${uid}-desc`}
            name="description"
            placeholder="객실료"
            required
            className="w-40 rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-amount`} className="text-xs text-subtle">
            금액
          </label>
          <input
            id={`${uid}-amount`}
            name="amount"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="240000"
            required
            className="w-32 rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
          />
        </div>

        <label className="flex items-center gap-1.5 py-1.5 text-xs text-subtle">
          <input type="checkbox" name="negative" className="size-3.5" />
          조정을 차감으로
        </label>

        <SubmitButton pendingLabel="등록 중…">등록</SubmitButton>
      </fieldset>

      <p className="mt-1.5 text-xs text-subtle">
        금액은 항상 양수로 입력합니다. 결제는 자동으로 잔액에서 차감됩니다.
      </p>
      <ActionMessage state={state} />
    </form>
  );
}
