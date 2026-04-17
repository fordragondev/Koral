'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { updateUserLocale } from '@/server/user/preferences';

export function LangToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (next: 'en' | 'es') => {
    if (next === locale) return;
    void updateUserLocale(next);
    router.push(pathname, { locale: next });
  };

  return (
    <div className="flex items-center gap-1 text-[14px] font-semibold" aria-label="Language toggle">
      <button
        type="button"
        onClick={() => switchTo('en')}
        className="px-2 py-2 min-w-[44px] min-h-[44px]"
        aria-current={locale === 'en' ? 'true' : undefined}
        style={{ color: locale === 'en' ? 'var(--color-accent)' : 'var(--color-fg)' }}
      >
        EN
      </button>
      <span aria-hidden="true">|</span>
      <button
        type="button"
        onClick={() => switchTo('es')}
        className="px-2 py-2 min-w-[44px] min-h-[44px]"
        aria-current={locale === 'es' ? 'true' : undefined}
        style={{ color: locale === 'es' ? 'var(--color-accent)' : 'var(--color-fg)' }}
      >
        ES
      </button>
    </div>
  );
}
