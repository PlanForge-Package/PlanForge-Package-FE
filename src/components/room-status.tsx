'use client';

import { useActionState } from 'react';
import { updateRoomStatusAction } from '@/app/(app)/housekeeping/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { Room, RoomStatus } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { useI18n } from '@/lib/i18n/provider';
import { RoomStatusBadge } from './status-badge';
import { control, ghostButton } from './ui';

const STATUSES: RoomStatus[] = ['CLEAN', 'DIRTY', 'INSPECTED', 'OUT_OF_ORDER', 'OUT_OF_SERVICE'];

/** Statuses unavailable while occupied. BE and OPERA refuse them by the same rule. */
const BLOCKING: RoomStatus[] = ['OUT_OF_ORDER', 'OUT_OF_SERVICE'];

/**
 * Room list and status change.
 *
 * The table holds the action state. Changing a status redraws the list, and state on
 * each row would take the result message with it.
 */
export function RoomStatusPanel({ rooms }: { rooms: Room[] }) {
  const t = useI18n();
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
                {t.rooms.number}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.rooms.floor}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.rooms.type}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.common.status}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.rooms.occupied}
              </th>
              <th scope="col" className="py-2 font-medium">
                {t.rooms.changeStatus}
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
                <td className="py-2.5 pr-4">{room.occupied ? t.rooms.inUse : t.rooms.vacant}</td>
                <td className="py-2.5">
                  <form action={action} className="flex items-center gap-1.5">
                    <input type="hidden" name="roomId" value={room.id} />
                    <input type="hidden" name="roomNumber" value={room.number} />
                    <select
                      name="status"
                      defaultValue={room.status}
                      aria-label={`${room.number} ${t.common.status}`}
                      className={control('sm')}
                    >
                      {STATUSES.map((status) => (
                        <option
                          key={status}
                          value={status}
                          // A combination that would be rejected is not offered in the first place.
                          disabled={room.occupied && BLOCKING.includes(status)}
                        >
                          {t.roomStatus[status]}
                        </option>
                      ))}
                    </select>
                    <SubmitButton pendingLabel="…" className={ghostButton()}>
                      {t.rooms.change}
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-subtle">{t.rooms.statusNote}</p>
    </div>
  );
}
