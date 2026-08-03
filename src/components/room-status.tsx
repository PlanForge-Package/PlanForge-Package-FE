'use client';

import { useActionState } from 'react';
import { updateRoomStatusAction } from '@/app/(app)/housekeeping/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { Room, RoomStatus } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { ROOM_LABELS, RoomStatusBadge } from './status-badge';

const STATUSES = Object.keys(ROOM_LABELS) as RoomStatus[];

/** 재실 중에는 고를 수 없는 상태. BE·OPERA 도 같은 규칙으로 거절한다. */
const BLOCKING: RoomStatus[] = ['OUT_OF_ORDER', 'OUT_OF_SERVICE'];

/**
 * 객실 목록과 상태 변경.
 *
 * 액션 상태를 표가 들고 있다. 상태를 바꾸면 목록이 다시 그려지는데, 각 행이
 * 상태를 들고 있으면 결과 메시지가 함께 사라진다.
 */
export function RoomStatusPanel({ rooms }: { rooms: Room[] }) {
  const [state, action] = useActionState<ActionState, FormData>(updateRoomStatusAction, IDLE);

  return (
    <div className="flex flex-col gap-2">
      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-current/10 text-left">
              <th scope="col" className="py-2 pr-4 font-medium">
                객실
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                층
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                타입
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                상태
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                재실
              </th>
              <th scope="col" className="py-2 font-medium">
                상태 변경
              </th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id} className="border-b border-current/5">
                <td className="py-2.5 pr-4 font-medium tabular-nums">{room.number}</td>
                <td className="py-2.5 pr-4 tabular-nums">{room.floor ?? '—'}</td>
                <td className="py-2.5 pr-4">{room.roomType.code}</td>
                <td className="py-2.5 pr-4">
                  <RoomStatusBadge status={room.status} />
                </td>
                <td className="py-2.5 pr-4">{room.occupied ? '재실' : '공실'}</td>
                <td className="py-2.5">
                  <form action={action} className="flex items-center gap-1.5">
                    <input type="hidden" name="roomId" value={room.id} />
                    <input type="hidden" name="roomNumber" value={room.number} />
                    <select
                      name="status"
                      defaultValue={room.status}
                      aria-label={`${room.number} 상태`}
                      className="rounded-md border border-current/20 bg-transparent px-2 py-1 text-sm"
                    >
                      {STATUSES.map((status) => (
                        <option
                          key={status}
                          value={status}
                          // 눌러도 거절될 조합은 애초에 고를 수 없게 한다.
                          disabled={room.occupied && BLOCKING.includes(status)}
                        >
                          {ROOM_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <SubmitButton
                      pendingLabel="…"
                      className="rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      변경
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-subtle">
        상태 변경은 OPERA 에 반영된 뒤 화면에 돌아옵니다. 재실 중인 객실은 판매 불가로 바꿀 수
        없습니다.
      </p>
    </div>
  );
}
