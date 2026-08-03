import 'server-only';

import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from './api';
import { getSessionToken, type SessionUser } from './session';

/**
 * 현재 로그인한 사용자. 없거나 만료됐으면 로그인 화면으로 보낸다.
 *
 * 매 요청 BE 에 확인하는 이유: 토큰은 발급 후 8시간 유효하지만, 그 사이 계정이
 * 비활성화되거나 역할이 바뀔 수 있다. 토큰만 믿으면 해고된 직원이 남은 시간
 * 동안 계속 접근한다.
 */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const token = await getSessionToken();
  if (!token) redirect(loginUrl(returnTo));

  try {
    return await apiFetch<SessionUser>('be', '/api/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.unauthorized) {
      // 쿠키 삭제는 서버 컴포넌트에서 할 수 없다. /logout 핸들러가 지우고 넘긴다.
      redirect(logoutUrl(returnTo, 'expired'));
    }
    throw error;
  }
}

/** 로그인 여부만 필요한 곳. 리다이렉트하지 않는다. */
export async function getUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    return await apiFetch<SessionUser>('be', '/api/auth/me');
  } catch {
    return null;
  }
}

function withParams(base: string, returnTo?: string, reason?: 'expired'): string {
  const params = new URLSearchParams();
  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    params.set('next', returnTo);
  }
  if (reason) params.set('reason', reason);

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function loginUrl(returnTo?: string, reason?: 'expired'): string {
  return withParams('/login', returnTo, reason);
}

/** 남아 있는 세션 쿠키까지 정리하고 로그인 화면으로 보낼 때 쓴다. */
export function logoutUrl(returnTo?: string, reason?: 'expired'): string {
  return withParams('/logout', returnTo, reason);
}
