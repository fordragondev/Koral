'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';

const schema = z.object({ email: z.string().email() });
type FormData = z.infer<typeof schema>;

export function SignInForm() {
  const t = useTranslations('auth');
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: FormData) => {
    const res = await signIn('email', { email, redirect: false });
    if (!res || res.error) return;
    setSent(true);
  };

  if (sent) {
    return <p className="text-[16px]">{t('codeSent')}</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-[14px] font-semibold">
        {t('emailLabel')}
        <input
          type="email"
          {...register('email')}
          className="h-[44px] px-3 rounded-md border"
          style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-fg)',
            borderColor: 'var(--color-accent)',
          }}
          autoComplete="email"
          aria-invalid={errors.email ? 'true' : 'false'}
        />
        {errors.email && (
          <span className="text-[14px] text-red-500">{t('emailInvalid')}</span>
        )}
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="h-[44px] rounded-md text-[14px] font-semibold"
        style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}
      >
        {t('sendCode')}
      </button>
    </form>
  );
}
