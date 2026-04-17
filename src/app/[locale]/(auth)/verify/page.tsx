'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { OtpInput } from '@/components/auth/OtpInput';

export default function VerifyPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [code, setCode] = useState('');

  const onComplete = async (fullCode: string) => {
    const email = new URLSearchParams(window.location.search).get('email') ?? '';
    const url = `/api/auth/callback/email?token=${encodeURIComponent(fullCode)}&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent('/')}`;
    const res = await fetch(url);
    if (res.ok || res.redirected) {
      router.push('/');
    }
  };

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
      <div
        className="flex flex-col gap-6 w-full max-w-sm p-6 rounded-lg"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <h1 className="text-[24px] font-semibold" style={{ color: 'var(--color-fg)' }}>
          {t('verifyTitle')}
        </h1>
        <p className="text-[16px]" style={{ color: 'var(--color-fg)' }}>
          {t('verifyHint')}
        </p>
        <OtpInput value={code} onChange={setCode} onComplete={onComplete} />
      </div>
    </main>
  );
}
