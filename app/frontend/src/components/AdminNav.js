import { jsx as _jsx } from "react/jsx-runtime";
import { Link, useLocation } from '../lib/router';
const ITEMS = [
    { to: '/admin', label: '대시보드', tip: '가입·글·조회수 추이와 처리할 일' },
    { to: '/admin/posts', label: '글', tip: '발행한 글 찾기·숨기기' },
    { to: '/admin/members', label: '회원', tip: '회원 찾기·권한·정지·작성 통계' },
    { to: '/admin/reports', label: '신고', tip: '신고 처리' },
    { to: '/admin/inquiries', label: '문의', tip: '문의·버그 신고 답변' },
];
/** 관리자 페이지 공통 탭 (062). 지금 화면이 어느 묶음인지 표시한다(상세 화면은 그 목록 탭). */
export function AdminNav() {
    const { path } = useLocation();
    const active = (to) => (to === '/admin' ? path === '/admin' : path === to || path.startsWith(`${to}/`));
    return (_jsx("nav", { className: "tabs admin-nav", "aria-label": "\uAD00\uB9AC\uC790 \uBA54\uB274", children: ITEMS.map((it) => (_jsx(Link, { to: it.to, "data-tip": it.tip, "aria-current": active(it.to) ? 'page' : undefined, children: it.label }, it.to))) }));
}
