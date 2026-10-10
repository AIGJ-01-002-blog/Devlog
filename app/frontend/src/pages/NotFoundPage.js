import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from '../lib/router';
import { t } from '../lib/i18n';
/** 없음·볼 수 없음·권한 없음을 모두 같은 화면으로 (docs/42 P-4). */
export function NotFoundPage() {
    return (_jsxs("main", { className: "container narrow center not-found", children: [_jsx("h1", { children: t('볼 수 없는 페이지예요') }), _jsx("p", { className: "muted", children: t('주소가 바뀌었거나, 삭제·비공개된 글일 수 있어요.') }), _jsx(Link, { to: "/", className: "btn btn-primary", children: t('홈으로') })] }));
}
