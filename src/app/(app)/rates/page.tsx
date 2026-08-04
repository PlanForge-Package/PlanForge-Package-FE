import type { Metadata } from 'next';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { PackagesPanel, RatePlansPanel } from '@/components/rate-panels';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { RatePackageList, RatePlanConfigList, RoomType } from '@/lib/types';

/** Rate setup moves revenue directly. Managers and above only. */
const CAN_MANAGE = ['ADMIN', 'MANAGER'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '요금 — PlanForge',
};

export default async function RatesPage() {
  const user = await requireUser('/rates');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (property.error) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="요금" />
        <ErrorNotice title="호텔 목록을 불러오지 못했습니다" message={property.error} />
      </main>
    );
  }

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="요금" />
        <EmptyState message="접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요." />
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
        title="요금"
        description={`${property.selected?.name} — 요금 코드·시즌·패키지는 OPERA 가 기록의 원천입니다.`}
      />

      {!plans.ok ? (
        <ErrorNotice
          title="요금 코드를 불러오지 못했습니다"
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
          title="패키지를 불러오지 못했습니다"
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
