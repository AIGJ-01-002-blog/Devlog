import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ReportButton } from '../components/ReportButton';
import { reasonLabel } from '../lib/moderation';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { FollowButton } from '../components/FollowButton';
import { Comments } from '../components/Comments';
import { AttachmentList } from '../components/AttachmentList';
import { LikeButton } from '../components/LikeButton';
import { AdjacentPosts } from '../components/AdjacentPosts';
import { SocialLinkList } from '../components/SocialLinkList';
import { BranchBox } from '../components/BranchBox';
import { BranchMark } from '../components/BranchList';
import { SimilarPosts } from '../components/SimilarPosts';
import { ReadProgress } from '../components/ReadProgress';
import { ShareButton } from '../components/ShareButton';
import { Toc } from '../components/Toc';
import { readingMinutes } from '../lib/toc';
import { api, ApiError, takeInitialData } from '../lib/api';
import { markRead, usePostBranch } from '../lib/branch';
import { clock, compactNumber, fullDate, monthDay, relativeDate } from '../lib/format';
import { enhanceGifs } from '../lib/gifPlayer';
import { renderDiagramsWithin } from '../lib/diagram';
import { highlightWithin } from '../lib/highlight';
import { useAuth } from '../lib/auth';
import { setFlash } from '../lib/flash';
import { Link, navigate } from '../lib/router';
import { tagPath } from '../lib/tags';
import { VISIBILITY_CHANGED } from '../lib/visibility';
import { useViewBeacon, VIEW_HINT } from '../lib/views';
import { TRASH_CONFIRM, trashedMessage, trashPost } from '../lib/trash';
import { NotFoundPage } from './NotFoundPage';
import { t } from '../lib/i18n';
export function PostPage({ handle, id }) {
    const [boot] = useState(() => {
        const data = takeInitialData('post');
        return data && String(data.post.id) === id ? data : null;
    });
    const [post, setPost] = useState(boot?.post ?? null);
    const [missing, setMissing] = useState(false);
    const [notice, setNotice] = useState(null);
    const [minutes, setMinutes] = useState(null);
    const bodyRef = useRef(null);
    const { me } = useAuth();
    useViewBeacon(bodyRef, post?.id, !!post && !post.mine && post.status === 'PUBLISHED');
    const branch = usePostBranch(Number(id)) ?? null;
    // 시리즈 이어 읽기(072): 이 기기에서 연 글을 기억한다. 서버에는 남기지 않는다
    useEffect(() => { if (post?.status === 'PUBLISHED')
        markRead(post.id); }, [post?.id, post?.status]);
    useEffect(() => {
        if (post && String(post.id) === id)
            return;
        api(`/api/posts/${encodeURIComponent(id)}`)
            .then((p) => {
            if (p.status === 'DRAFT' && p.mine)
                return navigate(`/write/${p.id}`, { replace: true });
            if (p.author.handle !== handle)
                navigate(p.url, { replace: true });
            setPost(p);
        })
            .catch((e) => { if (e instanceof ApiError && e.status === 404)
            setMissing(true); });
    }, [handle, id, post]);
    useEffect(() => {
        if (post) {
            document.title = `${post.title} - ${post.author.nickname}`;
            void renderDiagramsWithin(bodyRef.current);
            void highlightWithin(bodyRef.current);
            enhanceGifs(bodyRef.current);
            const body = bodyRef.current;
            if (body)
                setMinutes(readingMinutes(body.textContent ?? '', body.querySelectorAll('img').length));
        }
    }, [post]);
    // 본문은 불러온 뒤에 그려지므로 주소의 #제목으로는 브라우저가 스스로 이동하지 못한다. 글이 바뀔 때만 한 번 맞춘다.
    const postId = post?.id;
    useEffect(() => {
        if (postId == null || !window.location.hash)
            return;
        let target;
        try {
            target = decodeURIComponent(window.location.hash.slice(1));
        }
        catch {
            return;
        }
        document.getElementById(target)?.scrollIntoView({ block: 'start' });
    }, [postId]);
    if (missing)
        return _jsx(NotFoundPage, {});
    if (!post)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: t('불러오는 중…') }) });
    const changeVisibility = async (to) => {
        if (to === 'PUBLIC' && !confirm(t('모든 사람이 볼 수 있게 돼요. 공개할까요?')))
            return;
        try {
            const r = await api(`/api/posts/${post.id}/visibility`, { method: 'PATCH', body: { visibility: to } });
            setPost({ ...post, visibility: r.visibility, firstPublicAt: r.firstPublicAt });
            setNotice({ ok: true, text: VISIBILITY_CHANGED[to] });
        }
        catch (e) {
            setNotice({ ok: false, text: e instanceof ApiError ? e.message : t('바꾸지 못했어요.') });
        }
    };
    const discard = async () => {
        if (!confirm(t('수정 중인 내용을 버리고 발행본으로 돌아갈까요?')))
            return;
        try {
            await api(`/api/posts/${post.id}/draft`, { method: 'DELETE' });
            setPost({ ...post, owner: post.owner ? { ...post.owner, editing: false, editingSavedAt: null } : null });
            setNotice({ ok: true, text: t('변경을 취소했어요.') });
        }
        catch (e) {
            setNotice({ ok: false, text: e instanceof ApiError ? e.message : t('변경을 취소하지 못했어요. 잠시 뒤 다시 시도해 주세요.') });
        }
    };
    const remove = async () => {
        if (!confirm(TRASH_CONFIRM))
            return;
        try {
            const r = await trashPost(post.id, me?.member?.id);
            setFlash(trashedMessage(r));
            navigate('/manage/posts?tab=trash', { replace: true });
        }
        catch (e) {
            setNotice({ ok: false, text: e instanceof ApiError ? e.message : t('삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.') });
        }
    };
    const date = post.firstPublicAt ?? post.publishedAt;
    return (_jsxs("main", { className: "container narrow", children: [_jsx(ReadProgress, { target: bodyRef }), _jsxs("article", { className: "post", children: [post.owner?.hidden && (_jsx("div", { className: "banner banner-warn", children: post.owner.hiddenReason ? t('운영 정책에 따라 숨겨진 글이에요 (사유: {0}). 다른 사람에게는 보이지 않아요.', { 0: reasonLabel(post.owner.hiddenReason) }) : t('운영 정책에 따라 숨겨진 글이에요. 다른 사람에게는 보이지 않아요.') })), post.mine && post.owner?.editing && (_jsxs("div", { className: "banner", children: [t('수정 중인 내용이 있어요'), post.owner.editingSavedAt ? t('({0} {1} 저장)', { 0: monthDay(post.owner.editingSavedAt), 1: clock(post.owner.editingSavedAt) }) : '', ".", _jsxs("span", { className: "banner-actions", children: [_jsx(Link, { to: `/write/${post.id}`, className: "btn btn-text", children: t('이어서 수정') }), _jsx("button", { type: "button", className: "btn btn-text", onClick: discard, children: t('변경 취소') })] })] })), post.mine && post.visibility === 'PRIVATE' && _jsxs("div", { className: "banner", children: [_jsx("span", { "aria-hidden": "true", children: "\uD83D\uDD12" }), "  ", t('나만 볼 수 있는 글이에요.')] }), post.visibility === 'FRIENDS' && (_jsxs("div", { className: "banner", children: [_jsx("span", { "aria-hidden": "true", children: "\uD83D\uDC65" }), " ", post.mine ? t('나와 친구만 볼 수 있는 글이에요.') : t('친구에게만 공개된 글이에요.')] })), notice && (_jsx("div", { className: notice.ok ? 'banner banner-ok' : 'banner banner-warn', role: notice.ok ? 'status' : 'alert', children: notice.text })), branch && (_jsxs(Link, { to: branch.url, className: `bl-branch bl-branch-${branch.kind.toLowerCase()} post-branch`, "data-tip": branch.kind === 'SERIES' ? t('시리즈 글 모두 보기') : t('홈에서 자동으로 묶인 비슷한 글만 보기'), children: [_jsx(BranchMark, { kind: branch.kind }), branch.name, " ", branch.kind === 'SERIES' ? t('시리즈') : t('브랜치'), branch.index != null && t(', {0}편', { 0: branch.index })] })), _jsx("h1", { className: "post-title", children: post.title }), _jsxs("div", { className: "post-meta", children: [_jsxs("span", { className: "post-byline", children: [_jsx(Link, { to: `/@${post.author.handle}`, className: "post-author", children: post.author.nickname }), date && _jsxs("time", { dateTime: date, title: fullDate(date), children: [" \u00B7 ", relativeDate(date)] }), post.editedAt && _jsxs("span", { className: "muted", children: ["  ", t('· 수정됨'), " ", monthDay(post.editedAt)] }), minutes != null && _jsxs("span", { className: "muted", children: [" \u00B7 ", t('{0}분 읽기', { 0: minutes })] }), post.status === 'PUBLISHED' && (_jsxs("span", { className: "muted post-byline-stats", children: ["  ", t('· 조회'), " ", compactNumber(post.viewCount), "  ", t('· 댓글'), " ", compactNumber(post.commentCount), "  ", t('· 좋아요'), " ", compactNumber(post.likeCount)] }))] }), post.mine && (_jsxs("span", { className: "post-owner-actions", children: [_jsx(Link, { to: `/write/${post.id}`, className: "btn btn-text", "data-tip": t('에디터에서 이 글 고치기'), children: t('수정') }), _jsxs("span", { className: "visibility-picker", children: [_jsxs("select", { "aria-label": t('공개 범위'), "data-tip": t('누가 이 글을 볼 수 있는지 바로 바꿔요'), value: post.visibility, onChange: (e) => changeVisibility(e.target.value), children: [_jsx("option", { value: "PUBLIC", children: t('🌐 전체 공개') }), _jsx("option", { value: "FRIENDS", children: t('👥 친구에게만') }), _jsx("option", { value: "PRIVATE", children: t('🔒 비공개') })] }), _jsx("svg", { className: "visibility-chevron", width: "12", height: "12", viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m6 9 6 6 6-6" }) })] }), _jsx("button", { type: "button", className: "btn btn-text danger", "data-tip": t('휴지통으로 옮겨요. 30일 안에 되돌릴 수 있어요'), onClick: remove, children: t('삭제') })] }))] }), post.tags.length > 0 && (_jsx("ul", { className: "post-tags", "aria-label": t('태그'), children: post.tags.map((t) => _jsx("li", { children: _jsxs(Link, { to: tagPath(t), className: "tag-link", children: ["#", t] }) }, t)) })), _jsx(Toc, { bodyRef: bodyRef, html: post.contentHtml }), _jsx("div", { className: "post-body markdown", ref: bodyRef, dangerouslySetInnerHTML: { __html: post.contentHtml } }), _jsx(AttachmentList, { postId: post.id }, post.id), branch && _jsx(BranchBox, { nav: branch, postId: post.id }), post.status === 'PUBLISHED' && _jsx(SimilarPosts, { postId: post.id }, `similar-${post.id}`), _jsxs("div", { className: "post-stats muted", children: [_jsx(LikeButton, { postId: post.id, mine: post.mine, initial: { liked: post.liked, likeCount: post.likeCount }, onChange: (l) => setPost((p) => p && { ...p, liked: l.liked, likeCount: l.likeCount }) }), post.visibility !== 'PRIVATE' && _jsx(ShareButton, { path: post.url, title: post.title }), _jsxs("a", { href: "#comments", "data-tip": t('댓글로 가기'), children: [t('댓글'), " ", compactNumber(post.commentCount)] }), _jsxs("span", { className: "view-count", tabIndex: 0, title: VIEW_HINT, "aria-label": t('조회 {0}회, {1}', { 0: post.viewCount, 1: VIEW_HINT }), children: [t('조회'), " ", compactNumber(post.viewCount)] }), date && _jsx("span", { children: fullDate(date) }), !post.mine && _jsx(ReportButton, { targetType: "POST", targetId: post.id })] }), _jsxs("footer", { className: "author-card", children: [_jsx(Avatar, { src: post.author.profileImageUrl, name: post.author.nickname, seed: post.author.handle, size: 64 }), _jsxs("div", { children: [_jsxs(Link, { to: `/@${post.author.handle}`, children: [_jsx("b", { children: post.author.nickname }), " ", _jsxs("span", { className: "muted", children: ["@", post.author.handle] })] }), post.author.bio && _jsx("p", { className: "bio", children: post.author.bio }), _jsx(SocialLinkList, { links: post.author.socialLinks })] }), !post.mine && _jsx(FollowButton, { handle: post.author.handle, following: post.author.following })] }), post.status === 'PUBLISHED' && _jsx(AdjacentPosts, { postId: post.id }, `adjacent-${post.id}-${post.visibility}`)] }), post.status === 'PUBLISHED' && (_jsx(Comments, { postId: post.id, initial: boot?.post.id === post.id ? boot.comments ?? null : null, onCount: (n) => setPost((p) => p && { ...p, commentCount: n }) }, post.id))] }));
}
