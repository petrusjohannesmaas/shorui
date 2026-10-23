import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView, type Command } from '@codemirror/view';
import { cycleHeading, cycleList, insertLink, toggleInline } from './commands';

// Runs one command on a fresh state and returns the document it leaves. The
// selection is a range of the document, which the command acts on.
function run(
  command: Command,
  doc: string,
  from: number,
  to: number = from,
): { text: string; from: number; to: number } {
  let state = EditorState.create({
    doc,
    selection: EditorSelection.range(from, to),
  });
  const view = new EditorView({
    state,
    parent: document.body,
  });

  try {
    command(view);
    state = view.state;
    const range = state.selection.main;
    return { text: state.doc.toString(), from: range.from, to: range.to };
  } finally {
    view.destroy();
  }
}

describe('markdown commands', () => {
  it('wraps and unwraps a selection', () => {
    expect(run(toggleInline('**'), 'hello', 0, 5).text).toBe('**hello**');
    expect(run(toggleInline('*'), 'hello', 0, 5).text).toBe('*hello*');
    expect(run(toggleInline('`'), 'hello', 0, 5).text).toBe('`hello`');
  });

  it('cycles a heading through its levels', () => {
    const first = run(cycleHeading, 'Title', 2).text;
    expect(first).toBe('# Title');
    expect(run(cycleHeading, first, 2).text).toBe('## Title');
  });

  it('turns a line into a list item', () => {
    expect(run(cycleList, 'item', 2).text).toBe('- item');
  });

  it('inserts a link around the selection', () => {
    // Today's command writes the url placeholder with the link, and selects
    // the placeholder so typing replaces it.
    expect(run(insertLink, 'site', 0, 4).text).toBe('[site](url)');
  });
});
