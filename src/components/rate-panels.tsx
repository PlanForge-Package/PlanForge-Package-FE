'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  createPackageAction,
  createRatePlanAction,
  updatePackageAction,
} from '@/app/(app)/rates/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { useLastAction } from '@/lib/use-last-action';
import { fill, money } from '@/lib/i18n/format';
import { useI18n, useLocale } from '@/lib/i18n/provider';
import type { RatePackage, RatePlanConfig, RoomType } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { control, ghostButton } from './ui';

export const CALCULATIONS = ['PerNight', 'PerStay', 'PerPerson'] as const;

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
  const t = useI18n();
  const locale = useLocale();
  const [state, action] = useActionState<ActionState, FormData>(createRatePlanAction, IDLE);

  return (
    <section aria-label={t.rates.plans} className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">{t.rates.plans}</h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {plans.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-8 text-center text-sm text-subtle">
          {t.rates.emptyPlans}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <caption className="sr-only">{t.rates.planListCaption}</caption>
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.rates.code}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.rates.name}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.rates.sellPeriod}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.rates.baseAmount}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.rates.seasons}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {t.rates.status}
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
                      .map(([code, amount]) => `${code} ${money(amount, locale, plan.currency)}`)
                      .join(' · ')}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-subtle">
                    {fill(t.rates.seasonCount, { count: plan.seasons.length })}
                  </td>
                  <td className="py-2.5 text-subtle">
                    {plan.status === 'Active' ? t.rates.onSale : t.rates.offSale}
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
              {t.rates.code}
              <input
                type="text"
                name="ratePlanCode"
                defaultValue={state.values?.ratePlanCode ?? ''}
                required
                maxLength={20}
                placeholder="PROMO"
                className={control('md', 'w-32 font-mono')}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-subtle">
              {t.rates.name}
              <input
                type="text"
                name="name"
                defaultValue={state.values?.name ?? ''}
                required
                maxLength={120}
                placeholder={t.rates.namePlaceholder}
                className={control('md', 'w-56')}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-subtle">
              {t.rates.sellStart}
              <input
                type="date"
                name="sellStartDate"
                defaultValue={state.values?.sellStartDate ?? ''}
                required
                className={control('md')}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-subtle">
              {t.rates.sellEnd}
              <input
                type="date"
                name="sellEndDate"
                defaultValue={state.values?.sellEndDate ?? ''}
                required
                className={control('md')}
              />
            </label>
          </div>

          <AmountGrid roomTypes={roomTypes} legend={t.rates.baseAmountLegend} />

          {packages.length > 0 && (
            <fieldset className="flex flex-wrap items-center gap-3">
              <legend className="text-xs text-subtle">{t.rates.attachPackages}</legend>
              {packages.map((pkg) => (
                <label key={pkg.packageCode} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="packageCodes" value={pkg.packageCode} />
                  {pkg.name}
                  <span className="text-xs text-subtle">
                    (
                    {t.rates.calculations[pkg.calculation as keyof typeof t.rates.calculations] ??
                      pkg.calculation}{' '}
                    {money(pkg.amount, locale)})
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <div>
            <SubmitButton pendingLabel={t.rates.creating}>{t.rates.createPlan}</SubmitButton>
          </div>
        </form>
      )}

      <p className="text-xs text-subtle">{t.rates.plansNote}</p>
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
  const t = useI18n();
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
            placeholder={t.rates.notSold}
            aria-label={fill(t.rates.amountAria, { code: roomType.code })}
            className={control('md', 'w-36')}
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
  const t = useI18n();
  const locale = useLocale();
  const [createState, createAction] = useActionState<ActionState, FormData>(
    createPackageAction,
    IDLE,
  );
  const [updateState, updateAction] = useActionState<ActionState, FormData>(
    updatePackageAction,
    IDLE,
  );

  // Shows whichever ran last. A fixed priority would hide what was just done.
  const { state: state, mark } = useLastAction({ create: createState, update: updateState });

  return (
    <section aria-label={t.rates.packages} className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
        {t.rates.packages}
      </h2>

      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      {packages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
          {t.rates.emptyPackages}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">{t.rates.packageListCaption}</caption>
            <thead>
              <tr className="border-b border-current/10 text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.rates.code}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.rates.name}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.rates.calculation}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t.rates.transactionCode}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {canManage ? t.rates.amountAndIncluded : t.rates.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.packageCode} className="border-b border-current/5">
                  <td className="py-2.5 pr-4 font-mono text-xs">{pkg.packageCode}</td>
                  <td className="py-2.5 pr-4">{pkg.name}</td>
                  <td className="py-2.5 pr-4 text-subtle">
                    {t.rates.calculations[pkg.calculation as keyof typeof t.rates.calculations] ??
                      pkg.calculation}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-subtle">
                    {pkg.transactionCode}
                  </td>
                  <td className="py-2.5">
                    {canManage ? (
                      <form
                        action={updateAction}
                        onSubmit={mark('update')}
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
                          aria-label={fill(t.rates.amountAria, { code: pkg.packageCode })}
                          className={control('md', 'w-28')}
                        />
                        <label className="flex items-center gap-1 text-xs text-subtle">
                          <input
                            type="checkbox"
                            name="includedInRate"
                            defaultChecked={pkg.includedInRate}
                            aria-label={fill(t.rates.includedAria, { code: pkg.packageCode })}
                          />
                          {t.rates.included}
                        </label>
                        <SubmitButton pendingLabel="…" className={ghostButton()}>
                          {t.rates.save}
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="tabular-nums">
                        {money(pkg.amount, locale)}
                        {pkg.includedInRate && (
                          <span className="ml-1 text-xs text-subtle">{t.rates.included}</span>
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
          onSubmit={mark('create')}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="propertyId" value={propertyId} />

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.rates.code}
            <input
              type="text"
              name="packageCode"
              defaultValue={createState.values?.packageCode ?? ''}
              required
              maxLength={20}
              placeholder="BFAST"
              className={control('md', 'w-28 font-mono')}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.rates.name}
            <input
              type="text"
              name="name"
              defaultValue={createState.values?.name ?? ''}
              required
              maxLength={120}
              placeholder={t.rates.packageNamePlaceholder}
              className={control('md', 'w-40')}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.rates.amount}
            <input
              type="number"
              name="amount"
              min={0}
              step={1}
              defaultValue={createState.values?.amount ?? ''}
              required
              className={control('md', 'w-32')}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.rates.calculation}
            <select
              name="calculation"
              defaultValue={createState.values?.calculation ?? 'PerNight'}
              className={control('md')}
            >
              {CALCULATIONS.map((value) => (
                <option key={value} value={value}>
                  {t.rates.calculations[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-subtle">
            {t.rates.transactionCode}
            <input
              type="text"
              name="transactionCode"
              defaultValue={createState.values?.transactionCode ?? '2000'}
              required
              maxLength={20}
              className={control('md', 'w-24 font-mono')}
            />
          </label>

          <label className="flex items-center gap-1.5 pb-2 text-xs text-subtle">
            <input type="checkbox" name="includedInRate" />
            {t.rates.includedInRate}
          </label>

          <SubmitButton pendingLabel={t.rates.creating}>{t.rates.createPackage}</SubmitButton>
        </form>
      )}

      <p className="text-xs text-subtle">{t.rates.packagesNote}</p>
    </section>
  );
}
