export function getSearchUrl(title: string, artist: string): string {
  const query = encodeURIComponent(`${artist} ${title}`);
  return `https://music.yandex.ru/search?text=${query}`;
}
