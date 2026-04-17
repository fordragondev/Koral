import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getTenant } from '@/server/tenant/resolve';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('common');
  const tenant = await getTenant();
  return (
    <main style={{ padding: '32px', maxWidth: '960px', margin: '0 auto' }}>
      <h1>{tenant.name}</h1>
      <p>{t('welcome')}</p>
      <p>{tenant.tagline ?? ''}</p>
    </main>
  );
}
