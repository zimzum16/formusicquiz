// Копия server/lib/text.ts: фронт и сервер собираются раздельно (Docker фронта не видит server/)

// Ключ для сравнения имён и названий: без регистра, диакритики, пробелов и пунктуации.
// Буквы любого алфавита — латинский [^a-z0-9] превращал кириллицу в пустую строку
export function normKey(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и',
  k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с',
  t: 'т', u: 'у', f: 'ф', h: 'х', c: 'ц', y: 'ы',
}

// Ключ без учёта алфавита: Alisa ≈ Алиса. В тегах и Spotify одно и то же имя бывает в обоих написаниях
export function translitKey(s: string): string {
  return normKey(s).replace(/[a-z]/g, c => LATIN_TO_CYRILLIC[c] ?? c)
}

// Нестрогое совпадение: одно содержит другое. Пустой ключ ни с чем не совпадает
export function namesOverlap(a: string, b: string, key: (s: string) => string = normKey): boolean {
  const ka = key(a)
  const kb = key(b)
  if (!ka || !kb) return false
  return ka.includes(kb) || kb.includes(ka)
}
