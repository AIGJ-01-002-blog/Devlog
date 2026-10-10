import { describe, expect, it } from 'vitest'
import { fromLanguageTag, getLocale, t } from './i18n'
import { en } from './locales/en'
import { ja } from './locales/ja'
import { zh } from './locales/zh'

// 화면 코드의 t('…') 문장을 모두 모은다 (테스트 파일과 컴파일된 .js 사본은 뺀다)
const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/**/*.d.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function usedKeys(): Map<string, string> {
  const keys = new Map<string, string>()
  const call = /\bt(?:Nodes)?\(\s*'((?:[^'\\]|\\.)*)'/g
  for (const [file, code] of Object.entries(sources)) {
    for (const m of code.matchAll(call)) {
      // 소스의 이스케이프(\' \\ \n)를 실제 문자로
      const key = m[1].replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c))
      if (!keys.has(key)) keys.set(key, file)
    }
  }
  return keys
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')

describe('i18n', () => {
  it('테스트는 한국어 화면이다', () => {
    expect(getLocale()).toBe('ko')
    expect(t('글 {0}편', { 0: 3 })).toBe('글 3편')
    expect(t('없는 문장 {a}', { a: null })).toBe('없는 문장 ')
  })

  it('언어 태그를 읽는다', () => {
    expect(fromLanguageTag('en-US')).toBe('en')
    expect(fromLanguageTag('zh-Hans-CN')).toBe('zh')
    expect(fromLanguageTag('JA')).toBe('ja')
    expect(fromLanguageTag('fr-FR')).toBeNull()
    expect(fromLanguageTag(null)).toBeNull()
  })

  it.each([
    ['en', en],
    ['ja', ja],
    ['zh', zh],
  ])('화면의 모든 문장이 %s 사전에 있고 자리 표시가 같다', (_, dict) => {
    const keys = usedKeys()
    expect(keys.size).toBeGreaterThan(300)
    const missing = [...keys].filter(([k]) => !(k in dict)).map(([k, file]) => `${file}: ${k}`)
    expect(missing).toEqual([])
    const mismatched = [...keys.keys()].filter((k) => placeholders(k) !== placeholders(dict[k]))
    expect(mismatched).toEqual([])
    const empty = Object.entries(dict).filter(([, v]) => !v.trim() && v !== '').map(([k]) => k)
    expect(empty).toEqual([])
  })
})
