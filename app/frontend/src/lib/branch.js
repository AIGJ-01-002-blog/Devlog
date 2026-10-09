import { useEffect, useState } from 'react';
import { api } from './api';
import { seriesApi, seriesPath } from './series';
export const topicApi = {
    /** 주제 브랜치에 없으면 204라 null */
    ofPost: (postId) => api(`/api/posts/${postId}/topic`).then((n) => n ?? null),
    similar: (postId) => api(`/api/posts/${postId}/similar`),
    suggest: (postId, tags) => api(`/api/posts/${postId}/branch-suggestion`, { method: 'POST', body: { tags } }),
    optOut: (postId, optOut) => api(`/api/posts/${postId}/topic-optout`, { method: 'PUT', body: { optOut } }),
};
export function fromSeries(n) {
    return { kind: 'SERIES', key: `s${n.id}`, name: n.name, url: seriesPath(n.handle, n.slug), index: n.index, posts: n.posts };
}
/** 글이 든 브랜치. 시리즈가 먼저이고, 없으면 주제 브랜치. 둘 다 없으면 null, 읽는 중이면 undefined */
export function usePostBranch(postId) {
    const [nav, setNav] = useState(null);
    useEffect(() => {
        let alive = true;
        seriesApi.ofPost(postId)
            .then((s) => s && s.posts.length > 0 ? fromSeries(s) : topicApi.ofPost(postId).then((t) => t && { kind: 'TOPIC', ...t }))
            .catch(() => null)
            .then((n) => { if (alive)
            setNav({ id: postId, nav: n ?? null }); });
        return () => { alive = false; };
    }, [postId]);
    return nav?.id === postId ? nav.nav : undefined;
}
/** 이전·다음 글. 지금 글이 목록에 없으면 둘 다 없다 */
export function branchNeighbors(nav) {
    if (nav.index == null)
        return { prev: null, next: null };
    return { prev: nav.posts[nav.index - 2] ?? null, next: nav.posts[nav.index] ?? null };
}
const READ_KEY = 'devlog:read-posts';
/** 기억하는 읽은 글 수. 넘치면 오래된 것부터 잊는다 */
export const READ_KEEP = 1000;
/** 이 기기에서 연 글 번호 (시리즈 이어 읽기). 서버에 남기지 않는다. 저장소를 못 쓰면 빈 목록 */
export function readPosts() {
    try {
        const raw = localStorage.getItem(READ_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(list) ? list.filter((n) => typeof n === 'number') : []);
    }
    catch {
        return new Set();
    }
}
export function markRead(postId) {
    try {
        const list = [...readPosts()].filter((n) => n !== postId);
        list.push(postId);
        localStorage.setItem(READ_KEY, JSON.stringify(list.slice(-READ_KEEP)));
    }
    catch {
        // 저장 공간이 없거나 막혀 있으면 기억하지 않는다
    }
}
/** 시리즈 읽은 정도: 읽은 편 수와 이어 읽을 글(읽지 않은 첫 글, 다 읽었으면 null) */
export function seriesProgress(posts, read) {
    const done = posts.filter((p) => read.has(p.id)).length;
    return { done, next: posts.find((p) => !read.has(p.id)) ?? null };
}
/**
 * 홈 최신 목록 위 브랜치 버튼 (072). 거르지 않은 목록(base)에 나온 브랜치를 위에서부터 max개.
 * 한 브랜치로 걸러 봐도 같은 버튼 묶음을 그대로 두어 다른 브랜치로 바로 옮겨 갈 수 있게 한다.
 * 고른 브랜치가 묶음에 없으면(목록 아래쪽 브랜치) 보이는 글(visible)에서 찾아 맨 앞에 둔다.
 */
export function branchChips(base, active, visible = [], max = 5) {
    const seen = new Map();
    for (const c of base) {
        if (c.branch && c.branch.total > 1 && !seen.has(c.branch.key))
            seen.set(c.branch.key, c.branch);
    }
    const chips = [...seen.values()].slice(0, max);
    if (!active || chips.some((b) => b.key === active))
        return chips;
    const cur = seen.get(active) ?? visible.find((c) => c.branch?.key === active)?.branch;
    return cur ? [cur, ...chips.slice(0, max - 1)] : chips;
}
