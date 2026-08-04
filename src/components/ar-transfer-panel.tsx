'use client';

import { useActionState } from 'react';
import { transferToArAction } from '@/app/(app)/ar/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ArAccount, Folio } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

/**
 * 폴리오 잔액을 후불 거래처로 넘긴다.
 *
 * 회사가 내기로 한 요금은 손님에게 받지 않는다. 그 금액이 폴리오에서 빠져나와
 * 거래처 원장에 쌓이고, 월말에 청구한다.
 *
 * 넘기면 OPERA 폴리오에도 결제가 달려 잔액이 0 이 된다 — 폴리오만 비우고
 * 원장에 올리지 않으면 받을 돈이 사라지고, 원장에만 올리고 폴리오를 두면
 * 손님이 체크아웃하지 못한다.
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
  const [state, action] = useActionState<ActionState, FormData>(
    transferToArAction.bind(null, reservationId),
    IDLE,
  );

  // 잔액이 남은 열린 창구만 넘길 수 있다. 없는 것을 고르게 두지 않는다.
  const transferable = folios.filter(
    (folio) => folio.status === 'OPEN' && Number(folio.balance) > 0,
  );

  return (
    <section aria-label="거래처 이관" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">거래처 이관 (AR)</h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {accounts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          등록된 거래처가 없습니다. AR 화면에서 먼저 등록해 주세요.
        </p>
      ) : transferable.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          넘길 잔액이 남은 창구가 없습니다.
        </p>
      ) : (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-subtle">
            거래처
            <select
              name="accountId"
              defaultValue={state.values?.accountId ?? ''}
              required
              className="w-56 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            >
              <option value="">선택</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} · {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            창구
            <select
              name="window"
              defaultValue={state.values?.window ?? String(transferable[0]?.window ?? 1)}
              required
              className="rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            >
              {transferable.map((folio) => (
                <option key={folio.id} value={folio.window}>
                  윈도 {folio.window} · {Number(folio.balance).toLocaleString('ko-KR')}원
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            적요
            <input
              type="text"
              name="description"
              defaultValue={state.values?.description ?? ''}
              maxLength={200}
              placeholder="비우면 확인 번호로 적습니다"
              className="w-64 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <SubmitButton pendingLabel="넘기는 중…" confirm="이 잔액을 거래처로 넘기시겠습니까?">
            거래처로 넘기기
          </SubmitButton>
        </form>
      )}

      <p className="text-xs text-subtle">
        넘기면 폴리오 잔액이 0 이 되고 그 금액이 거래처 미수로 쌓입니다. 여신 한도를 넘으면
        거절됩니다.
      </p>
    </section>
  );
}
