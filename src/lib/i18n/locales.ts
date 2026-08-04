/**
 * Supported languages.
 *
 * Hotel guests and staff both come from many countries. A per-person screen language
 * is what lets a foreign staff member work the desk, or a screen be turned to a guest.
 */
export const LOCALES = ['ko', 'en', 'zh', 'ja'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

/** Names shown in the picker, written in that language — an unreadable name cannot be chosen. */
export const LOCALE_LABELS: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

/** Tag used for date and number formatting. It has to be one Intl knows. */
export const LOCALE_TAGS: Record<Locale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

export const LOCALE_COOKIE = 'planforge_locale';

export function isLocale(value: string | undefined): value is Locale {
  return Boolean(value) && (LOCALES as readonly string[]).includes(value!);
}

/**
 * Picks a usable language out of Accept-Language.
 *
 * Quality values are not weighed; the first known one wins — browsers send them in
 * preference order, which is enough, and failing that it falls back to Korean.
 */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  for (const part of acceptLanguage.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase() ?? '';
    const base = tag.split('-')[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
