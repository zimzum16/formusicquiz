import { describe, expect, it } from 'vitest'
import { formatTime, formatTimeDetailed, formatTimeDetailedComma, parseFlexibleTime, validateTimeRange } from './audioUtils'
import { fadeEnvelopeMultiplier } from './waveform'
import { matchSingles } from './singles'
import { toCyrillicArtist } from './cyrillicNames'
import { buildArtistYearImagesQuery, buildGoogleImagesUrl } from './imageSearch'
import type { AudioFile } from '../types/audio'

describe('форматирование времени', () => {
  it('formatTimeDetailed', () => {
    expect(formatTimeDetailed(0)).toBe('00:00.0')
    expect(formatTimeDetailed(65.34)).toBe('01:05.3')
    expect(formatTimeDetailed(-3)).toBe('00:00.0')
    expect(formatTimeDetailed(NaN)).toBe('00:00.0')
  })

  it('formatTimeDetailed не выдаёт 60 секунд при округлении', () => {
    expect(formatTimeDetailed(59.96)).toBe('01:00.0')
    expect(formatTimeDetailed(119.99)).toBe('02:00.0')
  })

  it('formatTimeDetailedComma и formatTime', () => {
    expect(formatTimeDetailedComma(65.34)).toBe('01:05,3')
    expect(formatTime(125.9)).toBe('2:05')
  })

  it('parseFlexibleTime понимает разные записи', () => {
    expect(parseFlexibleTime('1:05.3')).toBeCloseTo(65.3)
    expect(parseFlexibleTime('1:5')).toBe(65)
    expect(parseFlexibleTime('2:03.45')).toBeCloseTo(123.4)
    expect(parseFlexibleTime('12.5')).toBe(12.5)
    expect(parseFlexibleTime('')).toBe(0)
    expect(parseFlexibleTime('abc')).toBe(0)
  })

  it('formatTimeDetailed и parseFlexibleTime обратимы', () => {
    for (const t of [0, 7.3, 65.3, 599.9]) expect(parseFlexibleTime(formatTimeDetailed(t))).toBeCloseTo(t)
  })

  it('validateTimeRange', () => {
    expect(validateTimeRange(0, 10, 100)).toBeNull()
    expect(validateTimeRange(-1, 10, 100)).not.toBeNull()
    expect(validateTimeRange(10, 10, 100)).not.toBeNull()
    expect(validateTimeRange(0, 101, 100)).not.toBeNull()
  })
})

describe('fadeEnvelopeMultiplier', () => {
  const range = { startTime: 10, endTime: 20 }
  const fade = { fadeIn: true, fadeOut: true, fadeInDuration: 2, fadeOutDuration: 4 }

  it('линейный fade-in и fade-out внутри диапазона', () => {
    expect(fadeEnvelopeMultiplier(10, range, fade)).toBe(0)
    expect(fadeEnvelopeMultiplier(11, range, fade)).toBe(0.5)
    expect(fadeEnvelopeMultiplier(15, range, fade)).toBe(1)
    expect(fadeEnvelopeMultiplier(18, range, fade)).toBe(0.5)
    expect(fadeEnvelopeMultiplier(20, range, fade)).toBe(0)
  })

  it('вне диапазона и без fade — 1', () => {
    expect(fadeEnvelopeMultiplier(5, range, fade)).toBe(1)
    expect(fadeEnvelopeMultiplier(11, range, null)).toBe(1)
    expect(fadeEnvelopeMultiplier(11, range, { ...fade, fadeIn: false })).toBe(1)
  })
})

describe('matchSingles', () => {
  it('сопоставляет синглы с треками без учёта ремиксов, скобок и вида дефиса', () => {
    const tracks = [
      { id: '1', title: 'Heart-Shaped Box - 2013 Mix' },
      { id: '2', title: 'All Apologies' },
      { id: '3', title: 'Rape Me (Remastered)' },
      { id: '4', title: 'Serve the Servants' },
    ]
    const singles = [
      { title: 'Heart‐Shaped Box', date: '1993-08-30' },
      { title: 'All Apologies / Rape Me', date: '1993-12' },
      { title: 'Pennyroyal Tea', date: null },
    ]
    const { byTrack, unmatched } = matchSingles(tracks, singles)
    expect(byTrack.get('1')).toBe(singles[0])
    expect(byTrack.get('2')).toBe(singles[1])
    expect(byTrack.get('3')).toBe(singles[1])
    expect(byTrack.has('4')).toBe(false)
    expect(unmatched).toEqual([singles[2]])
  })
})

describe('toCyrillicArtist', () => {
  it('переводит известные имена и не трогает остальные', () => {
    expect(toCyrillicArtist('  Polina Gagarina ')).toBe('Полина Гагарина')
    expect(toCyrillicArtist('Nirvana')).toBe('Nirvana')
  })
})

describe('imageSearch', () => {
  const file = (name: string) => new File([], name)

  it('строит запрос из исполнителя и года', () => {
    expect(buildArtistYearImagesQuery({ artist: 'Кино', year: '1988-01-05', file: file('x.mp3') } as AudioFile)).toBe('Кино 1988')
  })

  it('без метаданных берёт имя файла и чистит тире и кавычки', () => {
    expect(buildArtistYearImagesQuery({ file: file('Кино — «Звезда».mp3') } as AudioFile)).toBe('Кино Звезда')
  })

  it('кодирует текст в URL', () => {
    expect(buildGoogleImagesUrl('Кино 1988')).toContain('q=%D0%9A%D0%B8%D0%BD%D0%BE+1988')
  })
})
