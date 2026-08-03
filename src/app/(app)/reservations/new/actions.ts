'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { actionError, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';

/**
 * 실패했을 때 화면에 되돌려 줄 입력 필드.
 *
 * React 19 는 액션이 끝나면 비제어 입력을 비운다. 게스트 이름을 다 넣고 OPERA
 * 가 거절했을 때 이름까지 사라지면 프런트가 같은 타이핑을 반복한다.
 */
const KEEP = ['lastName', 'firstName', 'email', 'blockCode'];

// 이 파일은 async 함수만 export 한다. 타입·상수는 @/lib/action-state 에 있다.

interface CreatedReservation {
  id: string;
}

/** 폼 값은 전부 문자열로 오므로 서버에서도 한 번 더 검증한다. */
function readDate(raw: FormDataEntryValue | null, label: string): string | { error: string } {
  const value = String(raw ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: `${label}을(를) 올바른 날짜로 입력해 주세요.` };
  }
  return value;
}

function readCount(
  raw: FormDataEntryValue | null,
  label: string,
  min: number,
  max: number,
): number | { error: string } {
  const value = Number(String(raw ?? '').trim());
  if (!Number.isInteger(value) || value < min || value > max) {
    return { error: `${label}은(는) ${min}~${max} 사이의 정수여야 합니다.` };
  }
  return value;
}

export async function createReservationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const kept = formValues(formData, KEEP);
  const fail = (message: string) => actionError(message, kept);

  const arrivalDate = readDate(formData.get('arrivalDate'), '도착일');
  if (typeof arrivalDate !== 'string') return fail(arrivalDate.error);

  const departureDate = readDate(formData.get('departureDate'), '출발일');
  if (typeof departureDate !== 'string') return fail(departureDate.error);

  // OPERA 도 거절하지만 여기서 먼저 막는다 — 명백히 틀린 요청까지 외부 호출을 태울 이유가 없다.
  if (departureDate <= arrivalDate) {
    return fail('출발일은 도착일보다 뒤여야 합니다.');
  }

  const roomTypeCode = String(formData.get('roomTypeCode') ?? '').trim();
  if (!roomTypeCode) return fail('객실 타입을 선택해 주세요.');

  const adults = readCount(formData.get('adults'), '성인', 1, 10);
  if (typeof adults !== 'number') return fail(adults.error);

  const children = readCount(formData.get('children') ?? '0', '아동', 0, 10);
  if (typeof children !== 'number') return fail(children.error);

  const lastName = String(formData.get('lastName') ?? '').trim();
  if (!lastName) return fail('성을 입력해 주세요.');

  const firstName = String(formData.get('firstName') ?? '').trim();
  if (!firstName) return fail('이름을 입력해 주세요.');

  const email = String(formData.get('email') ?? '').trim();
  const ratePlanCode = String(formData.get('ratePlanCode') ?? '').trim();
  const propertyId = String(formData.get('propertyId') ?? '').trim();
  // 블록 코드를 넘기면 OPERA 가 그 단체의 픽업으로 잡는다. 빈 값은 일반 예약이다.
  const blockCode = String(formData.get('blockCode') ?? '').trim();

  let created: CreatedReservation;
  try {
    created = await apiFetch<CreatedReservation>('be', '/api/reservations', {
      method: 'POST',
      json: {
        ...(propertyId ? { propertyId } : {}),
        arrivalDate,
        departureDate,
        roomTypeCode,
        ...(ratePlanCode ? { ratePlanCode } : {}),
        adults,
        children,
        ...(blockCode ? { blockCode } : {}),
        guest: { firstName, lastName, ...(email ? { email } : {}) },
      },
    });
  } catch (error) {
    return fail(backendMessage(error, '예약을 만들지 못했습니다.'));
  }

  revalidatePath('/reservations');

  // redirect 는 예외를 던져 흐름을 끊으므로 try 밖에서 부른다.
  redirect(`/reservations/${created.id}`);
}
