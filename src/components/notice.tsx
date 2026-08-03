export function ErrorNotice({
  title,
  message,
  status,
}: {
  title: string;
  message: string;
  /** HTTP 상태. 안내 문구를 상황에 맞게 바꾼다. */
  status?: number;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm"
    >
      <p className="font-medium text-red-700 dark:text-red-300">{title}</p>
      <p className="mt-1 whitespace-pre-line text-subtle">{message}</p>
      <p className="mt-2 text-xs text-subtle">{hintFor(status)}</p>
    </div>
  );
}

/**
 * 상태별 다음 행동 안내.
 *
 * 권한 문제에 "BE 서버가 켜져 있는지 확인하세요" 라고 하면 엉뚱한 곳을 보게 된다.
 */
function hintFor(status?: number): string {
  if (status === 403) return '이 화면에 접근할 권한이 없습니다. 관리자에게 문의해 주세요.';
  if (status === 401) return '세션이 만료되었을 수 있습니다. 다시 로그인해 주세요.';
  if (status && status >= 500)
    return '잠시 후 다시 시도해 주세요. 계속되면 관리자에게 알려 주세요.';
  return 'BE 서버가 실행 중인지, BE_BASE_URL 이 올바른지 확인해 주세요.';
}

/**
 * 오류가 아닌, 알아야 하는 상태.
 *
 * ErrorNotice 를 돌려쓰면 "BE 서버가 실행 중인지 확인하세요" 같은 복구 안내가
 * 따라붙어 정상 상태를 장애처럼 보이게 한다.
 */
export function InfoNotice({ title, message }: { title: string; message: string }) {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 whitespace-pre-line text-subtle">{message}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-current/20 px-4 py-12 text-center text-sm text-subtle">
      {message}
    </div>
  );
}
