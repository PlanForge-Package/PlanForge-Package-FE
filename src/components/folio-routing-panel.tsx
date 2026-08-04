'use client';

import { useActionState } from 'react';
import {
  removeRoutingAction,
  setRoutingAction,
} from '@/app/(app)/reservations/[id]/routing-actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { Folio, FolioRouting } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

/**
 * 라우팅 지시.
 *
 * 회사가 객실료를 내고 손님이 부대비용을 내는 편성이 흔하다. 요금이 붙을
 * 때마다 사람이 옮기면 반드시 빠뜨리는 것이 생기므로 목적지를 미리 정해 둔다.
 *
 * 프런트가 창구를 지정해 올리는 거래에는 적용되지 않는다 — 지정한 곳으로
 * 간다. 적용 대상은 외부 POS 룸차지처럼 창구를 모르는 채 들어오는 요금이다.
 */
export function FolioRoutingPanel({
  reservationId,
  folios,
  routings,
}: {
  reservationId: string;
  folios: Folio[];
  routings: FolioRouting[];
}) {
  const [setState, setAction] = useActionState<ActionState, FormData>(
    setRoutingAction.bind(null, reservationId),
    IDLE,
  );
  const [removeState, removeAction] = useActionState<ActionState, FormData>(
    removeRoutingAction.bind(null, reservationId),
    IDLE,
  );

  // 해제는 목록에서 줄이 사라지는 동작이라 확인이 더 필요하다.
  const state = removeState.status !== 'idle' ? removeState : setState;

  const openWindows = folios.filter((folio) => folio.status === 'OPEN');

  return (
    <section aria-label="라우팅 지시" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">라우팅 지시</h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {openWindows.length < 2 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          창구가 하나뿐이면 나눌 곳이 없습니다. 위에서 윈도를 추가한 뒤 지시를 걸어 주세요.
        </p>
      ) : (
        <form action={setAction} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-subtle">
            거래 코드
            <input
              type="text"
              name="transactionCode"
              defaultValue={setState.values?.transactionCode ?? ''}
              required
              maxLength={20}
              placeholder="1000"
              className="w-28 rounded-md border border-current/20 bg-transparent px-2 py-1.5 font-mono text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            보낼 창구
            <select
              name="targetWindow"
              defaultValue={setState.values?.targetWindow ?? ''}
              required
              className="rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            >
              <option value="">선택</option>
              {openWindows.map((folio) => (
                <option key={folio.id} value={folio.window}>
                  윈도 {folio.window}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            메모
            <input
              type="text"
              name="note"
              defaultValue={setState.values?.note ?? ''}
              maxLength={200}
              placeholder="객실료는 회사 부담"
              className="w-56 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <SubmitButton pendingLabel="거는 중…">지시 걸기</SubmitButton>
        </form>
      )}

      {routings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <caption className="sr-only">라우팅 지시 목록</caption>
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  거래 코드
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  보낼 창구
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  메모
                </th>
                <th scope="col" className="py-2 font-medium">
                  해제
                </th>
              </tr>
            </thead>
            <tbody>
              {routings.map((routing) => (
                <tr key={routing.id} className="border-b border-current/5 last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs">{routing.transactionCode}</td>
                  <td className="py-2 pr-4">윈도 {routing.targetWindow}</td>
                  <td className="py-2 pr-4 text-subtle">{routing.note ?? '—'}</td>
                  <td className="py-2">
                    <form action={removeAction}>
                      <input type="hidden" name="transactionCode" value={routing.transactionCode} />
                      <SubmitButton
                        pendingLabel="…"
                        className="rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        해제
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-subtle">
        지시는 외부 POS 처럼 창구를 모르는 채 들어오는 요금에만 적용됩니다. 프런트가 창구를 지정해
        올린 거래는 지정한 곳으로 갑니다.
      </p>
    </section>
  );
}
