import 'server-only';

import { cookies } from 'next/headers';
import { apiFetch, tryFetch } from './api';
import { requireUser } from './auth';
import { getDictionary, type Dictionary } from './i18n';
import type { Locale } from './i18n/locales';
import type { SessionUser } from './session';
import type { Property } from './types';

export const PROPERTY_COOKIE = 'planforge_property';

export interface PropertyContext {
  /** Accessible hotels. An account with a property holds only its own. */
  options: Property[];
  /** The hotel the screen is currently showing. Null when there is nothing to pick. */
  selected: Property | null;
  /** Whether to show the picker. It only means anything with two or more choices. */
  canSwitch: boolean;
  /** Why the list could not be loaded. */
  error: string | null;
}

/**
 * Decides the hotel context for this request.
 *
 * Priority is cookie, then the account's property, then the first hotel. The cookie
 * comes first so a head-office account's choice sticks; a cookie value outside the
 * accessible list is ignored — the property changed or the cookie was tampered with.
 * BE decides in the end anyway, but this keeps the screen from just repeating 403s.
 */
export async function getPropertyContext(user: SessionUser): Promise<PropertyContext> {
  const result = await tryFetch(apiFetch<Property[]>('be', '/api/properties'));

  if (!result.ok) {
    return { options: [], selected: null, canSwitch: false, error: result.message };
  }

  const options = result.data;
  const store = await cookies();
  const cookieValue = store.get(PROPERTY_COOKIE)?.value;

  const selected =
    options.find((p) => p.id === cookieValue) ??
    options.find((p) => p.id === user.propertyId) ??
    options[0] ??
    null;

  return { options, selected, canSwitch: options.length > 1, error: null };
}

/**
 * Everything a property-scoped page needs, in one await.
 *
 * Every such page repeated the same four lines — dictionary, user, property context,
 * selected id — and each one is a place to forget the scope check. Pages keep their
 * own early return because the heading differs, but the resolution is shared.
 */
export async function requirePropertyContext(path: string): Promise<{
  locale: Locale;
  t: Dictionary;
  user: SessionUser;
  property: PropertyContext;
  propertyId: string | undefined;
}> {
  const { locale, t } = await getDictionary();
  const user = await requireUser(path);
  const property = await getPropertyContext(user);
  return { locale, t, user, property, propertyId: property.selected?.id };
}
