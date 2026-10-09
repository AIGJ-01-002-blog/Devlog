import { api } from './api'
import type { SocialLinks } from './socialLinks'

// 포트폴리오 모드 (spec 072 3단계). 프로젝트 = 포트폴리오에 보이기로 한 시리즈

export interface ProjectFields {
  portfolio: boolean
  period: string | null
  summary: string | null
  tech: string[]
  teamWork: string | null
  myRole: string | null
}

export interface ProjectPost {
  id: number
  title: string
  url: string
  firstPublicAt: string
}

export interface Project extends Omit<ProjectFields, 'portfolio'> {
  id: number
  name: string
  slug: string
  url: string
  posts: ProjectPost[]
}

export interface Portfolio {
  handle: string
  nickname: string
  bio: string | null
  profileImageUrl: string | null
  socialLinks: SocialLinks
  postCount: number
  likeCount: number
  projects: Project[]
}

export const PROJECT_LIMITS = { period: 40, summary: 200, tech: 12, techName: 30, text: 2000 } as const

export const portfolioApi = {
  of: (handle: string) => api<Portfolio>(`/api/members/${encodeURIComponent(handle)}/portfolio`),
  project: (seriesId: number) => api<ProjectFields>(`/api/me/series/${seriesId}/project`),
  save: (seriesId: number, f: ProjectFields) => api<ProjectFields>(`/api/me/series/${seriesId}/project`, { method: 'PUT', body: f }),
}

/** "Spring Boot, React" 같은 입력을 기술 목록으로. 쉼표로 나누고 빈 칸·같은 이름(대소문자 무시)은 한 번만 */
export function parseTech(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const v = part.trim().replace(/\s+/g, ' ')
    if (!v || seen.has(v.toLowerCase())) continue
    seen.add(v.toLowerCase())
    out.push(v)
  }
  return out
}

/** 연락하기 주소: 이메일이 있으면 메일, 없으면 홈페이지 */
export function contactHref(links: SocialLinks): string | null {
  if (links.email) return `mailto:${links.email}`
  return links.homepage ?? null
}
