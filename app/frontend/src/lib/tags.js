import { api } from './api';
import { t } from './i18n';
// 태그 정규화·주소 (docs/22 §2·§5). 서버 TagNormalizer와 같은 순서다. 화면 정규화는 안내용이고 서버가 다시 검사한다.
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;
const INVISIBLE = /[​-‏‪-‮⁠-⁩﻿\p{Cc}]/gu;
const ALLOWED = /^[가-힣a-z0-9._+#-]+$/;
const HAS_WORD = /[가-힣a-z0-9]/;
export function normalizeTag(raw) {
    return raw.normalize('NFKC').replace(INVISIBLE, '').trim()
        .replace(/^#+/, '').trim()
        .toLowerCase() // JS의 toLowerCase는 지역 설정을 타지 않는다
        .replace(/[\s\p{Z}]+/gu, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
}
/** 금칙어를 뺀 형식 검사. 문제가 없으면 null. */
export function tagFormatError(name) {
    if (!name || !ALLOWED.test(name) || !HAS_WORD.test(name))
        return t('한글·영문·숫자와 - _ . + #만 쓸 수 있어요.');
    if ([...name].length > MAX_TAG_LENGTH)
        return t('{0}자까지 쓸 수 있어요.', { 0: MAX_TAG_LENGTH });
    return null;
}
/** 경로 조각 인코딩: #은 %23, +와 .은 그대로 (서버 UriUtils.encodePathSegment와 같은 모양). */
export function tagPath(name) {
    return '/tags/' + encodeURIComponent(name).replace(/%2B/g, '+');
}
/** 블로그 안 태그 필터 주소. 쿼리에서는 +가 공백으로 읽히므로 그대로 인코딩한다. */
export function blogTagPath(handle, name) {
    return `/@${handle}?tag=${encodeURIComponent(name)}`;
}
export const tagsApi = {
    top: () => api('/api/tags'),
    suggest: (q) => api(`/api/tags/suggest?q=${encodeURIComponent(q)}`),
    page: (name) => api(`/api/tags/${encodeURIComponent(name)}/posts`),
    blogTags: (handle) => api(`/api/members/${encodeURIComponent(handle)}/tags`),
};
/** 칩 목록에 하나 더한다. 정규화한 모양이 이미 있거나 비면 그대로 둔다 (FR-009). */
export function addTag(tags, raw) {
    const name = normalizeTag(raw);
    if (!name || tags.includes(name))
        return tags;
    return [...tags, name];
}
/** 칩 하나를 앞(-1)이나 뒤(+1)로 옮긴다 (Alt + 방향키, 끌기). */
export function moveTag(tags, from, to) {
    if (from === to || from < 0 || to < 0 || from >= tags.length || to >= tags.length)
        return tags;
    const next = [...tags];
    const [t] = next.splice(from, 1);
    next.splice(to, 0, t);
    return next;
}
/** 서버 오류(tags[i])를 칩 번호별 문구로. 'tags'(개수 초과)는 -1에 담는다. */
export function tagErrors(errors) {
    const out = new Map();
    for (const [field, message] of Object.entries(errors)) {
        const m = field.match(/^tags\[(\d+)]$/);
        if (m)
            out.set(Number(m[1]), message);
        else if (field === 'tags')
            out.set(-1, message);
    }
    return out;
}
