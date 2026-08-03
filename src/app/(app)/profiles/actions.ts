'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';

// 이 파일은 async 함수만 export 한다. 타입·상수는 @/lib/action-state 에 있다.

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
        // 체크박스는 켜진 것만 온다. 하나도 없으면 빈 배열이라 전부 해제된다.
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
 * 중복 병합.
 *
 * 되돌리기 어려운 작업이라 대상을 폼 필드로 명시적으로 받는다. 원본은 지우지
 * 않고 어디로 합쳐졌는지만 남으므로 이력은 추적할 수 있다.
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
