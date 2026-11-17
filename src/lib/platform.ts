import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { LazyStore } from '@tauri-apps/plugin-store';

// End-to-end builds keep their own settings file, so test runs never touch the
// user's settings.
const store = new LazyStore(import.meta.env.VITE_E2E ? 'settings.e2e.json' : 'settings.json', {
  autoSave: false,
});

export type SavedSettings = { theme?: unknown; accent?: unknown };

export async function loadSettings(): Promise<SavedSettings> {
  const [theme, accent] = await Promise.all([store.get('theme'), store.get('accent')]);
  return { theme, accent };
}

export async function saveSettings(values: { theme: string; accent: string }): Promise<void> {
  await store.set('theme', values.theme);
  await store.set('accent', values.accent);
  await store.save();
}

// The open and save dialogs only offer the formats the editor writes.
const TEXT_FILTERS = [{ name: 'Markdown and text', extensions: ['md', 'txt'] }];

// The path the app was started with, or null when it was started without one.
export async function startupFile(): Promise<string | null> {
  return invoke<string | null>('get_startup_file');
}

export async function readText(path: string): Promise<string> {
  return readTextFile(path);
}

export async function writeText(path: string, text: string): Promise<void> {
  await writeTextFile(path, text);
}

export async function openDialog(): Promise<string | null> {
  const path = await open({ multiple: false, directory: false, filters: TEXT_FILTERS });
  return typeof path === 'string' ? path : null;
}

export async function saveDialog(defaultName: string): Promise<string | null> {
  const path = await save({ defaultPath: defaultName, filters: TEXT_FILTERS });
  return typeof path === 'string' ? path : null;
}
