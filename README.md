# Shorui

A minimal markdown editor built with Tauri v2, React, and TypeScript.

## Features

- **Rich editor (default)** — headings, emphasis, links, lists, quotes and code blocks render in place; markers reappear around the cursor
- **Code mode** — the same editor with the raw markdown showing
- **Lossless** — the text is never re-serialised, so a save writes exactly what you typed
- **Light/Dark theme** — follows system preference by default, toggleable
- **File support** — open and save `.md` and `.txt` files
- **Unsaved changes** — prompts before discarding unsaved work
- **Toast notifications** — confirms successful saves
- **Code block copy buttons** — one-click copy for fenced code blocks
- **Undo / redo** — full editing history with the standard keybinds
- **Markdown shortcuts** — bold, italic, headings, code, lists, and links from the keyboard

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + N` | New file |
| `Ctrl/Cmd + O` | Open file |
| `Ctrl/Cmd + S` | Save file |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` / `Ctrl + Y` | Redo |
| `Ctrl/Cmd + B` | Toggle **bold** |
| `Ctrl/Cmd + I` | Toggle *italic* |
| `Ctrl/Cmd + Shift + C` | Toggle `inline code` |
| `Ctrl/Cmd + H` | Cycle heading level (H1 → H6 → none) |
| `Ctrl/Cmd + L` | Cycle list (bullet → numbered → none) |
| `Ctrl/Cmd + K` | Insert link |
| `Alt + ↑ / ↓` | Move line(s) up / down |
| `Tab` / `Shift + Tab` | Indent / outdent |
| `Alt + M` | Switch between rich editor and code mode |
| `Alt + T` | Toggle theme |

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) — Rust backend, native dialogs and filesystem access
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) — frontend UI
- [Vite](https://vitejs.dev/) — build tool and dev server
- [CodeMirror 6](https://codemirror.net/) — editor, with a live-preview extension in `src/livePreview.ts`

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) (v18+)
- System dependencies for Tauri (Linux): `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`

## Development

```bash
npm install
npm run tauri dev
```

## Build

Build a `.deb` package:

```bash
npm run tauri build
```

The output will be in `src-tauri/target/release/bundle/deb/`.

### Install the `.deb`

```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/Shorui_0.2.0_amd64.deb
```

## License

GPLv3 — see [LICENSE](LICENSE) for details.
