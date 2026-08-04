import 'server-only';

import { cookies, headers } from 'next/headers';
import { en } from './dictionaries/en';
import { ja } from './dictionaries/ja';
import { ko, type Dictionary } from './dictionaries/ko';
import { zh } from './dictionaries/zh';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, pickLocale, type Locale } from './locales';

const DICTIONARIES: Record<Locale, Dictionary> = { ko, en, zh, ja };

export type { Dictionary };

/**
 * 이 요청의 언어.
 *
 * 쿠키 → Accept-Language → 한국어 순이다. 쿠키를 먼저 보는 이유는 사람이 화면에서
 * 고른 값이 브라우저 설정보다 뒤에 온 결정이기 때문이다.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const headerList = await headers();
  return pickLocale(headerList.get('accept-language'));
}

export async function getDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE] };
}

/** 클라이언트 컴포넌트로 넘길 사전. 서버에서 골라 props 로 내려 준다. */
export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
