'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { actionError, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch } from '@/lib/api';
import { translateError } from '@/lib/translate-error';
import { getDictionary } from '@/lib/i18n';

/**
 * Input fields handed back to the screen on failure.
 *
 * React 19 empties uncontrolled inputs when an action ends. Losing the guest name
 * after OPERA rejects makes the front desk retype the whole thing.
 */
const KEEP = ['lastName', 'firstName', 'email', 'blockCode', 'sourceCode', 'marketCode'];

// This file exports async functions only. Types and constants live in @/lib/action-state.

interface CreatedReservation {
  id: string;
}

/** Form values all arrive as strings, so the server validates them again. */
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
  const { t } = await getDictionary();
  const kept = formValues(formData, KEEP);
  const fail = (message: string) => actionError(message, kept);

  const arrivalDate = readDate(formData.get('arrivalDate'), '도착일');
  if (typeof arrivalDate !== 'string') return fail(arrivalDate.error);

  const departureDate = readDate(formData.get('departureDate'), '출발일');
  if (typeof departureDate !== 'string') return fail(departureDate.error);

  // OPERA rejects it too, but we stop it first — an obviously wrong request is not worth a call.
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
  // A block code makes OPERA count it as that group's pickup. Empty is an ordinary booking.
  const blockCode = String(formData.get('blockCode') ?? '').trim();

  /*
   * Booking origin. OPERA validates the allowed codes — the setup differs per hotel,
   * so a list baked into the screen would need fixing in three places on every change.
   */
  const sourceCode = String(formData.get('sourceCode') ?? '').trim();
  const marketCode = String(formData.get('marketCode') ?? '').trim();
  const channelCode = String(formData.get('channelCode') ?? '').trim();

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
        // Take a waitlist booking even when sold out. It holds no inventory.
        ...(formData.get('waitlist') ? { waitlist: true } : {}),
        ...(sourceCode ? { sourceCode } : {}),
        ...(marketCode ? { marketCode } : {}),
        ...(channelCode ? { channelCode } : {}),
        guest: { firstName, lastName, ...(email ? { email } : {}) },
      },
    });
  } catch (error) {
    return fail(translateError(error, t, '예약을 만들지 못했습니다.'));
  }

  revalidatePath('/reservations');

  // redirect throws to break the flow, so it is called outside the try.
  redirect(`/reservations/${created.id}`);
}
