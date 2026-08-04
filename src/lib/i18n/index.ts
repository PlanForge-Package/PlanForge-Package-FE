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
 * The language for this request.
 *
 * Cookie, then Accept-Language, then Korean. The cookie comes first because a choice
 * made on screen is a later decision than the browser setting.
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

/** Dictionary handed to client components. Chosen on the server and passed as props. */
export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
