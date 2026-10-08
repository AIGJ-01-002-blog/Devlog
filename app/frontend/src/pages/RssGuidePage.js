import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { NavIcon } from '../components/NavIcons';
import { api, ApiError } from '../lib/api';
import { Link } from '../lib/router';
import { feedUrl, rawXmlPath, READERS } from '../lib/rss';
import { NotFoundPage } from './NotFoundPage';
/**
 * RSS 구독 안내 (062). "RSS를 누르니 이상한 XML만 나온다"는 말에서 나왔다.
 * 같은 주소를 구독 앱은 XML로 받고, 사람이 브라우저로 열면 이 화면을 본다.
 */
export function RssGuidePage({ handle }) {
    const [name, setName] = useState(handle ? null : 'devlog 전체');
    const [missing, setMissing] = useState(false);
    const [copied, setCopied] = useState(null);
    const url = feedUrl(handle, window.location.origin);
    useEffect(() => {
        if (!handle)
            return;
        api(`/api/members/${encodeURIComponent(handle)}`)
            .then((p) => setName(`${p.nickname}님의 블로그`))
            .catch((e) => { if (e instanceof ApiError && e.status === 404)
            setMissing(true);
        else
            setName(`@${handle}`); });
    }, [handle]);
    useEffect(() => {
        if (!copied)
            return;
        const t = setTimeout(() => setCopied(null), 3000);
        return () => clearTimeout(t);
    }, [copied]);
    if (missing)
        return _jsx(NotFoundPage, {});
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied('ok');
        }
        catch {
            setCopied('fail');
        }
    };
    return (_jsxs("main", { className: "container narrow rss-guide", children: [_jsx("div", { className: "rss-badge", "aria-hidden": "true", children: _jsx(NavIcon, { name: "rss", size: 28 }) }), _jsx("h1", { className: "page-title", children: "RSS\uB85C \uC0C8 \uAE00 \uBC1B\uC544 \uBCF4\uAE30" }), _jsxs("p", { className: "rss-lead", children: [name ?? '이 블로그', "\uC758 ", _jsx("b", { children: "\uAD6C\uB3C5 \uC8FC\uC18C" }), "\uC608\uC694. \uC774 \uC8FC\uC18C\uB97C \uAD6C\uB3C5 \uC571\uC5D0 \uB123\uC5B4 \uB450\uBA74 \uBE14\uB85C\uADF8\uB97C \uCC3E\uC544\uC624\uC9C0 \uC54A\uC544\uB3C4 \uC0C8 \uAE00\uC774 \uC62C\uB77C\uC62C \uB54C\uB9C8\uB2E4 \uC571\uC5D0\uC11C \uBC14\uB85C \uBCFC \uC218 \uC788\uC5B4\uC694."] }), _jsxs("div", { className: "rss-url", children: [_jsx("code", { children: url }), _jsxs("button", { type: "button", className: "btn btn-primary", onClick: copy, "data-tip": "\uAD6C\uB3C5 \uC8FC\uC18C\uB97C \uBCF5\uC0AC\uD574 \uAD6C\uB3C5 \uC571\uC5D0 \uBD99\uC5EC \uB123\uC5B4\uC694", children: [_jsx(NavIcon, { name: "copy", size: 16 }), "\uC8FC\uC18C \uBCF5\uC0AC"] })] }), _jsx("p", { className: `small${copied === 'fail' ? ' error' : ' ok'}`, role: "status", children: copied === 'ok' ? '복사했어요. 구독 앱에 붙여 넣어 주세요.' : copied === 'fail' ? '복사하지 못했어요. 위 주소를 직접 골라 복사해 주세요.' : '' }), _jsx("h2", { children: "\uC774\uB807\uAC8C \uAD6C\uB3C5\uD574\uC694" }), _jsxs("ol", { className: "rss-steps", children: [_jsxs("li", { children: [_jsx("b", { children: "\uC8FC\uC18C \uBCF5\uC0AC" }), _jsx("span", { children: "\uC704 [\uC8FC\uC18C \uBCF5\uC0AC]\uB97C \uB20C\uB7EC\uC694." })] }), _jsxs("li", { children: [_jsx("b", { children: "\uAD6C\uB3C5 \uC571\uC5D0 \uBD99\uC5EC \uB123\uAE30" }), _jsx("span", { children: "Feedly\u00B7Inoreader\u00B7NetNewsWire \uAC19\uC740 \uC571\uC5D0\uC11C [\uAD6C\uB3C5 \uCD94\uAC00]\uB098 [+]\uB97C \uB204\uB974\uACE0 \uBD99\uC5EC \uB123\uC5B4\uC694." })] }), _jsxs("li", { children: [_jsx("b", { children: "\uC0C8 \uAE00 \uBC1B\uC544 \uBCF4\uAE30" }), _jsx("span", { children: "\uC0C8 \uAE00\uC774 \uC62C\uB77C\uC624\uBA74 \uC571\uC774 \uC54C\uC544\uC11C \uAC00\uC838\uC640\uC694. \uACF5\uAC1C \uAE00\uB9CC \uB2F4\uACA8\uC694." })] })] }), _jsx("h2", { children: "\uAD6C\uB3C5 \uC571\uC5D0\uC11C \uBC14\uB85C \uC5F4\uAE30" }), _jsx("div", { className: "row rss-readers", children: READERS.map((r) => (_jsx("a", { className: "btn btn-outline", href: r.url(url), target: "_blank", rel: "noopener noreferrer", "data-tip": r.tip, children: r.name }, r.name))) }), _jsxs("details", { className: "rss-more", children: [_jsx("summary", { children: "\uC65C \uBE0C\uB77C\uC6B0\uC800\uB85C \uC5F4\uBA74 \uAE00\uC790\uB9CC \uAC00\uB4DD\uD588\uB098\uC694?" }), _jsxs("p", { className: "muted small", children: ["RSS\uB294 \uC0AC\uB78C\uC774 \uC544\uB2C8\uB77C \uAD6C\uB3C5 \uC571\uC774 \uC77D\uB294 XML \uD615\uC2DD\uC774\uB77C, \uBE0C\uB77C\uC6B0\uC800\uB85C \uADF8\uB300\uB85C \uC5F4\uBA74 \uAE30\uACC4\uC6A9 \uAE00\uC790\uAC00 \uBCF4\uC5EC\uC694. \uADF8\uB798\uC11C \uBE0C\uB77C\uC6B0\uC800\uB85C \uC5F4 \uB54C\uB294 \uC774 \uC548\uB0B4\uB97C \uBCF4\uC5EC \uB4DC\uB9AC\uACE0, \uAD6C\uB3C5 \uC571\uC5D0\uB294 \uC9C0\uAE08\uCC98\uB7FC XML\uC744 \uBCF4\uB0B4\uC694. \uC6D0\uBB38\uC774 \uAD81\uAE08\uD558\uBA74 ", _jsx("a", { href: rawXmlPath(handle), children: "XML \uC6D0\uBB38 \uBCF4\uAE30" }), "\uB97C \uB20C\uB7EC \uBCF4\uC138\uC694."] })] }), handle && _jsx("p", { children: _jsx(Link, { to: `/@${handle}`, className: "btn btn-text", children: "\u2190 \uBE14\uB85C\uADF8\uB85C \uB3CC\uC544\uAC00\uAE30" }) })] }));
}
