import { accentHex, DEFAULT_ACCENT, isAccentId, type AccentId } from './accents';
import { DEFAULT_THEME, isThemeId, type ThemeId } from '../themes';
import { loadSettings, saveSettings } from './platform';

let theme = $state<ThemeId>(DEFAULT_THEME);
let accent = $state<AccentId>(DEFAULT_ACCENT);

// The theme's CSS file gives every colour, so a change only swaps the
// data-theme value and the accent the theme reads from.
function apply() {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.setProperty('--accent-bg', accentHex(accent));
}

// Saves run one after another. Otherwise two quick changes interleave their
// store writes, and an earlier save can capture a later change half-written.
// A failed save is logged here, once, and the chain carries on, so no caller
// has to catch it. The change still shows, but it won't survive a restart.
let saving: Promise<void> = Promise.resolve();

function save() {
  const values = { theme, accent };
  saving = saving.then(() =>
    saveSettings(values).catch((error: unknown) => {
      console.error('Could not save settings', error);
    }),
  );
  return saving;
}

export const settings = {
  get theme() {
    return theme;
  },
  get accent() {
    return accent;
  },

  // Reads the saved settings and applies them. Unknown values fall back to
  // the defaults.
  async load() {
    const saved = await loadSettings();
    theme = isThemeId(saved.theme) ? saved.theme : DEFAULT_THEME;
    accent = isAccentId(saved.accent) ? saved.accent : DEFAULT_ACCENT;
    apply();
  },

  // Applies the change at once, then saves it.
  setTheme(id: ThemeId) {
    theme = id;
    apply();
    return save();
  },

  setAccent(id: AccentId) {
    accent = id;
    apply();
    return save();
  },

  // Alt+T's quick switch between the two themes, saved through the same path
  // as a choice in Settings.
  toggleTheme() {
    return this.setTheme(theme === 'dark' ? 'light' : 'dark');
  },
};
