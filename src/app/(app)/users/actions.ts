'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import type { UserRole } from '@/lib/types';

// 이 파일은 async 함수만 export 한다. 타입·상수는 @/lib/action-state 에 있다.

const ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING'];

/** BE 와 같은 최소 길이. 왕복 전에 걸러 준다. */
const MIN_PASSWORD_LENGTH = 8;

function readRole(raw: FormDataEntryValue | null): UserRole | null {
  const value = String(raw ?? '');
  return ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

function readPassword(raw: FormDataEntryValue | null): string | { error: string } {
  const value = String(raw ?? '');
  if (!value) return { error: '비밀번호를 입력해 주세요.' };
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` };
  }
  return value;
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return actionError('이메일을 입력해 주세요.');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return actionError('이름을 입력해 주세요.');

  const role = readRole(formData.get('role'));
  if (!role) return actionError('역할을 선택해 주세요.');

  const password = readPassword(formData.get('password'));
  if (typeof password !== 'string') return actionError(password.error);

  const propertyId = String(formData.get('propertyId') ?? '');

  try {
    await apiFetch('be', '/api/users', {
      method: 'POST',
      json: { email, name, password, role, ...(propertyId ? { propertyId } : {}) },
    });
  } catch (error) {
    return actionError(backendMessage(error, '계정을 만들지 못했습니다.'));
  }

  revalidatePath('/users');
  return actionSuccess(`${name} 계정을 만들었습니다.`);
}

/**
 * 대상 계정은 bind 가 아니라 폼 필드로 받는다.
 *
 * bind 하면 액션 상태가 각 행에 묶이는데, 퇴사 처리에 성공하면 그 행이 목록에서
 * 빠지며 언마운트되어 "퇴사 처리했습니다" 가 그대로 사라진다. 상태를 테이블
 * 하나로 모으려면 대상 id 가 폼에 실려 와야 한다.
 */
function readUserId(formData: FormData): string | null {
  const id = String(formData.get('userId') ?? '').trim();
  return id || null;
}

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = readUserId(formData);
  if (!userId) return actionError('대상 계정을 찾을 수 없습니다.');

  const role = readRole(formData.get('role'));
  if (!role) return actionError('역할을 선택해 주세요.');

  // 빈 문자열은 "소속 없음(본사)" 을 뜻한다. BE 도 같은 규칙으로 읽는다.
  const propertyId = String(formData.get('propertyId') ?? '');

  try {
    await apiFetch('be', `/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      json: { role, propertyId },
    });
  } catch (error) {
    return actionError(backendMessage(error, '계정을 수정하지 못했습니다.'));
  }

  revalidatePath('/users');
  return actionSuccess('계정을 수정했습니다.');
}

export async function setUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = readUserId(formData);
  if (!userId) return actionError('대상 계정을 찾을 수 없습니다.');

  const active = formData.get('active') === '1';
  const name = String(formData.get('name') ?? '해당 계정');

  try {
    await apiFetch('be', `/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      json: { active },
    });
  } catch (error) {
    return actionError(
      backendMessage(error, active ? '복직 처리하지 못했습니다.' : '퇴사 처리하지 못했습니다.'),
    );
  }

  revalidatePath('/users');
  return actionSuccess(`${name} 계정을 ${active ? '복직' : '퇴사'} 처리했습니다.`);
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = readUserId(formData);
  if (!userId) return actionError('대상 계정을 찾을 수 없습니다.');

  const password = readPassword(formData.get('password'));
  if (typeof password !== 'string') return actionError(password.error);

  try {
    await apiFetch('be', `/api/users/${encodeURIComponent(userId)}/password`, {
      method: 'POST',
      json: { password },
    });
  } catch (error) {
    return actionError(backendMessage(error, '비밀번호를 초기화하지 못했습니다.'));
  }

  revalidatePath('/users');
  return actionSuccess('비밀번호를 초기화했습니다. 본인에게 직접 전달해 주세요.');
}

export async function changeOwnPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentPassword = String(formData.get('currentPassword') ?? '');
  if (!currentPassword) return actionError('현재 비밀번호를 입력해 주세요.');

  const newPassword = readPassword(formData.get('newPassword'));
  if (typeof newPassword !== 'string') return actionError(newPassword.error);

  const confirm = String(formData.get('confirmPassword') ?? '');
  if (newPassword !== confirm) return actionError('새 비밀번호가 확인 값과 다릅니다.');

  try {
    await apiFetch('be', '/api/auth/change-password', {
      method: 'POST',
      json: { currentPassword, newPassword },
    });
  } catch (error) {
    return actionError(backendMessage(error, '비밀번호를 바꾸지 못했습니다.'));
  }

  return actionSuccess('비밀번호를 바꿨습니다.');
}
