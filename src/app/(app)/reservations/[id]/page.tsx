import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { logoutUrl, requireUser } from '@/lib/auth';
import { FolioPanel } from '@/components/folio-panel';
import { FolioRoutingPanel } from '@/components/folio-routing-panel';
import { TracePanel } from '@/components/trace-panel';
import { FrontDeskPanel } from '@/components/front-desk';
import { ReservationEditPanel } from '@/components/reservation-edit';
import { ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { PaymentPanel } from '@/components/payment-panel';
import { RoomKeyPanel } from '@/components/room-key-panel';
import { ReservationStatusBadge } from '@/components/status-badge';
import { ApiError, apiFetch, backendMessage, tryFetch } from '@/lib/api';
import { CHANNEL_LABELS, MARKET_LABELS, SOURCE_LABELS, label } from '@/lib/channel-labels';
import type {
  FolioRoutingList,
  PaymentListResponse,
  ReservationDetail,
  RoomKeyListResponse,
  TraceList,
} from '@/lib/types';

/** 환불은 돈이 나가는 방향이다. BE 도 같은 규칙으로 막는다. */
const CAN_REFUND = ['ADMIN', 'MANAGER'];

/** 지시를 새로 거는 것은 프론트데스크와 지배인이 한다. 처리는 전 역할이 한다. */
const CAN_EDIT_TRACE = ['ADMIN', 'MANAGER', 'FRONT_DESK'];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '예약 상세 — PlanForge',
};

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 404 는 notFound() 로 넘겨 전용 화면을 띄우고, 나머지 실패는 페이지 안에서
 * 안내로 처리한다. BE 가 잠깐 죽었다고 "없는 예약" 으로 보이면 안 되기 때문이다.
 */
async function loadReservation(
  id: string,
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
    // 세션이 요청 도중 끊겼다면 안내 대신 쿠키를 정리하고 로그인으로 보낸다.
    if (error instanceof ApiError && error.unauthorized) {
      redirect(logoutUrl(`/reservations/${id}`, 'expired'));
    }
    return {
      ok: false,
      message: backendMessage(error, '예약을 불러오지 못했습니다.'),
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
  const result = await loadReservation(id);

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

  // 키·결제·라우팅 조회가 실패해도 예약 화면 전체를 죽이지 않는다. 별개 호출인 이유가 이것이다.
  const [keys, payments, routings, traces] = await Promise.all([
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
  ]);

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
        <Field label="호텔" value={reservation.property.name} />
        <Field
          label="OPERA 예약 번호"
          value={reservation.operaReservationId ?? '연동 전'}
          mono={Boolean(reservation.operaReservationId)}
        />
        <Field label="도착" value={reservation.arrivalDate.slice(0, 10)} />
        <Field label="출발" value={reservation.departureDate.slice(0, 10)} />
        <Field
          label="객실 타입"
          value={`${reservation.roomType.code} · ${reservation.roomType.name}`}
        />
        <Field label="배정 객실" value={reservation.assignedRoomNumber ?? '미배정'} />
        <Field
          label="요금제"
          value={
            reservation.ratePlan
              ? `${reservation.ratePlan.code} · ${reservation.ratePlan.name}`
              : '없음'
          }
        />
        <Field label="인원" value={`성인 ${reservation.adults} · 아동 ${reservation.children}`} />
        {reservation.blockCode && <Field label="단체 블록" value={reservation.blockCode} mono />}
        <Field
          label="예약 경로"
          value={[
            label(SOURCE_LABELS, reservation.sourceCode),
            label(CHANNEL_LABELS, reservation.channelCode),
            label(MARKET_LABELS, reservation.marketCode),
          ]
            .filter((part) => part !== '—')
            .join(' · ')}
        />
        {reservation.profile.email && <Field label="이메일" value={reservation.profile.email} />}
        {reservation.notes && <Field label="메모" value={reservation.notes} />}
      </section>

      <ReservationEditPanel
        reservationId={reservation.id}
        status={reservation.status}
        arrivalDate={reservation.arrivalDate.slice(0, 10)}
        departureDate={reservation.departureDate.slice(0, 10)}
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

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-subtle">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
