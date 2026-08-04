'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';

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
  const profileId = text(formData, 'profileId');
  if (!profileId) return actionError('대상 프로필을 찾을 수 없습니다.');

  const kept = formValues(formData, KEEP);
  const fail = (message: string) => actionError(message, kept);

  const nationality = text(formData, 'nationality');
  if (nationality && !/^[A-Za-z]{2}$/.test(nationality)) {
    return fail('국적은 두 자리 국가 코드로 입력해 주세요. (예: KR)');
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
    return fail(backendMessage(error, '프로필을 수정하지 못했습니다.'));
  }

  revalidatePath('/profiles');
  revalidatePath(`/profiles/${profileId}`);
  return actionSuccess('프로필을 수정했습니다.');
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
  const sourceId = text(formData, 'sourceId');
  const targetId = text(formData, 'targetId');
  if (!sourceId || !targetId) return actionError('병합 대상을 찾을 수 없습니다.');

  try {
    await apiFetch('be', `/api/profiles/${encodeURIComponent(sourceId)}/merge`, {
      method: 'POST',
      json: { targetId },
    });
  } catch (error) {
    return actionError(backendMessage(error, '병합하지 못했습니다.'));
  }

  revalidatePath('/profiles');
  revalidatePath(`/profiles/${sourceId}`);
  revalidatePath(`/profiles/${targetId}`);
  return actionSuccess('프로필을 병합했습니다. 예약 이력이 정본으로 옮겨졌습니다.');
}
