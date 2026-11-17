// The libadwaita accent palette, in the order the Settings panel shows it.
export const accents = [
  { id: 'blue', name: 'Blue', hex: '#3584e4' },
  { id: 'teal', name: 'Teal', hex: '#2190a4' },
  { id: 'green', name: 'Green', hex: '#3a944a' },
  { id: 'yellow', name: 'Yellow', hex: '#c88800' },
  { id: 'orange', name: 'Orange', hex: '#ed5b00' },
  { id: 'red', name: 'Red', hex: '#e62d42' },
  { id: 'pink', name: 'Pink', hex: '#d56199' },
  { id: 'purple', name: 'Purple', hex: '#9141ac' },
  { id: 'slate', name: 'Slate', hex: '#6f8396' },
] as const;

export type AccentId = (typeof accents)[number]['id'];

export const DEFAULT_ACCENT: AccentId = 'blue';

export function isAccentId(value: unknown): value is AccentId {
  return accents.some((accent) => accent.id === value);
}

export function accentHex(id: AccentId): string {
  return accents.find((accent) => accent.id === id)!.hex;
}
