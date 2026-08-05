'use client';

import { useActionState, useId } from 'react';
import { changeOwnPasswordAction } from '@/app/(app)/users/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { useI18n } from '@/lib/i18n/provider';
import { ActionMessage, SubmitButton } from './action-feedback';
import { control } from './ui';

export function ChangePasswordForm() {
  const t = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(changeOwnPasswordAction, IDLE);
  const uid = useId();

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
        {t.users.changePassword}
      </h2>

      {/* A hidden username field so browser password managers recognise the account. */}
      <input type="text" name="username" autoComplete="username" hidden readOnly value="" />

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-current`} className="text-sm text-subtle">
          {t.users.currentPassword}
        </label>
        <input
          id={`${uid}-current`}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={control('xl')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-new`} className="text-sm text-subtle">
          {t.users.newPassword}
        </label>
        <input
          id={`${uid}-new`}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={control('xl')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-confirm`} className="text-sm text-subtle">
          {t.users.confirmPassword}
        </label>
        <input
          id={`${uid}-confirm`}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={control('xl')}
        />
      </div>

      <SubmitButton pendingLabel={t.users.changing}>{t.users.changePassword}</SubmitButton>

      <p className="text-xs text-subtle">{t.users.passwordNote}</p>
      <ActionMessage state={state} />
    </form>
  );
}
