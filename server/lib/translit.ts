const CYR_TO_LAT: Record<string, string> = {
  'а': 'a',  'б': 'b',  'в': 'v',  'г': 'g',  'д': 'd',
  'е': 'e',  'ё': 'yo', 'ж': 'zh', 'з': 'z',  'и': 'i',
  'й': 'y',  'к': 'k',  'л': 'l',  'м': 'm',  'н': 'n',
  'о': 'o',  'п': 'p',  'р': 'r',  'с': 's',  'т': 't',
  'у': 'u',  'ф': 'f',  'х': 'kh', 'ц': 'ts', 'ч': 'ch',
  'ш': 'sh', 'щ': 'shch','ъ': '',  'ы': 'y',  'ь': '',
  'э': 'e',  'ю': 'yu', 'я': 'ya',
};

// Digraphs must come before single chars in order
const LAT_TO_CYR: [string, string][] = [
  ['shch', 'щ'], ['zh', 'ж'], ['kh', 'х'], ['ts', 'ц'],
  ['ch', 'ч'],   ['sh', 'ш'], ['yo', 'ё'], ['yu', 'ю'], ['ya', 'я'],
  ['a', 'а'], ['b', 'б'], ['v', 'в'], ['g', 'г'], ['d', 'д'],
  ['e', 'е'], ['z', 'з'], ['i', 'и'], ['y', 'й'], ['k', 'к'],
  ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'],
  ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'], ['f', 'ф'],
];

// Keyboard layout map: Russian key position → English character (ЙЦУКЕН → QWERTY)
const RU_KEY_TO_EN: Record<string, string> = {
  'й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']',
  'ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':"'",
  'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m',
};

// Characters that almost never start a Russian word — strong sign of keyboard mismatch
const RARE_WORD_STARTERS = new Set(['ы','ь','ъ']);

export function hasCyrillic(s: string): boolean {
  return /[Ѐ-ӿ]/.test(s);
}

export function looksLikeKeyboardMismatch(s: string): boolean {
  return s.toLowerCase().split(/\s+/).some(w => w.length > 0 && RARE_WORD_STARTERS.has(w[0]));
}

export function keyboardToLatin(s: string): string {
  return s.split('').map(ch => {
    const lo = ch.toLowerCase();
    const en = RU_KEY_TO_EN[lo];
    if (!en) return ch;
    return ch !== lo ? en.toUpperCase() : en;
  }).join('');
}

export function cyrToLat(s: string): string {
  return s.split('').map(ch => {
    const lo = ch.toLowerCase();
    if (lo in CYR_TO_LAT) {
      const r = CYR_TO_LAT[lo];
      return ch !== lo ? r.charAt(0).toUpperCase() + r.slice(1) : r;
    }
    return ch;
  }).join('');
}

export function latToCyr(s: string): string {
  const lo = s.toLowerCase();
  let result = '';
  let i = 0;
  while (i < lo.length) {
    let matched = false;
    for (const [lat, cyr] of LAT_TO_CYR) {
      if (lo.startsWith(lat, i)) {
        result += cyr;
        i += lat.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += lo[i];
      i++;
    }
  }
  return result;
}
