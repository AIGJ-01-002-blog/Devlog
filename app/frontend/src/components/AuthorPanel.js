import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { fullDate } from '../lib/format';
import { suspensionPeriod } from '../lib/moderation';
import { Link } from '../lib/router';
import { t } from '../lib/i18n';
/** 작성자 정보 (019 FR-013): 가입일·숨겨진 콘텐츠 수·정지 이력 */
export function AuthorPanel({ author, linkToMember = true }) {
    return (_jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: t('작성자') }), _jsxs("p", { children: [linkToMember ? _jsxs(Link, { to: `/admin/members/${author.handle}`, className: "nowrap", children: ["@", author.handle] }) : _jsxs("b", { className: "nowrap", children: ["@", author.handle] }), author.nickname && _jsxs(_Fragment, { children: [" \u00B7 ", author.nickname] }), author.admin && _jsxs("span", { className: "badge", children: [" ", author.role === 'MANAGER' ? t('매니저') : t('관리자')] }), author.suspended && _jsxs("span", { className: "badge badge-warn", children: ["  ", t('정지 중')] })] }), _jsx("p", { className: "muted small", children: t('가입 {0} · 숨겨진 글·댓글 {1}개', { 0: fullDate(author.joinedAt), 1: author.hiddenCount }) }), author.suspensions.length > 0 ? (_jsx("ul", { className: "suspension-history", children: author.suspensions.map((s) => (_jsxs("li", { children: [_jsx("span", { className: "muted small", children: suspensionPeriod(s, fullDate) }), " \u00B7 ", s.reason] }, s.id))) })) : _jsx("p", { className: "muted small", children: t('정지 이력 없음') })] }));
}
