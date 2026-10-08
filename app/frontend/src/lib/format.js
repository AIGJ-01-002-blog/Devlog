// 날짜 표시: 24시간 이내는 "N분 전/N시간 전", 그 뒤는 2026.10.02 (docs/10 L-5).
export function relativeDate(iso, now = new Date()) {
    if (!iso)
        return '';
    const t = new Date(iso);
    const diff = now.getTime() - t.getTime();
    if (diff >= 0 && diff < 60_000)
        return '방금 전';
    if (diff >= 0 && diff < 3_600_000)
        return `${Math.floor(diff / 60_000)}분 전`;
    if (diff >= 0 && diff < 86_400_000)
        return `${Math.floor(diff / 3_600_000)}시간 전`;
    return fullDate(iso);
}
export function fullDate(iso) {
    const t = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${t.getFullYear()}.${p(t.getMonth() + 1)}.${p(t.getDate())}`;
}
export function monthDay(iso) {
    const t = new Date(iso);
    return `${t.getMonth() + 1}월 ${t.getDate()}일`;
}
export function clock(iso) {
    const t = typeof iso === 'string' ? new Date(iso) : iso;
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}
export function compactNumber(n) {
    // 1만 이상은 소수 첫째 자리까지 내림 (12,950 → 1.2만, docs/30 §5)
    if (n >= 10_000)
        return `${(Math.floor(n / 1_000) / 10).toString()}만`;
    return n.toLocaleString('ko-KR');
}
/** 카드처럼 좁은 곳의 수: 99를 넘으면 99+ (정확한 수는 툴팁으로 보인다) */
export function cappedCount(n) {
    return n > 99 ? '99+' : String(Math.max(0, n));
}
