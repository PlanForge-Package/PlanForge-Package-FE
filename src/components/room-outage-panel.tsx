'use client';

import { useActionState } from 'react';
import { createOutageAction, releaseOutageAction } from '@/app/(app)/rooms/outage-actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { Room, RoomOutage, RoomOutageKind } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

const KIND_LABELS: Record<RoomOutageKind, string> = {
  OUT_OF_ORDER: '고장 (재고 제외)',
  OUT_OF_SERVICE: '판매중지 (재고 유지)',
};

const RETURN_LABELS: Record<string, string> = {
  DIRTY: '청소 필요',
  CLEAN: '청소 완료',
  INSPECTED: '점검 완료',
};

/**
 * Room outages.
 *
 * The registration form and the list share one action state. The message shown
 * follows **whichever action ran last** rather than a fixed priority — a registration
 * success still showing after a release hides what just happened.
 */
export function RoomOutagePanel({
  propertyId,
  rooms,
  outages,
}: {
  propertyId: string;
  rooms: Room[];
  outages: RoomOutage[];
}) {
  const [createState, createAction] = useActionState<ActionState, FormData>(
    createOutageAction,
    IDLE,
  );
  const [releaseState, releaseAction] = useActionState<ActionState, FormData>(
    releaseOutageAction,
    IDLE,
  );

  // With neither idle there is no way to tell which finished later, so the release
  // result wins — releasing removes a row from the list and needs more confirmation.
  const state = releaseState.status !== 'idle' ? releaseState : createState;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section aria-label="사용 불가 객실" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">사용 불가 객실</h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      <form action={createAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="propertyId" value={propertyId} />

        <label className="flex flex-col gap-1 text-xs text-subtle">
          객실
          <select
            name="roomNumber"
            defaultValue={createState.values?.roomNumber ?? ''}
            required
            className="rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
          >
            <option value="">선택</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.number}>
                {room.number} · {room.roomType.code}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-subtle">
          구분
          <select
            name="kind"
            defaultValue={createState.values?.kind ?? 'OUT_OF_ORDER'}
            className="rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
          >
            {(Object.keys(KIND_LABELS) as RoomOutageKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-subtle">
          시작일
          <input
            type="date"
            name="startDate"
            defaultValue={createState.values?.startDate ?? today}
            required
            className="rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-subtle">
          종료일
          <input
            type="date"
            name="endDate"
            defaultValue={createState.values?.endDate ?? today}
            required
            className="rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-subtle">
          사유
          <input
            type="text"
            name="reason"
            defaultValue={createState.values?.reason ?? ''}
            required
            maxLength={200}
            placeholder="욕실 배관 교체"
            className="w-52 rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-subtle">
          복귀 상태
          <select
            name="returnStatus"
            defaultValue={createState.values?.returnStatus ?? 'DIRTY'}
            className="rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink"
          >
            {Object.entries(RETURN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <SubmitButton
          pendingLabel="등록 중…"
          className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium"
        >
          사용 불가 등록
        </SubmitButton>
      </form>

      {outages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          사용 불가로 잡아 둔 객실이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  객실
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  구분
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  기간
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  사유
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  복귀 상태
                </th>
                <th scope="col" className="py-2 font-medium">
                  해제
                </th>
              </tr>
            </thead>
            <tbody>
              {outages.map((outage) => {
                const active = outage.startDate <= today && outage.endDate >= today;
                return (
                  <tr key={outage.id} className="border-b border-current/5">
                    <td className="py-2.5 pr-4 font-medium tabular-nums">
                      {outage.room.number}
                      <span className="ml-1.5 text-xs text-subtle">
                        {outage.room.roomType.code}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      {KIND_LABELS[outage.kind]}
                      {active && (
                        <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-xs">
                          진행 중
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {outage.startDate} ~ {outage.endDate}
                    </td>
                    <td className="py-2.5 pr-4">{outage.reason}</td>
                    <td className="py-2.5 pr-4">
                      {RETURN_LABELS[outage.returnStatus] ?? outage.returnStatus}
                    </td>
                    <td className="py-2.5">
                      <form action={releaseAction}>
                        <input type="hidden" name="outageId" value={outage.id} />
                        <input type="hidden" name="roomNumber" value={outage.room.number} />
                        <SubmitButton
                          pendingLabel="…"
                          className="rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          해제
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-subtle">
        고장(OOO)은 재고에서 빠져 점유율의 분모도 줄어듭니다. 판매중지(OOS)는 팔지 않을 뿐 재고에
        남아 분모가 그대로입니다. 해제하면 등록할 때 정해 둔 복귀 상태로 되돌아갑니다 — 청소 여부를
        알 수 없으므로 기본은 청소 필요입니다.
      </p>
    </section>
  );
}
