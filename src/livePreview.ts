import {
  ensureSyntaxTree,
  HighlightStyle,
  syntaxTree,
} from "@codemirror/language";
import { type EditorState, type Range, StateField } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";

const hide = Decoration.replace({});

class BulletWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-bullet";
    span.textContent = "•";
    return span;
  }
}

class FenceWidget extends WidgetType {
  constructor(
    readonly label: string | null,
    readonly code: string,
  ) {
    super();
  }

  eq(other: FenceWidget) {
    return other.label === this.label && other.code === this.code;
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.className = "cm-fence";

    if (this.label !== null) {
      const label = document.createElement("span");
      label.className = "cm-fence-label";
      label.textContent = this.label || " ";
      wrap.appendChild(label);
    }

    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.code);
        btn.textContent = "Copied!";
      } catch {
        btn.textContent = "Failed";
      }
      setTimeout(() => {
        btn.textContent = "Copy";
      }, 2000);
    });
    wrap.appendChild(btn);
    return wrap;
  }

  ignoreEvent() {
    return true;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const doc = state.doc;
  const ranges = state.selection.ranges;
  const decos: Range<Decoration>[] = [];

  const touches = (from: number, to: number) =>
    ranges.some((r) => r.from <= to && r.to >= from);
  const lineTouches = (pos: number) => {
    const line = doc.lineAt(pos);
    return touches(line.from, line.to);
  };
  const addLines = (from: number, to: number, cls: string) => {
    const deco = Decoration.line({ class: cls });
    for (let pos = from; pos <= to; ) {
      const line = doc.lineAt(pos);
      decos.push(deco.range(line.from));
      pos = line.to + 1;
    }
  };
  const hideRange = (from: number, to: number) => {
    if (from < to) decos.push(hide.range(from, to));
  };

  const tree = syntaxTree(state);
  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name;

        if (/^ATXHeading\d$/.test(name) || /^SetextHeading\d$/.test(name)) {
          addLines(node.from, node.to, `cm-h cm-h${name.slice(-1)}`);
          return;
        }

        if (name === "HeaderMark") {
          const parent = node.node.parent;
          if (parent?.name.startsWith("ATX") && !lineTouches(node.from)) {
            const line = doc.lineAt(node.from);
            hideRange(node.from, Math.min(node.to + 1, line.to));
          }
          return;
        }

        if (name === "Blockquote") {
          addLines(node.from, node.to, "cm-quote");
          return;
        }

        if (name === "QuoteMark") {
          if (!lineTouches(node.from)) {
            const spaced = doc.sliceString(node.to, node.to + 1) === " ";
            hideRange(node.from, spaced ? node.to + 1 : node.to);
          }
          return;
        }

        if (name === "InlineCode") {
          decos.push(
            Decoration.mark({ class: "cm-inline-code" }).range(
              node.from,
              node.to,
            ),
          );
          return;
        }

        if (name === "EmphasisMark" || name === "StrikethroughMark") {
          const parent = node.node.parent;
          if (parent && !touches(parent.from, parent.to)) {
            hideRange(node.from, node.to);
          }
          return;
        }

        if (name === "CodeMark") {
          const parent = node.node.parent;
          if (
            parent?.name === "InlineCode" &&
            !touches(parent.from, parent.to)
          ) {
            hideRange(node.from, node.to);
          }
          return;
        }

        if (name === "LinkMark" || name === "URL" || name === "LinkTitle") {
          const parent = node.node.parent;
          if (parent?.name === "Link" && !touches(parent.from, parent.to)) {
            hideRange(node.from, node.to);
          }
          return;
        }

        if (name === "ListMark") {
          const list = node.node.parent?.parent;
          if (list?.name === "BulletList") {
            if (!lineTouches(node.from)) {
              decos.push(
                Decoration.replace({ widget: new BulletWidget() }).range(
                  node.from,
                  node.to,
                ),
              );
            }
          } else {
            decos.push(
              Decoration.mark({ class: "cm-list-num" }).range(
                node.from,
                node.to,
              ),
            );
          }
          return;
        }

        if (name === "HorizontalRule") {
          addLines(node.from, node.to, "cm-hr");
          if (!lineTouches(node.from)) hideRange(node.from, node.to);
          return;
        }

        if (name === "CodeBlock") {
          addLines(node.from, node.to, "cm-codeblock");
          return;
        }

        if (name === "FencedCode") {
          const first = doc.lineAt(node.from);
          const last = doc.lineAt(node.to);
          addLines(node.from, node.to, "cm-codeblock");
          decos.push(
            Decoration.line({ class: "cm-codeblock-first" }).range(first.from),
          );
          decos.push(
            Decoration.line({ class: "cm-codeblock-last" }).range(last.from),
          );

          const text = node.node.getChild("CodeText");
          const info = node.node.getChild("CodeInfo");
          const code = text ? doc.sliceString(text.from, text.to) : "";
          const lang = info ? doc.sliceString(info.from, info.to).trim() : "";

          if (touches(node.from, node.to)) {
            decos.push(
              Decoration.widget({
                widget: new FenceWidget(null, code),
                side: 1,
              }).range(first.to),
            );
          } else {
            decos.push(
              Decoration.replace({ widget: new FenceWidget(lang, code) }).range(
                first.from,
                first.to,
              ),
            );
            const closed = node.node.getChildren("CodeMark").length >= 2;
            if (closed && last.number !== first.number) {
              hideRange(last.from, last.to);
            }
          }
          return false;
        }
      },
    });
  }

  return Decoration.set(decos, true);
}

