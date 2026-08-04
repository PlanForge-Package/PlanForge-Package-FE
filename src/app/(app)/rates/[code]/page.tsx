import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { RatePlanDetail } from '@/components/rate-plan-detail';
import { ApiError, apiFetch, backendMessage, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { RatePackageList, RatePlanConfig, RoomType } from '@/lib/types';

const CAN_MANAGE = ['ADMIN', 'MANAGER'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '요금 코드 — PlanForge',
};

interface Props {
  params: Promise<{ code: string }>;
}

export default async function RatePlanPage({ params }: Props) {
  const { code } = await params;
  const user = await requireUser(`/rates/${code}`);
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="요금 코드" />
        <EmptyState message="접근 가능한 호텔이 없습니다." />
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
        <PageHeader title="요금 코드" />
        <ErrorNotice
          title="요금 코드를 불러오지 못했습니다"
          message={backendMessage(error, '요금 코드를 불러오지 못했습니다.')}
          status={error instanceof ApiError ? error.status : 0}
        />
        <Link href="/rates" className="text-sm underline underline-offset-4 text-subtle">
          ← 요금 목록으로
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
          ← 요금 목록
        </Link>
        <PageHeader
          title={plan.name}
          description={`코드 ${plan.ratePlanCode}${plan.status === 'Active' ? '' : ' · 판매 중지'}`}
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
