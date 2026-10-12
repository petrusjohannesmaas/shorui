import { EditorSelection } from "@codemirror/state";
import type { Command } from "@codemirror/view";

const USER_EVENT = { scrollIntoView: true, userEvent: "input" } as const;

export const toggleInline =
  (marker: string): Command =>
  (view) => {
    const len = marker.length;
    const doc = view.state.doc;
    view.dispatch(
      view.state.update(
        view.state.changeByRange((range) => {
          const selected = doc.sliceString(range.from, range.to);

          // Selection includes the markers: strip them.
          if (
            selected.length >= 2 * len &&
            selected.startsWith(marker) &&
            selected.endsWith(marker)
          ) {
            const inner = selected.slice(len, selected.length - len);
            return {
              changes: { from: range.from, to: range.to, insert: inner },
              range: EditorSelection.range(range.from, range.from + inner.length),
            };
          }

          // Markers directly surround the selection: strip them.
          const before = doc.sliceString(Math.max(0, range.from - len), range.from);
          const after = doc.sliceString(range.to, range.to + len);
          if (before === marker && after === marker) {
            const from = range.from - len;
            return {
              changes: { from, to: range.to + len, insert: selected },
              range: EditorSelection.range(from, from + selected.length),
            };
          }

          const inner = selected || "text";
          return {
            changes: {
              from: range.from,
              to: range.to,
              insert: marker + inner + marker,
            },
            range: EditorSelection.range(
              range.from + len,
              range.from + len + inner.length,
            ),
          };
        }),
        USER_EVENT,
      ),
    );
    return true;
  };

export const cycleHeading: Command = (view) => {
  const main = view.state.selection.main;
  const line = view.state.doc.lineAt(main.from);
  const match = line.text.match(/^(#{1,6})\s/);

  let next: string;
  if (!match) next = "# " + line.text;
  else if (match[1].length < 6) next = "#" + line.text;
  else next = line.text.replace(/^#{6}\s/, "");

  const delta = next.length - line.text.length;
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: next },
    selection: EditorSelection.range(
      Math.max(line.from, main.anchor + delta),
      Math.max(line.from, main.head + delta),
    ),
    ...USER_EVENT,
  });
  return true;
};

export const cycleList: Command = (view) => {
  const { doc, selection } = view.state;
  const blockFrom = doc.lineAt(selection.main.from).from;
  const blockTo = doc.lineAt(selection.main.to).to;

  const bullet = /^(\s*)[-*]\s+/;
  const numbered = /^(\s*)\d+\.\s+/;
  const lines = doc.sliceString(blockFrom, blockTo).split("\n");
  const first = lines.find((l) => l.trim() !== "") ?? "";

  // Cycle: plain -> bullet -> numbered -> plain
  const target = bullet.test(first)
    ? "numbered"
    : numbered.test(first)
      ? "plain"
      : "bullet";

  let counter = 1;
  const block = lines
    .map((line) => {
      if (line.trim() === "") return line;
      const stripped = line.replace(bullet, "$1").replace(numbered, "$1");
      if (target === "bullet") return stripped.replace(/^(\s*)/, "$1- ");
      if (target === "numbered")
        return stripped.replace(/^(\s*)/, `$1${counter++}. `);
      return stripped;
    })
    .join("\n");

  view.dispatch({
    changes: { from: blockFrom, to: blockTo, insert: block },
    selection: EditorSelection.range(blockFrom, blockFrom + block.length),
    ...USER_EVENT,
  });
  return true;
};

export const insertLink: Command = (view) => {
  const doc = view.state.doc;
  view.dispatch(
    view.state.update(
      view.state.changeByRange((range) => {
        const label = doc.sliceString(range.from, range.to) || "link text";
        const urlStart = range.from + label.length + 3;
        return {
          changes: {
            from: range.from,
            to: range.to,
            insert: `[${label}](url)`,
          },
          range: EditorSelection.range(urlStart, urlStart + 3),
        };
      }),
      USER_EVENT,
    ),
  );
  return true;
};
