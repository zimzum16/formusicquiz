// Разбор вики-разметки английской статьи об альбоме: оценки критиков, синглы, чарты, сертификации

export type Localized = { ru: string | null; en: string | null };

export interface CriticRating {
  source: string;
  score: string;
}

export interface Single {
  title: string;
  date: string | null;  // YYYY-MM-DD / YYYY-MM / YYYY, либо исходный текст, если формат не распознан
}

export interface ChartPeak {
  chart: string;  // код из шаблона {{Album chart}}: Billboard200, UK2, Australia…
  name: Localized;
  peak: number;
}

export interface Certification {
  region: Localized;
  award: string;  // gold / platinum / diamond / silver — как в шаблоне, в нижнем регистре
  multiplier: number;
  units: number | null;  // salesamount, если указан в статье
}

// ── Общие помощники ───────────────────────────────────────────────────────────

export function cleanWikitext(s: string): string {
  return s
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')  // [[Ссылка|текст]] → текст
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

const stripRefs = (s: string) => s
  .replace(/<ref[^>]*\/>/g, '')
  .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');

// Шаблон целиком, начиная с позиции start, с учётом вложенных {{…}}
function templateAt(wikitext: string, start: number): string {
  let depth = 0;
  let end = start;
  for (; end < wikitext.length - 1; end++) {
    if (wikitext.startsWith('{{', end)) { depth++; end++; }
    else if (wikitext.startsWith('}}', end)) { depth--; end++; if (depth === 0) break; }
  }
  return wikitext.slice(start, end + 1);
}

// Именованные поля многострочного шаблона: | key = value на каждой строке
function multilineFields(block: string): Map<string, string> {
  const fields = new Map<string, string>();
  // Закрывающие }} шаблона иначе прилипают к последнему полю
  for (const line of stripRefs(block).replace(/\}\}\s*$/, '').split(/\n\s*\|/)) {
    const eq = line.indexOf('=');
    if (eq > 0) fields.set(line.slice(0, eq).trim().toLowerCase(), line.slice(eq + 1).trim());
  }
  return fields;
}

// Аргументы однострочного шаблона {{name|a|b|key=value}}: позиционные и именованные
function inlineArgs(template: string): { positional: string[]; named: Map<string, string> } {
  const inner = stripRefs(template).replace(/^\{\{|\}\}$/g, '');
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; current += two; i++; continue; }
    if (two === '}}' || two === ']]') { depth--; current += two; i++; continue; }
    if (inner[i] === '|' && depth === 0) { parts.push(current); current = ''; continue; }
    current += inner[i];
  }
  parts.push(current);

  const positional: string[] = [];
  const named = new Map<string, string>();
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0 && /^[\w\s-]+$/.test(p.slice(0, eq))) named.set(p.slice(0, eq).trim().toLowerCase(), p.slice(eq + 1).trim());
    else positional.push(p.trim());
  }
  return { positional, named };
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// "August 30, 1993", "30 August 1993", "August 1993", {{Start date|1993|8|30}} → ISO-подобная строка
function parseEnglishDate(raw: string): string | null {
  // {{Start date|1993|8|30}}, {{Start date|df=y|1976|12}}
  const startAt = raw.search(/\{\{\s*start date\s*\|/i);
  if (startAt >= 0) {
    const [y, m, d] = inlineArgs(templateAt(raw, startAt)).positional;
    if (/^\d{4}$/.test(y ?? '')) {
      return [y, m && /^\d+$/.test(m) ? m.padStart(2, '0') : null, d && /^\d+$/.test(d) ? d.padStart(2, '0') : null]
        .filter(Boolean).join('-');
    }
  }

  const text = cleanWikitext(raw).replace(/\(.*?\)/g, '').trim();
  if (!text) return null;
  const month = (name: string) => {
    const i = MONTHS.indexOf(name.toLowerCase());
    return i < 0 ? null : String(i + 1).padStart(2, '0');
  };
  let m = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m && month(m[1])) return `${m[3]}-${month(m[1])}-${m[2].padStart(2, '0')}`;
  m = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m && month(m[2])) return `${m[3]}-${month(m[2])}-${m[1].padStart(2, '0')}`;
  m = text.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m && month(m[1])) return `${m[2]}-${month(m[1])}`;
  if (/^\d{4}$/.test(text)) return text;
  return text;
}

// ── Оценки критиков ───────────────────────────────────────────────────────────

