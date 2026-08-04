'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n/locales';

/**
 * Screen language change.
 *
 * Kept in a cookie only — as an account setting, one person's choice would apply to
 * everyone else sharing that front-desk account. Per browser fits actual use better.
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
