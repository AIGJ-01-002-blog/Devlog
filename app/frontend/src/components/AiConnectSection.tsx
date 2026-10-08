import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { fullDate, relativeDate } from '../lib/format'
import { Link } from '../lib/router'
import {
  aiDiaryApi, aiPublishApi, claudeCodeCommand, TOKEN_EXPIRY_DAYS, TOKEN_NAME_MAX, tokensApi, type AccessToken, type IssuedToken, type TokenScope,
} from '../lib/mcp'
import { CopyCode } from './CopyCode'

/**
 * 설정 › AI 연결 (052): MCP용 개인 접근 토큰을 만들고 폐기한다.
 * 원문은 만든 직후 이 화면에서 한 번만 보여 준다. 다시 볼 수 없으니 새로 만들게 안내한다.
 * 아래의 "AI가 발행·삭제하도록 허용"(053)은 기본 꺼짐이고, 켤 때 한 번 더 묻는다.
 */
export function AiConnectSection() {
  const [tokens, setTokens] = useState<AccessToken[] | null>(null)
  const [name, setName] = useState('Claude Code')
  const [scope, setScope] = useState<TokenScope>('WRITE')
  const [days, setDays] = useState<number>(90)
  const [issued, setIssued] = useState<IssuedToken | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { tokensApi.list().then(setTokens).catch(() => setTokens([])) }, [])
  // 안내 페이지의 "토큰 만들기"(/settings#ai)로 오면 이 항목으로 내린다
  useEffect(() => { if (tokens && location.hash === '#ai') document.getElementById('ai')?.scrollIntoView() }, [tokens])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const t = await tokensApi.create(name.trim(), scope, days)
      setIssued(t)
      setTokens((list) => [t.token, ...(list ?? [])])
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? (err.errors[0]?.message ?? err.message) : '토큰을 만들지 못했어요. 다시 시도해 주세요.' })
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (t: AccessToken) => {
    if (!confirm(`'${t.name}' ${t.oauth ? '연결을 끊을까요' : '토큰을 폐기할까요'}? 이 토큰으로 연결한 AI는 바로 devlog를 쓸 수 없게 돼요.`)) return
    setBusy(true)
    setMessage(null)
    try {
      await tokensApi.revoke(t.id)
      setTokens((list) => (list ?? []).filter((x) => x.id !== t.id))
      if (issued?.token.id === t.id) setIssued(null)
      setMessage({ ok: true, text: '폐기했어요.' })
    } catch {
      setMessage({ ok: false, text: '폐기하지 못했어요. 다시 시도해 주세요.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="settings-section ai-connect" id="ai">
      <h2>AI 연결</h2>
      <p className="muted small">
        Claude Code·Cursor·Codex 같은 AI 도구에 토큰으로 devlog를 연결하면 "개발 일지 써 줘" 한마디로 임시글이 만들어져요.
        ChatGPT처럼 로그인으로 연결한 앱도 여기에 보여요. 발행은 기본으로 내가 해요. <Link to="/mcp">연결 방법 자세히 보기</Link>
      </p>

      {issued && (
        <div className="banner ai-connect-issued" role="status">
          <p><b>'{issued.token.name}' 토큰을 만들었어요.</b> 이 화면을 벗어나면 다시 볼 수 없으니 지금 복사해 두세요.</p>
          <CopyCode label="새 토큰" code={issued.secret} />
          <p className="small">Claude Code라면 터미널에 이 명령을 붙여 넣으면 연결돼요.</p>
          <CopyCode label="Claude Code 연결 명령" code={claudeCodeCommand(window.location.origin, issued.secret)} />
          <button type="button" className="btn btn-text" onClick={() => setIssued(null)}>다 복사했어요</button>
        </div>
      )}

      <form className="ai-connect-form" onSubmit={create}>
        <label>
          <span>이름</span>
          <input value={name} maxLength={TOKEN_NAME_MAX} required onChange={(e) => setName(e.target.value)} placeholder="예: 회사 노트북 Claude Code" />
        </label>
        <label>
          <span>권한</span>
          <select value={scope} onChange={(e) => setScope(e.target.value as TokenScope)}>
            <option value="WRITE">쓰기 + 읽기</option>
            <option value="READ">읽기만</option>
          </select>
        </label>
        <label>
          <span>만료</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {TOKEN_EXPIRY_DAYS.map((d) => <option key={d} value={d}>{d === 365 ? '1년' : `${d}일`}</option>)}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>토큰 만들기</button>
      </form>

      {tokens && tokens.length > 0 && (
        <ul className="token-list">
          {tokens.map((t) => (
            <li key={t.id} className="token-row">
              <span className="token-who">
                <b>{t.name}</b> {t.oauth ? <span className="token-kind">로그인 연결</span> : <code>{t.prefix}…</code>}
                <span className="muted small">
                  {t.scope === 'WRITE' ? '쓰기' : '읽기'}
                  {' · '}{t.expired ? <span className="error">만료됨</span> : t.expiresAt ? `${fullDate(t.expiresAt)}까지` : '만료 없음'}
                  {' · '}{t.lastUsedAt ? `${relativeDate(t.lastUsedAt)} 사용` : '아직 안 씀'}
                </span>
              </span>
              <button type="button" className="btn btn-text danger" disabled={busy} onClick={() => revoke(t)}>{t.oauth ? '연결 끊기' : '폐기'}</button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className={message.ok ? 'ok' : 'error'} role="status">{message.text}</p>}

      <AiPublishToggle />
      <AiDiaryToggle />
    </section>
  )
}

const AI_PUBLISH_WARNING = '켜면 연결한 AI가 글을 바로 발행하거나 삭제할 수 있어요. 삭제는 웹에서 지울 때와 같아요.'

/**
 * "AI가 발행·삭제하도록 허용" (053). 기본은 꺼짐. 켜면 쓰기 권한으로 연결한 AI에 publish_post·delete_post가 열린다.
 * 이 설정은 로그인한 이 화면에서만 바꿀 수 있어서 AI가 스스로 켤 수 없다.
 */
function AiPublishToggle() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { aiPublishApi.get().then((s) => setAllowed(s.allowed)).catch(() => setAllowed(null)) }, [])

  const change = async (on: boolean) => {
    if (on && !confirm('AI가 발행·삭제하도록 허용할까요?\n쓰기 권한으로 연결한 AI가 내 확인 없이 글을 바로 발행하거나 휴지통으로 옮길 수 있어요. 언제든 다시 끌 수 있어요.')) return
    setBusy(true)
    setError(null)
    try {
      setAllowed((await aiPublishApi.set(on)).allowed)
    } catch {
      setError('설정을 바꾸지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-publish">
      <h3>AI 발행·삭제</h3>
      <label>
        <input type="checkbox" checked={allowed === true} disabled={busy || allowed === null} onChange={(e) => change(e.target.checked)} />
        {' '}AI가 발행·삭제하도록 허용
      </label>
      <p className="muted small">
        {AI_PUBLISH_WARNING} 지운 글은 휴지통에서 30일 안에 복구할 수 있어요. 꺼 두면 AI는 임시글과 "발행 대기"까지만 만들어요.
      </p>
      <p className="muted small ai-publish-reconnect">
        끄면 바로 막혀요. 켠 뒤에는 AI 앱에서 devlog 연결을 다시 시작해야 발행·삭제 도구가 보여요.
      </p>
      {error && <p className="error" role="status">{error}</p>}
    </div>
  )
}

/**
 * "자정에 일기 쓰기" (061). 기본은 꺼짐. 켜면 연결한 AI에 add_note가 열리고, 매일 00:00(KST)에 그날 메모가 일기 임시글로 묶인다.
 * 발행은 하지 않는다. 끄면 아직 묶지 않은 메모도 지운다.
 */
function AiDiaryToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [loadFailed, setLoadFailed] = useState(false)

  const load = () => {
    setLoadFailed(false)
    aiDiaryApi.get().then((s) => setEnabled(s.enabled)).catch(() => setLoadFailed(true))
  }
  useEffect(load, [])

  const change = async (on: boolean) => {
    if (!on && !confirm('자정에 일기 쓰기를 끌까요?\n오늘 AI가 남긴 메모도 함께 지워져요. 이미 만든 일기 임시글은 그대로 남아요.')) return
    setBusy(true)
    setError(null)
    try {
      setEnabled((await aiDiaryApi.set(on)).enabled)
    } catch {
      setError('설정을 바꾸지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-publish ai-diary">
      <h3>자정 일기</h3>
      <label title="AI를 쓴 날마다 자정에 그날 작업 메모를 일기 임시글로 모아요">
        <input type="checkbox" checked={enabled === true} disabled={busy || enabled === null} onChange={(e) => change(e.target.checked)} />
        {' '}자정에 일기 쓰기
      </label>
      <p className="muted small">
        켜면 연결한 AI가 작업을 마칠 때마다 한두 문장 메모를 남기고, 매일 자정(한국 시간)에 그날 메모가 주제별로 묶인 <b>일기 임시글</b>이 돼요.
        AI를 쓰지 않은 날은 만들지 않고, 발행은 내가 해요.
      </p>
      <p className="muted small ai-publish-reconnect">
        켠 뒤에는 AI 앱에서 devlog 연결을 다시 시작해야 메모 도구가 보여요. 끄면 아직 묶지 않은 메모도 지워요.
      </p>
      {loadFailed && (
        <p className="error" role="status">
          설정을 불러오지 못했어요. <button type="button" className="btn btn-text" title="자정 일기 설정을 다시 불러와요" onClick={load}>다시 시도</button>
        </p>
      )}
      {error && <p className="error" role="status">{error}</p>}
    </div>
  )
}
