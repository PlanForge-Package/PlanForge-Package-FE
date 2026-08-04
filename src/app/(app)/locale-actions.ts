'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n/locales';

/**
 * 화면 언어 변경.
 *
 * 쿠키에만 둔다 — 계정 설정으로 만들면 같은 계정을 함께 쓰는 프런트 데스크에서
 * 한 사람이 바꾼 언어가 다른 사람에게도 적용된다. 브라우저마다 다르게 두는 편이
 * 실제 사용에 맞는다.
 */
export async function setLocaleAction(formData: FormData): Promise<void> {
  const locale = String(formData.get('locale') ?? '');
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath('/', 'layout');
}
