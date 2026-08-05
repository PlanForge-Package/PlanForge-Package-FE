import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { BlockEditor } from '@/components/block-form';
import { ErrorNotice } from '@/components/notice';
import { PageHeader, StatTile } from '@/components/page-header';
import { BlockStatusBadge } from '@/components/status-badge';
import { ApiError, apiFetch, translateError, tryFetch } from '@/lib/api';
import { logoutUrl, requireUser } from '@/lib/auth';
import { getDictionary, type Dictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';
import type { Block, BlockRoomingList } from '@/lib/types';
import { dateOnly } from '@/lib/date';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Block detail — PlanForge',
};

/** Editing holds inventory, so managers and above. BE enforces the same rule. */
const CAN_EDIT = ['ADMIN', 'MANAGER'];

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * A 404 goes to its own screen; other failures are handled as a notice in the page.
 * A brief BE outage must not look like "no such block".
 */
async function loadBlock(
  id: string,
  t: Dictionary,
): Promise<{ ok: true; data: Block } | { ok: false; message: string; status: number }> {
  try {
    return { ok: true, data: await apiFetch<Block>('be', `/api/blocks/${encodeURIComponent(id)}`) };
  } catch (error) {
    if (error instanceof ApiError && error.notFound) {
      notFound();
    }
    if (error instanceof ApiError && error.unauthorized) {
      redirect(logoutUrl(`/blocks/${id}`, 'expired'));
    }
    return {
      ok: false,
      message: translateError(error, t, t.blocks.loadFailed),
      status: error instanceof ApiError ? error.status : 0,
    };
  }
}

export default async function BlockDetailPage({ params }: Props) {
  const { t } = await getDictionary();
  const { id } = await params;
  const user = await requireUser(`/blocks/${id}`);

  const block = await loadBlock(id, t);

  if (!block.ok) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.blocks.detailTitle} />
        <ErrorNotice title={t.blocks.loadFailed} message={block.message} status={block.status} />
      </main>
    );
  }

  // A failed rooming list still shows the block. That is why they are separate calls.
  const rooming = await tryFetch(
    apiFetch<BlockRoomingList>('be', `/api/blocks/${encodeURIComponent(id)}/reservations`),
  );

  const data = block.data;
  const remaining = data.totalBlocked - data.totalPickedUp;
  const dates = [...new Set(data.allotments.map((slot) => dateOnly(slot.date)))].sort();
  const roomTypes = [...new Set(data.allotments.map((slot) => slot.roomTypeCode))].sort();

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/blocks" className="text-sm underline underline-offset-4 text-subtle">
          {t.blocks.backToList}
        </Link>
        <PageHeader
          title={data.name}
          description={`${data.code} · ${dateOnly(data.startDate)} ~ ${dateOnly(data.endDate)}${
            data.cutoffDate ? fill(t.blocks.cutoffSuffix, { date: dateOnly(data.cutoffDate) }) : ''
          }`}
          actions={<BlockStatusBadge status={data.status} />}
        />
      </div>

      <section aria-label={t.blocks.summary} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t.blocks.blocked} value={data.totalBlocked} />
        <StatTile label={t.blocks.pickedUp} value={data.totalPickedUp} />
        <StatTile label={t.blocks.remaining} value={remaining} />
        <StatTile
          label={t.blocks.pickupRate}
          value={
            data.totalBlocked === 0
              ? '—'
              : `${Math.round((data.totalPickedUp / data.totalBlocked) * 100)}%`
          }
        />
      </section>

      {CAN_EDIT.includes(user.role) && (
        <BlockEditor
          blockId={data.id}
          status={data.status}
          name={data.name}
          cutoffDate={data.cutoffDate}
          // Room types repeat per date. Adjustments are per type, so only one is kept.
          rates={[
            ...new Map(
              data.allotments.map((slot) => [
                slot.roomTypeCode,
                { roomTypeCode: slot.roomTypeCode, amount: slot.amount },
              ]),
            ).values(),
          ]}
        />
      )}

      <section aria-label={t.blocks.allotmentSection} className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t.blocks.allotmentSection}</h2>
        {dates.length === 0 ? (
          <p className="text-sm text-subtle">{t.blocks.allotmentEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">{t.blocks.allotmentCaption}</caption>
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.blocks.date}
                  </th>
                  {roomTypes.map((code) => (
                    <th key={code} scope="col" className="py-2 pr-4 text-right font-medium">
                      {code}
                    </th>
                  ))}
                  <th scope="col" className="py-2 text-right font-medium">
                    {t.blocks.total}
                  </th>
                </tr>
              </thead>
              <tbody>
                {dates.map((day) => {
                  const row = data.allotments.filter((slot) => dateOnly(slot.date) === day);
                  const blocked = row.reduce((sum, slot) => sum + slot.blocked, 0);
                  const pickedUp = row.reduce((sum, slot) => sum + slot.pickedUp, 0);

                  return (
                    <tr key={day} className="border-b border-current/5">
                      <th scope="row" className="py-2.5 pr-4 text-left font-normal tabular-nums">
                        {day}
                      </th>
                      {roomTypes.map((code) => {
                        const slot = row.find((item) => item.roomTypeCode === code);
                        return (
                          <td key={code} className="py-2.5 pr-4 text-right tabular-nums">
                            {slot ? (
                              <>
                                {slot.pickedUp}
                                <span className="text-subtle"> / {slot.blocked}</span>
                              </>
                            ) : (
                              <span className="text-subtle">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 text-right tabular-nums">
                        {pickedUp}
                        <span className="text-subtle"> / {blocked}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-subtle">{t.blocks.allotmentNote}</p>
      </section>

      <section aria-label={t.blocks.roomingList} className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t.blocks.roomingList}</h2>
        {!rooming.ok ? (
          <ErrorNotice
            title={t.blocks.roomingListFailed}
            message={rooming.message}
            status={rooming.status}
          />
        ) : rooming.data.items.length === 0 ? (
          <p className="text-sm text-subtle">
            {fill(t.blocks.roomingListEmpty, { code: data.code })}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.blocks.confirmationNumber}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.blocks.guest}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.blocks.arrival}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.blocks.departure}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.blocks.roomType}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t.blocks.room}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rooming.data.items.map((item) => (
                  <tr key={item.reservationId} className="border-b border-current/5">
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {item.confirmationNumber ?? item.reservationId}
                    </td>
                    <td className="py-2.5 pr-4">
                      {[item.guest?.lastName, item.guest?.firstName].filter(Boolean).join(' ') ||
                        t.blocks.unnamed}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">{dateOnly(item.arrivalDate)}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{dateOnly(item.departureDate)}</td>
                    <td className="py-2.5 pr-4">{item.roomTypeCode ?? '—'}</td>
                    <td className="py-2.5 tabular-nums">{item.roomNumber ?? '—'}</td>
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
