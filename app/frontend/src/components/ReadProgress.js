import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
/** 본문을 읽은 비율(0~1). 본문 위끝이 화면 위에 닿으면 0, 본문 아래끝이 화면 아래에 닿으면 1이다 (072) */
export function readRatio(top, height, viewport) {
    const range = height - viewport;
    if (range <= 0)
        return top <= 0 ? 1 : 0;
    return Math.min(1, Math.max(0, -top / range));
}
/** 글 화면 머리말 아래 가는 막대. 장식이라 화면 읽기 프로그램에는 숨긴다. 애니메이션 없이 너비만 바뀐다 */
export function ReadProgress({ target }) {
    const [ratio, setRatio] = useState(0);
    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const el = target.current;
            if (!el)
                return;
            const r = el.getBoundingClientRect();
            setRatio(readRatio(r.top, r.height, window.innerHeight));
        };
        const schedule = () => { if (!frame)
            frame = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            if (frame)
                cancelAnimationFrame(frame);
        };
    }, [target]);
    return _jsx("div", { className: "read-progress", "aria-hidden": "true", children: _jsx("span", { style: { transform: `scaleX(${ratio})` } }) });
}
