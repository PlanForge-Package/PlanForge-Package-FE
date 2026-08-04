'use client';

import { useActionState } from 'react';
import { transferToArAction } from '@/app/(app)/ar/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { fill, money } from '@/lib/i18n/format';
import { useI18n, useLocale } from '@/lib/i18n/provider';
import type { ArAccount, Folio } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

/**
 * Transfers a folio balance to a direct-bill account.
 *
 * Charges the company agreed to pay are not taken from the guest. The amount leaves
 * the folio, accumulates on the account ledger and is invoiced at month end.
 *
 * The transfer also posts a payment on the OPERA folio to bring it to zero —
 * emptying only the folio loses the receivable, and raising only the ledger leaves
 * the guest unable to check out.
 */
export function ArTransferPanel({
  reservationId,
  folios,
  accounts,
}: {
  reservationId: string;
  folios: Folio[];
  accounts: ArAccount[];
}) {
  const t = useI18n();
  const locale = useLocale();
  const [state, action] = useActionState<ActionState, FormData>(
    transferToArAction.bind(null, reservationId),
    IDLE,
  );

  // Only open windows with a balance can be transferred. Nothing else is offered.
  const transferable = folios.filter(
    (folio) => folio.status === 'OPEN' && Number(folio.balance) > 0,
  );

  return (
    <section aria-label={t.ar.transfer} className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">{t.ar.transferTitle}</h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          {t.ar.transferNoAccounts}
        </p>
      ) : transferable.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          {t.ar.transferNoBalance}
        </p>
      ) : (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.ar.accountTitle}
            <select
              name="accountId"
              defaultValue={state.values?.accountId ?? ''}
              required
              className="w-56 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            >
              <option value="">{t.ar.transferSelect}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} · {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.ar.transferWindow}
            <select
              name="window"
              defaultValue={state.values?.window ?? String(transferable[0]?.window ?? 1)}
              required
              className="rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            >
              {transferable.map((folio) => (
                <option key={folio.id} value={folio.window}>
                  {fill(t.ar.transferWindowOption, {
                    window: folio.window,
                    amount: money(folio.balance, locale),
                  })}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.ar.memo}
            <input
              type="text"
              name="description"
              defaultValue={state.values?.description ?? ''}
              maxLength={200}
              placeholder={t.ar.transferMemoPlaceholder}
              className="w-64 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <SubmitButton pendingLabel={t.ar.transferPending} confirm={t.ar.transferConfirm}>
            {t.ar.transferSubmit}
          </SubmitButton>
        </form>
      )}

      <p className="text-xs text-subtle">{t.ar.transferNote}</p>
    </section>
  );
}
