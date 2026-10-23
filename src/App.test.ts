import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { mockIPC } from '@tauri-apps/api/mocks';
import App from './App.svelte';

type Call = { command: string; args: unknown };

// Fakes the Tauri calls App makes and records them, so a test can say what the
// dialogs were asked and what was written. The commands in `failing` throw, as
// a read or write the disk refuses does.
function fakeBackend(replies: Record<string, unknown> = {}, failing: string[] = []) {
  const calls: Call[] = [];
  mockIPC((command, args) => {
    calls.push({ command, args });
    if (failing.includes(command)) throw new Error(`${command} failed`);
    return replies[command] ?? null;
  });
  return calls;
}

const callsTo = (calls: Call[], command: string) => calls.filter((call) => call.command === command);

const written = (call: Call) => new TextDecoder().decode(call.args as Uint8Array);

// CodeMirror inserts typed text when it reads the DOM change the browser makes
// after a beforeinput event. jsdom makes none, so the test makes it and gives
// CodeMirror a moment to read it.
async function type(container: HTMLElement, text: string) {
  const content = container.querySelector('.cm-content') as HTMLElement;
  const line = content.querySelector('.cm-line') as HTMLElement;
  // The placeholder is not part of the document, so it must not be read as text.
  line.querySelector('.cm-placeholder')?.remove();
  line.textContent = `${line.textContent}${text}`;
  // The unsaved dot appears once the editor has read the change.
  await waitFor(() => expect(screen.getByTestId('dirty-dot')).toBeTruthy());
}

const fileName = () => screen.getByTestId('file-name').textContent?.trim();

// The document's text as shown, without CodeMirror's placeholder.
function editorText(container: HTMLElement): string {
  const line = container.querySelector('.cm-line') as HTMLElement;
  const copy = line.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.cm-placeholder').forEach((node) => node.remove());
  return copy.textContent?.trim() ?? '';
}

describe('the file controls', () => {
  it('save on Untitled asks for a path', async () => {
    const calls = fakeBackend({ 'plugin:dialog|save': '/notes/today.md' });
    const { container } = render(App);
    await type(container, 'Hello');

    await fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() => expect(fileName()).toBe('today.md'));
    const [save] = callsTo(calls, 'plugin:dialog|save');
    const options = (save.args as { options: { defaultPath: string; filters: Array<{ extensions: string[] }> } })
      .options;
    expect(options.filters[0].extensions).toEqual(['md', 'txt']);
    expect(options.defaultPath).toBe('untitled.md');
    expect(written(callsTo(calls, 'plugin:fs|write_text_file')[0])).toBe('Hello');
    await waitFor(() => expect(screen.queryByTestId('dirty-dot')).toBeNull());
  });

  it('open loads the chosen file', async () => {
    const calls = fakeBackend({
      'plugin:dialog|open': '/notes/a.md',
      'plugin:fs|read_text_file': Array.from(new TextEncoder().encode('# A')),
    });
    const { container } = render(App);

    await fireEvent.keyDown(window, { key: 'o', ctrlKey: true });

    await waitFor(() => expect(fileName()).toBe('a.md'));
    const [open] = callsTo(calls, 'plugin:dialog|open');
    const options = (open.args as { options: { filters: Array<{ extensions: string[] }> } }).options;
    expect(options.filters[0].extensions).toEqual(['md', 'txt']);

    // Code mode shows the file's text raw, without the live preview.
    await fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    const content = container.querySelector('.cm-content') as HTMLElement;
    await waitFor(() => expect(content.textContent).toContain('# A'));
  });

  it('open with unsaved changes asks first', async () => {
    const calls = fakeBackend({ 'plugin:dialog|open': '/notes/a.md' });
    const { container } = render(App);
    await type(container, 'Draft text');

    await fireEvent.keyDown(window, { key: 'o', ctrlKey: true });

    await screen.findByText('You have unsaved changes. Continue without saving?');
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })),
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(callsTo(calls, 'plugin:dialog|open')).toHaveLength(0);
    const content = container.querySelector('.cm-content') as HTMLElement;
    expect(content.textContent).toContain('Draft text');
  });

  it('new with unsaved changes clears after Continue', async () => {
    fakeBackend();
    const { container } = render(App);
    await type(container, 'Draft text');

    await fireEvent.click(screen.getByRole('button', { name: 'New' }));

    await screen.findByText('You have unsaved changes. Continue without saving?');
    await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(fileName()).toBe('Untitled'));
    expect(editorText(container)).toBe('');
    expect(screen.queryByTestId('dirty-dot')).toBeNull();
  });
});

describe('a file that cannot be saved or opened', () => {
  it('a failed save keeps the old name and says so', async () => {
    fakeBackend({ 'plugin:dialog|save': '/notes/x.md' }, ['plugin:fs|write_text_file']);
    const { container } = render(App);
    await type(container, 'Hello');

    await fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() =>
      expect(screen.getByTestId('toast').textContent?.trim()).toBe('Could not save x.md'),
    );
    expect(fileName()).toBe('Untitled');
    expect(screen.getByTestId('dirty-dot')).toBeTruthy();
  });

  it('a failed open says so', async () => {
    fakeBackend(
      { 'plugin:dialog|save': '/notes/k.md', 'plugin:dialog|open': '/notes/a.md' },
      ['plugin:fs|read_text_file'],
    );
    const { container } = render(App);
    await type(container, 'keep');
    await fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    await waitFor(() => expect(screen.queryByTestId('dirty-dot')).toBeNull());

    await fireEvent.keyDown(window, { key: 'o', ctrlKey: true });

    await waitFor(() =>
      expect(screen.getByTestId('toast').textContent?.trim()).toBe('Could not open a.md'),
    );
    expect(editorText(container)).toBe('keep');
    expect(fileName()).toBe('k.md');
  });
});

describe('the settings panel', () => {
  it('settings panel opens and closes', async () => {
    fakeBackend();
    render(App);

    await fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    await screen.findByTestId('settings-panel');
    screen.getByText('Theme');
    screen.getByText('Accent colour');
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();

    await fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByTestId('settings-panel')).toBeNull());
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
  });

  it('file and mode keys wait while Settings is open', async () => {
    const calls = fakeBackend();
    render(App);

    await fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await screen.findByTestId('settings-panel');

    // Nothing the panel does reaches the backend, so no call at all should
    // arrive from one of these keys.
    const before = calls.length;

    await fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    await fireEvent.keyDown(window, { key: 'o', ctrlKey: true });
    await fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    await fireEvent.keyDown(window, { key: 'm', altKey: true });

    expect(calls.length).toBe(before);
    expect(callsTo(calls, 'plugin:dialog|open')).toHaveLength(0);
    expect(callsTo(calls, 'plugin:dialog|save')).toHaveLength(0);
    expect(callsTo(calls, 'plugin:fs|write_text_file')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Rich' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Code' }).getAttribute('aria-pressed')).toBe('false');
  });
});
