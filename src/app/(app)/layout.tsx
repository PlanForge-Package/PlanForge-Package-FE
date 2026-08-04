import { Nav } from '@/components/nav';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { getPropertyContext } from '@/lib/property';

/**
 * 로그인이 필요한 모든 화면의 레이아웃.
 *
 * 여기서 한 번 확인하면 하위 페이지마다 인증 검사를 반복하지 않아도 되고,
 * 새 페이지를 추가할 때 보호를 잊을 일도 없다.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const property = await getPropertyContext(user);
  const { locale, t } = await getDictionary();

  return (
    <>
      <Nav
        user={user}
        properties={property.options}
        selectedPropertyId={property.selected?.id ?? null}
        canSwitchProperty={property.canSwitch}
        locale={locale}
        t={t}
      />
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </>
  );
}
