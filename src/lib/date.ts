/**
 * Calendar dates, as `YYYY-MM-DD` strings.
 *
 * BE returns dates as ISO strings and `@db.Date` columns are stored at UTC midnight,
 * so every date on these screens is UTC. Building one from local time shifts it a day
 * in any zone behind UTC, which is why these helpers all go through `toISOString`.
 *
 * Not a date library: the screens only need "today", "today ± n" and "the day part of
 * an ISO string". A dependency would earn its weight at parsing or formatting, and
 * formatting already belongs to `Intl` through the locale.
 */

/** The day part of an ISO string. Null and empty become an em dash. */
export function dateOnly(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '—';
}

/** Today in UTC. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** A date offset from today in UTC. Negative goes back. */
export function dayOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Minute precision, for a posting timestamp. `2026-08-05T14:32`. */
export function dateTime(value: string): string {
  return value.slice(0, 16).replace('T', ' ');
}
