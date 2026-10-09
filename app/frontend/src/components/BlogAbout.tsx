import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { enhanceGifs } from '../lib/gifPlayer'
import { highlightWithin } from '../lib/highlight'

/** 서버와 같은 길이 제한 (spec 042 FR-002) */
export const ABOUT_MAX = 10_000

/** html은 소개가 있을 때만, contentMd는 본인에게만 온다 */
export interface About {
  html?: string
  contentMd?: string
  updatedAt?: string
  mine: boolean
}

export const aboutApi = {
  of: (handle: string) => api<About>(`/api/members/${encodeURIComponent(handle)}/about`),
  save: (contentMd: string) => api<void>('/api/me/about', { method: 'PUT', body: { contentMd } }),
}

/** 블로그 [소개] 탭 (spec 042, velog 소개). 본인은 그 자리에서 마크다운으로 고친다. */
export function BlogAbout({ handle }: { handle: string }) {
  const [about, setAbout] = useState<About | null>(null)
  const [failed, setFailed] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let alive = true
    aboutApi.of(handle).then((a) => { if (alive) setAbout(a) }).catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [handle])

  useEffect(() => {
    if (draft == null && about?.html) {
      void highlightWithin(bodyRef.current)
      enhanceGifs(bodyRef.current)
    }
  }, [about, draft])

  const editing = draft != null
  useEffect(() => { if (editing) editorRef.current?.focus() }, [editing])

  const dirty = draft != null && draft !== (about?.contentMd ?? '')
  // 고치던 소개가 있으면 탭을 닫거나 새로 고치기 전에 브라우저가 묻게 한다
  useEffect(() => {
    if (!dirty) return
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])

  if (failed) return <p className="muted center">소개를 불러오지 못했어요.</p>
  if (!about) return <p className="muted center">불러오는 중…</p>

  const save = async () => {
    if (draft == null) return
    setSaving(true)
    setError(null)
    try {
      await aboutApi.save(draft)
      setAbout(await aboutApi.of(handle))
      setDraft(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (draft != null) {
    const length = [...draft].length
    return (
      <section className="blog-about" aria-label="소개 수정">
        <label htmlFor="about-editor" className="sr-only">블로그 소개 (마크다운)</label>
        <textarea id="about-editor" ref={editorRef} className="about-editor" value={draft} rows={14}
                  aria-describedby="about-count" placeholder="나를 소개하는 글을 마크다운으로 써 보세요."
                  onChange={(e) => setDraft(e.target.value)} />
        <div className="row about-actions">
          <span id="about-count" className={`muted small${length > ABOUT_MAX ? ' danger' : ''}`}>{length.toLocaleString()} / {ABOUT_MAX.toLocaleString()}자</span>
          <button type="button" className="btn btn-text" onClick={() => {
            if (dirty && !confirm('작성 중인 소개를 버릴까요?')) return
            setDraft(null)
            setError(null)
          }} disabled={saving}>취소</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving || length > ABOUT_MAX}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    )
  }

  return (
    <section className="blog-about">
      {about.html
        ? <div className="markdown" ref={bodyRef} dangerouslySetInnerHTML={{ __html: about.html }} />
        : <p className="muted center">{about.mine ? '아직 블로그 소개가 없어요.' : '소개가 없어요.'}</p>}
      {about.mine && (
        <div className="row about-actions">
          <button type="button" className="btn btn-outline" onClick={() => setDraft(about.contentMd ?? '')}>
            {about.html ? '소개 수정' : '소개 쓰기'}
          </button>
        </div>
      )}
    </section>
  )
}
