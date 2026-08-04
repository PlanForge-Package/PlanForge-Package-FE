/**
 * 지원 언어.
 *
 * 호텔은 손님도 직원도 여러 나라 사람이다. 화면 언어를 사람마다 고를 수 있어야
 * 프런트에 외국인 직원을 둘 수 있고, 화면을 손님에게 돌려 보여 줄 수도 있다.
 */
export const LOCALES = ['ko', 'en', 'zh', 'ja'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

/** 언어 선택기에 보이는 이름. 그 언어로 적는다 — 못 읽는 이름은 고를 수 없다. */
export const LOCALE_LABELS: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
};

/** 날짜·숫자 서식에 쓰는 태그. Intl 이 아는 형태여야 한다. */
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
 * Accept-Language 에서 쓸 수 있는 언어를 고른다.
 *
 * 품질값(q)까지 따지지 않고 앞에서부터 아는 것을 찾는다 — 브라우저는 선호 순으로
 * 보내므로 그것으로 충분하고, 못 고르면 한국어로 떨어진다.
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
