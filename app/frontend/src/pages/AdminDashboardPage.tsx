import { useEffect, useRef, useState } from 'react'
import { AdminNav } from '../components/AdminNav'
import { BarChart, type BarPoint } from '../components/BarChart'
import { change, consoleApi, count, PERIODS, type Dashboard, type Period, type Sums } from '../lib/admin'
import { Link, navigate, useLocation } from '../lib/router'

type Metric = keyof Sums

/** tip은 합계 칸 툴팁, chart는 그래프 제목(날짜별 값의 뜻이 합계와 다를 때만) */
const METRICS: { key: Metric; label: string; unit: string; tip?: string; chart?: string }[] = [
  { key: 'visitors', label: '방문자', unit: '명', tip: '기간 동안 사이트에 온 사람 수예요. 여러 날 와도 한 명으로 세요', chart: '방문자 (날마다 센 사람 수)' },
  { key: 'visits', label: '방문', unit: '회', tip: '사이트에 들어온 횟수예요. 30분 넘게 쉬었다 다시 오면 한 번 더 세요' },
  { key: 'activeMembers', label: '활동한 회원', unit: '명', tip: '기간 동안 로그인한 채로 블로그를 쓴 회원 수예요. 여러 날 와도 한 명으로 세요', chart: '활동한 회원 (날마다 센 회원 수)' },
  { key: 'views', label: '조회수', unit: '회' },
  { key: 'posts', label: '새 글', unit: '편' },
  { key: 'signups', label: '가입', unit: '명' },
  { key: 'comments', label: '댓글', unit: '개' },
  { key: 'likes', label: '좋아요', unit: '개' },
  { key: 'reports', label: '신고', unit: '건' },
]

function points(d: Dashboard, key: Metric): BarPoint[] {
  return d.daily.map((day) => {
    const [, m, dd] = day.date.split('-').map(Number)
    return { label: `${m}.${dd}`, fullLabel: `${m}월 ${dd}일`, value: day[key] }
  })
}

