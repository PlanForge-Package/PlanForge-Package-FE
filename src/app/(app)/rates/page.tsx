import type { Metadata } from 'next';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { PackagesPanel, RatePlansPanel } from '@/components/rate-panels';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';
import { getPropertyContext } from '@/lib/property';
import type { RatePackageList, RatePlanConfigList, RoomType } from '@/lib/types';

/** Rate setup moves revenue directly. Managers and above only. */
const CAN_MANAGE = ['ADMIN', 'MANAGER'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rates — PlanForge',
};

export default async function RatesPage() {
  const { t } = await getDictionary();
  const user = await requireUser('/rates');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (property.error) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.rates.title} />
        <ErrorNotice title={t.rates.loadPropertiesFailed} message={property.error} />
      </main>
    );
  }

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.rates.title} />
        <EmptyState message={t.common.noAccess} />
      </main>
    );
  }

  // The three are separate calls. One failing still shows the rest.
  const [plans, packages, roomTypes] = await Promise.all([
    tryFetch(apiFetch<RatePlanConfigList>('be', '/api/rates/plans', { query: { propertyId } })),
    tryFetch(apiFetch<RatePackageList>('be', '/api/rates/packages', { query: { propertyId } })),
    tryFetch(apiFetch<RoomType[]>('be', `/api/properties/${propertyId}/room-types`)),
  ]);

  const canManage = CAN_MANAGE.includes(user.role);

  return (
    <main className="flex flex-col gap-8">
      <PageHeader
        title={t.rates.title}
        description={fill(t.rates.description, { property: property.selected?.name ?? '' })}
      />

      {!plans.ok ? (
        <ErrorNotice
          title={t.rates.loadPlansFailed}
          message={plans.message}
          status={plans.status}
        />
      ) : (
        <RatePlansPanel
          propertyId={propertyId}
          plans={plans.data.items}
          roomTypes={roomTypes.ok ? roomTypes.data : []}
          packages={packages.ok ? packages.data.items : []}
          canManage={canManage}
        />
      )}

      {!packages.ok ? (
        <ErrorNotice
          title={t.rates.loadPackagesFailed}
          message={packages.message}
          status={packages.status}
        />
      ) : (
        <PackagesPanel
          propertyId={propertyId}
          packages={packages.data.items}
          canManage={canManage}
        />
      )}
    </main>
  );
}
