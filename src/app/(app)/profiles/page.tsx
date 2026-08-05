import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { fill, num } from '@/lib/i18n/format';
import { profileName } from '@/lib/profile-labels';
import type { MembershipTier, ProfileListResponse } from '@/lib/types';

const TIERS: MembershipTier[] = ['NONE', 'SILVER', 'GOLD', 'PLATINUM'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guest profiles — PlanForge',
};

const fieldClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tier?: string; vip?: string }>;
}) {
  const { locale, t } = await getDictionary();
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
        title={t.profiles.title}
        description={t.profiles.description}
      />

      <form className="flex flex-wrap items-end gap-2" role="search">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs text-subtle">
            {t.profiles.searchLabel}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder={t.profiles.searchPlaceholder}
            className={`w-56 ${fieldClass}`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tier" className="text-xs text-subtle">
            {t.profiles.tier}
          </label>
          <select id="tier" name="tier" defaultValue={tier ?? ''} className={fieldClass}>
            <option value="">{t.common.all}</option>
            {TIERS.map((value) => (
              <option key={value} value={value}>
                {t.profiles.tiers[value]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 py-2 text-sm">
          <input type="checkbox" name="vip" value="1" defaultChecked={vip === '1'} />
          {t.profiles.vipOnly}
        </label>
        <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
          {t.common.search}
        </button>
      </form>

      {!result.ok ? (
        <ErrorNotice
          title={t.profiles.loadFailed}
          message={result.message}
          status={result.status}
        />
      ) : result.data.items.length === 0 ? (
        <EmptyState message={t.profiles.empty} />
      ) : (
        <>
          <p className="text-sm text-subtle">
            {fill(t.profiles.totalCount, { count: num(result.data.total, locale) })}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.profiles.name}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.profiles.kind}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.profiles.contact}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.profiles.membership}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t.profiles.preferences}
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
                        {profileName(profile, t.profiles.unnamed)}
                      </Link>
                      {profile.vip && (
                        <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">
                          VIP
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-subtle">{t.profiles.kinds[profile.type]}</td>
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
                          {t.profiles.tiers[profile.membershipTier]}
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
                            .map(
                              (code) =>
                                t.profiles.preferenceCodes[
                                  code as keyof typeof t.profiles.preferenceCodes
                                ] ?? code,
                            )
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
