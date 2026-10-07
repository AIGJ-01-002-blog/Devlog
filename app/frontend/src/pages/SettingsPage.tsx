import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Avatar } from '../components/Avatar'
import { ImageCropper } from '../components/ImageCropper'
import { PasswordRules } from '../components/PasswordRules'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fieldErrors } from '../lib/fieldErrors'
import { friendsApi, lastActiveLabel } from '../lib/friends'
import { clock, fullDate, monthDay } from '../lib/format'
import { checkSourceFile, decodeFile, renderSquare, uploadProfileImage, type Crop } from '../lib/image'
import { passwordOk } from '../lib/password'
import { Link } from '../lib/router'
import type { FriendOverview, FriendPerson, Visibility } from '../lib/types'

interface Settings {
  handle: string
  nickname: string
  nicknameNextChangeableAt: string | null
  bio: string | null
  profileImageUrl: string | null
  email: string | null
  emailVerified: boolean
  provider: string
  hasPassword: boolean
  previousLogin: { at: string | null; provider: string }
  defaultVisibility: Visibility
  lastActiveVisible: boolean
  aiAgreed: boolean
}

interface Profile { nickname: string; nicknameNextChangeableAt: string | null; bio: string | null; profileImageUrl: string | null }

const PROVIDER_NAMES: Record<string, string> = { GITHUB: 'GitHub', GOOGLE: 'Google', LOCAL: '이메일' }
const BIO_MAX = 200
const BIO_LINES = 4

/** 서버(BioPolicy)와 같은 정리: 앞뒤·줄 끝 공백 제거, 연속 빈 줄은 하나로. 글자 수·줄 수는 정리한 뒤 센다. */
export const normalizeBio = (s: string) => s.replace(/\r\n?/g, '\n').normalize('NFC').trim().replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')

/** 소개 글자 수: 서버와 같이 코드 포인트로 센다(이모지 하나 = 1자). */
const bioLength = (s: string) => Array.from(s).length

/** 설정 (005): 프로필(사진·닉네임·소개를 한 번에 저장)과 계정(읽기 전용 정보·직전 로그인·기본 공개 범위·AI 동의·약관). */
export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api<Settings>('/api/me/settings').then(setSettings).catch(() => setError(true))
  }, [])

  if (error) return <main className="container narrow"><p className="error center">설정을 불러오지 못했어요. 새로고침해 주세요.</p></main>
  if (!settings) return <main className="container narrow"><p className="muted center">불러오는 중…</p></main>

  return (
    <main className="container narrow">
      <h1 className="page-title">설정</h1>
      <ProfileSection settings={settings} onSaved={(p) => setSettings({ ...settings, ...p })} />
      <FriendsSection />
      <AccountSection settings={settings} onChange={setSettings} />
      {settings.hasPassword && <PasswordSection />}
    </main>
  )
}

type PendingImage = { kind: 'keep' } | { kind: 'default' } | { kind: 'new'; id: number; previewUrl: string }

