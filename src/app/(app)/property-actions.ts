'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { PROPERTY_COOKIE } from '@/lib/property';
import type { Property } from '@/lib/types';
import { cookies } from 'next/headers';

/**
 * 화면이 보고 있는 호텔을 바꾼다.
 *
 * 접근 권한은 BE 가 판단한다. 여기서는 넘어온 값이 실제로 접근 가능한 호텔인지만
 * 확인하고 쿠키에 담는다 — 확인 없이 저장하면 임의의 값이 쿠키에 남아 이후 모든
 * 화면이 403 을 반복한다.
 */
export async function selectPropertyAction(formData: FormData): Promise<void> {
  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) return;

  const options = await apiFetch<Property[]>('be', '/api/properties');
  if (!options.some((property) => property.id === propertyId)) {
    return;
  }

  const store = await cookies();
  store.set(PROPERTY_COOKIE, propertyId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // 근무 중 유지되면 충분하다. 세션보다 길게 남길 이유가 없다.
    maxAge: 60 * 60 * 12,
  });

  revalidatePath('/', 'layout');
}
