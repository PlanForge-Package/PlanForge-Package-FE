/**
 * PlanForge 백엔드 호출 헬퍼.
 *
 * - BE(업무 로직/DB)  : BE_BASE_URL 또는 NEXT_PUBLIC_BE_BASE_URL
 * - Core(OPERA 게이트웨이): CORE_BASE_URL 또는 NEXT_PUBLIC_CORE_BASE_URL
 *
 * 브라우저에서 직접 Core 를 호출하지 않고 BE 를 경유하는 것이 기본 경로다.
 * Core 직접 호출은 서버 컴포넌트/Route Handler 에서만 사용한다.
 */

/** BE 의 표준 오류 응답. NestJS ValidationPipe 는 message 를 배열로 준다. */
interface BackendErrorBody {
  statusCode?: number;
  error?: string;
  message?: string | string[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get notFound(): boolean {
    return this.status === 404;
  }

  /** 사용자가 고칠 수 있는 입력·상태 문제인지. */
  get userFixable(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

/**
 * BE 가 준 사람이 읽을 메시지를 꺼낸다.
 *
 * ValidationPipe 는 문자열 배열을 주므로 줄바꿈으로 합친다. 형태를 알 수 없으면
 * 원문 대신 상태 코드 기반 문구를 쓴다 — JSON 덩어리를 화면에 그대로 노출하지 않기 위해.
 */
export function backendMessage(error: unknown, fallback = '요청을 처리하지 못했습니다.'): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : fallback;
  }

  const body = error.body as BackendErrorBody | null;
  const message = body?.message;

  if (Array.isArray(message) && message.length > 0) return message.join('\n');
  if (typeof message === 'string' && message.trim()) return message;

  if (error.status >= 500) return '백엔드에서 오류가 발생했습니다.';
  if (error.status === 404) return '대상을 찾을 수 없습니다.';
  return fallback;
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

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** 쿼리 스트링. undefined 인 값은 생략한다. */
  query?: Record<string, string | number | boolean | undefined>;
  /** JSON 으로 직렬화할 본문. */
  json?: unknown;
  /** 응답 대기 상한. BE 가 멈춰 있을 때 요청이 영원히 매달리지 않게 한다. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export async function apiFetch<T>(
  target: 'be' | 'core',
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { query, json, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;

  const url = new URL(`${baseUrl(target)}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      // 운영 화면은 항상 최신 상태여야 하므로 캐시하지 않는다.
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
      ...init,
      ...(json === undefined ? {} : { body: JSON.stringify(json) }),
      headers: {
        'content-type': 'application/json',
        ...init.headers,
      },
    });
  } catch (cause) {
    // fetch 는 네트워크 실패와 타임아웃 모두 예외로 던진다. 둘을 구분해 알린다.
    const timedOut = cause instanceof Error && cause.name === 'TimeoutError';
    throw new ApiError(
      0,
      null,
      timedOut
        ? `백엔드 응답이 ${timeoutMs / 1000}초를 넘겨 중단했습니다.`
        : '백엔드에 연결하지 못했습니다.',
    );
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // JSON 이 아닌 응답(프록시 오류 페이지 등)도 그대로 실어 보낸다.
      body = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, body, `${init.method ?? 'GET'} ${path} → ${res.status}`);
  }

  return body as T;
}

/**
 * 백엔드가 아직 안 떠 있어도 화면이 통째로 죽지 않도록 결과를 감싼다.
 * 서버 컴포넌트에서 예외를 던지면 라우트 전체가 에러 화면으로 바뀌기 때문이다.
 */
export type Result<T> = { ok: true; data: T } | { ok: false; message: string; status: number };

export async function tryFetch<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    return {
      ok: false,
      message: backendMessage(error, '데이터를 불러오지 못했습니다.'),
      status: error instanceof ApiError ? error.status : 0,
    };
  }
}
