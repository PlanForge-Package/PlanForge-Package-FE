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
 * 화면 언어를 클라이언트 컴포넌트에 전달한다.
 *
 * 패널마다 사전을 prop 으로 넘기면 새 패널을 만들 때 빠뜨리기 쉽고, 빠뜨린 곳만
 * 한국어로 남는다. 레이아웃에서 한 번 심어 두고 필요한 곳에서 꺼내 쓴다.
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

/** 날짜·숫자 서식에 쓰는 로케일. 서식은 언어와 함께 바뀌어야 한다. */
export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
