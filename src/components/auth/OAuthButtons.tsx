'use client';

import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';

export function OAuthButtons() {
  const t = useTranslations('auth');
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => signIn('google')}
        className="h-[44px] rounded-md text-[14px] font-semibold border"
        style={{ borderColor: 'var(--color-accent)', color: 'var(--color-fg)' }}
      >
        {t('continueWithGoogle')}
      </button>
      <button
        type="button"
        onClick={() => signIn('apple')}
        className="h-[44px] rounded-md text-[14px] font-semibold border"
        style={{ borderColor: 'var(--color-accent)', color: 'var(--color-fg)' }}
      >
        {t('continueWithApple')}
      </button>
    </div>
  );
}
