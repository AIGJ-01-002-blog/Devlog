import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Comments } from '../components/Comments'
import { api, ApiError, takeInitialData } from '../lib/api'
import { clock, compactNumber, fullDate, monthDay, relativeDate } from '../lib/format'
import { enhanceGifs } from '../lib/gifPlayer'
import { highlightWithin } from '../lib/highlight'
import { useAuth } from '../lib/auth'
import { setFlash } from '../lib/flash'
import { Link, navigate } from '../lib/router'
import type { CommentPage } from '../lib/comments'
import { tagPath } from '../lib/tags'
import { TRASH_CONFIRM, trashedMessage, trashPost } from '../lib/trash'
import type { PostDetail, Visibility } from '../lib/types'
import { NotFoundPage } from './NotFoundPage'

export function PostPage({ handle, id }: { handle: string; id: string }) {
  const [boot] = useState(() => {
    const data = takeInitialData<{ post: PostDetail; comments?: CommentPage }>('post')
    return data && String(data.post.id) === id ? data : null
  })
  const [post, setPost] = useState<PostDetail | null>(boot?.post ?? null)
  const [missing, setMissing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const { me } = useAuth()

  useEffect(() => {
    if (post && String(post.id) === id) return
    api<PostDetail>(`/api/posts/${encodeURIComponent(id)}`)
      .then((p) => {
        if (p.status === 'DRAFT' && p.mine) return navigate(`/write/${p.id}`, { replace: true })
        if (p.author.handle !== handle) navigate(p.url, { replace: true })
        setPost(p)
      })
      .catch((e) => { if (e instanceof ApiError && e.status === 404) setMissing(true) })
  }, [handle, id, post])

  useEffect(() => {
    if (post) {
      document.title = `${post.title} - ${post.author.nickname}`
      void highlightWithin(bodyRef.current)
      enhanceGifs(bodyRef.current)
    }
  }, [post])

  if (missing) return <NotFoundPage />
  if (!post) return <main className="container narrow"><p className="muted center">불러오는 중…</p></main>

  const changeVisibility = async (to: Visibility) => {
    if (to === 'PUBLIC' && !confirm('모든 사람이 볼 수 있게 돼요. 공개할까요?')) return
    try {
      const r = await api<{ visibility: Visibility; firstPublicAt: string | null }>(`/api/posts/${post.id}/visibility`,
        { method: 'PATCH', body: { visibility: to } })
      setPost({ ...post, visibility: r.visibility, firstPublicAt: r.firstPublicAt })
      setNotice(to === 'PUBLIC' ? '공개했어요.' : '비공개로 바꿨어요. 이제 나만 볼 수 있어요.')
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : '바꾸지 못했어요.')
    }
  }

  const discard = async () => {
    if (!confirm('수정 중인 내용을 버리고 발행본으로 돌아갈까요?')) return
    await api(`/api/posts/${post.id}/draft`, { method: 'DELETE' })
    setPost({ ...post, owner: post.owner ? { ...post.owner, editing: false, editingSavedAt: null } : null })
    setNotice('변경을 취소했어요.')
  }

  const remove = async () => {
    if (!confirm(TRASH_CONFIRM)) return
    try {
      const r = await trashPost(post.id, me?.member?.id)
      setFlash(trashedMessage(r))
      navigate('/manage/posts?tab=trash', { replace: true })
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : '삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.')
    }
  }

  const date = post.firstPublicAt ?? post.publishedAt
  return (
    <main className="container narrow">
      <article className="post">
        {post.owner?.hidden && <div className="banner banner-warn">운영 정책에 따라 숨겨진 글이에요. 다른 사람에게는 보이지 않아요.</div>}
        {post.mine && post.owner?.editing && (
          <div className="banner">
            수정 중인 내용이 있어요{post.owner.editingSavedAt ? `(${monthDay(post.owner.editingSavedAt)} ${clock(post.owner.editingSavedAt)} 저장)` : ''}.
            <span className="banner-actions">
              <Link to={`/write/${post.id}`} className="btn btn-text">이어서 수정</Link>
              <button type="button" className="btn btn-text" onClick={discard}>변경 취소</button>
            </span>
          </div>
        )}
        {post.mine && post.visibility === 'PRIVATE' && <div className="banner">🔒 나만 볼 수 있는 글이에요.</div>}
        {notice && <div className="banner banner-ok" role="status">{notice}</div>}
        <h1 className="post-title">{post.title}</h1>
        <div className="post-meta">
          <span className="post-byline">
            <Link to={`/@${post.author.handle}`} className="post-author">{post.author.nickname}</Link>
            {date && <time dateTime={date} title={fullDate(date)}> · {relativeDate(date)}</time>}
            {post.editedAt && <span className="muted"> · 수정됨 {monthDay(post.editedAt)}</span>}
          </span>
          {post.mine && (
            <span className="post-owner-actions">
              <Link to={`/write/${post.id}`} className="btn btn-text">수정</Link>
              <select aria-label="공개 범위" value={post.visibility}
                      onChange={(e) => changeVisibility(e.target.value as Visibility)}>
                <option value="PUBLIC">🌐 전체 공개</option>
                <option value="PRIVATE">🔒 비공개</option>
              </select>
              <button type="button" className="btn btn-text danger" onClick={remove}>삭제</button>
            </span>
          )}
        </div>
        {post.tags.length > 0 && (
          <ul className="post-tags" aria-label="태그">
            {post.tags.map((t) => <li key={t}><Link to={tagPath(t)} className="tag-link">#{t}</Link></li>)}
          </ul>
        )}
        <div className="post-body markdown" ref={bodyRef} dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
        <div className="post-stats muted">
          <span>♥ {compactNumber(post.likeCount)}</span>
          <span>댓글 {compactNumber(post.commentCount)}</span>
          <span>조회 {compactNumber(post.viewCount)}</span>
          {date && <span>{fullDate(date)}</span>}
        </div>
        <footer className="author-card">
          <Avatar src={post.author.profileImageUrl} name={post.author.nickname} seed={post.author.handle} size={64} />
          <div>
            <Link to={`/@${post.author.handle}`}><b>{post.author.nickname}</b> <span className="muted">@{post.author.handle}</span></Link>
            {post.author.bio && <p className="bio">{post.author.bio}</p>}
          </div>
        </footer>
      </article>
      {post.status === 'PUBLISHED' && (
        <Comments key={post.id} postId={post.id} initial={boot?.post.id === post.id ? boot.comments ?? null : null}
          onCount={(n) => setPost((p) => p && { ...p, commentCount: n })} />
      )}
    </main>
  )
}
