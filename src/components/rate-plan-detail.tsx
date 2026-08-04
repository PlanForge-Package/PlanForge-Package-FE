'use client';

import { useActionState, useState } from 'react';
import {
  addSeasonAction,
  removeSeasonAction,
  updateRatePlanAction,
} from '@/app/(app)/rates/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { RatePackage, RatePlanConfig, RoomType } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { AmountGrid, CALCULATION_LABELS, money } from './rate-panels';

const inputClass =
  'rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink';
const smallButton =
  'rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 요금 코드 하나를 고친다.
 *
 * 기준 요금·판매 기간·중지는 한 폼에서, 시즌은 따로 넣고 뺀다. 시즌이 기준
 * 요금을 덮어쓰므로 둘을 같은 폼에 두면 무엇을 바꾸는지 흐려진다.
 */
export function RatePlanDetail({
  propertyId,
  plan,
  roomTypes,
  packages,
  canManage,
}: {
  propertyId: string;
  plan: RatePlanConfig;
  roomTypes: RoomType[];
  packages: RatePackage[];
  canManage: boolean;
}) {
  const [planState, planAction] = useActionState<ActionState, FormData>(
    updateRatePlanAction.bind(null, plan.ratePlanCode),
    IDLE,
  );
  const [seasonState, seasonAction] = useActionState<ActionState, FormData>(
    addSeasonAction.bind(null, plan.ratePlanCode),
    IDLE,
  );
  const [removeState, removeAction] = useActionState<ActionState, FormData>(
    removeSeasonAction.bind(null, plan.ratePlanCode),
    IDLE,
  );

  const [last, setLast] = useState<'plan' | 'season' | 'remove' | null>(null);
  const state =
    last === 'remove'
      ? removeState
      : last === 'season'
        ? seasonState
        : last === 'plan'
          ? planState
          : IDLE;

  return (
    <div className="flex flex-col gap-8">
      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      <section aria-label="요금 설정" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">기본 설정</h2>

        {canManage ? (
          <form
            action={planAction}
            onSubmit={() => setLast('plan')}
            className="flex flex-col gap-3 rounded-lg border border-current/10 px-4 py-3"
          >
            <input type="hidden" name="propertyId" value={propertyId} />
            {/* 패키지를 하나도 고르지 않은 것과 폼에 없는 것을 구분한다. */}
            <input type="hidden" name="packagesSubmitted" value="1" />

            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-subtle">
                이름
                <input
                  type="text"
                  name="name"
                  defaultValue={plan.name}
                  required
                  maxLength={120}
                  className={`w-56 ${inputClass}`}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-subtle">
                판매 시작
                <input
                  type="date"
                  name="sellStartDate"
                  defaultValue={plan.sellStartDate}
                  required
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-subtle">
                판매 종료
                <input
                  type="date"
                  name="sellEndDate"
                  defaultValue={plan.sellEndDate}
                  required
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-subtle">
                상태
                <select name="status" defaultValue={plan.status} className={inputClass}>
                  <option value="Active">판매 중</option>
                  <option value="Inactive">중지</option>
                </select>
              </label>
            </div>

            <AmountGrid
              roomTypes={roomTypes}
              legend="객실 타입별 기준 요금"
              values={plan.baseAmounts}
            />

            {packages.length > 0 && (
              <fieldset className="flex flex-wrap items-center gap-3">
                <legend className="text-xs text-subtle">붙일 패키지</legend>
                {packages.map((pkg) => (
                  <label key={pkg.packageCode} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="packageCodes"
                      value={pkg.packageCode}
                      defaultChecked={plan.packageCodes.includes(pkg.packageCode)}
                    />
                    {pkg.name}
                    <span className="text-xs text-subtle">
                      ({CALCULATION_LABELS[pkg.calculation] ?? pkg.calculation} {money(pkg.amount)}
                      {pkg.includedInRate ? ' · 포함' : ''})
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            <div>
              <SubmitButton pendingLabel="저장 중…">저장</SubmitButton>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure label="판매 기간" value={`${plan.sellStartDate} ~ ${plan.sellEndDate}`} />
            <Figure label="상태" value={plan.status === 'Active' ? '판매 중' : '중지'} />
            <Figure label="시장 구분" value={plan.marketCode} />
            <Figure label="통화" value={plan.currency} />
          </dl>
        )}
      </section>

      <section aria-label="시즌" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">시즌 요금</h2>

        {plan.seasons.length === 0 ? (
          <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
            시즌이 없습니다. 모든 날짜에 기준 요금이 적용됩니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <caption className="sr-only">시즌 목록</caption>
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    이름
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    기간
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    요일
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    요금
                  </th>
                  {canManage && (
                    <th scope="col" className="py-2 font-medium">
                      지우기
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {plan.seasons.map((season) => (
                  <tr key={season.seasonId} className="border-b border-current/5">
                    <td className="py-2.5 pr-4">{season.name}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-subtle">
                      {season.startDate} ~ {season.endDate}
                    </td>
                    <td className="py-2.5 pr-4 text-subtle">
                      {season.daysOfWeek?.length
                        ? season.daysOfWeek.map((day) => DAY_LABELS[day]).join('·')
                        : '매일'}
                    </td>
                    <td className="py-2.5 pr-4 text-xs tabular-nums text-subtle">
                      {Object.entries(season.amounts)
                        .map(([code, amount]) => `${code} ${money(amount, plan.currency)}`)
                        .join(' · ')}
                    </td>
                    {canManage && (
                      <td className="py-2.5">
                        <form action={removeAction} onSubmit={() => setLast('remove')}>
                          <input type="hidden" name="propertyId" value={propertyId} />
                          <input type="hidden" name="seasonId" value={season.seasonId} />
                          <SubmitButton pendingLabel="…" className={smallButton}>
                            지우기
                          </SubmitButton>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canManage && (
          <form
            action={seasonAction}
            onSubmit={() => setLast('season')}
            className="flex flex-col gap-3 rounded-lg border border-current/10 px-4 py-3"
          >
            <input type="hidden" name="propertyId" value={propertyId} />

            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-subtle">
                시즌 이름
                <input
                  type="text"
                  name="name"
                  defaultValue={seasonState.values?.name ?? ''}
                  required
                  maxLength={120}
                  placeholder="성수기 주말"
                  className={`w-48 ${inputClass}`}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-subtle">
                시작
                <input
                  type="date"
                  name="startDate"
                  defaultValue={seasonState.values?.startDate ?? ''}
                  required
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-subtle">
                종료
                <input
                  type="date"
                  name="endDate"
                  defaultValue={seasonState.values?.endDate ?? ''}
                  required
                  className={inputClass}
                />
              </label>
            </div>

            <fieldset className="flex flex-wrap items-center gap-3">
              <legend className="text-xs text-subtle">요일 (비우면 매일)</legend>
              {DAY_LABELS.map((label, day) => (
                <label key={label} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="daysOfWeek" value={day} />
                  {label}
                </label>
              ))}
            </fieldset>

            <AmountGrid roomTypes={roomTypes} legend="시즌 요금" />

            <div>
              <SubmitButton pendingLabel="넣는 중…">시즌 넣기</SubmitButton>
            </div>
          </form>
        )}

        <p className="text-xs text-subtle">
          같은 날 같은 객실에 두 시즌을 걸 수 없습니다 — 성수기 주중·주말처럼 요일을 나눠 등록해
          주세요. 겹치도록 두면 무엇이 이기는지가 등록 순서에 달립니다.
        </p>
      </section>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-current/10 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-subtle">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
