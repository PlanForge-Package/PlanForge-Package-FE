import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { RatePlanDetail } from '@/components/rate-plan-detail';
import { ApiError, apiFetch, backendMessage, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';
import { getPropertyContext } from '@/lib/property';
import type { RatePackageList, RatePlanConfig, RoomType } from '@/lib/types';

const CAN_MANAGE = ['ADMIN', 'MANAGER'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rate code — PlanForge',
};

interface Props {
  params: Promise<{ code: string }>;
}

export default async function RatePlanPage({ params }: Props) {
  const { t } = await getDictionary();
  const { code } = await params;
  const user = await requireUser(`/rates/${code}`);
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.rates.planDetailTitle} />
        <EmptyState message={t.common.noAccess} />
      </main>
    );
  }

  let plan: RatePlanConfig;
  try {
    plan = await apiFetch<RatePlanConfig>('be', `/api/rates/plans/${encodeURIComponent(code)}`, {
      query: { propertyId },
    });
  } catch (error) {
    if (error instanceof ApiError && error.notFound) notFound();

    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.rates.planDetailTitle} />
        <ErrorNotice
          title={t.rates.loadPlansFailed}
          message={backendMessage(error, t.rates.loadPlansFailed)}
          status={error instanceof ApiError ? error.status : 0}
        />
        <Link href="/rates" className="text-sm underline underline-offset-4 text-subtle">
          {t.rates.backToRatesLong}
        </Link>
      </main>
    );
  }

  const [packages, roomTypes] = await Promise.all([
    tryFetch(apiFetch<RatePackageList>('be', '/api/rates/packages', { query: { propertyId } })),
    tryFetch(apiFetch<RoomType[]>('be', `/api/properties/${propertyId}/room-types`)),
  ]);

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/rates" className="text-sm underline underline-offset-4 text-subtle">
          {t.rates.backToRates}
        </Link>
        <PageHeader
          title={plan.name}
          description={`${fill(t.rates.planCode, { code: plan.ratePlanCode })}${
            plan.status === 'Active' ? '' : t.rates.planOffSale
          }`}
        />
      </div>

      <RatePlanDetail
        propertyId={propertyId}
        plan={plan}
        roomTypes={roomTypes.ok ? roomTypes.data : []}
        packages={packages.ok ? packages.data.items : []}
        canManage={CAN_MANAGE.includes(user.role)}
      />
    </main>
  );
}
