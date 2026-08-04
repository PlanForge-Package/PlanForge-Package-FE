'use client';

import { useActionState, useState } from 'react';
import {
  createOutletAction,
  rotateOutletKeyAction,
  setOutletActiveAction,
} from '@/app/(app)/pos-outlets/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { PosOutlet } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

const inputClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';
const smallButton =
  'rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50';

export function CreateOutletForm({ propertyId }: { propertyId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createOutletAction, IDLE);
  const [open, setOpen] = useState(false);

  // On failure the values the action returned are re-seeded. React 19 clears them when it ends.
  const kept = state.status === 'error' ? state.values : undefined;

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium"
          >
            아웃렛 등록
          </button>
        </div>
        <ActionMessage state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="rounded-lg border border-current/10 px-4 py-3">
      <input type="hidden" name="propertyId" value={propertyId} />

      <fieldset className="flex flex-wrap items-end gap-2">
        <legend className="mb-2 text-sm font-medium">새 POS 아웃렛</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor="code" className="text-xs text-subtle">
            아웃렛 코드
          </label>
          <input
            id="code"
            name="code"
            required
            maxLength={20}
            pattern="[A-Za-z0-9_]+"
            placeholder="RESTAURANT"
            defaultValue={kept?.code ?? ''}
            className={`w-40 font-mono uppercase ${inputClass}`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-xs text-subtle">
            이름
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={60}
            placeholder="1층 레스토랑"
            defaultValue={kept?.name ?? ''}
            className={`w-48 ${inputClass}`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="transactionCode" className="text-xs text-subtle">
            거래 코드
          </label>
          <input
            id="transactionCode"
            name="transactionCode"
            required
            maxLength={20}
            pattern="[A-Za-z0-9_]+"
            placeholder="FNB"
            defaultValue={kept?.transactionCode ?? ''}
            className={`w-28 font-mono uppercase ${inputClass}`}
          />
        </div>

        <SubmitButton pendingLabel="등록 중…">등록</SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-current/20 px-3 py-1.5 text-sm transition-colors hover:bg-current/5"
        >
          닫기
        </button>
      </fieldset>

      <p className="mt-1.5 text-xs text-subtle">
        발급된 키는 등록 직후 한 번만 표시됩니다. 저장은 해시로만 하므로 다시 볼 수 없습니다.
      </p>
      <ActionMessage state={state} />
    </form>
  );
}

/**
 * Outlet list.
 *
 * The board holds the reissue and deactivate action state. An issued key is visible
 * only inside that message, so it must survive the row being redrawn.
 */
export function OutletBoard({ outlets }: { outlets: PosOutlet[] }) {
  const [rotateState, rotate] = useActionState<ActionState, FormData>(rotateOutletKeyAction, IDLE);
  const [activeState, setActive] = useActionState<ActionState, FormData>(
    setOutletActiveAction,
    IDLE,
  );
  const [last, setLast] = useState<'rotate' | 'active' | null>(null);

  const feedback = last === 'rotate' ? rotateState : last === 'active' ? activeState : IDLE;

  return (
    <div className="flex flex-col gap-3">
      <div aria-live="polite">
        <ActionMessage state={feedback} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-current/10 text-left">
              <th scope="col" className="py-2 pr-4 font-medium">
                아웃렛
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                거래 코드
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                키
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                마지막 사용
              </th>
              <th scope="col" className="py-2 font-medium">
                처리
              </th>
            </tr>
          </thead>
          <tbody>
            {outlets.map((outlet) => (
              <tr key={outlet.id} className="border-b border-current/5">
                <td className="py-2.5 pr-4">
                  <span className="font-medium">{outlet.name}</span>
                  <span className="ml-1.5 font-mono text-xs text-subtle">{outlet.code}</span>
                  {!outlet.active && (
                    <span className="ml-1.5 rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                      사용 중지
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs">{outlet.transactionCode}</td>
                <td className="py-2.5 pr-4 font-mono text-xs text-subtle">
                  {outlet.apiKeyPrefix}…
                </td>
                <td className="py-2.5 pr-4 text-xs text-subtle">
                  {outlet.lastUsedAt ? outlet.lastUsedAt.slice(0, 16).replace('T', ' ') : '없음'}
                </td>
                <td className="py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <form
                      action={(formData) => {
                        setLast('rotate');
                        rotate(formData);
                      }}
                    >
                      <input type="hidden" name="outletId" value={outlet.id} />
                      <SubmitButton
                        pendingLabel="…"
                        confirm={`${outlet.name} 키를 재발급합니다. 이전 키는 즉시 통하지 않아 단말을 다시 설정해야 합니다. 진행할까요?`}
                        className={smallButton}
                      >
                        키 재발급
                      </SubmitButton>
                    </form>

                    <form
                      action={(formData) => {
                        setLast('active');
                        setActive(formData);
                      }}
                    >
                      <input type="hidden" name="outletId" value={outlet.id} />
                      <input type="hidden" name="name" value={outlet.name} />
                      <input type="hidden" name="active" value={outlet.active ? '0' : '1'} />
                      <SubmitButton
                        pendingLabel="…"
                        confirm={
                          outlet.active
                            ? `${outlet.name} 사용을 중지하면 그 단말의 키가 즉시 막힙니다. 진행할까요?`
                            : undefined
                        }
                        className={smallButton}
                      >
                        {outlet.active ? '사용 중지' : '다시 사용'}
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
