'use client';

import { useActionState, useId, useState } from 'react';
import {
  createUserAction,
  resetPasswordAction,
  setUserActiveAction,
  updateUserAction,
} from '@/app/(app)/users/actions';
import { IDLE, type ActionState } from '@/lib/action-state';
import { useLastAction } from '@/lib/use-last-action';
import { fill } from '@/lib/i18n/format';
import { useI18n } from '@/lib/i18n/provider';
import type { ManagedUser, Property, UserRole } from '@/lib/types';
import { ActionMessage, SubmitButton } from './action-feedback';
import { control, ghostButton } from './ui';
import { dateOnly } from '@/lib/date';

const ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING'];

/** Home hotel selection. Empty means no property (head office). */
function PropertySelect({
  properties,
  defaultValue,
  id,
  label,
}: {
  properties: Property[];
  defaultValue?: string | null;
  id: string;
  label?: string;
}) {
  const t = useI18n();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-subtle">
        {label ?? t.users.property}
      </label>
      <select id={id} name="propertyId" defaultValue={defaultValue ?? ''} className={control('lg')}>
        <option value="">{t.users.headOfficeAll}</option>
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
  const t = useI18n();
  const [state, action] = useActionState<ActionState, FormData>(createUserAction, IDLE);
  const uid = useId();

  return (
    <form action={action} className="rounded-lg border border-current/10 px-4 py-3">
      <fieldset className="flex flex-wrap items-end gap-2">
        <legend className="mb-2 text-sm font-medium">{t.users.addTitle}</legend>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-email`} className="text-xs text-subtle">
            {t.users.email}
          </label>
          <input
            id={`${uid}-email`}
            name="email"
            type="email"
            required
            placeholder="staff@planforge.local"
            className={control('lg', 'w-56')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-name`} className="text-xs text-subtle">
            {t.users.name}
          </label>
          <input
            id={`${uid}-name`}
            name="name"
            required
            maxLength={60}
            placeholder={t.users.namePlaceholder}
            className={control('lg', 'w-32')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-role`} className="text-xs text-subtle">
            {t.users.role}
          </label>
          <select
            id={`${uid}-role`}
            name="role"
            defaultValue="FRONT_DESK"
            className={control('lg')}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {t.roles[role]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-password`} className="text-xs text-subtle">
            {t.users.initialPassword}
          </label>
          <input
            id={`${uid}-password`}
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={control('lg', 'w-40')}
          />
        </div>

        <PropertySelect properties={properties} id={`${uid}-property`} />

        <SubmitButton pendingLabel={t.users.adding}>{t.users.add}</SubmitButton>
      </fieldset>

      <p className="mt-1.5 text-xs text-subtle">{t.users.addNote}</p>
      <ActionMessage state={state} />
    </form>
  );
}

/**
 * Account table.
 *
 * The state of all three actions lives here rather than on the row. A successful
 * deactivation drops that row from the list and unmounts it; with the state on the
 * row, the result message goes too and the admin never learns what happened.
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
  const t = useI18n();
  const [roleState, changeRole] = useActionState<ActionState, FormData>(updateUserAction, IDLE);
  const [activeState, setActive] = useActionState<ActionState, FormData>(setUserActiveAction, IDLE);
  const [passwordState, resetPassword] = useActionState<ActionState, FormData>(
    resetPasswordAction,
    IDLE,
  );
  const [openRow, setOpenRow] = useState<string | null>(null);

  const { state: feedback, mark } = useLastAction({
    role: roleState,
    active: activeState,
    password: passwordState,
  });

  /**
   * Each row submits through here so the panel knows which result to show.
   *
   * The action itself is passed straight through; `mark` only records which one it
   * was. A row that leaves the list on success takes any state held on it with it.
   */
  const dispatch = {
    role: (formData: FormData) => {
      mark('role')();
      changeRole(formData);
    },
    active: (formData: FormData) => {
      mark('active')();
      setActive(formData);
    },
    password: (formData: FormData) => {
      mark('password')();
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
                {t.users.name}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.users.email}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.users.columnRoleProperty}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.users.columnStatus}
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                {t.users.columnLastLogin}
              </th>
              <th scope="col" className="py-2 font-medium">
                {t.users.columnActions}
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
  const t = useI18n();
  const uid = useId();
  const nextActive = !user.active;

  return (
    <>
      <tr className={`border-b border-current/5 ${user.active ? '' : 'opacity-50'}`}>
        <td className="py-2.5 pr-4">
          {user.name}
          {isSelf && <span className="ml-1.5 text-xs text-subtle">{t.users.self}</span>}
        </td>
        <td className="py-2.5 pr-4 font-mono text-xs">{user.email}</td>

        <td className="py-2.5 pr-4">
          {isSelf ? (
            // BE rejects changing your own role. A button that cannot work is not shown as active.
            <span title={t.users.selfRoleHint}>
              {t.roles[user.role]}
              <span className="ml-1.5 text-xs text-subtle">
                {properties.find((p) => p.id === user.propertyId)?.name ?? t.users.headOffice}
              </span>
            </span>
          ) : (
            <form action={changeRole} className="flex items-center gap-1.5">
              <input type="hidden" name="userId" value={user.id} />
              <select
                name="role"
                defaultValue={user.role}
                aria-label={fill(t.users.roleAria, { name: user.name })}
                className={control('sm')}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t.roles[role]}
                  </option>
                ))}
              </select>
              <select
                name="propertyId"
                defaultValue={user.propertyId ?? ''}
                aria-label={fill(t.users.propertyAria, { name: user.name })}
                className={control('sm')}
              >
                <option value="">{t.users.headOffice}</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <SubmitButton pendingLabel="…" className={ghostButton()}>
                {t.users.change}
              </SubmitButton>
            </form>
          )}
        </td>

        <td className="py-2.5 pr-4">{user.active ? t.users.employed : t.users.left}</td>
        <td className="py-2.5 pr-4 text-xs tabular-nums text-subtle">
          {user.lastLoginAt ? dateOnly(user.lastLoginAt) : t.users.noLogin}
        </td>

        <td className="py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {isSelf ? (
              <span className="text-xs text-subtle">{t.users.ownAccount}</span>
            ) : (
              <form action={setActive}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="name" value={user.name} />
                <input type="hidden" name="active" value={nextActive ? '1' : '0'} />
                <SubmitButton
                  pendingLabel="…"
                  confirm={nextActive ? undefined : fill(t.users.leaveConfirm, { name: user.name })}
                  className={ghostButton()}
                >
                  {nextActive ? t.users.reinstate : t.users.left}
                </SubmitButton>
              </form>
            )}

            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              className={ghostButton()}
            >
              {t.users.resetPassword}
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
                  {fill(t.users.newPasswordFor, { name: user.name })}
                </label>
                <input
                  id={`${uid}-pw`}
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={control('lg', 'w-48')}
                />
              </div>
              <SubmitButton pendingLabel={t.users.resetting}>{t.users.reset}</SubmitButton>
              <button
                type="button"
                onClick={onToggleExpand}
                className="rounded-md px-2.5 py-1.5 text-sm link-subtle"
              >
                {t.common.close}
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
