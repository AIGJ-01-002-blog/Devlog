import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { clock, fullDate, monthDay, relativeDate } from '../lib/format';
import { useAuth } from '../lib/auth';
import { Link, navigate, useLocation } from '../lib/router';
import { daysLeft, purgePost, PURGE_CONFIRM, restorePost, TRASH_CONFIRM, trashedMessage, trashPost } from '../lib/trash';
import { VISIBILITY_ICON, VISIBILITY_LABEL } from '../lib/visibility';
import { InfiniteLoader } from '../components/InfiniteLoader';
import { AiProposals } from '../components/AiProposals';
import { NavIcon } from '../components/NavIcons';
import { coverGlyph, coverTone } from '../components/PostCard';
import { t, tNodes } from '../lib/i18n';
/** 내 글 관리 (docs/41): 임시글·발행 글·휴지통 탭, 20개씩 무한 스크롤(spec 069), 공개 범위 즉시 변경, 변경 취소, 삭제·복구 (007). */
export function ManagePage() {
    const { search } = useLocation();
    const { me } = useAuth();
    const raw = search.get('tab');
    const tab = raw === 'published' || raw === 'trash' ? raw : 'drafts';
    const filter = search.get('visibility');
    const [items, setItems] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [counts, setCounts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [busy, setBusy] = useState(null);
    const query = `tab=${tab}${filter ? `&visibility=${filter}` : ''}`;
    // 탭을 빨리 바꾸면 늦게 끝난 이전 요청이 지금 탭의 목록·오류를 덮지 않게 마지막 요청만 반영한다
    const latest = useRef(0);
    const load = useCallback(async (next) => {
        const req = ++latest.current;
        setLoading(true);
        setLoadError(false);
        try {
            const page = await api(`/api/me/posts?${query}${next ? `&cursor=${encodeURIComponent(next)}` : ''}`);
            if (req !== latest.current)
                return;
            setItems((prev) => {
                const base = next ? prev : [];
                const seen = new Set(base.map((i) => i.id));
                return [...base, ...page.items.filter((i) => !seen.has(i.id))];
            });
            setCursor(page.nextCursor);
            if (page.counts)
                setCounts(page.counts);
        }
        catch {
            if (req !== latest.current)
                return;
            // 다른 탭의 목록이 남아 이 탭의 글처럼 보이지 않게 비운다
            if (!next) {
                setItems([]);
                setCursor(null);
            }
            setLoadError(true);
        }
        finally {
            if (req === latest.current)
                setLoading(false);
        }
    }, [query]);
    useEffect(() => { void load(null); }, [load]);
    const go = (t, v) => navigate(`/manage/posts?tab=${t}${v ? `&visibility=${v}` : ''}`);
    const changeVisibility = async (item, to) => {
        if (to === 'PUBLIC' && !confirm(t('모든 사람이 볼 수 있게 돼요. 공개할까요?')))
            return;
        try {
            await api(`/api/posts/${item.id}/visibility`, { method: 'PATCH', body: { visibility: to } });
            setItems((list) => list.map((i) => (i.id === item.id ? { ...i, visibility: to } : i)));
        }
        catch (e) {
            setNotice({ ok: false, text: e instanceof ApiError ? e.message : t('바꾸지 못했어요.') });
        }
    };
    const discard = async (item) => {
        if (!confirm(t('수정 중인 내용을 버리고 발행본으로 돌아갈까요?')))
            return;
        try {
            await api(`/api/posts/${item.id}/draft`, { method: 'DELETE' });
            setItems((list) => list.map((i) => (i.id === item.id ? { ...i, editing: false } : i)));
            setNotice({ ok: true, text: t('변경을 취소했어요.') });
        }
        catch (e) {
            setNotice({ ok: false, text: e instanceof ApiError ? e.message : t('변경을 취소하지 못했어요. 잠시 뒤 다시 시도해 주세요.') });
        }
    };
    /** 목록 전체를 다시 읽지 않고 그 행과 개수만 고친다. */
    const removeRow = (item, from, to) => {
        setItems((list) => list.filter((i) => i.id !== item.id));
        setCounts((c) => c && { ...c, [from]: Math.max(0, c[from] - 1), ...(to ? { [to]: c[to] + 1 } : {}) });
    };
    const homeTab = (item) => (item.status === 'DRAFT' ? 'drafts' : 'published');
    const act = async (item, fn) => {
        setBusy(item.id);
        try {
            await fn();
        }
        catch (e) {
            // 이미 다른 탭에서 처리된 글이면 목록에서만 뺀다
            if (e instanceof ApiError && e.status === 404) {
                removeRow(item, tab === 'trash' ? 'trash' : homeTab(item));
                setNotice({ ok: true, text: t('이미 처리된 글이에요.') });
            }
            else {
                setNotice({ ok: false, text: e instanceof ApiError ? e.message : t('처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.') });
            }
        }
        finally {
            setBusy(null);
        }
    };
    const remove = (item) => {
        if (!confirm(TRASH_CONFIRM))
            return;
        void act(item, async () => {
            const r = await trashPost(item.id, me?.member?.id);
            removeRow(item, homeTab(item), r.result === 'DELETED_EMPTY' ? undefined : 'trash');
            setNotice({ ok: true, text: trashedMessage(r) });
        });
    };
    const restore = (item) => void act(item, async () => {
        const r = await restorePost(item.id);
        const to = r.status === 'DRAFT' ? 'drafts' : 'published';
        removeRow(item, 'trash', to);
        setNotice({ ok: true, text: t('복구했어요.'), link: { to: `/manage/posts?tab=${to}`, label: to === 'drafts' ? t('임시글 탭에서 보기') : t('발행 글 탭에서 보기') } });
    });
    const purge = (item) => {
        if (!confirm(PURGE_CONFIRM))
            return;
        void act(item, async () => {
            await purgePost(item.id);
            removeRow(item, 'trash');
            setNotice({ ok: true, text: t('완전히 삭제했어요.') });
        });
    };
    const tabs = [
        { id: 'drafts', label: t('임시글'), hint: t('아직 발행하지 않은 글'), icon: 'pen' },
        { id: 'published', label: t('발행 글'), hint: t('발행한 글과 공개 범위'), icon: 'posts' },
        { id: 'trash', label: t('휴지통'), hint: t('지운 글은 30일 뒤 완전히 지워져요'), icon: 'trash' },
    ];
    return (_jsxs("main", { className: "container manage-page", children: [_jsxs("header", { className: "manage-head", children: [_jsxs("div", { children: [_jsx("h1", { className: "page-title", children: t('내 글 관리') }), _jsx("p", { className: "muted", children: t('임시글을 이어 쓰고, 발행한 글의 공개 범위를 바꾸고, 지운 글을 되살려요.') })] }), _jsx(Link, { to: "/write", className: "btn btn-primary btn-lg", "data-tip": t('새 글 쓰기'), children: tNodes('{0}새 글', { 0: _jsx(NavIcon, { name: "pen", size: 16 }) }) })] }), _jsx("div", { className: "manage-stats", role: "group", "aria-label": t('글 상태'), children: tabs.map((t) => (_jsxs("button", { type: "button", "aria-pressed": tab === t.id, className: `manage-stat stat-${t.id}`, "data-tip": t.hint, onClick: () => go(t.id), children: [_jsx("span", { className: "manage-stat-icon", children: _jsx(NavIcon, { name: t.icon, size: 18 }) }), _jsx("span", { className: "manage-stat-label", children: t.label }), _jsx("b", { className: "manage-stat-count", children: counts ? counts[t.id] : '–' })] }, t.id))) }), tab === 'drafts' && _jsx(AiProposals, {}), tab === 'trash' && _jsx("p", { className: "muted small", children: t('휴지통의 글은 30일이 지나면 완전히 지워져요. 다른 사람에게는 보이지 않아요.') }), tab === 'published' && (_jsx("div", { className: "filters", children: [['', t('전체')], ['public', t('공개')], ['friends', t('친구에게만')], ['private', t('비공개')]].map(([v, label]) => (_jsx("button", { type: "button", "aria-pressed": (filter ?? '') === v, className: `chip ${(filter ?? '') === v ? 'active' : ''}`, onClick: () => go('published', v), children: label }, v))) })), notice && (_jsxs("div", { className: notice.ok ? 'banner banner-ok' : 'banner banner-warn', role: notice.ok ? 'status' : 'alert', children: [notice.text, notice.link && _jsx(Link, { to: notice.link.to, className: "btn btn-text", children: notice.link.label })] })), _jsxs("ul", { className: "manage-list", children: [items.map((item) => (_jsxs("li", { className: `manage-item${item.hidden ? ' is-hidden' : ''}`, children: [_jsx("span", { className: `manage-cover card-cover`, "data-tone": coverTone(item.id), "aria-hidden": "true", children: _jsx("span", { children: coverGlyph(item.title || '#') }) }), _jsxs("div", { className: "manage-body", children: [_jsxs("div", { className: "manage-main", children: [_jsx(StatusChip, { item: item, trash: tab === 'trash' }), item.editing && _jsx("span", { className: "badge", children: t('수정 중') }), item.hidden && _jsx("span", { className: "badge badge-warn", children: t('운영 정책에 따라 숨겨짐') })] }), _jsx("span", { className: item.title ? 'manage-title' : 'manage-title muted', children: item.title || t('(제목 없음)') }), _jsx("div", { className: "manage-meta", children: tab === 'trash' && item.deletedAt && item.purgeAt
                                            ? _jsx(_Fragment, { children: tNodes('삭제 {0} · {1}일 뒤 완전 삭제', { 0: monthDay(item.deletedAt), 1: daysLeft(item.purgeAt) }) })
                                            : item.status === 'DRAFT'
                                                ? _jsxs(_Fragment, { children: [t('마지막 저장'), " ", isRecent(item.updatedAt) ? relativeDate(item.updatedAt) : `${monthDay(item.updatedAt)} ${clock(item.updatedAt)}`] })
                                                : _jsxs(_Fragment, { children: [_jsxs("span", { children: [t('발행'), " ", item.publishedAt && fullDate(item.publishedAt), item.editedAt && t(' · 수정됨 {0}', { 0: monthDay(item.editedAt) })] }), _jsxs("span", { className: "manage-counts", children: [_jsxs("span", { "data-tip": t('조회수'), children: [_jsx(NavIcon, { name: "eye", size: 14 }), item.viewCount, _jsx("span", { className: "sr-only", children: t('조회') })] }), _jsxs("span", { "data-tip": t('좋아요'), children: [_jsx(NavIcon, { name: "heart", size: 14 }), item.likeCount, _jsx("span", { className: "sr-only", children: t('좋아요') })] }), _jsxs("span", { "data-tip": t('댓글'), children: [_jsx(NavIcon, { name: "comment", size: 14 }), item.commentCount, _jsx("span", { className: "sr-only", children: t('댓글') })] })] })] }) })] }), _jsx("div", { className: "manage-actions", children: tab === 'trash' ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "btn btn-outline btn-small", disabled: busy === item.id, onClick: () => restore(item), children: t('복구') }), _jsx("button", { type: "button", className: "btn btn-text danger", disabled: busy === item.id, onClick: () => purge(item), children: t('영구 삭제') })] })) : item.status === 'DRAFT' ? (_jsxs(_Fragment, { children: [_jsx(Link, { to: `/write/${item.id}`, className: "btn btn-outline btn-small", children: t('이어 쓰기') }), _jsx("button", { type: "button", className: "btn btn-text danger", disabled: busy === item.id, onClick: () => remove(item), children: t('삭제') })] })) : (_jsxs(_Fragment, { children: [_jsx(ViewLink, { id: item.id, onError: (text) => setNotice({ ok: false, text }) }), _jsx(Link, { to: `/write/${item.id}`, className: "btn btn-outline btn-small", children: item.editing ? t('이어서 수정') : t('수정') }), item.editing && _jsx("button", { type: "button", className: "btn btn-text", onClick: () => discard(item), children: t('변경 취소') }), _jsxs("select", { "aria-label": t('공개 범위'), "data-tip": t('누가 볼 수 있는지 바꿔요'), value: item.visibility ?? 'PUBLIC', onChange: (e) => changeVisibility(item, e.target.value), children: [_jsx("option", { value: "PUBLIC", children: t('공개') }), _jsx("option", { value: "FRIENDS", children: t('친구에게만') }), _jsx("option", { value: "PRIVATE", children: t('비공개') })] }), _jsx("button", { type: "button", className: "btn btn-text danger", disabled: busy === item.id, onClick: () => remove(item), children: t('삭제') })] })) })] }, item.id))), loading && items.length === 0 && [0, 1, 2].map((i) => _jsx("li", { className: "manage-item manage-skeleton", "aria-hidden": "true" }, `s${i}`))] }), !loading && loadError && items.length === 0 && cursor == null && (_jsx("p", { className: "error", role: "alert", children: tNodes('목록을 불러오지 못했어요 {0}', { 0: _jsx("button", { type: "button", className: "btn btn-text", title: t('목록을 다시 불러와요'), onClick: () => load(null), children: t('다시 시도') }) }) })), !loading && !loadError && items.length === 0 && cursor == null && (_jsxs("div", { className: "empty", children: [tab === 'trash' ? _jsx("p", { children: t('휴지통이 비어 있어요.') }) : tab === 'drafts' ? _jsx("p", { children: t('임시글이 없어요.') }) : _jsx("p", { children: t('발행한 글이 없어요.') }), tab !== 'trash' && _jsx(Link, { to: "/write", className: "btn btn-primary", children: t('새 글 쓰기') })] })), (items.length > 0 || cursor != null) && (_jsx(InfiniteLoader, { hasMore: cursor != null, loading: loading, failed: !loading && loadError, onMore: () => void load(cursor) }))] }));
}
/** 상태 칩: 임시글·공개·친구에게만·나만 보기·휴지통을 색으로 나눠 한눈에 보이게 */
function StatusChip({ item, trash }) {
    if (trash)
        return _jsx("span", { className: "status-chip st-trash", children: t('휴지통') });
    if (item.status === 'DRAFT')
        return _jsx("span", { className: "status-chip st-draft", children: t('임시글') });
    const v = item.visibility ?? 'PUBLIC';
    return _jsxs("span", { className: `status-chip st-${v.toLowerCase()}`, children: [VISIBILITY_ICON[v], " ", VISIBILITY_LABEL[v]] });
}
function ViewLink({ id, onError }) {
    // 글 주소는 서버가 /@handle/posts/{id}로 정한다. 상세 API에서 주소를 받아 이동한다
    return (_jsx("button", { type: "button", className: "btn btn-text", onClick: async () => {
            try {
                const p = await api(`/api/posts/${id}`);
                navigate(p.url);
            }
            catch (e) {
                onError(e instanceof ApiError ? e.message : t('글을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.'));
            }
        }, children: t('보기') }));
}
function isRecent(iso) {
    return Date.now() - new Date(iso).getTime() < 86_400_000;
}
