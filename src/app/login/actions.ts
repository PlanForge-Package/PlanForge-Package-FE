'use server';

import { redirect } from 'next/navigation';
import { actionError, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import { clearSessionToken, setSessionToken, type SessionUser } from '@/lib/session';

interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: SessionUser;
}

/** 열린 리다이렉트를 막는다. 외부 주소나 프로토콜 상대 경로는 받지 않는다. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? '');
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
    return actionError(backendMessage(error, '로그인하지 못했습니다.'));
  }

  await setSessionToken(result.accessToken, result.expiresAt);

  // redirect 는 예외를 던져 흐름을 끊으므로 try 밖에서 부른다.
  redirect(safeNext(formData.get('next')));
}

export async function logoutAction(): Promise<void> {
  await clearSessionToken();
  redirect('/login');
}
