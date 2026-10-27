import { describe, expect, it } from 'vitest'
import { flagEmojiToIso, getCountriesFromTags } from './geniusCountries'

describe('getCountriesFromTags', () => {
  it('находит страны среди тегов и называет их на языке интерфейса', () => {
    const tags = ['Rock', 'Russia', 'Pop']
    expect(getCountriesFromTags(tags, 'ru')).toEqual([{ flag: '🇷🇺', name: 'Россия' }])
    expect(getCountriesFromTags(tags, 'en')).toEqual([{ flag: '🇷🇺', name: 'Russia' }])
  })

  it('понимает местные названия, скобки и « - »', () => {
    expect(getCountriesFromTags(['South Korea (대한민국)'], 'ru')).toEqual([{ flag: '🇰🇷', name: 'Южная Корея' }])
    expect(getCountriesFromTags(['Tunisian - تونسي'], 'ru')).toEqual([{ flag: '🇹🇳', name: 'Тунис' }])
  })

  it('без диакритики и без повторов одной страны', () => {
    expect(getCountriesFromTags(['Mexico', 'México', 'Germany', 'Deutschland'], 'ru').map(c => c.name)).toEqual(['Мексика', 'Германия'])
  })

  it('нет стран — пустой список', () => {
    expect(getCountriesFromTags(['Rock', 'Grunge'], 'en')).toEqual([])
  })
})

describe('flagEmojiToIso', () => {
  it('эмодзи флага → код ISO для flagcdn', () => {
    expect(flagEmojiToIso('🇷🇺')).toBe('ru')
    expect(flagEmojiToIso('🇰🇷')).toBe('kr')
  })
})
