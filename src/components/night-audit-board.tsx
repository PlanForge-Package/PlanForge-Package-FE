'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { markNoShowAction } from '@/app/(app)/night-audit/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { AuditSection } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { control, ghostButton } from './ui';

/**
 * Close checklist.
 *
 * The board holds the no-show action state. A processed reservation leaves the list,
 * so state tied to the row would take the result message with it.
 */
export function NightAuditBoard({ sections }: { sections: AuditSection[] }) {
  const [state, action] = useActionState<ActionState, FormData>(markNoShowAction, IDLE);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {sections.map((section) => (
        <section key={section.kind} aria-label={section.label} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-sm font-medium">{section.label}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                section.items.length === 0
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              }`}
            >
              {section.items.length}건
            </span>
          </div>

          {section.items.length === 0 ? (
            <p className="text-sm text-subtle">남은 항목이 없습니다.</p>
          ) : (
            <>
              <p className="text-xs text-subtle">{section.hint}</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr className="border-b border-current/10 text-left">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        확인 번호
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        게스트
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        날짜
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        객실
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        금액
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        처리
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, index) => {
                      const key = `${section.kind}-${item.reservationId ?? item.roomNumber}-${index}`;
                      const canNoShow = section.kind === 'ARRIVAL_PENDING' && item.reservationId;

                      return (
                        <tr key={key} className="border-b border-current/5">
                          <td className="py-2.5 pr-4 font-mono text-xs">
                            {item.reservationId ? (
                              <Link
                                href={`/reservations/${item.reservationId}`}
                                className="underline underline-offset-4 hover:no-underline"
                              >
                                {item.confirmationNumber ?? '—'}
                              </Link>
                            ) : (
                              (item.confirmationNumber ?? '—')
                            )}
                          </td>
                          <td className="py-2.5 pr-4">{item.guest ?? '—'}</td>
                          <td className="py-2.5 pr-4 tabular-nums">
                            {item.date?.slice(0, 10) ?? '—'}
                          </td>
                          <td className="py-2.5 pr-4 tabular-nums">
                            {item.roomNumber ?? '미배정'}
                            {item.roomTypeCode && (
                              <span className="ml-1.5 text-xs text-subtle">
                                {item.roomTypeCode}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {item.amount ? Number(item.amount).toLocaleString('ko-KR') : '—'}
                          </td>
                          <td className="py-2.5">
                            {canNoShow ? (
                              confirming === key ? (
                                <form
                                  action={(formData) => {
                                    setConfirming(null);
                                    action(formData);
                                  }}
                                  className="flex flex-wrap items-center gap-1.5"
                                >
                                  <input
                                    type="hidden"
                                    name="reservationId"
                                    value={item.reservationId ?? ''}
                                  />
                                  <input
                                    type="hidden"
                                    name="confirmationNumber"
                                    value={item.confirmationNumber ?? ''}
                                  />
                                  <input
                                    name="reason"
                                    maxLength={200}
                                    placeholder="사유 (선택)"
                                    aria-label={`${item.confirmationNumber} 노쇼 사유`}
                                    className={control('xs', 'w-40')}
                                  />
                                  <SubmitButton pendingLabel="…" className={ghostButton()}>
                                    노쇼 확정
                                  </SubmitButton>
                                  <button
                                    type="button"
                                    onClick={() => setConfirming(null)}
                                    className={ghostButton()}
                                  >
                                    취소
                                  </button>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirming(key)}
                                  className={ghostButton()}
                                >
                                  노쇼 처리
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-subtle">
                                {LINKS[section.kind] ?? '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ))}
    </div>
  );
}

/** Nothing but no-shows is handled from this screen. It only says where to do the rest. */
const LINKS: Partial<Record<AuditSection['kind'], string>> = {
  DEPARTURE_PENDING: '예약 상세에서 체크아웃',
  IN_HOUSE_UNASSIGNED: '예약 상세에서 객실 배정',
  OPEN_BALANCE: '예약 상세의 폴리오에서 결제',
  ROOM_DISCREPANCY: '하우스키핑 화면에서 확인',
};
