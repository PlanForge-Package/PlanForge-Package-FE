/**
 * PlanForge 백엔드 호출 헬퍼.
 *
 * - BE(업무 로직/DB)  : NEXT_PUBLIC_BE_BASE_URL
 * - Core(OPERA 게이트웨이): NEXT_PUBLIC_CORE_BASE_URL
 *
 * 브라우저에서 직접 Core 를 호출하지 않고 BE 를 경유하는 것이 기본 경로다.
 * Core 직접 호출은 서버 컴포넌트/Route Handler 에서만 사용한다.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function baseUrl(target: 'be' | 'core'): string {
  const url =
    target === 'be' ? process.env.NEXT_PUBLIC_BE_BASE_URL : process.env.NEXT_PUBLIC_CORE_BASE_URL;

  if (!url) {
    throw new Error(
      `${target === 'be' ? 'NEXT_PUBLIC_BE_BASE_URL' : 'NEXT_PUBLIC_CORE_BASE_URL'} 환경변수가 설정되지 않았습니다.`,
    );
  }
  return url.replace(/\/$/, '');
}

export async function apiFetch<T>(
  target: 'be' | 'core',
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${baseUrl(target)}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });

  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, body, `${init?.method ?? 'GET'} ${path} → ${res.status}`);
  }

  return body as T;
}
