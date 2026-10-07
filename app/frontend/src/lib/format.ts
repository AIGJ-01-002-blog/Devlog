// 날짜 표시: 24시간 이내는 "N분 전/N시간 전", 그 뒤는 2026.10.02 (docs/10 L-5).
export function relativeDate(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return ''
  const t = new Date(iso)
  const diff = now.getTime() - t.getTime()
  if (diff >= 0 && diff < 60_000) return '방금 전'
  if (diff >= 0 && diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`
  if (diff >= 0 && diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`
  return fullDate(iso)
}

export function fullDate(iso: string): string {
  const t = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getFullYear()}.${p(t.getMonth() + 1)}.${p(t.getDate())}`
}

export function monthDay(iso: string): string {
  const t = new Date(iso)
  return `${t.getMonth() + 1}월 ${t.getDate()}일`
}

export function clock(iso: string | Date): string {
  const t = typeof iso === 'string' ? new Date(iso) : iso
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
}

export function compactNumber(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(1).replace(/\.0$/, '')}만`
  return n.toLocaleString('ko-KR')
}
