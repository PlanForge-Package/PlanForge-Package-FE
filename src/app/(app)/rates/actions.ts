'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';

/**
 * 객실 타입별 금액을 폼에서 읽는다.
 *
 * 입력은 `amount:STDT` 처럼 코드를 이름에 담아 온다. 비운 칸은 "그 타입은 팔지
 * 않는다" 는 뜻이라 빼고 보낸다 — 0 으로 보내면 공짜로 파는 것이 된다.
 */
function readAmounts(formData: FormData): Record<string, number> | string {
  const amounts: Record<string, number> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('amount:')) continue;
    const code = key.slice('amount:'.length);
    const raw = String(value).trim();
    if (!raw) continue;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return `${code} 금액은 0 이상의 정수여야 합니다.`;
    }
    amounts[code] = parsed;
  }

  if (Object.keys(amounts).length === 0) {
    return '팔 객실 타입의 금액을 하나 이상 넣어 주세요.';
  }
  return amounts;
}

export async function createRatePlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, ['ratePlanCode', 'name', 'sellStartDate', 'sellEndDate']);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) return actionError('호텔을 선택해 주세요.', values);

  const ratePlanCode = String(formData.get('ratePlanCode') ?? '').trim();
  if (!ratePlanCode) return actionError('요금 코드를 입력해 주세요.', values);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return actionError('요금 이름을 입력해 주세요.', values);

  const sellStartDate = String(formData.get('sellStartDate') ?? '');
  const sellEndDate = String(formData.get('sellEndDate') ?? '');
  if (!sellStartDate || !sellEndDate) return actionError('판매 기간을 정해 주세요.', values);
  if (sellEndDate < sellStartDate) {
    return actionError('판매 종료일은 시작일보다 뒤여야 합니다.', values);
  }

  const baseAmounts = readAmounts(formData);
  if (typeof baseAmounts === 'string') return actionError(baseAmounts, values);

  try {
    await apiFetch('be', '/api/rates/plans', {
      method: 'POST',
      json: {
        propertyId,
        ratePlanCode,
        name,
        sellStartDate,
        sellEndDate,
        baseAmounts,
        packageCodes: formData.getAll('packageCodes').map(String),
      },
    });
  } catch (error) {
    return actionError(backendMessage(error, '요금 코드를 만들지 못했습니다.'), values);
  }

  revalidatePath('/rates');
  return actionSuccess(`요금 코드 ${ratePlanCode.toUpperCase()} 를 만들었습니다.`);
}

export async function updateRatePlanAction(
  ratePlanCode: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const propertyId = String(formData.get('propertyId') ?? '').trim();

  const body: Record<string, unknown> = { propertyId };

  const name = String(formData.get('name') ?? '').trim();
  if (name) body.name = name;

  const sellStartDate = String(formData.get('sellStartDate') ?? '');
  const sellEndDate = String(formData.get('sellEndDate') ?? '');
  if (sellStartDate && sellEndDate) {
    if (sellEndDate < sellStartDate) {
      return actionError('판매 종료일은 시작일보다 뒤여야 합니다.');
    }
    body.sellStartDate = sellStartDate;
    body.sellEndDate = sellEndDate;
  }

  // 금액 칸이 하나라도 오면 금액을 통째로 다시 보낸다. 부분 수정은 없다 —
  // 어떤 타입을 더 이상 팔지 않는지도 이 목록으로 정해진다.
  if ([...formData.keys()].some((key) => key.startsWith('amount:'))) {
    const baseAmounts = readAmounts(formData);
    if (typeof baseAmounts === 'string') return actionError(baseAmounts);
    body.baseAmounts = baseAmounts;
  }

  if (formData.has('packagesSubmitted')) {
    body.packageCodes = formData.getAll('packageCodes').map(String);
  }

  const status = String(formData.get('status') ?? '');
  if (status === 'Active' || status === 'Inactive') body.status = status;

  try {
    await apiFetch('be', `/api/rates/plans/${encodeURIComponent(ratePlanCode)}`, {
      method: 'PATCH',
      json: body,
    });
  } catch (error) {
    return actionError(backendMessage(error, '요금 코드를 고치지 못했습니다.'));
  }

  revalidatePath(`/rates/${ratePlanCode}`);
  revalidatePath('/rates');
  return actionSuccess(`${ratePlanCode} 를 저장했습니다.`);
}

