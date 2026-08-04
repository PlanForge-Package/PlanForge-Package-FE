'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { PROPERTY_COOKIE } from '@/lib/property';
import type { Property } from '@/lib/types';
import { cookies } from 'next/headers';

/**
 * Changes the hotel the screen is looking at.
 *
 * BE decides access. Here we only check that the value is actually an accessible hotel
 * before storing it in the cookie — stored unchecked, an arbitrary value stays in the
 * cookie and every screen after it repeats a 403.
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
    // Lasting through a shift is enough. There is no reason to outlive the session.
    maxAge: 60 * 60 * 12,
  });

  revalidatePath('/', 'layout');
}
