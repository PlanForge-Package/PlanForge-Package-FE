'use client';

import { useActionState, useId } from 'react';
import { changeOwnPasswordAction } from '@/app/(app)/users/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { ActionMessage, SubmitButton } from './action-feedback';

const inputClass = 'rounded-md border border-current/20 bg-transparent px-3 py-2 text-sm';

export function ChangePasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changeOwnPasswordAction, IDLE);
  const uid = useId();

  return (
    <form action={action} className="flex flex-col gap-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">비밀번호 변경</h2>

      {/* 브라우저 비밀번호 관리자가 계정을 알아보도록 아이디 필드를 숨겨 둔다. */}
      <input type="text" name="username" autoComplete="username" hidden readOnly value="" />

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-current`} className="text-sm text-subtle">
          현재 비밀번호
        </label>
        <input
          id={`${uid}-current`}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-new`} className="text-sm text-subtle">
          새 비밀번호
        </label>
        <input
          id={`${uid}-new`}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-confirm`} className="text-sm text-subtle">
          새 비밀번호 확인
        </label>
        <input
          id={`${uid}-confirm`}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>

      <SubmitButton pendingLabel="변경 중…">비밀번호 변경</SubmitButton>

      <p className="text-xs text-subtle">8자 이상이어야 하며, 현재 비밀번호와 달라야 합니다.</p>
      <ActionMessage state={state} />
    </form>
  );
}
