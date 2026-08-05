'use client';

import { useActionState, useState } from 'react';
import {
  assignTaskAction,
  generateTasksAction,
  updateTaskAction,
} from '@/app/(app)/housekeeping/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { fill } from '@/lib/i18n/format';
import { useI18n } from '@/lib/i18n/provider';
import type { HousekeepingTask, ManagedUser, TaskStatus } from '@/lib/types';

type Attendant = Pick<ManagedUser, 'id' | 'name' | 'role'>;
import { ActionMessage, SubmitButton } from './action-feedback';
import { RoomStatusBadge } from './status-badge';
import { control, ghostButton } from './ui';

const TASK_TONES: Record<TaskStatus, string> = {
  PENDING: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  DONE: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  INSPECTED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
};

const STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE', 'INSPECTED'];

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const t = useI18n();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TASK_TONES[status]}`}
    >
      {t.housekeeping.taskStatuses[status]}
    </span>
  );
}

export function GenerateTasksForm({ propertyId, date }: { propertyId: string; date: string }) {
  const t = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(generateTasksAction, IDLE);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="date" value={date} />
      <SubmitButton pendingLabel={t.housekeeping.creating}>
        {t.housekeeping.createTasks}
      </SubmitButton>
      <span className="text-xs text-subtle">{t.housekeeping.createHint}</span>
      <ActionMessage state={state} />
    </form>
  );
}

/**
 * Housekeeping board.
 *
 * Assignment and progress action state both live in this component, because a status
 * change can drop a row from the list and take the result message with it. The message
 * shown follows whichever action ran last rather than a fixed priority.
 */
export function HousekeepingBoard({
  tasks,
  attendants,
  canAssign,
  myId,
}: {
  tasks: HousekeepingTask[];
  attendants: Attendant[];
  /** Assignment is for managers and the front desk only. */
  canAssign: boolean;
  myId: string;
}) {
  const t = useI18n();
  const [assignState, assign] = useActionState<ActionState, FormData>(assignTaskAction, IDLE);
  const [updateState, update] = useActionState<ActionState, FormData>(updateTaskAction, IDLE);
  const [last, setLast] = useState<'assign' | 'update' | null>(null);

  const feedback = last === 'assign' ? assignState : last === 'update' ? updateState : IDLE;

  return (
    <div className="flex flex-col gap-2">
      <div aria-live="polite">
        <ActionMessage state={feedback} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-current/10 text-left">
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.housekeeping.room}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.housekeeping.roomType}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.housekeeping.roomStatus}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.housekeeping.assignee}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.housekeeping.progress}
              </th>
              <th scope="col" className="py-2 font-medium">
                {t.housekeeping.action}
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const mine = task.assignedToId === myId;

              return (
                <tr key={task.id} className="border-b border-current/5">
                  <td className="py-2.5 pr-4 font-medium tabular-nums">
                    {task.room.number}
                    {task.room.occupied && (
                      <span className="ml-1.5 text-xs text-subtle">{t.housekeeping.occupied}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">{task.room.roomType.code}</td>
                  <td className="py-2.5 pr-4">
                    <RoomStatusBadge status={task.room.status} />
                  </td>

                  <td className="py-2.5 pr-4">
                    {canAssign ? (
                      <form
                        action={(formData) => {
                          setLast('assign');
                          assign(formData);
                        }}
                        className="flex items-center gap-1.5"
                      >
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="roomNumber" value={task.room.number} />
                        <select
                          name="assignedToId"
                          defaultValue={task.assignedToId ?? ''}
                          aria-label={fill(t.housekeeping.assigneeAria, {
                            room: task.room.number,
                          })}
                          className={control('sm')}
                        >
                          <option value="">{t.housekeeping.unassigned}</option>
                          {attendants.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                        <SubmitButton pendingLabel="…" className={ghostButton()}>
                          {t.housekeeping.assign}
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className={task.assignedTo ? '' : 'text-subtle'}>
                        {task.assignedTo?.name ?? t.housekeeping.unassigned}
                        {mine && (
                          <span className="ml-1.5 text-xs text-subtle">{t.housekeeping.self}</span>
                        )}
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 pr-4">
                    <TaskStatusBadge status={task.status} />
                  </td>

                  <td className="py-2.5">
                    <form
                      action={(formData) => {
                        setLast('update');
                        update(formData);
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="roomNumber" value={task.room.number} />
                      <select
                        name="status"
                        defaultValue={task.status}
                        aria-label={fill(t.housekeeping.progressAria, {
                          room: task.room.number,
                        })}
                        className={control('sm')}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {t.housekeeping.taskStatuses[status]}
                          </option>
                        ))}
                      </select>
                      <SubmitButton pendingLabel="…" className={ghostButton()}>
                        {t.housekeeping.change}
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
