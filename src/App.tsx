import { useState, useEffect, useCallback, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { Editor, type EditorHandle, type EditorMode } from "./Editor";
import {
  CodeIcon,
  MoonIcon,
  NewIcon,
  OpenIcon,
  RichIcon,
  SaveIcon,
  SunIcon,
} from "./icons";

type Theme = "light" | "dark";

const HOTKEY_OPTIONS = {
  enableOnFormTags: true,
  enableOnContentEditable: true,
} as const;

function App() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>("rich");
  const [theme, setTheme] = useState<Theme>("light");
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const editorRef = useRef<EditorHandle>(null);
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

  useEffect(() => {
    invoke<string | null>("get_startup_file")
      .then(async (path) => {
        if (path) {
          const text = await readTextFile(path);
          editorRef.current?.setContent(text);
          setFilePath(path);
          setDirty(false);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleChange = useCallback(() => setDirty(true), []);

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
    editorRef.current?.setContent("");
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
      editorRef.current?.setContent(text);
      setFilePath(selected);
      setDirty(false);
    }
  }, [confirmIfDirty]);

  const saveFile = useCallback(async () => {
    const content = editorRef.current?.getContent() ?? "";
    if (filePath) {
      await writeTextFile(filePath, content);
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
        await writeTextFile(selected, content);
        setFilePath(selected);
        setDirty(false);
        showToast(selected.split(/[/\\]/).pop() || selected);
      }
    }
  }, [filePath, showToast]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "rich" ? "code" : "rich"));
  }, []);

  useHotkeys("alt+m", toggleMode, HOTKEY_OPTIONS, [toggleMode]);
  useHotkeys("alt+t", toggleTheme, HOTKEY_OPTIONS, [toggleTheme]);
  useHotkeys(
    "ctrl+s,meta+s",
    (e) => {
      e.preventDefault();
      saveFile();
    },
    { ...HOTKEY_OPTIONS, preventDefault: true },
    [saveFile],
  );
  useHotkeys(
    "ctrl+o,meta+o",
    (e) => {
      e.preventDefault();
      openFile();
    },
    { ...HOTKEY_OPTIONS, preventDefault: true },
    [openFile],
  );
  useHotkeys(
    "ctrl+n,meta+n",
    (e) => {
      e.preventDefault();
      newFile();
    },
    { ...HOTKEY_OPTIONS, preventDefault: true },
    [newFile],
  );

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-left">
          <button
            className="icon-btn"
            onClick={newFile}
            title="New file (Ctrl+N)"
            aria-label="New file"
          >
            <NewIcon />
          </button>
          <button
            className="icon-btn"
            onClick={openFile}
            title="Open file (Ctrl+O)"
            aria-label="Open file"
          >
            <OpenIcon />
          </button>
          <button
            className="icon-btn"
            onClick={saveFile}
            title="Save file (Ctrl+S)"
            aria-label="Save file"
          >
            <SaveIcon />
          </button>
        </div>
        <div className="toolbar-right">
          <button
            className={`icon-btn${mode === "rich" ? " active" : ""}`}
            onClick={() => setMode("rich")}
            title="Rich editor (Alt+M)"
            aria-label="Rich editor"
          >
            <RichIcon />
          </button>
          <button
            className={`icon-btn${mode === "code" ? " active" : ""}`}
            onClick={() => setMode("code")}
            title="Code mode (Alt+M)"
            aria-label="Code mode"
          >
            <CodeIcon />
          </button>
          <button
            className="icon-btn"
            onClick={toggleTheme}
            title="Toggle theme (Alt+T)"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>
      <main className="main">
        <Editor ref={editorRef} mode={mode} onChange={handleChange} />
      </main>
      {toast && <div className="toast">{toast} saved successfully</div>}
    </div>
  );
}

export default App;
