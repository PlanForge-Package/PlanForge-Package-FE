import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ErrorNotice, InfoNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { DuplicatePanel, ProfileEditor } from '@/components/profile-editor';
import { ReservationStatusBadge } from '@/components/status-badge';
import { ApiError, apiFetch, backendMessage, tryFetch } from '@/lib/api';
import { logoutUrl, requireUser } from '@/lib/auth';
import { getDictionary, type Dictionary } from '@/lib/i18n';
import { fill, money } from '@/lib/i18n/format';
import { profileName } from '@/lib/profile-labels';
import type { DuplicateResponse, ProfileDetail } from '@/lib/types';
import { dateOnly } from '@/lib/date';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guest profile — PlanForge',
};

/** A merge is hard to undo. Managers and above only. BE enforces the same rule. */
const CAN_MERGE = ['ADMIN', 'MANAGER'];

interface Props {
  params: Promise<{ id: string }>;
}

async function loadProfile(
  id: string,
  t: Dictionary,
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
      message: backendMessage(error, t.profiles.loadFailed),
      status: error instanceof ApiError ? error.status : 0,
    };
  }
}

export default async function ProfileDetailPage({ params }: Props) {
  const { locale, t } = await getDictionary();
  const { id } = await params;
  const user = await requireUser(`/profiles/${id}`);
  const result = await loadProfile(id, t);

  if (!result.ok) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.profiles.detailTitle} />
        <ErrorNotice
          title={t.profiles.loadFailed}
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
          {t.profiles.backToList}
        </Link>
        <PageHeader
          title={profileName(profile, t.profiles.unnamed)}
          description={`${t.profiles.kinds[profile.type]} · ${
            t.profiles.tiers[profile.membershipTier]
          }${
            profile.operaProfileId
              ? fill(t.profiles.operaLinked, { id: profile.operaProfileId })
              : t.profiles.operaUnlinked
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
          title={t.profiles.mergedTitle}
          message={
            profile.mergedInto
              ? fill(t.profiles.mergedInto, {
                  name: profileName(profile.mergedInto, t.profiles.unnamed),
                })
              : t.profiles.mergedUnknown
          }
        />
      )}

      <section
        aria-label={t.profiles.staySummary}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <StatTile label={t.profiles.stayCount} value={profile.summary.stayCount} />
        <StatTile label={t.profiles.nights} value={profile.summary.nights} />
        <StatTile label={t.profiles.revenue} value={money(profile.summary.revenue, locale)} />
        <StatTile label={t.profiles.lastStay} value={dateOnly(profile.summary.lastStay)} />
      </section>

      {!profile.merged && <ProfileEditor profile={profile} />}

      <section aria-label={t.profiles.duplicatesSection} className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t.profiles.duplicatesSection}</h2>
        {!duplicates.ok ? (
          <ErrorNotice
            title={t.profiles.duplicatesLoadFailed}
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

      <section aria-label={t.profiles.historySection} className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t.profiles.historySection}</h2>
        {profile.stays.length === 0 ? (
          <p className="text-sm text-subtle">{t.profiles.historyEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.profiles.confirmationNumber}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.profiles.hotel}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.profiles.arrival}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.profiles.departure}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.profiles.room}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.profiles.amount}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t.profiles.status}
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
                    <td className="py-2.5 pr-4 tabular-nums">{dateOnly(stay.arrivalDate)}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{dateOnly(stay.departureDate)}</td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {stay.assignedRoomNumber ?? '—'}
                      <span className="ml-1.5 text-xs text-subtle">{stay.roomType.code}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {stay.totalAmount ? money(stay.totalAmount, locale, stay.currency) : '—'}
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