// Шаблон {{Music ratings}} (раньше — {{Album ratings}})
export function parseCriticRatings(wikitext: string): CriticRating[] {
  const start = wikitext.search(/\{\{\s*(music|album) ratings/i);
  if (start < 0) return [];
  const fields = multilineFields(templateAt(wikitext, start));

  const ratings: CriticRating[] = [];
  for (let n = 1; fields.has(`rev${n}`); n++) {
    const source = cleanWikitext(fields.get(`rev${n}`)!);
    const raw = (fields.get(`rev${n}score`) ?? '').replace(/\}\}\s*$/, '');
    const stars = raw.match(/\{\{\s*rating\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/i);
    const score = stars ? `${stars[1]}/${stars[2]}` : cleanWikitext(raw);
    if (source && score) ratings.push({ source, score });
  }
  return ratings;
}

// ── Синглы ────────────────────────────────────────────────────────────────────

// Шаблон {{Singles}} в карточке альбома: single1, single1date, single2…
export function parseSingles(wikitext: string): Single[] {
  const start = wikitext.search(/\{\{\s*singles\s*\n?\s*\|/i);
  if (start < 0) return [];
  const fields = multilineFields(templateAt(wikitext, start));

  const singles: Single[] = [];
  for (let n = 1; fields.has(`single${n}`); n++) {
    // [[All Apologies]]" / "[[Rape Me]] → All Apologies / Rape Me
    const title = cleanWikitext(fields.get(`single${n}`)!)
      .replace(/"\s*\/\s*"/g, ' / ')
      .replace(/^"|"$/g, '')
      .trim();
    const date = fields.get(`single${n}date`);
    if (title) singles.push({ title, date: date ? parseEnglishDate(date) : null });
  }
  return singles;
}

// ── Чарты ─────────────────────────────────────────────────────────────────────

const c = (en: string, ru: string): Localized => ({ en, ru });

// Коды шаблона {{Album chart}} → название. Цифры в конце (UK2, Germany4, Ireland3) —
// версии источника для одного и того же чарта, их отбрасываем при поиске
const CHART_NAMES: Record<string, Localized> = {
  billboard200: c('US Billboard 200', 'США — Billboard 200'),
  billboardcatalog: c('US Top Catalog Albums', 'США — Top Catalog Albums'),
  billboardrockalbums: c('US Top Rock Albums', 'США — Top Rock Albums'),
  billboardtoprockalbums: c('US Top Rock Albums', 'США — Top Rock Albums'),
  billboardalternativealbums: c('US Top Alternative Albums', 'США — Top Alternative Albums'),
  billboardtopalternativealbums: c('US Top Alternative Albums', 'США — Top Alternative Albums'),
  billboardvinylalbums: c('US Vinyl Albums', 'США — Vinyl Albums'),
  billboardindependent: c('US Independent Albums', 'США — Independent Albums'),
  billboardheatseekers: c('US Heatseekers Albums', 'США — Heatseekers Albums'),
  billboardrandbhiphop: c('US Top R&B/Hip-Hop Albums', 'США — Top R&B/Hip-Hop Albums'),
  billboardrap: c('US Top Rap Albums', 'США — Top Rap Albums'),
  billboardcountry: c('US Top Country Albums', 'США — Top Country Albums'),
  billboardelectronic: c('US Top Dance/Electronic Albums', 'США — Top Dance/Electronic Albums'),
  billboardsoundtrack: c('US Soundtrack Albums', 'США — Soundtrack Albums'),
  billboardrock: c('US Top Rock Albums', 'США — Top Rock Albums'),
  billboardhardrock: c('US Top Hard Rock Albums', 'США — Top Hard Rock Albums'),
  billboardalternative: c('US Top Alternative Albums', 'США — Top Alternative Albums'),
  billboardvinyl: c('US Vinyl Albums', 'США — Vinyl Albums'),
  billboarddanceelectronic: c('US Top Dance/Electronic Albums', 'США — Top Dance/Electronic Albums'),
  billboardcanada: c('Canada (Billboard)', 'Канада (Billboard)'),
  uk: c('UK Albums Chart', 'Великобритания — UK Albums Chart'),
  ukrock: c('UK Rock & Metal Albums', 'Великобритания — Rock & Metal Albums'),
  ukindependent: c('UK Independent Albums', 'Великобритания — Independent Albums'),
  ukvinyl: c('UK Vinyl Albums', 'Великобритания — Vinyl Albums'),
  ukrandb: c('UK R&B Albums', 'Великобритания — R&B Albums'),
  'ukr&b': c('UK R&B Albums', 'Великобритания — R&B Albums'),
  ukamericana: c('UK Americana Albums', 'Великобритания — Americana Albums'),
  ukdownload: c('UK Album Downloads', 'Великобритания — Album Downloads'),
  scotland: c('Scotland', 'Шотландия'),
  ireland: c('Ireland', 'Ирландия'),
  australia: c('Australia', 'Австралия'),
  newzealand: c('New Zealand', 'Новая Зеландия'),
  canada: c('Canada', 'Канада'),
  canadarpm: c('Canada (RPM)', 'Канада (RPM)'),
  austria: c('Austria', 'Австрия'),
  flanders: c('Belgium (Flanders)', 'Бельгия (Фландрия)'),
  wallonia: c('Belgium (Wallonia)', 'Бельгия (Валлония)'),
  czech: c('Czech Republic', 'Чехия'),
  denmark: c('Denmark', 'Дания'),
  netherlands: c('Netherlands', 'Нидерланды'),
  finland: c('Finland', 'Финляндия'),
  france: c('France', 'Франция'),
  germany: c('Germany', 'Германия'),
  greece: c('Greece', 'Греция'),
  hungary: c('Hungary', 'Венгрия'),
  iceland: c('Iceland', 'Исландия'),
  italy: c('Italy', 'Италия'),
  japan: c('Japan', 'Япония'),
  oricon: c('Japan (Oricon)', 'Япония (Oricon)'),
  lithuania: c('Lithuania', 'Литва'),
  mexico: c('Mexico', 'Мексика'),
  norway: c('Norway', 'Норвегия'),
  poland: c('Poland', 'Польша'),
  portugal: c('Portugal', 'Португалия'),
  croatia: c('Croatia', 'Хорватия'),
  slovakia: c('Slovakia', 'Словакия'),
  spain: c('Spain', 'Испания'),
  sweden: c('Sweden', 'Швеция'),
  switzerland: c('Switzerland', 'Швейцария'),
  argentina: c('Argentina', 'Аргентина'),
  brazil: c('Brazil', 'Бразилия'),
  southkorea: c('South Korea', 'Южная Корея'),
  korea: c('South Korea', 'Южная Корея'),
  taiwan: c('Taiwan', 'Тайвань'),
  billboardjapan: c('Japan (Billboard Japan)', 'Япония (Billboard Japan)'),
  europe: c('European Top 100 Albums', 'Европа — Top 100 Albums'),
};

// Коды шаблона {{Single chart}}; страны берутся из CHART_NAMES
const SINGLE_CHART_NAMES: Record<string, Localized> = {
  billboardhot100: c('US Billboard Hot 100', 'США — Billboard Hot 100'),
  billboardglobal200: c('Billboard Global 200', 'Billboard Global 200'),
  billboardalternativesongs: c('US Alternative Airplay', 'США — Alternative Airplay'),
  billboardmodernrock: c('US Alternative Airplay', 'США — Alternative Airplay'),
  billboardmainstreamrock: c('US Mainstream Rock', 'США — Mainstream Rock'),
  billboardrocksongs: c('US Hot Rock & Alternative Songs', 'США — Hot Rock & Alternative Songs'),
  billboardrockairplay: c('US Rock Airplay', 'США — Rock Airplay'),
  billboardpopsongs: c('US Pop Airplay', 'США — Pop Airplay'),
  billboardadultpopsongs: c('US Adult Pop Airplay', 'США — Adult Pop Airplay'),
  billboardadultcontemporary: c('US Adult Contemporary', 'США — Adult Contemporary'),
  billboardrhythmic: c('US Rhythmic Airplay', 'США — Rhythmic Airplay'),
  billboardhotrandbhiphop: c('US Hot R&B/Hip-Hop Songs', 'США — Hot R&B/Hip-Hop Songs'),
  billboardrandbhiphopsongs: c('US Hot R&B/Hip-Hop Songs', 'США — Hot R&B/Hip-Hop Songs'),
  billboardrapsongs: c('US Hot Rap Songs', 'США — Hot Rap Songs'),
  billboardcountrysongs: c('US Hot Country Songs', 'США — Hot Country Songs'),
  billboarddanceclubplay: c('US Dance Club Songs', 'США — Dance Club Songs'),
  billboardhotdanceelectronicsongs: c('US Hot Dance/Electronic Songs', 'США — Hot Dance/Electronic Songs'),
  billboardjapanhot100: c('Japan Hot 100', 'Япония — Japan Hot 100'),
  uksinglesbyname: c('UK Singles Chart', 'Великобритания — UK Singles Chart'),
  uk: c('UK Singles Chart', 'Великобритания — UK Singles Chart'),
  ukindie: c('UK Indie', 'Великобритания — Indie'),
  ukrock: c('UK Rock & Metal Singles', 'Великобритания — Rock & Metal Singles'),
  dutch40: c('Netherlands (Dutch Top 40)', 'Нидерланды (Dutch Top 40)'),
  dutch100: c('Netherlands (Single Top 100)', 'Нидерланды (Single Top 100)'),
  canadatopsingles: c('Canada (Canadian Hot 100)', 'Канада (Canadian Hot 100)'),
  canadianhot100: c('Canada (Canadian Hot 100)', 'Канада (Canadian Hot 100)'),
  canadarockalternative: c('Canada Rock', 'Канада — Rock'),
  germany: c('Germany', 'Германия'),
  billboardeurodigital: c('Euro Digital Songs', 'Европа — Euro Digital Songs'),
  cis: c('CIS Airplay (TopHit)', 'СНГ — эфир (TopHit)'),
  cisairplay: c('CIS Airplay (TopHit)', 'СНГ — эфир (TopHit)'),
  russiaairplay: c('Russia Airplay (TopHit)', 'Россия — эфир (TopHit)'),
  ukraineairplay: c('Ukraine Airplay (TopHit)', 'Украина — эфир (TopHit)'),
  czechdigital: c('Czech Republic (Digital)', 'Чехия (цифровые продажи)'),
  czechradio: c('Czech Republic (Radio)', 'Чехия (радио)'),
  slovakdigital: c('Slovakia (Digital)', 'Словакия (цифровые продажи)'),
  slovakradio: c('Slovakia (Radio)', 'Словакия (радио)'),
  hungarysingle: c('Hungary (Singles)', 'Венгрия (синглы)'),
  hungarystream: c('Hungary (Streaming)', 'Венгрия (стриминг)'),
  hungarydance: c('Hungary (Dance)', 'Венгрия (танцевальный)'),
  hungaryradio: c('Hungary (Radio)', 'Венгрия (радио)'),
  polandairplay: c('Poland (Airplay)', 'Польша (эфир)'),
  japanhot100: c('Japan Hot 100', 'Япония — Japan Hot 100'),
  southkorea: c('South Korea', 'Южная Корея'),
};

export type ChartKind = 'album' | 'single';

function chartName(id: string, kind: ChartKind): Localized {
  const key = id.toLowerCase().replace(/[\s_-]/g, '');
  const base = key.replace(/\d+$/, '');
  const named = (kind === 'single' ? SINGLE_CHART_NAMES[key] ?? SINGLE_CHART_NAMES[base] : undefined)
    ?? CHART_NAMES[key] ?? CHART_NAMES[base];
  if (named) return named;
  // Незнакомый код: BillboardTastemaker → Billboard Tastemaker
  const pretty = id.replace(/([a-z])([A-Z])/g, '$1 $2');
  return { en: pretty, ru: pretty };
}

// Годовые итоги, переиздания и т. п. — не «пиковая позиция альбома»
const SKIP_SECTION_RE = /year[- ]end|decade|all[- ]time|monthly|anniversary|reissue|re-?release|deluxe|remaster|expanded|edition/i;

// Строка таблицы, набранная вручную: заголовок строки и позиция на следующей строке.
// Издателя в скобках оставляем: «UK Albums (MRIB)» — другой чарт, не «UK Albums Chart» (OCC).
// После <br /> обычно идёт сноска мелким шрифтом — её отрезаем
function manualChartName(header: string): string | null {
  const text = cleanWikitext(stripRefs(header.replace(/^!\s*(?:[a-z-]+\s*=\s*"[^"]*"\s*)*\|/i, '').split(/<br\s*\/?>/i)[0]))
    .replace(/\s{2,}/g, ' ').trim();
  return text || null;
}

const manualPeak = (cell: string) => {
  const m = cell.match(/^\|(?:[^|]*\|)?\s*(\d+)\s*(?:<ref.*)?$/);
  return m ? Number(m[1]) : null;
};

// Пики в недельных таблицах оригинального релиза: шаблоны {{Album chart}} / {{Single chart}}
// (в т. ч. слитно — {{singlechart}}) и строки, набранные вручную
export function parseCharts(wikitext: string, kind: ChartKind = 'album'): ChartPeak[] {
  const templateRe = kind === 'single' ? /\{\{\s*single ?chart\s*\|/gi : /\{\{\s*album ?chart\s*\|/gi;
  const headings: string[] = [];  // headings[level] — текущий заголовок этого уровня
  let skipTable = false;
  let pendingName: string | null = null;  // заголовок ручной строки ждёт ячейку с позицией
  const peaks = new Map<string, ChartPeak>();

  const add = (chart: string, name: Localized, peak: number) => {
    // Один и тот же чарт с разными версиями кода (Germany / Germany4) — оставляем лучшую позицию
    const key = (name.en ?? chart).toLowerCase();
    const prev = peaks.get(key);
    if (!prev || peak < prev.peak) peaks.set(key, { chart, name, peak });
  };

  for (const line of wikitext.split('\n')) {
    const h = line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
    if (h) {
      headings.length = h[1].length;
      headings[h[1].length] = h[2];
      skipTable = false;
      pendingName = null;
      continue;
    }
    if (line.startsWith('{|')) { skipTable = false; pendingName = null; continue; }
    if (line.startsWith('|+')) { skipTable = SKIP_SECTION_RE.test(line); continue; }
    if (skipTable || headings.some(t => t && SKIP_SECTION_RE.test(t))) continue;

    // Ручные строки — только в разделе о чартах, иначе подхватятся, например, таблицы релизов
    if (headings[2] && /chart/i.test(headings[2])) {
      if (line.startsWith('!') && !/scope\s*=\s*"col"/i.test(line)) {
        const [header, inlineCell] = line.split('||');
        pendingName = manualChartName(header);
        if (pendingName && inlineCell) {
          const peak = manualPeak(`|${inlineCell}`);
          if (peak) add(pendingName, { en: pendingName, ru: pendingName }, peak);
          pendingName = null;
        }
        continue;
      }
      if (pendingName && line.startsWith('|') && !line.startsWith('|-')) {
        const peak = manualPeak(line);
        if (peak) add(pendingName, { en: pendingName, ru: pendingName }, peak);
        pendingName = null;
        continue;
      }
    }

    for (const m of line.matchAll(templateRe)) {
      const { positional } = inlineArgs(templateAt(line, m.index!));
      const id = positional[0];
      const peak = Number(positional[1]);
      if (!id || !Number.isInteger(peak) || peak < 1) continue;
      add(id, chartName(id, kind), peak);
    }
  }
  return [...peaks.values()];
}

// ── Сертификации ──────────────────────────────────────────────────────────────

const REGIONS_RU: Record<string, string> = {
  'united states': 'США',
  'united kingdom': 'Великобритания',
  'canada': 'Канада',
  'australia': 'Австралия',
  'new zealand': 'Новая Зеландия',
  'ireland': 'Ирландия',
  'germany': 'Германия',
  'france': 'Франция',
  'italy': 'Италия',
  'spain': 'Испания',
  'portugal': 'Португалия',
  'netherlands': 'Нидерланды',
  'belgium': 'Бельгия',
  'austria': 'Австрия',
  'switzerland': 'Швейцария',
  'sweden': 'Швеция',
  'norway': 'Норвегия',
  'denmark': 'Дания',
  'finland': 'Финляндия',
  'poland': 'Польша',
  'japan': 'Япония',
  'argentina': 'Аргентина',
  'brazil': 'Бразилия',
  'mexico': 'Мексика',
  'russia': 'Россия',
  'south korea': 'Южная Корея',
  'europe': 'Европа (IFPI)',
  'worldwide': 'Мир',
};

const AWARDS = ['diamond', 'platinum', 'gold', 'silver'];

// {{Certification Table Entry|region=…|award=Platinum|number=5|salesamount=…}}
export function parseCertifications(wikitext: string): Certification[] {
  const certs: Certification[] = [];
  for (const m of wikitext.matchAll(/\{\{\s*certification table entry\s*\|/gi)) {
    const { named } = inlineArgs(templateAt(wikitext, m.index!));
    const region = cleanWikitext(named.get('region') ?? '');
    const award = cleanWikitext(named.get('award') ?? '').toLowerCase();
    if (!region || !AWARDS.includes(award)) continue;
    const units = Number((named.get('salesamount') ?? '').replace(/[^\d]/g, ''));
    certs.push({
      region: { en: region, ru: REGIONS_RU[region.toLowerCase()] ?? region },
      award,
      multiplier: Math.max(1, Number(named.get('number')) || 1),
      units: units > 0 ? units : null,
    });
  }
  return certs;
}

// ── Участники записи ──────────────────────────────────────────────────────────

export interface PersonnelGroup {
  title: string | null;  // «Nirvana», «Technical», «Other musicians»… — как в статье; null — без подзаголовка
  people: { name: string; roles: string | null }[];
}

const PERSONNEL_HEADING_RE = /^(personnel|credits|credits and personnel|personnel and credits)$/i;
const PERSONNEL_MAX = 60;

// Нужны только музыканты: технические подгруппы и роли отбрасываем
const TECH_GROUP_RE = /technical|production|producers|engineer|artwork|design|packaging|management|photograph|recording|mastering/i;
const TECH_ROLE_RE = /engineer|mix(ing|ed)?\b|master(ing|ed)?\b|produc|art direct|creative direct|design|photograph|illustration|artwork|layout|liner notes|a&r|manage|coordinat|technician|assistant|recording|recorded by|editing|editor|studio|sleeve|cover art|packag|concept|committing to tape|audio level|lacquer|tape op|pro tools|crew/i;

// Роли через запятую/точку с запятой, не разрывая скобки: "vocals (tracks 1, 2), guitar"
function splitRoles(roles: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of roles) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) { parts.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  parts.push(current.trim());
  return parts.filter(Boolean);
}

// null — человек не музыкант (только технические роли), иначе — его музыкальные роли
function musicalRoles(roles: string | null): string | null | false {
  if (!roles) return null;  // без ролей — обычно участники группы списком под её названием
  const parts = splitRoles(roles);
  const musical = parts.filter(r => !TECH_ROLE_RE.test(r));
  if (!musical.length) return false;
  // Ничего не вырезали — оставляем как в статье, с её разделителями (у Abbey Road это «;»)
  return musical.length === parts.length ? roles : musical.join(', ');
}

// Раздел «Personnel»: подгруппы — '''жирной строкой''' или подзаголовком, участники — «* Имя – роли»
export function parsePersonnel(wikitext: string): PersonnelGroup[] {
  const lines = wikitext.split('\n');
  const start = lines.findIndex(l => {
    const h = l.match(/^(={2,4})\s*(.*?)\s*\1\s*$/);
    return h && PERSONNEL_HEADING_RE.test(h[2]);
  });
  if (start < 0) return [];
  const level = lines[start].match(/^=+/)![0].length;

  const groups: PersonnelGroup[] = [];
  let current: PersonnelGroup | null = null;
  let total = 0;
  const open = (title: string | null) => { current = { title, people: [] }; groups.push(current); };

  for (const raw of lines.slice(start + 1)) {
    const h = raw.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
    if (h && h[1].length <= level) break;
    const line = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/&nbsp;/g, ' ').replace(/&ndash;/g, '–').trim();

    if (h) { open(cleanWikitext(h[2])); continue; }
    const bold = line.match(/^'''([^']+)'''\s*:?$/);
    if (bold) { open(cleanWikitext(bold[1])); continue; }
    if (!line.startsWith('*') || total >= PERSONNEL_MAX) continue;
    if (current && (current as PersonnelGroup).title && TECH_GROUP_RE.test((current as PersonnelGroup).title!)) continue;

    // Номера треков {{small|(1, 3)}} и сноски убираем, остальное — как в статье
    const text = cleanWikitext(stripRefs(line.replace(/^\*+\s*/, '')).replace(/\{\{\s*small\s*\|[^{}]*\}\}/gi, ''))
      .replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
    const dash = text.match(/^(.+?)\s*[–—-]\s+(.+)$/) ?? text.match(/^(.+?)\s+[–—]\s*(.+)$/);
    const name = (dash ? dash[1] : text).trim();
    const roles = musicalRoles(dash ? dash[2].trim() : null);
    if (!name || roles === false) continue;
    if (!current) open(null);
    current!.people.push({ name, roles });
    total++;
  }
  return groups.filter(g => g.people.length);
}
