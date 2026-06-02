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
