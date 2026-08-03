/**
 * PlanForge 백엔드 호출 헬퍼.
 *
 * - BE(업무 로직/DB)  : BE_BASE_URL 또는 NEXT_PUBLIC_BE_BASE_URL
 * - Core(OPERA 게이트웨이): CORE_BASE_URL 또는 NEXT_PUBLIC_CORE_BASE_URL
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
  // 서버 전용 변수를 먼저 본다 — 컨테이너 내부 주소를 브라우저에 노출하지 않기 위해.
  const url =
    target === 'be'
      ? (process.env.BE_BASE_URL ?? process.env.NEXT_PUBLIC_BE_BASE_URL)
      : (process.env.CORE_BASE_URL ?? process.env.NEXT_PUBLIC_CORE_BASE_URL);

  if (!url) {
    throw new Error(
      `${target === 'be' ? 'BE_BASE_URL' : 'CORE_BASE_URL'} 환경변수가 설정되지 않았습니다.`,
    );
  }
  return url.replace(/\/$/, '');
}

export interface ApiFetchOptions extends RequestInit {
  /** 쿼리 스트링. undefined 인 값은 생략한다. */
  query?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T>(
  target: 'be' | 'core',
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { query, ...init } = options;

  const url = new URL(`${baseUrl(target)}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, {
    // 운영 화면은 항상 최신 상태여야 하므로 캐시하지 않는다.
    cache: 'no-store',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  });

  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, body, `${init.method ?? 'GET'} ${path} → ${res.status}`);
  }

  return body as T;
}

/**
 * 백엔드가 아직 안 떠 있어도 화면이 통째로 죽지 않도록 결과를 감싼다.
 * 서버 컴포넌트에서 예외를 던지면 라우트 전체가 에러 화면으로 바뀌기 때문이다.
 */
export type Result<T> = { ok: true; data: T } | { ok: false; message: string };

export async function tryFetch<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? `백엔드가 ${error.status} 를 반환했습니다.`
        : error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.';
    return { ok: false, message };
  }
}
