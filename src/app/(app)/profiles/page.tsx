import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import {
  PREFERENCE_LABELS,
  PROFILE_TYPE_LABELS,
  TIER_LABELS,
  profileName,
} from '@/lib/profile-labels';
import type { ProfileListResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '게스트 프로필 — PlanForge',
};

const fieldClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; vip?: string }>;
}) {
  const { q, tier, vip } = await searchParams;
  await requireUser('/profiles');

  const result = await tryFetch(
    apiFetch<ProfileListResponse>('be', '/api/profiles', {
      query: {
        q: q || undefined,
        tier: tier || undefined,
        vip: vip === '1' ? true : undefined,
        limit: 50,
      },
    }),
  );

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="게스트 프로필"
        description="선호 사항과 내부 메모는 PlanForge 가 소유합니다. 이름·연락처는 OPERA 프로필의 사본입니다."
      />

      <form className="flex flex-wrap items-end gap-2" role="search">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs text-subtle">
            이름 · 이메일 · 전화 · 멤버십 번호
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="홍길동"
            className={`w-56 ${fieldClass}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tier" className="text-xs text-subtle">
            등급
          </label>
          <select id="tier" name="tier" defaultValue={tier ?? ''} className={fieldClass}>
            <option value="">전체</option>
            {Object.entries(TIER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 py-2 text-sm">
          <input type="checkbox" name="vip" value="1" defaultChecked={vip === '1'} />
          VIP 만
        </label>
        <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
          조회
        </button>
      </form>

      {!result.ok ? (
        <ErrorNotice
          title="프로필을 불러오지 못했습니다"
          message={result.message}
          status={result.status}
        />
      ) : result.data.items.length === 0 ? (
        <EmptyState message="조건에 맞는 프로필이 없습니다." />
      ) : (
        <>
          <p className="text-sm text-subtle">전체 {result.data.total.toLocaleString()}명</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    이름
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    구분
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    연락처
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    멤버십
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    선호
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((profile) => (
                  <tr key={profile.id} className="border-b border-current/5">
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/profiles/${profile.id}`}
                        className="underline underline-offset-4 hover:no-underline"
                      >
                        {profileName(profile)}
                      </Link>
                      {profile.vip && (
                        <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">
                          VIP
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-subtle">{PROFILE_TYPE_LABELS[profile.type]}</td>
                    <td className="py-2.5 pr-4">
                      {profile.email ?? '—'}
                      {profile.phone && (
                        <span className="ml-2 tabular-nums text-subtle">{profile.phone}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {profile.membershipTier === 'NONE' ? (
                        <span className="text-subtle">—</span>
                      ) : (
                        <>
                          {TIER_LABELS[profile.membershipTier]}
                          {profile.membershipNumber && (
                            <span className="ml-1.5 font-mono text-xs text-subtle">
                              {profile.membershipNumber}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="py-2.5 text-xs text-subtle">
                      {profile.preferences.length === 0
                        ? '—'
                        : profile.preferences
                            .map((code) => PREFERENCE_LABELS[code] ?? code)
                            .join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
