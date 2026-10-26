import type { AlbumInfo } from './api';

type AlbumSingle = AlbumInfo['singles'][number];

// "Heart-Shaped Box - 2013 Mix" и "Heart‐Shaped Box (Remastered)" → "heartshapedbox"
const normTitle = (s: string) => s
  .toLowerCase()
  .replace(/\s+-\s+.*$/, '')
  .replace(/[([].*?[)\]]/g, '')
  .normalize('NFKD')
  .replace(/[^\p{L}\p{N}]/gu, '');

// Сопоставление синглов с треками; двойной сингл "All Apologies / Rape Me" помечает оба трека
export function matchSingles(tracks: { id: string; title: string }[], singles: AlbumSingle[]) {
  const byTitle = new Map<string, AlbumSingle>();
  for (const single of singles) {
    for (const part of single.title.split(/\s+\/\s+/)) byTitle.set(normTitle(part), single);
  }
  const byTrack = new Map<string, AlbumSingle>();
  const matched = new Set<AlbumSingle>();
  for (const track of tracks) {
    const single = byTitle.get(normTitle(track.title));
    if (single) { byTrack.set(track.id, single); matched.add(single); }
  }
  return { byTrack, unmatched: singles.filter(s => !matched.has(s)) };
}
