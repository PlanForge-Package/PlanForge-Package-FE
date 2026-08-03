import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * 세션 쿠키를 지우고 로그인 화면으로 보낸다.
 *
 * 라우트 핸들러로 둔 이유: 쿠키는 서버 액션과 라우트 핸들러에서만 수정할 수 있다.
 * 서버 컴포넌트(레이아웃)에서 지우려 하면 예외가 나면서, 만료·위조된 토큰을 든
 * 요청이 로그인 화면으로 가지 못하고 오류 화면에 갇힌다.
 */
export function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const target = new URL('/login', request.url);
  const reason = searchParams.get('reason');
  const next = searchParams.get('next');

  if (reason) target.searchParams.set('reason', reason);
  // 열린 리다이렉트를 막는다. 내부 경로만 되돌린다.
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    target.searchParams.set('next', next);
  }

  const response = NextResponse.redirect(target);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
