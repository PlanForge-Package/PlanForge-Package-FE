import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { logoutUrl, requireUser } from '@/lib/auth';
import { ArTransferPanel } from '@/components/ar-transfer-panel';
import { FolioPanel } from '@/components/folio-panel';
import { FolioRoutingPanel } from '@/components/folio-routing-panel';
import { SharePanel } from '@/components/share-panel';
import { TracePanel } from '@/components/trace-panel';
import { PolicyPanel } from '@/components/policy-panel';
import { WaitlistPanel } from '@/components/waitlist-panel';
import { FrontDeskPanel } from '@/components/front-desk';
import { ReservationEditPanel } from '@/components/reservation-edit';
import { Detail } from '@/components/field';
import type { Dictionary } from '@/lib/i18n';
import { ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { PaymentPanel } from '@/components/payment-panel';
import { RoomKeyPanel } from '@/components/room-key-panel';
import { ReservationStatusBadge } from '@/components/status-badge';
import { ApiError, apiFetch, tryFetch } from '@/lib/api';
import { label } from '@/lib/channel-labels';
import { getDictionary } from '@/lib/i18n';
import { dateOnly } from '@/lib/date';
import { translateError } from '@/lib/translate-error';
import type {
  ArAccountList,
  FolioRoutingList,
  PaymentListResponse,
  ReservationDetail,
  ReservationListResponse,
  ReservationPolicies,
  RoomKeyListResponse,
  TraceList,
} from '@/lib/types';

/** A refund sends money out. BE enforces the same rule. */
const CAN_REFUND = ['ADMIN', 'MANAGER'];

/** Raising an instruction is for the front desk and managers. Completing it is open to all. */
const CAN_EDIT_TRACE = ['ADMIN', 'MANAGER', 'FRONT_DESK'];

/** Guarantee and deposit move money directly. Open to the front desk. */
const CAN_EDIT = ['ADMIN', 'MANAGER', 'FRONT_DESK'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '예약 상세 — PlanForge',
};

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * A 404 goes to notFound() for its own screen; other failures are handled as a notice
 * inside the page. A brief BE outage must not look like "no such reservation".
 */
async function loadReservation(
  id: string,
  t: Dictionary,
): Promise<{ ok: true; data: ReservationDetail } | { ok: false; message: string; status: number }> {
  try {
    const data = await apiFetch<ReservationDetail>(
      'be',
      `/api/reservations/${encodeURIComponent(id)}`,
    );
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiError && error.notFound) {
      notFound();
    }
    // If the session dropped mid-request, clear the cookie and send them to login.
    if (error instanceof ApiError && error.unauthorized) {
      redirect(logoutUrl(`/reservations/${id}`, 'expired'));
    }
    return {
      ok: false,
      message: translateError(error, t, '예약을 불러오지 못했습니다.'),
      status: error instanceof ApiError ? error.status : 0,
    };
  }
}

function guestName(reservation: ReservationDetail): string {
  const name = [reservation.profile.lastName, reservation.profile.firstName]
    .filter(Boolean)
    .join(' ');
  return name || '(이름 없음)';
}

