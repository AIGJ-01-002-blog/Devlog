/**
 * 기본 프로필 아이콘 (005 FR-016): 닉네임 첫 글자(영문은 대문자) + 블로그 주소로 정해진 8가지 색 중 하나.
 * 흰 글자와의 명도 대비가 모두 4.5:1 이상인 색만 쓴다. 배경색이 화면 테마와 무관해 라이트·다크 모두 같다.
 */
export const AVATAR_COLORS = ['#C92A2A', '#A61E4D', '#862E9C', '#5F3DC4', '#364FC7', '#1864AB', '#0B7285', '#087F5B'] as const

/** 같은 주소는 언제나 같은 색 (FNV-1a). */
export function avatarColor(seed: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return AVATAR_COLORS[(h >>> 0) % AVATAR_COLORS.length]
}

export function avatarInitial(name: string): string {
  const first = Array.from((name ?? "").trim())[0] ?? '?'
  return first.toLocaleUpperCase('en')
}

/** WCAG 상대 명도 대비. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
