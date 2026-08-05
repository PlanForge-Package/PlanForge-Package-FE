/**
 * Preference codes.
 *
 * BE defines the codes and the screen supplies the wording, which lives in the
 * dictionary. Stored as free text, "high floor" and "upper floor" mix and nobody can
 * filter at assignment time.
 */
export const PREFERENCE_CODES = [
  'HIGH_FLOOR',
  'LOW_FLOOR',
  'NON_SMOKING',
  'SMOKING',
  'QUIET_ROOM',
  'NEAR_ELEVATOR',
  'AWAY_FROM_ELEVATOR',
  'EXTRA_PILLOW',
  'FIRM_PILLOW',
  'TWIN_BED',
  'KING_BED',
  'LATE_CHECKOUT',
  'EARLY_CHECKIN',
  'ACCESSIBLE',
];

/**
 * A guest's display name.
 *
 * The fallback is passed in rather than fixed here, because "(no name)" has to follow
 * the screen language like every other piece of text.
 */
export function profileName(
  profile: {
    lastName: string | null;
    firstName: string | null;
    companyName?: string | null;
  },
  fallback = '—',
): string {
  const person = [profile.lastName, profile.firstName].filter(Boolean).join(' ');
  return person || profile.companyName || fallback;
}
