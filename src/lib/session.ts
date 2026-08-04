import 'server-only';

import { cookies } from 'next/headers';

/**
 * Session cookie.
 *
 * The token lives in an httpOnly cookie rather than localStorage — one successful XSS
 * leaks a localStorage token outright, while a script cannot read an httpOnly cookie.
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

/** Called on successful login. Usable only from server actions and route handlers. */
export async function setSessionToken(token: string, expiresAt: string): Promise<void> {
  const store = await cookies();
  const expires = new Date(expiresAt);

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Local development is http, and forcing secure would stop the cookie being stored at all.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: Number.isNaN(expires.getTime()) ? undefined : expires,
  });
}

export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
