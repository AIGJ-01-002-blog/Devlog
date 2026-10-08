import { describe, expect, it } from 'vitest'
import { versionFromHash } from './releases'

// spec 054: 릴리스 노트의 버전 자리
describe('versionFromHash', () => {
  it('#v1.29.0만 버전으로 읽어요', () => {
    expect(versionFromHash('#v1.29.0')).toBe('1.29.0')
    expect(versionFromHash('#1.29.0')).toBeNull()
    expect(versionFromHash('#v1.29')).toBeNull()
    expect(versionFromHash('')).toBeNull()
  })
})
