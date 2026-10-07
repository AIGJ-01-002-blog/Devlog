import { useCallback, useEffect, useRef, useState } from 'react'
import { ConflictDialog } from '../components/ConflictDialog'
import { api, ApiError } from '../lib/api'
import { Autosaver, type Content, type SaveState } from '../lib/autosave'
import { useAuth } from '../lib/auth'
import { clock } from '../lib/format'
import { highlightWithin } from '../lib/highlight'
import { localDrafts, type LocalBackup, type LocalDraft } from '../lib/localDrafts'
import { decideRestore } from '../lib/restore'
import { navigate, setLeaveGuard } from '../lib/router'
import type { EditorView, ServerContent, Visibility } from '../lib/types'
import { NotFoundPage } from './NotFoundPage'

/** [새 글]: 임시글을 먼저 만들고 에디터 주소로 바꾼다 (docs/04 §2-5). */
export function NewPostPage() {
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    api<{ id: number }>('/api/posts', { method: 'POST', body: {} })
      .then((p) => navigate(`/write/${p.id}`, { replace: true }))
      .catch((e) => setError(e instanceof ApiError ? e.message : '새 글을 만들지 못했어요.'))
  }, [])
  return <main className="container narrow"><p className="muted center">{error ?? '새 글을 준비하는 중…'}</p></main>
}

export function WritePage({ id }: { id: string }) {
  const { me } = useAuth()
  const memberId = me?.member?.id
  const [loaded, setLoaded] = useState<{ view: EditorView; local: LocalDraft | null } | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (memberId == null) return
    setLoaded(null)
    api<EditorView>(`/api/posts/${encodeURIComponent(id)}/edit`)
      .then(async (view) => setLoaded({ view, local: await localDrafts.get(memberId, view.id) }))
      .catch(() => setMissing(true))
  }, [id, memberId])

  if (missing) return <NotFoundPage />
  if (!loaded || memberId == null) return <main className="container"><p className="muted center">불러오는 중…</p></main>
  return <Editor key={loaded.view.id} view={loaded.view} local={loaded.local} memberId={memberId} />
}

const LOCAL_IDLE_MS = 1000

