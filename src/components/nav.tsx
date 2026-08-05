'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { setLocaleAction } from '@/app/(app)/locale-actions';
import { logoutAction } from '@/app/login/actions';
import type { Dictionary } from '@/lib/i18n';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/locales';
import type { SessionUser } from '@/lib/session';
import type { Property } from '@/lib/types';
import { SubmitButton } from './action-feedback';
import { PropertySwitcher } from './property-switcher';
import { control } from './ui';

interface NavLink {
  href: string;
  /** Dictionary key for the label. It changes with the screen language. */
  key: keyof Dictionary['nav'];
  /** Only these roles see the menu item. Empty shows it to everyone. */
  roles?: SessionUser['role'][];
}

const LINKS: NavLink[] = [
  { href: '/', key: 'dashboard' },
  // Housekeeping gets a 403 on reservations from BE, so it is hidden from the menu too.
  // Hiding is only convenience; BE does the actual blocking.
  { href: '/reservations', key: 'reservations', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/blocks', key: 'blocks', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/profiles', key: 'profiles', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/rooms', key: 'rooms' },
  // What sells at what price. The front desk needs it to take bookings.
  { href: '/rates', key: 'rates', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/housekeeping', key: 'housekeeping' },
  { href: '/night-audit', key: 'nightAudit', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  // Whoever takes the money closes their own shift.
  { href: '/cashier', key: 'cashier', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  // Direct-bill receivables and invoices. The front desk checks what to transfer.
  { href: '/ar', key: 'ar', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  // Revenue metrics are management information. Not opened to the front desk.
  { href: '/reports', key: 'reports', roles: ['ADMIN', 'MANAGER'] },
  // An outlet key is the right to post charges. Managers and above only.
  { href: '/pos-outlets', key: 'pos', roles: ['ADMIN', 'MANAGER'] },
  { href: '/users', key: 'users', roles: ['ADMIN'] },
];

export function Nav({
  user,
  properties,
  selectedPropertyId,
  canSwitchProperty,
  locale,
  t,
}: {
  user: SessionUser;
  properties: Property[];
  selectedPropertyId: string | null;
  canSwitchProperty: boolean;
  locale: Locale;
  t: Dictionary;
}) {
  const pathname = usePathname();
  const visible = LINKS.filter((link) => !link.roles || link.roles.includes(user.role));

  return (
    <nav aria-label={t.nav.menu} className="border-b border-current/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-6">
        <span className="mr-4 py-3 text-sm font-semibold tracking-tight">{t.common.appName}</span>

        {visible.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`border-b-2 px-3 py-3 text-sm transition-colors ${
                active ? 'border-current font-medium' : 'border-transparent link-subtle'
              }`}
            >
              {t.nav[link.key]}
            </Link>
          );
        })}

        <div className="ml-auto flex items-center gap-3 py-2">
          {/*
            언어는 골라 두면 끝인 설정이라 버튼을 따로 두지 않고 바꾸는 즉시 적용한다.
            자바스크립트가 죽어 있어도 동작하도록 폼으로 보낸다.
          */}
          <form action={setLocaleAction}>
            <select
              name="locale"
              defaultValue={locale}
              aria-label={t.common.language}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              className={control('xs')}
            >
              {LOCALES.map((value) => (
                <option key={value} value={value}>
                  {LOCALE_LABELS[value]}
                </option>
              ))}
            </select>
            <noscript>
              <button type="submit" className="ml-1 text-xs underline">
                {t.common.save}
              </button>
            </noscript>
          </form>

          <PropertySwitcher
            options={properties}
            selectedId={selectedPropertyId}
            canSwitch={canSwitchProperty}
          />
          <Link href="/account" className="text-sm link-subtle">
            {user.name}
            <span className="ml-1.5 text-xs text-subtle">({t.roles[user.role]})</span>
          </Link>
          <form action={logoutAction}>
            <SubmitButton
              pendingLabel="…"
              className="rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:opacity-50"
            >
              {t.common.logout}
            </SubmitButton>
          </form>
        </div>
      </div>
    </nav>
  );
}
