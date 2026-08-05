'use client';

import { useActionState, useId, useState } from 'react';
import { createBlockAction, updateBlockAction } from '@/app/(app)/blocks/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { BlockStatus, RoomType } from '@/lib/types';
import { fill, num } from '@/lib/i18n/format';
import { useI18n, useLocale } from '@/lib/i18n/provider';
import { ActionMessage, SubmitButton } from './action-feedback';
import { control, primaryButton } from './ui';

/** Cancelling needs its own confirmation, so it is left out of this list. */
const EDITABLE_STATUSES: BlockStatus[] = [
  'INQUIRY',
  'TENTATIVE',
  'DEFINITE',
  'ACTUAL',
  'CANCELLED',
];

/**
 * Block creation form.
 *
 * Collapsed because the list is the main screen. Registering a group is not frequent.
 */
export function CreateBlockForm({
  propertyId,
  roomTypes,
}: {
  propertyId: string;
  roomTypes: RoomType[];
}) {
  const t = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(createBlockAction, IDLE);
  const [open, setOpen] = useState(false);
  const uid = useId();

  // React 19 empties uncontrolled inputs when an action ends. On failure the values
  // the action returned are re-seeded as defaultValue so nothing is retyped.
  const kept = state.status === 'error' ? state.values : undefined;
  const keptCounts = (kept?.blocked ?? '').split(',');

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className={primaryButton()}>
          {t.blocks.openForm}
        </button>
        <ActionMessage state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="rounded-lg border border-current/10 px-4 py-3">
      <input type="hidden" name="propertyId" value={propertyId} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">{t.blocks.createTitle}</legend>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-code`} className="text-xs text-subtle">
              {t.blocks.blockCode}
            </label>
            <input
              id={`${uid}-code`}
              name="code"
              required
              maxLength={20}
              pattern="[A-Za-z0-9_-]+"
              placeholder="SPGRP"
              defaultValue={kept?.code ?? ''}
              className={control('lg', 'w-32 font-mono uppercase')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-name`} className="text-xs text-subtle">
              {t.blocks.groupName}
            </label>
            <input
              id={`${uid}-name`}
              name="name"
              required
              maxLength={100}
              placeholder={t.blocks.groupNamePlaceholder}
              defaultValue={kept?.name ?? ''}
              className={control('lg', 'w-64')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-start`} className="text-xs text-subtle">
              {t.blocks.startDate}
            </label>
            <input
              id={`${uid}-start`}
              name="startDate"
              type="date"
              required
              defaultValue={kept?.startDate ?? ''}
              className={control('lg')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-end`} className="text-xs text-subtle">
              {t.blocks.endDate}
            </label>
            <input
              id={`${uid}-end`}
              name="endDate"
              type="date"
              required
              defaultValue={kept?.endDate ?? ''}
              className={control('lg')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-cutoff`} className="text-xs text-subtle">
              {t.blocks.cutoffOptional}
            </label>
            <input
              id={`${uid}-cutoff`}
              name="cutoffDate"
              type="date"
              defaultValue={kept?.cutoffDate ?? ''}
              className={control('lg')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-rate`} className="text-xs text-subtle">
              {t.blocks.ratePlanOptional}
            </label>
            <input
              id={`${uid}-rate`}
              name="ratePlanCode"
              maxLength={20}
              placeholder="CORP"
              defaultValue={kept?.ratePlanCode ?? ''}
              className={control('lg', 'w-28 font-mono uppercase')}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <span className="text-xs text-subtle">{t.blocks.allotmentLegend}</span>
          {roomTypes.map((type, index) => (
            <div key={type.id} className="flex flex-col gap-1">
              <label htmlFor={`${uid}-${type.code}`} className="text-xs text-subtle">
                {type.code}
              </label>
              <input type="hidden" name="roomTypeCode" value={type.code} />
              <input
                id={`${uid}-${type.code}`}
                name="blocked"
                type="number"
                min={0}
                max={999}
                defaultValue={keptCounts[index] ?? 0}
                className={control('lg', 'w-20 tabular-nums')}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <span className="text-xs text-subtle">{t.blocks.negotiatedLegend}</span>
          {roomTypes.map((type) => (
            <div key={type.id} className="flex flex-col gap-1">
              <label htmlFor={`${uid}-amount-${type.code}`} className="text-xs text-subtle">
                {type.code}
              </label>
              <input
                id={`${uid}-amount-${type.code}`}
                name={`amount:${type.code}`}
                type="number"
                min={0}
                step={1}
                placeholder={t.blocks.ratePlanValue}
                className={control('lg', 'w-28 tabular-nums')}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SubmitButton pendingLabel={t.blocks.creating}>{t.blocks.create}</SubmitButton>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-current/20 px-3 py-1.5 text-sm transition-colors hover:bg-current/5"
          >
            {t.common.close}
          </button>
        </div>
      </fieldset>

      <p className="mt-1.5 text-xs text-subtle">{t.blocks.createNote}</p>
      <ActionMessage state={state} />
    </form>
  );
}

/**
 * Block status and cutoff editing.
 *
 * Status and cutoff share one form because both are one decision: how long to hold
 * this group. Kept apart, a block gets confirmed and its cutoff forgotten.
 */
export function BlockEditor({
  blockId,
  status,
  name,
  cutoffDate,
  rates = [],
}: {
  blockId: string;
  status: BlockStatus;
  name: string;
  cutoffDate: string | null;
  /** Current negotiated rates per room type. A blank box is left alone. */
  rates?: Array<{ roomTypeCode: string; amount: string | null }>;
}) {
  const t = useI18n();
  const locale = useLocale();
  const [state, action] = useActionState<ActionState, FormData>(updateBlockAction, IDLE);
  const uid = useId();

  return (
    <form action={action} className="rounded-lg border border-current/10 px-4 py-3">
      <input type="hidden" name="blockId" value={blockId} />

      <fieldset className="flex flex-wrap items-end gap-2">
        <legend className="mb-2 text-sm font-medium">{t.blocks.editTitle}</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-name`} className="text-xs text-subtle">
            {t.blocks.name}
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            defaultValue={name}
            maxLength={100}
            className={control('lg', 'w-64')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-status`} className="text-xs text-subtle">
            {t.blocks.status}
          </label>
          <select
            id={`${uid}-status`}
            name="status"
            defaultValue={status}
            className={control('lg')}
          >
            {EDITABLE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t.blockStatus[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-cutoff`} className="text-xs text-subtle">
            {t.blocks.cutoff}
          </label>
          <input
            id={`${uid}-cutoff`}
            name="cutoffDate"
            type="date"
            defaultValue={cutoffDate?.slice(0, 10) ?? ''}
            className={control('lg')}
          />
        </div>

        {rates.map((rate) => (
          <div key={rate.roomTypeCode} className="flex flex-col gap-1">
            <label htmlFor={`${uid}-rate-${rate.roomTypeCode}`} className="text-xs text-subtle">
              {fill(t.blocks.negotiatedFor, { roomType: rate.roomTypeCode })}
            </label>
            <input
              id={`${uid}-rate-${rate.roomTypeCode}`}
              name={`rate:${rate.roomTypeCode}`}
              type="number"
              min={0}
              step={1}
              placeholder={rate.amount ? num(Number(rate.amount), locale) : t.blocks.ratePlanValue}
              className={control('lg', 'w-28 tabular-nums')}
            />
          </div>
        ))}

        <SubmitButton pendingLabel={t.blocks.saving}>{t.blocks.save}</SubmitButton>
      </fieldset>

      <p className="mt-1.5 text-xs text-subtle">{t.blocks.editNote}</p>
      <ActionMessage state={state} />
    </form>
  );
}
