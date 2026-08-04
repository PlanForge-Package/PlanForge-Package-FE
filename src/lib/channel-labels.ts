/**
 * Wording for booking origin codes.
 *
 * OPERA's setup defines the codes and the screen only supplies the wording. The
 * wording lives in the dictionary; this file only decides what to do with unknown codes.
 */

/** An unknown code is shown as it is. Hiding it loses where the booking came from. */
export function label(map: Record<string, string>, code: string | null | undefined): string {
  if (!code) return '—';
  return map[code] ?? code;
}
