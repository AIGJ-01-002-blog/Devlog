import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { oauthApi, oauthParams, type OAuthView } from '../lib/mcp'
import { Link } from '../lib/router'

/**
 * AI 앱 연결 동의 (052). ChatGPT 같은 앱이 OAuth로 devlog에 연결할 때 이 화면으로 보낸다.
 * [허용]을 누르면 앱이 내 이름으로 MCP 도구를 쓸 수 있다. 발행은 여전히 내가 화면에서 한다.
 */
export function OAuthAuthorizePage() {
  const { me } = useAuth()
  const [params] = useState(() => oauthParams(window.location.search))
  const [view, setView] = useState<OAuthView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { document.title = 'AI 앱 연결 - devlog' }, [])
  useEffect(() => {
    oauthApi.view(window.location.search).then(setView)
      .catch((e) => setError(e instanceof ApiError ? e.message : '연결 요청을 확인하지 못했어요.'))
  }, [])

  const decide = async (approve: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const { redirect } = await api<{ redirect: string }>('/api/oauth/authorize', { method: 'POST', body: { ...params, approve } })
      window.location.assign(redirect)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '처리하지 못했어요. 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <main className="container narrow oauth-page">
      <h1 className="page-title">AI 앱 연결</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {!view && !error && <p className="muted">확인하는 중…</p>}
      {view && (
        <section className="oauth-card">
          <p className="oauth-unverified" role="note">devlog가 확인하지 않은 앱이에요. 이름은 앱이 스스로 정한 것이라 아래 주소로 진짜 앱인지 확인해 주세요.</p>
          <p className="oauth-lead"><b>{view.clientName}</b>이(가) {me?.member?.nickname ? <><b>{me.member.nickname}</b>님의</> : '내'} devlog에 연결하려고 해요.</p>
          <ul className="oauth-scope">
            <li>내 글과 공개 글 읽기 (웹에서 볼 수 있는 글만)</li>
            {view.scope === 'WRITE' && <li>임시글 만들기·고치기, "발행 대기" 표시</li>}
            <li className="muted">발행·공개 범위 바꾸기·삭제는 할 수 없어요. 발행은 언제나 내가 해요.</li>
          </ul>
          <div className="oauth-host">
            <span className="muted small">허용하면 이 주소로 돌아가요</span>
            <strong>{view.redirectHost}</strong>
          </div>
          <p className="muted small">설정 › AI 연결에서 언제든 연결을 끊을 수 있어요.</p>
          <div className="oauth-actions">
            <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => decide(true)}>허용</button>
            <button type="button" className="btn btn-outline btn-lg" disabled={busy} onClick={() => decide(false)}>거부</button>
          </div>
          <p className="muted small">처음 보는 앱이거나 직접 연결을 시작하지 않았다면 거부해 주세요. <Link to="/mcp">AI 연결 안내</Link></p>
        </section>
      )}
    </main>
  )
}