function ProfileSection({ settings, onSaved }: { settings: Settings; onSaved: (p: Profile) => void }) {
  const { me, refresh } = useAuth()
  const [nickname, setNickname] = useState(settings.nickname)
  const [bio, setBio] = useState(settings.bio ?? '')
  const [image, setImage] = useState<PendingImage>({ kind: 'keep' })
  const [source, setSource] = useState<ImageBitmap | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const nicknameLocked = settings.nicknameNextChangeableAt != null
  const cleanBio = normalizeBio(bio)
  const bioCount = bioLength(cleanBio)
  const bioLineCount = cleanBio ? cleanBio.split('\n').length : 0
  const shownImage = image.kind === 'new' ? image.previewUrl : image.kind === 'default' ? null : settings.profileImageUrl
  const dirty = nickname !== settings.nickname || bio !== (settings.bio ?? '') || image.kind !== 'keep'

  useEffect(() => () => { if (image.kind === 'new') URL.revokeObjectURL(image.previewUrl) }, [image])

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = checkSourceFile(file)
    if (problem) return setErrors({ profileImageId: problem })
    try {
      setErrors({})
      setSource(await decodeFile(file))
    } catch {
      setErrors({ profileImageId: '사진을 열 수 없어요. 다른 사진을 골라 주세요.' })
    }
  }

  const apply = async (crop: Crop) => {
    if (!source) return
    setUploading(true)
    try {
      const blob = await renderSquare(source, crop)
      const up = await uploadProfileImage(blob)
      setImage({ kind: 'new', id: up.id, previewUrl: URL.createObjectURL(blob) })
      setSource(null)
      setSaved(false)
    } catch (err) {
      setErrors({ profileImageId: err instanceof ApiError ? err.message : '사진을 올리지 못했어요. 다시 시도해 주세요.' })
    } finally {
      setUploading(false)
    }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    setSaved(false)
    const body: Record<string, unknown> = {}
    if (nickname !== settings.nickname) body.nickname = nickname
    if (bio !== (settings.bio ?? '')) body.bio = bio
    if (image.kind === 'new') body.profileImageId = image.id
    if (image.kind === 'default') body.profileImageId = null
    try {
      const p = await api<Profile>('/api/me/profile', { method: 'PATCH', body })
      onSaved(p)
      setNickname(p.nickname)
      setBio(p.bio ?? '')
      setImage({ kind: 'keep' })
      setSaved(true)
      await refresh()
    } catch (err) {
      const map = fieldErrors(err)
      const next = err instanceof ApiError ? (err.details as { nextChangeableAt?: string } | null)?.nextChangeableAt : undefined
      if (next && map.nickname) map.nickname = `${map.nickname} 다음 변경 가능일: ${monthDay(next)}`
      setErrors(map)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="settings-section">
      <h2>프로필</h2>
      <form className="form" onSubmit={save}>
        <div className="profile-photo">
          <Avatar src={shownImage} name={nickname || settings.nickname} seed={settings.handle} size={96} />
          <div className="profile-photo-actions">
            {me?.emailVerified === false
              ? <p className="small muted">이메일 인증을 마치면 사진을 올릴 수 있어요.</p>
              : <button type="button" className="btn btn-outline" onClick={() => fileInput.current?.click()} disabled={uploading}>이미지 변경</button>}
            {shownImage && <button type="button" className="btn btn-text" onClick={() => { setImage({ kind: 'default' }); setSaved(false) }}>기본 이미지로</button>}
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={pick} />
          </div>
        </div>
        {source && <ImageCropper image={source} busy={uploading} onApply={apply} onCancel={() => setSource(null)} />}
        {errors.profileImageId && <p className="error small" role="alert">{errors.profileImageId}</p>}
        {image.kind === 'new' && <p className="small muted">[저장]을 눌러야 프로필 사진이 바뀌어요.</p>}

        <label className="field">
          <span>닉네임</span>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={10} disabled={nicknameLocked} aria-describedby="nickname-help" />
          <small id="nickname-help" className={errors.nickname ? 'error' : 'muted'}>
            {errors.nickname ?? (nicknameLocked
              ? `다음 변경 가능일: ${monthDay(settings.nicknameNextChangeableAt!)}`
              : '한 번 바꾸면 30일 동안 다시 바꿀 수 없어요.')}
          </small>
        </label>

        <label className="field">
          <span>소개</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} aria-describedby="bio-help" />
          <small id="bio-help" className={errors.bio || bioCount > BIO_MAX || bioLineCount > BIO_LINES ? 'error' : 'muted'}>
            {errors.bio ?? (bioLineCount > BIO_LINES ? '소개는 4줄까지 쓸 수 있어요.' : `${bioCount} / ${BIO_MAX}`)}
          </small>
        </label>

        <div className="field">
          <span>블로그 주소</span>
          <p className="readonly">@{settings.handle} <span className="muted small">변경할 수 없어요</span></p>
        </div>

        {errors.form && <p className="error" role="alert">{errors.form}</p>}
        {saved && <p className="ok" role="status">저장했어요.</p>}
        <div>
          <button className="btn btn-primary" disabled={saving || uploading || !dirty || bioCount > BIO_MAX || bioLineCount > BIO_LINES}>
            {saving ? '저장하는 중…' : '저장'}
          </button>
        </div>
      </form>
    </section>
  )
}

