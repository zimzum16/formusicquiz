const BASE = 'https://api.setlist.fm/rest/1.0';
const BATCH_SIZE = 15;
const MBID_CACHE_TTL = 24 * 60 * 60 * 1000;

interface Performance {
  date: string;
  venue: string;
  city: string;
  tour: string | null;
}

export interface SetlistStats {
  total_performances: number;
  url: string;
  first_performance: Performance | null;
  last_performance: Performance | null;
}

function headers() {
  return {
    'x-api-key': process.env.SETLISTFM_API_KEY!,
    Accept: 'application/json',
  };
}

const mbidCache = new Map<string, { mbid: string; ts: number }>();

async function getArtistMbid(artistName: string): Promise<string | null> {
  const key = artistName.toLowerCase();
  const cached = mbidCache.get(key);
  if (cached && Date.now() - cached.ts < MBID_CACHE_TTL) return cached.mbid;

  const res = await fetch(
    `${BASE}/search/artists?artistName=${encodeURIComponent(artistName)}&sort=relevance`,
    { headers: headers() }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { artist?: { mbid: string }[] };
  const mbid = data.artist?.[0]?.mbid ?? null;
  if (mbid) mbidCache.set(key, { mbid, ts: Date.now() });
  return mbid;
}

async function fetchPage(mbid: string, page: number): Promise<SetlistPage | null> {
  const res = await fetch(`${BASE}/artist/${mbid}/setlists?p=${page}`, { headers: headers() });
  if (!res.ok) return null;
  const data = (await res.json()) as SetlistPage;
  return data.setlist?.length ? data : null;
}

export async function getTrackStats(title: string, artist: string): Promise<SetlistStats | null> {
  const key = process.env.SETLISTFM_API_KEY;
  if (!key) return null;

  const mbid = await getArtistMbid(artist);
  if (!mbid) return null;

  const titleLower = title.toLowerCase();

  // Page 1 to learn total pages
  const firstData = await fetchPage(mbid, 1);
  if (!firstData) return null;

  const totalPages = Math.ceil(firstData.total / firstData.itemsPerPage);
  const allPages: SetlistPage[] = [firstData];

  // Fetch remaining pages in parallel batches (no delay — 429s are skipped gracefully)
  for (let batchStart = 2; batchStart <= totalPages; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalPages);
    const pageNums = Array.from({ length: batchEnd - batchStart + 1 }, (_, i) => batchStart + i);
    const results = await Promise.allSettled(pageNums.map(p => fetchPage(mbid, p)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) allPages.push(r.value);
    }
  }

  // Collect all performances of this song across all pages
  const toSortable = (d: string) => d.split('-').reverse().join('-');
  const performances: (Performance & { timestamp: string })[] = [];

  for (const page of allPages) {
    for (const setlist of page.setlist) {
      for (const set of setlist.sets?.set ?? []) {
        for (const song of set.song ?? []) {
          if (song.name.toLowerCase() === titleLower) {
            performances.push({
              date: setlist.eventDate,
              venue: setlist.venue?.name ?? '',
              city: setlist.venue?.city?.name ?? '',
              tour: setlist.tour?.name ?? null,
              timestamp: setlist.eventDate,
            });
          }
        }
      }
    }
  }

  if (performances.length === 0) return null;

  performances.sort((a, b) => toSortable(a.timestamp).localeCompare(toSortable(b.timestamp)));
  const first = performances[0];
  const last = performances[performances.length - 1];

  return {
    total_performances: performances.length,
    url: `https://www.setlist.fm/stats/songs/${mbid}.html?songName=${encodeURIComponent(title)}`,
    first_performance: { date: first.date, venue: first.venue, city: first.city, tour: first.tour },
    last_performance: { date: last.date, venue: last.venue, city: last.city, tour: last.tour },
  };
}

interface SetlistPage {
  total: number;
  itemsPerPage: number;
  setlist: {
    eventDate: string;
    tour?: { name: string };
    venue?: { name: string; city?: { name: string } };
    sets?: {
      set: {
        encore?: number;
        song?: { name: string }[];
      }[];
    };
  }[];
}
