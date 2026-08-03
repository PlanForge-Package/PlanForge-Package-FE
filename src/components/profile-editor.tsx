'use client';

import { useActionState } from 'react';
import { mergeProfileAction, updateProfileAction } from '@/app/(app)/profiles/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import {
  DUPLICATE_REASON_LABELS,
  PREFERENCE_CODES,
  PREFERENCE_LABELS,
  TIER_LABELS,
  profileName,
} from '@/lib/profile-labels';
import type { DuplicateCandidate, MembershipTier, ProfileDetail } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

const inputClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';
const TIERS = Object.keys(TIER_LABELS) as MembershipTier[];

export function ProfileEditor({ profile }: { profile: ProfileDetail }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfileAction, IDLE);

  // 실패하면 액션이 돌려준 값을 다시 심는다. React 19 는 액션이 끝나면 비제어
  // 입력을 비우므로, 그대로 두면 고치던 내용이 통째로 사라진다.
  const kept = state.status === 'error' ? state.values : undefined;

  return (
    <form action={action} className="rounded-lg border border-current/10 px-4 py-3">
      <input type="hidden" name="profileId" value={profile.id} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">프로필 수정</legend>

        <div className="flex flex-wrap items-end gap-2">
          <Field label="성" name="lastName" defaultValue={kept?.lastName ?? profile.lastName} />
          <Field
            label="이름"
            name="firstName"
            defaultValue={kept?.firstName ?? profile.firstName}
          />
          <Field
            label="회사"
            name="companyName"
            width="w-48"
            defaultValue={kept?.companyName ?? profile.companyName}
          />
          <Field
            label="이메일"
            name="email"
            type="email"
            width="w-56"
            defaultValue={kept?.email ?? profile.email}
          />
          <Field label="전화" name="phone" defaultValue={kept?.phone ?? profile.phone} />
          <Field
            label="국적"
            name="nationality"
            width="w-20"
            placeholder="KR"
            defaultValue={kept?.nationality ?? profile.nationality}
          />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="멤버십 번호"
            name="membershipNumber"
            defaultValue={kept?.membershipNumber ?? profile.membershipNumber}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="membershipTier" className="text-xs text-subtle">
              등급
            </label>
            <select
              id="membershipTier"
              name="membershipTier"
              defaultValue={profile.membershipTier}
              className={inputClass}
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {TIER_LABELS[tier]}
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
            선호 사항 — 객실 배정 때 참고합니다. 코드로 저장되므로 표기가 흔들리지 않습니다.
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
                {PREFERENCE_LABELS[code]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-xs text-subtle">
            내부 메모 — 게스트에게 노출되지 않습니다
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
          <SubmitButton pendingLabel="저장 중…">저장</SubmitButton>
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
 * 중복 후보와 병합.
 *
 * 자동으로 합치지 않는다 — 이름이 같은 다른 사람은 흔하고, 잘못 합치면 남의
 * 투숙 이력과 선호가 섞인다. 근거를 보여 주고 판단은 사람이 한다.
 */
export function DuplicatePanel({
  profileId,
  candidates,
  canMerge,
}: {
  profileId: string;
  candidates: DuplicateCandidate[];
  /** 병합은 되돌리기 어렵다. 지배인 이상만 한다. */
  canMerge: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(mergeProfileAction, IDLE);

  if (candidates.length === 0) {
    return <p className="text-sm text-subtle">같은 사람으로 보이는 프로필이 없습니다.</p>;
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
            <span className="font-medium">{profileName(profile)}</span>
            <span className="text-subtle">{profile.email ?? '이메일 없음'}</span>
            <span className="text-subtle">{profile.phone ?? '전화 없음'}</span>
            <span className="flex flex-wrap gap-1">
              {reasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300"
                >
                  {DUPLICATE_REASON_LABELS[reason]}
                </span>
              ))}
            </span>

            {canMerge && (
              <form action={action} className="ml-auto flex items-center gap-1.5">
                {/* 지금 보고 있는 프로필을 후보 쪽으로 합친다. 남는 것은 후보다. */}
                <input type="hidden" name="sourceId" value={profileId} />
                <input type="hidden" name="targetId" value={profile.id} />
                <SubmitButton
                  pendingLabel="병합 중…"
                  confirm={`현재 프로필을 ${profileName(profile)} 쪽으로 합칩니다. 되돌리기 어렵습니다. 진행할까요?`}
                  className="rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:opacity-50"
                >
                  이쪽으로 합치기
                </SubmitButton>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
