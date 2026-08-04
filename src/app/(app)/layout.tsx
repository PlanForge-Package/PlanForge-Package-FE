import { Nav } from '@/components/nav';
import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/provider';
import { getPropertyContext } from '@/lib/property';

/**
 * Layout for every screen that requires a login.
 *
 * Checking once here saves repeating the check on each page below and means adding
 * a new page can never forget the protection.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const property = await getPropertyContext(user);
  const { locale, t } = await getDictionary();

  return (
    <I18nProvider locale={locale} dictionary={t}>
      <Nav
        user={user}
        properties={property.options}
        selectedPropertyId={property.selected?.id ?? null}
        canSwitchProperty={property.canSwitch}
        locale={locale}
        t={t}
      />
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </I18nProvider>
  );
}
