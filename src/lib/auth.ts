import 'server-only';

import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from './api';
import { getSessionToken, type SessionUser } from './session';

/**
 * The signed-in user. Missing or expired sends them to the login screen.
 *
 * Checked with BE on every request because a token is valid for eight hours, and in
 * that time an account can be disabled or a role changed. Trusting the token alone
 * lets a dismissed member of staff keep access for the rest of it.
 */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const token = await getSessionToken();
  if (!token) redirect(loginUrl(returnTo));

  try {
    return await apiFetch<SessionUser>('be', '/api/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.unauthorized) {
      // A server component cannot delete cookies. The /logout handler clears them.
      redirect(logoutUrl(returnTo, 'expired'));
    }
    throw error;
  }
}

/** For places that only need to know whether someone is signed in. No redirect. */
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

/** Used to clear a leftover session cookie and send them to the login screen. */
export function logoutUrl(returnTo?: string, reason?: 'expired'): string {
  return withParams('/logout', returnTo, reason);
}
