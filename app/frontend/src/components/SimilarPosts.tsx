import { useEffect, useState } from 'react'
import { topicApi } from '../lib/branch'
import type { Card } from '../lib/types'
import { BranchList } from './BranchList'
import { t } from '../lib/i18n'

/** 내용이 비슷한 다른 글 (072 2단계). 2편이 안 되면 보이지 않는다. 곁들이 정보라 실패해도 조용히 숨긴다 */
export function SimilarPosts({ postId }: { postId: number }) {
  const [items, setItems] = useState<Card[]>([])
  useEffect(() => {
    let alive = true
    topicApi.similar(postId).then((c) => { if (alive) setItems(c) }, () => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [postId])
  if (items.length < 2) return null
  return (
    <section className="similar-posts" aria-labelledby="similar-title">
      <h2 id="similar-title" className="aside-title">{t('내용이 비슷한 다른 글')}</h2>
      <BranchList items={items} hasMore={false} graph={false} />
    </section>
  )
}
