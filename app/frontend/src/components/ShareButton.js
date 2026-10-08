import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { absoluteUrl, browserShareEnv, shareLink } from '../lib/share';
const MESSAGES = {
    copied: '링크를 복사했어요',
    failed: '복사하지 못했어요. 주소창의 링크를 복사해 주세요',
};
/** 글 상세 공유 버튼 (spec 039). 결과는 화면 읽기 프로그램도 읽도록 status로 잠깐 보인다. */
export function ShareButton({ path, title }) {
    // 누를 때마다 새 객체라 같은 결과가 다시 나와도 3초를 새로 센다
    const [shown, setShown] = useState(null);
    const latest = useRef(0);
    useEffect(() => {
        if (!shown)
            return;
        const t = setTimeout(() => setShown(null), 3000);
        return () => clearTimeout(t);
    }, [shown]);
    const press = async () => {
        const attempt = ++latest.current;
        const result = await shareLink(absoluteUrl(path, window.location.origin), title, browserShareEnv());
        // 먼저 누른 요청이 늦게 끝나면 새 결과를 덮지 않는다
        if (attempt === latest.current)
            setShown({ result });
    };
    const result = shown?.result;
    const message = result ? MESSAGES[result] : undefined;
    return (_jsxs("span", { className: "share", children: [_jsxs("button", { type: "button", className: "like-button", "data-tip": "\uC774 \uAE00 \uB9C1\uD06C\uB97C \uBCF5\uC0AC\uD558\uAC70\uB098 \uACF5\uC720\uD574\uC694", onClick: press, children: [_jsx("span", { "aria-hidden": "true", children: "\u2197" }), " \uACF5\uC720"] }), _jsx("span", { className: `like-notice${result === 'failed' ? ' error' : ''}`, role: "status", children: message ?? '' })] }));
}
