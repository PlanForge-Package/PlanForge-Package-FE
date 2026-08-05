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
import { fill, money } from '@/lib/i18n/format';
import { useI18n, useLocale } from '@/lib/i18n/provider';
import type { ArAccountDetail, ArAccountList, ArInvoiceStatus } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { Figure } from './field';
import { control, ghostButton } from './ui';

const INVOICE_STATUSES: ArInvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'VOID'];

/** Account list and registration. */
export function ArAccountsPanel({
  propertyId,
  data,
  canCreate,
}: {
  propertyId: string;
  data: ArAccountList;
  canCreate: boolean;
}) {
  const t = useI18n();
  const locale = useLocale();
  const [state, action] = useActionState<ActionState, FormData>(createAccountAction, IDLE);

  return (
    <section aria-label={t.ar.accountTitle} className="flex flex-col gap-3">
      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {canCreate && (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="propertyId" value={propertyId} />

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.ar.code}
            <input
              type="text"
              name="code"
              defaultValue={state.values?.code ?? ''}
              required
              maxLength={20}
              placeholder="SPACEPL"
              className={control('md', 'w-32 font-mono')}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.ar.name}
            <input
              type="text"
              name="name"
              defaultValue={state.values?.name ?? ''}
              required
              maxLength={120}
              placeholder={t.ar.namePlaceholder}
              className={control('md', 'w-56')}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.ar.creditLimit}
            <input
              type="number"
              name="creditLimit"
              min={0}
              // Won units. A large step makes any amount that is not a multiple fail
              // browser validation and silently block submission.
              step={1}
              defaultValue={state.values?.creditLimit ?? ''}
              placeholder={t.ar.creditLimitPlaceholder}
              className={control('md', 'w-40')}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.ar.termDaysInput}
            <input
              type="number"
              name="termDays"
              min={0}
              defaultValue={state.values?.termDays ?? '30'}
              className={control('md', 'w-28')}
            />
          </label>

          <SubmitButton pendingLabel={t.ar.creatingAccount}>{t.ar.createAccount}</SubmitButton>
        </form>
      )}

      {data.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-8 text-center text-sm text-subtle">
          {t.ar.emptyAccounts}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">{t.ar.accountListCaption}</caption>
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.ar.code}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.ar.name}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t.ar.balance}
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  {t.ar.creditLimit}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.ar.termDays}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {t.ar.status}
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
                      {money(item.balance, locale)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                      {item.creditLimit === null ? t.ar.noLimit : money(item.creditLimit, locale)}
                    </td>
                    <td className="py-2.5 pr-4 text-subtle">
                      {fill(t.ar.days, { count: item.termDays })}
                    </td>
                    <td className="py-2.5 text-subtle">
                      {item.active ? t.ar.active : t.ar.inactive}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-subtle">{t.ar.accountsNote}</p>
    </section>
  );
}

