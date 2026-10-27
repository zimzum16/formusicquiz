// Ключ для сравнения имён и названий: без регистра, диакритики, пробелов и пунктуации.
// Буквы любого алфавита — латинский [^a-z0-9] превращал кириллицу в пустую строку,
// и все русские названия «совпадали» друг с другом
export function normKey(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

// Нестрогое совпадение имён: одно содержит другое. Пустой ключ ни с чем не совпадает
export function namesOverlap(a: string, b: string): boolean {
  const ka = normKey(a);
  const kb = normKey(b);
  if (!ka || !kb) return false;
  return ka.includes(kb) || kb.includes(ka);
}
