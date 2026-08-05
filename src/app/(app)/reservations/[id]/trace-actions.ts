'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, translateError } from '@/lib/api';
import type { TraceDepartment } from '@/lib/types';
import { getDictionary } from '@/lib/i18n';

const DEPARTMENTS: TraceDepartment[] = [
  'FRONT_DESK',
  'HOUSEKEEPING',
  'MAINTENANCE',
  'FNB',
  'RESERVATION',
];

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export async function createTraceAction(
  reservationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  // React 19 empties uncontrolled inputs when an action ends. On failure they come back.
  const values = formValues(formData, ['department', 'dueDate', 'note']);

  const department = String(formData.get('department') ?? '');
  if (!DEPARTMENTS.includes(department as TraceDepartment)) {
    return actionError('부서를 선택해 주세요.', values);
  }

  const dueDate = String(formData.get('dueDate') ?? '').trim();
  if (!DATE_ONLY.test(dueDate)) return actionError('날짜를 입력해 주세요.', values);

  const note = String(formData.get('note') ?? '').trim();
  if (!note) return actionError('지시 내용을 입력해 주세요.', values);

  try {
    await apiFetch('be', `/api/reservations/${encodeURIComponent(reservationId)}/traces`, {
      method: 'POST',
      json: { department, dueDate, note },
    });
  } catch (error) {
    return actionError(translateError(error, t, '지시를 걸지 못했습니다.'), values);
  }

  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath('/');
  return actionSuccess(`${dueDate} 지시를 걸었습니다.`);
}

export async function completeTraceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const id = String(formData.get('traceId') ?? '').trim();
  if (!id) return actionError('대상 지시를 찾을 수 없습니다.');

  const note = String(formData.get('note') ?? '지시');

  try {
    await apiFetch('be', `/api/traces/${encodeURIComponent(id)}/complete`, { method: 'PATCH' });
  } catch (error) {
    return actionError(translateError(error, t, '처리하지 못했습니다.'));
  }

  // Used from both the reservation detail and the dashboard, so both are revalidated.
  revalidatePath('/');
  const reservationId = String(formData.get('reservationId') ?? '').trim();
  if (reservationId) revalidatePath(`/reservations/${reservationId}`);

  return actionSuccess(`${note} 처리했습니다.`);
}

export async function removeTraceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const id = String(formData.get('traceId') ?? '').trim();
  if (!id) return actionError('대상 지시를 찾을 수 없습니다.');

  try {
    await apiFetch('be', `/api/traces/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (error) {
    return actionError(translateError(error, t, '지시를 거두지 못했습니다.'));
  }

  revalidatePath('/');
  const reservationId = String(formData.get('reservationId') ?? '').trim();
  if (reservationId) revalidatePath(`/reservations/${reservationId}`);

  return actionSuccess('지시를 거뒀습니다.');
}
