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

export function lrcToPlainText(lrcContent: string): string {
  return lrcContent
    .split('\n')
    .map(line => line.replace(/\[\d{2}:\d{2}(\.\d{2,3})?\]/g, '').trim())
    .filter(Boolean)
    .join(' ');
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\[.*?\]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

export function similarityRatio(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export async function fetchLyricsHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return '';
  return extractLyricsText(await res.text());
}

export async function compareLrcWithGenius(
  geniusUrl: string,
  lrcContent: string,
  threshold = 0.85,
): Promise<{ matched: boolean; similarity: number }> {
  const geniusText = await fetchLyricsHtml(geniusUrl);
  const ratio = similarityRatio(
    normalizeText(geniusText),
    normalizeText(lrcToPlainText(lrcContent)),
  );
  return { matched: ratio >= threshold, similarity: Math.round(ratio * 1000) / 10 };
}
