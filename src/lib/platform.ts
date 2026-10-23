import { invoke } from '@tauri-apps/api/core';
import { readTextFile } from '@tauri-apps/plugin-fs';

// The path the app was started with, or null when it was started without one.
export async function startupFile(): Promise<string | null> {
  return invoke<string | null>('get_startup_file');
}

export async function readText(path: string): Promise<string> {
  return readTextFile(path);
}
