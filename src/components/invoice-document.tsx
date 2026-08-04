'use client';

import type { ArInvoiceDetail } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '발행',
  SENT: '발송',
  PAID: '수금 완료',
  VOID: '무효',
};

function money(value: string, currency: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return currency === 'KRW'
    ? `${amount.toLocaleString('ko-KR')}원`
    : `${amount.toLocaleString('ko-KR')} ${currency}`;
}

function date(value: string | null): string {
  return value ? value.slice(0, 10) : '—';
}

/**
 * 거래처에 보내는 청구서.
 *
 * 화면에서 바로 인쇄하거나 PDF 로 저장한다. 별도 문서 생성기를 두지 않은 이유는
 * 청구 내역이 이미 화면에 있는 것과 같은 값이어야 하기 때문이다 — 두 곳에서
 * 만들면 언젠가 다른 금액을 보낸다.
 *
 * 인쇄에서는 화면용 장식을 감춘다(`print:hidden`).
 */
export function InvoiceDocument({ invoice }: { invoice: ArInvoiceDetail }) {
  const currency = invoice.currency || invoice.property.currency || 'KRW';
  const voided = invoice.status === 'VOID';

  return (
    <article
      aria-label="청구서"
      className="flex flex-col gap-6 rounded-lg border border-current/10 px-6 py-6 print:border-0 print:px-0"
    >
      <div className="flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-subtle">
          {STATUS_LABELS[invoice.status] ?? invoice.status}
          {invoice.overdue && <span className="ml-2 text-red-700 dark:text-red-300">연체</span>}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium"
        >
          인쇄 · PDF 저장
        </button>
      </div>

      {voided && (
        <p
          role="status"
          className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm"
        >
          무효 처리된 청구서입니다. 거래처에 보내지 마세요.
        </p>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-current/10 pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">청구서</h2>
          <p className="mt-1 font-mono text-sm text-subtle">{invoice.number}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{invoice.property.name}</p>
          {invoice.property.address && <p className="text-subtle">{invoice.property.address}</p>}
        </div>
      </header>

      <section aria-label="청구 대상" className="grid gap-4 sm:grid-cols-2">
        <dl className="flex flex-col gap-1 text-sm">
          <dt className="text-xs uppercase tracking-wide text-subtle">거래처</dt>
          <dd className="font-medium">{invoice.account.name}</dd>
          <dd className="font-mono text-xs text-subtle">{invoice.account.code}</dd>
          {invoice.account.billingEmail && (
            <dd className="text-subtle">{invoice.account.billingEmail}</dd>
          )}
        </dl>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-xs uppercase tracking-wide text-subtle">발행일</dt>
          <dd className="text-right tabular-nums">{date(invoice.issuedAt)}</dd>
          <dt className="text-xs uppercase tracking-wide text-subtle">만기일</dt>
          <dd className="text-right tabular-nums">{date(invoice.dueDate)}</dd>
          <dt className="text-xs uppercase tracking-wide text-subtle">보낸 날</dt>
          <dd className="text-right tabular-nums">{date(invoice.sentAt)}</dd>
        </dl>
      </section>

      <section aria-label="청구 내역" className="flex flex-col gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wide text-subtle">청구 내역</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  일자
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  적요
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  확인 번호
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  금액
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.transactions.map((row) => (
                <tr key={row.id} className="border-b border-current/5">
                  <td className="py-2 pr-4 tabular-nums text-subtle">{date(row.postedAt)}</td>
                  <td className="py-2 pr-4">{row.description}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-subtle">
                    {row.reservation?.confirmationNumber ?? '—'}
                  </td>
                  <td className="py-2 text-right tabular-nums">{money(row.amount, currency)}</td>
                </tr>
              ))}
              {invoice.transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-subtle">
                    묶인 거래가 없습니다. 무효 처리하면 거래가 풀립니다.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-current/20">
                <th scope="row" colSpan={3} className="py-2 pr-4 text-right font-medium">
                  청구 합계
                </th>
                <td className="py-2 text-right font-semibold tabular-nums">
                  {money(invoice.total, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section aria-label="수금" className="flex flex-col gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wide text-subtle">수금</h3>
        {invoice.allocations.length === 0 ? (
          <p className="text-sm text-subtle">아직 받은 금액이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    일자
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    적요
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    금액
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.allocations.map((row) => (
                  <tr key={row.id} className="border-b border-current/5">
                    <td className="py-2 pr-4 tabular-nums text-subtle">
                      {date(row.payment.postedAt)}
                    </td>
                    <td className="py-2 pr-4">{row.payment.description}</td>
                    <td className="py-2 text-right tabular-nums">{money(row.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <dl className="mt-2 flex flex-col gap-1 self-end text-sm">
          <div className="flex justify-between gap-8">
            <dt className="text-subtle">받은 금액</dt>
            <dd className="tabular-nums">{money(invoice.paid, currency)}</dd>
          </div>
          <div className="flex justify-between gap-8 border-t border-current/20 pt-1">
            <dt className="font-medium">받을 금액</dt>
            <dd className="font-semibold tabular-nums">{money(invoice.outstanding, currency)}</dd>
          </div>
        </dl>
      </section>

      {invoice.note && (
        <section aria-label="메모" className="border-t border-current/10 pt-4 text-sm">
          <p className="whitespace-pre-line text-subtle">{invoice.note}</p>
        </section>
      )}

      <p className="text-xs text-subtle">
        결제 조건 {invoice.account.termDays}일. 만기일까지 입금 부탁드립니다.
      </p>
    </article>
  );
}
