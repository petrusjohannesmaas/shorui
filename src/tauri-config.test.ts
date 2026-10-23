import { describe, expect, it } from 'vitest';
import config from '../src-tauri/tauri.conf.json';

describe('tauri config', () => {
  it('sets the identifier and window', () => {
    expect(config.identifier).toBe('com.petrusjohannesmaas.shorui');

    expect(config.app.windows).toHaveLength(1);
    const window = config.app.windows[0];
    expect(window.label).toBe('main');
    expect(window.width).toBe(1280);
    expect(window.height).toBe(720);
    expect(window.minWidth).toBe(640);
    expect(window.minHeight).toBe(480);
    expect(window.decorations).toBe(false);
  });
});
