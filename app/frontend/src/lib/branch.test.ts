import { beforeEach, describe, expect, it } from 'vitest'
import { branchNeighbors, markRead, READ_KEEP, readPosts, seriesProgress, type BranchNav } from './branch'

describe('읽은 글 (072)', () => {
  beforeEach(() => localStorage.clear())

  it('연 글을 기억하고 같은 글은 한 번만 센다', () => {
    markRead(3)
    markRead(5)
    markRead(3)
    expect([...readPosts()]).toEqual([5, 3])
  })

  it('넘치면 오래된 것부터 잊는다', () => {
    for (let i = 1; i <= READ_KEEP + 2; i++) markRead(i)
    const read = readPosts()
    expect(read.size).toBe(READ_KEEP)
    expect(read.has(1)).toBe(false)
    expect(read.has(READ_KEEP + 2)).toBe(true)
  })

  it('저장된 값이 깨져 있으면 빈 목록', () => {
    localStorage.setItem('devlog:read-posts', '{oops')
    expect(readPosts().size).toBe(0)
  })

  it('이어 읽을 글은 읽지 않은 첫 글이다', () => {
    const posts = [{ id: 1 }, { id: 2 }, { id: 3 }]
    expect(seriesProgress(posts, new Set([1, 3]))).toEqual({ done: 2, next: { id: 2 } })
    expect(seriesProgress(posts, new Set([1, 2, 3]))).toEqual({ done: 3, next: null })
  })
})

describe('branchNeighbors', () => {
  const nav: BranchNav = { kind: 'TOPIC', key: 't1', name: 'x', url: '/?branch=t1', index: 2,
    posts: [1, 2, 3].map((id) => ({ id, title: `${id}`, url: `/p/${id}` })) }
  it('앞뒤 글', () => {
    expect(branchNeighbors(nav).prev?.id).toBe(1)
    expect(branchNeighbors(nav).next?.id).toBe(3)
    expect(branchNeighbors({ ...nav, index: null })).toEqual({ prev: null, next: null })
  })
})