export async function addSeasonAction(
  ratePlanCode: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, ['name', 'startDate', 'endDate']);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return actionError('시즌 이름을 입력해 주세요.', values);

  const startDate = String(formData.get('startDate') ?? '');
  const endDate = String(formData.get('endDate') ?? '');
  if (!startDate || !endDate) return actionError('시즌 기간을 정해 주세요.', values);
  if (endDate < startDate) return actionError('종료일은 시작일보다 뒤여야 합니다.', values);

  const amounts = readAmounts(formData);
  if (typeof amounts === 'string') return actionError(amounts, values);

  const daysOfWeek = formData.getAll('daysOfWeek').map(Number);

  try {
    await apiFetch('be', `/api/rates/plans/${encodeURIComponent(ratePlanCode)}/seasons`, {
      method: 'POST',
      json: {
        propertyId,
        name,
        startDate,
        endDate,
        ...(daysOfWeek.length ? { daysOfWeek } : {}),
        amounts,
      },
    });
  } catch (error) {
    return actionError(backendMessage(error, '시즌을 넣지 못했습니다.'), values);
  }

  revalidatePath(`/rates/${ratePlanCode}`);
  return actionSuccess(`시즌 ${name} 을 넣었습니다.`);
}

export async function removeSeasonAction(
  ratePlanCode: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const seasonId = String(formData.get('seasonId') ?? '').trim();
  if (!seasonId) return actionError('지울 시즌을 찾을 수 없습니다.');

  const propertyId = String(formData.get('propertyId') ?? '').trim();

  try {
    await apiFetch(
      'be',
      `/api/rates/plans/${encodeURIComponent(ratePlanCode)}/seasons/${encodeURIComponent(seasonId)}`,
      { method: 'DELETE', json: { propertyId } },
    );
  } catch (error) {
    return actionError(backendMessage(error, '시즌을 지우지 못했습니다.'));
  }

  revalidatePath(`/rates/${ratePlanCode}`);
  return actionSuccess('시즌을 지웠습니다. 그 기간은 기준 요금으로 돌아갑니다.');
}

export async function createPackageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = formValues(formData, [
    'packageCode',
    'name',
    'amount',
    'calculation',
    'transactionCode',
  ]);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) return actionError('호텔을 선택해 주세요.', values);

  const packageCode = String(formData.get('packageCode') ?? '').trim();
  if (!packageCode) return actionError('패키지 코드를 입력해 주세요.', values);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return actionError('패키지 이름을 입력해 주세요.', values);

  const amount = Number(String(formData.get('amount') ?? '').trim());
  if (!Number.isInteger(amount) || amount < 0) {
    return actionError('금액은 0 이상의 정수여야 합니다.', values);
  }

  const calculation = String(formData.get('calculation') ?? '');
  if (!['PerNight', 'PerStay', 'PerPerson'].includes(calculation)) {
    return actionError('계산 방식을 골라 주세요.', values);
  }

  const transactionCode = String(formData.get('transactionCode') ?? '').trim();
  if (!transactionCode) return actionError('거래 코드를 입력해 주세요.', values);

  try {
    await apiFetch('be', '/api/rates/packages', {
      method: 'POST',
      json: {
        propertyId,
        packageCode,
        name,
        amount,
        calculation,
        transactionCode,
        includedInRate: formData.get('includedInRate') === 'on',
      },
    });
  } catch (error) {
    return actionError(backendMessage(error, '패키지를 만들지 못했습니다.'), values);
  }

  revalidatePath('/rates');
  return actionSuccess(`패키지 ${packageCode.toUpperCase()} 를 만들었습니다.`);
}

export async function updatePackageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const packageCode = String(formData.get('packageCode') ?? '').trim();
  if (!packageCode) return actionError('고칠 패키지를 찾을 수 없습니다.');

  const propertyId = String(formData.get('propertyId') ?? '').trim();

  const amount = Number(String(formData.get('amount') ?? '').trim());
  if (!Number.isInteger(amount) || amount < 0) {
    return actionError('금액은 0 이상의 정수여야 합니다.');
  }

  try {
    await apiFetch('be', `/api/rates/packages/${encodeURIComponent(packageCode)}`, {
      method: 'PATCH',
      json: {
        propertyId,
        amount,
        includedInRate: formData.get('includedInRate') === 'on',
      },
    });
  } catch (error) {
    return actionError(backendMessage(error, '패키지를 고치지 못했습니다.'));
  }

  revalidatePath('/rates');
  return actionSuccess(`${packageCode} 를 저장했습니다.`);
}
