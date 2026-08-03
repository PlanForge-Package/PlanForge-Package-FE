'use client';

import { useActionState, useState } from 'react';
import {
  assignTaskAction,
  generateTasksAction,
  updateTaskAction,
} from '@/app/(app)/housekeeping/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { HousekeepingTask, ManagedUser, TaskStatus } from '@/lib/types';

type Attendant = Pick<ManagedUser, 'id' | 'name' | 'role'>;
import { ActionMessage, SubmitButton } from './action-feedback';
import { RoomStatusBadge } from './status-badge';

export const TASK_LABELS: Record<TaskStatus, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행 중',
  DONE: '청소 완료',
  INSPECTED: '점검 완료',
};

const TASK_TONES: Record<TaskStatus, string> = {
  PENDING: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  DONE: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  INSPECTED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
};

const STATUSES = Object.keys(TASK_LABELS) as TaskStatus[];

const selectClass = 'rounded-md border border-current/20 bg-transparent px-2 py-1 text-sm';
const smallButton =
  'rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50';

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TASK_TONES[status]}`}
    >
      {TASK_LABELS[status]}
    </span>
  );
}

export function GenerateTasksForm({ propertyId, date }: { propertyId: string; date: string }) {
  const [state, action] = useActionState<ActionState, FormData>(generateTasksAction, IDLE);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="date" value={date} />
      <SubmitButton pendingLabel="만드는 중…">작업 생성</SubmitButton>
      <span className="text-xs text-subtle">청소 필요·재실 객실을 대상으로 만듭니다.</span>
      <ActionMessage state={state} />
    </form>
  );
}

/**
 * 하우스키핑 보드.
 *
 * 배정과 진행 상태의 액션 상태를 이 컴포넌트가 함께 들고 있다. 상태가 바뀌어
 * 행이 목록에서 빠지면 결과 메시지도 사라지기 때문이다. 표시할 메시지는 고정
 * 우선순위가 아니라 마지막으로 실행한 액션을 따라간다.
 */
export function HousekeepingBoard({
  tasks,
  attendants,
  canAssign,
  myId,
}: {
  tasks: HousekeepingTask[];
  attendants: Attendant[];
  /** 배정은 매니저·프론트데스크만 한다. */
  canAssign: boolean;
  myId: string;
}) {
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
                객실
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                타입
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                객실 상태
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                담당
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                진행
              </th>
              <th scope="col" className="py-2 font-medium">
                처리
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
                    {task.room.occupied && <span className="ml-1.5 text-xs text-subtle">재실</span>}
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
                          aria-label={`${task.room.number} 담당자`}
                          className={selectClass}
                        >
                          <option value="">미배정</option>
                          {attendants.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                        <SubmitButton pendingLabel="…" className={smallButton}>
                          배정
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className={task.assignedTo ? '' : 'text-subtle'}>
                        {task.assignedTo?.name ?? '미배정'}
                        {mine && <span className="ml-1.5 text-xs text-subtle">(나)</span>}
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
                        aria-label={`${task.room.number} 진행 상태`}
                        className={selectClass}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {TASK_LABELS[status]}
                          </option>
                        ))}
                      </select>
                      <SubmitButton pendingLabel="…" className={smallButton}>
                        변경
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
