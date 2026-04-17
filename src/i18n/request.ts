import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }
  const [common, nav, auth] = await Promise.all([
    import(`../messages/${locale}/common.json`).then((m) => m.default),
    import(`../messages/${locale}/nav.json`).then((m) => m.default),
    import(`../messages/${locale}/auth.json`).then((m) => m.default),
  ]);
  return {
    locale,
    messages: { common, nav, auth },
  };
});
