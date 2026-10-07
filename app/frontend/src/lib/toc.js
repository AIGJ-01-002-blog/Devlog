// 글 목차와 읽는 시간 (spec 025). 서버가 붙인 제목 id(h-…)를 그대로 쓰고, 본문을 다시 해석하지 않는다.
/** 목차에 넣는 제목: 본문 #~### (서버가 한 단계씩 내려 h2~h4로 그린다) */
const TOC_SELECTOR = 'h2[id], h3[id], h4[id]';
/** 제목이 이보다 적으면 목차를 띄우지 않는다 */
export const TOC_MIN_ITEMS = 2;
export function extractToc(root) {
    if (!root)
        return [];
    const headings = [...root.querySelectorAll(TOC_SELECTOR)];
    const items = headings
        .map((h) => ({ id: h.id, text: (h.textContent ?? '').trim(), level: Number(h.tagName[1]) }))
        .filter((h) => h.text);
    const top = Math.min(...items.map((h) => h.level));
    return items.map(({ id, text, level }) => ({ id, text, depth: level - top }));
}
/**
 * 지금 읽는 제목: 화면 위쪽 기준선(offset)을 지난 마지막 제목. 아직 첫 제목 전이면 null.
 * @param tops 제목들의 화면 기준 위치(getBoundingClientRect().top), 문서 순서
 */
export function activeIndex(tops, offset) {
    let active = null;
    tops.forEach((top, i) => { if (top - offset <= 0)
        active = i; });
    return active;
}
/** 1분에 읽는 글자 수. 한글 기준으로 잡고 영문도 글자 수로 센다 */
export const CHARS_PER_MINUTE = 500;
/** 사진 하나를 보는 데 드는 시간(초) */
export const SECONDS_PER_IMAGE = 10;
/** 읽는 시간(분, 1 이상). 공백은 세지 않는다. */
export function readingMinutes(text, images = 0) {
    const chars = text.replace(/\s+/g, '').length;
    return Math.max(1, Math.round(chars / CHARS_PER_MINUTE + (images * SECONDS_PER_IMAGE) / 60));
}
