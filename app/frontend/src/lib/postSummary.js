/** 짧은 소개 길이 상한 (서버 post.summary varchar(150)과 같다, spec 045) */
export const SUMMARY_MAX = 150;
/** 서버와 같이 줄바꿈·연속 공백을 한 칸으로 줄이고 앞뒤 공백을 지운다. 글자 수 표시도 이 값으로 센다. */
export function normalizeSummary(raw) {
    return raw.replace(/\s+/g, ' ').trim();
}
/** 코드 포인트로 센다 (서버·DB char_length와 같은 기준). 이모지 하나는 1자다. */
export function summaryLength(raw) {
    return [...normalizeSummary(raw)].length;
}
/** 발행 설정 창 안에서 고치는 칸(태그·짧은 소개·썸네일). 이 칸의 오류면 창을 닫지 않는다. */
export function isPublishField(field) {
    return field.startsWith('tags') || field === 'summary' || field === 'thumbnail';
}
