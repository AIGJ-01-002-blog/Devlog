import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { absoluteUrl, browserShareEnv, shareLink } from '../lib/share';
const MESSAGES = {
    copied: '링크를 복사했어요',
    failed: '복사하지 못했어요. 주소창의 링크를 복사해 주세요',
};
/** 글 상세 공유 버튼 (spec 039). 결과는 화면 읽기 프로그램도 읽도록 status로 잠깐 보인다. */
export function ShareButton({ path, title }) {
    const [result, setResult] = useState(null);
    useEffect(() => {
        if (!result)
            return;
        const t = setTimeout(() => setResult(null), 3000);
        return () => clearTimeout(t);
    }, [result]);
    const press = async () => {
        setResult(await shareLink(absoluteUrl(path, window.location.origin), title, browserShareEnv()));
    };
    const message = result ? MESSAGES[result] : undefined;
    return (_jsxs("span", { className: "share", children: [_jsxs("button", { type: "button", className: "like-button", onClick: press, children: [_jsx("span", { "aria-hidden": "true", children: "\u2197" }), " \uACF5\uC720"] }), _jsx("span", { className: `like-notice${result === 'failed' ? ' error' : ''}`, role: "status", children: message ?? '' })] }));
}
