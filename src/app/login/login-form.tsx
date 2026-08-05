'use client';

import { useActionState } from 'react';
import { ActionMessage, SubmitButton } from '@/components/action-feedback';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { Dictionary } from '@/lib/i18n';
import { loginAction } from './actions';
import { control } from '@/components/ui';

export function LoginForm({ next, reason, t }: { next?: string; reason?: string; t: Dictionary }) {
  const [state, action] = useActionState<ActionState, FormData>(loginAction, IDLE);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      {reason === 'expired' && (
        <p
          role="status"
          className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
        >
          {t.login.expired}
        </p>
      )}

      <input type="hidden" name="next" value={next ?? '/'} />

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm text-subtle">
          {t.login.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="frontdesk@planforge.local"
          className={control('xl')}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-subtle">
          {t.login.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={control('xl')}
        />
      </div>

      <SubmitButton
        pendingLabel={t.login.pending}
        className="btn-primary rounded-md px-3 py-2 text-sm font-medium"
      >
        {t.login.submit}
      </SubmitButton>

      <ActionMessage state={state} />
    </form>
  );
}