function Editor({ view, local, memberId }: { view: EditorView; local: LocalDraft | null; memberId: number }) {
  const serverContent: ServerContent = { title: view.title, contentMd: view.contentMd, version: view.version, savedAt: view.savedAt }
  const [restore] = useState(() => decideRestore(view, local))
  const restored = restore === 'load' || restore === 'conflict'
  const [title, setTitle] = useState(restored ? local!.title : view.title)
  const [content, setContent] = useState(restored ? local!.contentMd : view.contentMd)
  const [state, setState] = useState<SaveState>({ kind: 'saved', at: new Date(view.savedAt) })
  const [showConflict, setShowConflict] = useState(restore === 'conflict')
  const [notice, setNotice] = useState<string | null>(restore === 'load' ? '이 기기에 저장되지 않은 변경을 불러왔어요.' : null)
  const [localStored, setLocalStored] = useState(false)
  const [backups, setBackups] = useState<LocalBackup[]>([])
  const [showBackups, setShowBackups] = useState(false)
  const [preview, setPreview] = useState('')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [publishing, setPublishing] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [visibility, setVisibility] = useState<Visibility>(view.visibility)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const saver = useRef<Autosaver | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  if (saver.current == null) {
    saver.current = new Autosaver({ title: view.title, contentMd: view.contentMd }, view.version, {
      send: (c, base, keepalive) => api(`/api/posts/${view.id}/autosave`,
        { method: 'PUT', body: { ...c, baseVersion: base }, keepalive }),
      onState: setState,
      onVersion: () => undefined,
    })
    if (restore === 'conflict') saver.current.markConflict(serverContent)
  }

  // 이 기기에 남기기 (FR-001·FR-002): 입력이 1초 멈추면 서버 요청 없이. 서버 저장이 끝나도 미전송 여부를 갱신한다
  const latest = useRef({ title, content })
  latest.current = { title, content }
  const storeLocal = useCallback(async () => {
    const s = saver.current!
    const ok = await localDrafts.put({
      memberId, postId: view.id, title: latest.current.title, contentMd: latest.current.content,
      baseVersion: s.version, unsynced: s.hasUnsaved || s.isConflict, pendingImages: [], savedAt: Date.now(),
    })
    setLocalStored(ok)
  }, [memberId, view.id])

  useEffect(() => {
    saver.current?.change({ title, contentMd: content })
    setLocalStored(false)
    const t = setTimeout(() => void storeLocal(), LOCAL_IDLE_MS)
    return () => clearTimeout(t)
  }, [title, content, storeLocal])

  useEffect(() => {
    if (state.kind === 'saved') void storeLocal()
  }, [state, storeLocal])

  useEffect(() => {
    if (restore === 'discard') void localDrafts.remove(memberId, view.id)
    void localDrafts.backups(memberId, view.id).then(setBackups)
  }, [restore, memberId, view.id])

  // 탭이 가려지거나 떠날 때 바로 저장, 미저장이면 떠나기 전에 묻는다 (FR-011, FR-015)
  useEffect(() => {
    const s = saver.current!
    const onHide = () => { if (document.visibilityState === 'hidden') void s.flushNow(true) }
    const onPageHide = () => void s.flushNow(true)
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (s.hasUnsaved || s.isConflict) e.preventDefault()
    }
    const onOnline = () => s.retryNow()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('online', onOnline)
    setLeaveGuard(() => !(s.hasUnsaved || s.isConflict) || confirm('저장되지 않은 변경이 있어요. 떠날까요?'))
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('online', onOnline)
      setLeaveGuard(null)
      // 미전송 내용이 없으면 이 글의 기기 데이터를 지운다 (FR-009). 있으면 남겨 다시 열 때 복구한다
      if (!(s.hasUnsaved || s.isConflict)) void localDrafts.remove(memberId, view.id)
      void s.flushNow(true)
      s.stop()
    }
  }, [])

  // 미리보기: 발행과 같은 변환기(서버)로 만든다 (FR-003)
  useEffect(() => {
    const t = setTimeout(() => {
      if (!content.trim()) return setPreview('')
      api<{ html: string }>('/api/markdown/preview', { method: 'POST', body: { contentMd: content } })
        .then((r) => { setPreview(r.html); setPreviewError(null) })
        .catch((e) => setPreviewError(e instanceof ApiError ? e.message : '미리보기를 만들지 못했어요.'))
    }, 500)
    return () => clearTimeout(t)
  }, [content])

  useEffect(() => { void highlightWithin(previewRef.current) }, [preview, tab])

  const current = (): Content => ({ title, contentMd: content })

  const saveNow = useCallback(async (base?: number) => {
    const s = saver.current!
    // 충돌 중 [저장]은 비교 창으로 (FR-011). 비교 창의 [편집 중인 내용으로 저장]만 서버 버전을 넘겨 덮어쓴다
    if (s.isConflict && base === undefined) {
      setShowConflict(true)
      return false
    }
    setState({ kind: 'saving' })
    try {
      const r = await api<{ version: number; savedAt: string }>(`/api/posts/${view.id}`,
        { method: 'PUT', body: { title, contentMd: content, baseVersion: base ?? s.version } })
      s.reset({ title, contentMd: content }, r.version)
      setState({ kind: 'saved', at: new Date(r.savedAt) })
      setShowConflict(false)
      return true
    } catch (e) {
      handleError(e)
      return false
    }
  }, [title, content, view.id])

  const handleError = (e: unknown) => {
    if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') {
      setState({ kind: 'conflict', server: (e.details as { server: import('../lib/types').ServerContent }).server })
      setShowConflict(true)
    } else if (e instanceof ApiError) {
      const map: Record<string, string> = {}
      e.errors.forEach((f) => (map[f.field] = f.message))
      setErrors(map)
      setState({ kind: 'error', message: e.errors.length ? '입력값을 확인해 주세요.' : e.message })
    } else {
      setState({ kind: 'offline' })
    }
  }

  const publish = async () => {
    if (state.kind === 'conflict') return setShowConflict(true)
    setPublishing(true)
    setErrors({})
    const key = crypto.randomUUID()
    const body = { title, contentMd: content, tags: [], visibility, baseVersion: saver.current!.version }
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const r = await api<{ url: string; version: number }>(`/api/posts/${view.id}/publish`,
            { method: 'POST', body, headers: { 'Idempotency-Key': key } })
          saver.current!.reset({ title, contentMd: content }, r.version)
          saver.current!.stop()
          await localDrafts.remove(memberId, view.id)
          setLeaveGuard(null)
          navigate(r.url)
          return
        } catch (e) {
          // 같은 키의 요청이 아직 처리 중이면 1초 뒤 같은 키로 다시 확인한다 (docs/05 §5)
          if (e instanceof ApiError && e.code === 'IN_PROGRESS' && attempt < 10) {
            await new Promise((res) => setTimeout(res, 1000))
            continue
          }
          throw e
        }
      }
    } catch (e) {
      setShowPublish(false)
      handleError(e)
    } finally {
      setPublishing(false)
    }
  }

  const conflictServer = state.kind === 'conflict' ? state.server : null
  return (
    <main className="editor">
      <div className="editor-toolbar">
        <div className="row">
          <button type="button" className="btn btn-text" onClick={() => history.length > 1 ? history.back() : navigate('/manage/posts')}>← 나가기</button>
          <SaveIndicator state={state} localStored={localStored} onCompare={() => setShowConflict(true)} />
        </div>
        <div className="row">
          <div className="tabs-mobile" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'write'} onClick={() => setTab('write')}>쓰기</button>
            <button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}>미리보기</button>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => saveNow()}>저장</button>
          {backups.length > 0 && (
            <button type="button" className="btn btn-text" onClick={() => setShowBackups(true)}>이 기기 백업 {backups.length}</button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => saver.current!.isConflict ? setShowConflict(true) : setShowPublish(true)}>
            {view.status === 'PUBLISHED' ? '다시 발행' : '발행'}
          </button>
        </div>
      </div>
      {state.kind === 'conflict' && (
        <div className="banner banner-warn">
          ⚠ 다른 탭이나 기기에서 이 글이 수정되었어요({clock(state.server.savedAt)}). 지금 내용은 이 기기에만 저장되고 있어요.
          <button type="button" className="btn btn-text" onClick={() => setShowConflict(true)}>비교하기</button>
        </div>
      )}
      {notice && (
        <div className="banner banner-ok" role="status">
          {notice}
          <button type="button" className="btn btn-text" aria-label="닫기" onClick={() => setNotice(null)}>✕</button>
        </div>
      )}
      {view.status === 'PUBLISHED' && (
        <p className="muted small editor-note">발행한 글을 고치는 중이에요. 다시 발행할 때까지 독자에게는 이전 발행본이 보여요.</p>
      )}
      <div className={`editor-panes show-${tab}`}>
        <section className="editor-write">
          <input className="editor-title" placeholder="제목을 입력하세요" value={title} maxLength={100}
                 onChange={(e) => setTitle(e.target.value)} aria-label="제목" aria-invalid={!!errors.title} />
          {errors.title && <small className="error">{errors.title}</small>}
          <textarea className="editor-body" placeholder="Markdown으로 내용을 쓰세요…" value={content}
                    onChange={(e) => setContent(e.target.value)} aria-label="본문" aria-invalid={!!errors.contentMd}
                    spellCheck={false} />
          {errors.contentMd && <small className="error">{errors.contentMd}</small>}
        </section>
        <section className="editor-preview" aria-label="미리보기">
          <h1 className="post-title">{title || <span className="muted">제목 없음</span>}</h1>
          {previewError && <p className="error">{previewError}</p>}
          <div className="post-body markdown" ref={previewRef} dangerouslySetInnerHTML={{ __html: preview }} />
        </section>
      </div>

      {showPublish && (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title">
            <h2 id="publish-title">{view.status === 'PUBLISHED' ? '다시 발행' : '발행'}</h2>
            <fieldset className="field">
              <legend>공개 범위</legend>
              <label><input type="radio" name="visibility" checked={visibility === 'PUBLIC'} onChange={() => setVisibility('PUBLIC')} /> 🌐 전체 공개</label>
              <label><input type="radio" name="visibility" checked={visibility === 'PRIVATE'} onChange={() => setVisibility('PRIVATE')} /> 🔒 비공개 (나만 보기)</label>
            </fieldset>
            {view.status === 'PUBLISHED' && <p className="muted small">주소와 처음 공개한 날짜는 그대로이고 "수정됨"이 표시돼요.</p>}
            <footer className="dialog-footer">
              <button type="button" className="btn btn-text" onClick={() => setShowPublish(false)} disabled={publishing}>취소</button>
              <button type="button" className="btn btn-primary" onClick={publish} disabled={publishing}>
                {publishing ? '발행 중…' : '발행하기'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {showBackups && (
        <div className="dialog-backdrop" role="presentation">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="backups-title">
            <h2 id="backups-title">이 기기 백업</h2>
            <p className="muted small">[저장된 내용 불러오기]를 고를 때 편집 중이던 내용이에요. 7일 동안 이 브라우저에만 남아요.</p>
            <ul className="backup-list">
              {backups.map((b) => (
                <li key={b.at}>
                  <div>
                    <b>{b.title || '제목 없음'}</b> <span className="muted small">{new Date(b.at).toLocaleString('ko-KR')}</span>
                    <p className="small muted backup-excerpt">{b.contentMd.slice(0, 120)}</p>
                  </div>
                  <div className="row">
                    <button type="button" className="btn btn-outline" onClick={async () => {
                      // 지금 내용도 백업해 두고 바꾼다: 어느 쪽도 모르게 사라지지 않게 (FR-013)
                      const mine = { memberId, postId: view.id, ...current(), at: Date.now() }
                      if (mine.title !== b.title || mine.contentMd !== b.contentMd) await localDrafts.addBackup(mine)
                      setTitle(b.title)
                      setContent(b.contentMd)
                      setBackups(await localDrafts.backups(memberId, view.id))
                      setShowBackups(false)
                      setNotice('백업한 내용을 불러왔어요. 바로 전 내용도 백업해 두었어요.')
                    }}>불러오기</button>
                    <button type="button" className="btn btn-text" onClick={async () => {
                      await localDrafts.removeBackup(b)
                      setBackups((list) => list.filter((x) => x !== b))
                    }}>지우기</button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="dialog-footer">
              <button type="button" className="btn btn-text" onClick={() => setShowBackups(false)}>닫기</button>
            </footer>
          </div>
        </div>
      )}

      {showConflict && conflictServer && (
        <ConflictDialog server={conflictServer} mine={current()}
          onClose={() => setShowConflict(false)}
          onOverwrite={() => void saveNow(conflictServer.version)}
          onLoadServer={async () => {
            // 편집 중이던 내용은 이 기기에 7일 백업한다 (FR-012). 백업을 못 하면 불러오기 전에 알린다
            const backup = { memberId, postId: view.id, ...current(), at: Date.now() }
            if (!(await localDrafts.addBackup(backup))) {
              if (!confirm('이 브라우저에는 백업을 남길 수 없어요. 편집 중인 내용을 버리고 저장된 내용을 불러올까요?')) return
            } else {
              setBackups((b) => [backup, ...b])
              setNotice('편집 중인 내용은 이 기기에 7일 동안 백업돼요.')
            }
            setTitle(conflictServer.title)
            setContent(conflictServer.contentMd)
            saver.current!.reset({ title: conflictServer.title, contentMd: conflictServer.contentMd }, conflictServer.version)
            setState({ kind: 'saved', at: new Date(conflictServer.savedAt) })
            setShowConflict(false)
          }}
          onSaveAsNew={async () => {
            const created = await api<{ id: number }>('/api/posts', { method: 'POST', body: current() })
            saver.current!.reset({ title: conflictServer.title, contentMd: conflictServer.contentMd }, conflictServer.version)
            setLeaveGuard(null)
            navigate(`/write/${created.id}`)
          }} />
      )}
    </main>
  )
}

function SaveIndicator({ state, localStored, onCompare }: { state: SaveState; localStored: boolean; onCompare: () => void }) {
  switch (state.kind) {
    case 'saved':
      return <span className="save-state ok" role="status">✓ 저장됨{state.at ? ` ${clock(state.at)}` : ''}</span>
    case 'dirty':
      return <span className="save-state" role="status">{localStored ? '● 이 기기에 저장됨 (동기화 대기)' : '● 저장 대기'}</span>
    case 'saving':
      return <span className="save-state" role="status">저장 중…</span>
    case 'offline':
      return <span className="save-state warn" role="status">⚠ 오프라인 — 이 기기에 저장 중, 연결되면 자동 동기화</span>
    case 'conflict':
      return <button type="button" className="save-state warn btn-text" onClick={onCompare}>⚠ 다른 곳에서 수정됨 — 이 기기에만 저장 중 [비교하기]</button>
    case 'error':
      return <span className="save-state warn" role="status">⚠ {state.message}</span>
  }
}
