# Shorui design

Shorui is a desktop markdown editor. It is a Tauri 2 app with a Svelte 5 frontend, and it targets Debian 13. It follows Taskflow's stack, theme and settings, and copies Taskflow's shared files rather than sharing a package with it.

## Stack

- Tauri 2 with a Rust backend in `src-tauri/`.
- Svelte 5 in runes mode, with Vite and TypeScript, in `src/`. No Svelte 4 syntax.
- Tailwind 4 through `@tailwindcss/vite`.
- shadcn-svelte components in `src/lib/components/ui/`, with `bits-ui`, `tailwind-variants`, `cn` (`src/lib/utils.ts`) and `tw-animate-css`. `components.json` holds the CLI's settings.
- Lucide icons through `@lucide/svelte`.
- Geist and Geist Mono through `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`, bundled into the build, with `system-ui` as the fallback.
- CodeMirror 6 for the editor (`@codemirror/*`, `@lezer/*`).
- `tauri-plugin-store` for settings, `tauri-plugin-dialog` for the open and save dialogs and the fs plugin for reading and writing files.

## Layout

```
src/
  main.ts                   loads settings, then mounts App
  App.svelte                the header, the editor and the Settings panel
  app.css                   Tailwind, the colour variables mapped to Tailwind, the fonts, the focus ring and the editor styles
  Editor.svelte             the CodeMirror view, with getContent, setContent and focus
  commands.ts               the markdown shortcut commands
  livePreview.ts            rich mode: rendered markdown, tables and the code block copy buttons
  lib/platform.ts           the only code that calls Tauri APIs
  lib/settings.svelte.ts    theme and accent state, saved through platform.ts
  lib/accents.ts            the nine accent colours
  lib/motion.ts             the Settings panel's fade and slide, and the reduced-motion check
  lib/components/ui/        the shadcn-svelte components
  components/               ConfirmDialog, Toast and the Settings panel
  themes/                   one CSS file per theme, and index.ts listing them
  test/setup.ts             Vitest setup
  test/fake-store.ts        an in-memory tauri-plugin-store behind mockIPC, for component tests
features/                   Gherkin files, with step definitions in features/step-definitions/
scripts/bundle-desktop.sh   builds the bundle for desktop-pull
src-tauri/src/lib.rs        Tauri builder, plugins, get_startup_file, wdio plugins behind the feature
```

## Screen

- One window, labelled `main`, with no title bar, 1280 × 720 with a 640 × 480 minimum.
- The header is one row in a three-column grid: the app icon, New, Open and Save on the left, the file name in the middle, Rich, Code and Settings on the right. On Settings, Back replaces Settings.
- The file name is the base name of the open file, or "Untitled". Its title holds the full path. A dot after it, with the text alternative "Unsaved changes", marks unsaved edits.
- The editor stays mounted for the app's whole life. Settings is an opaque, inert panel laid over it, so the text, cursor, scroll position and undo history survive a visit to Settings. The panel fades and slides in over 150 ms by 8 px, with no motion when the system asks for reduced motion.
- New and Open with unsaved changes ask "You have unsaved changes. Continue without saving?" in `ConfirmDialog`, with the focus on Cancel. Closing the window does not ask.
- A save shows "<name> saved successfully" in the toast for 2.5 seconds.
- A failed save shows "Could not save <name>" and keeps the old name and the unsaved dot. The path changes only after the write succeeds. A failed open shows "Could not open <name>" and leaves the document as it was.
- While Settings is open, the header's New, Open, Save, Rich and Code buttons are disabled. Only Back acts.

## Editor

- A save writes exactly what was typed. CodeMirror joins lines with `\n`, so `Editor.svelte` remembers whether the file used `\r\n` and writes it back the same way. `setContent` starts a fresh state, which also clears the undo history.
- Rich mode adds the live preview extensions through a CodeMirror compartment. Code mode removes them and shows the raw markdown.
- Rich mode text is Geist. Code mode and code blocks are Geist Mono.

