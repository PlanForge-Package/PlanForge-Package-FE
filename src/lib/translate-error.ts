import { ApiError, backendMessage } from './api';
import type { Dictionary } from './i18n';
import { fill } from './i18n/format';

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
  if (error instanceof ApiError) {
    const code = error.code;
    if (code) {
      const template = (t.errors as Record<string, string | undefined>)[code];
      if (template) return fill(template, error.params);
    }
  }
  return backendMessage(error, fallback);
}
