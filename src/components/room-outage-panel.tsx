'use client';

import { useActionState } from 'react';
import { createOutageAction, releaseOutageAction } from '@/app/(app)/rooms/outage-actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { useI18n } from '@/lib/i18n/provider';
import type { Room, RoomOutage, RoomOutageKind } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { control, ghostButton, primaryButton } from './ui';
import { today } from '@/lib/date';

const KINDS: RoomOutageKind[] = ['OUT_OF_ORDER', 'OUT_OF_SERVICE'];
const RETURN_STATUSES = ['DIRTY', 'CLEAN', 'INSPECTED'] as const;

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
  const t = useI18n();
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

  return (
    <section aria-label={t.outages.section} className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{t.outages.section}</h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      <form action={createAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="propertyId" value={propertyId} />

        <label className="flex flex-col gap-1 text-xs text-subtle">
          {t.outages.room}
          <select
            name="roomNumber"
            defaultValue={createState.values?.roomNumber ?? ''}
            required
            className={control('md')}
          >
            <option value="">{t.outages.select}</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.number}>
                {room.number} · {room.roomType.code}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-subtle">
          {t.outages.kind}
          <select
            name="kind"
            defaultValue={createState.values?.kind ?? 'OUT_OF_ORDER'}
            className={control('md')}
          >
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t.outages.kinds[kind]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-subtle">
          {t.outages.startDate}
          <input
            type="date"
            name="startDate"
            defaultValue={createState.values?.startDate ?? today()}
            required
            className={control('md')}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-subtle">
          {t.outages.endDate}
          <input
            type="date"
            name="endDate"
            defaultValue={createState.values?.endDate ?? today()}
            required
            className={control('md')}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-subtle">
          {t.outages.reason}
          <input
            type="text"
            name="reason"
            defaultValue={createState.values?.reason ?? ''}
            required
            maxLength={200}
            placeholder={t.outages.reasonPlaceholder}
            className={control('md', 'w-52')}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-subtle">
          {t.outages.returnStatus}
          <select
            name="returnStatus"
            defaultValue={createState.values?.returnStatus ?? 'DIRTY'}
            className={control('md')}
          >
            {RETURN_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t.outages.returnStatuses[value]}
              </option>
            ))}
          </select>
        </label>

        <SubmitButton pendingLabel={t.outages.registering} className={primaryButton()}>
          {t.outages.register}
        </SubmitButton>
      </form>

      {outages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          {t.outages.empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.outages.room}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.outages.kind}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.outages.period}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.outages.reason}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.outages.returnStatus}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {t.outages.release}
                </th>
              </tr>
            </thead>
            <tbody>
              {outages.map((outage) => {
                const active = outage.startDate <= today() && outage.endDate >= today();
                return (
                  <tr key={outage.id} className="border-b border-current/5">
                    <td className="py-2.5 pr-4 font-medium tabular-nums">
                      {outage.room.number}
                      <span className="ml-1.5 text-xs text-subtle">
                        {outage.room.roomType.code}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      {t.outages.kinds[outage.kind]}
                      {active && (
                        <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-xs">
                          {t.outages.inProgress}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {outage.startDate} ~ {outage.endDate}
                    </td>
                    <td className="py-2.5 pr-4">{outage.reason}</td>
                    <td className="py-2.5 pr-4">
                      {t.outages.returnStatuses[
                        outage.returnStatus as keyof typeof t.outages.returnStatuses
                      ] ?? outage.returnStatus}
                    </td>
                    <td className="py-2.5">
                      <form action={releaseAction}>
                        <input type="hidden" name="outageId" value={outage.id} />
                        <input type="hidden" name="roomNumber" value={outage.room.number} />
                        <SubmitButton pendingLabel="…" className={ghostButton()}>
                          {t.outages.release}
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

      <p className="text-xs text-subtle">{t.outages.note}</p>
    </section>
  );
}
