import { useId, useState } from 'react'
import { loginPath, useAuth } from '../lib/auth'
import { DETAIL_MAX, REASONS, reportApi, reportErrorText, type ReportReason, type ReportTarget } from '../lib/moderation'
import { navigate } from '../lib/router'
import { Modal } from './Modal'
import { t } from '../lib/i18n'

/**
 * [신고] (spec 019 US1). 비회원·인증 전 회원에게도 보이고 누르면 로그인·인증 안내로 보낸다(H6). 작성자 본인에게는 그리지 않는다.
 * 같은 대상을 다시 신고해도 같은 안내다(서버가 한 건으로 남긴다).
 */
export function ReportButton({ targetType, targetId, label = t('신고') }: { targetType: ReportTarget; targetId: number; label?: string }) {
  const { me, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const titleId = useId()

  const start = () => {
    if (loading) return // 로그인 상태를 읽는 중에 누르면 로그인 화면으로 잘못 보내지 않는다
    if (!me?.authenticated) return navigate(loginPath())
    if (!me.emailVerified) return setNotice(t('이메일 인증 후 신고할 수 있어요.'))
    setReason(null)
    setDetail('')
    setError(null)
    setDone(false)
    setOpen(true)
  }

  const submit = async () => {
    if (!reason) return setError(t('신고 사유를 골라 주세요.'))
    if (reason === 'OTHER' && !detail.trim()) return setError(t('기타 사유를 적어 주세요.'))
    setBusy(true)
    setError(null)
    try {
      await reportApi.report(targetType, targetId, reason, reason === 'OTHER' ? detail.trim() : null)
      setDone(true)
    } catch (e) {
      setError(reportErrorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className="btn btn-text report-button" data-tip={t('규칙에 어긋나는 내용을 운영진에게 알려요')} onClick={start}>{label}</button>
      {notice && <span className="like-notice" role="status">{notice}</span>}
      {open && (
        <Modal labelledBy={titleId} onClose={() => setOpen(false)} closeOnBackdrop>
          <h2 id={titleId}>{targetType === 'POST' ? t('글 신고') : t('댓글 신고')}</h2>
          {done ? (
            <>
              <p role="status">{t('신고가 접수됐어요. 검토 후 처리할게요.')}</p>
              <footer className="dialog-footer">
                <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>{t('닫기')}</button>
              </footer>
            </>
          ) : (
            <>
              <fieldset className="field report-reasons">
                <legend>{t('신고 사유')}</legend>
                {REASONS.map((r) => (
                  <label key={r.code}>
                    <input type="radio" name={`reason-${titleId}`} value={r.code} checked={reason === r.code}
                           onChange={() => { setReason(r.code); setError(null) }} /> {r.label}
                  </label>
                ))}
              </fieldset>
              {reason === 'OTHER' && (
                <label className="field">
                  <span>{t('설명 ({0}/{1})', { 0: [...detail].length, 1: DETAIL_MAX })}</span>
                  <textarea value={detail} maxLength={DETAIL_MAX} rows={3} onChange={(e) => setDetail(e.target.value)}
                            placeholder={t('어떤 문제인지 적어 주세요')} />
                </label>
              )}
              <p className="muted small">{t('신고한 사람은 작성자에게 알려지지 않아요.')}</p>
              {error && <p className="error small" role="alert">{error}</p>}
              <footer className="dialog-footer">
                <button type="button" className="btn btn-text" onClick={() => setOpen(false)} disabled={busy}>{t('취소')}</button>
                <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? t('보내는 중…') : t('신고하기')}</button>
              </footer>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
