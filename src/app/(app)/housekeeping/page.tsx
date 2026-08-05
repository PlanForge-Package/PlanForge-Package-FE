import type { Metadata } from 'next';
import { GenerateTasksForm, HousekeepingBoard } from '@/components/housekeeping-board';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { fill } from '@/lib/i18n/format';
import { getPropertyContext } from '@/lib/property';
import type { DiscrepancyResponse, ManagedUser, TaskListResponse } from '@/lib/types';

interface AttendantResponse {
  propertyId: string;
  items: Pick<ManagedUser, 'id' | 'name' | 'role'>[];
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Housekeeping — PlanForge',
};

/** Assignment and task creation are for managers and the front desk. */
const CAN_MANAGE = ['ADMIN', 'MANAGER', 'FRONT_DESK'];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function HousekeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { t } = await getDictionary();
  const { date } = await searchParams;
  const workDate = date ?? today();

  const user = await requireUser('/housekeeping');
  const property = await getPropertyContext(user);
  const propertyId = property.selected?.id;
  const canManage = CAN_MANAGE.includes(user.role);

  if (!propertyId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title={t.housekeeping.title} />
        <EmptyState message={t.common.noAccess} />
      </main>
    );
  }

  // The assignee list is only needed with assignment rights. Without them it is not called.
  const [tasks, discrepancies, attendants] = await Promise.all([
    tryFetch(
      apiFetch<TaskListResponse>('be', '/api/housekeeping/tasks', {
        query: { propertyId, date: workDate },
      }),
    ),
    canManage
      ? tryFetch(
          apiFetch<DiscrepancyResponse>('be', '/api/housekeeping/discrepancies', {
            query: { propertyId },
          }),
        )
      : Promise.resolve(null),
    // The account list is admin-only and a manager cannot call it. A dedicated endpoint
    // gives just the minimum needed to assign.
    canManage
      ? tryFetch(
          apiFetch<AttendantResponse>('be', '/api/housekeeping/attendants', {
            query: { propertyId },
          }),
        )
      : Promise.resolve(null),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title={t.housekeeping.title}
        description={fill(t.housekeeping.description, {
          property: property.selected?.name ?? '',
          date: workDate,
        })}
      />

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="date" className="text-xs text-subtle">
            {t.housekeeping.workDate}
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={workDate}
            className="rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
          {t.common.search}
        </button>
      </form>

      {canManage && <GenerateTasksForm propertyId={propertyId} date={workDate} />}

      {discrepancies?.ok && discrepancies.data.total > 0 && (
        <section
          aria-label={t.housekeeping.discrepancies}
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3"
        >
          <h2 className="text-sm font-medium">
            {fill(t.housekeeping.discrepancyTitle, { count: discrepancies.data.total })}
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {discrepancies.data.items.map((item) => (
              <li key={`${item.room.id}-${item.kind}`}>
                <span className="font-medium tabular-nums">{item.room.number}</span>
                <span className="ml-2 text-subtle">
                  {t.housekeeping.discrepancyKinds[item.kind]}
                </span>
                {item.reservation && (
                  <span className="ml-2 font-mono text-xs">{item.reservation}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!tasks.ok ? (
        <ErrorNotice
          title={t.housekeeping.loadFailed}
          message={tasks.message}
          status={tasks.status}
        />
      ) : tasks.data.items.length === 0 ? (
        <EmptyState
          message={
            canManage
              ? t.housekeeping.emptyCanCreate
              : t.housekeeping.emptyAssigned
          }
        />
      ) : (
        <>
          <p className="text-sm text-subtle">
            {fill(t.housekeeping.totalCount, { count: tasks.data.total })}
          </p>
          <HousekeepingBoard
            tasks={tasks.data.items}
            attendants={attendants?.ok ? attendants.data.items : []}
            canAssign={canManage}
            myId={user.id}
          />
        </>
      )}
    </main>
  );
}
