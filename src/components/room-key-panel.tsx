'use client';

import { useActionState, useState } from 'react';
import { issueKeyAction, revokeKeyAction } from '@/app/(app)/reservations/[id]/key-actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { RoomKeyListResponse, RoomKeyStatus } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

const STATUS_LABELS: Record<RoomKeyStatus, string> = {
  ACTIVE: '사용 중',
  REVOKED: '무효화',
  EXPIRED: '만료',
};

const STATUS_TONES: Record<RoomKeyStatus, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  REVOKED: 'bg-red-500/15 text-red-700 dark:text-red-300',
  EXPIRED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
};

const smallButton =
  'rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50';

function moment(value: string): string {
  return value.slice(0, 16).replace('T', ' ');
}

/**
 * Room keys.
 *
 * The panel holds both the issue and void action state. A voided card changes status
 * in the table, so state tied to the row would take the result message with it.
 */
export function RoomKeyPanel({ data }: { data: RoomKeyListResponse }) {
  const [issueState, issue] = useActionState<ActionState, FormData>(issueKeyAction, IDLE);
  const [revokeState, revoke] = useActionState<ActionState, FormData>(revokeKeyAction, IDLE);
  const [last, setLast] = useState<'issue' | 'revoke' | null>(null);

  const feedback = last === 'issue' ? issueState : last === 'revoke' ? revokeState : IDLE;
  const active = data.items.filter((key) => key.status === 'ACTIVE');

  return (
    <section aria-label="객실 키" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-sm font-medium">객실 키</h2>
        <span className="text-xs text-subtle">
          사용 중 {active.length}장 · 누적 {data.items.length}장
        </span>
      </div>

      {data.driverMode === 'mock' && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
        >
          <span className="font-medium">잠금장치가 모의 모드입니다.</span>{' '}
          <span className="text-subtle">
            발급 이력만 남고 실제 카드는 만들어지지 않습니다. 이 키로는 어떤 문도 열리지 않습니다.
          </span>
        </p>
      )}

      <div aria-live="polite">
        <ActionMessage state={feedback} />
      </div>

      {data.roomNumber ? (
        <form
          action={(formData) => {
            setLast('issue');
            issue(formData);
          }}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-current/10 px-4 py-3"
        >
          <input type="hidden" name="reservationId" value={data.reservationId} />
          <SubmitButton pendingLabel="발급 중…">카드 발급</SubmitButton>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="keepExisting" />
            기존 카드 유지 (일행 추가)
          </label>
          <span className="text-xs text-subtle">
            기본은 이전 카드를 무효화합니다. 분실 재발급인데 살려 두면 의미가 없습니다.
          </span>
        </form>
      ) : (
        <p className="text-sm text-subtle">
          객실이 배정되지 않았습니다. 체크인하고 객실을 배정하면 카드를 발급할 수 있습니다.
        </p>
      )}

      {data.items.length === 0 ? (
        <p className="text-sm text-subtle">발급된 카드가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  차수
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  카드
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  유효 기간
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  발급
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  상태
                </th>
                <th scope="col" className="py-2 font-medium">
                  처리
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((key) => (
                <tr key={key.id} className="border-b border-current/5">
                  <td className="py-2.5 pr-4 tabular-nums">{key.sequence}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{key.vendorKeyId}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-xs">
                    {moment(key.validFrom)} ~ {moment(key.validUntil)}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-subtle">
                    {moment(key.issuedAt)}
                    {key.issuedByName && <span className="ml-1.5">{key.issuedByName}</span>}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONES[key.status]}`}
                    >
                      {STATUS_LABELS[key.status]}
                    </span>
                    {key.revokedReason && (
                      <span className="ml-1.5 text-xs text-subtle">{key.revokedReason}</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {key.status === 'ACTIVE' ? (
                      <form
                        action={(formData) => {
                          setLast('revoke');
                          revoke(formData);
                        }}
                        className="flex flex-wrap items-center gap-1.5"
                      >
                        <input type="hidden" name="keyId" value={key.id} />
                        <input type="hidden" name="reservationId" value={data.reservationId} />
                        <input
                          name="reason"
                          maxLength={200}
                          placeholder="사유 (분실 등)"
                          aria-label={`${key.sequence}번째 카드 무효화 사유`}
                          className="w-36 rounded-md border border-current/20 bg-transparent px-2 py-1 text-xs"
                        />
                        <SubmitButton
                          pendingLabel="…"
                          confirm={`${key.sequence}번째 카드를 무효화합니다. 이 카드로는 더 이상 문이 열리지 않습니다. 진행할까요?`}
                          className={smallButton}
                        >
                          무효화
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="text-xs text-subtle">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