export default async function ReservationDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser(`/reservations/${id}`);
  const { t } = await getDictionary();
  const result = await loadReservation(id, t);

  if (!result.ok) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader title="예약 상세" />
        <ErrorNotice
          title="예약을 불러오지 못했습니다"
          message={result.message}
          status={result.status}
        />
        <Link href="/reservations" className="text-sm underline underline-offset-4 text-subtle">
          ← 예약 목록으로
        </Link>
      </main>
    );
  }

  const reservation = result.data;
  const folios = reservation.folios ?? [];

  // A failed key, payment or routing read must not kill the whole page. That is why they are separate calls.
  const [keys, payments, routings, traces, siblings, arAccounts, policies] = await Promise.all([
    tryFetch(
      apiFetch<RoomKeyListResponse>('be', `/api/reservations/${encodeURIComponent(id)}/keys`),
    ),
    tryFetch(
      apiFetch<PaymentListResponse>('be', `/api/reservations/${encodeURIComponent(id)}/payments`),
    ),
    tryFetch(
      apiFetch<FolioRoutingList>(
        'be',
        `/api/reservations/${encodeURIComponent(id)}/folios/routings`,
      ),
    ),
    tryFetch(apiFetch<TraceList>('be', `/api/reservations/${encodeURIComponent(id)}/traces`)),
    /*
     * Reservations at the same hotel are read to find both share candidates and the partner.
     *
     * The narrowing conditions (same room type, overlapping dates) are applied here.
     * OPERA decides what can actually be grouped, so this only shortlists.
     */
    tryFetch(
      apiFetch<ReservationListResponse>('be', '/api/reservations', {
        query: { propertyId: reservation.property.id, limit: 200 },
      }),
    ),
    tryFetch(
      apiFetch<ArAccountList>('be', '/api/ar/accounts', {
        query: { propertyId: reservation.property.id },
      }),
    ),
    // Cancellation terms and deposit. A reservation not linked to OPERA cannot be asked.
    tryFetch(
      apiFetch<ReservationPolicies>('be', `/api/reservations/${encodeURIComponent(id)}/policies`),
    ),
  ]);

  const nearby = siblings.ok ? siblings.data.items : [];
  const partners = reservation.shareGroupId
    ? nearby.filter((r) => r.shareGroupId === reservation.shareGroupId && r.id !== reservation.id)
    : [];
  const shareCandidates = nearby.filter(
    (r) =>
      r.id !== reservation.id &&
      !r.shareGroupId &&
      r.roomType.code === reservation.roomType.code &&
      !['CANCELLED', 'NO_SHOW', 'CHECKED_OUT'].includes(r.status) &&
      // Dates have to overlap for a room to be shared.
      r.arrivalDate < reservation.departureDate &&
      reservation.arrivalDate < r.departureDate,
  );

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/reservations" className="text-sm underline underline-offset-4 text-subtle">
          ← 예약 목록
        </Link>
        <PageHeader
          title={guestName(reservation)}
          description={`확인 번호 ${reservation.confirmationNumber}`}
          actions={<ReservationStatusBadge status={reservation.status} />}
        />
      </div>

      <section aria-label="예약 정보" className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <Detail label="호텔" value={reservation.property.name} />
        <Detail
          label="OPERA 예약 번호"
          value={reservation.operaReservationId ?? '연동 전'}
          mono={Boolean(reservation.operaReservationId)}
        />
        <Detail label="도착" value={dateOnly(reservation.arrivalDate)} />
        <Detail label="출발" value={dateOnly(reservation.departureDate)} />
        <Detail
          label="객실 타입"
          value={`${reservation.roomType.code} · ${reservation.roomType.name}`}
        />
        <Detail label="배정 객실" value={reservation.assignedRoomNumber ?? '미배정'} />
        <Detail
          label="요금제"
          value={
            reservation.ratePlan
              ? `${reservation.ratePlan.code} · ${reservation.ratePlan.name}`
              : '없음'
          }
        />
        <Detail label="인원" value={`성인 ${reservation.adults} · 아동 ${reservation.children}`} />
        {reservation.blockCode && <Detail label="단체 블록" value={reservation.blockCode} mono />}
        <Detail
          label="예약 경로"
          value={[
            label(t.sourceCodes, reservation.sourceCode),
            label(t.channelCodes, reservation.channelCode),
            label(t.marketCodes, reservation.marketCode),
          ]
            .filter((part) => part !== '—')
            .join(' · ')}
        />
        {reservation.profile.email && <Detail label="이메일" value={reservation.profile.email} />}
        {reservation.notes && <Detail label="메모" value={reservation.notes} />}
      </section>

      {/* 확정한 뒤에도 결과가 보여야 하므로 패널이 스스로 숨는다. */}
      <WaitlistPanel reservationId={reservation.id} status={reservation.status} />

      {policies.ok && (
        <PolicyPanel
          reservationId={reservation.id}
          policies={policies.data}
          canManage={CAN_EDIT.includes(user.role)}
        />
      )}

      <ReservationEditPanel
        reservationId={reservation.id}
        status={reservation.status}
        arrivalDate={dateOnly(reservation.arrivalDate)}
        departureDate={dateOnly(reservation.departureDate)}
        roomTypeCode={reservation.roomType.code}
        adults={reservation.adults}
        childCount={reservation.children}
      />

      <FrontDeskPanel
        reservationId={reservation.id}
        status={reservation.status}
        assignedRoomNumber={reservation.assignedRoomNumber}
      />

      {keys.ok ? (
        <RoomKeyPanel data={keys.data} />
      ) : (
        <ErrorNotice
          title="객실 키를 불러오지 못했습니다"
          message={keys.message}
          status={keys.status}
        />
      )}

      {payments.ok ? (
        <PaymentPanel data={payments.data} canRefund={CAN_REFUND.includes(user.role)} />
      ) : (
        <ErrorNotice
          title="결제 이력을 불러오지 못했습니다"
          message={payments.message}
          status={payments.status}
        />
      )}

      <FolioPanel reservationId={reservation.id} folios={folios} currency={reservation.currency} />

      <ArTransferPanel
        reservationId={reservation.id}
        folios={folios}
        accounts={arAccounts.ok ? arAccounts.data.items : []}
      />

      {traces.ok ? (
        <TracePanel
          reservationId={reservation.id}
          departureDate={reservation.departureDate}
          traces={traces.data.items}
          canEdit={CAN_EDIT_TRACE.includes(user.role)}
        />
      ) : (
        <ErrorNotice
          title="지시를 불러오지 못했습니다"
          message={traces.message}
          status={traces.status}
        />
      )}

      <SharePanel
        reservationId={reservation.id}
        shareGroupId={reservation.shareGroupId ?? null}
        partners={partners}
        candidates={shareCandidates}
      />

      {routings.ok ? (
        <FolioRoutingPanel
          reservationId={reservation.id}
          folios={folios}
          routings={routings.data.items}
        />
      ) : (
        <ErrorNotice
          title="라우팅 지시를 불러오지 못했습니다"
          message={routings.message}
          status={routings.status}
        />
      )}
    </main>
  );
}
