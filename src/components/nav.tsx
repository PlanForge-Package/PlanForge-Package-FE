'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/login/actions';
import type { SessionUser } from '@/lib/session';
import type { Property } from '@/lib/types';
import { SubmitButton } from './action-feedback';
import { PropertySwitcher } from './property-switcher';

const ROLE_LABELS: Record<SessionUser['role'], string> = {
  ADMIN: '관리자',
  MANAGER: '지배인',
  FRONT_DESK: '프론트데스크',
  HOUSEKEEPING: '하우스키핑',
};

interface NavLink {
  href: string;
  label: string;
  /** 이 역할들만 메뉴에 보인다. 비우면 모두에게 보인다. */
  roles?: SessionUser['role'][];
}

const LINKS: NavLink[] = [
  { href: '/', label: '대시보드' },
  // 하우스키핑은 BE 에서 예약 접근이 403 이므로 메뉴에서도 감춘다.
  // 감추는 것은 편의일 뿐이고, 실제 차단은 BE 가 한다.
  { href: '/reservations', label: '예약', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/blocks', label: '단체', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/profiles', label: '게스트', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  { href: '/rooms', label: '객실' },
  { href: '/housekeeping', label: '하우스키핑' },
  { href: '/night-audit', label: '야간 감사', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  // 돈을 받는 사람이 자기 조를 마감한다.
  { href: '/cashier', label: '캐셔 마감', roles: ['ADMIN', 'MANAGER', 'FRONT_DESK'] },
  // 매출 지표는 경영 정보다. 프런트데스크에게는 열지 않는다.
  { href: '/reports', label: '실적', roles: ['ADMIN', 'MANAGER'] },
  // 아웃렛 키는 요금을 달 수 있는 자격이다. 지배인 이상만 다룬다.
  { href: '/pos-outlets', label: 'POS', roles: ['ADMIN', 'MANAGER'] },
  { href: '/users', label: '계정', roles: ['ADMIN'] },
];

export function Nav({
  user,
  properties,
  selectedPropertyId,
  canSwitchProperty,
}: {
  user: SessionUser;
  properties: Property[];
  selectedPropertyId: string | null;
  canSwitchProperty: boolean;
}) {
  const pathname = usePathname();
  const visible = LINKS.filter((link) => !link.roles || link.roles.includes(user.role));

  return (
    <nav aria-label="주 메뉴" className="border-b border-current/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-6">
        <span className="mr-4 py-3 text-sm font-semibold tracking-tight">PlanForge</span>

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
              {link.label}
            </Link>
          );
        })}

        <div className="ml-auto flex items-center gap-3 py-2">
          <PropertySwitcher
            options={properties}
            selectedId={selectedPropertyId}
            canSwitch={canSwitchProperty}
          />
          <Link href="/account" className="text-sm link-subtle">
            {user.name}
            <span className="ml-1.5 text-xs text-subtle">({ROLE_LABELS[user.role]})</span>
          </Link>
          <form action={logoutAction}>
            <SubmitButton
              pendingLabel="…"
              className="rounded-md border border-current/20 px-2.5 py-1 text-xs transition-colors hover:bg-current/5 disabled:opacity-50"
            >
              로그아웃
            </SubmitButton>
          </form>
        </div>
      </div>
    </nav>
  );
}
