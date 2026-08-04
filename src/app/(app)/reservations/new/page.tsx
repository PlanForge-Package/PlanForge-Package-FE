import type { Metadata } from 'next';
import Link from 'next/link';
import { BookingForm, type BookingOption } from '@/components/booking-form';
import { EmptyState, ErrorNotice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { apiFetch, tryFetch } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getPropertyContext } from '@/lib/property';
import type { AvailabilityResponse, Block, RateResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '새 예약 — PlanForge',
};

/** 오늘 기준 상대 날짜. 폼 기본값으로 쓴다. */
function day(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

interface Search {
  arrivalDate?: string;
  departureDate?: string;
  adults?: string;
  children?: string;
}

export default async function NewReservationPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const user = await requireUser('/reservations/new');
  const property = await getPropertyContext(user);

  const arrivalDate = params.arrivalDate ?? day(0);
  const departureDate = params.departureDate ?? day(1);
  const adults = Number(params.adults ?? 1) || 1;
  const children = Number(params.children ?? 0) || 0;

  // 검색 조건을 URL 에 두어 새로고침·뒤로가기가 자연스럽게 동작한다.
  const searched = Boolean(params.arrivalDate && params.departureDate);
  const invalidRange = departureDate <= arrivalDate;

  const propertyId = property.selected?.id;

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/reservations" className="text-sm underline underline-offset-4 text-subtle">
          ← 예약 목록
        </Link>
        <PageHeader
          title="새 예약"
          description={`${property.selected?.name ?? '호텔 미선택'} — 재고와 요금은 OPERA 가 판단합니다.`}
        />
      </div>

      <SearchForm
        arrivalDate={arrivalDate}
        departureDate={departureDate}
        adults={adults}
        childCount={children}
      />

      {!propertyId ? (
        <EmptyState message="접근 가능한 호텔이 없습니다. 관리자에게 소속 지정을 요청해 주세요." />
      ) : invalidRange ? (
        <ErrorNotice title="날짜를 확인해 주세요" message="출발일은 도착일보다 뒤여야 합니다." />
      ) : !searched ? (
        <EmptyState message="날짜를 정하고 조회하면 예약 가능한 객실이 나옵니다." />
      ) : (
        <Results
          propertyId={propertyId}
          arrivalDate={arrivalDate}
          departureDate={departureDate}
          adults={adults}
          childCount={children}
        />
      )}
    </main>
  );
}

function SearchForm({
  arrivalDate,
  departureDate,
  adults,
  childCount,
}: {
  arrivalDate: string;
  departureDate: string;
  adults: number;
  /** 게스트 인원. React 의 children 과 헷갈리지 않도록 이름을 달리한다. */
  childCount: number;
}) {
  const fieldClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';

  return (
    <form className="flex flex-wrap items-end gap-2" role="search">
      <div className="flex flex-col gap-1">
        <label htmlFor="arrivalDate" className="text-xs text-subtle">
          도착일
        </label>
        <input
          id="arrivalDate"
          name="arrivalDate"
          type="date"
          defaultValue={arrivalDate}
          required
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="departureDate" className="text-xs text-subtle">
          출발일
        </label>
        <input
          id="departureDate"
          name="departureDate"
          type="date"
          defaultValue={departureDate}
          required
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="adults" className="text-xs text-subtle">
          성인
        </label>
        <input
          id="adults"
          name="adults"
          type="number"
          min={1}
          max={10}
          defaultValue={adults}
          className={`w-20 ${fieldClass}`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="children" className="text-xs text-subtle">
          아동
        </label>
        <input
          id="children"
          name="children"
          type="number"
          min={0}
          max={10}
          defaultValue={childCount}
          className={`w-20 ${fieldClass}`}
        />
      </div>

      <button type="submit" className="btn-primary rounded-md px-3 py-1.5 text-sm font-medium">
        조회
      </button>
    </form>
  );
}

async function Results({
  propertyId,
  arrivalDate,
  departureDate,
  adults,
  childCount,
}: {
  propertyId: string;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  childCount: number;
}) {
  const query = { propertyId, arrivalDate, departureDate, adults, children: childCount };

  // 재고·요금·블록은 별개 호출이다. 하나가 실패해도 나머지는 보여준다.
  const [availability, rates, blocks] = await Promise.all([
    tryFetch(apiFetch<AvailabilityResponse>('be', '/api/reservations/availability', { query })),
    tryFetch(apiFetch<RateResponse>('be', '/api/reservations/rates', { query })),
    tryFetch(
      apiFetch<Block[]>('be', '/api/blocks', {
        query: { propertyId, status: 'DEFINITE', startFrom: arrivalDate },
      }),
    ),
  ]);

  if (!availability.ok) {
    return (
      <ErrorNotice
        title="재고를 불러오지 못했습니다"
        message={availability.message}
        status={availability.status}
      />
    );
  }

  if (availability.data.items.length === 0) {
    return <EmptyState message="해당 기간에 판매 가능한 객실이 없습니다." />;
  }

  /*
   * 객실 타입 × 요금 코드로 한 줄씩 만든다.
   *
   * 같은 방이라도 기준 요금과 법인 협약가는 값이 다르다. 타입당 한 줄만 두면
   * 어느 요금으로 파는지 고를 수 없고, 늘 하나만 팔리게 된다.
   */
  const offers = rates.ok ? rates.data.offers : [];
  const options: BookingOption[] = availability.data.items.flatMap((item) => {
    const matching = offers.filter((offer) => offer.roomTypeCode === item.roomTypeCode);
    // 요금을 못 받아 왔어도 재고는 보여 준다 — 대기로는 받을 수 있어야 한다.
    return matching.length === 0 ? [{ item }] : matching.map((offer) => ({ item, offer }));
  });

  const nights = rates.ok ? rates.data.nights : nightsBetween(arrivalDate, departureDate);

  return (
    <>
      {!rates.ok && (
        <ErrorNotice
          title="요금을 불러오지 못했습니다"
          message={`${rates.message} 재고만 표시합니다.`}
          status={rates.status}
        />
      )}
      <BookingForm
        options={options}
        propertyId={propertyId}
        arrivalDate={arrivalDate}
        departureDate={departureDate}
        adults={adults}
        childCount={childCount}
        nights={nights}
        // 확정된 블록만 고를 수 있다. 가예약 단계에서는 재고가 잡혀 있지 않다.
        blocks={
          blocks.ok
            ? blocks.data
                .filter((block) => block.startDate.slice(0, 10) <= departureDate)
                .map((block) => ({ code: block.code, name: block.name }))
            : []
        }
      />
    </>
  );
}

function nightsBetween(arrival: string, departure: string): number {
  const from = Date.parse(`${arrival}T00:00:00Z`);
  const to = Date.parse(`${departure}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}
