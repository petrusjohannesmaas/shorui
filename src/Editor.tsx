import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  keymap,
  placeholder,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { indentUnit, syntaxHighlighting } from "@codemirror/language";
import {
  cycleHeading,
  cycleList,
  insertLink,
  toggleInline,
} from "./commands";
import {
  livePreview,
  markdownHighlight,
  richModeAttributes,
  tableField,
} from "./livePreview";

export type EditorMode = "rich" | "code";

export interface EditorHandle {
  getContent(): string;
  setContent(text: string): void;
  focus(): void;
}

interface Props {
  mode: EditorMode;
  onChange: () => void;
}

const modeExtensions = (mode: EditorMode) =>
  mode === "rich" ? [livePreview, tableField, richModeAttributes] : [];

export const Editor = forwardRef<EditorHandle, Props>(function Editor(
  { mode, onChange },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const modeCompartment = useRef(new Compartment()).current;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // CodeMirror joins lines with "\n". Remember the file's line ending so a
  // save writes back what was read.
  const eolRef = useRef("\n");

  const createState = (doc: string) =>
    EditorState.create({
      doc,
      extensions: [
        history({ newGroupDelay: 1000 }),
        drawSelection(),
        EditorView.lineWrapping,
        indentUnit.of("  "),
        placeholder("Start typing markdown..."),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(markdownHighlight),
        modeCompartment.of(modeExtensions(modeRef.current)),
        Prec.high(
          keymap.of([
            { key: "Mod-b", run: toggleInline("**") },
            { key: "Mod-i", run: toggleInline("*") },
            { key: "Mod-Shift-c", run: toggleInline("`") },
            { key: "Mod-h", run: cycleHeading },
            { key: "Mod-l", run: cycleList },
            { key: "Mod-k", run: insertLink },
          ]),
        ),
        keymap.of([indentWithTab, ...historyKeymap, ...defaultKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current();
        }),
      ],
    });

  useEffect(() => {
    const view = new EditorView({
      state: createState(""),
      parent: hostRef.current!,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: modeCompartment.reconfigure(modeExtensions(mode)),
    });
    view.focus();
  }, [mode, modeCompartment]);

  useImperativeHandle(ref, () => ({
    getContent() {
      const doc = viewRef.current?.state.doc;
      return doc ? doc.sliceString(0, doc.length, eolRef.current) : "";
    },
    setContent(text: string) {
      eolRef.current = text.includes("\r\n") ? "\r\n" : "\n";
      // A fresh state also clears the undo history.
      viewRef.current?.setState(createState(text));
    },
    focus() {
      viewRef.current?.focus();
    },
  }));

  return <div ref={hostRef} className="editor-host" />;
});
