import type { Metadata } from 'next';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { CreateUserForm, UserTable } from '@/components/user-admin';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { fill, num } from '@/lib/i18n/format';
import type { Property, UserListResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Accounts — PlanForge',
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; includeInactive?: string }>;
}) {
  const { locale, t } = await getDictionary();
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
        title={t.users.title}
        description={t.users.description}
      />

      <form className="flex flex-wrap items-center gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          {t.users.searchLabel}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q ?? ''}
          placeholder={t.users.searchPlaceholder}
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
          {t.users.includeInactive}
        </label>
        <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
          {t.common.search}
        </button>
      </form>

      <CreateUserForm properties={propertyOptions} />

      {!result.ok ? (
        <ErrorNotice
          title={t.users.loadFailed}
          message={result.message}
          status={result.status}
        />
      ) : result.data.items.length === 0 ? (
        <EmptyState message={t.users.empty} />
      ) : (
        <>
          <p className="text-sm text-subtle">
            {fill(t.users.totalCount, { count: num(result.data.total, locale) })}
          </p>
          <UserTable users={result.data.items} myId={me.id} properties={propertyOptions} />
        </>
      )}
    </main>
  );
}
