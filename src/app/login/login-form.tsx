'use client';

import { useActionState } from 'react';
import { ActionMessage, SubmitButton } from '@/components/action-feedback';
import { IDLE, type ActionState } from '@/lib/action-state';
import { loginAction } from './actions';

export function LoginForm({ next, reason }: { next?: string; reason?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(loginAction, IDLE);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      {reason === 'expired' && (
        <p
          role="status"
          className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
        >
          세션이 만료되었습니다. 다시 로그인해 주세요.
        </p>
      )}

      <input type="hidden" name="next" value={next ?? '/'} />

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm text-subtle">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="frontdesk@planforge.local"
          className="rounded-md border border-current/20 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-subtle">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-current/20 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <SubmitButton
        pendingLabel="로그인 중…"
        className="btn-primary rounded-md px-3 py-2 text-sm font-medium"
      >
        로그인
      </SubmitButton>

      <ActionMessage state={state} />
    </form>
  );
}
