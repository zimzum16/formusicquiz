import { describe, expect, it } from 'vitest';
import { parseCertifications, parseCharts, parseCriticRatings, parsePersonnel, parseSingles } from './wikitext.js';

describe('parseCriticRatings', () => {
  it('читает звёзды и текстовые оценки из {{Music ratings}}', () => {
    const wt = `{{Music ratings
| rev1 = [[AllMusic]]
| rev1score = {{Rating|5|5}}<ref>x</ref>
| rev2 = ''[[Pitchfork (website)|Pitchfork]]''
| rev2score = 9.7/10
| rev3 = Empty
}}`;
    expect(parseCriticRatings(wt)).toEqual([
      { source: 'AllMusic', score: '5/5' },
      { source: 'Pitchfork', score: '9.7/10' },
    ]);
  });

  it('нет шаблона — пустой список', () => {
    expect(parseCriticRatings('no ratings here')).toEqual([]);
  });
});

describe('parseSingles', () => {
  it('разбирает названия, двойные синглы и разные форматы дат', () => {
    const wt = `{{Singles
| name = In Utero
| single1 = [[Heart-Shaped Box]]
| single1date = August 30, 1993
| single2 = [[All Apologies]]" / "[[Rape Me]]
| single2date = {{Start date|1993|12|6}}
| single3 = Pennyroyal Tea
| single3date = April 1994
| single4 = Dumb
| single4date = 1994
}}`;
    expect(parseSingles(wt)).toEqual([
      { title: 'Heart-Shaped Box', date: '1993-08-30' },
      { title: 'All Apologies / Rape Me', date: '1993-12-06' },
      { title: 'Pennyroyal Tea', date: '1994-04' },
      { title: 'Dumb', date: '1994' },
    ]);
  });
});

describe('parseCharts', () => {
  const wt = `== Charts ==
=== Weekly charts ===
{| class="wikitable"
{{Album chart|Billboard200|1|artist=Nirvana}}
{{Album chart|UK2|1}}
{{Album chart|Germany|6}}
{{Album chart|Germany4|4}}
! scope="row"| Japanese Albums (Oricon)
| 17
|}
=== Year-end charts ===
{{Album chart|Billboard200|20}}
== Release history ==
! scope="row"| Not a chart
| 3`;

  it('берёт пики недельных чартов, лучшую позицию для дублей и ручные строки', () => {
    const peaks = parseCharts(wt);
    const byChart = Object.fromEntries(peaks.map(p => [p.name.en, p.peak]));
    expect(byChart['Japanese Albums (Oricon)']).toBe(17);
    expect(peaks.find(p => p.chart === 'Billboard200')?.peak).toBe(1);
    expect(peaks.filter(p => p.chart.startsWith('Germany'))).toHaveLength(1);
    expect(peaks.find(p => p.chart.startsWith('Germany'))?.peak).toBe(4);
  });

  it('игнорирует годовые итоги и таблицы вне раздела о чартах', () => {
    const peaks = parseCharts(wt);
    expect(peaks.filter(p => p.chart === 'Billboard200')).toHaveLength(1);
    expect(peaks.some(p => p.name.en === 'Not a chart')).toBe(false);
  });
});

describe('parseCertifications', () => {
  it('разбирает сертификации и переводит регион', () => {
    const wt = `{{Certification Table Entry|region=United States|type=album|title=In Utero|award=Platinum|number=5|salesamount=5,000,000}}
{{Certification Table Entry|region=[[Canada]]|award=Gold}}
{{Certification Table Entry|region=Mars|award=Unobtainium}}`;
    expect(parseCertifications(wt)).toEqual([
      { region: { en: 'United States', ru: 'США' }, award: 'platinum', multiplier: 5, units: 5000000 },
      { region: { en: 'Canada', ru: 'Канада' }, award: 'gold', multiplier: 1, units: null },
    ]);
  });
});

describe('parsePersonnel', () => {
  it('оставляет музыкантов и отбрасывает технический персонал', () => {
    const wt = `== Personnel ==
'''Nirvana'''
* [[Kurt Cobain]] – vocals, guitar
* [[Krist Novoselic]] – bass
* [[Dave Grohl]] – drums, backing vocals {{small|(tracks 1, 3)}}

'''Technical'''
* [[Steve Albini]] – recording engineer

'''Additional'''
* Kera Schaley – cello, mastering
* Bob Weston – engineer
== Charts ==
* Ignored – vocals`;
    expect(parsePersonnel(wt)).toEqual([
      {
        title: 'Nirvana',
        people: [
          { name: 'Kurt Cobain', roles: 'vocals, guitar' },
          { name: 'Krist Novoselic', roles: 'bass' },
          { name: 'Dave Grohl', roles: 'drums, backing vocals' },
        ],
      },
      { title: 'Additional', people: [{ name: 'Kera Schaley', roles: 'cello' }] },
    ]);
  });
});
