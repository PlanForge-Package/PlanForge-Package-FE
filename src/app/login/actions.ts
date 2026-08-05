'use server';

import { redirect } from 'next/navigation';
import { actionError, type ActionState } from '@/lib/action-state';
import { apiFetch, translateError } from '@/lib/api';
import { clearSessionToken, setSessionToken, type SessionUser } from '@/lib/session';
import { getDictionary } from '@/lib/i18n';

interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: SessionUser;
}

/** Guards against an open redirect. External addresses and protocol-relative paths are refused. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? '');
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getDictionary();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email) return actionError('이메일을 입력해 주세요.');
  if (!password) return actionError('비밀번호를 입력해 주세요.');

  let result: LoginResponse;
  try {
    result = await apiFetch<LoginResponse>('be', '/api/auth/login', {
      method: 'POST',
      json: { email, password },
      anonymous: true,
    });
  } catch (error) {
    return actionError(translateError(error, t, '로그인하지 못했습니다.'));
  }

  await setSessionToken(result.accessToken, result.expiresAt);

  // redirect throws to break the flow, so it is called outside the try.
  redirect(safeNext(formData.get('next')));
}

export async function logoutAction(): Promise<void> {
  await clearSessionToken();
  redirect('/login');
}
