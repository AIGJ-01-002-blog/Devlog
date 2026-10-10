import { useEffect, useState } from 'react'
import { ApiError } from '../lib/api'
import { Link } from '../lib/router'
import { parseTech, portfolioApi, PROJECT_LIMITS, type ProjectFields } from '../lib/portfolio'
import { t, tNodes } from '../lib/i18n'

/**
 * 시리즈 주인의 [포트폴리오 프로젝트] (072 3단계). 켜면 이 시리즈가 포트폴리오에 프로젝트로 보이고,
 * 기간·한 줄 설명·기술·"우리 팀이 한 일"·"제 역할"을 적는다. 내가 맡지 않은 일은 "우리 팀이 한 일"에 적는다.
 */
export function ProjectEditor({ seriesId, handle }: { seriesId: number; handle: string }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ProjectFields | null>(null)
  const [tech, setTech] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!open || form) return
    portfolioApi.project(seriesId).then((f) => { setForm(f); setTech(f.tech.join(', ')) },
      () => setMessage({ ok: false, text: t('프로젝트 정보를 불러오지 못했어요.') }))
  }, [open, form, seriesId])

  const save = async () => {
    if (!form) return
    setBusy(true)
    setMessage(null)
    try {
      const saved = await portfolioApi.save(seriesId, { ...form, tech: parseTech(tech) })
      setForm(saved)
      setTech(saved.tech.join(', '))
      setMessage({ ok: true, text: saved.portfolio ? t('저장했어요. 포트폴리오에 프로젝트로 보여요.') : t('저장했어요. 포트폴리오에는 보이지 않아요.') })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : t('저장하지 못했어요. 다시 시도해 주세요.') })
    } finally {
      setBusy(false)
    }
  }

  const set = (k: keyof ProjectFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => f && { ...f, [k]: e.target.value })

  return (
    <details className="project-editor" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>{t('포트폴리오 프로젝트')}</summary>
      {!form ? <p className="muted small">{message?.text ?? t('불러오는 중…')}</p> : (
        <form onSubmit={(e) => { e.preventDefault(); void save() }}>
          <label className="check">
            <input type="checkbox" checked={form.portfolio} onChange={(e) => setForm({ ...form, portfolio: e.target.checked })} />
            {' '}{t('포트폴리오에 프로젝트로 보이기')}
          </label>
          <label className="field"><span>{t('기간')}</span>
            <input value={form.period ?? ''} maxLength={PROJECT_LIMITS.period} placeholder="2026.03 ~ 2026.10" onChange={set('period')} /></label>
          <label className="field"><span>{t('한 줄 설명')}</span>
            <input value={form.summary ?? ''} maxLength={PROJECT_LIMITS.summary} placeholder={t('무엇을 왜 만들었는지 한 줄로')} onChange={set('summary')} /></label>
          <label className="field"><span>{tNodes('쓴 기술 (쉼표로 나눠요, {0}개까지)', { 0: PROJECT_LIMITS.tech })}</span>
            <input value={tech} placeholder="Spring Boot, React, PostgreSQL" onChange={(e) => setTech(e.target.value)} /></label>
          <label className="field"><span>{t('우리 팀이 한 일')}</span>
            <textarea rows={3} value={form.teamWork ?? ''} maxLength={PROJECT_LIMITS.text} onChange={set('teamWork')} /></label>
          <label className="field"><span>{t('제 역할 (내가 맡은 부분만)')}</span>
            <textarea rows={3} value={form.myRole ?? ''} maxLength={PROJECT_LIMITS.text} onChange={set('myRole')} /></label>
          <div className="row">
            <button className="btn btn-primary" disabled={busy}>{busy ? t('저장 중…') : t('저장')}</button>
            <Link to={`/@${handle}/portfolio`} className="btn btn-text" data-tip={t('내 포트폴리오 화면을 열어요')}>{t('포트폴리오 보기')}</Link>
          </div>
          {message && <p className={message.ok ? 'muted small' : 'error small'} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}
        </form>
      )}
    </details>
  )
}
