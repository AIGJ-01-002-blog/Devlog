import { describe, expect, it } from 'vitest'
import { ApiError, attachmentName } from './api'
import { exportErrorText } from './export'

describe('내 글 내보내기 (059)', () => {
  it('Content-Disposition에서 파일 이름을 읽는다', () => {
    expect(attachmentName('attachment; filename="devlog-minseo-2026-10-08.zip"')).toBe('devlog-minseo-2026-10-08.zip')
    expect(attachmentName("attachment; filename=\"a.zip\"; filename*=UTF-8''%EB%82%B4-%EA%B8%80.zip")).toBe('내-글.zip')
    expect(attachmentName("attachment; filename=\"b.zip\"; filename*=UTF-8''%E0%A4%A")).toBe('b.zip')
    expect(attachmentName(null)).toBeNull()
  })

  it('요청 제한·연결 끊김·그 밖의 오류를 나눠 알린다', () => {
    expect(exportErrorText(new ApiError(429, 'RATE_LIMITED', 'x'))).toContain('10분에 5번')
    expect(exportErrorText(new ApiError(0, 'NETWORK', 'x'))).toContain('연결이 끊겨')
    expect(exportErrorText(new ApiError(500, 'HTTP_500', 'x'))).toBe('내보내기 파일을 만들지 못했어요.')
  })
})
