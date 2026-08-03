'use client';

import { useActionState, useId, useState } from 'react';
import {
  createUserAction,
  resetPasswordAction,
  setUserActiveAction,
  updateUserAction,
} from '@/app/(app)/users/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import type { ManagedUser, Property, UserRole } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: '관리자',
  MANAGER: '지배인',
  FRONT_DESK: '프론트데스크',
  HOUSEKEEPING: '하우스키핑',
};

const ROLES = Object.keys(ROLE_LABELS) as UserRole[];

const inputClass = 'rounded-md border border-current/20 bg-transparent px-3 py-1.5 text-sm';
const smallButtonClass =
  'rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:cursor-not-allowed disabled:opacity-50';

/** 소속 호텔 선택. 빈 값은 소속 없음(본사)이다. */
function PropertySelect({
  properties,
  defaultValue,
  id,
  label = '소속 호텔',
}: {
  properties: Property[];
  defaultValue?: string | null;
  id: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-subtle">
        {label}
      </label>
      <select id={id} name="propertyId" defaultValue={defaultValue ?? ''} className={inputClass}>
        <option value="">본사 (전 호텔)</option>
        {properties.map((property) => (
          <option key={property.id} value={property.id}>
            {property.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CreateUserForm({ properties }: { properties: Property[] }) {
  const [state, action] = useActionState<ActionState, FormData>(createUserAction, IDLE);
  const uid = useId();

  return (
    <form action={action} className="rounded-lg border border-current/10 px-4 py-3">
      <fieldset className="flex flex-wrap items-end gap-2">
        <legend className="mb-2 text-sm font-medium">계정 추가 (입사)</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-email`} className="text-xs text-subtle">
            이메일
          </label>
          <input
            id={`${uid}-email`}
            name="email"
            type="email"
            required
            placeholder="staff@planforge.local"
            className={`w-56 ${inputClass}`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-name`} className="text-xs text-subtle">
            이름
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            required
            maxLength={60}
            placeholder="홍길동"
            className={`w-32 ${inputClass}`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-role`} className="text-xs text-subtle">
            역할
          </label>
          <select id={`${uid}-role`} name="role" defaultValue="FRONT_DESK" className={inputClass}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-password`} className="text-xs text-subtle">
            초기 비밀번호
          </label>
          <input
            id={`${uid}-password`}
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={`w-40 ${inputClass}`}
          />
        </div>

        <PropertySelect properties={properties} id={`${uid}-property`} />

        <SubmitButton pendingLabel="추가 중…">추가</SubmitButton>
      </fieldset>

      <p className="mt-1.5 text-xs text-subtle">
        비밀번호는 8자 이상입니다. 만든 뒤 본인에게 직접 전달하고 변경하도록 안내해 주세요.
      </p>
      <ActionMessage state={state} />
    </form>
  );
}

/**
 * 계정 표.
 *
 * 세 액션의 상태를 행이 아니라 이 컴포넌트가 들고 있다. 퇴사 처리에 성공하면
 * 그 행이 목록에서 빠지며 언마운트되는데, 상태를 행이 들고 있으면 결과 메시지가
 * 함께 사라져 관리자는 무엇이 일어났는지 알 수 없다.
 */
export function UserTable({
  users,
  myId,
  properties,
}: {
  users: ManagedUser[];
  myId: string;
  properties: Property[];
}) {
  const [roleState, changeRole] = useActionState<ActionState, FormData>(updateUserAction, IDLE);
  const [activeState, setActive] = useActionState<ActionState, FormData>(setUserActiveAction, IDLE);
  const [passwordState, resetPassword] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    IDLE,
  );
  const [openRow, setOpenRow] = useState<string | null>(null);

  /**
   * 마지막으로 실행한 액션을 기억한다.
   *
   * 고정 우선순위로 "비어 있지 않은 첫 상태" 를 고르면, 먼저 실행한 액션의 메시지가
   * 이후 액션의 결과를 계속 가린다. 비밀번호를 초기화한 뒤 퇴사 처리를 하면 관리자는
   * 초기화 안내만 계속 보게 된다.
   */
  const [lastAction, setLastAction] = useState<'role' | 'active' | 'password' | null>(null);

  const feedback =
    lastAction === 'role'
      ? roleState
      : lastAction === 'active'
        ? activeState
        : lastAction === 'password'
          ? passwordState
          : IDLE;

  const dispatch = {
    role: (formData: FormData) => {
      setLastAction('role');
      changeRole(formData);
    },
    active: (formData: FormData) => {
      setLastAction('active');
      setActive(formData);
    },
    password: (formData: FormData) => {
      setLastAction('password');
      resetPassword(formData);
    },
  };

  return (
    <div className="flex flex-col gap-2">
      <div aria-live="polite">
        <ActionMessage state={feedback} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-current/10 text-left">
              <th scope="col" className="py-2 pr-4 font-medium">
                이름
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                이메일
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                역할 · 소속
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                상태
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                최근 로그인
              </th>
              <th scope="col" className="py-2 font-medium">
                작업
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === myId;
              return (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={isSelf}
                  properties={properties}
                  expanded={openRow === user.id}
                  onToggleExpand={() => setOpenRow(openRow === user.id ? null : user.id)}
                  changeRole={dispatch.role}
                  setActive={dispatch.active}
                  resetPassword={dispatch.password}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RowProps {
  user: ManagedUser;
  isSelf: boolean;
  properties: Property[];
  expanded: boolean;
  onToggleExpand: () => void;
  changeRole: (formData: FormData) => void;
  setActive: (formData: FormData) => void;
  resetPassword: (formData: FormData) => void;
}

function UserRow({
  user,
  isSelf,
  properties,
  expanded,
  onToggleExpand,
  changeRole,
  setActive,
  resetPassword,
}: RowProps) {
  const uid = useId();
  const nextActive = !user.active;

  return (
    <>
      <tr className={`border-b border-current/5 ${user.active ? '' : 'opacity-50'}`}>
        <td className="py-2.5 pr-4">
          {user.name}
          {isSelf && <span className="ml-1.5 text-xs text-subtle">(나)</span>}
        </td>
        <td className="py-2.5 pr-4 font-mono text-xs">{user.email}</td>

        <td className="py-2.5 pr-4">
          {isSelf ? (
            // 자기 역할은 BE 가 거절한다. 눌러도 안 되는 것을 활성처럼 보이게 두지 않는다.
            <span title="자기 역할은 다른 관리자만 바꿀 수 있습니다.">
              {ROLE_LABELS[user.role]}
              <span className="ml-1.5 text-xs text-subtle">
                {properties.find((p) => p.id === user.propertyId)?.name ?? '본사'}
              </span>
            </span>
          ) : (
            <form action={changeRole} className="flex items-center gap-1.5">
              <input type="hidden" name="userId" value={user.id} />
              <select
                name="role"
                defaultValue={user.role}
                aria-label={`${user.name} 역할`}
                className="rounded-md border border-current/20 bg-transparent px-2 py-1 text-sm"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <select
                name="propertyId"
                defaultValue={user.propertyId ?? ''}
                aria-label={`${user.name} 소속 호텔`}
                className="rounded-md border border-current/20 bg-transparent px-2 py-1 text-sm"
              >
                <option value="">본사</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <SubmitButton pendingLabel="…" className={smallButtonClass}>
                변경
              </SubmitButton>
            </form>
          )}
        </td>

        <td className="py-2.5 pr-4">{user.active ? '재직' : '퇴사'}</td>
        <td className="py-2.5 pr-4 text-xs tabular-nums text-subtle">
          {user.lastLoginAt ? user.lastLoginAt.slice(0, 10) : '기록 없음'}
        </td>

        <td className="py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {isSelf ? (
              <span className="text-xs text-subtle">자기 계정</span>
            ) : (
              <form action={setActive}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="name" value={user.name} />
                <input type="hidden" name="active" value={nextActive ? '1' : '0'} />
                <SubmitButton
                  pendingLabel="…"
                  confirm={nextActive ? undefined : `${user.name} 계정을 퇴사 처리하시겠습니까?`}
                  className={smallButtonClass}
                >
                  {nextActive ? '복직' : '퇴사'}
                </SubmitButton>
              </form>
            )}

            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              className={smallButtonClass}
            >
              비밀번호 초기화
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-current/5">
          <td colSpan={6} className="bg-current/[0.02] px-4 py-3">
            <form action={resetPassword} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="userId" value={user.id} />
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-pw`} className="text-xs text-subtle">
                  {user.name} 의 새 비밀번호
                </label>
                <input
                  id={`${uid}-pw`}
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`w-48 ${inputClass}`}
                />
              </div>
              <SubmitButton pendingLabel="초기화 중…">초기화</SubmitButton>
              <button
                type="button"
                onClick={onToggleExpand}
                className="rounded-md px-2.5 py-1.5 text-sm link-subtle"
              >
                닫기
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
