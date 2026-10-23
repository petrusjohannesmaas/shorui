import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeStore } from '../test/fake-store';

// Fresh modules per test, so each test gets its own LazyStore.
let settings: typeof import('./settings.svelte').settings;

const root = document.documentElement;
const accentVar = () => root.style.getPropertyValue('--accent-bg');

beforeEach(async () => {
  vi.resetModules();
  ({ settings } = await import('./settings.svelte'));
  root.removeAttribute('data-theme');
  root.style.removeProperty('--accent-bg');
});

describe('settings', () => {
  it('unknown saved values fall back to the defaults', async () => {
    fakeStore({ theme: 'sepia' });
    await settings.load();

    expect(settings.theme).toBe('dark');
    expect(settings.accent).toBe('blue');
    expect(root.dataset.theme).toBe('dark');
    expect(accentVar()).toBe('#3584e4');
  });

  it('toggleTheme switches and saves', async () => {
    const store = fakeStore();
    await settings.load();

    await settings.toggleTheme();
    expect(settings.theme).toBe('light');
    expect(root.dataset.theme).toBe('light');
    expect(store.saves.at(-1)).toEqual({ theme: 'light', accent: 'blue' });

    await settings.toggleTheme();
    expect(settings.theme).toBe('dark');
    expect(store.saves.at(-1)).toEqual({ theme: 'dark', accent: 'blue' });
  });
});
