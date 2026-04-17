import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Root layout theming + FOUC prevention (TENT-01, Pitfall 7, D-20, D-31)', () => {
  const src = readFileSync('src/app/layout.tsx', 'utf8');

  it('reads tenant via getTenant() — no hardcoded theme values', () => {
    expect(src).toMatch(/getTenant\(\)/);
    expect(src).toMatch(/import.*getTenant.*from.*@\/server\/tenant\/resolve/);
  });

  it('injects CSS custom properties for both :root and [data-theme="dark"]', () => {
    expect(src).toMatch(/:root \{/);
    expect(src).toMatch(/\[data-theme="dark"\] \{/);
    expect(src).toMatch(/--color-bg/);
    expect(src).toMatch(/--color-accent/);
    expect(src).toMatch(/--color-fg/);
  });

  it('inline theme-init script is synchronous (no async, no defer, no src)', () => {
    // The <script> tag with dangerouslySetInnerHTML must not have async/defer
    const scriptMatch = src.match(/<script[^>]*dangerouslySetInnerHTML/);
    expect(scriptMatch).toBeTruthy();
    expect(scriptMatch![0]).not.toMatch(/async/);
    expect(scriptMatch![0]).not.toMatch(/defer/);
    // Script reads localStorage and sets data-theme before hydration
    expect(src).toMatch(/localStorage\.getItem\(['"]theme['"]\)/);
    expect(src).toMatch(/matchMedia\(['"]\(prefers-color-scheme: dark\)['"]\)/);
    expect(src).toMatch(/document\.documentElement\.setAttribute\(['"]data-theme['"]/);
  });

  it('has suppressHydrationWarning on <html> (required because inline script mutates it)', () => {
    expect(src).toMatch(/<html[^>]*suppressHydrationWarning/);
  });

  it('does NOT contain any hardcoded hex color literal in the layout', () => {
    // All colors must flow through tenant config. Hex literals in this file = hardcoded brand.
    expect(src).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it('globals.css exposes theme tokens via Tailwind v4 @theme block', () => {
    const css = readFileSync('src/styles/globals.css', 'utf8');
    expect(css).toMatch(/@import ['"]tailwindcss['"]/);
    expect(css).toMatch(/@theme\s*\{/);
    expect(css).toMatch(/--color-bg:/);
  });
});
