'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import {
  createPackageAction,
  createRatePlanAction,
  updatePackageAction,
} from '@/app/(app)/rates/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { RatePackage, RatePlanConfig, RoomType } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

export const CALCULATION_LABELS: Record<string, string> = {
  PerNight: '1박당',
  PerStay: '투숙당 1회',
  PerPerson: '1인 1박당',
};

const inputClass =
  'rounded-md border border-current/20 bg-transparent px-2 py-1.5 text-sm text-ink';
const smallButton =
  'rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50';

export function money(amount: number, currency = 'KRW'): string {
  if (!Number.isFinite(amount)) return '—';
  return currency === 'KRW'
    ? `${amount.toLocaleString('ko-KR')}원`
    : `${amount.toLocaleString('ko-KR')} ${currency}`;
}

/** Rate code list and registration. */
export function RatePlansPanel({
  propertyId,
  plans,
  roomTypes,
  packages,
  canManage,
}: {
  propertyId: string;
  plans: RatePlanConfig[];
  roomTypes: RoomType[];
  packages: RatePackage[];
  canManage: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createRatePlanAction, IDLE);

  return (
    <section aria-label="요금 코드" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">요금 코드</h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {plans.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-8 text-center text-sm text-subtle">
          등록된 요금 코드가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <caption className="sr-only">요금 코드 목록</caption>
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  코드
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  이름
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  판매 기간
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  기준 요금
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  시즌
                </th>
                <th scope="col" className="py-2 font-medium">
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.ratePlanCode} className="border-b border-current/5">
                  <td className="py-2.5 pr-4 font-mono text-xs">
                    <Link
                      href={`/rates/${encodeURIComponent(plan.ratePlanCode)}`}
                      className="underline underline-offset-4"
                    >
                      {plan.ratePlanCode}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4">{plan.name}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-subtle">
                    {plan.sellStartDate} ~ {plan.sellEndDate}
                  </td>
                  <td className="py-2.5 pr-4 text-xs tabular-nums text-subtle">
                    {Object.entries(plan.baseAmounts)
                      .map(([code, amount]) => `${code} ${money(amount, plan.currency)}`)
                      .join(' · ')}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-subtle">{plan.seasons.length}개</td>
                  <td className="py-2.5 text-subtle">
                    {plan.status === 'Active' ? '판매 중' : '중지'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <form
          action={action}
          className="flex flex-col gap-3 rounded-lg border border-current/10 px-4 py-3"
        >
          <input type="hidden" name="propertyId" value={propertyId} />

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-subtle">
              코드
              <input
                type="text"
                name="ratePlanCode"
                defaultValue={state.values?.ratePlanCode ?? ''}
                required
                maxLength={20}
                placeholder="PROMO"
                className={`w-32 font-mono ${inputClass}`}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-subtle">
              이름
              <input
                type="text"
                name="name"
                defaultValue={state.values?.name ?? ''}
                required
                maxLength={120}
                placeholder="여름 프로모션"
                className={`w-56 ${inputClass}`}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-subtle">
              판매 시작
              <input
                type="date"
                name="sellStartDate"
                defaultValue={state.values?.sellStartDate ?? ''}
                required
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-subtle">
              판매 종료
              <input
                type="date"
                name="sellEndDate"
                defaultValue={state.values?.sellEndDate ?? ''}
                required
                className={inputClass}
              />
            </label>
          </div>

          <AmountGrid roomTypes={roomTypes} legend="객실 타입별 기준 요금" />

          {packages.length > 0 && (
            <fieldset className="flex flex-wrap items-center gap-3">
              <legend className="text-xs text-subtle">붙일 패키지</legend>
              {packages.map((pkg) => (
                <label key={pkg.packageCode} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="packageCodes" value={pkg.packageCode} />
                  {pkg.name}
                  <span className="text-xs text-subtle">
                    ({CALCULATION_LABELS[pkg.calculation] ?? pkg.calculation} {money(pkg.amount)})
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <div>
            <SubmitButton pendingLabel="만드는 중…">요금 코드 만들기</SubmitButton>
          </div>
        </form>
      )}

      <p className="text-xs text-subtle">
        비워 둔 객실 타입은 그 요금으로 팔지 않습니다. 요금은 OPERA 가 정하고, 이 화면은 그 설정을
        고칠 뿐입니다.
      </p>
    </section>
  );
}

/** Room type and amount inputs. Registration and editing share one shape. */
export function AmountGrid({
  roomTypes,
  legend,
  values = {},
}: {
  roomTypes: RoomType[];
  legend: string;
  values?: Record<string, number>;
}) {
  return (
    <fieldset className="flex flex-wrap items-end gap-2">
      <legend className="text-xs text-subtle">{legend}</legend>
      {roomTypes.map((roomType) => (
        <label key={roomType.id} className="flex flex-col gap-1 text-xs text-subtle">
          {roomType.code}
          <input
            type="number"
            name={`amount:${roomType.code}`}
            min={0}
            step={1}
            defaultValue={values[roomType.code] ?? ''}
            placeholder="팔지 않음"
            aria-label={`${roomType.code} 금액`}
            className={`w-36 ${inputClass}`}
          />
        </label>
      ))}
    </fieldset>
  );
}

/** Package list, registration and editing. */
export function PackagesPanel({
  propertyId,
  packages,
  canManage,
}: {
  propertyId: string;
  packages: RatePackage[];
  canManage: boolean;
}) {
  const [createState, createAction] = useActionState<ActionState, FormData>(
    createPackageAction,
    IDLE,
  );
  const [updateState, updateAction] = useActionState<ActionState, FormData>(
    updatePackageAction,
    IDLE,
  );

  // Shows whichever ran last. A fixed priority would hide what was just done.
  const [last, setLast] = useState<'create' | 'update' | null>(null);
  const state = last === 'update' ? updateState : last === 'create' ? createState : IDLE;

  return (
    <section aria-label="패키지" className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">패키지</h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {packages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          등록된 패키지가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">패키지 목록</caption>
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  코드
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  이름
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  계산
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  거래 코드
                </th>
                <th scope="col" className="py-2 font-medium">
                  {canManage ? '금액 · 포함' : '금액'}
                </th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.packageCode} className="border-b border-current/5">
                  <td className="py-2.5 pr-4 font-mono text-xs">{pkg.packageCode}</td>
                  <td className="py-2.5 pr-4">{pkg.name}</td>
                  <td className="py-2.5 pr-4 text-subtle">
                    {CALCULATION_LABELS[pkg.calculation] ?? pkg.calculation}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-subtle">
                    {pkg.transactionCode}
                  </td>
                  <td className="py-2.5">
                    {canManage ? (
                      <form
                        action={updateAction}
                        onSubmit={() => setLast('update')}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="propertyId" value={propertyId} />
                        <input type="hidden" name="packageCode" value={pkg.packageCode} />
                        <input
                          type="number"
                          name="amount"
                          min={0}
                          step={1}
                          defaultValue={pkg.amount}
                          required
                          aria-label={`${pkg.packageCode} 금액`}
                          className={`w-28 ${inputClass}`}
                        />
                        <label className="flex items-center gap-1 text-xs text-subtle">
                          <input
                            type="checkbox"
                            name="includedInRate"
                            defaultChecked={pkg.includedInRate}
                            aria-label={`${pkg.packageCode} 요금에 포함`}
                          />
                          포함
                        </label>
                        <SubmitButton pendingLabel="…" className={smallButton}>
                          저장
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="tabular-nums">
                        {money(pkg.amount)}
                        {pkg.includedInRate && (
                          <span className="ml-1 text-xs text-subtle">포함</span>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <form
          action={createAction}
          onSubmit={() => setLast('create')}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="propertyId" value={propertyId} />

          <label className="flex flex-col gap-1 text-xs text-subtle">
            코드
            <input
              type="text"
              name="packageCode"
              defaultValue={createState.values?.packageCode ?? ''}
              required
              maxLength={20}
              placeholder="BFAST"
              className={`w-28 font-mono ${inputClass}`}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            이름
            <input
              type="text"
              name="name"
              defaultValue={createState.values?.name ?? ''}
              required
              maxLength={120}
              placeholder="조식"
              className={`w-40 ${inputClass}`}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            금액
            <input
              type="number"
              name="amount"
              min={0}
              step={1}
              defaultValue={createState.values?.amount ?? ''}
              required
              className={`w-32 ${inputClass}`}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            계산
            <select
              name="calculation"
              defaultValue={createState.values?.calculation ?? 'PerNight'}
              className={inputClass}
            >
              {Object.entries(CALCULATION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            거래 코드
            <input
              type="text"
              name="transactionCode"
              defaultValue={createState.values?.transactionCode ?? '2000'}
              required
              maxLength={20}
              className={`w-24 font-mono ${inputClass}`}
            />
          </label>

          <label className="flex items-center gap-1.5 pb-2 text-xs text-subtle">
            <input type="checkbox" name="includedInRate" />
            요금에 포함
          </label>

          <SubmitButton pendingLabel="만드는 중…">패키지 만들기</SubmitButton>
        </form>
      )}

      <p className="text-xs text-subtle">
        요금에 포함이면 총액이 늘지 않습니다 — 조식 포함 요금이 그렇습니다. 포함이 아니면 그만큼 더
        청구됩니다.
      </p>
    </section>
  );
}
