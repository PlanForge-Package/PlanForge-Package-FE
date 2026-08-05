'use client';

import { useActionState } from 'react';
import {
  removeRoutingAction,
  setRoutingAction,
} from '@/app/(app)/reservations/[id]/routing-actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { Folio, FolioRouting } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { control, ghostButton } from './ui';

/**
 * Routing instructions.
 *
 * The company paying the room and the guest paying extras is a common split. Moving
 * each charge by hand always misses some, so the destination is decided up front.
 *
 * It does not apply to charges the front desk posts to a chosen window — those land
 * where they were sent. It applies to charges that arrive without one, like POS.
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

  // Releasing removes a row from the list and needs more confirmation.
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
              className={control('md', 'w-28 font-mono')}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            보낼 창구
            <select
              name="targetWindow"
              defaultValue={setState.values?.targetWindow ?? ''}
              required
              className={control('md')}
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
              className={control('md', 'w-56')}
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
                      <SubmitButton pendingLabel="…" className={ghostButton()}>
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
