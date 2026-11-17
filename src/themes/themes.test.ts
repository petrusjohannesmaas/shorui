import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Vitest empties CSS imports, even with ?raw, so read the files from disk.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const lightCss = read('./light.css');
const darkCss = read('./dark.css');
const appCss = read('../app.css');

function variableNames(css: string): string[] {
  return [...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]).sort();
}

function variable(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  if (!match) throw new Error(`No ${name}`);
  return match[1].trim();
}

describe('themes', () => {
  it('scopes each theme file to its own data-theme value', () => {
    expect(lightCss).toContain(':root[data-theme="light"]');
    expect(darkCss).toContain(':root[data-theme="dark"]');
  });

  it('sets the same colour variables in every theme', () => {
    expect(variableNames(lightCss)).toEqual(variableNames(darkCss));
  });

  it('sets the shadcn-svelte colours the app uses', () => {
    const names = variableNames(darkCss);
    for (const name of [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--border',
      '--input',
      '--ring',
      '--accent-text',
    ]) {
      expect(names).toContain(name);
    }
  });

  it('uses #1e1e1e for Dark and keeps Light light', () => {
    expect(variable(darkCss, '--background')).toBe('#1e1e1e');
    expect(variable(lightCss, '--background')).toBe('#fafafb');
  });

  it('follows the chosen accent for primary buttons and focus rings', () => {
    for (const css of [lightCss, darkCss]) {
      expect(variable(css, '--primary')).toBe('var(--accent-bg)');
      expect(variable(css, '--ring')).toBe('var(--accent-bg)');
    }
  });

  it('clamps the accent text colour for each theme', () => {
    expect(lightCss).toMatch(/--accent-text:\s*oklab\(from var\(--accent-bg\) min\(l, 0\.5\) a b\)/);
    expect(darkCss).toMatch(/--accent-text:\s*oklab\(from var\(--accent-bg\) max\(l, 0\.85\) a b\)/);
  });
});

describe('app.css', () => {
  it('imports Tailwind and the animate plugin', () => {
    expect(appCss).toContain("@import 'tailwindcss' source('./')");
    expect(appCss).toContain("@import 'tw-animate-css'");
  });

  it('reads the theme from data-theme, with no .dark class', () => {
    expect(appCss).toContain(
      '@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))',
    );
  });

  it('maps the shadcn colours to Tailwind utilities', () => {
    for (const name of [
      '--color-background',
      '--color-foreground',
      '--color-card',
      '--color-primary',
      '--color-muted',
      '--color-muted-foreground',
      '--color-border',
      '--color-ring',
      '--color-accent-text',
    ]) {
      expect(appCss).toContain(name);
    }
  });

  it('draws focus rings in the accent the user picked', () => {
    expect(appCss).toMatch(/:focus-visible\s*{[^}]*outline:[^;}]*var\(--ring\)/);
  });

  it('bundles Geist for rich text and Geist Mono for code', () => {
    expect(appCss).toContain("--font-sans: 'Geist Variable'");
    expect(appCss).toContain("--font-mono: 'Geist Mono Variable'");
  });
});
