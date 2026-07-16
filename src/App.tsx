import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { marked } from "marked";
import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";

type ViewMode = "edit" | "split" | "preview";
type Theme = "light" | "dark";

interface Snapshot {
  content: string;
  start: number;
  end: number;
}

const MAX_HISTORY = 500;
const TYPING_COALESCE_MS = 1000;

function App() {
  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [theme, setTheme] = useState<Theme>("light");
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const lastPushTime = useRef(0);
  const lastSelection = useRef({ start: 0, end: 0 });
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  const resetHistory = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    lastPushTime.current = 0;
  }, []);

  useEffect(() => {
    invoke<string | null>("get_startup_file")
      .then(async (path) => {
        if (path) {
          const text = await readTextFile(path);
          setContent(text);
          setFilePath(path);
          setDirty(false);
          resetHistory();
        }
      })
      .catch(() => {});
  }, [resetHistory]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  // Applied after React commits a programmatic content change, so the
  // caret/selection lands where the edit intended it.
  useLayoutEffect(() => {
    const sel = pendingSelection.current;
    if (!sel) return;
    pendingSelection.current = null;
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(sel.start, sel.end);
      lastSelection.current = { start: sel.start, end: sel.end };
    }
  }, [content]);

  const setSelection = useCallback((start: number, end: number) => {
    pendingSelection.current = { start, end };
  }, []);

  const pushUndo = useCallback((coalesce = false) => {
    redoStack.current = [];
    const now = Date.now();
    if (
      coalesce &&
      undoStack.current.length > 0 &&
      now - lastPushTime.current < TYPING_COALESCE_MS
    ) {
      return;
    }
    undoStack.current.push({
      content: contentRef.current,
      start: lastSelection.current.start,
      end: lastSelection.current.end,
    });
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    lastPushTime.current = now;
  }, []);

  const undo = useCallback(() => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) return;
    const textarea = textareaRef.current;
    redoStack.current.push({
      content: contentRef.current,
      start: textarea?.selectionStart ?? 0,
      end: textarea?.selectionEnd ?? 0,
    });
    setContent(snapshot.content);
    setDirty(true);
    lastPushTime.current = 0;
    setSelection(snapshot.start, snapshot.end);
  }, [setSelection]);

  const redo = useCallback(() => {
    const snapshot = redoStack.current.pop();
    if (!snapshot) return;
    const textarea = textareaRef.current;
    undoStack.current.push({
      content: contentRef.current,
      start: textarea?.selectionStart ?? 0,
      end: textarea?.selectionEnd ?? 0,
    });
    setContent(snapshot.content);
    setDirty(true);
    lastPushTime.current = 0;
    setSelection(snapshot.start, snapshot.end);
  }, [setSelection]);

  const applyEdit = useCallback(
    (newContent: string, selStart: number, selEnd: number) => {
      pushUndo();
      lastPushTime.current = 0;
      setContent(newContent);
      setDirty(true);
      setSelection(selStart, selEnd);
    },
    [pushUndo, setSelection],
  );

  const handleContentChange = useCallback(
    (value: string) => {
      pushUndo(true);
      setContent(value);
      setDirty(true);
    },
    [pushUndo],
  );

  const toggleInline = useCallback(
    (marker: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const text = contentRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = text.slice(start, end);
      const len = marker.length;

      // Selection includes the markers: strip them
      if (
        selected.length >= 2 * len &&
        selected.startsWith(marker) &&
        selected.endsWith(marker)
      ) {
        const inner = selected.slice(len, selected.length - len);
        applyEdit(
          text.slice(0, start) + inner + text.slice(end),
          start,
          start + inner.length,
        );
        return;
      }

      // Markers directly surround the selection: strip them
      if (
        text.slice(start - len, start) === marker &&
        text.slice(end, end + len) === marker
      ) {
        applyEdit(
          text.slice(0, start - len) + selected + text.slice(end + len),
          start - len,
          start - len + selected.length,
        );
        return;
      }

      const inner = selected || "text";
      applyEdit(
        text.slice(0, start) + marker + inner + marker + text.slice(end),
        start + len,
        start + len + inner.length,
      );
    },
    [applyEdit],
  );

  const cycleHeading = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = contentRef.current;
    const start = textarea.selectionStart;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = text.indexOf("\n", start);
    if (lineEnd === -1) lineEnd = text.length;
    const line = text.slice(lineStart, lineEnd);

    const match = line.match(/^(#{1,6})\s/);
    let newLine: string;
    if (!match) {
      newLine = "# " + line;
    } else if (match[1].length < 6) {
      newLine = "#" + line;
    } else {
      newLine = line.replace(/^#{6}\s/, "");
    }

    const delta = newLine.length - line.length;
    applyEdit(
      text.slice(0, lineStart) + newLine + text.slice(lineEnd),
      Math.max(lineStart, start + delta),
      Math.max(lineStart, textarea.selectionEnd + delta),
    );
  }, [applyEdit]);

  const cycleList = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = contentRef.current;
    const blockStart = text.lastIndexOf("\n", textarea.selectionStart - 1) + 1;
    let blockEnd = text.indexOf("\n", textarea.selectionEnd);
    if (blockEnd === -1) blockEnd = text.length;

    const bullet = /^(\s*)[-*]\s+/;
    const numbered = /^(\s*)\d+\.\s+/;
    const lines = text.slice(blockStart, blockEnd).split("\n");
    const first = lines.find((l) => l.trim() !== "") ?? "";

    // Cycle: plain -> bullet -> numbered -> plain
    const target = bullet.test(first)
      ? "numbered"
      : numbered.test(first)
        ? "plain"
        : "bullet";

    let counter = 1;
    const newBlock = lines
      .map((line) => {
        if (line.trim() === "") return line;
        const stripped = line.replace(bullet, "$1").replace(numbered, "$1");
        if (target === "bullet") return stripped.replace(/^(\s*)/, "$1- ");
        if (target === "numbered")
          return stripped.replace(/^(\s*)/, `$1${counter++}. `);
        return stripped;
      })
      .join("\n");

    applyEdit(
      text.slice(0, blockStart) + newBlock + text.slice(blockEnd),
      blockStart,
      blockStart + newBlock.length,
    );
  }, [applyEdit]);

  const insertLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = contentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const label = text.slice(start, end) || "link text";
    const snippet = `[${label}](url)`;
    const urlStart = start + label.length + 3;
    applyEdit(
      text.slice(0, start) + snippet + text.slice(end),
      urlStart,
      urlStart + 3,
    );
  }, [applyEdit]);

  const moveLine = useCallback(
    (direction: "up" | "down") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const lines = contentRef.current.split("\n");

      let charCount = 0;
      let startLine = 0;
      let endLine = 0;

      for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length;
        if (start >= charCount && start <= charCount + lineLen) startLine = i;
        if (end >= charCount && end <= charCount + lineLen) {
          endLine = i;
          break;
        }
        charCount += lineLen + 1;
      }

      if (direction === "up" && startLine > 0) {
        const aboveLen = lines[startLine - 1].length + 1;
        const block = lines.splice(startLine, endLine - startLine + 1);
        lines.splice(startLine - 1, 0, ...block);
        applyEdit(lines.join("\n"), start - aboveLen, end - aboveLen);
      }

      if (direction === "down" && endLine < lines.length - 1) {
        const belowLen = lines[endLine + 1].length + 1;
        const block = lines.splice(startLine, endLine - startLine + 1);
        lines.splice(startLine + 1, 0, ...block);
        applyEdit(lines.join("\n"), start + belowLen, end + belowLen);
      }
    },
    [applyEdit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        if ((key === "z" && e.shiftKey) || key === "y") {
          e.preventDefault();
          redo();
          return;
        }
        if (key === "b") {
          e.preventDefault();
          toggleInline("**");
          return;
        }
        if (key === "i") {
          e.preventDefault();
          toggleInline("*");
          return;
        }
        if (key === "c" && e.shiftKey) {
          e.preventDefault();
          toggleInline("`");
          return;
        }
        if (key === "h") {
          e.preventDefault();
          cycleHeading();
          return;
        }
        if (key === "l") {
          e.preventDefault();
          cycleList();
          return;
        }
        if (key === "k") {
          e.preventDefault();
          insertLink();
          return;
        }
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        applyEdit(
          textarea.value.substring(0, start) +
            "  " +
            textarea.value.substring(end),
          start + 2,
          start + 2,
        );
        return;
      }

      if (e.altKey && e.key === "ArrowUp") {
        e.preventDefault();
        moveLine("up");
        return;
      }

      if (e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        moveLine("down");
        return;
      }
    },
    [undo, redo, toggleInline, cycleHeading, cycleList, insertLink, applyEdit, moveLine],
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      lastSelection.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      };
    },
    [],
  );

  const confirmIfDirty = useCallback(async (): Promise<boolean> => {
    if (!dirty) return true;
    const confirmed = await ask(
      "You have unsaved changes. Continue without saving?",
      { title: "Unsaved Changes", kind: "warning" },
    );
    return confirmed;
  }, [dirty]);

  const newFile = useCallback(async () => {
    const proceed = await confirmIfDirty();
    if (!proceed) return;
    setContent("");
    setFilePath(null);
    setDirty(false);
    resetHistory();
  }, [confirmIfDirty, resetHistory]);

  const openFile = useCallback(async () => {
    const proceed = await confirmIfDirty();
    if (!proceed) return;
    const selected = await open({
      multiple: false,
      filters: [{ name: "Markdown & Text", extensions: ["md", "txt"] }],
    });
    if (selected) {
      const text = await readTextFile(selected);
      setContent(text);
      setFilePath(selected);
      setDirty(false);
      resetHistory();
    }
  }, [confirmIfDirty, resetHistory]);

  const saveFile = useCallback(async () => {
    if (filePath) {
      await writeTextFile(filePath, contentRef.current);
      setDirty(false);
      showToast(filePath.split(/[/\\]/).pop() || filePath);
    } else {
      const selected = await save({
        filters: [
          { name: "Markdown", extensions: ["md"] },
          { name: "Text", extensions: ["txt"] },
        ],
        defaultPath: "untitled.md",
      });
      if (selected) {
        await writeTextFile(selected, contentRef.current);
        setFilePath(selected);
        setDirty(false);
        showToast(selected.split(/[/\\]/).pop() || selected);
      }
    }
  }, [filePath, showToast]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  useHotkeys("alt+e", () => setViewMode("edit"), { enableOnFormTags: true }, [setViewMode]);
  useHotkeys("alt+s", () => setViewMode("split"), { enableOnFormTags: true }, [setViewMode]);
  useHotkeys("alt+p", () => setViewMode("preview"), { enableOnFormTags: true }, [setViewMode]);
  useHotkeys("alt+t", toggleTheme, { enableOnFormTags: true }, [toggleTheme]);
  useHotkeys(
    "ctrl+s,meta+s",
    (e) => {
      e.preventDefault();
      saveFile();
    },
    { preventDefault: true, enableOnFormTags: true },
    [saveFile],
  );
  useHotkeys(
    "ctrl+o,meta+o",
    (e) => {
      e.preventDefault();
      openFile();
    },
    { preventDefault: true, enableOnFormTags: true },
    [openFile],
  );
  useHotkeys(
    "ctrl+n,meta+n",
    (e) => {
      e.preventDefault();
      newFile();
    },
    { preventDefault: true, enableOnFormTags: true },
    [newFile],
  );

  const html = useMemo(() => marked.parse(content) as string, [content]);

  useEffect(() => {
    if (!previewRef.current) return;
    const pres = previewRef.current.querySelectorAll("pre");
    for (const pre of pres) {
      if (pre.querySelector(".copy-btn")) continue;
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.addEventListener("click", async () => {
        const code = pre.querySelector("code");
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code.textContent || "");
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 2000);
        } catch {
          btn.textContent = "Failed";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 2000);
        }
      });
      pre.appendChild(btn);
    }
  }, [html]);

  return (
    <div className="app">
      <main className="main">
        {(viewMode === "edit" || viewMode === "split") && (
          <div className="pane editor-pane">
            <textarea
              ref={textareaRef}
              className="editor"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onSelect={handleSelect}
              placeholder="Start typing markdown..."
              spellCheck={false}
            />
          </div>
        )}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="pane preview-pane">
            <div
              ref={previewRef}
              className="preview"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </main>
      <footer className="toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn" onClick={newFile} title="New File">
            New
          </button>
          <button className="toolbar-btn" onClick={openFile} title="Open File">
            Open
          </button>
          <button className="toolbar-btn" onClick={saveFile} title="Save File">
            Save
          </button>
        </div>
        <div className="toolbar-right">
          <button
            className={`icon-btn${viewMode === "edit" ? " active" : ""}`}
            onClick={() => setViewMode("edit")}
            title="Edit mode"
          >
            E
          </button>
          <button
            className={`icon-btn${viewMode === "split" ? " active" : ""}`}
            onClick={() => setViewMode("split")}
            title="Split view"
          >
            S
          </button>
          <button
            className={`icon-btn${viewMode === "preview" ? " active" : ""}`}
            onClick={() => setViewMode("preview")}
            title="Preview mode"
          >
            P
          </button>
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {theme === "light" ? "☾" : "☀"}
          </button>
        </div>
      </footer>
      {toast && <div className="toast">{toast} saved successfully</div>}
    </div>
  );
}

export default App;
