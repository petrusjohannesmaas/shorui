import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Editor from './Editor.svelte';

describe('editor', () => {
  it('keeps CRLF line endings', async () => {
    const { component } = render(Editor, { props: { mode: 'rich' } });

    component.setContent('a\r\nb\r\n');

    expect(component.getContent()).toBe('a\r\nb\r\n');
  });
});
