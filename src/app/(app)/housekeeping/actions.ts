'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import type { RoomStatus, TaskStatus } from '@/lib/types';

// This file exports async functions only. Types and constants live in @/lib/action-state.

const TASK_STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE', 'INSPECTED'];
const ROOM_STATUSES: RoomStatus[] = [
  'CLEAN',
  'DIRTY',
  'INSPECTED',
  'OUT_OF_ORDER',
  'OUT_OF_SERVICE',
];

/**
 * The target comes as a form field rather than through bind.
 *
 * Binding ties the action state to each row, and a status change that drops the row
 * from the list takes the result message with it.
 */
function readId(formData: FormData, field: string): string | null {
  const value = String(formData.get(field) ?? '').trim();
  return value || null;
}

export async function generateTasksAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const propertyId = readId(formData, 'propertyId');
  if (!propertyId) return actionError('호텔을 선택해 주세요.');

  const date = String(formData.get('date') ?? '').trim();

  let result: { created: number; existing: number };
  try {
    result = await apiFetch('be', '/api/housekeeping/tasks/generate', {
      method: 'POST',
      json: { propertyId, ...(date ? { date } : {}) },
    });
  } catch (error) {
    return actionError(backendMessage(error, '작업을 만들지 못했습니다.'));
  }

  revalidatePath('/housekeeping');
  return actionSuccess(
    result.created === 0
      ? `새로 만들 작업이 없습니다. 이미 ${result.existing}건이 있습니다.`
      : `작업 ${result.created}건을 만들었습니다.`,
  );
}

export async function assignTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const taskId = readId(formData, 'taskId');
  if (!taskId) return actionError('대상 작업을 찾을 수 없습니다.');

  // An empty value means unassign. BE reads it the same way.
  const assignedToId = String(formData.get('assignedToId') ?? '');
  const roomNumber = String(formData.get('roomNumber') ?? '객실');

  try {
    await apiFetch('be', `/api/housekeeping/tasks/${encodeURIComponent(taskId)}/assign`, {
      method: 'PATCH',
      json: { assignedToId },
    });
  } catch (error) {
    return actionError(backendMessage(error, '배정하지 못했습니다.'));
  }

  revalidatePath('/housekeeping');
  return actionSuccess(
    assignedToId ? `${roomNumber} 배정을 바꿨습니다.` : `${roomNumber} 배정을 해제했습니다.`,
  );
}

export async function updateTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const taskId = readId(formData, 'taskId');
  if (!taskId) return actionError('대상 작업을 찾을 수 없습니다.');

  const status = String(formData.get('status') ?? '');
  if (!TASK_STATUSES.includes(status as TaskStatus)) {
    return actionError('진행 상태를 선택해 주세요.');
  }

  const notes = String(formData.get('notes') ?? '').trim();
  const roomNumber = String(formData.get('roomNumber') ?? '객실');

  try {
    await apiFetch('be', `/api/housekeeping/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      json: { status, ...(notes ? { notes } : {}) },
    });
  } catch (error) {
    return actionError(backendMessage(error, '작업 상태를 바꾸지 못했습니다.'));
  }

  revalidatePath('/housekeeping');
  revalidatePath('/rooms');
  return actionSuccess(`${roomNumber} 작업 상태를 바꿨습니다.`);
}

export async function updateRoomStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const roomId = readId(formData, 'roomId');
  if (!roomId) return actionError('대상 객실을 찾을 수 없습니다.');

  const status = String(formData.get('status') ?? '');
  if (!ROOM_STATUSES.includes(status as RoomStatus)) {
    return actionError('객실 상태를 선택해 주세요.');
  }

  const reason = String(formData.get('reason') ?? '').trim();
  const roomNumber = String(formData.get('roomNumber') ?? '객실');

  try {
    await apiFetch('be', `/api/housekeeping/rooms/${encodeURIComponent(roomId)}/status`, {
      method: 'PATCH',
      json: { status, ...(reason ? { reason } : {}) },
    });
  } catch (error) {
    return actionError(backendMessage(error, '객실 상태를 바꾸지 못했습니다.'));
  }

  revalidatePath('/rooms');
  revalidatePath('/housekeeping');
  return actionSuccess(`${roomNumber} 상태를 바꿨습니다. OPERA 에 반영되었습니다.`);
}
