import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * Clears the session cookie and sends them to the login screen.
 *
 * It is a route handler because cookies can only be changed there or in a server
 * action. Clearing from a server component (the layout) throws, and a request with
 * an expired or forged token is stuck on an error screen instead of reaching login.
 */
export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const target = new URL('/login', request.url);
  const reason = searchParams.get('reason');
  const next = searchParams.get('next');

  if (reason) target.searchParams.set('reason', reason);
  // Guards against an open redirect. Only internal paths are returned to.
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    target.searchParams.set('next', next);
  }

  const response = NextResponse.redirect(target);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
