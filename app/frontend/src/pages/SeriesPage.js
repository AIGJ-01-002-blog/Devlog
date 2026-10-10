import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { PostCard } from '../components/PostCard';
import { ProjectEditor } from '../components/ProjectEditor';
import { ApiError } from '../lib/api';
import { loginPath, useAuth } from '../lib/auth';
import { readPosts, seriesProgress } from '../lib/branch';
import { move } from '../lib/files';
import { fullDate, relativeDate } from '../lib/format';
import { Link, navigate } from '../lib/router';
import { SERIES_NAME_MAX, seriesApi, seriesNameError, seriesPath } from '../lib/series';
import { NotFoundPage } from './NotFoundPage';
import { t } from '../lib/i18n';
/** 시리즈 페이지 /@블로그/series/이름 (024 US2-2·US3). 주인은 순서 바꾸기·빼기·이름 바꾸기·삭제를 한다. */
export function SeriesPage({ handle, slug }) {
    const [series, setSeries] = useState(null);
    const [missing, setMissing] = useState(false);
    const [editing, setEditing] = useState(null);
    const [renaming, setRenaming] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const read = useMemo(() => readPosts(), [handle, slug]);
    const { me } = useAuth();
    useEffect(() => {
        let alive = true;
        seriesApi.detail(handle, slug)
            .then((s) => { if (alive) {
            setSeries(s);
            document.title = t('{0} - 시리즈', { 0: s.name });
        } })
            .catch((e) => { if (alive && e instanceof ApiError && e.status === 404)
            setMissing(true); });
        return () => { alive = false; };
    }, [handle, slug]);
    if (missing)
        return _jsx(NotFoundPage, {});
    if (!series)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: t('불러오는 중…') }) });
    const run = async (fn) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : t('저장하지 못했어요. 다시 시도해 주세요.'));
        }
        finally {
            setBusy(false);
        }
    };
    const saveOrder = (posts) => run(async () => {
        await seriesApi.reorder(series.id, posts.map((p) => p.id));
        setSeries({ ...series, posts, updatedAt: new Date().toISOString() });
        setEditing(null);
    });
    const rename = (name) => {
        const invalid = seriesNameError(name);
        if (invalid)
            return setError(invalid);
        void run(async () => {
            const r = await seriesApi.rename(series.id, name);
            setRenaming(null);
            if (r.slug !== series.slug)
                navigate(seriesPath(handle, r.slug), { replace: true });
            else
                setSeries({ ...series, name: r.name });
        });
    };
    const remove = () => {
        if (!confirm(t('\'{0}\' 시리즈를 지울까요? 글은 지워지지 않아요.', { 0: series.name })))
            return;
        void run(async () => {
            await seriesApi.remove(series.id);
            navigate(`/@${handle}/series`, { replace: true });
        });
    };
    const subscribe = (on) => run(async () => {
        await seriesApi.subscribe(series.id, on);
        setSeries({ ...series, subscribed: on });
    });
    const progress = seriesProgress(series.posts, read);
    return (_jsxs("main", { className: "container narrow series-page", children: [_jsx("p", { className: "muted small", children: _jsx(Link, { to: `/@${handle}/series`, children: t('@{0}의 시리즈', { 0: handle }) }) }), renaming != null ? (_jsxs(_Fragment, { children: [_jsx("h1", { className: "sr-only", children: series.name }), _jsxs("form", { className: "row series-rename", onSubmit: (e) => { e.preventDefault(); rename(renaming); }, children: [_jsx("input", { "aria-label": t('시리즈 이름'), value: renaming, maxLength: SERIES_NAME_MAX, autoFocus: true, onChange: (e) => setRenaming(e.target.value) }), _jsx("button", { className: "btn btn-primary", disabled: busy, children: t('저장') }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => { setRenaming(null); setError(null); }, children: t('취소') })] })] })) : _jsx("h1", { children: series.name }), _jsxs("p", { className: "muted small", children: [t('글 {0}개', { 0: series.posts.length }), " \u00B7 ", _jsxs("time", { dateTime: series.updatedAt, title: fullDate(series.updatedAt), children: [relativeDate(series.updatedAt), "  ", t('수정')] })] }), !series.mine && series.posts.length > 0 && !editing && (_jsxs("section", { className: "series-progress", "aria-label": t('이어 읽기'), children: [_jsxs("div", { className: "series-progress-row", children: [_jsxs("span", { children: [t('{0}편 중', { 0: series.posts.length }), " ", _jsx("b", { children: t('{0}편 읽음', { 0: progress.done }) })] }), _jsx("span", { className: "muted small", children: t('이 기기에서 연 글 기준') })] }), _jsx("div", { className: "series-progress-bar", role: "progressbar", "aria-label": t('읽은 편 수'), "aria-valuemin": 0, "aria-valuemax": series.posts.length, "aria-valuenow": progress.done, children: _jsx("span", { style: { width: `${(progress.done / series.posts.length) * 100}%` } }) }), _jsxs("div", { className: "row series-progress-actions", children: [progress.next
                                ? _jsx(Link, { to: progress.next.url, className: "btn btn-primary", "data-tip": progress.next.title, children: progress.done === 0 ? t('1편부터 읽기') : t('{0}편 이어 읽기', { 0: series.posts.indexOf(progress.next) + 1 }) })
                                : _jsx("span", { className: "muted small", children: t('모두 읽었어요') }), me?.authenticated
                                ? _jsx("button", { type: "button", className: "btn btn-outline", disabled: busy, "aria-pressed": !!series.subscribed, onClick: () => void subscribe(!series.subscribed), "data-tip": series.subscribed ? t('이 시리즈 새 글 알림을 그만 받아요') : t('이 시리즈에 새 글이 올라오면 알려 드려요'), children: series.subscribed ? t('새 글 알림 받는 중') : t('새 글 알림 받기') })
                                : _jsx(Link, { to: loginPath(seriesPath(handle, slug)), className: "btn btn-outline", "data-tip": t('로그인하면 새 글 알림을 받을 수 있어요'), children: t('새 글 알림 받기') })] })] })), series.mine && !editing && renaming == null && (_jsxs("div", { className: "row series-owner", children: [_jsx("button", { type: "button", className: "btn btn-text", onClick: () => setEditing(series.posts), disabled: series.posts.length === 0, children: t('순서 편집') }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setRenaming(series.name), children: t('이름 바꾸기') }), _jsx("button", { type: "button", className: "btn btn-text danger", onClick: remove, disabled: busy, children: t('시리즈 삭제') })] })), series.mine && !editing && renaming == null && _jsx(ProjectEditor, { seriesId: series.id, handle: handle }), error && _jsx("p", { className: "error", role: "alert", children: error }), editing ? (_jsxs(_Fragment, { children: [_jsx("ol", { className: "series-edit", children: editing.map((p, i) => (_jsxs("li", { className: "row", children: [_jsx("span", { className: "grow", children: p.title }), _jsx("button", { type: "button", className: "btn btn-text", "aria-label": t('{0} 위로', { 0: p.title }), disabled: i === 0, onClick: () => setEditing(move(editing, i, -1)), children: "\u2191" }), _jsx("button", { type: "button", className: "btn btn-text", "aria-label": t('{0} 아래로', { 0: p.title }), disabled: i === editing.length - 1, onClick: () => setEditing(move(editing, i, 1)), children: "\u2193" }), _jsx("button", { type: "button", className: "btn btn-text danger", "aria-label": t('{0} 시리즈에서 빼기', { 0: p.title }), onClick: () => setEditing(editing.filter((x) => x.id !== p.id)), children: t('빼기') })] }, p.id))) }), _jsxs("div", { className: "row", children: [_jsx("button", { type: "button", className: "btn btn-primary", disabled: busy, onClick: () => saveOrder(editing), children: t('저장') }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => { setEditing(null); setError(null); }, children: t('취소') })] })] })) : series.posts.length === 0 ? (_jsx("p", { className: "muted center", children: t('아직 이 시리즈에 발행한 글이 없어요. 글쓰기 화면의 [시리즈]에서 넣을 수 있어요.') })) : (_jsx("ol", { className: "series-posts", children: series.posts.map((p, i) => (_jsxs("li", { className: read.has(p.id) ? 'is-read' : undefined, children: [_jsx("span", { className: "series-no", "aria-hidden": "true", children: read.has(p.id) ? '✓' : `${i + 1}.` }), read.has(p.id) && _jsx("span", { className: "sr-only", children: t('{0}편, 읽음', { 0: i + 1 }) }), _jsx(PostCard, { card: p, showAuthor: false })] }, p.id))) }))] }));
}
/** 블로그의 [시리즈] 탭 (024 US2-2). 남에게는 읽을 수 있는 글이 있는 시리즈만 온다. */
export function BlogSeries({ handle, mine }) {
    const [list, setList] = useState(null);
    useEffect(() => {
        let alive = true;
        seriesApi.list(handle).then((l) => { if (alive)
            setList(l); }).catch(() => { if (alive)
            setList([]); });
        return () => { alive = false; };
    }, [handle]);
    if (!list)
        return _jsx("p", { className: "muted center", children: t('불러오는 중…') });
    if (list.length === 0) {
        return _jsx("p", { className: "muted center", children: mine ? t('아직 시리즈가 없어요. 글쓰기 화면의 [시리즈]에서 만들 수 있어요.') : t('아직 시리즈가 없어요.') });
    }
    return (_jsx("div", { className: "card-grid", children: list.map((s) => (_jsxs("article", { className: "card", children: [_jsx(Link, { to: seriesPath(handle, s.slug), className: "card-thumb", tabIndex: -1, "aria-hidden": "true", children: s.thumbnailUrl ? _jsx("img", { src: s.thumbnailUrl, alt: "", loading: "lazy" }) : _jsx("span", { className: "card-thumb-empty" }) }), _jsxs("div", { className: "card-body", children: [_jsx("h2", { className: "card-title", children: _jsx(Link, { to: seriesPath(handle, s.slug), children: s.name }) }), _jsxs("div", { className: "card-meta", children: [t('글 {0}개', { 0: s.postCount }), " \u00B7 ", _jsxs("time", { dateTime: s.updatedAt, title: fullDate(s.updatedAt), children: [relativeDate(s.updatedAt), "  ", t('수정')] })] })] })] }, s.id))) }));
}
