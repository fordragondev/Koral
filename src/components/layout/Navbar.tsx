import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/server/auth/config';
import { signOutAction } from '@/server/auth/actions';
import { getTenant } from '@/server/tenant/resolve';
import { LangToggle } from './LangToggle';
import { ThemeToggle } from './ThemeToggle';

export async function Navbar({ locale }: { locale: string }) {
  const [session, tenant, t] = await Promise.all([
    auth(),
    getTenant(),
    getTranslations('nav'),
  ]);

  return (
    <nav
      className="flex items-center justify-between px-4 md:px-6 h-[56px] md:h-[64px] border-b"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
      aria-label="Primary"
    >
      <Link href={`/${locale}/`} className="text-[16px] font-semibold" style={{ color: 'var(--color-fg)' }}>
        {tenant.name}
      </Link>
      <div className="flex items-center gap-2 md:gap-4">
        <LangToggle />
        <ThemeToggle />
        {session?.user ? (
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-[14px] font-semibold px-3 py-2 min-h-[44px]"
              style={{ color: 'var(--color-fg)' }}
            >
              {t('signOut')}
            </button>
          </form>
        ) : (
          <Link
            href={`/${locale}/sign-in`}
            className="text-[14px] font-semibold px-3 py-2 min-h-[44px]"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('signIn')}
          </Link>
        )}
      </div>
    </nav>
  );
}
