import { useState, useEffect } from 'react';
import { infoApi, type AlbumInfo, type TrackWikiInfo } from '../lib/api';

// Сервер ждёт MusicBrainz недолго; опоздавшие данные он дописывает в кэш
const PENDING_RETRY_MS = 4000;

// Загрузка справки; null — не найдено или ошибка, панель тогда не показываем
export function useInfo<T extends { pending: boolean }>(
  load: (fresh: boolean) => Promise<T | null>,
  peek: () => T | null | undefined,
  key: string,
) {
  const [data, setData] = useState<T | null>(() => peek() ?? null);
  const [loading, setLoading] = useState(() => peek() === undefined);
  useEffect(() => {
    // Пустой ключ — грузить нечего (например, альбом ещё не выбран)
    if (!key) { setData(null); setLoading(false); return; }
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const ready = peek();
    setData(ready ?? null);
    setLoading(ready === undefined);
    load(false)
      .then(d => {
        if (cancelled) return;
        setData(d);
        // Один повтор: к этому времени сервер обычно уже дописал состав / оценку слушателей
        if (d?.pending) {
          retry = setTimeout(() => {
            load(true).then(fresh => { if (!cancelled && fresh) setData(fresh); }).catch(() => {});
          }, PENDING_RETRY_MS);
        }
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearTimeout(retry); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, loading };
}

// Справку альбома грузит страница и отдаёт в треклист (пометки синглов) и в панель —
// так запрос и повтор при pending происходят один раз
export function useAlbumInfo(album: { id: string; title: string } | null, artistName?: string) {
  return useInfo<AlbumInfo>(
    fresh => infoApi.getAlbum(album!.id, album!.title, artistName, fresh),
    () => (album ? infoApi.peekAlbum(album.id, album.title, artistName) : null),
    album?.id ?? '',
  );
}

// Позиции песни в чартах — для блока на странице трека
export function useTrackInfo(track: { id: string; title: string; artist: string }) {
  return useInfo<TrackWikiInfo>(
    fresh => infoApi.getTrack(track.id, track.title, track.artist, fresh),
    () => infoApi.peekTrack(track.id, track.title, track.artist),
    track.id,
  );
}