/** Account detail — payments, invoicing and the ledger. */
export function ArAccountDetailPanel({
  data,
  canManage,
}: {
  data: ArAccountDetail;
  canManage: boolean;
}) {
  const t = useI18n();
  const locale = useLocale();
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
   * Shows the result of whichever action ran last.
   *
   * All three change the same screen, and a fixed priority lets an earlier error hide
   * what was just done — an invoice error still showing after a payment was recorded
   * reads as if the payment failed.
   */
  // Invoices not yet fully paid. These are what a payment can be applied to.
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

      <section aria-label={t.ar.balanceSection} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label={t.ar.balance} value={money(data.balance, locale)} />
        <Figure label={t.ar.unbilled} value={money(data.unbilled, locale)} />
        <Figure
          label={t.ar.creditLimit}
          value={
            data.account.creditLimit === null
              ? t.ar.noLimit
              : money(data.account.creditLimit, locale)
          }
        />
        <Figure label={t.ar.termDays} value={fill(t.ar.days, { count: data.account.termDays })} />
      </section>

      {canManage && (
        <section aria-label={t.ar.actionsSection} className="flex flex-wrap items-end gap-4">
          <form
            action={paymentAction}
            onSubmit={() => setLast('payment')}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="flex flex-col gap-1 text-xs text-subtle">
              {t.ar.paymentAmount}
              <input
                type="number"
                name="amount"
                min={1}
                step={1}
                defaultValue={paymentState.values?.amount ?? ''}
                required
                className={control('md', 'w-40')}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-subtle">
              {t.ar.memo}
              <input
                type="text"
                name="description"
                defaultValue={paymentState.values?.description ?? ''}
                required
                maxLength={200}
                placeholder={t.ar.paymentMemoPlaceholder}
                className={control('md', 'w-56')}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-subtle">
              {t.ar.allocation}
              <select name="apply" defaultValue="auto" className={control('md', 'w-56')}>
                <option value="auto">{t.ar.allocationAuto}</option>
                <option value="none">{t.ar.allocationNone}</option>
                {open.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {fill(t.ar.allocationInvoice, {
                      number: invoice.number,
                      amount: money(invoice.outstanding, locale),
                    })}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton pendingLabel={t.ar.recordingPayment}>{t.ar.recordPayment}</SubmitButton>
          </form>

          <form
            action={invoiceAction}
            onSubmit={() => setLast('invoice')}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="flex flex-col gap-1 text-xs text-subtle">
              {t.ar.invoiceNote}
              <input
                type="text"
                name="note"
                maxLength={500}
                placeholder={t.ar.invoiceNotePlaceholder}
                className={control('md', 'w-56')}
              />
            </label>
            <SubmitButton pendingLabel={t.ar.issuingInvoice}>{t.ar.issueInvoice}</SubmitButton>
          </form>
        </section>
      )}

      <section aria-label={t.ar.invoices} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">{t.ar.invoices}</h2>
        {data.invoices.length === 0 ? (
          <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
            {t.ar.emptyInvoices}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.ar.invoiceNumber}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.ar.amount}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.ar.paid}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.ar.outstanding}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.ar.issuedAt}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.ar.dueDate}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.ar.status}
                  </th>
                  {canManage && (
                    <th scope="col" className="py-2 font-medium">
                      {t.ar.changeStatus}
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
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {money(invoice.total, locale)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-subtle">
                      {money(invoice.paid, locale)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {money(invoice.outstanding, locale)}
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
                      {invoice.overdue && <span className="ml-1.5 text-xs">{t.ar.overdue}</span>}
                    </td>
                    <td className="py-2.5 pr-4">{t.ar.invoiceStatuses[invoice.status]}</td>
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
                              aria-label={fill(t.ar.invoiceStatusAria, { number: invoice.number })}
                              className={control('2xs')}
                            >
                              {INVOICE_STATUSES.map((value) => (
                                <option key={value} value={value}>
                                  {t.ar.invoiceStatuses[value]}
                                </option>
                              ))}
                            </select>
                            <SubmitButton pendingLabel="…" className={ghostButton()}>
                              {t.ar.applyStatus}
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
        <p className="text-xs text-subtle">{t.ar.invoicesNote}</p>
      </section>

      <section aria-label={t.ar.ledger} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
          {t.ar.transactions}
        </h2>
        {data.transactions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
            {t.ar.emptyTransactions}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.ar.postedAt}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.ar.type}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.ar.memo}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.ar.amount}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t.ar.invoiceColumn}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => {
                  const value = Number(tx.amount);
                  const typeLabel =
                    t.ar.transactionTypes[tx.type as keyof typeof t.ar.transactionTypes] ?? tx.type;
                  return (
                    <tr key={tx.id} className="border-b border-current/5">
                      <td className="py-2.5 pr-4 tabular-nums text-subtle">
                        {tx.postedAt.slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="py-2.5 pr-4">{typeLabel}</td>
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
                        {money(tx.amount, locale)}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-subtle">
                        {tx.invoice?.number ?? t.ar.notInvoiced}
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
