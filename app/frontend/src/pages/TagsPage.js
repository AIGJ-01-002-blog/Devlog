import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { takeInitialData } from '../lib/api';
import { Link } from '../lib/router';
import { tagPath, tagsApi } from '../lib/tags';
import { t } from '../lib/i18n';
/** 전체 태그 목록: 공개 글 수 많은 순 상위 100개 (010 FR-023). */
export function TagsPage() {
    const initial = takeInitialData('tags')?.tags ?? null;
    const [tags, setTags] = useState(initial);
    const [error, setError] = useState(false);
    const load = () => {
        setError(false);
        tagsApi.top().then(setTags).catch(() => setError(true));
    };
    useEffect(() => {
        if (!initial)
            load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (_jsxs("main", { className: "container", children: [_jsx("h1", { className: "page-title", children: t('태그') }), error && _jsxs("p", { className: "feed-error", role: "alert", children: [t('불러오지 못했어요'), " ", _jsx("button", { type: "button", className: "btn btn-text", onClick: load, children: t('다시 시도') })] }), !error && !tags && _jsx("p", { className: "muted center", children: t('불러오는 중…') }), tags && tags.length === 0 && _jsx("div", { className: "empty", children: _jsx("p", { children: t('아직 태그가 없어요.') }) }), tags && tags.length > 0 && (_jsx("ul", { className: "tag-cloud", children: tags.map((t) => (_jsx("li", { children: _jsxs(Link, { to: tagPath(t.name), className: "tag-link", children: ["#", t.name, " ", _jsx("span", { className: "muted", children: t.postCount })] }) }, t.name))) }))] }));
}
