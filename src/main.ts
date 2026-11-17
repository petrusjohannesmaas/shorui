import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { settings } from './lib/settings.svelte';

if (import.meta.env.VITE_E2E) {
  await import('@wdio/tauri-plugin');
}

// Apply the saved theme and accent before the first frame. If the store can't
// be read, index.html and app.css already give Dark and Blue.
await settings
  .load()
  .catch((error: unknown) => console.error('Could not load settings', error));

const target = document.getElementById('app');
if (!target) {
  throw new Error('Missing #app element');
}

export default mount(App, { target });
