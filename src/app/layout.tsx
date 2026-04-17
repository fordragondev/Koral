// app/layout.tsx — Root layout: per-tenant theme injection + FOUC prevention (Pitfall 7)
import type { Metadata } from 'next';
import { getTenant } from '@/server/tenant/resolve';
import { auth } from '@/server/auth/config';
import '@/styles/globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant().catch(() => null);
  return {
    title: tenant?.name ?? 'Koral',
    description: tenant?.tagline ?? tenant?.name ?? 'Koral',
    icons: tenant?.faviconUrl ? [{ url: tenant.faviconUrl }] : undefined,
  };
}

const FALLBACK_THEME = { bg: '#ffffff', surface: '#f5f5f5', accent: '#0070f3', accentHover: '#0060d3', fg: '#000000', primary: '#0070f3' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [tenant, session] = await Promise.all([getTenant().catch(() => null), auth()]);
  // themeLight / themeDark are stored as jsonb — Drizzle returns them as plain objects
  const light = tenant
    ? (typeof tenant.themeLight === 'string' ? JSON.parse(tenant.themeLight) : tenant.themeLight) as Record<string, string>
    : FALLBACK_THEME;
  const dark = tenant
    ? (typeof tenant.themeDark === 'string' ? JSON.parse(tenant.themeDark) : tenant.themeDark) as Record<string, string>
    : FALLBACK_THEME;

  const css = `
    :root {
      --color-bg: ${light.bg};
      --color-surface: ${light.surface};
      --color-accent: ${light.accent};
      --color-accent-hover: ${light.accentHover};
      --color-fg: ${light.fg};
      --color-primary: ${light.primary};
    }
    [data-theme="dark"] {
      --color-bg: ${dark.bg};
      --color-surface: ${dark.surface};
      --color-accent: ${dark.accent};
      --color-accent-hover: ${dark.accentHover};
      --color-fg: ${dark.fg};
      --color-primary: ${dark.primary};
    }
  `;

  // D-30: if the signed-in user has a known darkMode preference, use it as the server-side
  // initial value. This enables cross-device restore — on a new device the session carries
  // the preference so localStorage (which starts empty) is not needed.
  // null/undefined → client-side FOUC script takes over (OS preference or localStorage).
  const userDarkMode: boolean | null = (session as any)?.user?.darkMode ?? null;
  const serverTheme = userDarkMode === true ? 'dark' : userDarkMode === false ? 'light' : null;

  // Inline synchronous script — MUST run before paint to prevent dark mode flash (Pitfall 7)
  // D-28: default to OS preference if localStorage empty. D-31: data-theme attribute on <html>.
  // If serverTheme is non-null (signed-in user with known preference), it takes priority over
  // localStorage so the correct theme renders on page load on a new device.
  const themeInitScript = serverTheme
    ? `(function(){try{var t=${JSON.stringify(serverTheme)};localStorage.setItem('theme',t);document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`
    : `(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

  return (
    <html suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
