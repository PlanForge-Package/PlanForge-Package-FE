import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ErrorNotice, InfoNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { DuplicatePanel, ProfileEditor } from '@/components/profile-editor';
import { ReservationStatusBadge } from '@/components/status-badge';
import { ApiError, apiFetch, backendMessage, tryFetch } from '@/lib/api';
import { logoutUrl, requireUser } from '@/lib/auth';
import { PROFILE_TYPE_LABELS, TIER_LABELS, profileName } from '@/lib/profile-labels';
import type { DuplicateResponse, ProfileDetail } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '프로필 상세 — PlanForge',
};

/** 병합은 되돌리기 어렵다. 지배인 이상만 한다. BE 도 같은 규칙으로 막는다. */
const CAN_MERGE = ['ADMIN', 'MANAGER'];

interface Props {
  params: Promise<{ id: string }>;
}

async function loadProfile(
  id: string,
): Promise<{ ok: true; data: ProfileDetail } | { ok: false; message: string; status: number }> {
  try {
    return {
      ok: true,
      data: await apiFetch<ProfileDetail>('be', `/api/profiles/${encodeURIComponent(id)}`),
    };
  } catch (error) {
    if (error instanceof ApiError && error.notFound) {
      notFound();
    }
    if (error instanceof ApiError && error.unauthorized) {
      redirect(logoutUrl(`/profiles/${id}`, 'expired'));
    }
    return {
      ok: false,
      message: backendMessage(error, '프로필을 불러오지 못했습니다.'),
      status: error instanceof ApiError ? error.status : 0,
    };
  }
}

function money(value: string, currency = 'KRW'): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('ko-KR')} ${currency}`;
  }
}

export default async function ProfileDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser(`/profiles/${id}`);
  const result = await loadProfile(id);

  if (!result.ok) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="프로필 상세" />
        <ErrorNotice
          title="프로필을 불러오지 못했습니다"
          message={result.message}
          status={result.status}
        />
      </main>
    );
  }

  const profile = result.data;
  const duplicates = await tryFetch(
    apiFetch<DuplicateResponse>('be', `/api/profiles/${encodeURIComponent(id)}/duplicates`),
  );

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/profiles" className="text-sm underline underline-offset-4 text-subtle">
          ← 게스트 프로필
        </Link>
        <PageHeader
          title={profileName(profile)}
          description={`${PROFILE_TYPE_LABELS[profile.type]} · ${TIER_LABELS[profile.membershipTier]}${
            profile.operaProfileId ? ` · OPERA ${profile.operaProfileId}` : ' · OPERA 미연동'
          }`}
          actions={
            profile.vip ? (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                VIP
              </span>
            ) : undefined
          }
        />
      </div>

      {profile.merged && (
        <InfoNotice
          title="이 프로필은 병합되었습니다"
          message={
            profile.mergedInto
              ? `${profileName(profile.mergedInto)} 프로필로 합쳐졌습니다. 수정은 그쪽에서 해 주세요.`
              : '다른 프로필로 합쳐졌습니다. 수정은 정본 프로필에서 해 주세요.'
          }
        />
      )}

      <section aria-label="투숙 요약" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="투숙 횟수" value={profile.summary.stayCount} />
        <StatTile label="누적 박수" value={profile.summary.nights} />
        <StatTile label="누적 매출" value={money(profile.summary.revenue)} />
        <StatTile label="최근 투숙" value={profile.summary.lastStay?.slice(0, 10) ?? '—'} />
      </section>

      {!profile.merged && <ProfileEditor profile={profile} />}

      <section aria-label="중복 후보" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">중복 후보</h2>
        {!duplicates.ok ? (
          <ErrorNotice
            title="중복 후보를 불러오지 못했습니다"
            message={duplicates.message}
            status={duplicates.status}
          />
        ) : (
          <DuplicatePanel
            profileId={profile.id}
            candidates={duplicates.data.items}
            canMerge={CAN_MERGE.includes(user.role) && !profile.merged}
          />
        )}
      </section>

      <section aria-label="투숙 이력" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">투숙 이력</h2>
        {profile.stays.length === 0 ? (
          <p className="text-sm text-subtle">투숙 이력이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    확인 번호
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    호텔
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    도착
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    출발
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    객실
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    금액
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {profile.stays.map((stay) => (
                  <tr key={stay.id} className="border-b border-current/5">
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      <Link
                        href={`/reservations/${stay.id}`}
                        className="underline underline-offset-4 hover:no-underline"
                      >
                        {stay.confirmationNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">{stay.property.name}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{stay.arrivalDate.slice(0, 10)}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{stay.departureDate.slice(0, 10)}</td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {stay.assignedRoomNumber ?? '—'}
                      <span className="ml-1.5 text-xs text-subtle">{stay.roomType.code}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {stay.totalAmount ? money(stay.totalAmount, stay.currency) : '—'}
                    </td>
                    <td className="py-2.5">
                      <ReservationStatusBadge status={stay.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
