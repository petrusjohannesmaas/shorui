import './light.css';
import './dark.css';

// Each theme is one CSS file that sets the colour variables on
// :root[data-theme="<id>"]. To add a theme, add its file, import it above and
// list it here.
export const themes = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
] as const;

export type ThemeId = (typeof themes)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'dark';

export function isThemeId(value: unknown): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}
