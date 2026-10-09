import { describe, expect, it } from 'vitest'
import { contactHref, parseTech } from './portfolio'

describe('포트폴리오 (072)', () => {
  it('기술은 쉼표로 나누고 같은 이름은 한 번만', () => {
    expect(parseTech(' Spring Boot , react,React,, PostgreSQL ')).toEqual(['Spring Boot', 'react', 'PostgreSQL'])
    expect(parseTech('')).toEqual([])
  })
  it('연락하기는 이메일이 먼저, 없으면 홈페이지', () => {
    expect(contactHref({ email: 'a@b.c', homepage: 'https://x' })).toBe('mailto:a@b.c')
    expect(contactHref({ homepage: 'https://x' })).toBe('https://x')
    expect(contactHref({})).toBeNull()
  })
})
