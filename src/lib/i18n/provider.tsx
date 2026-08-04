'use client';

import { createContext, useContext } from 'react';
import { ko, type Dictionary } from './dictionaries/ko';
import { DEFAULT_LOCALE, type Locale } from './locales';

interface I18nValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, t: ko });

/**
 * Carries the screen language into client components.
 *
 * Passing the dictionary as a prop per panel is easy to forget on a new panel, and
 * only the forgotten one stays Korean. It is set once in the layout and read where needed.
 */
export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, t: dictionary }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Dictionary {
  return useContext(I18nContext).t;
}

/** Locale for date and number formatting. Formatting has to change with the language. */
export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
