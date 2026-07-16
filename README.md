# Shorui

A minimal markdown editor built with Tauri v2, React, and TypeScript.

## Features

- **Three view modes** — Edit only, Split (side-by-side), Preview only
- **Live preview** — renders markdown as you type
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
| `Tab` | Insert two spaces |
| `Alt + E / S / P` | Edit / Split / Preview mode |
| `Alt + T` | Toggle theme |

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) — Rust backend, native dialogs and filesystem access
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) — frontend UI
- [Vite](https://vitejs.dev/) — build tool and dev server
- [marked](https://marked.js.org/) — markdown parsing

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
sudo dpkg -i src-tauri/target/release/bundle/deb/shorui_0.1.0_amd64.deb
```

## License

GPLv3 — see [LICENSE](LICENSE) for details.
