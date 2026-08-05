'use client';

import { useActionState, useId } from 'react';
import { addPostingAction, openFolioAction } from '@/app/(app)/reservations/[id]/actions';
import { transferPostingAction } from '@/app/(app)/reservations/[id]/routing-actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { useI18n } from '@/lib/i18n/provider';
import { ActionMessage, SubmitButton } from './action-feedback';
import type { Folio, PostingType } from '@/lib/types';
import { control } from './ui';
import { dateTime } from '@/lib/date';

/** Dictionary keys for transaction kinds. The wording follows the screen language. */
const POSTING_KEYS: Record<PostingType, 'charge' | 'payment' | 'adjustment' | 'tax'> = {
  CHARGE: 'charge',
  PAYMENT: 'payment',
  ADJUSTMENT: 'adjustment',
  TAX: 'tax',
};

/** Defaults for common OPERA transactionCodes. The input can be changed freely. */
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
    // Intl throws on an unknown currency code. At least show the number.
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
  const t = useI18n();
  const [openState, openAction] = useActionState<ActionState, FormData>(
    openFolioAction.bind(null, reservationId),
    IDLE,
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
          {t.frontDesk.folio}
        </h2>
        <form action={openAction}>
          <SubmitButton pendingLabel={t.frontDesk.openingWindow}>
            {t.frontDesk.addWindow}
          </SubmitButton>
        </form>
      </div>
      <ActionMessage state={openState} />

      {folios.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-8 text-center text-sm text-subtle">
          {t.frontDesk.noFolio}
        </p>
      ) : (
        folios.map((folio) => (
          <FolioCard
            key={folio.id}
            reservationId={reservationId}
            folio={folio}
            folios={folios}
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
  folios,
  currency,
}: {
  reservationId: string;
  folio: Folio;
  folios: Folio[];
  currency: string;
}) {
  const t = useI18n();
  const closed = folio.status === 'CLOSED';
  const balance = Number(folio.balance);

  /*
   * Transfer state lives on the card.
   *
   * A transferred transaction leaves this table, so state on the row would take the
   * result message with it and leave no sign of what happened.
   */
  const [transferState, transferAction] = useActionState<ActionState, FormData>(
    transferPostingAction.bind(null, reservationId),
    IDLE,
  );

  // Other windows it can move to. A closed window is not a destination.
  const targets = folios.filter(
    (other) => other.window !== folio.window && other.status === 'OPEN',
  );

  return (
    <article className="rounded-lg border border-current/10">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">
            {t.frontDesk.window} {folio.window}
          </h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              closed
                ? 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
            }`}
          >
            {closed ? t.frontDesk.closed : t.frontDesk.open}
          </span>
        </div>
        <p className="text-sm">
          <span className="opacity-60">{t.frontDesk.balance} </span>
          <span
            className={`font-semibold tabular-nums ${
              balance > 0 ? 'text-red-700 dark:text-red-300' : ''
            }`}
          >
            {formatMoney(folio.balance, folio.currency || currency)}
          </span>
        </p>
      </header>

      <div aria-live="polite" className="px-4 pt-3 empty:hidden">
        <ActionMessage state={transferState} />
      </div>

      {folio.postings.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-subtle">{t.frontDesk.noPostings}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">
              {t.frontDesk.window} {folio.window} — {t.frontDesk.posting}
            </caption>
            <thead>
              <tr className="border-b border-current/5 text-left">
                <th scope="col" className="px-4 py-2 font-medium">
                  {t.frontDesk.kind}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.frontDesk.transactionCode}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.frontDesk.description}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t.common.amount}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.frontDesk.postedAt}
                </th>
                {targets.length > 0 && !closed && (
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.frontDesk.transfer}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {folio.postings.map((posting) => {
                const value = Number(posting.amount);
                return (
                  <tr key={posting.id} className="border-b border-current/5 last:border-0">
                    <td className="px-4 py-2">
                      {t.frontDesk[POSTING_KEYS[posting.type]] ?? posting.type}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">{posting.transactionCode}</td>
                    <td className="py-2 pr-4">
                      <span className={posting.voidedById ? 'line-through text-subtle' : ''}>
                        {posting.description}
                      </span>
                      {/* 전표 번호가 있으면 외부 POS 가 단 것이다. 대사할 때 필요하다. */}
                      {posting.reference && (
                        <span className="ml-1.5 font-mono text-xs text-subtle">
                          {posting.reference}
                        </span>
                      )}
                      {posting.voidedById && (
                        <span className="ml-1.5 text-xs text-subtle">{t.frontDesk.voided}</span>
                      )}
                      {/* 왜 이 창구에 있는지 설명해 준다. 감사에서 반드시 묻는다. */}
                      {posting.transferredFromWindow != null && (
                        <span className="ml-1.5 text-xs text-subtle">
                          {t.frontDesk.transferredFrom.replace(
                            '{window}',
                            String(posting.transferredFromWindow),
                          )}
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2 pr-4 text-right tabular-nums ${
                        value < 0 ? 'text-emerald-700 dark:text-emerald-300' : ''
                      }`}
                    >
                      {formatMoney(posting.amount, posting.currency || currency)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-subtle">
                      {dateTime(posting.postedAt)}
                    </td>
                    {targets.length > 0 && !closed && (
                      <td className="py-2 pr-4">
                        {/*
                          결제·취소가 얽힌 거래는 옮길 수 없다. 눌러도 거절될
                          것을 눌러 보게 두면 원인을 찾느라 시간을 쓴다.
                        */}
                        {posting.voidedById || posting.paymentId ? (
                          <span className="text-xs text-subtle">—</span>
                        ) : (
                          <form action={transferAction} className="flex items-center gap-1">
                            <input type="hidden" name="postingId" value={posting.id} />
                            <input type="hidden" name="description" value={posting.description} />
                            <select
                              name="toWindow"
                              defaultValue={targets[0]?.window}
                              aria-label={`${posting.description} ${t.frontDesk.transferTarget}`}
                              className={control('2xs')}
                            >
                              {targets.map((target) => (
                                <option key={target.id} value={target.window}>
                                  {t.frontDesk.window} {target.window}
                                </option>
                              ))}
                            </select>
                            <SubmitButton
                              pendingLabel="…"
                              className="rounded-md border border-current/20 px-2 py-0.5 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t.frontDesk.transfer}
                            </SubmitButton>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {closed ? (
        <p className="border-t border-current/10 px-4 py-3 text-xs text-subtle">
          {t.frontDesk.closedNote}
        </p>
      ) : (
        <PostingForm reservationId={reservationId} window={folio.window} />
      )}
    </article>
  );
}

function PostingForm({ reservationId, window }: { reservationId: string; window: number }) {
  const t = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(
    addPostingAction.bind(null, reservationId, window),
    IDLE,
  );
  const uid = useId();

  return (
    <form action={action} className="border-t border-current/10 px-4 py-3">
      <fieldset className="flex flex-wrap items-end gap-2">
        <legend className="sr-only">
          {t.frontDesk.window} {window} — {t.frontDesk.register}
        </legend>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-type`} className="text-xs text-subtle">
            {t.frontDesk.kind}
          </label>
          <select id={`${uid}-type`} name="type" defaultValue="CHARGE" className={control('lg')}>
            {(Object.keys(POSTING_KEYS) as PostingType[]).map((type) => (
              <option key={type} value={type}>
                {t.frontDesk[POSTING_KEYS[type]]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-code`} className="text-xs text-subtle">
            {t.frontDesk.transactionCode}
          </label>
          <input
            id={`${uid}-code`}
            name="transactionCode"
            defaultValue={DEFAULT_CODES.CHARGE}
            required
            className={control('lg', 'w-24')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-desc`} className="text-xs text-subtle">
            {t.frontDesk.description}
          </label>
          <input
            id={`${uid}-desc`}
            name="description"
            placeholder={t.frontDesk.descriptionPlaceholder}
            required
            className={control('lg', 'w-40')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-amount`} className="text-xs text-subtle">
            {t.common.amount}
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
            className={control('lg', 'w-32')}
          />
        </div>

        <label className="flex items-center gap-1.5 py-1.5 text-xs text-subtle">
          <input type="checkbox" name="negative" className="size-3.5" />
          {t.frontDesk.negative}
        </label>

        <SubmitButton pendingLabel={t.frontDesk.registering}>{t.frontDesk.register}</SubmitButton>
      </fieldset>

      <p className="mt-1.5 text-xs text-subtle">{t.frontDesk.amountNote}</p>
      <ActionMessage state={state} />
    </form>
  );
}
