'use client';

import { useActionState, useState } from 'react';
import { recordDepositAction, setGuaranteeAction } from '@/app/(app)/reservations/[id]/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ReservationPolicies } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

export const GUARANTEE_LABELS: Record<string, string> = {
  SIXPM: '18시까지 (보증 없음)',
  CREDITCARD: '카드 보증',
  DEPOSIT: '보증금',
  COMPANY: '회사 보증',
  COMP: '무료 초대',
};

const METHOD_LABELS: Record<string, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
  VOUCHER: '바우처',
};

const inputClass =
  'rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink';

function money(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return '—';
  return currency === 'KRW'
    ? `${amount.toLocaleString('ko-KR')}원`
    : `${amount.toLocaleString('ko-KR')} ${currency}`;
}

function when(iso: string): string {
  if (!iso) return '—';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * 보증 방식과 취소 조건, 보증금.
 *
 * 취소하기 전에 얼마를 물게 되는지 여기서 먼저 보여 준다. 물리고 나서 통보하면
 * 그건 통보가 아니라 사후 정산이다.
 */
export function PolicyPanel({
  reservationId,
  policies,
  canManage,
}: {
  reservationId: string;
  policies: ReservationPolicies;
  canManage: boolean;
}) {
  const [guaranteeState, guaranteeAction] = useActionState<ActionState, FormData>(
    setGuaranteeAction.bind(null, reservationId),
    IDLE,
  );
  const [depositState, depositAction] = useActionState<ActionState, FormData>(
    recordDepositAction.bind(null, reservationId),
    IDLE,
  );

  const [last, setLast] = useState<'guarantee' | 'deposit' | null>(null);
  const state = last === 'deposit' ? depositState : last === 'guarantee' ? guaranteeState : IDLE;

  const { cancellation, deposit } = policies;
  const currency = policies.currency || 'KRW';
  const remaining = deposit.requiredAmount - deposit.paidAmount;

  return (
    <section aria-label="보증·취소 조건" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">보증·취소 조건</h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure
          label="보증 방식"
          value={GUARANTEE_LABELS[policies.guaranteeCode] ?? policies.guaranteeCode}
        />
        <Figure label="취소 규정" value={cancellation.policyName || '규정 없음'} />
        <Figure label="무료 취소 기한" value={when(cancellation.freeUntil)} />
        <Figure
          label="지금 취소하면"
          value={
            cancellation.penaltyAmount > 0
              ? money(cancellation.penaltyAmount, currency)
              : '위약금 없음'
          }
          alert={cancellation.penaltyAmount > 0}
        />
      </dl>

      {canManage && (
        <form
          action={guaranteeAction}
          onSubmit={() => setLast('guarantee')}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="flex flex-col gap-1 text-xs text-subtle">
            보증 방식
            {/*
              라벨이 select 를 감싸면 접근성 이름에 선택지 텍스트까지 딸려 들어간다.
              읽어 주는 이름과 화면의 이름이 갈리므로 여기서 못 박는다.
            */}
            <select
              name="guaranteeCode"
              aria-label="보증 방식"
              defaultValue={policies.guaranteeCode}
              className={`w-56 ${inputClass}`}
            >
              {Object.entries(GUARANTEE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton pendingLabel="바꾸는 중…">보증 방식 저장</SubmitButton>
        </form>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-current/10 px-4 py-3">
        <p className="text-sm">
          <span className="text-subtle">보증금 </span>
          <span className="font-medium tabular-nums">
            {deposit.requiredAmount > 0
              ? `${money(deposit.paidAmount, currency)} / ${money(deposit.requiredAmount, currency)}`
              : money(deposit.paidAmount, currency)}
          </span>
          {deposit.requiredAmount > 0 && remaining > 0 && (
            <span className="ml-2 text-red-700 dark:text-red-300">
              {money(remaining, currency)} 미납
              {deposit.dueDate && ` · ${deposit.dueDate} 까지`}
            </span>
          )}
        </p>

        {canManage && (
          <form
            action={depositAction}
            onSubmit={() => setLast('deposit')}
            className="flex flex-wrap items-end gap-2"
          >
            {/* 같은 금액을 두 번 눌러도 한 번만 받도록 전표 번호를 흔든다. */}
            <input type="hidden" name="nonce" value={policies.reservationId} />

            <label className="flex flex-col gap-1 text-xs text-subtle">
              받을 금액
              <input
                type="number"
                name="amount"
                min={1}
                step={1}
                defaultValue={
                  depositState.values?.amount ?? (remaining > 0 ? String(remaining) : '')
                }
                required
                className={`w-36 ${inputClass}`}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-subtle">
              받은 방법
              <select
                name="method"
                aria-label="받은 방법"
                defaultValue={depositState.values?.method ?? 'CARD'}
                className={inputClass}
              >
                {Object.entries(METHOD_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-subtle">
              적요
              <input
                type="text"
                name="description"
                defaultValue={depositState.values?.description ?? ''}
                maxLength={200}
                placeholder="비우면 보증금으로 적습니다"
                className={`w-56 ${inputClass}`}
              />
            </label>

            <SubmitButton pendingLabel="받는 중…">보증금 받기</SubmitButton>
          </form>
        )}
      </div>

      <p className="text-xs text-subtle">
        보증금은 폴리오에 결제로 올라갑니다 — 체크인 때 그만큼 이미 낸 것으로 잡힙니다. 취소
        위약금은 무료 기한을 넘긴 뒤에만 붙고, 붙으면 폴리오에 청구로 달립니다.
      </p>
    </section>
  );
}

function Figure({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-current/10 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-subtle">{label}</span>
      <span className={`text-sm font-medium ${alert ? 'text-red-700 dark:text-red-300' : ''}`}>
        {value}
      </span>
    </div>
  );
}
