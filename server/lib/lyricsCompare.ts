import { load } from 'cheerio';

export function extractLyricsText(html: string): string {
  const $ = load(html);
  const parts: string[] = [];
  $('div[data-lyrics-container="true"]').each((_, el) => {
    $(el).find('[data-exclude-from-selection="true"]').remove();
    $(el).find('br').replaceWith('\n');
    parts.push($(el).text());
  });
  return parts.join('\n').trim();
}
