import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from 'react';
import { loginPath, useAuth } from '../lib/auth';
import { fullDate, relativeDate } from '../lib/format';
import { BUG_TEMPLATE, CATEGORIES, CONTENT_MAX, TITLE_MAX, STATUS_HINT, STATUS_LABEL, categoryLabel, inquiryApi, inquiryErrorText, releaseLink, reportedPage, } from '../lib/inquiry';
import { Link, navigate, useLocation } from '../lib/router';
/**
 * 문의·신고 (spec 054). 회원이 문의·버그·제안·신고를 남기고, 내가 남긴 것의 처리 상태·답변·고친 버전을 본다.
 * 연결한 AI가 report_bug로 남긴 신고도 같은 목록에 보인다. ?from=은 메뉴를 연 화면 주소(버그가 난 곳), ?id=는 알림에서 온 문의.
 */
export function SupportPage() {
    const { me, loading } = useAuth();
    const { search } = useLocation();
    const focusId = Number(search.get('id')) || null;
    const tab = focusId || search.get('tab') === 'mine' ? 'mine' : 'new';
    useEffect(() => { document.title = '문의·신고 - devlog'; }, []);
    if (loading)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    return (_jsxs("main", { className: "container narrow support", children: [_jsx("h1", { className: "page-title", children: "\uBB38\uC758\u00B7\uC2E0\uACE0" }), _jsx("p", { className: "muted support-lead", children: "\uAD81\uAE08\uD55C \uC810, \uBC84\uADF8, \uC81C\uC548\uC744 \uB0A8\uACA8 \uC8FC\uC138\uC694. \uC6B4\uC601\uC790\uB9CC \uC77D\uACE0, \uB2F5\uBCC0\uC774 \uC624\uBA74 \uC54C\uB9BC\uC73C\uB85C \uC54C\uB824 \uB4DC\uB824\uC694." }), !me?.authenticated ? (_jsxs("div", { className: "support-card", children: [_jsx("p", { children: "\uBB38\uC758\uB294 \uB85C\uADF8\uC778\uD55C \uB4A4 \uB0A8\uAE38 \uC218 \uC788\uC5B4\uC694. \uB2F5\uBCC0\uC744 \uC54C\uB9BC\uC73C\uB85C \uBCF4\uB0B4 \uB4DC\uB9AC\uAE30 \uC704\uD574\uC11C\uC608\uC694." }), _jsx(Link, { to: loginPath(), className: "btn btn-dark", children: "\uB85C\uADF8\uC778" })] })) : (_jsxs(_Fragment, { children: [_jsxs("nav", { className: "tabs", "aria-label": "\uBB38\uC758", children: [_jsx(Link, { to: "/support", "aria-current": tab === 'new' ? 'page' : undefined, children: "\uC0C8\uB85C \uB0A8\uAE30\uAE30" }), _jsx(Link, { to: "/support?tab=mine", "aria-current": tab === 'mine' ? 'page' : undefined, children: "\uB0B4 \uBB38\uC758" })] }), tab === 'new' ? _jsx(SupportForm, { from: reportedPage(search.get('from')) }) : _jsx(MyInquiries, { focusId: focusId })] })), _jsxs("p", { className: "muted small support-foot", children: ["devlog\uAC00 \uBC84\uC804\uB9C8\uB2E4 \uBB34\uC5C7\uC744 \uACE0\uCCE4\uB294\uC9C0\uB294 ", _jsx(Link, { to: "/releases", children: "\uB9B4\uB9AC\uC2A4 \uB178\uD2B8" }), "\uC5D0\uC11C \uBCFC \uC218 \uC788\uC5B4\uC694."] })] }));
}
function SupportForm({ from }) {
    const [category, setCategory] = useState(from ? 'BUG' : null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState(from ? BUG_TEMPLATE : '');
    const [page, setPage] = useState(from);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const groupId = useId();
    const pick = (c) => {
        setCategory(c);
        setError(null);
        // 버그를 고르면 빈 본문에 틀을 채운다. 이미 쓴 내용은 건드리지 않는다
        if (c === 'BUG' && !content.trim())
            setContent(BUG_TEMPLATE);
        if (c !== 'BUG' && content === BUG_TEMPLATE)
            setContent('');
    };
    const submit = async (e) => {
        e.preventDefault();
        if (!category)
            return setError('종류를 골라 주세요.');
        if (!title.trim())
            return setError('제목을 적어 주세요.');
        if (!content.trim() || content === BUG_TEMPLATE)
            return setError('내용을 적어 주세요.');
        setBusy(true);
        setError(null);
        try {
            const { id } = await inquiryApi.submit(category, title.trim(), content, page);
            navigate(`/support?id=${id}&sent=1`);
        }
        catch (err) {
            setError(inquiryErrorText(err));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("form", { className: "support-form", onSubmit: submit, noValidate: true, children: [_jsxs("fieldset", { className: "field", children: [_jsx("legend", { id: groupId, children: "\uC885\uB958" }), _jsx("div", { className: "support-categories", role: "radiogroup", "aria-labelledby": groupId, children: CATEGORIES.map((c) => (_jsxs("label", { className: `support-category${category === c.code ? ' selected' : ''}`, title: c.hint, children: [_jsx("input", { type: "radio", name: "category", value: c.code, checked: category === c.code, onChange: () => pick(c.code) }), _jsx("b", { children: c.label }), _jsx("span", { className: "muted small", children: c.hint })] }, c.code))) })] }), _jsxs("label", { className: "field", children: [_jsxs("span", { children: ["\uC81C\uBAA9 ", _jsxs("span", { className: "muted small", children: ["(", [...title].length, "/", TITLE_MAX, ")"] })] }), _jsx("input", { value: title, maxLength: TITLE_MAX, onChange: (e) => setTitle(e.target.value), placeholder: "\uD55C \uC904\uB85C \uC54C\uB824 \uC8FC\uC138\uC694" })] }), _jsxs("label", { className: "field", children: [_jsxs("span", { children: ["\uB0B4\uC6A9 ", _jsxs("span", { className: "muted small", children: ["(Markdown, ", [...content].length.toLocaleString(), "/", CONTENT_MAX.toLocaleString(), ")"] })] }), _jsx("textarea", { value: content, maxLength: CONTENT_MAX, rows: 10, onChange: (e) => setContent(e.target.value), placeholder: "\uC5B4\uB5A4 \uC0C1\uD669\uC778\uC9C0 \uC790\uC138\uD788 \uC801\uC5B4 \uC8FC\uC2E4\uC218\uB85D \uBE68\uB9AC \uB3C4\uC640\uB4DC\uB9B4 \uC218 \uC788\uC5B4\uC694" })] }), page && (_jsxs("p", { className: "support-page small", children: [_jsx("span", { className: "muted", children: "\uBB38\uC81C\uAC00 \uB09C \uD654\uBA74:" }), " ", _jsx("code", { children: page }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setPage(null), "aria-label": "\uD654\uBA74 \uC8FC\uC18C \uBE7C\uAE30", title: "\uC774 \uD654\uBA74 \uC8FC\uC18C\uB97C \uD568\uAED8 \uBCF4\uB0B4\uC9C0 \uC54A\uC544\uC694", children: "\uBE7C\uAE30" })] })), _jsx("p", { className: "muted small", children: "\uBE44\uBC00\uBC88\uD638\u00B7\uD1A0\uD070 \uAC19\uC740 \uBE44\uBC00 \uC815\uBCF4\uB294 \uC801\uC9C0 \uB9C8\uC138\uC694." }), error && _jsx("p", { className: "error small", role: "alert", children: error }), _jsx("div", { className: "support-actions", children: _jsx("button", { type: "submit", className: "btn btn-primary", disabled: busy, title: "\uC6B4\uC601\uC790\uC5D0\uAC8C \uBCF4\uB0B4\uC694. \uB2F5\uBCC0\uC774 \uC624\uBA74 \uC54C\uB9BC\uC73C\uB85C \uC54C\uB824 \uB4DC\uB824\uC694", children: busy ? '보내는 중…' : '보내기' }) }), _jsxs("aside", { className: "support-card support-ai", children: [_jsx("b", { children: "AI\uB85C \uBC84\uADF8\uB97C \uC2E0\uACE0\uD560 \uC218\uB3C4 \uC788\uC5B4\uC694" }), _jsxs("p", { className: "small", children: ["devlog\uB97C ", _jsx(Link, { to: "/mcp", children: "AI \uB3C4\uAD6C\uC5D0 \uC5F0\uACB0" }), "\uD588\uB2E4\uBA74 AI\uC5D0\uAC8C \u201Cdevlog \uBC84\uADF8 \uC2E0\uACE0\uD574 \uC918\u201D\uB77C\uACE0 \uB9D0\uD574 \uBCF4\uC138\uC694. AI\uAC00 \uC5B4\uB5A4 \uB3C4\uAD6C\uC5D0\uC11C \uBB34\uC5C7\uC774 \uC798\uBABB\uB410\uB294\uC9C0 \uC815\uB9AC\uD574 ", _jsx("code", { children: "report_bug" }), "\uB85C \uBCF4\uB0B4\uACE0, \uC5EC\uAE30 [\uB0B4 \uBB38\uC758]\uC5D0 \uD568\uAED8 \uBCF4\uC5EC\uC694."] })] })] }));
}
function MyInquiries({ focusId }) {
    const { search } = useLocation();
    const [items, setItems] = useState(null);
    const [error, setError] = useState(false);
    const focused = useRef(null);
    useEffect(() => {
        inquiryApi.mine().then(setItems).catch(() => setError(true));
    }, []);
    useEffect(() => {
        focused.current?.scrollIntoView({ block: 'start' });
        focused.current?.querySelector('summary')?.focus();
    }, [items]);
    if (error)
        return _jsx("p", { className: "error", role: "alert", children: "\uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694." });
    if (!items)
        return _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" });
    return (_jsxs(_Fragment, { children: [search.get('sent') && _jsx("p", { className: "banner banner-ok", role: "status", children: "\uBCF4\uB0C8\uC5B4\uC694. \uB2F5\uBCC0\uC774 \uC624\uBA74 \uC54C\uB9BC\uC73C\uB85C \uC54C\uB824 \uB4DC\uB9B4\uAC8C\uC694." }), items.length === 0 ? (_jsxs("div", { className: "empty", children: [_jsx("p", { children: "\uC544\uC9C1 \uB0A8\uAE34 \uBB38\uC758\uAC00 \uC5C6\uC5B4\uC694." }), _jsx(Link, { to: "/support", className: "btn btn-outline", children: "\uBB38\uC758 \uB0A8\uAE30\uAE30" })] })) : (_jsx("ul", { className: "support-list", children: items.map((i) => (_jsx("li", { children: _jsxs("details", { className: "support-item", open: i.id === focusId, ref: i.id === focusId ? focused : undefined, children: [_jsxs("summary", { children: [_jsxs("span", { className: "support-item-head", children: [_jsx("span", { className: "badge", children: categoryLabel(i.category) }), _jsx("span", { className: `badge status-${i.status.toLowerCase()}`, title: STATUS_HINT[i.status], children: STATUS_LABEL[i.status] }), i.source === 'MCP' && _jsx("span", { className: "badge", title: "\uC5F0\uACB0\uD55C AI\uAC00 report_bug\uB85C \uBCF4\uB0B8 \uC2E0\uACE0\uC608\uC694", children: "AI \uC2E0\uACE0" }), i.answer && _jsx("span", { className: "badge badge-brand", title: "\uC6B4\uC601\uC790 \uB2F5\uBCC0\uC774 \uC788\uC5B4\uC694", children: "\uB2F5\uBCC0" })] }), _jsx("span", { className: "support-item-title", children: i.title }), _jsx("time", { className: "muted small", dateTime: i.createdAt, title: fullDate(i.createdAt), children: relativeDate(i.createdAt) })] }), _jsxs("div", { className: "support-item-body", children: [(i.pageUrl || i.toolName) && (_jsxs("p", { className: "muted small", children: [i.pageUrl && _jsxs(_Fragment, { children: ["\uD654\uBA74 ", _jsx("code", { children: i.pageUrl }), " "] }), i.toolName && _jsxs(_Fragment, { children: ["\uB3C4\uAD6C ", _jsx("code", { children: i.toolName })] })] })), _jsx("div", { className: "support-content", children: i.content }), i.answer && (_jsxs("div", { className: "support-answer", children: [_jsx("b", { children: "\uC6B4\uC601\uC790 \uB2F5\uBCC0" }), i.answeredAt && _jsxs("time", { className: "muted small", dateTime: i.answeredAt, children: [" \u00B7 ", fullDate(i.answeredAt)] }), _jsx("div", { className: "support-content", children: i.answer })] })), i.fixedVersion && (_jsx("p", { className: "small", children: _jsxs(Link, { to: releaseLink(i.fixedVersion), title: "\uC774 \uBC84\uC804\uC5D0\uC11C \uBB34\uC5C7\uC774 \uBC14\uB00C\uC5C8\uB294\uC9C0 \uBD10\uC694", children: ["v", i.fixedVersion, "\uC5D0\uC11C \uACE0\uCCE4\uC5B4\uC694 \u2192"] }) }))] })] }) }, i.id))) }))] }));
}
