import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Vitest resolves an asset URL, not a file URL, so read the file from the
// project root instead.
const html = readFileSync(resolve('index.html'), 'utf8');

describe('index.html', () => {
  it('first frame is dark', () => {
    const root = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
    expect(root).toContain('data-theme="dark"');
  });
});
