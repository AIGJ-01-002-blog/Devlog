import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { AdminMemberPage } from './pages/AdminMemberPage';
import { AdminReportPage } from './pages/AdminReportPage';
import { AdminReportsPage } from './pages/AdminReportsPage';
import { useEffect } from 'react';
import { Flash } from './components/Flash';
import { Header } from './components/Header';
import { VerifyBanner } from './components/VerifyBanner';
import { loginPath, useAuth } from './lib/auth';
import { match, navigate, useLocation } from './lib/router';
import { AgreementsPage } from './pages/AgreementsPage';
import { BlogPage } from './pages/BlogPage';
import { FeedPage } from './pages/FeedPage';
import { FollowsPage } from './pages/FollowsPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ManagePage } from './pages/ManagePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PostPage } from './pages/PostPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';
import { TagPage } from './pages/TagPage';
import { TagsPage } from './pages/TagsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SignupEmailPage } from './pages/SignupEmailPage';
import { SignupSocialPage } from './pages/SignupSocialPage';
import { TermsPage } from './pages/TermsPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { NewPostPage, WritePage } from './pages/WritePage';
import { RestorePage } from './pages/RestorePage';
import { WithdrawnPage } from './pages/WithdrawnPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { withdrawnRedirect } from './lib/withdraw';
export function App() {
    const { path } = useLocation();
    return (_jsxs(_Fragment, { children: [!path.startsWith('/write') && path !== '/account/restore' && _jsx(Header, {}), path !== '/verify-email' && _jsx(VerifyBanner, {}), _jsx(Flash, { path: path }), _jsx(WithdrawnGate, { path: path, children: _jsx(AgreementGate, { path: path, children: route(path) }) })] }));
}
function route(path) {
    let p;
    if (path === '/')
        return _jsx(HomePage, {});
    if ((p = match('/@:handle/posts/:id', path)))
        return _jsx(PostPage, { handle: p.handle, id: p.id }, `${p.handle}/${p.id}`);
    if ((p = match('/@:handle/followers', path)))
        return _jsx(FollowsPage, { handle: p.handle, direction: "followers" }, `${p.handle}/f`);
    if ((p = match('/@:handle/following', path)))
        return _jsx(FollowsPage, { handle: p.handle, direction: "following" }, `${p.handle}/g`);
    if ((p = match('/@:handle', path)))
        return _jsx(BlogPage, { handle: p.handle }, p.handle);
    if (path === '/search')
        return _jsx(SearchPage, {});
    if (path === '/tags')
        return _jsx(TagsPage, {});
    if ((p = match('/tags/:name', path)))
        return _jsx(TagPage, { name: p.name }, p.name);
    if (path === '/login')
        return _jsx(LoginPage, {});
    if (path === '/signup')
        return _jsx(SignupEmailPage, {});
    if (path === '/signup/social')
        return _jsx(SignupSocialPage, {});
    if (path === '/forgot-password')
        return _jsx(ForgotPasswordPage, {});
    if (path === '/reset-password')
        return _jsx(ResetPasswordPage, {});
    if (path === '/verify-email')
        return _jsx(VerifyEmailPage, {});
    if (path === '/agreements')
        return _jsx(AgreementsPage, {});
    if (path === '/terms')
        return _jsx(TermsPage, { kind: "terms" });
    if (path === '/privacy')
        return _jsx(TermsPage, { kind: "privacy" });
    if (path === '/write')
        return _jsx(RequireLogin, { children: _jsx(NewPostPage, {}) });
    if ((p = match('/write/:id', path)))
        return _jsx(RequireLogin, { children: _jsx(WritePage, { id: p.id }, p.id) });
    if (path === '/manage/posts')
        return _jsx(RequireLogin, { children: _jsx(ManagePage, {}) });
    if (path === '/feed')
        return _jsx(RequireLogin, { children: _jsx(FeedPage, {}) });
    if (path === '/notifications')
        return _jsx(RequireLogin, { children: _jsx(NotificationsPage, {}) });
    if (path === '/settings')
        return _jsx(RequireLogin, { children: _jsx(SettingsPage, {}) });
    if (path === '/settings/withdraw')
        return _jsx(RequireLogin, { children: _jsx(WithdrawPage, {}) });
    if (path === '/withdrawn')
        return _jsx(WithdrawnPage, {});
    if (path === '/account/restore')
        return _jsx(RequireLogin, { children: _jsx(RestorePage, {}) });
    if (path === '/admin/reports')
        return _jsx(RequireAdmin, { children: _jsx(AdminReportsPage, {}) });
    if ((p = match('/admin/reports/:id', path)))
        return _jsx(RequireAdmin, { children: _jsx(AdminReportPage, { id: p.id }, p.id) });
    if ((p = match('/admin/members/:handle', path)))
        return _jsx(RequireAdmin, { children: _jsx(AdminMemberPage, { handle: p.handle }, p.handle) });
    return _jsx(NotFoundPage, {});
}
function RequireLogin({ children }) {
    const { me, loading } = useAuth();
    useEffect(() => {
        if (!loading && !me?.authenticated)
            navigate(loginPath(), { replace: true });
    }, [loading, me]);
    if (loading || !me?.authenticated)
        return _jsx("main", { className: "container", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    return _jsx(_Fragment, { children: children });
}
/** 관리자 화면: 서버가 비회원은 로그인으로, 일반 회원은 404로 보내므로 여기서는 화면 안에서 옮겨 온 경우만 막는다. */
function RequireAdmin({ children }) {
    const { me, loading } = useAuth();
    if (loading)
        return _jsx("main", { className: "container", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    if (!me?.authenticated)
        return _jsx(RequireLogin, { children: children });
    if (me.member?.role !== 'ADMIN')
        return _jsx(NotFoundPage, {});
    return _jsx(_Fragment, { children: children });
}
/** 탈퇴 유예 회원은 복구 화면만 쓴다 (020 FR-016, 서버도 403 ACCOUNT_WITHDRAWN으로 막는다). */
function WithdrawnGate({ path, children }) {
    const { me, loading } = useAuth();
    const to = loading ? null : withdrawnRedirect(me?.authenticated ? me.member?.status : undefined, path);
    useEffect(() => {
        if (to)
            navigate(to, { replace: true });
    }, [to]);
    if (to)
        return null;
    return _jsx(_Fragment, { children: children });
}
/** 재동의가 필요하면 동의 화면만 쓸 수 있다 (서버도 403 AGREEMENT_REQUIRED로 막는다). */
function AgreementGate({ path, children }) {
    const { me } = useAuth();
    useEffect(() => {
        if (me?.agreementRequired && path !== '/agreements') {
            navigate(`/agreements?redirect=${encodeURIComponent(path)}`, { replace: true });
        }
    }, [me, path]);
    return _jsx(_Fragment, { children: children });
}
