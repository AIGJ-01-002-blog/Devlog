import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { releasesApi, versionFromHash } from '../lib/releases';
import { Link } from '../lib/router';
const FIRST = 10;
/**
 * 릴리스 노트 (054). 버전마다 무엇을 더하고 고쳤는지. 문의의 "v1.29.0에서 고쳤어요"가 #v1.29.0으로 이 화면의 그 버전을 연다.
 * 처음에는 최근 10개만 그리고, 주소가 더 오래된 버전을 가리키면 거기까지 펼친다.
 */
export function ReleasesPage() {
    const { me } = useAuth();
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [shown, setShown] = useState(FIRST);
    const target = versionFromHash(window.location.hash);
    useEffect(() => {
        document.title = '릴리스 노트 - devlog';
        releasesApi.list().then((d) => {
            const at = target ? d.releases.findIndex((r) => r.version === target) : -1;
            if (at >= FIRST)
                setShown(at + 1);
            setData(d);
        }).catch(() => setError(true));
    }, [target]);
    useEffect(() => {
        if (data && target)
            document.getElementById(`v${target}`)?.scrollIntoView({ block: 'start' });
    }, [data, target]);
    return (_jsxs("main", { className: "container narrow releases", children: [_jsx("h1", { className: "page-title", children: "\uB9B4\uB9AC\uC2A4 \uB178\uD2B8" }), _jsxs("p", { className: "muted", children: ["devlog\uAC00 \uBC84\uC804\uB9C8\uB2E4 \uBB34\uC5C7\uC744 \uB354\uD558\uACE0 \uACE0\uCCE4\uB294\uC9C0 \uBAA8\uC558\uC5B4\uC694.", data?.current && _jsxs(_Fragment, { children: [" \uC9C0\uAE08 \uBC84\uC804\uC740 ", _jsxs("b", { children: ["v", data.current] }), "\uC608\uC694."] }), ' ', "\uBC84\uADF8\uB97C \uCC3E\uC73C\uC168\uB2E4\uBA74 ", _jsx(Link, { to: me?.authenticated ? '/support?from=/releases' : '/support', children: "\uBB38\uC758\u00B7\uC2E0\uACE0" }), "\uB85C \uC54C\uB824 \uC8FC\uC138\uC694."] }), error && _jsx("p", { className: "error", role: "alert", children: "\uB9B4\uB9AC\uC2A4 \uB178\uD2B8\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694." }), !data && !error && _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }), data && data.releases.length === 0 && _jsx("div", { className: "empty", children: _jsx("p", { children: "\uC544\uC9C1 \uB9B4\uB9AC\uC2A4 \uB178\uD2B8\uAC00 \uC5C6\uC5B4\uC694." }) }), data?.releases.slice(0, shown).map((r) => (_jsxs("article", { id: `v${r.version}`, className: `release${r.version === target ? ' release-target' : ''}`, children: [_jsxs("h2", { className: "release-head", children: [_jsxs("a", { href: `#v${r.version}`, title: "\uC774 \uBC84\uC804 \uC8FC\uC18C \uBCF5\uC0AC\uC6A9 \uB9C1\uD06C", children: ["v", r.version] }), r.version === data.current && _jsx("span", { className: "badge badge-brand", title: "\uC9C0\uAE08 \uB3CC\uACE0 \uC788\uB294 \uBC84\uC804", children: "\uC9C0\uAE08" }), r.date && _jsx("time", { className: "muted small", dateTime: r.date, children: r.date })] }), _jsx("div", { className: "markdown release-body", dangerouslySetInnerHTML: { __html: r.html } })] }, r.version))), data && shown < data.releases.length && (_jsx("button", { type: "button", className: "btn btn-outline more", onClick: () => setShown((n) => n + FIRST), title: "\uC774\uC804 \uBC84\uC804 10\uAC1C\uB97C \uB354 \uBCF4\uC5EC \uC918\uC694", children: "\uC774\uC804 \uBC84\uC804 \uB354 \uBCF4\uAE30" }))] }));
}
