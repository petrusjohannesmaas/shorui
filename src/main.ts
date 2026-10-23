import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

if (import.meta.env.VITE_E2E) {
  await import('@wdio/tauri-plugin');
}

const target = document.getElementById('app');
if (!target) {
  throw new Error('Missing #app element');
}

export default mount(App, { target });
