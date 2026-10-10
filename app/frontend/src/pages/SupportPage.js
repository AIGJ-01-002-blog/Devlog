import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from 'react';
import { loginPath, useAuth } from '../lib/auth';
import { fullDate, relativeDate } from '../lib/format';
import { BUG_TEMPLATE, CATEGORIES, CONTENT_MAX, TITLE_MAX, STATUS_HINT, STATUS_LABEL, categoryLabel, inquiryApi, inquiryErrorText, releaseLink, reportedPage, } from '../lib/inquiry';
import { Link, navigate, useLocation } from '../lib/router';
import { t, tNodes } from '../lib/i18n';
/**
 * 문의·신고 (spec 054). 회원이 문의·버그·제안·신고를 남기고, 내가 남긴 것의 처리 상태·답변·고친 버전을 본다.
 * 연결한 AI가 report_bug로 남긴 신고도 같은 목록에 보인다. ?from=은 메뉴를 연 화면 주소(버그가 난 곳), ?id=는 알림에서 온 문의.
 */
export function SupportPage() {
    const { me, loading } = useAuth();
    const { search } = useLocation();
    const focusId = Number(search.get('id')) || null;
    const tab = focusId || search.get('tab') === 'mine' ? 'mine' : 'new';
    useEffect(() => { document.title = t('문의·신고 - devlog'); }, []);
    if (loading)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: t('불러오는 중…') }) });
    return (_jsxs("main", { className: "container narrow support", children: [_jsx("h1", { className: "page-title", children: t('문의·신고') }), _jsx("p", { className: "muted support-lead", children: t('궁금한 점, 버그, 제안을 남겨 주세요. 운영자만 읽고, 답변이 오면 알림으로 알려 드려요.') }), !me?.authenticated ? (_jsxs("div", { className: "support-card", children: [_jsx("p", { children: t('문의는 로그인한 뒤 남길 수 있어요. 답변을 알림으로 보내 드리기 위해서예요.') }), _jsx(Link, { to: loginPath(), className: "btn btn-dark", children: t('로그인') })] })) : (_jsxs(_Fragment, { children: [_jsxs("nav", { className: "tabs", "aria-label": t('문의'), children: [_jsx(Link, { to: "/support", "aria-current": tab === 'new' ? 'page' : undefined, children: t('새로 남기기') }), _jsx(Link, { to: "/support?tab=mine", "aria-current": tab === 'mine' ? 'page' : undefined, children: t('내 문의') })] }), tab === 'new' ? _jsx(SupportForm, { from: reportedPage(search.get('from')) }) : _jsx(MyInquiries, { focusId: focusId })] })), _jsx("p", { className: "muted small support-foot", children: tNodes('devlog가 버전마다 무엇을 고쳤는지는 {0}에서 볼 수 있어요.', { 0: _jsx(Link, { to: "/releases", children: t('릴리스 노트') }) }) })] }));
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
            return setError(t('종류를 골라 주세요.'));
        if (!title.trim())
            return setError(t('제목을 적어 주세요.'));
        if (!content.trim() || content === BUG_TEMPLATE)
            return setError(t('내용을 적어 주세요.'));
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
    return (_jsxs("form", { className: "support-form", onSubmit: submit, noValidate: true, children: [_jsxs("fieldset", { className: "field", children: [_jsx("legend", { id: groupId, children: t('종류') }), _jsx("div", { className: "support-categories", role: "radiogroup", "aria-labelledby": groupId, children: CATEGORIES.map((c) => (_jsxs("label", { className: `support-category${category === c.code ? ' selected' : ''}`, title: c.hint, children: [_jsx("input", { type: "radio", name: "category", value: c.code, checked: category === c.code, onChange: () => pick(c.code) }), _jsx("b", { children: c.label }), _jsx("span", { className: "muted small", children: c.hint })] }, c.code))) })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: tNodes('제목 {0}', { 0: _jsxs("span", { className: "muted small", children: ["(", [...title].length, "/", TITLE_MAX, ")"] }) }) }), _jsx("input", { value: title, maxLength: TITLE_MAX, onChange: (e) => setTitle(e.target.value), placeholder: t('한 줄로 알려 주세요') })] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: tNodes('내용 {0}', { 0: _jsxs("span", { className: "muted small", children: ["(Markdown, ", [...content].length.toLocaleString(), "/", CONTENT_MAX.toLocaleString(), ")"] }) }) }), _jsx("textarea", { value: content, maxLength: CONTENT_MAX, rows: 10, onChange: (e) => setContent(e.target.value), placeholder: t('어떤 상황인지 자세히 적어 주실수록 빨리 도와드릴 수 있어요') })] }), page && (_jsxs("p", { className: "support-page small", children: [_jsx("span", { className: "muted", children: t('문제가 난 화면:') }), " ", _jsx("code", { children: page }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setPage(null), "aria-label": t('화면 주소 빼기'), title: t('이 화면 주소를 함께 보내지 않아요'), children: t('빼기') })] })), _jsx("p", { className: "muted small", children: t('비밀번호·토큰 같은 비밀 정보는 적지 마세요.') }), error && _jsx("p", { className: "error small", role: "alert", children: error }), _jsx("div", { className: "support-actions", children: _jsx("button", { type: "submit", className: "btn btn-primary", disabled: busy, title: t('운영자에게 보내요. 답변이 오면 알림으로 알려 드려요'), children: busy ? t('보내는 중…') : t('보내기') }) }), _jsxs("aside", { className: "support-card support-ai", children: [_jsx("b", { children: t('AI로 버그를 신고할 수도 있어요') }), _jsx("p", { className: "small", children: tNodes('devlog를 {0}했다면 AI에게 “devlog 버그 신고해 줘”라고 말해 보세요. AI가 어떤 도구에서 무엇이 잘못됐는지 정리해 {1}로 보내고, 여기 [내 문의]에 함께 보여요.', { 0: _jsx(Link, { to: "/mcp", children: t('AI 도구에 연결') }), 1: _jsx("code", { children: "report_bug" }) }) })] })] }));
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
        return _jsx("p", { className: "error", role: "alert", children: t('목록을 불러오지 못했어요.') });
    if (!items)
        return _jsx("p", { className: "muted center", children: t('불러오는 중…') });
    return (_jsxs(_Fragment, { children: [search.get('sent') && _jsx("p", { className: "banner banner-ok", role: "status", children: t('보냈어요. 답변이 오면 알림으로 알려 드릴게요.') }), items.length === 0 ? (_jsxs("div", { className: "empty", children: [_jsx("p", { children: t('아직 남긴 문의가 없어요.') }), _jsx(Link, { to: "/support", className: "btn btn-outline", children: t('문의 남기기') })] })) : (_jsx("ul", { className: "support-list", children: items.map((i) => (_jsx("li", { children: _jsxs("details", { className: "support-item", open: i.id === focusId, ref: i.id === focusId ? focused : undefined, children: [_jsxs("summary", { children: [_jsxs("span", { className: "support-item-head", children: [_jsx("span", { className: "badge", children: categoryLabel(i.category) }), _jsx("span", { className: `badge status-${i.status.toLowerCase()}`, title: STATUS_HINT[i.status], children: STATUS_LABEL[i.status] }), i.source === 'MCP' && _jsx("span", { className: "badge", title: t('연결한 AI가 report_bug로 보낸 신고예요'), children: t('AI 신고') }), i.answer && _jsx("span", { className: "badge badge-brand", title: t('운영자 답변이 있어요'), children: t('답변') })] }), _jsx("span", { className: "support-item-title", children: i.title }), _jsx("time", { className: "muted small", dateTime: i.createdAt, title: fullDate(i.createdAt), children: relativeDate(i.createdAt) })] }), _jsxs("div", { className: "support-item-body", children: [(i.pageUrl || i.toolName) && (_jsxs("p", { className: "muted small", children: [i.pageUrl && _jsx(_Fragment, { children: tNodes('화면 {0}', { 0: _jsx("code", { children: i.pageUrl }) }) }), i.toolName && _jsx(_Fragment, { children: tNodes('도구 {0}', { 0: _jsx("code", { children: i.toolName }) }) })] })), _jsx("div", { className: "support-content", children: i.content }), i.answer && (_jsxs("div", { className: "support-answer", children: [_jsx("b", { children: t('운영자 답변') }), i.answeredAt && _jsxs("time", { className: "muted small", dateTime: i.answeredAt, children: [" \u00B7 ", fullDate(i.answeredAt)] }), _jsx("div", { className: "support-content", children: i.answer })] })), i.fixedVersion && (_jsx("p", { className: "small", children: _jsx(Link, { to: releaseLink(i.fixedVersion), title: t('이 버전에서 무엇이 바뀌었는지 봐요'), children: tNodes('v{0}에서 고쳤어요 →', { 0: i.fixedVersion }) }) }))] })] }) }, i.id))) }))] }));
}
