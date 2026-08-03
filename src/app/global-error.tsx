'use client';

/**
 * 루트 레이아웃 자체가 터졌을 때만 쓰인다. 이 경계는 layout 을 대체하므로
 * html·body 를 직접 만들어야 하고, 앱 스타일에 기댈 수 없어 인라인으로 그린다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          margin: 0,
          padding: '4rem 1.5rem',
          lineHeight: 1.6,
        }}
      >
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>앱을 시작하지 못했습니다</h1>
        <p style={{ opacity: 0.7 }}>잠시 후 다시 시도해 주세요. 계속되면 관리자에게 알려 주세요.</p>
        {error.digest && (
          <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>오류 ID: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '1rem',
            padding: '0.4rem 0.9rem',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
