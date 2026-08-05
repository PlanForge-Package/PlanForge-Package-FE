'use client';

import { useActionState, useId, useState } from 'react';
import { createReservationAction } from '@/app/(app)/reservations/new/actions';
import { IDLE, type ActionState } from '@/lib/action-state';

import type { AvailabilityItem, RateOffer } from '@/lib/types';
import { useI18n } from '@/lib/i18n/provider';
import { ActionMessage, SubmitButton } from './action-feedback';
import { control } from './ui';

function formatMoney(amount: number | undefined, currency: string): string {
  if (amount === undefined) return '—';
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('ko-KR')} ${currency}`;
  }
}

export interface BookingOption {
  item: AvailabilityItem;
  offer?: RateOffer;
}

/** One room type appears once per rate code, so the two are combined to tell them apart. */
function optionKey({ item, offer }: BookingOption): string {
  return `${item.roomTypeCode}::${offer?.ratePlanCode ?? item.ratePlanCode ?? ''}`;
}

/**
 * Pick a room type from the availability list, add guest details and create a booking.
 *
 * Rates and availability already came from OPERA and are not recomputed here. The
 * screen shows what it was given and OPERA makes the final call — inventory can sell
 * between the read and the create, so these numbers are a guide, not a guarantee.
 */
export function BookingForm({
  options,
  propertyId,
  arrivalDate,
  departureDate,
  adults,
  childCount,
  nights,
  blocks = [],
}: {
  options: BookingOption[];
  propertyId: string;
  arrivalDate: string;
  departureDate: string;
  adults: number;
  /** Guest count. Named differently so it is not confused with React's children. */
  childCount: number;
  nights: number;
  /** Group blocks covering this range. Choosing one counts as that block's pickup. */
  blocks?: Array<{ code: string; name: string }>;
}) {
  const t = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(createReservationAction, IDLE);
  const [selected, setSelected] = useState<string | null>(null);
  const uid = useId();

  // React 19 empties uncontrolled inputs when an action ends. On failure the values
  // the action returned are re-seeded so guest details are not retyped from scratch.
  const kept = state.status === 'error' ? state.values : undefined;

  const chosen = options.find((o) => optionKey(o) === selected);

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">선택 가능한 객실 타입</caption>
          <thead>
            <tr className="border-b border-current/10 text-left">
              <th scope="col" className="py-2 pr-4 font-medium">
                객실 타입
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                요금제
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                잔여
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                {nights}박 총액
              </th>
              <th scope="col" className="py-2 font-medium">
                선택
              </th>
            </tr>
          </thead>
          <tbody>
            {options.map((option) => {
              const { item, offer } = option;
              const key = optionKey(option);
              const soldOut = item.availableRooms <= 0;
              const active = selected === key;
              const currency = offer?.currency ?? item.currency ?? 'KRW';
              // Packages not included in the rate are already in the total. What was added is still stated.
              const added = (offer?.packages ?? []).filter((pkg) => !pkg.includedInRate);
              const included = (offer?.packages ?? []).filter((pkg) => pkg.includedInRate);

              return (
                <tr
                  key={key}
                  className={`border-b border-current/5 ${soldOut ? 'text-subtle' : ''}`}
                >
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{item.roomTypeCode}</span>
                    {item.roomTypeName && (
                      <span className="ml-1.5 text-subtle">{item.roomTypeName}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {offer?.ratePlanCode ?? item.ratePlanCode ?? '—'}
                    {offer?.ratePlanName && (
                      <span className="ml-1.5 text-xs text-subtle">{offer.ratePlanName}</span>
                    )}
                    {(added.length > 0 || included.length > 0) && (
                      <span className="block text-xs text-subtle">
                        {included.map((pkg) => `${pkg.name} 포함`).join(' · ')}
                        {included.length > 0 && added.length > 0 ? ' · ' : ''}
                        {added.map((pkg) => `${pkg.name} 추가`).join(' · ')}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums">
                    {soldOut ? '매진' : `${item.availableRooms}실`}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatMoney(offer?.totalAmount ?? item.amount, currency)}
                  </td>
                  <td className="py-2.5">
                    {/*
                      매진이어도 고를 수 있게 둔다.
                      손님을 그냥 돌려보내지 않으려면 대기로 받아야 하고,
                      고를 수 없으면 대기 자체가 불가능하다.
                    */}
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected(active ? null : key)}
                      className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                        active ? 'btn-primary' : 'border border-current/20 hover:bg-current/5'
                      }`}
                    >
                      {active ? '선택됨' : soldOut ? '대기로 선택' : '선택'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {chosen ? (
        <form action={action} className="rounded-lg border border-current/10 px-4 py-3">
          <input type="hidden" name="propertyId" value={propertyId} />
          <input type="hidden" name="arrivalDate" value={arrivalDate} />
          <input type="hidden" name="departureDate" value={departureDate} />
          <input type="hidden" name="adults" value={adults} />
          <input type="hidden" name="children" value={childCount} />
          <input type="hidden" name="roomTypeCode" value={chosen.item.roomTypeCode} />
          <input
            type="hidden"
            name="ratePlanCode"
            value={chosen.offer?.ratePlanCode ?? chosen.item.ratePlanCode ?? ''}
          />
          {/* 이 화면에서 만든 예약은 언제나 프런트 채널이다. 고르게 할 이유가 없다. */}
          <input type="hidden" name="channelCode" value="FRONTDESK" />
          {/*
            매진인 타입을 골랐으면 대기로 보낸다.
            OPERA 는 자리가 없으면 예약 자체를 거절하고, 대기로 받으라고 알려 준다.
          */}
          {chosen.item.availableRooms <= 0 && <input type="hidden" name="waitlist" value="true" />}

          <fieldset className="flex flex-wrap items-end gap-2">
            <legend className="mb-2 text-sm font-medium">
              게스트 정보 — {chosen.item.roomTypeCode}
              {chosen.item.roomTypeName && (
                <span className="ml-1.5 text-subtle">{chosen.item.roomTypeName}</span>
              )}
            </legend>

            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-last`} className="text-xs text-subtle">
                성
              </label>
              <input
                id={`${uid}-last`}
                name="lastName"
                required
                maxLength={60}
                placeholder="홍"
                defaultValue={kept?.lastName ?? ''}
                className={control('lg', 'w-28')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-first`} className="text-xs text-subtle">
                이름
              </label>
              <input
                id={`${uid}-first`}
                name="firstName"
                required
                maxLength={60}
                placeholder="길동"
                defaultValue={kept?.firstName ?? ''}
                className={control('lg', 'w-32')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-email`} className="text-xs text-subtle">
                이메일 (선택)
              </label>
              <input
                id={`${uid}-email`}
                name="email"
                type="email"
                placeholder="guest@example.com"
                defaultValue={kept?.email ?? ''}
                className={control('lg', 'w-56')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-source`} className="text-xs text-subtle">
                예약 출처
              </label>
              <select
                id={`${uid}-source`}
                name="sourceCode"
                defaultValue={kept?.sourceCode ?? 'DIRECT'}
                className={control('lg', 'w-32')}
              >
                {Object.entries(t.sourceCodes).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-market`} className="text-xs text-subtle">
                시장 구분
              </label>
              <select
                id={`${uid}-market`}
                name="marketCode"
                defaultValue={kept?.marketCode ?? 'TRANSIENT'}
                className={control('lg', 'w-28')}
              >
                {Object.entries(t.marketCodes).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {blocks.length > 0 && (
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-block`} className="text-xs text-subtle">
                  단체 블록 (선택)
                </label>
                <select
                  id={`${uid}-block`}
                  name="blockCode"
                  defaultValue={kept?.blockCode ?? ''}
                  className={control('lg', 'w-48')}
                >
                  <option value="">일반 예약</option>
                  {blocks.map((block) => (
                    <option key={block.code} value={block.code}>
                      {block.code} — {block.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <SubmitButton pendingLabel="예약 중…">
              {chosen.item.availableRooms <= 0 ? '대기 등록' : '예약 확정'}
            </SubmitButton>
          </fieldset>

          <p className="mt-1.5 text-xs text-subtle">
            최종 확정은 OPERA 가 합니다. 조회 이후 재고가 팔렸다면 거절됩니다 — 그때는 대기로 받을
            수 있습니다. 대기 예약은 재고를 차지하지 않고, 자리가 나면 예약 상세에서 확정합니다.
          </p>
          <ActionMessage state={state} />
        </form>
      ) : (
        <p className="text-sm text-subtle">
          객실 타입을 선택하면 게스트 정보를 입력할 수 있습니다.
        </p>
      )}
    </section>
  );
}
