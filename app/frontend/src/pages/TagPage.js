import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { Feed } from '../components/Feed';
import { takeInitialData } from '../lib/api';
import { Link, navigate } from '../lib/router';
import { normalizeTag, tagFormatError, tagPath } from '../lib/tags';
import { NotFoundPage } from './NotFoundPage';
import { t } from '../lib/i18n';
/** 태그별 글 목록 (010 FR-019~FR-022). 공개 글이 없는 태그도 정상 페이지로 빈 상태를 보인다. */
export function TagPage({ name }) {
    const canonical = normalizeTag(name);
    const valid = tagFormatError(canonical) == null;
    const initial = takeInitialData('tag')?.tag;
    const first = initial?.name === name ? initial : null;
    const [count, setCount] = useState(first?.postCount ?? null);
    const onFirstPage = useCallback((p) => setCount(p.postCount), []);
    useEffect(() => {
        // 앱 안에서 정규화되지 않은 주소로 오면 정규화된 주소로 바꾼다 (서버는 301)
        if (valid && canonical !== name)
            navigate(tagPath(canonical), { replace: true });
    }, [valid, canonical, name]);
    if (!valid)
        return _jsx(NotFoundPage, {});
    if (canonical !== name)
        return null;
    return (_jsxs("main", { className: "container", children: [_jsxs("header", { className: "tag-header", children: [_jsxs("h1", { className: "page-title", children: ["#", name] }), count != null && _jsxs("p", { className: "muted", children: [t('공개 글'), " ", count] }), _jsx(Link, { to: "/tags", className: "btn btn-text", children: t('전체 태그') })] }), _jsx(Feed, { endpoint: `/api/tags/${encodeURIComponent(name)}/posts`, storageKey: `feed:tag:${name}`, initial: first, onFirstPage: onFirstPage, empty: _jsx("p", { children: t('아직 이 태그로 공개된 글이 없어요.') }) })] }));
}
