// server/auth/email-sender.ts
// Sends the 6-digit OTP by email.
// Dev stub logs to console so the executor/dev can see the OTP without a real SMTP server.
// Production: swap to Resend or SMTP in a later phase — this contract is stable.

import { env } from '@/lib/env';

/**
 * Sends a 6-digit OTP code to the given email address.
 *
 * In development (no EMAIL_SERVER configured), the code is logged to the console.
 * In production, this stub logs a warning — a real transport (Resend or nodemailer)
 * should be wired in a later phase before go-live.
 */
export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!env.EMAIL_SERVER || !env.EMAIL_FROM) {
    // Dev mode — log to console so executor/dev can see the OTP without a real SMTP server
    console.log(`\n[OTP DEV] To: ${to}\n[OTP DEV] Code: ${code}\n`);
    return;
  }
  // Production stub: real transport deferred to a later phase.
  // (Plan 01-RESEARCH "Don't Hand-Roll" says use Auth.js for the flow; the transport is ours.)
  console.log(`[OTP PROD-STUB] Would send ${code} to ${to} via ${env.EMAIL_FROM}`);
}
