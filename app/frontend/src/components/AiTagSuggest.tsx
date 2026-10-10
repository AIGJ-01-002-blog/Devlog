import { useEffect, useId, useState } from 'react'
import { ApiError } from '../lib/api'
import { aiErrorText, aiTagsApi, visibleSuggestions, type AiProvider, type AiStatus } from '../lib/aiTags'
import { MAX_TAGS } from '../lib/tags'
import { t, tNodes } from '../lib/i18n'

/**
 * 발행 설정 창의 [AI 태그 추천] (spec 018). 처음에는 외부 전송 동의를 받고, 제안은 눌러야만 태그에 들어간다.
 * 기능이 꺼져 있거나 상태를 모르면 아무것도 그리지 않는다. 실패해도 발행과는 관계없다.
 */
export function AiTagSuggest({ postId, title, content, tags, onAdd }: {
  postId: number
  title: string
  content: string
  tags: string[]
  onAdd: (tag: string) => void
}) {
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [asking, setAsking] = useState(false)
  const [loading, setLoading] = useState<AiProvider | 'unknown' | null>(null)
  const [result, setResult] = useState<{ tags: string[]; cached: boolean } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const consentId = useId()

  useEffect(() => {
    let alive = true
    aiTagsApi.status().then((s) => { if (alive) setStatus(s) }).catch(() => {})
    return () => { alive = false }
  }, [])

  if (!status?.enabled) return null

  const run = async (again: boolean) => {
    setMessage(null)
    setLoading(status.provider ?? 'unknown')
    try {
      const r = await aiTagsApi.suggest(postId, { title, content, tags, again })
      setResult({ tags: r.tags, cached: r.cached })
      setStatus((s) => s && { ...s, remaining: r.remaining })
      if (r.tags.length === 0) setMessage(t('추천할 태그를 찾지 못했어요.'))
    } catch (e) {
      if (e instanceof ApiError && e.code === 'AI_CONSENT_REQUIRED') {
        setStatus((s) => s && { ...s, agreed: false })
        setAsking(true)
      } else {
        setMessage(aiErrorText(e))
      }
    } finally {
      setLoading(null)
      // 공급자 전환(한도·쉼)을 다음 안내에 반영한다
      aiTagsApi.status().then(setStatus).catch(() => {})
    }
  }

  const start = () => {
    if (!status.agreed) return setAsking(true)
    void run(false)
  }

  const agree = async () => {
    try {
      await aiTagsApi.agree()
      setStatus((s) => s && { ...s, agreed: true })
      setAsking(false)
      void run(false)
    } catch (e) {
      setMessage(aiErrorText(e))
    }
  }

  const shown = result ? visibleSuggestions(result.tags, tags, MAX_TAGS) : []

  return (
    <div className="ai-tags">
      <div className="ai-tags-bar">
        <button type="button" className="btn btn-outline btn-small" onClick={start} disabled={loading !== null || asking}>
          
          {t('AI 태그 추천')}
        </button>
        <small className="muted">{tNodes('오늘 {0}회 남음', { 0: status.remaining })}</small>
      </div>

      {asking && (
        <section className="ai-consent" role="group" aria-labelledby={consentId}>
          <h3 id={consentId}>{t('AI 태그 추천을 쓰기 전에 확인해 주세요')}</h3>
          <ul>
            <li>{t('글 제목과 본문 앞부분, 지금 붙인 태그가 Google Gemini(무료 등급)로 전송돼요.')}</li>
            <li>{t('Google이 이 내용을 서비스 개선에 쓰고, 사람이 검토할 수 있어요.')}</li>
            <li>{t('Gemini를 쓸 수 없을 때는 우리 서버의 AI로 처리하고, 이때는 외부로 전송되지 않아요.')}</li>
            <li>{t('개인정보·비밀번호·회사 기밀이 든 글에는 쓰지 마세요.')}</li>
          </ul>
          <p className="muted small">{t('동의는 설정에서 언제든 철회할 수 있어요.')}</p>
          <div className="ai-consent-actions">
            <button type="button" className="btn btn-primary btn-small" onClick={agree}>{t('동의하고 추천받기')}</button>
            <button type="button" className="btn btn-text btn-small" onClick={() => setAsking(false)}>{t('취소')}</button>
          </div>
        </section>
      )}

      {loading === 'LOCAL' && <p className="muted small" role="status">{t('자체 AI로 추천 중이라 조금 걸려요…')}</p>}
      {loading !== null && loading !== 'LOCAL' && <p className="muted small" role="status">{t('추천 중…')}</p>}

      {result && shown.length > 0 && (
        <div className="ai-tags-result">
          <span className="muted small">{t('추천:')}</span>
          {shown.map((tag) => (
            <button key={tag} type="button" className="tag-chip ai-tag" onClick={() => onAdd(tag)} aria-label={t('태그 {0} 추가', { 0: tag })}>
              + {tag}
            </button>
          ))}
        </div>
      )}
      {result && result.tags.length > 0 && (
        <p className="muted small">
          
          {t('본문 앞부분을 보고 추천했어요 · AI 제안이에요')}{result.cached ? t(' · 저장된 결과') : ''}
          {' '}
          <button type="button" className="btn btn-text btn-small" onClick={() => run(true)} disabled={loading !== null}>{t('다시 추천')}</button>
        </p>
      )}
      {message && <p className="small" role="alert">{message}</p>}
    </div>
  )
}
