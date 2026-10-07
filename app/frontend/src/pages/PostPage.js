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
import { SeriesBox } from '../components/SeriesBox';
import { ShareButton } from '../components/ShareButton';
import { Toc } from '../components/Toc';
import { readingMinutes } from '../lib/toc';
import { api, ApiError, takeInitialData } from '../lib/api';
import { clock, compactNumber, fullDate, monthDay, relativeDate } from '../lib/format';
import { enhanceGifs } from '../lib/gifPlayer';
import { highlightWithin } from '../lib/highlight';
import { useAuth } from '../lib/auth';
import { setFlash } from '../lib/flash';
import { Link, navigate } from '../lib/router';
import { tagPath } from '../lib/tags';
import { VISIBILITY_CHANGED } from '../lib/visibility';
import { useViewBeacon, VIEW_HINT } from '../lib/views';
import { TRASH_CONFIRM, trashedMessage, trashPost } from '../lib/trash';
import { NotFoundPage } from './NotFoundPage';
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
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    const changeVisibility = async (to) => {
        if (to === 'PUBLIC' && !confirm('모든 사람이 볼 수 있게 돼요. 공개할까요?'))
            return;
        try {
            const r = await api(`/api/posts/${post.id}/visibility`, { method: 'PATCH', body: { visibility: to } });
            setPost({ ...post, visibility: r.visibility, firstPublicAt: r.firstPublicAt });
            setNotice(VISIBILITY_CHANGED[to]);
        }
        catch (e) {
            setNotice(e instanceof ApiError ? e.message : '바꾸지 못했어요.');
        }
    };
    const discard = async () => {
        if (!confirm('수정 중인 내용을 버리고 발행본으로 돌아갈까요?'))
            return;
        await api(`/api/posts/${post.id}/draft`, { method: 'DELETE' });
        setPost({ ...post, owner: post.owner ? { ...post.owner, editing: false, editingSavedAt: null } : null });
        setNotice('변경을 취소했어요.');
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
            setNotice(e instanceof ApiError ? e.message : '삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
        }
    };
    const date = post.firstPublicAt ?? post.publishedAt;
    return (_jsxs("main", { className: "container narrow", children: [_jsxs("article", { className: "post", children: [post.owner?.hidden && (_jsxs("div", { className: "banner banner-warn", children: ["\uC6B4\uC601 \uC815\uCC45\uC5D0 \uB530\uB77C \uC228\uACA8\uC9C4 \uAE00\uC774\uC5D0\uC694", post.owner.hiddenReason ? ` (사유: ${reasonLabel(post.owner.hiddenReason)})` : '', ". \uB2E4\uB978 \uC0AC\uB78C\uC5D0\uAC8C\uB294 \uBCF4\uC774\uC9C0 \uC54A\uC544\uC694."] })), post.mine && post.owner?.editing && (_jsxs("div", { className: "banner", children: ["\uC218\uC815 \uC911\uC778 \uB0B4\uC6A9\uC774 \uC788\uC5B4\uC694", post.owner.editingSavedAt ? `(${monthDay(post.owner.editingSavedAt)} ${clock(post.owner.editingSavedAt)} 저장)` : '', ".", _jsxs("span", { className: "banner-actions", children: [_jsx(Link, { to: `/write/${post.id}`, className: "btn btn-text", children: "\uC774\uC5B4\uC11C \uC218\uC815" }), _jsx("button", { type: "button", className: "btn btn-text", onClick: discard, children: "\uBCC0\uACBD \uCDE8\uC18C" })] })] })), post.mine && post.visibility === 'PRIVATE' && _jsx("div", { className: "banner", children: "\uD83D\uDD12 \uB098\uB9CC \uBCFC \uC218 \uC788\uB294 \uAE00\uC774\uC5D0\uC694." }), post.visibility === 'FRIENDS' && (_jsxs("div", { className: "banner", children: ["\uD83D\uDC65 ", post.mine ? '나와 친구만 볼 수 있는 글이에요.' : '친구에게만 공개된 글이에요.'] })), notice && _jsx("div", { className: "banner banner-ok", role: "status", children: notice }), _jsx("h1", { className: "post-title", children: post.title }), _jsxs("div", { className: "post-meta", children: [_jsxs("span", { className: "post-byline", children: [_jsx(Link, { to: `/@${post.author.handle}`, className: "post-author", children: post.author.nickname }), date && _jsxs("time", { dateTime: date, title: fullDate(date), children: [" \u00B7 ", relativeDate(date)] }), post.editedAt && _jsxs("span", { className: "muted", children: [" \u00B7 \uC218\uC815\uB428 ", monthDay(post.editedAt)] }), minutes != null && _jsxs("span", { className: "muted", children: [" \u00B7 ", minutes, "\uBD84 \uC77D\uAE30"] })] }), post.mine && (_jsxs("span", { className: "post-owner-actions", children: [_jsx(Link, { to: `/write/${post.id}`, className: "btn btn-text", children: "\uC218\uC815" }), _jsxs("select", { "aria-label": "\uACF5\uAC1C \uBC94\uC704", value: post.visibility, onChange: (e) => changeVisibility(e.target.value), children: [_jsx("option", { value: "PUBLIC", children: "\uD83C\uDF10 \uC804\uCCB4 \uACF5\uAC1C" }), _jsx("option", { value: "FRIENDS", children: "\uD83D\uDC65 \uCE5C\uAD6C\uC5D0\uAC8C\uB9CC" }), _jsx("option", { value: "PRIVATE", children: "\uD83D\uDD12 \uBE44\uACF5\uAC1C" })] }), _jsx("button", { type: "button", className: "btn btn-text danger", onClick: remove, children: "\uC0AD\uC81C" })] }))] }), post.tags.length > 0 && (_jsx("ul", { className: "post-tags", "aria-label": "\uD0DC\uADF8", children: post.tags.map((t) => _jsx("li", { children: _jsxs(Link, { to: tagPath(t), className: "tag-link", children: ["#", t] }) }, t)) })), _jsx(SeriesBox, { postId: post.id }, `series-${post.id}`), _jsx(Toc, { bodyRef: bodyRef, html: post.contentHtml }), _jsx("div", { className: "post-body markdown", ref: bodyRef, dangerouslySetInnerHTML: { __html: post.contentHtml } }), _jsx(AttachmentList, { postId: post.id }, post.id), _jsxs("div", { className: "post-stats muted", children: [_jsx(LikeButton, { postId: post.id, mine: post.mine, initial: { liked: post.liked, likeCount: post.likeCount }, onChange: (l) => setPost((p) => p && { ...p, liked: l.liked, likeCount: l.likeCount }) }), post.visibility !== 'PRIVATE' && _jsx(ShareButton, { path: post.url, title: post.title }), _jsxs("span", { children: ["\uB313\uAE00 ", compactNumber(post.commentCount)] }), _jsxs("span", { className: "view-count", tabIndex: 0, title: VIEW_HINT, "aria-label": `조회 ${post.viewCount}회, ${VIEW_HINT}`, children: ["\uC870\uD68C ", compactNumber(post.viewCount)] }), date && _jsx("span", { children: fullDate(date) }), !post.mine && _jsx(ReportButton, { targetType: "POST", targetId: post.id })] }), _jsxs("footer", { className: "author-card", children: [_jsx(Avatar, { src: post.author.profileImageUrl, name: post.author.nickname, seed: post.author.handle, size: 64 }), _jsxs("div", { children: [_jsxs(Link, { to: `/@${post.author.handle}`, children: [_jsx("b", { children: post.author.nickname }), " ", _jsxs("span", { className: "muted", children: ["@", post.author.handle] })] }), post.author.bio && _jsx("p", { className: "bio", children: post.author.bio }), _jsx(SocialLinkList, { links: post.author.socialLinks })] }), !post.mine && _jsx(FollowButton, { handle: post.author.handle, following: post.author.following })] }), post.status === 'PUBLISHED' && _jsx(AdjacentPosts, { postId: post.id }, `adjacent-${post.id}-${post.visibility}`)] }), post.status === 'PUBLISHED' && (_jsx(Comments, { postId: post.id, initial: boot?.post.id === post.id ? boot.comments ?? null : null, onCount: (n) => setPost((p) => p && { ...p, commentCount: n }) }, post.id))] }));
}
