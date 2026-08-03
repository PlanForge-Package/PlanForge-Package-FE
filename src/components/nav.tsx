'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: '대시보드' },
  { href: '/reservations', label: '예약' },
  { href: '/rooms', label: '객실' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="주 메뉴" className="border-b border-current/10">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-6">
        <span className="mr-4 py-3 text-sm font-semibold tracking-tight">PlanForge</span>
        {LINKS.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`border-b-2 px-3 py-3 text-sm transition-colors ${
                active
                  ? 'border-current font-medium'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
