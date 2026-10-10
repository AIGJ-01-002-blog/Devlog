import type { Branch, Card } from './types'
import { t } from './i18n'

/** 브랜치 줄은 main 옆으로 이만큼만 나란히 그린다. 휴대폰 폭에서 제목 자리를 지키려는 값이다 (072) */
export const MAX_LANES = 3

/** 한 칸(글 한 줄)에서 브랜치 줄 하나의 모양 */
export interface LaneSegment {
  /** 1부터 MAX_LANES. 0은 main */
  lane: number
  kind: Branch['kind']
  /** 위 칸에서 이어져 내려온다 */
  top: boolean
  /** 아래 칸으로 이어진다 */
  bottom: boolean
  /** 이 칸의 점에서 main으로 휘어 들어간다 (브랜치의 첫 글) */
  fork: boolean
}

export interface GraphRow {
  card: Card
  /** 점이 찍히는 줄. 브랜치가 없거나 줄이 모자라 넘친 글은 0(main) */
  lane: number
  /** 점 색 */
  dot: 'main' | Branch['kind']
  /** 줄이 모자라 main에 점을 찍은 브랜치 글 */
  overflow: boolean
  mainTop: boolean
  mainBottom: boolean
  /** 이 칸에 보이는 브랜치 줄들 (자기 줄 포함) */
  segments: LaneSegment[]
  /** 이 칸 위 경계를 지나는 줄들 (날짜 줄을 끼워 넣을 때 그 줄에 그린다). main은 늘 지난다(첫 칸 제외) */
  above: { lane: number; kind: Branch['kind'] }[]
}

interface Span {
  key: string
  kind: Branch['kind']
  first: number
  last: number
  /** 다음 쪽에 이어지는 글이 더 있어 아래로 열려 있다 */
  open: boolean
  lane: number
}

/**
 * 최신순 글 목록을 git 그래프 칸으로 배치한다 (072). 순수 함수라 무한 스크롤로 쪽이 붙을 때마다 처음부터 다시 계산한다.
 * - 브랜치(전체 2편 이상)마다 목록에서 가장 위(최신)와 가장 아래(오래된) 글 사이를 한 줄로 잇는다.
 * - 가장 아래 글이 브랜치의 1편이면 그 칸에서 main으로 휘어 들어간다. 아니고 다음 쪽이 남았으면 아래로 열어 둔다.
 * - 줄은 위에서부터 빈 자리(1~MAX_LANES)를 쓴다. 자리가 없으면 그 브랜치 글은 main에 점을 찍는다(이름표로만 알린다).
 */
export function branchLanes(cards: Card[], hasMore: boolean, maxLanes = MAX_LANES): GraphRow[] {
  const spans = new Map<string, Span>()
  cards.forEach((c, i) => {
    const b = c.branch
    if (!b || b.total < 2) return
    const s = spans.get(b.key)
    if (s) {
      s.last = i
    } else {
      spans.set(b.key, { key: b.key, kind: b.kind, first: i, last: i, open: false, lane: 0 })
    }
  })
  for (const s of spans.values()) {
    const oldest = cards[s.last].branch!
    s.open = oldest.index > 1 && hasMore
    if (s.open) s.last = cards.length - 1
  }

  // 위에서부터 줄 배정. 줄이 비는 것은 앞 브랜치가 끝난(갈라진) 칸 다음부터다
  const laneEnd: number[] = Array(maxLanes + 1).fill(-1)
  const ordered = [...spans.values()].sort((a, b) => a.first - b.first)
  for (const s of ordered) {
    for (let lane = 1; lane <= maxLanes; lane++) {
      if (laneEnd[lane] < s.first) {
        s.lane = lane
        laneEnd[lane] = s.last
        break
      }
    }
  }
  const placed = ordered.filter((s) => s.lane > 0)

  return cards.map((card, i) => {
    const own = card.branch ? spans.get(card.branch.key) : undefined
    const lane = own?.lane ?? 0
    const segments: LaneSegment[] = []
    const above: GraphRow['above'] = []
    for (const s of placed) {
      if (i >= s.first && i <= s.last) {
        const isLast = i === s.last
        segments.push({ lane: s.lane, kind: s.kind, top: i > s.first, bottom: !isLast || s.open, fork: isLast && !s.open })
      }
      if (s.first < i && i <= s.last) above.push({ lane: s.lane, kind: s.kind })
    }
    return {
      card,
      lane,
      dot: lane > 0 ? own!.kind : card.branch && card.branch.total > 1 ? card.branch.kind : 'main',
      overflow: own != null && lane === 0,
      mainTop: i > 0,
      mainBottom: i < cards.length - 1 || hasMore,
      segments,
      above,
    }
  })
}

/** 날짜 줄 이름: 오늘·어제·10월 7일(올해가 아니면 2025년 10월 7일) */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 86_400_000)
  if (diff === 0) return t('오늘')
  if (diff === 1) return t('어제')
  if (d.getFullYear() === now.getFullYear()) return t('{0}월 {1}일', { 0: d.getMonth() + 1, 1: d.getDate() })
  return t('{0}년 {1}월 {2}일', { 0: d.getFullYear(), 1: d.getMonth() + 1, 2: d.getDate() })
}

/** 브랜치 이름표 문구 */
export function branchLabel(b: Branch): string {
  if (b.kind === 'SERIES') return b.index === 1 ? t('{0} 시리즈 시작, 1편', { 0: b.name }) : t('{0} 시리즈, {1}편', { 0: b.name, 1: b.index })
  return b.index === 1 ? t('{0} 브랜치 시작', { 0: b.name }) : t('{0} 브랜치, {1}편 중 {2}편', { 0: b.name, 1: b.total, 2: b.index })
}
