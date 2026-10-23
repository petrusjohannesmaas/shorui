import { afterEach, vi } from 'vitest';
import { clearMocks } from '@tauri-apps/api/mocks';
import { randomFillSync } from 'node:crypto';

// jsdom has no WebCrypto, which the Tauri mocks reach for.
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: (buffer: Uint8Array) => randomFillSync(buffer),
    randomUUID: () => crypto.randomUUID(),
  },
  configurable: true,
});

// jsdom has no matchMedia, which the theme and motion code reads.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom has no ResizeObserver, which CodeMirror and Svelte's clientHeight
// binding use.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom has no Web Animations API, which Svelte transitions use. Svelte waits
// for onfinish, so the stub finishes each animation on the next task.
if (!Element.prototype.animate) {
  Element.prototype.animate = function animate() {
    const animation = {
      cancel: () => {},
      finish: () => {},
      play: () => {},
      pause: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      finished: Promise.resolve(),
      ready: Promise.resolve(),
      playState: 'finished',
      playbackRate: 1,
      currentTime: 0,
      startTime: 0,
      timeline: null,
      effect: null,
      id: '',
      oncancel: null,
      onfinish: null as (() => void) | null,
      onremove: null,
    };
    setTimeout(() => animation.onfinish?.(), 0);
    return animation as unknown as Animation;
  };
}

afterEach(() => {
  clearMocks();
  vi.restoreAllMocks();
});
