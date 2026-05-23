import { useState, useEffect, useCallback, useRef } from "react";
import { marked } from "marked";
import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

type ViewMode = "edit" | "split" | "preview";
type Theme = "light" | "dark";

function App() {
  const [content, setContent] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [theme, setTheme] = useState<Theme>("light");
  const [dirty, setDirty] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    setDirty(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue =
          textarea.value.substring(0, start) +
          "  " +
          textarea.value.substring(end);
        setContent(newValue);
        setDirty(true);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
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
  }, [confirmIfDirty]);

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
    }
  }, [confirmIfDirty]);

  const saveFile = useCallback(async () => {
    if (filePath) {
      await writeTextFile(filePath, contentRef.current);
      setDirty(false);
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
      }
    }
  }, [filePath]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const html = marked.parse(content) as string;

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
      pre.style.position = "relative";
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
            {theme === "light" ? "\u263E" : "\u2600"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
