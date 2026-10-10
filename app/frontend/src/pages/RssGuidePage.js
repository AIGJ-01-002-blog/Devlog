import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { NavIcon } from '../components/NavIcons';
import { api, ApiError } from '../lib/api';
import { Link } from '../lib/router';
import { feedUrl, rawXmlPath, READERS } from '../lib/rss';
import { NotFoundPage } from './NotFoundPage';
import { t, tNodes } from '../lib/i18n';
/**
 * RSS 구독 안내 (063). "RSS를 누르니 이상한 XML만 나온다"는 말에서 나왔다.
 * 같은 주소를 구독 앱은 XML로 받고, 사람이 브라우저로 열면 이 화면을 본다.
 */
export function RssGuidePage({ handle }) {
    const [name, setName] = useState(handle ? null : t('devlog 전체'));
    const [missing, setMissing] = useState(false);
    const [copied, setCopied] = useState(null);
    const url = feedUrl(handle, window.location.origin);
    useEffect(() => {
        if (!handle)
            return;
        api(`/api/members/${encodeURIComponent(handle)}`)
            .then((p) => setName(t('{0}님의 블로그', { 0: p.nickname })))
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
    return (_jsxs("main", { className: "container narrow rss-guide", children: [_jsx("div", { className: "rss-badge", "aria-hidden": "true", children: _jsx(NavIcon, { name: "rss", size: 28 }) }), _jsx("h1", { className: "page-title", children: t('RSS로 새 글 받아 보기') }), _jsx("p", { className: "rss-lead", children: tNodes('{0}의 {1}예요. 이 주소를 구독 앱에 넣어 두면 블로그를 찾아오지 않아도 새 글이 올라올 때마다 앱에서 바로 볼 수 있어요.', { 0: name ?? t('이 블로그'), 1: _jsx("b", { children: t('구독 주소') }) }) }), _jsxs("div", { className: "rss-url", children: [_jsx("code", { children: url }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: copy, "data-tip": t('구독 주소를 복사해 구독 앱에 붙여 넣어요'), children: tNodes('{0}주소 복사', { 0: _jsx(NavIcon, { name: "copy", size: 16 }) }) })] }), _jsx("p", { className: `small${copied === 'fail' ? ' error' : ' ok'}`, role: "status", children: copied === 'ok' ? t('복사했어요. 구독 앱에 붙여 넣어 주세요.') : copied === 'fail' ? t('복사하지 못했어요. 위 주소를 직접 골라 복사해 주세요.') : '' }), _jsx("h2", { children: t('이렇게 구독해요') }), _jsxs("ol", { className: "rss-steps", children: [_jsxs("li", { children: [_jsx("b", { children: t('주소 복사') }), _jsx("span", { children: t('위 [주소 복사]를 눌러요.') })] }), _jsxs("li", { children: [_jsx("b", { children: t('구독 앱에 붙여 넣기') }), _jsx("span", { children: t('Feedly·Inoreader·NetNewsWire 같은 앱에서 [구독 추가]나 [+]를 누르고 붙여 넣어요.') })] }), _jsxs("li", { children: [_jsx("b", { children: t('새 글 받아 보기') }), _jsx("span", { children: t('새 글이 올라오면 앱이 알아서 가져와요. 공개 글만 담겨요.') })] })] }), _jsx("h2", { children: t('구독 앱에서 바로 열기') }), _jsx("div", { className: "row rss-readers", children: READERS.map((r) => (_jsx("a", { className: "btn btn-outline", href: r.url(url), target: "_blank", rel: "noopener noreferrer", "data-tip": r.tip, children: r.name }, r.name))) }), _jsxs("details", { className: "rss-more", children: [_jsx("summary", { children: t('왜 브라우저로 열면 글자만 가득했나요?') }), _jsx("p", { className: "muted small", children: tNodes('RSS는 사람이 아니라 구독 앱이 읽는 XML 형식이라, 브라우저로 그대로 열면 기계용 글자가 보여요. 그래서 브라우저로 열 때는 이 안내를 보여 드리고, 구독 앱에는 지금처럼 XML을 보내요. 원문이 궁금하면 {0}를 눌러 보세요.', { 0: _jsx("a", { href: rawXmlPath(handle), children: t('XML 원문 보기') }) }) })] }), handle && _jsx("p", { children: _jsx(Link, { to: `/@${handle}`, className: "btn btn-text", children: t('← 블로그로 돌아가기') }) })] }));
}
