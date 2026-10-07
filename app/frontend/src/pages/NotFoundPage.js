import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from '../lib/router';
/** 없음·볼 수 없음·권한 없음을 모두 같은 화면으로 (docs/42 P-4). */
export function NotFoundPage() {
    return (_jsxs("main", { className: "container narrow center not-found", children: [_jsx("h1", { children: "\uBCFC \uC218 \uC5C6\uB294 \uD398\uC774\uC9C0\uC608\uC694" }), _jsx("p", { className: "muted", children: "\uC8FC\uC18C\uAC00 \uBC14\uB00C\uC5C8\uAC70\uB098, \uC0AD\uC81C\u00B7\uBE44\uACF5\uAC1C\uB41C \uAE00\uC77C \uC218 \uC788\uC5B4\uC694." }), _jsx(Link, { to: "/", className: "btn btn-primary", children: "\uD648\uC73C\uB85C" })] }));
}
