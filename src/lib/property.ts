import 'server-only';

import { cookies } from 'next/headers';
import { apiFetch, tryFetch } from './api';
import type { SessionUser } from './session';
import type { Property } from './types';

export const PROPERTY_COOKIE = 'planforge_property';

export interface PropertyContext {
  /** 접근 가능한 호텔. 소속이 지정된 계정에는 자기 호텔 하나만 담긴다. */
  options: Property[];
  /** 현재 화면이 보고 있는 호텔. 고를 것이 없으면 null. */
  selected: Property | null;
  /** 선택기를 보여줄지. 고를 수 있는 호텔이 둘 이상일 때만 의미가 있다. */
  canSwitch: boolean;
  /** 목록을 불러오지 못했을 때의 사유. */
  error: string | null;
}

/**
 * 현재 요청의 호텔 맥락을 정한다.
 *
 * 우선순위는 쿠키 → 계정 소속 → 첫 호텔이다. 쿠키를 먼저 보는 이유는 본사 계정이
 * 화면에서 호텔을 바꿨을 때 그 선택이 유지되어야 하기 때문이고, 쿠키 값이 접근
 * 가능한 목록에 없으면 무시한다 — 소속이 바뀌었거나 쿠키를 손댄 경우다.
 * 최종 판단은 어차피 BE 가 하지만, 화면이 403 만 반복해 보여주는 것은 막는다.
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
