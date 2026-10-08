import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { fullDate } from '../lib/format';
import { suspensionPeriod } from '../lib/moderation';
import { Link } from '../lib/router';
/** 작성자 정보 (019 FR-013): 가입일·숨겨진 콘텐츠 수·정지 이력 */
export function AuthorPanel({ author, linkToMember = true }) {
    return (_jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: "\uC791\uC131\uC790" }), _jsxs("p", { children: [linkToMember ? _jsxs(Link, { to: `/admin/members/${author.handle}`, children: ["@", author.handle] }) : _jsxs("b", { children: ["@", author.handle] }), author.nickname && _jsxs(_Fragment, { children: [" \u00B7 ", author.nickname] }), author.admin && _jsxs("span", { className: "badge", children: [" ", author.role === 'MANAGER' ? '매니저' : '관리자'] }), author.suspended && _jsx("span", { className: "badge badge-warn", children: " \uC815\uC9C0 \uC911" })] }), _jsxs("p", { className: "muted small", children: ["\uAC00\uC785 ", fullDate(author.joinedAt), " \u00B7 \uC228\uACA8\uC9C4 \uAE00\u00B7\uB313\uAE00 ", author.hiddenCount, "\uAC1C"] }), author.suspensions.length > 0 ? (_jsx("ul", { className: "suspension-history", children: author.suspensions.map((s) => (_jsxs("li", { children: [_jsx("span", { className: "muted small", children: suspensionPeriod(s, fullDate) }), " \u00B7 ", s.reason] }, s.id))) })) : _jsx("p", { className: "muted small", children: "\uC815\uC9C0 \uC774\uB825 \uC5C6\uC74C" })] }));
}
