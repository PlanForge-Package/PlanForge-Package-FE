'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import { getDictionary } from '@/lib/i18n';

// This file exports async functions only. Types and constants live in @/lib/action-state.

const KEEP = [
  'lastName',
  'firstName',
  'companyName',
  'email',
  'phone',
  'nationality',
  'membershipNumber',
  'notes',
];

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const profileId = text(formData, 'profileId');
  if (!profileId) return actionError(t.profiles.msgTargetMissing);

  const kept = formValues(formData, KEEP);
  const fail = (message: string) => actionError(message, kept);

  const nationality = text(formData, 'nationality');
  if (nationality && !/^[A-Za-z]{2}$/.test(nationality)) {
    return fail(t.profiles.msgNationality);
  }

  try {
    await apiFetch('be', `/api/profiles/${encodeURIComponent(profileId)}`, {
      method: 'PATCH',
      json: {
        lastName: text(formData, 'lastName'),
        firstName: text(formData, 'firstName'),
        companyName: text(formData, 'companyName'),
        email: text(formData, 'email'),
        phone: text(formData, 'phone'),
        nationality,
        vip: formData.get('vip') === 'on',
        membershipNumber: text(formData, 'membershipNumber'),
        membershipTier: text(formData, 'membershipTier') || 'NONE',
        // Only checked boxes arrive. None at all is an empty array, clearing them all.
        preferences: formData.getAll('preferences').map(String),
        notes: text(formData, 'notes'),
      },
    });
  } catch (error) {
    return fail(backendMessage(error, t.profiles.msgUpdateFailed));
  }

  revalidatePath('/profiles');
  revalidatePath(`/profiles/${profileId}`);
  return actionSuccess(t.profiles.msgUpdated);
}

/**
 * Duplicate merge.
 *
 * Hard to undo, so the target comes explicitly as a form field. The source is not
 * deleted and records where it was merged into, so the history stays traceable.
 */
export async function mergeProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const sourceId = text(formData, 'sourceId');
  const targetId = text(formData, 'targetId');
  if (!sourceId || !targetId) return actionError(t.profiles.msgMergeTargetMissing);

  try {
    await apiFetch('be', `/api/profiles/${encodeURIComponent(sourceId)}/merge`, {
      method: 'POST',
      json: { targetId },
    });
  } catch (error) {
    return actionError(backendMessage(error, t.profiles.msgMergeFailed));
  }

  revalidatePath('/profiles');
  revalidatePath(`/profiles/${sourceId}`);
  revalidatePath(`/profiles/${targetId}`);
  return actionSuccess(t.profiles.msgMerged);
}
