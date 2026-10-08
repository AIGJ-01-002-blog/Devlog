import { api } from './api'

// 릴리스 노트 (spec 054). 서버가 CHANGELOG.md를 버전별로 나눠 정화한 HTML로 준다.

export interface Release {
  version: string
  date: string | null
  html: string
}

export const releasesApi = {
  list: () => api<{ current: string | null; releases: Release[] }>('/api/release-notes'),
}

/** 주소의 #v1.29.0 → "1.29.0" */
export function versionFromHash(hash: string): string | null {
  const m = /^#v(\d+\.\d+\.\d+)$/.exec(hash)
  return m ? m[1] : null
}