function AccountSection({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const { refresh } = useAuth()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const prev = settings.previousLogin

  const changeVisibility = async (v: Visibility) => {
    if (v === settings.defaultVisibility) return
    const before = settings
    onChange({ ...settings, defaultVisibility: v }) // 바로 바꿔 보이고, 실패하면 되돌린다
    try {
      await api('/api/me/settings', { method: 'PATCH', body: { defaultVisibility: v } })
      setMessage({ ok: true, text: v === 'PRIVATE' ? '이제 새 글은 나만 보기로 시작해요.' : '이제 새 글은 전체 공개로 시작해요.' })
      await refresh()
    } catch {
      onChange(before)
      setMessage({ ok: false, text: '바꾸지 못했어요. 다시 시도해 주세요.' })
    }
  }

  const changeLastActive = async (visible: boolean) => {
    const before = settings
    onChange({ ...settings, lastActiveVisible: visible })
    try {
      await api('/api/me/settings', { method: 'PATCH', body: { lastActiveVisible: visible } })
      setMessage({ ok: true, text: visible ? '친구에게 최근 활동을 보여요.' : '이제 친구에게 최근 활동이 보이지 않고, 나도 친구들의 최근 활동을 볼 수 없어요.' })
    } catch {
      onChange(before)
      setMessage({ ok: false, text: '바꾸지 못했어요. 다시 시도해 주세요.' })
    }
  }

  const withdrawAi = async () => {
    if (!window.confirm('AI 기능 동의를 철회할까요? 다음에 AI 기능을 쓰려면 다시 동의해야 해요.')) return
    try {
      await api('/api/me/agreements/ai', { method: 'DELETE' })
      onChange({ ...settings, aiAgreed: false })
      setMessage({ ok: true, text: 'AI 기능 동의를 철회했어요.' })
    } catch {
      setMessage({ ok: false, text: '철회하지 못했어요. 다시 시도해 주세요.' })
    }
  }

  return (
    <section className="settings-section">
      <h2>계정</h2>
      <dl className="settings-list">
        <dt>이메일</dt>
        <dd>{settings.email ?? '없음'} <span className="muted small">변경할 수 없어요</span></dd>
        <dt>로그인 수단</dt>
        <dd>{PROVIDER_NAMES[settings.provider] ?? settings.provider}</dd>
        <dt>직전 로그인</dt>
        <dd>{prev.at ? `${fullDate(prev.at)} ${clock(prev.at)}, ${PROVIDER_NAMES[prev.provider] ?? prev.provider}` : '첫 로그인'}</dd>
        <dt id="default-visibility">새 글 기본 공개 범위</dt>
        <dd role="radiogroup" aria-labelledby="default-visibility" className="row">
          <label><input type="radio" name="defaultVisibility" checked={settings.defaultVisibility === 'PUBLIC'} onChange={() => changeVisibility('PUBLIC')} /> 전체 공개</label>
          <label><input type="radio" name="defaultVisibility" checked={settings.defaultVisibility === 'PRIVATE'} onChange={() => changeVisibility('PRIVATE')} /> 나만 보기</label>
        </dd>
        <dt>최근 활동</dt>
        <dd>
          <label><input type="checkbox" checked={settings.lastActiveVisible} onChange={(e) => changeLastActive(e.target.checked)} /> 최근 활동을 친구에게 보이기</label>
          <span className="muted small"> 끄면 나도 친구들의 최근 활동을 볼 수 없어요.</span>
        </dd>
        {settings.aiAgreed && (
          <>
            <dt>AI 기능 동의</dt>
            <dd><button type="button" className="btn btn-text" onClick={withdrawAi}>동의 철회</button></dd>
          </>
        )}
        <dt>약관</dt>
        <dd><a href="/terms" target="_blank" rel="noopener">이용약관</a> · <a href="/privacy" target="_blank" rel="noopener">개인정보 처리방침</a></dd>
      </dl>
      {message && <p className={message.ok ? 'ok' : 'error'} role="status">{message.text}</p>}
    </section>
  )
}

/** 비밀번호 변경 (004 US5): 이메일 가입자만. 바꾸면 다른 기기는 로그아웃되고 알림 메일이 간다. */
function PasswordSection() {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    setDone(false)
    try {
      await api('/api/me/password', { method: 'PUT', body: { currentPassword: current, password, passwordConfirm: confirm } })
      setDone(true)
      setCurrent('')
      setPassword('')
      setConfirm('')
    } catch (err) {
      setErrors(fieldErrors(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="settings-section">
      <h2>비밀번호</h2>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>현재 비밀번호</span>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
          {errors.currentPassword && <small className="error">{errors.currentPassword}</small>}
        </label>
        <label className="field">
          <span>새 비밀번호</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={64} required />
          <PasswordRules password={password} />
          {errors.password && <small className="error">{errors.password}</small>}
        </label>
        <label className="field">
          <span>새 비밀번호 확인</span>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" maxLength={64} required />
          {(errors.passwordConfirm || (confirm && confirm !== password)) && <small className="error">{errors.passwordConfirm ?? '비밀번호가 서로 달라요.'}</small>}
        </label>
        {errors.form && <p className="error" role="alert">{errors.form}</p>}
        {done && <p className="ok" role="status">비밀번호를 바꿨어요. 다른 기기에서는 로그아웃됐어요.</p>}
        <div><button className="btn btn-primary" disabled={submitting || !current || !passwordOk(password) || password !== confirm}>비밀번호 변경</button></div>
      </form>
    </section>
  )
}

/** 친구 (008 US1·US2): 받은 요청 수락·거절, 친구 목록과 최근 활동, 보낸 요청 취소. 처리해도 상대에게 알리지 않는다. */
function FriendsSection() {
  const [data, setData] = useState<FriendOverview | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { friendsApi.overview().then(setData).catch(() => setMessage({ ok: false, text: '친구 목록을 불러오지 못했어요.' })) }, [])

  const act = async (handle: string, fn: () => Promise<unknown>, text: string) => {
    setBusy(handle)
    try {
      await fn()
      setData(await friendsApi.overview())
      setMessage({ ok: true, text })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : '처리하지 못했어요. 다시 시도해 주세요.' })
    } finally {
      setBusy(null)
    }
  }

  if (!data) return message ? <section className="settings-section"><h2>친구</h2><p className="error">{message.text}</p></section> : null
  const row = (p: FriendPerson, actions: ReactNode, extra?: string | null) => (
    <li key={p.handle} className="friend-row">
      <Link to={`/@${p.handle}`} className="friend-who">
        <Avatar src={p.profileImageUrl} name={p.nickname} seed={p.handle} size={32} />
        <span><b>{p.nickname}</b> <span className="muted small">@{p.handle}</span></span>
      </Link>
      {extra && <span className="muted small">{extra}</span>}
      <span className="friend-row-actions">{actions}</span>
    </li>
  )
  return (
    <section className="settings-section">
      <h2>친구</h2>
      {data.received.length > 0 && (
        <>
          <h3>받은 친구 요청 {data.received.length}</h3>
          <ul className="friend-list">
            {data.received.map((p) => row(p, <>
              <button type="button" className="btn btn-primary" disabled={busy === p.handle}
                      onClick={() => act(p.handle, () => friendsApi.accept(p.handle), `${p.nickname}님과 친구가 됐어요.`)}>수락</button>
              <button type="button" className="btn btn-text" disabled={busy === p.handle}
                      onClick={() => act(p.handle, () => friendsApi.remove(p.handle), '요청을 거절했어요.')}>거절</button>
            </>))}
          </ul>
        </>
      )}
      <h3>친구 {data.friends.length}</h3>
      {data.friends.length === 0
        ? <p className="muted small">아직 친구가 없어요. 다른 사람의 블로그에서 [친구 요청]을 보내 보세요.</p>
        : (
          <ul className="friend-list">
            {data.friends.map((p) => row(p,
              <button type="button" className="btn btn-text" disabled={busy === p.handle} onClick={() => {
                if (confirm(`${p.nickname}님과 친구를 끊을까요? 상대에게 알림은 가지 않아요.`)) {
                  void act(p.handle, () => friendsApi.remove(p.handle), '친구를 끊었어요.')
                }
              }}>친구 끊기</button>,
              lastActiveLabel(p.lastActiveDaysAgo) && `최근 활동 ${lastActiveLabel(p.lastActiveDaysAgo)}`))}
          </ul>
        )}
      {data.sent.length > 0 && (
        <>
          <h3>보낸 요청 {data.sent.length}</h3>
          <ul className="friend-list">
            {data.sent.map((p) => row(p,
              <button type="button" className="btn btn-text" disabled={busy === p.handle}
                      onClick={() => act(p.handle, () => friendsApi.remove(p.handle), '요청을 취소했어요.')}>요청 취소</button>))}
          </ul>
        </>
      )}
      {message && <p className={message.ok ? 'ok' : 'error'} role="status">{message.text}</p>}
    </section>
  )
}
