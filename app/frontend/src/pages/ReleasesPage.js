import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { fullDate } from '../lib/format';
import { releasesApi, versionFromHash } from '../lib/releases';
import { Link } from '../lib/router';
import { t, tNodes } from '../lib/i18n';
const FIRST = 10;
// 머리말 날짜는 2026-10-08처럼 날짜만 온다. 그 지역의 자정으로 읽어야 하루 밀리지 않는다
const releaseDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? fullDate(`${d}T00:00:00`) : d);
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
        document.title = t('릴리스 노트 - devlog');
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
    return (_jsxs("main", { className: "container narrow releases", children: [_jsx("h1", { className: "page-title", children: t('릴리스 노트') }), _jsxs("p", { className: "muted", children: [t('devlog가 버전마다 무엇을 더하고 고쳤는지 모았어요.'), data?.current && _jsxs(_Fragment, { children: ["  ", tNodes('지금 버전은 {0}예요.', { 0: _jsxs("b", { children: ["v", data.current] }) })] }), ' ', tNodes('버그를 찾으셨다면 {0}로 알려 주세요.', { 0: _jsx(Link, { to: me?.authenticated ? '/support?from=/releases' : '/support', children: t('문의·신고') }) })] }), error && _jsx("p", { className: "error", role: "alert", children: t('릴리스 노트를 불러오지 못했어요.') }), !data && !error && _jsx("p", { className: "muted center", children: t('불러오는 중…') }), data && data.releases.length === 0 && _jsx("div", { className: "empty", children: _jsx("p", { children: t('아직 릴리스 노트가 없어요.') }) }), data?.releases.slice(0, shown).map((r) => (_jsxs("article", { id: `v${r.version}`, className: `release${r.version === target ? ' release-target' : ''}`, children: [_jsxs("h2", { className: "release-head", children: [_jsxs("a", { href: `#v${r.version}`, title: t('이 버전으로 바로 가는 링크'), children: ["v", r.version] }), r.version === data.current && _jsx("span", { className: "badge badge-brand", title: t('지금 돌고 있는 버전'), children: t('지금') }), r.date && _jsx("time", { className: "muted small", dateTime: r.date, children: releaseDate(r.date) })] }), _jsx("div", { className: "markdown release-body", dangerouslySetInnerHTML: { __html: r.html } })] }, r.version))), data && shown < data.releases.length && (_jsx("button", { type: "button", className: "btn btn-outline more", onClick: () => setShown((n) => n + FIRST), title: t('이전 버전 10개를 더 보여 줘요'), children: t('이전 버전 더 보기') }))] }));
}