/** 관리자 대시보드 (062): 처리할 일, 기간 합계(이전 기간 대비), 날짜별 추이, 많이 본 글·많이 쓴 회원, 전체 현황. */
export function AdminDashboardPage() {
  const { search } = useLocation()
  const days = (PERIODS.find((p) => String(p) === search.get('days')) ?? 30) as Period
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState(false)
  const [metric, setMetric] = useState<Metric>('visitors')
  const current = useRef(days)
  current.current = days

  useEffect(() => { document.title = '관리자 대시보드 - devlog' }, [])

  useEffect(() => {
    setError(false)
    consoleApi.dashboard(days)
      .then((d) => { if (current.current === days) setData(d) })
      .catch(() => { if (current.current === days) setError(true) })
  }, [days])

  const m = METRICS.find((x) => x.key === metric) ?? METRICS[0]
  const tile = (data: Dashboard, x: (typeof METRICS)[number]) => {
    const c = change(data.current[x.key], data.previous[x.key])
    return (
      <button key={x.key} type="button" className="stat-tile" aria-pressed={x.key === metric}
              data-tip={`${x.tip ? `${x.tip}. ` : ''}눌러서 날짜별 그래프 보기`} onClick={() => setMetric(x.key)}>
        <span className="stat-label">{x.label}</span>
        <span className="stat-value">{count(data.current[x.key])}</span>
        <span className={`stat-change ${c.trend}`}>{c.text || ' '}</span>
      </button>
    )
  }

  return (
    <main className="container admin admin-wide">
      <h1 className="page-title">관리자 페이지</h1>
      <AdminNav />
      <div className="admin-toolbar">
        <div className="segmented" role="group" aria-label="기간">
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={p === days} data-tip={`오늘을 포함한 최근 ${p}일을 봐요`}
                    onClick={() => navigate(p === 30 ? '/admin' : `/admin?days=${p}`)}>{p}일</button>
          ))}
        </div>
        {data && <span className="muted small">{data.from.replaceAll('-', '.')} ~ {data.to.replaceAll('-', '.')} · 이전 {days}일과 비교</span>}
      </div>
      {error && <p className="error" role="alert">통계를 불러오지 못했어요.</p>}
      {!data && !error && <p className="muted center">불러오는 중…</p>}
      {data && (
        <>
          {(data.totals.pendingReports > 0 || data.totals.openInquiries > 0) && (
            <section className="admin-todo" aria-label="처리할 일">
              {data.totals.pendingReports > 0 && (
                <Link to="/admin/reports" className="admin-todo-item" data-tip="처리를 기다리는 신고로 가요">
                  처리할 신고 <strong>{count(data.totals.pendingReports)}</strong>건
                </Link>
              )}
              {data.totals.openInquiries > 0 && (
                <Link to="/admin/inquiries" className="admin-todo-item" data-tip="답하지 않은 문의·버그 신고로 가요">
                  답할 문의 <strong>{count(data.totals.openInquiries)}</strong>건
                </Link>
              )}
            </section>
          )}

          <section className="stat-grid" aria-label={`최근 ${days}일 합계`}>
            {/* 방문자·방문 다음에 오늘 방문자를 둔다 */}
            {METRICS.slice(0, 2).map((x) => tile(data, x))}
            <div className="stat-tile static" data-tip="오늘 0시(한국 시간)부터 온 사람 수. 운영진과 로봇은 세지 않아요">
              <span className="stat-label">오늘 방문자</span>
              <span className="stat-value">{count(data.visitors.today)}</span>
              <span className="stat-change flat">어제 {count(data.visitors.yesterday)}명</span>
            </div>
            {METRICS.slice(2).map((x) => tile(data, x))}
          </section>

          <section className="admin-card">
            <BarChart title={m.chart ?? m.label} unit={m.unit} points={points(data, metric)} />
            {(metric === 'activeMembers' || metric === 'visitors' || metric === 'visits') && (
              <p className="muted small">
                {metric === 'activeMembers'
                  ? '날짜별 활동 기록은 v1.40.0부터 쌓여요. 그 전 날짜에는 회원마다 마지막으로 활동한 날만 있어요.'
                  : '방문 기록은 v1.38.0부터 쌓여요.'}
              </p>
            )}
          </section>

          <div className="admin-columns">
            <section className="admin-card">
              <h2>많이 본 글</h2>
              {data.topPosts.length === 0 ? <p className="muted small">이 기간에 조회된 공개 글이 없어요.</p> : (
                <ol className="rank-list">
                  {data.topPosts.map((p) => (
                    <li key={p.id}>
                      <a href={p.link} className="rank-title">{p.title}</a>
                      <span className="muted small">@{p.authorHandle} · 조회 {count(p.views)} · 좋아요 {count(p.likes)} · 댓글 {count(p.comments)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="admin-card">
              <h2>많이 쓴 회원</h2>
              {data.topAuthors.length === 0 ? <p className="muted small">이 기간에 발행한 글이 없어요.</p> : (
                <ol className="rank-list">
                  {data.topAuthors.map((a) => (
                    <li key={a.handle}>
                      <Link to={`/admin/members/${a.handle}`} className="rank-title" data-tip="회원 통계·관리 보기">{a.nickname ?? a.handle}</Link>
                      <span className="muted small">@{a.handle} · 새 글 {count(a.posts)}편</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section className="admin-card">
            <h2>전체 현황</h2>
            <dl className="totals">
              <div><dt>회원</dt><dd>{count(data.totals.members.total)}명</dd>
                <dd className="muted small">활동 {count(data.totals.members.active)} · 정지 {count(data.totals.members.suspended)} · 탈퇴 신청 {count(data.totals.members.withdrawing)} · 매니저 {count(data.totals.members.managers)}</dd></div>
              <div><dt>발행한 글</dt><dd>{count(data.totals.posts.published)}편</dd>
                <dd className="muted small">공개 {count(data.totals.posts.publicPosts)} · 비공개 {count(data.totals.posts.privatePosts)} · 숨김 {count(data.totals.posts.hidden)}</dd></div>
              <div><dt>임시글·휴지통</dt><dd>{count(data.totals.posts.drafts)}편</dd>
                <dd className="muted small">휴지통 {count(data.totals.posts.trash)}편</dd></div>
              <div><dt>방문자</dt><dd>{count(data.current.visitors)}명</dd>
                <dd className="muted small">최근 {days}일 · 회원 {count(data.visitors.members)} · 비회원 {count(Math.max(0, data.current.visitors - data.visitors.members))}</dd></div>
              <div><dt>조회수</dt><dd>{count(data.totals.views)}회</dd></div>
              <div><dt>좋아요</dt><dd>{count(data.totals.likes)}개</dd></div>
              <div><dt>댓글</dt><dd>{count(data.totals.comments)}개</dd></div>
            </dl>
          </section>
        </>
      )}
    </main>
  )
}
