import { describe, expect, it } from 'vitest';
import { parseTagsFromHtml } from './genius.js';
import { extractLyricsText } from './lyricsCompare.js';
import { parseGeniusLyrics } from '../routes/tracks.js';

describe('parseTagsFromHtml', () => {
  it('читает теги из ссылок и декодирует HTML-сущности', () => {
    const html = `<a href="https://genius.com/tags/rock" class="t">Rock</a>
<a href="https://genius.com/tags/rnb">R&amp;B</a>`;
    expect(parseTagsFromHtml(html)).toEqual(['Rock', 'R&B']);
  });

  it('читает теги из __NEXT_DATA__', () => {
    const data = { props: { pageProps: { songPage: { song: { tags: [{ name: 'Pop' }, { name: 'Cover' }] } } } } };
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;
    expect(parseTagsFromHtml(html)).toEqual(['Pop', 'Cover']);
  });

  it('читает теги из встроенного JSON', () => {
    const html = `{"url":"https://genius.com/tags/grunge","primary":true,"name":"Grunge"}`;
    expect(parseTagsFromHtml(html)).toEqual(['Grunge']);
  });

  it('нет тегов — пустой список', () => {
    expect(parseTagsFromHtml('<html></html>')).toEqual([]);
  });
});

const page = (...containers: string[]) =>
  `<html><body>${containers.map(c => `<div data-lyrics-container="true">${c}</div>`).join('<div>ad</div>')}</body></html>`;

describe('extractLyricsText', () => {
  it('склеивает контейнеры, переводит <br> в переносы и убирает служебные блоки', () => {
    const html = page(
      '<div data-exclude-from-selection="true">5 Contributors</div>[Verse 1]<br>Line one<br><a href="#">Line two</a>',
      '[Chorus]<br>Hook',
    );
    expect(extractLyricsText(html)).toBe('[Verse 1]\nLine one\nLine two\n[Chorus]\nHook');
  });
});

describe('parseGeniusLyrics', () => {
  it('делит текст на секции с типом и русской меткой', () => {
    const html = page('[Intro]<br>Yeah<br>[Verse 1: Drake]<br>A<br>B<br>[Pre-Chorus]<br>C<br>[Chorus]<br>D<br>[Bridge]<br>E');
    expect(parseGeniusLyrics(html)).toEqual([
      { type: 'intro', label: 'Интро', lines: ['Yeah'] },
      { type: 'verse', label: 'Куплет 1', lines: ['A', 'B'] },
      { type: 'pre-chorus', label: 'Пред-припев', lines: ['C'] },
      { type: 'chorus', label: 'Припев', lines: ['D'] },
      { type: 'bridge', label: 'Бридж', lines: ['E'] },
    ]);
  });

  it('отделяет маркер секции, приклеенный к тексту', () => {
    const html = page('Read More [Verse 1]<br>Line');
    expect(parseGeniusLyrics(html)).toEqual([{ type: 'verse', label: 'Куплет 1', lines: ['Line'] }]);
  });

  it('пустые секции пропускаются, без контейнеров — пустой список', () => {
    expect(parseGeniusLyrics(page('[Intro]<br>[Verse]<br>X'))).toEqual([{ type: 'verse', label: 'Куплет', lines: ['X'] }]);
    expect(parseGeniusLyrics('<html></html>')).toEqual([]);
  });
});
