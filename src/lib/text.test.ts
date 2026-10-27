import { describe, expect, it } from 'vitest'
import { namesOverlap, normKey, translitKey } from './text'

describe('normKey', () => {
  it('убирает регистр, диакритику и пунктуацию, сохраняет кириллицу и цифры', () => {
    expect(normKey('Группа Крови!')).toBe('группакрови')
    expect(normKey('Beyoncé')).toBe('beyonce')
    expect(normKey('M83')).toBe('m83')
  })
})

describe('translitKey', () => {
  it('латиница и кириллица дают один ключ', () => {
    expect(translitKey('Alisa')).toBe(translitKey('Алиса'))
    expect(translitKey('Kino')).toBe(translitKey('Кино'))
  })

  it('цифры сохраняются — короткие имена не схлопываются', () => {
    expect(translitKey('M83')).toBe('м83')
    expect(translitKey('+44')).toBe('44')
  })
})

describe('namesOverlap', () => {
  it('вхождение в обе стороны', () => {
    expect(namesOverlap('Nirvana', 'Nirvana (Remastered)')).toBe(true)
    expect(namesOverlap('Алиса', 'Alisa', translitKey)).toBe(true)
  })

  it('пустой ключ ни с чем не совпадает', () => {
    expect(namesOverlap('', 'Nevermind')).toBe(false)
    expect(namesOverlap('!!!', 'Nirvana')).toBe(false)
  })

  it('M83 не совпадает с любым именем, где есть «м»', () => {
    expect(namesOverlap('M83', 'Мумий Тролль', translitKey)).toBe(false)
  })
})
