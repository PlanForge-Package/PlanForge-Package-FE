import Link from 'next/link';

export default function BlockNotFound() {
  return (
    <main className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">블록을 찾을 수 없습니다</h1>
      <p className="text-sm text-subtle">
        삭제되었거나 주소가 잘못되었을 수 있습니다. 목록에서 다시 찾아 주세요.
      </p>
      <Link
        href="/blocks"
        className="rounded-md border border-current/20 px-3 py-1.5 text-sm font-medium hover:bg-current/5"
      >
        블록 목록으로
      </Link>
    </main>
  );
}
