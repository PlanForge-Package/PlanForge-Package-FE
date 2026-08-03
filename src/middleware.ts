import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * 세션 쿠키가 없으면 로그인 화면으로 보낸다.
 *
 * 여기서는 쿠키 존재만 본다 — 서명 검증은 BE 가 한다. 미들웨어에 비밀키를 두면
 * 엣지 번들에 실려 노출 면이 늘어나고, 검증을 두 곳에서 하면 규칙이 어긋난다.
 * 이 단계는 어디까지나 빠른 안내이고, 실제 차단은 BE 의 가드가 책임진다.
 */
// `/logout` 은 쿠키가 있어야 의미가 있으므로 로그인 상태에서도 통과시킨다.
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
    // 로그인 후 원래 가려던 곳으로 돌려보낸다.
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // 이미 로그인한 사람이 로그인 화면에 오면 대시보드로 돌린다.
  // /logout 은 예외 — 여기서 되돌리면 세션을 지울 방법이 없어진다.
  if (isPublic && hasSession && !ALWAYS_ALLOWED.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // 정적 자산과 Next 내부 경로는 건너뛴다.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
