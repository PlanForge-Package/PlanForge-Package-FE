'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, type ActionState } from '@/lib/action-state';
import { apiFetch } from '@/lib/api';
import { getDictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';
import type { RoomStatus, TaskStatus } from '@/lib/types';
import { translateError } from '@/lib/translate-error';

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
  const { t } = await getDictionary();
  const propertyId = readId(formData, 'propertyId');
  if (!propertyId) return actionError(t.housekeeping.msgSelectProperty);

  const date = String(formData.get('date') ?? '').trim();

  let result: { created: number; existing: number };
  try {
    result = await apiFetch('be', '/api/housekeeping/tasks/generate', {
      method: 'POST',
      json: { propertyId, ...(date ? { date } : {}) },
    });
  } catch (error) {
    return actionError(translateError(error, t, t.housekeeping.msgCreateFailed));
  }

  revalidatePath('/housekeeping');
  return actionSuccess(
    result.created === 0
      ? fill(t.housekeeping.msgNothingToCreate, { existing: result.existing })
      : fill(t.housekeeping.msgCreated, { created: result.created }),
  );
}

export async function assignTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const taskId = readId(formData, 'taskId');
  if (!taskId) return actionError(t.housekeeping.msgTaskMissing);

  // An empty value means unassign. BE reads it the same way.
  const assignedToId = String(formData.get('assignedToId') ?? '');
  const roomNumber = String(formData.get('roomNumber') || t.housekeeping.msgFallbackRoom);

  try {
    await apiFetch('be', `/api/housekeeping/tasks/${encodeURIComponent(taskId)}/assign`, {
      method: 'PATCH',
      json: { assignedToId },
    });
  } catch (error) {
    return actionError(translateError(error, t, t.housekeeping.msgAssignFailed));
  }

  revalidatePath('/housekeeping');
  return actionSuccess(
    assignedToId
      ? fill(t.housekeeping.msgAssigned, { room: roomNumber })
      : fill(t.housekeeping.msgUnassigned, { room: roomNumber }),
  );
}

export async function updateTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const taskId = readId(formData, 'taskId');
  if (!taskId) return actionError(t.housekeeping.msgTaskMissing);

  const status = String(formData.get('status') ?? '');
  if (!TASK_STATUSES.includes(status as TaskStatus)) {
    return actionError(t.housekeeping.msgProgressRequired);
  }

  const notes = String(formData.get('notes') ?? '').trim();
  const roomNumber = String(formData.get('roomNumber') || t.housekeeping.msgFallbackRoom);

  try {
    await apiFetch('be', `/api/housekeeping/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      json: { status, ...(notes ? { notes } : {}) },
    });
  } catch (error) {
    return actionError(translateError(error, t, t.housekeeping.msgProgressFailed));
  }

  revalidatePath('/housekeeping');
  revalidatePath('/rooms');
  return actionSuccess(fill(t.housekeeping.msgProgressChanged, { room: roomNumber }));
}

export async function updateRoomStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const roomId = readId(formData, 'roomId');
  if (!roomId) return actionError(t.housekeeping.msgRoomMissing);

  const status = String(formData.get('status') ?? '');
  if (!ROOM_STATUSES.includes(status as RoomStatus)) {
    return actionError(t.housekeeping.msgRoomStatusRequired);
  }

  const reason = String(formData.get('reason') ?? '').trim();
  const roomNumber = String(formData.get('roomNumber') || t.housekeeping.msgFallbackRoom);

  try {
    await apiFetch('be', `/api/housekeeping/rooms/${encodeURIComponent(roomId)}/status`, {
      method: 'PATCH',
      json: { status, ...(reason ? { reason } : {}) },
    });
  } catch (error) {
    return actionError(translateError(error, t, t.housekeeping.msgRoomStatusFailed));
  }

  revalidatePath('/rooms');
  revalidatePath('/housekeeping');
  return actionSuccess(fill(t.housekeeping.msgRoomStatusChanged, { room: roomNumber }));
}
