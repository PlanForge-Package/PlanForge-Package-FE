import type { Metadata } from 'next';
import Link from 'next/link';
import { CreateBlockForm } from '@/components/block-form';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { BlockStatusBadge } from '@/components/status-badge';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { getPropertyContext } from '@/lib/property';
import type { Block, BlockStatus, RoomType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '단체 블록 — PlanForge',
};

/** Creating a block holds inventory, so managers and above. BE enforces the same rule. */
const CAN_CREATE = ['ADMIN', 'MANAGER'];

/** Statuses used in the filter. Names come from the dictionary and follow the screen language. */
const STATUS_FILTERS: Array<BlockStatus | ''> = ['', 'TENTATIVE', 'DEFINITE', 'CANCELLED'];

function date(value: string): string {
  return value.slice(0, 10);
}

/** Pickup rate. The basis for deciding whether to release rooms at cutoff. */
function pickupRate(block: Block): string {
  if (block.totalBlocked === 0) return '—';
  return `${Math.round((block.totalPickedUp / block.totalBlocked) * 100)}%`;
}

export default async function BlocksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const user = await requireUser('/blocks');
  const { t } = await getDictionary();
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;
  const canCreate = CAN_CREATE.includes(user.role);

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="단체 블록" />
        <EmptyState message={t.common.noAccess} />
      </main>
    );
  }

  // Room types are only needed by the create form. Without the right it is not called.
  const [blocks, roomTypes] = await Promise.all([
    tryFetch(
      apiFetch<Block[]>('be', '/api/blocks', {
        query: { propertyId, status: status || undefined },
      }),
    ),
    canCreate
      ? tryFetch(apiFetch<RoomType[]>('be', `/api/properties/${propertyId}/room-types`))
      : Promise.resolve(null),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="단체 블록"
        description={`${property.selected?.name} — 재고 확보와 픽업 계산은 OPERA 가 합니다.`}
      />

      <form className="flex flex-wrap items-center gap-2">
        <label htmlFor="status" className="sr-only">
          {t.common.status}
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ''}
          className="rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
        >
          {STATUS_FILTERS.map((value) => (
            <option key={value} value={value}>
              {value ? t.blockStatus[value] : t.common.all}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
          조회
        </button>
      </form>

      {canCreate && roomTypes?.ok && (
        <CreateBlockForm propertyId={propertyId} roomTypes={roomTypes.data} />
      )}

      {!blocks.ok ? (
        <ErrorNotice
          title="블록을 불러오지 못했습니다"
          message={blocks.message}
          status={blocks.status}
        />
      ) : blocks.data.length === 0 ? (
        <EmptyState message="조건에 맞는 단체 블록이 없습니다." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  코드
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  단체
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  기간
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  컷오프
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  확보
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  픽업
                </th>
                <th scope="col" className="py-2 font-medium">
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {blocks.data.map((block) => (
                <tr key={block.id} className="border-b border-current/5">
                  <td className="py-2.5 pr-4 font-mono text-xs">
                    <Link
                      href={`/blocks/${block.id}`}
                      className="underline underline-offset-4 hover:no-underline"
                    >
                      {block.code}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4">{block.name}</td>
                  <td className="py-2.5 pr-4 tabular-nums">
                    {date(block.startDate)} ~ {date(block.endDate)}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">
                    {block.cutoffDate ? date(block.cutoffDate) : '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{block.totalBlocked}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {block.totalPickedUp}
                    <span className="ml-1.5 text-xs text-subtle">{pickupRate(block)}</span>
                  </td>
                  <td className="py-2.5">
                    <BlockStatusBadge status={block.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
