// server/auth/actions.ts
// Server Actions consumed by UI components in Plan 06.

'use server';

import { signOut } from '@/server/auth/config';

/**
 * AUTH-04: Sign out from any page.
 *
 * Calling this Server Action from any layout/page triggers Auth.js v5 signOut,
 * clears the session cookie, and redirects to the locale-prefixed home.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/' });
}
