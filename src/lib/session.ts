import 'server-only';

import { cookies } from 'next/headers';

/**
 * 세션 쿠키.
 *
 * 토큰을 localStorage 가 아니라 httpOnly 쿠키에 둔다 — XSS 가 한 번이라도 성공하면
 * localStorage 의 토큰은 그대로 유출되지만, httpOnly 쿠키는 스크립트가 읽지 못한다.
 */
export const SESSION_COOKIE = 'planforge_session';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'FRONT_DESK' | 'HOUSEKEEPING';
  propertyId: string | null;
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** 로그인 성공 시 호출. 서버 액션·라우트 핸들러에서만 쓸 수 있다. */
export async function setSessionToken(token: string, expiresAt: string): Promise<void> {
  const store = await cookies();
  const expires = new Date(expiresAt);

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // 로컬 개발은 http 라 secure 를 강제하면 쿠키가 아예 저장되지 않는다.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: Number.isNaN(expires.getTime()) ? undefined : expires,
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
