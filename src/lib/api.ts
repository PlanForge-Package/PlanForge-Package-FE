/**
 * Helpers for calling the PlanForge backends.
 *
 * - BE (business logic / DB): BE_BASE_URL or NEXT_PUBLIC_BE_BASE_URL
 * - Core (OPERA gateway):     CORE_BASE_URL or NEXT_PUBLIC_CORE_BASE_URL
 *
 * The default path goes through BE rather than calling Core from the browser.
 * Core is called directly only from server components and route handlers.
 */

import 'server-only';

import { getDictionary, type Dictionary } from './i18n';
import { fill } from './i18n/format';
import { getSessionToken } from './session';

/**
 * BE's standard error response.
 *
 * `code` is what a refusal actually is; `message` is BE's English rendering of it, kept
 * for logs, API clients and codes the dictionary has not caught up with. NestJS
 * ValidationPipe answers without a code and gives `message` as an array.
 */
interface BackendErrorBody {
  statusCode?: number;
  error?: string;
  code?: string;
  params?: Record<string, string | number>;
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

  /** No session or it expired. A new login is needed. */
  get unauthorized(): boolean {
    return this.status === 401;
  }

  /** Logged in but not permitted. Logging in again changes nothing. */
  get forbidden(): boolean {
    return this.status === 403;
  }

  /** Whether this is an input or state problem the user can fix. */
  get userFixable(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** The refusal BE named, if it named one. Translated by {@link translateError}. */
  get code(): string | undefined {
    return (this.body as BackendErrorBody | null)?.code;
  }

  /** The values that vary inside the message for {@link code}. */
  get params(): Record<string, string | number> {
    return (this.body as BackendErrorBody | null)?.params ?? {};
  }
}

/**
 * Pulls out the human-readable message BE sent.
 *
 * ValidationPipe gives an array of strings, joined with newlines. When the shape is
 * unknown, a status-based phrase is used instead — a blob of JSON never reaches the screen.
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
  // Server-only variables come first — a container-internal address must not reach the browser.
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
  /** Query string. Undefined values are omitted. */
  query?: Record<string, string | number | boolean | undefined>;
  /** Body to serialise as JSON. */
  json?: unknown;
  /** Response deadline, so a stalled BE never leaves a request hanging forever. */
  timeoutMs?: number;
  /** Skips the session token. Only for pre-auth calls such as login. */
  anonymous?: boolean;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export async function apiFetch<T>(
  target: 'be' | 'core',
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { query, json, timeoutMs = DEFAULT_TIMEOUT_MS, anonymous, ...init } = options;

  const url = new URL(`${baseUrl(target)}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  // The session token is attached once, here. Left to each caller, it eventually gets missed.
  const token = anonymous ? null : await getSessionToken();

  let res: Response;
  try {
    res = await fetch(url, {
      // Operational screens must always be current, so nothing is cached.
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
      ...init,
      ...(json === undefined ? {} : { body: JSON.stringify(json) }),
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (cause) {
    // fetch throws for both network failure and timeout. The two are reported apart.
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
      // Non-JSON responses (a proxy error page, say) are passed along as they are.
      body = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, body, `${init.method ?? 'GET'} ${path} → ${res.status}`);
  }

  return body as T;
}

/**
 * Wraps the result so the screen does not die entirely when the backend is not up yet.
 * An exception in a server component turns the whole route into an error screen.
 */
export type Result<T> = { ok: true; data: T } | { ok: false; message: string; status: number };

export async function tryFetch<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    // Resolved here rather than at the call site: every screen renders this message,
    // and one that forgot to translate would show BE's English in a Korean UI.
    const { t } = await getDictionary();
    return {
      ok: false,
      message: translateError(error, t, t.common.loadFailed),
      status: error instanceof ApiError ? error.status : 0,
    };
  }
}

/**
 * Renders a refusal from BE in the reader's language.
 *
 * BE names what happened with a code and sends the values that vary alongside it. A
 * finished sentence could not be translated — it arrives in whatever language BE was
 * written in, and the screen has no way back to the meaning.
 *
 * Three steps down, each one a real case rather than defensive padding:
 * 1. the dictionary entry for the code — the normal path;
 * 2. BE's own English rendering — a code added before the dictionary caught up;
 * 3. the caller's fallback — a network failure, a 500, anything with no code at all.
 */
export function translateError(error: unknown, t: Dictionary, fallback: string): string {
  if (error instanceof ApiError && error.code) {
    const template = (t.errors as Record<string, string | undefined>)[error.code];
    if (template) return fill(template, error.params);
  }
  return backendMessage(error, fallback);
}
