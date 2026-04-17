import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Separator } from '@/components/ui/separator';
import { SignInForm } from '@/components/auth/SignInForm';
import { OAuthButtons } from '@/components/auth/OAuthButtons';

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');
  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
      <div
        className="flex flex-col gap-6 w-full max-w-sm p-6 rounded-lg"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <h1 className="text-[24px] font-semibold" style={{ color: 'var(--color-fg)' }}>
          {t('welcomeTitle')}
        </h1>
        <SignInForm />
        <Separator />
        <p className="text-[14px] text-center" style={{ color: 'var(--color-fg)' }}>
          {t('orContinueWith')}
        </p>
        <OAuthButtons />
      </div>
    </main>
  );
}
