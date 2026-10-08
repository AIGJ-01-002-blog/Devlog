import { useEffect, useState } from 'react'
import { NavIcon } from '../components/NavIcons'
import { api, ApiError } from '../lib/api'
import { Link } from '../lib/router'
import { feedUrl, rawXmlPath, READERS } from '../lib/rss'
import type { BlogProfile } from '../lib/types'
import { NotFoundPage } from './NotFoundPage'

/**
 * RSS 구독 안내 (063). "RSS를 누르니 이상한 XML만 나온다"는 말에서 나왔다.
 * 같은 주소를 구독 앱은 XML로 받고, 사람이 브라우저로 열면 이 화면을 본다.
 */
export function RssGuidePage({ handle }: { handle: string | null }) {
  const [name, setName] = useState<string | null>(handle ? null : 'devlog 전체')
  const [missing, setMissing] = useState(false)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const url = feedUrl(handle, window.location.origin)

  useEffect(() => {
    if (!handle) return
    api<BlogProfile>(`/api/members/${encodeURIComponent(handle)}`)
      .then((p) => setName(`${p.nickname}님의 블로그`))
      .catch((e) => { if (e instanceof ApiError && e.status === 404) setMissing(true); else setName(`@${handle}`) })
  }, [handle])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 3000)
    return () => clearTimeout(t)
  }, [copied])

  if (missing) return <NotFoundPage />

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
  }

  return (
    <main className="container narrow rss-guide">
      <div className="rss-badge" aria-hidden="true"><NavIcon name="rss" size={28} /></div>
      <h1 className="page-title">RSS로 새 글 받아 보기</h1>
      <p className="rss-lead">
        {name ?? '이 블로그'}의 <b>구독 주소</b>예요. 이 주소를 구독 앱에 넣어 두면 블로그를 찾아오지 않아도 새 글이 올라올 때마다 앱에서 바로 볼 수 있어요.
      </p>

      <div className="rss-url">
        <code>{url}</code>
        <button type="button" className="btn btn-primary" onClick={copy} data-tip="구독 주소를 복사해 구독 앱에 붙여 넣어요">
          <NavIcon name="copy" size={16} />주소 복사
        </button>
      </div>
      <p className={`small${copied === 'fail' ? ' error' : ' ok'}`} role="status">
        {copied === 'ok' ? '복사했어요. 구독 앱에 붙여 넣어 주세요.' : copied === 'fail' ? '복사하지 못했어요. 위 주소를 직접 골라 복사해 주세요.' : ''}
      </p>

      <h2>이렇게 구독해요</h2>
      <ol className="rss-steps">
        <li><b>주소 복사</b><span>위 [주소 복사]를 눌러요.</span></li>
        <li><b>구독 앱에 붙여 넣기</b><span>Feedly·Inoreader·NetNewsWire 같은 앱에서 [구독 추가]나 [+]를 누르고 붙여 넣어요.</span></li>
        <li><b>새 글 받아 보기</b><span>새 글이 올라오면 앱이 알아서 가져와요. 공개 글만 담겨요.</span></li>
      </ol>

      <h2>구독 앱에서 바로 열기</h2>
      <div className="row rss-readers">
        {READERS.map((r) => (
          <a key={r.name} className="btn btn-outline" href={r.url(url)} target="_blank" rel="noopener noreferrer" data-tip={r.tip}>{r.name}</a>
        ))}
      </div>

      <details className="rss-more">
        <summary>왜 브라우저로 열면 글자만 가득했나요?</summary>
        <p className="muted small">
          RSS는 사람이 아니라 구독 앱이 읽는 XML 형식이라, 브라우저로 그대로 열면 기계용 글자가 보여요. 그래서 브라우저로 열 때는 이 안내를 보여 드리고,
          구독 앱에는 지금처럼 XML을 보내요. 원문이 궁금하면 <a href={rawXmlPath(handle)}>XML 원문 보기</a>를 눌러 보세요.
        </p>
      </details>

      {handle && <p><Link to={`/@${handle}`} className="btn btn-text">← 블로그로 돌아가기</Link></p>}
    </main>
  )
}
