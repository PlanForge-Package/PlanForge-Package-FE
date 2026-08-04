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

interface NavLink {
  href: string;
  /** 사전에서 이름을 찾을 키. 화면 언어에 따라 달라진다. */
  key: keyof Dictionary['nav'];
  /** 이 역할들만 메뉴에 보인다. 비우면 모두에게 보인다. */
  roles?: SessionUser['role'][];
}

const LINKS: NavLink[] = [
  { href: '/', key: 'dashboard' },
  // 하우스키핑은 BE 에서 예약 접근이 403 이므로 메뉴에서도 감춘다.
  // 감추는 것은 편의일 뿐이고, 실제 차단은 BE 가 한다.
  { href: '/reservations', key: 'reservations', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/blocks', key: 'blocks', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/profiles', key: 'profiles', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/rooms', key: 'rooms' },
  // 무엇을 얼마에 파는지. 프런트도 봐야 예약을 받는다.
  { href: '/rates', key: 'rates', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/housekeeping', key: 'housekeeping' },
  { href: '/night-audit', key: 'nightAudit', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  // 돈을 받는 사람이 자기 조를 마감한다.
  { href: '/cashier', key: 'cashier', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  // 후불 거래처의 미수와 청구. 프런트도 이관 대상을 확인해야 한다.
  { href: '/ar', key: 'ar', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  // 매출 지표는 경영 정보다. 프런트데스크에게는 열지 않는다.
  { href: '/reports', key: 'reports', roles: ['ADMIN', 'MANAGER'] },
  // 아웃렛 키는 요금을 달 수 있는 자격이다. 지배인 이상만 다룬다.
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
              className="rounded-md border border-current/20 bg-transparent px-2 py-1 text-xs"
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
