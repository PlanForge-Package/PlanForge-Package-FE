'use server';

import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, type ActionState } from '@/lib/action-state';
import { apiFetch, backendMessage } from '@/lib/api';
import { getDictionary, type Dictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';
import type { UserRole } from '@/lib/types';

// This file exports async functions only. Types and constants live in @/lib/action-state.

const ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING'];

/** The same minimum length as BE. Caught before the round trip. */
const MIN_PASSWORD_LENGTH = 8;

function readRole(raw: FormDataEntryValue | null): UserRole | null {
  const value = String(raw ?? '');
  return ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

function readPassword(raw: FormDataEntryValue | null, t: Dictionary): string | { error: string } {
  const value = String(raw ?? '');
  if (!value) return { error: t.users.msgPasswordRequired };
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { error: fill(t.users.msgPasswordTooShort, { min: MIN_PASSWORD_LENGTH }) };
  }
  return value;
}

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();

  const email = String(formData.get('email') ?? '').trim();
  if (!email) return actionError(t.users.msgEmailRequired);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return actionError(t.users.msgNameRequired);

  const role = readRole(formData.get('role'));
  if (!role) return actionError(t.users.msgRoleRequired);

  const password = readPassword(formData.get('password'), t);
  if (typeof password !== 'string') return actionError(password.error);

  const propertyId = String(formData.get('propertyId') ?? '');

  try {
    await apiFetch('be', '/api/users', {
      method: 'POST',
      json: { email, name, password, role, ...(propertyId ? { propertyId } : {}) },
    });
  } catch (error) {
    return actionError(backendMessage(error, t.users.msgCreateFailed));
  }

  revalidatePath('/users');
  return actionSuccess(fill(t.users.msgCreated, { name }));
}

/**
 * The target account comes as a form field rather than through bind.
 *
 * Binding ties the action state to each row, and a successful deactivation drops that
 * row from the list and unmounts it, taking "account deactivated" with it. Collecting
 * the state on the table means the target id has to travel in the form.
 */
function readUserId(formData: FormData): string | null {
  const id = String(formData.get('userId') ?? '').trim();
  return id || null;
}

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();

  const userId = readUserId(formData);
  if (!userId) return actionError(t.users.msgTargetMissing);

  const role = readRole(formData.get('role'));
  if (!role) return actionError(t.users.msgRoleRequired);

  // An empty string means "no property (head office)". BE reads it the same way.
  const propertyId = String(formData.get('propertyId') ?? '');

  try {
    await apiFetch('be', `/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      json: { role, propertyId },
    });
  } catch (error) {
    return actionError(backendMessage(error, t.users.msgUpdateFailed));
  }

  revalidatePath('/users');
  return actionSuccess(t.users.msgUpdated);
}

export async function setUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();

  const userId = readUserId(formData);
  if (!userId) return actionError(t.users.msgTargetMissing);

  const active = formData.get('active') === '1';
  const name = String(formData.get('name') || t.users.msgFallbackName);

  try {
    await apiFetch('be', `/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      json: { active },
    });
  } catch (error) {
    return actionError(
      backendMessage(error, active ? t.users.msgReinstateFailed : t.users.msgLeaveFailed),
    );
  }

  revalidatePath('/users');
  return actionSuccess(
    active ? fill(t.users.msgReinstated, { name }) : fill(t.users.msgLeft, { name }),
  );
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();

  const userId = readUserId(formData);
  if (!userId) return actionError(t.users.msgTargetMissing);

  const password = readPassword(formData.get('password'), t);
  if (typeof password !== 'string') return actionError(password.error);

  try {
    await apiFetch('be', `/api/users/${encodeURIComponent(userId)}/password`, {
      method: 'POST',
      json: { password },
    });
  } catch (error) {
    return actionError(backendMessage(error, t.users.msgResetFailed));
  }

  revalidatePath('/users');
  return actionSuccess(t.users.msgReset);
}

export async function changeOwnPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { t } = await getDictionary();

  const currentPassword = String(formData.get('currentPassword') ?? '');
  if (!currentPassword) return actionError(t.users.msgCurrentRequired);

  const newPassword = readPassword(formData.get('newPassword'), t);
  if (typeof newPassword !== 'string') return actionError(newPassword.error);

  const confirm = String(formData.get('confirmPassword') ?? '');
  if (newPassword !== confirm) return actionError(t.users.msgConfirmMismatch);

  try {
    await apiFetch('be', '/api/auth/change-password', {
      method: 'POST',
      json: { currentPassword, newPassword },
    });
  } catch (error) {
    return actionError(backendMessage(error, t.users.msgChangeFailed));
  }

  return actionSuccess(t.users.msgChanged);
}
