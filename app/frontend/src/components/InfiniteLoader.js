import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
/** 목록 끝이 화면 아래 이만큼 안으로 들어오면 미리 다음 쪽을 부른다 */
export const PREFETCH_MARGIN_PX = 600;
/**
 * 무한 스크롤 (spec 069): 목록 끝의 표시가 화면 가까이 오면 다음 쪽을 부른다.
 * - 한 번 실패하면 저절로 다시 부르지 않고 [다시 시도]를 보인다. 목록이 말없이 멈추지 않게.
 * - 한 쪽을 다 받고도 끝이 여전히 보이면(큰 화면) 감시를 새로 걸어 이어서 부른다.
 * - IntersectionObserver가 없는 브라우저는 예전처럼 [더 보기] 버튼을 쓴다.
 */
export function InfiniteLoader({ hasMore, loading, failed, onMore, failedText = '목록을 불러오지 못했어요' }) {
    const sentinel = useRef(null);
    const more = useRef(onMore);
    more.current = onMore;
    const observable = typeof IntersectionObserver !== 'undefined';
    useEffect(() => {
        const el = sentinel.current;
        if (!observable || !el || !hasMore || loading || failed)
            return;
        // 새 감시는 처음 걸 때 지금 보이는지 한 번 알려 준다: 다 받은 뒤에도 끝이 보이면 곧바로 이어서 부른다
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((e) => e.isIntersecting))
                return;
            observer.disconnect();
            more.current();
        }, { rootMargin: `0px 0px ${PREFETCH_MARGIN_PX}px 0px` });
        observer.observe(el);
        return () => observer.disconnect();
    }, [observable, hasMore, loading, failed]);
    if (failed) {
        return (_jsxs("p", { className: "error center load-more-error", role: "alert", children: [failedText, ' ', _jsx("button", { type: "button", className: "btn btn-text", title: "\uC774\uC5B4\uC11C \uB2E4\uC2DC \uBD88\uB7EC\uC640\uC694", onClick: () => more.current(), children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] }));
    }
    if (!hasMore)
        return null;
    return (_jsx("div", { ref: sentinel, className: "more", "data-testid": "infinite-sentinel", children: loading
            ? _jsx("p", { className: "muted", role: "status", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" })
            : !observable && _jsx("button", { type: "button", className: "btn btn-outline", title: "\uB2E4\uC74C \uAE00\uC744 \uBD88\uB7EC\uC640\uC694", onClick: () => more.current(), children: "\uB354 \uBCF4\uAE30" }) }));
}
