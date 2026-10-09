import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { AdminNav } from '../components/AdminNav';
import { AuthorPanel } from '../components/AuthorPanel';
import { BarChart } from '../components/BarChart';
import { SuspendForm } from '../components/SuspendForm';
import { consoleApi, count, MEMBER_STATUS_LABEL, PROVIDER_LABEL, roleLabel } from '../lib/admin';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fullDate, relativeDate } from '../lib/format';
import { adminApi } from '../lib/moderation';
import { Link } from '../lib/router';
/**
 * 회원 관리 (019 US4, 062): 작성 통계(발행·임시·받은 조회수·좋아요·달별 글 수·많이 본 글), 권한, 정지·해제와 이력.
 * 권한은 관리자만 바꾸고(매니저는 볼 수만 있다), 관리자·매니저와 자기 자신은 정지할 수 없다.
 */
export function AdminMemberPage({ handle }) {
    const { me } = useAuth();
    const [m, setM] = useState(null);
    const [stats, setStats] = useState(null);
    const [missing, setMissing] = useState(false);
    // 결과는 누른 버튼 가까이에 보인다: 권한 칸 또는 정지 칸
    const [message, setMessage] = useState(null);
    const [role, setRole] = useState('USER');
    useEffect(() => {
        document.title = '회원 관리 - devlog';
        adminApi.member(handle).then(setM).catch(() => setMissing(true));
        consoleApi.memberStats(handle).then((s) => { setStats(s); setRole(s.member.role); }).catch(() => setStats(null));
    }, [handle]);
    if (missing)
        return _jsxs("main", { className: "container narrow admin", children: [_jsx(AdminNav, {}), _jsx("p", { children: "\uD68C\uC6D0\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC5B4\uC694." })] });
    if (!m)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    const fail = (e, at) => setMessage({ ok: false, at, text: e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : '처리하지 못했어요.' });
    const act = async (work, ok) => {
        setMessage(null);
        try {
            setM(await work());
            setMessage({ ok: true, text: ok, at: 'suspend' });
        }
        catch (e) {
            fail(e, 'suspend');
        }
    };
    const saveRole = async () => {
        if (!confirm(`${roleLabel(role)}(으)로 바꿀까요? 그 회원은 모든 기기에서 로그아웃돼요.`))
            return;
        setMessage(null);
        try {
            const r = await consoleApi.setRole(m.handle, role);
            setStats((s) => (s ? { ...s, member: { ...s.member, role: r.role } } : s));
            setM(await adminApi.member(m.handle));
            setMessage({ ok: true, text: `${roleLabel(r.role)}(으)로 바꿨어요. 그 회원은 다시 로그인하면 새 권한을 받아요.`, at: 'role' });
        }
        catch (e) {
            fail(e, 'role');
        }
    };
    const iAmAdmin = me?.member?.role === 'ADMIN';
    const self = me?.member?.handle === m.handle;
    const currentRole = stats?.member.role ?? m.role ?? 'USER';
    const result = (at) => message?.at === at && (_jsx("p", { className: message.ok ? 'banner banner-ok' : 'error', role: message.ok ? 'status' : 'alert', children: message.text }));
    return (_jsxs("main", { className: "container narrow admin", children: [_jsx("h1", { className: "page-title", children: "\uAD00\uB9AC\uC790 \uD398\uC774\uC9C0" }), _jsx(AdminNav, {}), _jsxs("p", { className: "small", children: [_jsx(Link, { to: "/admin/members", children: "\u2190 \uD68C\uC6D0 \uBAA9\uB85D" }), " \u00B7 ", _jsx("a", { href: `/@${m.handle}`, children: "\uBE14\uB85C\uADF8 \uBCF4\uAE30" }), " \u00B7 ", _jsx(Link, { to: `/admin/posts?author=${m.handle}`, "data-tip": "\uC774 \uD68C\uC6D0\uC774 \uBC1C\uD589\uD55C \uAE00\uB9CC \uBCF4\uAE30", children: "\uAE00 \uBCF4\uAE30" })] }), _jsx(AuthorPanel, { author: m, linkToMember: false }), stats && (_jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: "\uC791\uC131 \uD1B5\uACC4" }), _jsxs("p", { className: "muted small", children: [PROVIDER_LABEL[stats.member.provider ?? ''] ?? '로그인 방식 없음', " \uAC00\uC785 \u00B7 ", MEMBER_STATUS_LABEL[stats.member.status] ?? stats.member.status, stats.member.lastActiveAt && _jsxs(_Fragment, { children: [" \u00B7 \uCD5C\uADFC \uD65C\uB3D9 ", _jsx("time", { dateTime: stats.member.lastActiveAt, title: fullDate(stats.member.lastActiveAt), children: relativeDate(stats.member.lastActiveAt) })] })] }), _jsxs("div", { className: "stat-grid compact", children: [_jsxs("div", { className: "stat-tile static", "data-tip": `공개 ${stats.posts.publicPosts}편, 나머지는 비공개·숨김`, children: [_jsx("span", { className: "stat-label", children: "\uBC1C\uD589\uD55C \uAE00" }), _jsx("span", { className: "stat-value", children: count(stats.posts.published) })] }), _jsxs("div", { className: "stat-tile static", children: [_jsx("span", { className: "stat-label", children: "\uC784\uC2DC\uAE00" }), _jsx("span", { className: "stat-value", children: count(stats.posts.drafts) })] }), _jsxs("div", { className: "stat-tile static", children: [_jsx("span", { className: "stat-label", children: "\uC228\uACA8\uC9C4 \uAE00" }), _jsx("span", { className: "stat-value", children: count(stats.posts.hidden) })] }), _jsxs("div", { className: "stat-tile static", children: [_jsx("span", { className: "stat-label", children: "\uC4F4 \uB313\uAE00" }), _jsx("span", { className: "stat-value", children: count(stats.comments) })] }), _jsxs("div", { className: "stat-tile static", "data-tip": "\uBC1C\uD589\uD55C \uAE00 \uC804\uCCB4\uAC00 \uBC1B\uC740 \uC870\uD68C\uC218", children: [_jsx("span", { className: "stat-label", children: "\uBC1B\uC740 \uC870\uD68C\uC218" }), _jsx("span", { className: "stat-value", children: count(stats.viewsReceived) })] }), _jsxs("div", { className: "stat-tile static", children: [_jsx("span", { className: "stat-label", children: "\uBC1B\uC740 \uC88B\uC544\uC694" }), _jsx("span", { className: "stat-value", children: count(stats.likesReceived) })] })] }), _jsx("div", { className: "admin-card", children: _jsx(BarChart, { title: "\uB2EC\uBCC4 \uC0C8 \uAE00", unit: "\uD3B8", points: stats.monthly.map((x) => {
                                const [y, mo] = x.month.split('-').map(Number);
                                return { label: `${mo}월`, fullLabel: `${y}년 ${mo}월`, value: x.posts };
                            }) }) }), stats.topPosts.length > 0 && (_jsxs(_Fragment, { children: [_jsx("h3", { className: "small", children: "\uB9CE\uC774 \uBCF8 \uAE00" }), _jsx("ol", { className: "rank-list", children: stats.topPosts.map((p) => (_jsxs("li", { children: [p.title !== null ? _jsx("a", { href: p.link, className: "rank-title", children: p.title })
                                            : _jsx("span", { className: "muted", "data-tip": "\uBE44\uACF5\uAC1C \uAE00\uC740 \uAD00\uB9AC\uC790\uB3C4 \uC81C\uBAA9\uC744 \uBCF4\uC9C0 \uC54A\uC544\uC694", children: "(\uBE44\uACF5\uAC1C \uAE00)" }), p.hidden && _jsx("span", { className: "badge badge-warn", children: "\uC228\uAE40" }), _jsxs("span", { className: "muted small", children: ["\uC870\uD68C ", count(p.views), " \u00B7 \uC88B\uC544\uC694 ", count(p.likes), " \u00B7 \uB313\uAE00 ", count(p.comments)] })] }, p.id))) })] }))] })), _jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: "\uAD8C\uD55C" }), currentRole === 'ADMIN' ? (_jsx("p", { className: "muted small", children: "\uAD00\uB9AC\uC790 \uACC4\uC815\uC774\uC5D0\uC694. \uAD00\uB9AC\uC790\uB294 \uC6B4\uC601\uC790 \uACC4\uC815 \uD558\uB098\uB85C \uC815\uD574\uC838 \uC788\uC5B4\uC694." })) : iAmAdmin && !self ? (_jsxs("div", { className: "role-form", children: [_jsx("p", { className: "muted small", children: "\uB9E4\uB2C8\uC800\uB294 \uAD00\uB9AC\uC790 \uD398\uC774\uC9C0\uC5D0\uC11C \uAE00\u00B7\uC2E0\uACE0\u00B7\uD68C\uC6D0\u00B7\uBB38\uC758\uB97C \uAD00\uB9AC\uD558\uC9C0\uB9CC \uAD8C\uD55C\uC740 \uC8FC\uC9C0 \uBABB\uD574\uC694. \uBC14\uAFB8\uBA74 \uADF8 \uD68C\uC6D0\uC740 \uBAA8\uB4E0 \uAE30\uAE30\uC5D0\uC11C \uB85C\uADF8\uC544\uC6C3\uB3FC\uC694." }), _jsxs("select", { value: role, onChange: (e) => setRole(e.target.value), "aria-label": "\uAD8C\uD55C \uACE0\uB974\uAE30", children: [_jsx("option", { value: "USER", children: "\uC77C\uBC18 \uD68C\uC6D0" }), _jsx("option", { value: "MANAGER", children: "\uB9E4\uB2C8\uC800" })] }), ' ', _jsx("button", { type: "button", className: "btn btn-outline", disabled: role === currentRole, onClick: saveRole, "data-tip": "\uACE0\uB978 \uAD8C\uD55C\uC73C\uB85C \uBC14\uAFD4\uC694", children: "\uAD8C\uD55C \uBC14\uAFB8\uAE30" })] })) : (_jsxs("p", { className: "muted small", children: ["\uC9C0\uAE08 \uAD8C\uD55C: ", roleLabel(currentRole), ". \uAD8C\uD55C\uC740 \uAD00\uB9AC\uC790\uB9CC \uBC14\uAFC0 \uC218 \uC788\uC5B4\uC694."] })), result('role')] }), m.suspended ? (_jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: "\uC815\uC9C0 \uD574\uC81C" }), _jsx("button", { type: "button", className: "btn btn-outline", onClick: () => act(() => adminApi.lift(m.handle), '정지를 해제했어요.'), children: "\uC815\uC9C0 \uD574\uC81C" })] })) : !m.admin && !self && (_jsxs("section", { className: "admin-section", children: [_jsx("h2", { children: "\uC815\uC9C0" }), _jsx("p", { className: "muted small", children: "\uC815\uC9C0\uD558\uBA74 \uBAA8\uB4E0 \uAE30\uAE30\uC5D0\uC11C \uBC14\uB85C \uB85C\uADF8\uC544\uC6C3\uB418\uACE0, \uAE30\uD55C\uAE4C\uC9C0 \uB85C\uADF8\uC778\uD560 \uC218 \uC5C6\uC5B4\uC694. \uAE00\u00B7\uB313\uAE00\uC740 \uADF8\uB300\uB85C \uBCF4\uC5EC\uC694." }), _jsx(SuspendForm, { onSubmit: (days, reason) => act(() => adminApi.suspend(m.handle, days, reason), '정지했어요.') })] })), result('suspend')] }));
}
