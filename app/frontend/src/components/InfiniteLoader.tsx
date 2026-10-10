import { useEffect, useRef } from 'react'
import { t } from '../lib/i18n'

/** 목록 끝이 화면 아래 이만큼 안으로 들어오면 미리 다음 쪽을 부른다 */
export const PREFETCH_MARGIN_PX = 600

/**
 * 무한 스크롤 (spec 069): 목록 끝의 표시가 화면 가까이 오면 다음 쪽을 부른다.
 * - 한 번 실패하면 저절로 다시 부르지 않고 [다시 시도]를 보인다. 목록이 말없이 멈추지 않게.
 * - 한 쪽을 다 받고도 끝이 여전히 보이면(큰 화면) 감시를 새로 걸어 이어서 부른다.
 * - IntersectionObserver가 없는 브라우저는 예전처럼 [더 보기] 버튼을 쓴다.
 */
export function InfiniteLoader({ hasMore, loading, failed, onMore, failedText = t('목록을 불러오지 못했어요') }: {
  hasMore: boolean
  loading: boolean
  failed: boolean
  /** 다음 쪽 부르기. 실패 뒤 [다시 시도]도 이걸 부른다 */
  onMore: () => void
  failedText?: string
}) {
  const sentinel = useRef<HTMLDivElement>(null)
  const more = useRef(onMore)
  more.current = onMore
  const observable = typeof IntersectionObserver !== 'undefined'

  useEffect(() => {
    const el = sentinel.current
    if (!observable || !el || !hasMore || loading || failed) return
    // 새 감시는 처음 걸 때 지금 보이는지 한 번 알려 준다: 다 받은 뒤에도 끝이 보이면 곧바로 이어서 부른다
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      observer.disconnect()
      more.current()
    }, { rootMargin: `0px 0px ${PREFETCH_MARGIN_PX}px 0px` })
    observer.observe(el)
    return () => observer.disconnect()
  }, [observable, hasMore, loading, failed])

  if (failed) {
    return (
      <p className="error center load-more-error" role="alert">
        {failedText}{' '}
        <button type="button" className="btn btn-text" title={t('이어서 다시 불러와요')} onClick={() => more.current()}>{t('다시 시도')}</button>
      </p>
    )
  }
  if (!hasMore) return null
  return (
    <div ref={sentinel} className="more" data-testid="infinite-sentinel">
      {loading
        ? <p className="muted" role="status">{t('불러오는 중…')}</p>
        : !observable && <button type="button" className="btn btn-outline" title={t('다음 글을 불러와요')} onClick={() => more.current()}>{t('더 보기')}</button>}
    </div>
  )
}
