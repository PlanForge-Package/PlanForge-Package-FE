import type { Metadata } from 'next';
import Link from 'next/link';
import { CreateBlockForm } from '@/components/block-form';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { BLOCK_LABELS, BlockStatusBadge } from '@/components/status-badge';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { Block, BlockStatus, RoomType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '단체 블록 — PlanForge',
};

/** 블록 생성은 재고를 잡는 행위라 지배인 이상이 한다. BE 도 같은 규칙으로 막는다. */
const CAN_CREATE = ['ADMIN', 'MANAGER'];

const STATUS_FILTERS: Array<{ value: BlockStatus | ''; label: string }> = [
  { value: '', label: '전체' },
  { value: 'TENTATIVE', label: BLOCK_LABELS.TENTATIVE },
  { value: 'DEFINITE', label: BLOCK_LABELS.DEFINITE },
  { value: 'CANCELLED', label: BLOCK_LABELS.CANCELLED },
];

function date(value: string): string {
  return value.slice(0, 10);
}

/** 소진율. 컷오프 때 남은 객실을 풀지 판단하는 근거다. */
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
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;
  const canCreate = CAN_CREATE.includes(user.role);

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="단체 블록" />
        <EmptyState message="접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요." />
      </main>
    );
  }

  // 객실 타입은 생성 폼에만 필요하다. 권한이 없으면 부르지 않는다.
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
          상태
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ''}
          className="rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
        >
          {STATUS_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
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
