<script lang="ts" module>
  export type EditorMode = 'rich' | 'code';
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { Compartment, EditorState, Prec } from '@codemirror/state';
  import { drawSelection, EditorView, keymap, placeholder } from '@codemirror/view';
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
  import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
  import { indentUnit, syntaxHighlighting } from '@codemirror/language';
  import { cycleHeading, cycleList, insertLink, toggleInline } from './commands';
  import { livePreview, markdownHighlight, richModeAttributes, tableField } from './livePreview';

  let {
    mode = 'rich',
    onchange = () => {},
  }: { mode?: EditorMode; onchange?: () => void } = $props();

  let host: HTMLDivElement;
  let view: EditorView | null = null;
  const modeCompartment = new Compartment();
  // CodeMirror joins lines with "\n". Remember the file's line ending so a
  // save writes back what was read.
  let eol = '\n';

  const modeExtensions = (value: EditorMode) =>
    value === 'rich' ? [livePreview, tableField, richModeAttributes] : [];

  function createState(doc: string) {
    return EditorState.create({
      doc,
      extensions: [
        history({ newGroupDelay: 1000 }),
        drawSelection(),
        EditorView.lineWrapping,
        indentUnit.of('  '),
        placeholder('Start typing markdown...'),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(markdownHighlight),
        modeCompartment.of(modeExtensions(mode)),
        Prec.high(
          keymap.of([
            { key: 'Mod-b', run: toggleInline('**') },
            { key: 'Mod-i', run: toggleInline('*') },
            { key: 'Mod-Shift-c', run: toggleInline('`') },
            { key: 'Mod-h', run: cycleHeading },
            { key: 'Mod-l', run: cycleList },
            { key: 'Mod-k', run: insertLink },
          ]),
        ),
        keymap.of([indentWithTab, ...historyKeymap, ...defaultKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onchange();
        }),
      ],
    });
  }

  // The view is built once. A later mode change reconfigures the compartment,
  // so the document and its undo history survive a switch to Code and back.
  $effect(() => {
    const state = untrack(() => createState(''));
    view = new EditorView({ state, parent: host });
    return () => {
      view?.destroy();
      view = null;
    };
  });

  $effect(() => {
    if (!view) return;
    view.dispatch({
      effects: modeCompartment.reconfigure(modeExtensions(mode)),
    });
    view.focus();
  });

  export function getContent(): string {
    const doc = view?.state.doc;
    return doc ? doc.sliceString(0, doc.length, eol) : '';
  }

  export function setContent(text: string): void {
    eol = text.includes('\r\n') ? '\r\n' : '\n';
    // A fresh state also clears the undo history.
    view?.setState(createState(text));
  }

  export function focus(): void {
    view?.focus();
  }
</script>

<div bind:this={host} class="editor-host"></div>
