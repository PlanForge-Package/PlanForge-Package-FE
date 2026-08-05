import type { Metadata } from 'next';
import { ArAgingPanel } from '@/components/ar-aging';
import { ArAccountsPanel } from '@/components/ar-panels';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { getDictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { ArAccountList, ArAging } from '@/lib/types';

/** Registering accounts is receivables management, so a manager owns it. */
const CAN_MANAGE = ['ADMIN', 'MANAGER'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AR — PlanForge',
};

export default async function ArPage() {
  const { t } = await getDictionary();
  const user = await requireUser('/ar');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (property.error) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.ar.title} />
        <ErrorNotice title={t.ar.loadPropertiesFailed} message={property.error} />
      </main>
    );
  }

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.ar.title} />
        <EmptyState message={t.common.noAccess} />
      </main>
    );
  }

  // The two are separate calls. One failing still shows the other.
  const [accounts, aging] = await Promise.all([
    tryFetch(apiFetch<ArAccountList>('be', '/api/ar/accounts', { query: { propertyId } })),
    tryFetch(apiFetch<ArAging>('be', '/api/ar/aging', { query: { propertyId } })),
  ]);

  return (
    <main className="flex flex-col gap-8">
      <PageHeader
        title={t.ar.title}
        description={fill(t.ar.description, { property: property.selected?.name ?? '' })}
      />

      {!accounts.ok ? (
        <ErrorNotice
          title={t.ar.loadAccountsFailed}
          message={accounts.message}
          status={accounts.status}
        />
      ) : (
        <ArAccountsPanel
          propertyId={propertyId}
          data={accounts.data}
          canCreate={CAN_MANAGE.includes(user.role)}
        />
      )}

      {!aging.ok ? (
        <ErrorNotice title={t.ar.loadAgingFailed} message={aging.message} status={aging.status} />
      ) : (
        <ArAgingPanel data={aging.data} />
      )}
    </main>
  );
}