type Align = "left" | "center" | "right";

function splitRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\" && text[i + 1] === "|") {
      current += "|";
      i++;
    } else if (text[i] === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += text[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

const INLINE =
  /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/;

function renderInline(parent: HTMLElement, text: string) {
  for (const part of text.split(INLINE)) {
    if (!part) continue;
    let el: HTMLElement | null = null;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      el = document.createElement("code");
      el.textContent = part.slice(1, -1);
    } else if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      el = document.createElement("strong");
      el.textContent = part.slice(2, -2);
    } else if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) {
      el = document.createElement("s");
      el.textContent = part.slice(2, -2);
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      el = document.createElement("em");
      el.textContent = part.slice(1, -1);
    } else {
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        el = document.createElement("span");
        el.className = "cm-table-link";
        el.textContent = link[1];
      }
    }
    if (el) parent.appendChild(el);
    else parent.appendChild(document.createTextNode(part));
  }
}

class TableWidget extends WidgetType {
  constructor(readonly source: string) {
    super();
  }

  eq(other: TableWidget) {
    return other.source === this.source;
  }

  toDOM(view: EditorView) {
    const lines = this.source.split("\n");
    const header = splitRow(lines[0]);
    const aligns: Align[] = splitRow(lines[1] ?? "").map((c) =>
      c.startsWith(":") && c.endsWith(":")
        ? "center"
        : c.endsWith(":")
          ? "right"
          : "left",
    );

    const wrap = document.createElement("div");
    wrap.className = "cm-table-wrap";
    const table = document.createElement("table");
    table.className = "cm-table";

    const addRow = (cells: string[], tag: "th" | "td", parent: HTMLElement) => {
      const tr = document.createElement("tr");
      for (let i = 0; i < header.length; i++) {
        const cell = document.createElement(tag);
        cell.style.textAlign = aligns[i] ?? "left";
        renderInline(cell, cells[i] ?? "");
        tr.appendChild(cell);
      }
      parent.appendChild(tr);
    };

    const thead = document.createElement("thead");
    addRow(header, "th", thead);
    const tbody = document.createElement("tbody");
    for (const line of lines.slice(2)) addRow(splitRow(line), "td", tbody);
    table.append(thead, tbody);
    wrap.appendChild(table);

    // A click moves the cursor into the table, which reveals the source.
    wrap.addEventListener("mousedown", (e) => {
      e.preventDefault();
      view.dispatch({ selection: { anchor: view.posAtDOM(wrap) } });
      view.focus();
    });
    return wrap;
  }
}

function buildTables(state: EditorState): DecorationSet {
  const decos: Range<Decoration>[] = [];
  const doc = state.doc;
  const tree =
    ensureSyntaxTree(state, doc.length, 100) ?? syntaxTree(state);
  tree.iterate({
    enter: (node) => {
      if (node.name !== "Table") return;
      const active = state.selection.ranges.some(
        (r) => r.from <= node.to && r.to >= node.from,
      );
      if (active) {
        const deco = Decoration.line({ class: "cm-table-line" });
        for (let pos = node.from; pos <= node.to; ) {
          const line = doc.lineAt(pos);
          decos.push(deco.range(line.from));
          pos = line.to + 1;
        }
      } else {
        decos.push(
          Decoration.replace({
            widget: new TableWidget(doc.sliceString(node.from, node.to)),
            block: true,
          }).range(node.from, node.to),
        );
      }
      return false;
    },
  });
  return Decoration.set(decos, true);
}

/** Renders tables as HTML unless the cursor is inside one. */
export const tableField = StateField.define<DecorationSet>({
  create: (state) => buildTables(state),
  update(value, tr) {
    if (
      tr.docChanged ||
      tr.selection ||
      syntaxTree(tr.startState) !== syntaxTree(tr.state)
    ) {
      return buildTables(tr.state);
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/** Styles and hides markdown syntax without changing the document text. */
export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

export const richModeAttributes = EditorView.editorAttributes.of({
  class: "cm-rich",
});

export const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: "600" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "var(--preview-link)" },
  { tag: tags.url, color: "var(--text-secondary)" },
  { tag: tags.monospace, fontFamily: "var(--font-mono)" },
  { tag: tags.quote, color: "var(--preview-blockquote-text)" },
  { tag: tags.processingInstruction, color: "var(--text-secondary)" },
  { tag: tags.contentSeparator, color: "var(--text-secondary)" },
]);
