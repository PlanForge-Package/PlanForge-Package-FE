import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-col items-start gap-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-subtle">주소를 다시 확인해 주세요.</p>
      <Link
        href="/"
        className="rounded-md border border-current/20 px-3 py-1.5 text-sm font-medium hover:bg-current/5"
      >
        대시보드로
      </Link>
    </main>
  );
}
