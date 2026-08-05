'use client';

import { useActionState } from 'react';
import { mergeProfileAction, updateProfileAction } from '@/app/(app)/profiles/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { fill } from '@/lib/i18n/format';
import { useI18n } from '@/lib/i18n/provider';
import { PREFERENCE_CODES, profileName } from '@/lib/profile-labels';
import type { DuplicateCandidate, MembershipTier, ProfileDetail } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

const inputClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';
const TIERS: MembershipTier[] = ['NONE', 'SILVER', 'GOLD', 'PLATINUM'];

export function ProfileEditor({ profile }: { profile: ProfileDetail }) {
  const t = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(updateProfileAction, IDLE);

  // On failure the values the action returned are re-seeded. React 19 empties
  // uncontrolled inputs when an action ends, losing the whole edit otherwise.
  const kept = state.status === 'error' ? state.values : undefined;

  return (
    <form action={action} className="rounded-lg border border-current/10 px-4 py-3">
      <input type="hidden" name="profileId" value={profile.id} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">{t.profiles.editTitle}</legend>

        <div className="flex flex-wrap items-end gap-2">
          <Field
            label={t.profiles.lastName}
            name="lastName"
            defaultValue={kept?.lastName ?? profile.lastName}
          />
          <Field
            label={t.profiles.firstName}
            name="firstName"
            defaultValue={kept?.firstName ?? profile.firstName}
          />
          <Field
            label={t.profiles.company}
            name="companyName"
            width="w-48"
            defaultValue={kept?.companyName ?? profile.companyName}
          />
          <Field
            label={t.profiles.email}
            name="email"
            type="email"
            width="w-56"
            defaultValue={kept?.email ?? profile.email}
          />
          <Field
            label={t.profiles.phone}
            name="phone"
            defaultValue={kept?.phone ?? profile.phone}
          />
          <Field
            label={t.profiles.nationality}
            name="nationality"
            width="w-20"
            placeholder="KR"
            defaultValue={kept?.nationality ?? profile.nationality}
          />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Field
            label={t.profiles.membershipNumber}
            name="membershipNumber"
            defaultValue={kept?.membershipNumber ?? profile.membershipNumber}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="membershipTier" className="text-xs text-subtle">
              {t.profiles.tier}
            </label>
            <select
              id="membershipTier"
              name="membershipTier"
              defaultValue={profile.membershipTier}
              className={inputClass}
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {t.profiles.tiers[tier]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-1.5 py-2 text-sm">
            <input type="checkbox" name="vip" defaultChecked={profile.vip} />
            VIP
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-subtle">
            {t.profiles.preferencesLegend}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {PREFERENCE_CODES.map((code) => (
              <label key={code} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="preferences"
                  value={code}
                  defaultChecked={profile.preferences.includes(code)}
                />
                {t.profiles.preferenceCodes[
                  code as keyof typeof t.profiles.preferenceCodes
                ] ?? code}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-xs text-subtle">
            {t.profiles.notesLegend}
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={1000}
            defaultValue={kept?.notes ?? profile.notes ?? ''}
            className={`w-full ${inputClass}`}
          />
        </div>

        <div>
          <SubmitButton pendingLabel={t.profiles.saving}>{t.profiles.save}</SubmitButton>
        </div>
      </fieldset>

      <ActionMessage state={state} />
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  width = 'w-32',
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string | null | undefined;
  type?: string;
  width?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-xs text-subtle">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        className={`${width} ${inputClass}`}
      />
    </div>
  );
}

/**
 * Duplicate candidates and merging.
 *
 * Nothing is merged automatically — different people share names often, and a bad
 * merge mixes stay history and preferences. Evidence is shown; a person decides.
 */
export function DuplicatePanel({
  profileId,
  candidates,
  canMerge,
}: {
  profileId: string;
  candidates: DuplicateCandidate[];
  /** A merge is hard to undo. Managers and above only. */
  canMerge: boolean;
}) {
  const t = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(mergeProfileAction, IDLE);

  if (candidates.length === 0) {
    return <p className="text-sm text-subtle">{t.profiles.noDuplicates}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div aria-live="polite">
        <ActionMessage state={state} />
      </div>

      <ul className="flex flex-col gap-2">
        {candidates.map(({ profile, reasons }) => (
          <li
            key={profile.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-current/10 px-4 py-3 text-sm"
          >
            <span className="font-medium">{profileName(profile, t.profiles.unnamed)}</span>
            <span className="text-subtle">{profile.email ?? t.profiles.noEmail}</span>
            <span className="text-subtle">{profile.phone ?? t.profiles.noPhone}</span>
            <span className="flex flex-wrap gap-1">
              {reasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300"
                >
                  {t.profiles.duplicateReasons[reason]}
                </span>
              ))}
            </span>

            {canMerge && (
              <form action={action} className="ml-auto flex items-center gap-1.5">
                {/* Merges the profile being viewed into the candidate. The candidate survives. */}
                <input type="hidden" name="sourceId" value={profileId} />
                <input type="hidden" name="targetId" value={profile.id} />
                <SubmitButton
                  pendingLabel={t.profiles.merging}
                  confirm={fill(t.profiles.mergeConfirm, {
                    name: profileName(profile, t.profiles.unnamed),
                  })}
                  className="rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:opacity-50"
                >
                  {t.profiles.mergeInto}
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
