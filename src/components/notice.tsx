export function ErrorNotice({ title, message }: { title: string; message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm"
    >
      <p className="font-medium text-red-700 dark:text-red-300">{title}</p>
      <p className="mt-1 opacity-80">{message}</p>
      <p className="mt-2 text-xs opacity-60">
        BE 서버가 실행 중인지, <code>BE_BASE_URL</code> 이 올바른지 확인해 주세요.
      </p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-current/20 px-4 py-12 text-center text-sm opacity-60">
      {message}
    </div>
  );
}
