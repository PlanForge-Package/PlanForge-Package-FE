import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * Sends requests without a session cookie to the login screen.
 *
 * Only the cookie's presence is checked — BE verifies the signature. A secret in the
 * middleware would ship in the edge bundle and widen exposure, and verifying in two
 * places splits the rules. This is a fast redirect; BE's guards do the real blocking.
 */
// `/logout` only means anything with a cookie, so it passes even when signed in.
const PUBLIC_PATHS = ['/login', '/logout'];
const ALWAYS_ALLOWED = ['/logout'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    // Send them back to where they were heading after login.
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Someone already signed in who lands on login goes to the dashboard.
  // /logout is the exception — redirecting it would leave no way to clear the session.
  if (isPublic && hasSession && !ALWAYS_ALLOWED.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Static assets and Next's internal paths are skipped.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
