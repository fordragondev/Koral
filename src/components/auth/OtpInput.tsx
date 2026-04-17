'use client';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslations } from 'next-intl';

export function OtpInput({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (code: string) => void;
}) {
  const t = useTranslations('auth');
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={(v: string) => {
        onChange(v);
        if (v.length === 6) onComplete(v);
      }}
      aria-label={t('otpLabel')}
    >
      <InputOTPGroup className="gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot
            key={i}
            index={i}
            className="w-[44px] h-[44px] text-[16px] font-semibold"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
