'use server';

import { auth } from '@/server/auth/config';
import { withTenant } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function updateUserTheme(theme: 'light' | 'dark'): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !(session as any).tenantId) return;
  const tenantId = (session as any).tenantId as string;
  await withTenant(tenantId, (tx) =>
    tx.update(users).set({ darkMode: theme === 'dark' }).where(eq(users.id, session.user!.id!))
  );
}

export async function updateUserLocale(locale: 'en' | 'es'): Promise<void> {
  const session = await auth();
  if (!session?.user?.id || !(session as any).tenantId) return;
  const tenantId = (session as any).tenantId as string;
  await withTenant(tenantId, (tx) =>
    tx.update(users).set({ locale }).where(eq(users.id, session.user!.id!))
  );
}
