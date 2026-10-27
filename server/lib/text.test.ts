import { describe, expect, it } from 'vitest';
import { namesOverlap, normKey } from './text.js';

describe('normKey', () => {
  it('убирает регистр, пробелы и пунктуацию', () => {
    expect(normKey("Guns N' Roses")).toBe('gunsnroses');
    expect(normKey('AC/DC')).toBe('acdc');
  });

  it('сохраняет кириллицу и другие алфавиты', () => {
    expect(normKey('Группа Крови!')).toBe('группакрови');
    expect(normKey('五月天')).toBe('五月天');
  });

  it('снимает диакритику, ё и е совпадают', () => {
    expect(normKey('Beyoncé')).toBe('beyonce');
    expect(normKey('Ёлка')).toBe(normKey('Елка'));
  });
});

describe('namesOverlap', () => {
  it('совпадение по вхождению в обе стороны', () => {
    expect(namesOverlap('Nirvana', 'nirvana (band)')).toBe(true);
    expect(namesOverlap('Kino', 'Kino Official')).toBe(true);
  });

  it('разные кириллические имена не совпадают', () => {
    expect(namesOverlap('Кино', 'Сплин')).toBe(false);
  });

  it('пустой ключ ни с чем не совпадает', () => {
    expect(namesOverlap('!!!', 'Nirvana')).toBe(false);
    expect(namesOverlap('', '')).toBe(false);
  });
});
