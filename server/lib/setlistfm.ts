const BASE = 'https://api.setlist.fm/rest/1.0';

interface Performance {
  date: string;
  venue: string;
  city: string;
  tour: string | null;
}

export interface SetlistStats {
  total_performances: number;
  encore_count: number;
  first_performance: Performance | null;
  last_performance: Performance | null;
}

function headers() {
  return {
    'x-api-key': process.env.SETLISTFM_API_KEY!,
    Accept: 'application/json',
  };
}

async function getArtistMbid(artistName: string): Promise<string | null> {
  const res = await fetch(
    `${BASE}/search/artists?artistName=${encodeURIComponent(artistName)}&sort=relevance`,
    { headers: headers() }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { artist?: { mbid: string }[] };
  return data.artist?.[0]?.mbid ?? null;
}

export async function getTrackStats(title: string, artist: string): Promise<SetlistStats | null> {
  const key = process.env.SETLISTFM_API_KEY;
  if (!key) return null;

  const mbid = await getArtistMbid(artist);
  if (!mbid) return null;

  const titleLower = title.toLowerCase();
  let page = 1;
  let total_performances = 0;
  let encore_count = 0;
  const performances: (Performance & { timestamp: string })[] = [];

  // Fetch up to 5 pages (max 100 setlists) to keep response time reasonable
  while (page <= 5) {
    const res = await fetch(`${BASE}/artist/${mbid}/setlists?p=${page}`, {
      headers: headers(),
    });
    if (!res.ok) break;

    const data = (await res.json()) as SetlistPage;
    if (!data.setlist?.length) break;

    for (const setlist of data.setlist) {
      for (const set of setlist.sets?.set ?? []) {
        for (const song of set.song ?? []) {
          if (song.name.toLowerCase() === titleLower) {
            total_performances++;
            if (set.encore) encore_count++;
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

    const totalPages = Math.ceil(data.total / data.itemsPerPage);
    if (page >= totalPages) break;
    page++;
  }

  if (total_performances === 0) return null;

  // Setlist.fm dates are DD-MM-YYYY — convert to YYYY-MM-DD for correct sorting
  const toSortable = (d: string) => d.split('-').reverse().join('-');
  performances.sort((a, b) => toSortable(a.timestamp).localeCompare(toSortable(b.timestamp)));
  const first = performances[0];
  const last = performances[performances.length - 1];

  return {
    total_performances,
    encore_count,
    first_performance: first
      ? { date: first.date, venue: first.venue, city: first.city, tour: first.tour }
      : null,
    last_performance: last
      ? { date: last.date, venue: last.venue, city: last.city, tour: last.tour }
      : null,
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
