'use client';

import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/action-state';

/** 액션 결과를 스크린리더에도 전달되도록 알린다. */
export function ActionMessage({ state }: { state: ActionState }) {
  if (state.status === 'idle') return null;

  const error = state.status === 'error';
  return (
    <p
      role={error ? 'alert' : 'status'}
      aria-live="polite"
      className={`mt-2 whitespace-pre-line text-sm ${
        error ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'
      }`}
    >
      {state.message}
    </p>
  );
}

/** 제출 중에는 비활성화해 중복 전송을 막는다. */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  confirm,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={
        confirm
          ? (event) => {
              if (!window.confirm(confirm)) event.preventDefault();
            }
          : undefined
      }
      className={className ?? 'btn-primary rounded-md px-3 py-1.5 text-sm font-medium'}
    >
      {pending ? (pendingLabel ?? '처리 중…') : children}
    </button>
  );
}
