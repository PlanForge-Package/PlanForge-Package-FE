import type { DuplicateReason, MembershipTier, ProfileType } from './types';

/**
 * Wording for preference codes.
 *
 * BE defines the codes and the screen supplies the wording. Stored as free text,
 * "high floor" and "upper floor" mix and nobody can filter at assignment time.
 */
export const PREFERENCE_LABELS: Record<string, string> = {
  HIGH_FLOOR: '고층',
  LOW_FLOOR: '저층',
  NON_SMOKING: '금연',
  SMOKING: '흡연',
  QUIET_ROOM: '조용한 객실',
  NEAR_ELEVATOR: '엘리베이터 인접',
  AWAY_FROM_ELEVATOR: '엘리베이터 이격',
  EXTRA_PILLOW: '베개 추가',
  FIRM_PILLOW: '단단한 베개',
  TWIN_BED: '트윈 베드',
  KING_BED: '킹 베드',
  LATE_CHECKOUT: '레이트 체크아웃',
  EARLY_CHECKIN: '얼리 체크인',
  ACCESSIBLE: '장애인 편의',
};

export const PREFERENCE_CODES = Object.keys(PREFERENCE_LABELS);

export const TIER_LABELS: Record<MembershipTier, string> = {
  NONE: '일반',
  SILVER: '실버',
  GOLD: '골드',
  PLATINUM: '플래티넘',
};

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  GUEST: '개인',
  COMPANY: '법인',
  TRAVEL_AGENT: '여행사',
  GROUP: '단체',
};

export const DUPLICATE_REASON_LABELS: Record<DuplicateReason, string> = {
  SAME_EMAIL: '이메일 동일',
  SAME_PHONE: '전화 동일',
  SAME_NAME: '이름 동일',
  SAME_MEMBERSHIP: '멤버십 번호 동일',
};

export function profileName(profile: {
  lastName: string | null;
  firstName: string | null;
  companyName?: string | null;
}): string {
  const person = [profile.lastName, profile.firstName].filter(Boolean).join(' ');
  return person || profile.companyName || '(이름 없음)';
}
