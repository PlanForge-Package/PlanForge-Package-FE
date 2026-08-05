'use client';

import { useActionState } from 'react';
import {
  addSeasonAction,
  removeSeasonAction,
  updateRatePlanAction,
} from '@/app/(app)/rates/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { useLastAction } from '@/lib/use-last-action';
import { money } from '@/lib/i18n/format';
import { useI18n, useLocale } from '@/lib/i18n/provider';
import type { RatePackage, RatePlanConfig, RoomType } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { Figure } from './field';
import { AmountGrid } from './rate-panels';
import { control, ghostButton } from './ui';

/**
 * Edits a single rate code.
 *
 * Base rate, selling period and deactivation share one form; seasons are added and
 * removed separately. A season overrides the base rate, so one form would blur what changes.
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
  const t = useI18n();
  const locale = useLocale();
  const dayNames = t.rates.dayNames;
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

  const { state: state, mark } = useLastAction({
    plan: planState,
    season: seasonState,
    remove: removeState,
  });

  return (
    <div className="flex flex-col gap-8">
      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      <section aria-label={t.rates.settings} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
          {t.rates.basicSettings}
        </h2>

        {canManage ? (
          <form
            action={planAction}
            onSubmit={mark('plan')}
            className="flex flex-col gap-3 rounded-lg border border-current/10 px-4 py-3"
          >
            <input type="hidden" name="propertyId" value={propertyId} />
            {/* Tells no package chosen apart from the field being absent from the form. */}
            <input type="hidden" name="packagesSubmitted" value="1" />

            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-subtle">
                {t.rates.name}
                <input
                  type="text"
                  name="name"
                  defaultValue={plan.name}
                  required
                  maxLength={120}
                  className={control('md', 'w-56')}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-subtle">
                {t.rates.sellStart}
                <input
                  type="date"
                  name="sellStartDate"
                  defaultValue={plan.sellStartDate}
                  required
                  className={control('md')}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-subtle">
                {t.rates.sellEnd}
                <input
                  type="date"
                  name="sellEndDate"
                  defaultValue={plan.sellEndDate}
                  required
                  className={control('md')}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-subtle">
                {t.rates.status}
                <select name="status" defaultValue={plan.status} className={control('md')}>
                  <option value="Active">{t.rates.onSale}</option>
                  <option value="Inactive">{t.rates.offSale}</option>
                </select>
              </label>
            </div>

            <AmountGrid
              roomTypes={roomTypes}
              legend={t.rates.baseAmountLegend}
              values={plan.baseAmounts}
            />

            {packages.length > 0 && (
              <fieldset className="flex flex-wrap items-center gap-3">
                <legend className="text-xs text-subtle">{t.rates.attachPackages}</legend>
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
                      (
                      {t.rates.calculations[pkg.calculation as keyof typeof t.rates.calculations] ??
                        pkg.calculation}{' '}
                      {money(pkg.amount, locale)}
                      {pkg.includedInRate ? t.rates.includedSuffix : ''})
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            <div>
              <SubmitButton pendingLabel={t.rates.saving}>{t.rates.save}</SubmitButton>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure
              label={t.rates.sellPeriod}
              value={`${plan.sellStartDate} ~ ${plan.sellEndDate}`}
            />
            <Figure
              label={t.rates.status}
              value={plan.status === 'Active' ? t.rates.onSale : t.rates.offSale}
            />
            <Figure label={t.rates.marketCode} value={plan.marketCode} />
            <Figure label={t.rates.currency} value={plan.currency} />
          </dl>
        )}
      </section>

      <section aria-label={t.rates.seasonSection} className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
          {t.rates.seasonRates}
        </h2>

        {plan.seasons.length === 0 ? (
          <p className="rounded-lg border border-dashed border-current/20 px-4 py-6 text-center text-sm text-subtle">
            {t.rates.noSeasons}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <caption className="sr-only">{t.rates.seasonListCaption}</caption>
              <thead>
                <tr className="border-b border-current/10 text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.rates.name}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.rates.period}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.rates.weekdays}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    {t.rates.rate}
                  </th>
                  {canManage && (
                    <th scope="col" className="py-2 font-medium">
                      {t.rates.remove}
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
                        ? season.daysOfWeek.map((day) => dayNames[day]).join('·')
                        : t.rates.everyDay}
                    </td>
                    <td className="py-2.5 pr-4 text-xs tabular-nums text-subtle">
                      {Object.entries(season.amounts)
                        .map(([code, amount]) => `${code} ${money(amount, locale, plan.currency)}`)
                        .join(' · ')}
                    </td>
                    {canManage && (
                      <td className="py-2.5">
                        <form action={removeAction} onSubmit={mark('remove')}>
                          <input type="hidden" name="propertyId" value={propertyId} />
                          <input type="hidden" name="seasonId" value={season.seasonId} />
                          <SubmitButton pendingLabel="…" className={ghostButton()}>
                            {t.rates.remove}
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
            onSubmit={mark('season')}
            className="flex flex-col gap-3 rounded-lg border border-current/10 px-4 py-3"
          >
            <input type="hidden" name="propertyId" value={propertyId} />

            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-subtle">
                {t.rates.seasonName}
                <input
                  type="text"
                  name="name"
                  defaultValue={seasonState.values?.name ?? ''}
                  required
                  maxLength={120}
                  placeholder={t.rates.seasonNamePlaceholder}
                  className={control('md', 'w-48')}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-subtle">
                {t.rates.start}
                <input
                  type="date"
                  name="startDate"
                  defaultValue={seasonState.values?.startDate ?? ''}
                  required
                  className={control('md')}
                />
              </label>

              <label className="flex flex-col gap-1 text-xs text-subtle">
                {t.rates.end}
                <input
                  type="date"
                  name="endDate"
                  defaultValue={seasonState.values?.endDate ?? ''}
                  required
                  className={control('md')}
                />
              </label>
            </div>

            <fieldset className="flex flex-wrap items-center gap-3">
              <legend className="text-xs text-subtle">{t.rates.weekdaysLegend}</legend>
              {dayNames.map((label, day) => (
                <label key={label} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="daysOfWeek" value={day} />
                  {label}
                </label>
              ))}
            </fieldset>

            <AmountGrid roomTypes={roomTypes} legend={t.rates.seasonAmountLegend} />

            <div>
              <SubmitButton pendingLabel={t.rates.addingSeason}>{t.rates.addSeason}</SubmitButton>
            </div>
          </form>
        )}

        <p className="text-xs text-subtle">{t.rates.seasonsNote}</p>
      </section>
    </div>
  );
}
