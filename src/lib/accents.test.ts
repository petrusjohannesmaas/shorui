import { describe, expect, it } from 'vitest';
import { accents, DEFAULT_ACCENT } from './accents';

describe('accents', () => {
  it('lists the nine libadwaita accents in order', () => {
    expect(accents.map(({ id, name, hex }) => [id, name, hex])).toEqual([
      ['blue', 'Blue', '#3584e4'],
      ['teal', 'Teal', '#2190a4'],
      ['green', 'Green', '#3a944a'],
      ['yellow', 'Yellow', '#c88800'],
      ['orange', 'Orange', '#ed5b00'],
      ['red', 'Red', '#e62d42'],
      ['pink', 'Pink', '#d56199'],
      ['purple', 'Purple', '#9141ac'],
      ['slate', 'Slate', '#6f8396'],
    ]);
  });

  it('defaults to Blue', () => {
    expect(DEFAULT_ACCENT).toBe('blue');
  });
});
