'use client';

import { useActionState, useId, useState } from 'react';
import { createReservationAction } from '@/app/(app)/reservations/new/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { MARKET_LABELS, SOURCE_LABELS } from '@/lib/channel-labels';
import type { AvailabilityItem, RateOffer } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

const inputClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';

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

/**
 * 재고 목록에서 객실 타입을 고르고 게스트 정보를 넣어 예약을 만든다.
 *
 * 요금과 재고는 이미 OPERA 가 준 값이므로 여기서 다시 계산하지 않는다. 화면은
 * 받은 값을 보여주고, 최종 확정도 OPERA 가 한다 — 조회 시점과 생성 시점 사이에
 * 재고가 팔릴 수 있어, 여기 숫자는 참고용이지 보장이 아니다.
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
  /** 게스트 인원. React 의 children 과 헷갈리지 않도록 이름을 달리한다. */
  childCount: number;
  nights: number;
  /** 이 기간에 걸리는 단체 블록. 고르면 그 블록의 픽업으로 잡힌다. */
  blocks?: Array<{ code: string; name: string }>;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createReservationAction, IDLE);
  const [selected, setSelected] = useState<string | null>(null);
  const uid = useId();

  // React 19 는 액션이 끝나면 비제어 입력을 비운다. 실패했을 때는 액션이
  // 돌려준 값을 다시 심어야 게스트 정보를 처음부터 타이핑하지 않는다.
  const kept = state.status === 'error' ? state.values : undefined;

  const chosen = options.find((o) => o.item.roomTypeCode === selected);

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
            {options.map(({ item, offer }) => {
              const soldOut = item.availableRooms <= 0;
              const active = selected === item.roomTypeCode;
              const currency = offer?.currency ?? item.currency ?? 'KRW';

              return (
                <tr
                  key={item.roomTypeCode}
                  className={`border-b border-current/5 ${soldOut ? 'text-subtle' : ''}`}
                >
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{item.roomTypeCode}</span>
                    {item.roomTypeName && (
                      <span className="ml-1.5 text-subtle">{item.roomTypeName}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">{offer?.ratePlanCode ?? item.ratePlanCode ?? '—'}</td>
                  <td className="py-2.5 pr-4 tabular-nums">
                    {soldOut ? '매진' : `${item.availableRooms}실`}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatMoney(offer?.totalAmount ?? item.amount, currency)}
                  </td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      disabled={soldOut}
                      aria-pressed={active}
                      onClick={() => setSelected(active ? null : item.roomTypeCode)}
                      className={`rounded-md px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        active ? 'btn-primary' : 'border border-current/20 hover:bg-current/5'
                      }`}
                    >
                      {active ? '선택됨' : '선택'}
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
                className={`w-28 ${inputClass}`}
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
                className={`w-32 ${inputClass}`}
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
                className={`w-56 ${inputClass}`}
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
                className={`w-32 ${inputClass}`}
              >
                {Object.entries(SOURCE_LABELS).map(([code, name]) => (
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
                className={`w-28 ${inputClass}`}
              >
                {Object.entries(MARKET_LABELS).map(([code, name]) => (
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
                  className={`w-48 ${inputClass}`}
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

            <SubmitButton pendingLabel="예약 중…">예약 확정</SubmitButton>
          </fieldset>

          <p className="mt-1.5 text-xs text-subtle">
            최종 확정은 OPERA 가 합니다. 조회 이후 재고가 팔렸다면 거절될 수 있습니다.
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
