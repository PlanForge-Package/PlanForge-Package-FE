'use client';

import { useEffect } from 'react';

/**
 * 라우트 렌더링 중 처리되지 않은 예외를 받는 마지막 그물.
 *
 * 프로덕션 빌드에서는 Next 가 메시지를 지우고 digest 만 남기므로, 사용자에게는
 * 다시 시도할 방법을 주고 digest 를 함께 보여 로그와 대조할 수 있게 한다.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('route error', error);
  }, [error]);

  return (
    <main className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">화면을 표시하지 못했습니다</h1>
      <p className="text-sm text-subtle">
        일시적인 문제일 수 있습니다. 다시 시도해도 같으면 BE 서버 상태를 확인해 주세요.
      </p>
      {error.digest && (
        <p className="text-xs text-subtle">
          오류 ID: <code className="font-mono">{error.digest}</code>
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-current/20 px-3 py-1.5 text-sm font-medium hover:bg-current/5"
      >
        다시 시도
      </button>
    </main>
  );
}
