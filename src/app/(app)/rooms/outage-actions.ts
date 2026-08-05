'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import { getDictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';
import type { RoomOutageKind, RoomStatus } from '@/lib/types';

const KINDS: RoomOutageKind[] = ['OUT_OF_ORDER', 'OUT_OF_SERVICE'];
const RETURN_STATUSES: RoomStatus[] = ['CLEAN', 'DIRTY', 'INSPECTED'];

/** Fields traced back so the input can be returned on failure. */
const FIELDS = ['roomNumber', 'kind', 'startDate', 'endDate', 'reason', 'returnStatus'];

export async function createOutageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  /*
   * On failure the input comes back as it was.
   *
   * React 19 resets uncontrolled inputs when a form action finishes. Without returning
   * them, a form with dates and a reason filled in is emptied by a one-line error.
   */
  const { t } = await getDictionary();
  const values = formValues(formData, FIELDS);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) return actionError(t.outages.msgSelectProperty, values);

  const roomNumber = String(formData.get('roomNumber') ?? '').trim();
  if (!roomNumber) return actionError(t.outages.msgRoomRequired, values);

  const kind = String(formData.get('kind') ?? '');
  if (!KINDS.includes(kind as RoomOutageKind)) {
    return actionError(t.outages.msgKindRequired, values);
  }

  const startDate = String(formData.get('startDate') ?? '').trim();
  const endDate = String(formData.get('endDate') ?? '').trim();
  if (!startDate || !endDate) return actionError(t.outages.msgPeriodRequired, values);
  if (endDate < startDate) {
    return actionError(t.outages.msgEndBeforeStart, values);
  }

  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) return actionError(t.outages.msgReasonRequired, values);

  const returnStatus = String(formData.get('returnStatus') ?? 'DIRTY');
  if (!RETURN_STATUSES.includes(returnStatus as RoomStatus)) {
    return actionError(t.outages.msgReturnStatusRequired, values);
  }

  try {
    await apiFetch('be', '/api/room-outages', {
      method: 'POST',
      json: { propertyId, roomNumber, kind, startDate, endDate, reason, returnStatus },
    });
  } catch (error) {
    return actionError(backendMessage(error, t.outages.msgRegisterFailed), values);
  }

  revalidatePath('/rooms');
  revalidatePath('/reports');
  return actionSuccess(
    fill(t.outages.msgRegistered, { room: roomNumber, start: startDate, end: endDate }),
  );
}

export async function releaseOutageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const id = String(formData.get('outageId') ?? '').trim();
  if (!id) return actionError(t.outages.msgTargetMissing);

  const roomNumber = String(formData.get('roomNumber') || t.outages.msgFallbackRoom);
  const reason = String(formData.get('reason') ?? '').trim();

  try {
    await apiFetch('be', `/api/room-outages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      json: reason ? { reason } : {},
    });
  } catch (error) {
    return actionError(backendMessage(error, t.outages.msgReleaseFailed));
  }

  revalidatePath('/rooms');
  revalidatePath('/reports');
  return actionSuccess(fill(t.outages.msgReleased, { room: roomNumber }));
}
