import type { Locale } from './locales';
import { LOCALE_TAGS } from './locales';

/**
 * Fills `{name}` placeholders in a dictionary string.
 *
 * Sentences differ in word order between languages, so the parts that move are named
 * rather than concatenated — glued together in code, only Korean would read correctly.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * Money, formatted for the screen language.
 *
 * The currency is the hotel's, but the grouping and symbol placement follow the reader.
 * A hard-coded Korean suffix would leave amounts unreadable in the other languages.
 */
export function money(
  amount: string | number | null | undefined,
  locale: Locale,
  currency = 'KRW',
): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  try {
    return new Intl.NumberFormat(LOCALE_TAGS[locale], {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // An unknown currency code makes Intl throw. Showing the number beats showing nothing.
    return value.toLocaleString(LOCALE_TAGS[locale]);
  }
}

/** Plain number, grouped for the screen language. */
export function num(value: number, locale: Locale): string {
  return value.toLocaleString(LOCALE_TAGS[locale]);
}
