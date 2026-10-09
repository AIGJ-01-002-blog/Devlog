import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { InfiniteLoader } from './InfiniteLoader';
import { PostCard } from './PostCard';
const KEEP_MS = 30 * 60 * 1000;
/**
 * 카드 목록 + 무한 스크롤(spec 069). 이어 붙일 때 이미 있는 글은 건너뛴다(docs/10 §4-3).
 * 상세에서 뒤로 오면 카드·커서·스크롤 위치를 30분 동안 복원한다(L-6).
 */
export function Feed({ endpoint, storageKey, initial, showAuthor = true, empty, onFirstPage, renderItems }) {
    const restored = useRef(readSaved(storageKey));
    const [items, setItems] = useState(restored.current?.items ?? initial?.items ?? []);
    const [cursor, setCursor] = useState(restored.current ? restored.current.nextCursor : initial?.nextCursor ?? null);
    const [loaded, setLoaded] = useState(restored.current != null || initial != null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [notice, setNotice] = useState(null);
    const state = useRef({ items, cursor });
    const firstPage = useRef(onFirstPage);
    firstPage.current = onFirstPage;
    state.current = { items, cursor };
    const load = useCallback(async (next) => {
        setLoading(true);
        setError(false);
        if (next)
            setNotice(null);
        try {
            const page = await api(next ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(next)}` : endpoint);
            if (!next)
                firstPage.current?.(page);
            setItems((prev) => {
                const base = next ? prev : [];
                const seen = new Set(base.map((c) => c.id));
                return [...base, ...page.items.filter((c) => !seen.has(c.id))];
            });
            setCursor(page.nextCursor);
            setLoaded(true);
        }
        catch (e) {
            // 보던 순위표가 만료됨 (017 트렌딩): 안내 뒤 최신 순위를 처음부터 다시 받는다
            if (next && e instanceof ApiError && e.status === 410) {
                setNotice(e.message || '순위가 새로 바뀌었어요.');
                window.scrollTo(0, 0);
                // 첫 쪽을 다시 받을 때까지 기다린다: 먼저 끝난 것으로 보이면 무한 스크롤이 만료된 커서로 또 부른다
                await load(null);
                return;
            }
            setError(true);
        }
        finally {
            setLoading(false);
        }
    }, [endpoint]);
    useEffect(() => {
        if (!loaded)
            void load(null);
    }, [loaded, load]);
    useLayoutEffect(() => {
        if (restored.current)
            window.scrollTo(0, restored.current.scrollY);
        restored.current = null;
        return () => {
            try {
                sessionStorage.setItem(storageKey, JSON.stringify({ ...state.current, nextCursor: state.current.cursor,
                    scrollY: window.scrollY, at: Date.now() }));
            }
            catch {
                // 저장 공간이 없으면 복원하지 않는다
            }
        };
    }, [storageKey]);
    if (loaded && items.length === 0 && !error)
        return _jsx("div", { className: "empty", children: empty });
    return (_jsxs("section", { children: [notice && _jsx("p", { className: "feed-notice", role: "status", children: notice }), renderItems ? renderItems(items, cursor != null) : (_jsx("div", { className: "card-grid", children: items.map((c) => _jsx(PostCard, { card: c, showAuthor: showAuthor }, c.id)) })), _jsx(InfiniteLoader, { hasMore: cursor != null, loading: loading, failed: error, onMore: () => void load(cursor), failedText: "\uAE00\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694" }), !loaded && loading && _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" })] }));
}
function readSaved(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw)
            return null;
        const s = JSON.parse(raw);
        if (Date.now() - s.at > KEEP_MS || navigationType() !== 'back_forward')
            return null;
        return s;
    }
    catch {
        return null;
    }
}
let firstNavigation = true;
function navigationType() {
    // 앱 안에서 뒤로 가기(popstate)는 back_forward로 본다
    if (firstNavigation) {
        firstNavigation = false;
        const nav = performance.getEntriesByType('navigation')[0];
        return nav?.type ?? 'navigate';
    }
    return lastPop ? 'back_forward' : 'navigate';
}
let lastPop = false;
window.addEventListener('popstate', () => {
    lastPop = true;
    setTimeout(() => (lastPop = false), 1000);
});