## Keys

- Ctrl+N, Ctrl+O, Ctrl+S and Alt+M (rich and code) act only while the editor is in front.
- Alt+T switches between Light and Dark on either screen and saves the choice. Escape leaves Settings.
- The editor's own keymap holds Ctrl+B, Ctrl+I, Ctrl+Shift+C, Ctrl+H, Ctrl+L, Ctrl+K and undo and redo.

## Theming

- Each theme is a CSS file in `src/themes/` that sets the shadcn colour variables on `:root[data-theme="<id>"]`. Dark's background is #1e1e1e.
- `index.html` sets `data-theme="dark"`, so the first frame is dark before the settings load.
- The settings code sets `--accent-bg` from the accent list, and `--accent-text` is its lightness-clamped variant for text.
- In the editor, links and the caret use `--accent-text`, the blockquote bar uses `--accent-bg`, and the selection is the accent at low opacity. Headings and body text use `--foreground`.

## Settings

- `settings.json` in the app data folder holds `theme` (`light` or `dark`, default `dark`) and `accent` (default `blue`). An unknown value falls back to the default.
- A change applies at once and is then saved. Saves run one after another. A failed save is logged once as "Could not save settings" and never rejects, so callers do not catch it. The change still shows, but it will not survive a restart.
- End-to-end builds use `settings.e2e.json`, so test runs never touch the user's settings.

## Platform boundary

`src/lib/platform.ts` wraps every Tauri call: settings, the open and save dialogs, reading and writing files and `get_startup_file`. Components never import `@tauri-apps/*`. Frontend tests fake the backend with `mockIPC`.

`get_startup_file` returns the first command-line argument, which is how a file opened from the file manager reaches the editor.

## Window and app identity

- Identifier `com.petrusjohannesmaas.shorui`, product name Shorui. Never change the identifier again, because the settings folder follows it.
- The binary and Wayland app id are `shorui`.
- `npm run desktop:bundle` (`scripts/bundle-desktop.sh`) writes a bundle to `~/bundles/shorui/` for `desktop-pull`. Its desktop entry has `Exec=shorui %f` and `MimeType=text/markdown;text/plain;`, so the file manager can open markdown files in Shorui.
- `capabilities/default.json` grants the store, dialog and fs permissions, with fs scoped to the home folder.

## Tests

| Layer | Command | Runs |
|---|---|---|
| Frontend unit and component | `npm test` | Vitest in jsdom with `@testing-library/svelte`. `mockIPC` from `@tauri-apps/api/mocks` fakes the backend. |
| End-to-end | `npm run test:e2e` | Gherkin scenarios in `features/` run by WebdriverIO and Cucumber against a debug build of the real app. |

- One test: `npx vitest run src/lib/settings.test.ts`.
- `npm run build` runs `svelte-check` before `vite build`, so a type error fails the build, the e2e build and the bundle.
- Suites go through the test queue: `test-queue submit light 'npm ci && npm test'` and `test-queue submit heavy 'npm ci && npm run test:e2e'`.
- `npm run test:e2e` builds with `VITE_E2E=1 tauri build --debug --no-bundle --features wdio --config src-tauri/tauri.wdio.json`, then runs `GDK_BACKEND=x11 xvfb-run -a wdio run wdio.conf.ts`.
- `tauri-plugin-wdio` and `tauri-plugin-wdio-webdriver` sit behind the `wdio` cargo feature. The e2e build merges `tauri.wdio.json`, which enables the `wdio` capability. That capability adds `core:app:allow-exit` for restarts and fs access to the run's temporary folder, which lies outside the home scope.
- Every `@wdio/*` package stays on 9.x, because `@wdio/tauri-service` 1.5.0 needs `webdriverio` ^9.
- Scenarios that need a file start the app with the file's path as its argument, through the relaunch helper in `features/step-definitions/app.ts`.
- The Open and Save dialogs are GTK file choosers that WebDriver cannot drive, so Vitest covers them behind `mockIPC`.
