'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, formValues, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import { getDictionary, type Dictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';

/**
 * Reads the per-room-type amounts from the form.
 *
 * Inputs carry the code in their name, like `amount:STDT`. A blank box means "this
 * type is not sold" and is omitted — sending 0 would sell it free.
 */
function readAmounts(formData: FormData, t: Dictionary): Record<string, number> | string {
  const amounts: Record<string, number> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('amount:')) continue;
    const code = key.slice('amount:'.length);
    const raw = String(value).trim();
    if (!raw) continue;

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return fill(t.rates.msgAmountInvalid, { code });
    }
    amounts[code] = parsed;
  }

  if (Object.keys(amounts).length === 0) {
    return t.rates.msgAmountRequired;
  }
  return amounts;
}

export async function createRatePlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const values = formValues(formData, ['ratePlanCode', 'name', 'sellStartDate', 'sellEndDate']);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) return actionError(t.rates.msgSelectProperty, values);

  const ratePlanCode = String(formData.get('ratePlanCode') ?? '').trim();
  if (!ratePlanCode) return actionError(t.rates.msgCodeRequired, values);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return actionError(t.rates.msgNameRequired, values);

  const sellStartDate = String(formData.get('sellStartDate') ?? '');
  const sellEndDate = String(formData.get('sellEndDate') ?? '');
  if (!sellStartDate || !sellEndDate) return actionError(t.rates.msgPeriodRequired, values);
  if (sellEndDate < sellStartDate) {
    return actionError(t.rates.msgEndBeforeStart, values);
  }

  const baseAmounts = readAmounts(formData, t);
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
    return actionError(backendMessage(error, t.rates.msgCreateFailed), values);
  }

  revalidatePath('/rates');
  return actionSuccess(fill(t.rates.msgCreated, { code: ratePlanCode.toUpperCase() }));
}

export async function updateRatePlanAction(
  ratePlanCode: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const propertyId = String(formData.get('propertyId') ?? '').trim();

  const body: Record<string, unknown> = { propertyId };

  const name = String(formData.get('name') ?? '').trim();
  if (name) body.name = name;

  const sellStartDate = String(formData.get('sellStartDate') ?? '');
  const sellEndDate = String(formData.get('sellEndDate') ?? '');
  if (sellStartDate && sellEndDate) {
    if (sellEndDate < sellStartDate) {
      return actionError(t.rates.msgEndBeforeStart);
    }
    body.sellStartDate = sellStartDate;
    body.sellEndDate = sellEndDate;
  }

  // One amount box arriving resends the whole amount table. There is no partial edit —
  // which types are no longer sold is decided by this list as well.
  if ([...formData.keys()].some((key) => key.startsWith('amount:'))) {
    const baseAmounts = readAmounts(formData, t);
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
    return actionError(backendMessage(error, t.rates.msgUpdateFailed));
  }

  revalidatePath(`/rates/${ratePlanCode}`);
  revalidatePath('/rates');
  return actionSuccess(fill(t.rates.msgUpdated, { code: ratePlanCode }));
}

export async function addSeasonAction(
  ratePlanCode: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const values = formValues(formData, ['name', 'startDate', 'endDate']);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return actionError(t.rates.msgSeasonNameRequired, values);

  const startDate = String(formData.get('startDate') ?? '');
  const endDate = String(formData.get('endDate') ?? '');
  if (!startDate || !endDate) return actionError(t.rates.msgSeasonPeriodRequired, values);
  if (endDate < startDate) return actionError(t.rates.msgSeasonEndBeforeStart, values);

  const amounts = readAmounts(formData, t);
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
    return actionError(backendMessage(error, t.rates.msgSeasonFailed), values);
  }

  revalidatePath(`/rates/${ratePlanCode}`);
  return actionSuccess(fill(t.rates.msgSeasonAdded, { name }));
}

export async function removeSeasonAction(
  ratePlanCode: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const seasonId = String(formData.get('seasonId') ?? '').trim();
  if (!seasonId) return actionError(t.rates.msgSeasonMissing);

  const propertyId = String(formData.get('propertyId') ?? '').trim();

  try {
    await apiFetch(
      'be',
      `/api/rates/plans/${encodeURIComponent(ratePlanCode)}/seasons/${encodeURIComponent(seasonId)}`,
      { method: 'DELETE', json: { propertyId } },
    );
  } catch (error) {
    return actionError(backendMessage(error, t.rates.msgSeasonDeleteFailed));
  }

  revalidatePath(`/rates/${ratePlanCode}`);
  return actionSuccess(t.rates.msgSeasonDeleted);
}

export async function createPackageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const values = formValues(formData, [
    'packageCode',
    'name',
    'amount',
    'calculation',
    'transactionCode',
  ]);

  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) return actionError(t.rates.msgSelectProperty, values);

  const packageCode = String(formData.get('packageCode') ?? '').trim();
  if (!packageCode) return actionError(t.rates.msgPackageCodeRequired, values);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return actionError(t.rates.msgPackageNameRequired, values);

  const amount = Number(String(formData.get('amount') ?? '').trim());
  if (!Number.isInteger(amount) || amount < 0) {
    return actionError(t.rates.msgPackageAmountInvalid, values);
  }

  const calculation = String(formData.get('calculation') ?? '');
  if (!['PerNight', 'PerStay', 'PerPerson'].includes(calculation)) {
    return actionError(t.rates.msgCalculationRequired, values);
  }

  const transactionCode = String(formData.get('transactionCode') ?? '').trim();
  if (!transactionCode) return actionError(t.rates.msgTransactionCodeRequired, values);

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
    return actionError(backendMessage(error, t.rates.msgPackageCreateFailed), values);
  }

  revalidatePath('/rates');
  return actionSuccess(fill(t.rates.msgPackageCreated, { code: packageCode.toUpperCase() }));
}

export async function updatePackageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();
  const packageCode = String(formData.get('packageCode') ?? '').trim();
  if (!packageCode) return actionError(t.rates.msgPackageMissing);

  const propertyId = String(formData.get('propertyId') ?? '').trim();

  const amount = Number(String(formData.get('amount') ?? '').trim());
  if (!Number.isInteger(amount) || amount < 0) {
    return actionError(t.rates.msgPackageAmountInvalid);
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
    return actionError(backendMessage(error, t.rates.msgPackageUpdateFailed));
  }

  revalidatePath('/rates');
  return actionSuccess(fill(t.rates.msgPackageUpdated, { code: packageCode }));
}
