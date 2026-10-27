// Страны из тегов Genius («Russia», «Deutschland», «South Korea (대한민국)») → флаг и название

const GENIUS_COUNTRY: Record<string, { flag: string; ru: string }> = {
  // English names
  'USA': { flag: '🇺🇸', ru: 'США' },
  'Canada': { flag: '🇨🇦', ru: 'Канада' },
  'UK': { flag: '🇬🇧', ru: 'Великобритания' },
  'England': { flag: '🇬🇧', ru: 'Великобритания' },
  'Australia': { flag: '🇦🇺', ru: 'Австралия' },
  'France': { flag: '🇫🇷', ru: 'Франция' },
  'Germany': { flag: '🇩🇪', ru: 'Германия' },
  'Spain': { flag: '🇪🇸', ru: 'Испания' },
  'Italy': { flag: '🇮🇹', ru: 'Италия' },
  'Sweden': { flag: '🇸🇪', ru: 'Швеция' },
  'Norway': { flag: '🇳🇴', ru: 'Норвегия' },
  'Denmark': { flag: '🇩🇰', ru: 'Дания' },
  'Netherlands': { flag: '🇳🇱', ru: 'Нидерланды' },
  'Belgium': { flag: '🇧🇪', ru: 'Бельгия' },
  'Switzerland': { flag: '🇨🇭', ru: 'Швейцария' },
  'Austria': { flag: '🇦🇹', ru: 'Австрия' },
  'Finland': { flag: '🇫🇮', ru: 'Финляндия' },
  'Iceland': { flag: '🇮🇸', ru: 'Исландия' },
  'Ireland': { flag: '🇮🇪', ru: 'Ирландия' },
  'Poland': { flag: '🇵🇱', ru: 'Польша' },
  'Russia': { flag: '🇷🇺', ru: 'Россия' },
  'Ukraine': { flag: '🇺🇦', ru: 'Украина' },
  'Czech Republic': { flag: '🇨🇿', ru: 'Чехия' },
  'Hungary': { flag: '🇭🇺', ru: 'Венгрия' },
  'Romania': { flag: '🇷🇴', ru: 'Румыния' },
  'Greece': { flag: '🇬🇷', ru: 'Греция' },
  'Turkey': { flag: '🇹🇷', ru: 'Турция' },
  'Portugal': { flag: '🇵🇹', ru: 'Португалия' },
  'Japan': { flag: '🇯🇵', ru: 'Япония' },
  'South Korea': { flag: '🇰🇷', ru: 'Южная Корея' },
  'China': { flag: '🇨🇳', ru: 'Китай' },
  'India': { flag: '🇮🇳', ru: 'Индия' },
  'Israel': { flag: '🇮🇱', ru: 'Израиль' },
  'Egypt': { flag: '🇪🇬', ru: 'Египет' },
  'Nigeria': { flag: '🇳🇬', ru: 'Нигерия' },
  'Ghana': { flag: '🇬🇭', ru: 'Гана' },
  'South Africa': { flag: '🇿🇦', ru: 'ЮАР' },
  'Kenya': { flag: '🇰🇪', ru: 'Кения' },
  'Senegal': { flag: '🇸🇳', ru: 'Сенегал' },
  'Jamaica': { flag: '🇯🇲', ru: 'Ямайка' },
  'Trinidad & Tobago': { flag: '🇹🇹', ru: 'Тринидад и Тобаго' },
  'Puerto Rico': { flag: '🇵🇷', ru: 'Пуэрто-Рико' },
  'Cuba': { flag: '🇨🇺', ru: 'Куба' },
  'Haiti': { flag: '🇭🇹', ru: 'Гаити' },
  'Dominican Republic': { flag: '🇩🇴', ru: 'Доминиканская Республика' },
  'Panama': { flag: '🇵🇦', ru: 'Панама' },
  'Brazil': { flag: '🇧🇷', ru: 'Бразилия' },
  'Argentina': { flag: '🇦🇷', ru: 'Аргентина' },
  'Colombia': { flag: '🇨🇴', ru: 'Колумбия' },
  'Chile': { flag: '🇨🇱', ru: 'Чили' },
  'Peru': { flag: '🇵🇪', ru: 'Перу' },
  'Venezuela': { flag: '🇻🇪', ru: 'Венесуэла' },
  'Ecuador': { flag: '🇪🇨', ru: 'Эквадор' },
  'Mexico': { flag: '🇲🇽', ru: 'Мексика' },
  'Uruguay': { flag: '🇺🇾', ru: 'Уругвай' },
  'Paraguay': { flag: '🇵🇾', ru: 'Парагвай' },
  'Bolivia': { flag: '🇧🇴', ru: 'Боливия' },
  'Costa Rica': { flag: '🇨🇷', ru: 'Коста-Рика' },
  'Guatemala': { flag: '🇬🇹', ru: 'Гватемала' },
  'Honduras': { flag: '🇭🇳', ru: 'Гондурас' },
  'El Salvador': { flag: '🇸🇻', ru: 'Сальвадор' },
  'Nicaragua': { flag: '🇳🇮', ru: 'Никарагуа' },
  'New Zealand': { flag: '🇳🇿', ru: 'Новая Зеландия' },
  'Mongolia': { flag: '🇲🇳', ru: 'Монголия' },
  'Tunisian': { flag: '🇹🇳', ru: 'Тунис' },
  'Tunisia': { flag: '🇹🇳', ru: 'Тунис' },
  'Algerian': { flag: '🇩🇿', ru: 'Алжир' },
  'Algeria': { flag: '🇩🇿', ru: 'Алжир' },
  'Moroccan': { flag: '🇲🇦', ru: 'Марокко' },
  'Morocco': { flag: '🇲🇦', ru: 'Марокко' },
  'Ethiopian': { flag: '🇪🇹', ru: 'Эфиопия' },
  'Ethiopia': { flag: '🇪🇹', ru: 'Эфиопия' },
  'Kazakhstan': { flag: '🇰🇿', ru: 'Казахстан' },
  'Uzbekistan': { flag: '🇺🇿', ru: 'Узбекистан' },
  'Azerbaijan': { flag: '🇦🇿', ru: 'Азербайджан' },
  'Georgia': { flag: '🇬🇪', ru: 'Грузия' },
  'Armenia': { flag: '🇦🇲', ru: 'Армения' },
  'Iran': { flag: '🇮🇷', ru: 'Иран' },
  'Iraq': { flag: '🇮🇶', ru: 'Ирак' },
  'Saudi Arabia': { flag: '🇸🇦', ru: 'Саудовская Аравия' },
  'Lebanon': { flag: '🇱🇧', ru: 'Ливан' },
  'Pakistan': { flag: '🇵🇰', ru: 'Пакистан' },
  'Bangladesh': { flag: '🇧🇩', ru: 'Бангладеш' },
  'Indonesia': { flag: '🇮🇩', ru: 'Индонезия' },
  'Philippines': { flag: '🇵🇭', ru: 'Филиппины' },
  'Vietnam': { flag: '🇻🇳', ru: 'Вьетнам' },
  'Thailand': { flag: '🇹🇭', ru: 'Таиланд' },
  'Malaysia': { flag: '🇲🇾', ru: 'Малайзия' },
  'Singapore': { flag: '🇸🇬', ru: 'Сингапур' },
  'Taiwan': { flag: '🇹🇼', ru: 'Тайвань' },
  // Native language names (Genius sometimes uses them)
  'Deutschland': { flag: '🇩🇪', ru: 'Германия' },
  'België/Belgique': { flag: '🇧🇪', ru: 'Бельгия' },
  'Österreich': { flag: '🇦🇹', ru: 'Австрия' },
  'Schweiz/Suisse': { flag: '🇨🇭', ru: 'Швейцария' },
  'España': { flag: '🇪🇸', ru: 'Испания' },
  'Italia': { flag: '🇮🇹', ru: 'Италия' },
  'Brasil': { flag: '🇧🇷', ru: 'Бразилия' },
  'México': { flag: '🇲🇽', ru: 'Мексика' },
  'Sverige': { flag: '🇸🇪', ru: 'Швеция' },
  'Norge': { flag: '🇳🇴', ru: 'Норвегия' },
  'Danmark': { flag: '🇩🇰', ru: 'Дания' },
  'Nederland': { flag: '🇳🇱', ru: 'Нидерланды' },
  'Suomi': { flag: '🇫🇮', ru: 'Финляндия' },
  'Suomi/Finland': { flag: '🇫🇮', ru: 'Финляндия' },
  'Ísland': { flag: '🇮🇸', ru: 'Исландия' },
  'Polska': { flag: '🇵🇱', ru: 'Польша' },
  'Россия': { flag: '🇷🇺', ru: 'Россия' },
  'Україна': { flag: '🇺🇦', ru: 'Украина' },
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const GENIUS_COUNTRY_NORM = Object.fromEntries(
  Object.entries(GENIUS_COUNTRY).map(([k, v]) => [norm(k), v])
);

function lookupCountryWithKey(s: string): { flag: string; ru: string; en: string } | undefined {
  if (GENIUS_COUNTRY[s]) return { en: s, ...GENIUS_COUNTRY[s] };
  const normKey = norm(s);
  const entry = GENIUS_COUNTRY_NORM[normKey];
  if (!entry) return undefined;
  const origKey = Object.keys(GENIUS_COUNTRY).find(k => norm(k) === normKey) ?? s;
  return { en: origKey, ...entry };
}

export function getCountriesFromTags(tags: string[], lang: 'ru' | 'en'): { flag: string; name: string }[] {
  const seen = new Set<string>();
  const result: { flag: string; name: string }[] = [];
  for (const tag of tags) {
    const entry = lookupCountryWithKey(tag) ?? (() => {
      // "South Korea (대한민국)" → try inside parens, then before parens
      const inParens = tag.match(/\(([^)]+)\)$/);
      if (inParens) { const e = lookupCountryWithKey(inParens[1]); if (e) return e; }
      const beforeParens = tag.replace(/\s*\([^)]*\)$/, '').trim();
      const e2 = lookupCountryWithKey(beforeParens); if (e2) return e2;
      // "Tunisian - تونسي" → try before " - "
      return lookupCountryWithKey(tag.split(' - ')[0].trim());
    })();
    if (entry && !seen.has(entry.ru)) {
      seen.add(entry.ru);
      result.push({ flag: entry.flag, name: lang === 'en' ? entry.en : entry.ru });
    }
  }
  return result;
}

// Regional Indicator emoji → ISO alpha-2 code: 🇷🇺 → 'ru'
export const flagEmojiToIso = (flag: string) =>
  [...flag].map(c => String.fromCharCode(c.codePointAt(0)! - 0x1F1E6 + 65)).join('').toLowerCase();
