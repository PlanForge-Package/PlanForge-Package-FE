import type { Metadata } from 'next';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { CreateUserForm, UserTable } from '@/components/user-admin';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import type { Property, UserListResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '계정 관리 — PlanForge',
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; includeInactive?: string }>;
}) {
  const { q, includeInactive } = await searchParams;

  // The layout already authenticated, but here we need to know *who* —
  // so the role-change and deactivate buttons are not offered on your own row.
  const me = await requireUser('/users');
  const showInactive = includeInactive === '1';

  // Assigning a property needs the list of hotels to choose from.
  const properties = await tryFetch(apiFetch<Property[]>('be', '/api/properties'));
  const propertyOptions = properties.ok ? properties.data : [];

  const result = await tryFetch(
    apiFetch<UserListResponse>('be', '/api/users', {
      query: { q: q || undefined, includeInactive: showInactive || undefined, limit: 200 },
    }),
  );

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="계정 관리"
        description="직원 계정과 역할을 관리합니다. 퇴사는 삭제가 아니라 비활성화로 처리합니다."
      />

      <form className="flex flex-wrap items-center gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          이름 또는 이메일
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q ?? ''}
          placeholder="이름 · 이메일"
          className="rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
        />
        <label className="flex items-center gap-1.5 text-sm text-subtle">
          <input
            type="checkbox"
            name="includeInactive"
            value="1"
            defaultChecked={showInactive}
            className="size-3.5"
          />
          퇴사자 포함
        </label>
        <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
          조회
        </button>
      </form>

      <CreateUserForm properties={propertyOptions} />

      {!result.ok ? (
        <ErrorNotice
          title="계정을 불러오지 못했습니다"
          message={result.message}
          status={result.status}
        />
      ) : result.data.items.length === 0 ? (
        <EmptyState message="조건에 맞는 계정이 없습니다." />
      ) : (
        <>
          <p className="text-sm text-subtle">전체 {result.data.total.toLocaleString()}명</p>
          <UserTable users={result.data.items} myId={me.id} properties={propertyOptions} />
        </>
      )}
    </main>
  );
}
