import { describe, expect, it } from 'vitest'
import { ACCEPT, checkFile, fileSize, MAX_FILE_BYTES, MAX_FILES, move } from './files'

describe('checkFile', () => {
  it('받는 형식이고 20MB 이하면 통과한다', () => {
    expect(checkFile({ name: '발표.PDF', size: 3_000_000 }, 0)).toBeNull()
    expect(checkFile({ name: 'a.docx', size: MAX_FILE_BYTES }, MAX_FILES - 1)).toBeNull()
  })

  it('사진·목록 밖 형식·빈 파일·큰 파일·개수 초과를 막는다', () => {
    expect(checkFile({ name: 'a.png', size: 10 }, 0)).toContain('본문')
    expect(checkFile({ name: 'run.exe', size: 10 }, 0)).toContain('pdf')
    expect(checkFile({ name: 'README', size: 10 }, 0)).toContain('pdf')
    expect(checkFile({ name: 'a.txt', size: 0 }, 0)).toContain('빈 파일')
    expect(checkFile({ name: 'a.zip', size: MAX_FILE_BYTES + 1 }, 0)).toContain('20MB')
    expect(checkFile({ name: 'a.zip', size: 1 }, MAX_FILES)).toContain('20개')
  })

  it('파일 고르기 창은 받는 확장자만 보여 준다', () => {
    expect(ACCEPT).toBe('.pdf,.zip,.txt,.md,.csv,.docx,.xlsx,.pptx')
  })
})

describe('fileSize', () => {
  it('읽기 쉬운 단위로 쓴다', () => {
    expect(fileSize(512)).toBe('512B')
    expect(fileSize(2048)).toBe('2KB')
    expect(fileSize(3 * 1024 * 1024)).toBe('3.0MB')
    expect(fileSize(15 * 1024 * 1024)).toBe('15MB')
  })
})

describe('move', () => {
  it('한 칸씩 옮기고 끝을 넘으면 그대로 둔다', () => {
    expect(move([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
    expect(move([1, 2, 3], 2, -1)).toEqual([1, 3, 2])
    const same = [1, 2]
    expect(move(same, 0, -1)).toBe(same)
    expect(move(same, 1, 1)).toBe(same)
  })
})
