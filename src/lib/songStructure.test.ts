import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeSongStructure } from './songStructure'

const LRC = [
  { time: 12, text: 'Walking down the empty street tonight' },
  { time: 16, text: 'Lights are fading out of sight' },
  { time: 20, text: 'Nobody knows where I belong' },
  { time: 40, text: 'Oh oh sing it loud' },
  { time: 44, text: 'Sing it all night long' },
  { time: 48, text: 'Hearts on fire' },
  { time: 70, text: 'Morning comes the city wakes' },
  { time: 74, text: 'Every step a new mistake' },
  { time: 78, text: 'Still I carry on and on' },
  { time: 100, text: 'Oh oh sing it loud' },
  { time: 104, text: 'Sing it all night long' },
  { time: 108, text: 'Hearts on fire' },
]

const CHORUS = ['Oh, oh, sing it loud', 'Sing it all night long', 'Hearts on fire']
const SECTIONS = [
  { type: 'verse', label: 'Куплет 1', lines: ['Walking down the empty street tonight', 'Lights are fading out of sight', 'Nobody knows where I belong'] },
  { type: 'chorus', label: 'Припев', lines: CHORUS },
  { type: 'unknown', label: 'Куплет 2', lines: ['Morning comes, the city wakes', 'Every step a new mistake', 'Still I carry on and on'] },
  { type: 'chorus', label: 'Припев', lines: CHORUS },
]

function stubApi(lyrics: unknown, lrc: unknown) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const body = url.includes('/api/tracks/lyrics') ? lyrics : lrc
    return new Response(JSON.stringify(body), { status: 200 })
  }))
}

afterEach(() => vi.unstubAllGlobals())

describe('analyzeSongStructure', () => {
  it('расставляет секции Genius по таймкодам LRC и добавляет интро', async () => {
    stubApi({ sections: SECTIONS, title: 'Song (Remastered)', artist: 'Band', url: 'https://genius.com/x' }, { lines: LRC })
    const onResolved = vi.fn()

    const res = await analyzeSongStructure('Song', 'Band', 130, onResolved)

    expect(res.markers.map(m => [m.start, m.end, m.type])).toEqual([
      [0, 12, 'intro'],
      [12, 40, 'verse'],
      [40, 70, 'chorus'],
      [70, 100, 'verse'], // тип 'unknown' выведен из метки «Куплет 2»
      [100, 130, 'chorus'],
    ])
    expect(onResolved).toHaveBeenCalledWith('Song', 'Band', 'https://genius.com/x', undefined)
    expect(res.geniusUrl).toBe('https://genius.com/x')
  })

  it('без текста Genius маркеров нет', async () => {
    stubApi({ sections: [] }, { lines: LRC })
    expect((await analyzeSongStructure('Song', 'Band', 130)).markers).toEqual([])
  })

  it('без LRC маркеров нет', async () => {
    stubApi({ sections: SECTIONS, title: 'Song', artist: 'Band' }, { lines: [] })
    expect((await analyzeSongStructure('Song', 'Band', 130)).markers).toEqual([])
  })

  it('ошибка сети не роняет анализ', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const res = await analyzeSongStructure('Song', 'Band', 130)
    expect(res).toMatchObject({ markers: [], title: 'Song', artist: 'Band' })
  })
})
