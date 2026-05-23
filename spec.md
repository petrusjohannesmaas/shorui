Build a Tauri v2 desktop markdown editor application with the following specifications:

### Tech Stack
- Tauri v2 (Rust backend)
- React + TypeScript (frontend)
- Vite as the build tool
- `marked` library for markdown parsing
- No UI component library — write all styles in plain CSS with CSS custom properties

### Core Features

**Three view modes**, toggled via buttons in the toolbar:
1. **Edit only** — show only the editor pane
2. **Split** — show editor and preview side by side (equal width)
3. **Preview only** — show only the rendered markdown preview

**Toolbar buttons:**
- New File — clears the editor (prompt to confirm if there are unsaved changes)
- Open File — opens a native file picker filtered to `.md` and `.txt` files, loads content into the editor
- Save File — saves the current file (if opened from disk, save in place; if new, trigger Save As via native dialog)
- View mode toggle — three buttons or a segmented control for Edit / Split / Preview
- Theme toggle — a single icon button that switches between light and dark mode

**Theme:**
- On startup, detect the system's preferred color scheme via `prefers-color-scheme` media query and apply it as the default
- The toggle button switches between light and dark, overriding the system default for the session
- Use CSS custom properties for all theme colors so switching the `data-theme` attribute on `<html>` is all that's needed

**Editor:**
- A plain `<textarea>` styled to look clean and minimal
- Monospace font
- No line numbers needed
- Tab key should insert 2 spaces instead of moving focus

**Preview pane:**
- Renders the editor content as HTML using `marked`
- Updates live as the user types
- Style the rendered markdown properly (headings, code blocks, blockquotes, lists, links, tables)

### Tauri Integration
- Use Tauri's `dialog` plugin for open/save file dialogs
- Use Tauri's `fs` plugin to read and write files
- Handle unsaved changes state in React and prompt confirmation on New/Open if dirty

### Project Structure
Standard Tauri + Vite + React project layout:
- `src/` — React/TS frontend
- `src-tauri/` — Rust backend
- Keep all frontend logic in `src/App.tsx` and `src/App.css` — no need to split into many components given the app's simplicity

### Design
- Clean, utilitarian aesthetic fitting a developer tool
- Toolbar at the top, full height below for the panes
- No sidebar, no file tree, no tabs
- The app window should default to 1200×750 px
- Fonts: monospace for the editor, a clean system serif or sans-serif for the preview

### Deliverable
Generate all files needed to run `npm install && npm run tauri dev` and have a working app. Include:
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/App.css`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/capabilities/default.json` (granting dialog and fs permissions)
