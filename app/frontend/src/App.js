import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense, useEffect } from 'react';
import { Flash } from './components/Flash';
import { Header } from './components/Header';
import { SkipLink } from './components/SkipLink';
import { TooltipLayer } from './components/TooltipLayer';
import { MobileNav } from './components/MobileNav';
import { PageAnnouncer } from './components/PageAnnouncer';
import { MAIN_ID } from './lib/focusMain';
import { VerifyBanner } from './components/VerifyBanner';
import { loginPath, useAuth } from './lib/auth';
import { isStaff } from './lib/admin';
import { match, navigate, useLocation } from './lib/router';
import { BlogPage } from './pages/BlogPage';
import { SeriesPage } from './pages/SeriesPage';
import { LikedPage } from './pages/LikedPage';
import { FeedPage } from './pages/FeedPage';
import { FollowsPage } from './pages/FollowsPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PostPage } from './pages/PostPage';
import { SearchPage } from './pages/SearchPage';
import { TagPage } from './pages/TagPage';
import { TagsPage } from './pages/TagsPage';
import { withdrawnRedirect } from './lib/withdraw';
import { lazyPage } from './lib/lazyPage';
import { PageErrorBoundary } from './components/PageErrorBoundary';
// 글 읽기(홈·글·블로그·태그·검색·피드)는 첫 묶음에 두고, 쓰기·설정·가입·관리자 화면은 처음 열 때 받는다.
// 독자가 받는 첫 JS를 줄이려는 것이다 (spec 028).
const AdminMemberPage = lazyPage(() => import('./pages/AdminMemberPage'), 'AdminMemberPage');
const AdminReportPage = lazyPage(() => import('./pages/AdminReportPage'), 'AdminReportPage');
const AdminReportsPage = lazyPage(() => import('./pages/AdminReportsPage'), 'AdminReportsPage');
const AgreementsPage = lazyPage(() => import('./pages/AgreementsPage'), 'AgreementsPage');
const ManagePage = lazyPage(() => import('./pages/ManagePage'), 'ManagePage');
const SettingsPage = lazyPage(() => import('./pages/SettingsPage'), 'SettingsPage');
const ForgotPasswordPage = lazyPage(() => import('./pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyPage(() => import('./pages/ResetPasswordPage'), 'ResetPasswordPage');
const SignupEmailPage = lazyPage(() => import('./pages/SignupEmailPage'), 'SignupEmailPage');
const SignupSocialPage = lazyPage(() => import('./pages/SignupSocialPage'), 'SignupSocialPage');
const TermsPage = lazyPage(() => import('./pages/TermsPage'), 'TermsPage');
const VerifyEmailPage = lazyPage(() => import('./pages/VerifyEmailPage'), 'VerifyEmailPage');
const NewPostPage = lazyPage(() => import('./pages/WritePage'), 'NewPostPage');
const WritePage = lazyPage(() => import('./pages/WritePage'), 'WritePage');
const RestorePage = lazyPage(() => import('./pages/RestorePage'), 'RestorePage');
const WithdrawnPage = lazyPage(() => import('./pages/WithdrawnPage'), 'WithdrawnPage');
const WithdrawPage = lazyPage(() => import('./pages/WithdrawPage'), 'WithdrawPage');
const McpPage = lazyPage(() => import('./pages/McpPage'), 'McpPage');
const OAuthAuthorizePage = lazyPage(() => import('./pages/OAuthAuthorizePage'), 'OAuthAuthorizePage');
const SupportPage = lazyPage(() => import('./pages/SupportPage'), 'SupportPage');
const ReleasesPage = lazyPage(() => import('./pages/ReleasesPage'), 'ReleasesPage');
const AdminDashboardPage = lazyPage(() => import('./pages/AdminDashboardPage'), 'AdminDashboardPage');
const AdminPostsPage = lazyPage(() => import('./pages/AdminPostsPage'), 'AdminPostsPage');
const AdminMembersPage = lazyPage(() => import('./pages/AdminMembersPage'), 'AdminMembersPage');
const AdminInquiriesPage = lazyPage(() => import('./pages/AdminInquiriesPage'), 'AdminInquiriesPage');
const AdminInquiryPage = lazyPage(() => import('./pages/AdminInquiryPage'), 'AdminInquiryPage');
export function App() {
    const { path } = useLocation();
    return (_jsxs(_Fragment, { children: [_jsx(SkipLink, {}), _jsx(PageAnnouncer, {}), !path.startsWith('/write') && path !== '/account/restore' && _jsx(Header, {}), path !== '/verify-email' && _jsx(VerifyBanner, {}), _jsx(Flash, { path: path }), _jsx("div", { id: MAIN_ID, tabIndex: -1, children: _jsx(WithdrawnGate, { path: path, children: _jsx(AgreementGate, { path: path, children: _jsx(PageErrorBoundary, { path: path, children: _jsx(Suspense, { fallback: _jsx(Loading, {}), children: route(path) }) }) }) }) }), !path.startsWith('/write') && path !== '/account/restore' && !path.startsWith('/oauth/') && _jsx(MobileNav, { path: path }), _jsx(TooltipLayer, {})] }));
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
    if ((p = match('/@:handle/series/:slug', path)))
        return _jsx(SeriesPage, { handle: p.handle, slug: p.slug }, `${p.handle}/s/${p.slug}`);
    if ((p = match('/@:handle/series', path)))
        return _jsx(BlogPage, { handle: p.handle, tab: "series" }, p.handle);
    if ((p = match('/@:handle/about', path)))
        return _jsx(BlogPage, { handle: p.handle, tab: "about" }, p.handle);
    if ((p = match('/@:handle', path)))
        return _jsx(BlogPage, { handle: p.handle }, p.handle);
    if (path === '/search')
        return _jsx(SearchPage, {});
    if (path === '/mcp')
        return _jsx(McpPage, {});
    if (path === '/oauth/authorize')
        return _jsx(RequireLogin, { children: _jsx(OAuthAuthorizePage, {}) });
    if (path === '/support')
        return _jsx(SupportPage, {});
    if (path === '/releases')
        return _jsx(ReleasesPage, {});
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
    if (path === '/lists/liked')
        return _jsx(RequireLogin, { children: _jsx(LikedPage, {}) });
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
    if (path === '/admin')
        return _jsx(RequireAdmin, { children: _jsx(AdminDashboardPage, {}) });
    if (path === '/admin/posts')
        return _jsx(RequireAdmin, { children: _jsx(AdminPostsPage, {}) });
    if (path === '/admin/members')
        return _jsx(RequireAdmin, { children: _jsx(AdminMembersPage, {}) });
    if (path === '/admin/reports')
        return _jsx(RequireAdmin, { children: _jsx(AdminReportsPage, {}) });
    if ((p = match('/admin/reports/:id', path)))
        return _jsx(RequireAdmin, { children: _jsx(AdminReportPage, { id: p.id }, p.id) });
    if (path === '/admin/inquiries')
        return _jsx(RequireAdmin, { children: _jsx(AdminInquiriesPage, {}) });
    if ((p = match('/admin/inquiries/:id', path)))
        return _jsx(RequireAdmin, { children: _jsx(AdminInquiryPage, { id: p.id }, p.id) });
    if ((p = match('/admin/members/:handle', path)))
        return _jsx(RequireAdmin, { children: _jsx(AdminMemberPage, { handle: p.handle }, p.handle) });
    return _jsx(NotFoundPage, {});
}
function Loading() {
    return _jsx("main", { className: "container", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
}
function RequireLogin({ children }) {
    const { me, loading } = useAuth();
    useEffect(() => {
        if (!loading && !me?.authenticated)
            navigate(loginPath(), { replace: true });
    }, [loading, me]);
    if (loading || !me?.authenticated)
        return _jsx(Loading, {});
    return _jsx(_Fragment, { children: children });
}
/** 관리자 화면(관리자·매니저, 062): 서버가 비회원은 로그인으로, 일반 회원은 404로 보내므로 여기서는 화면 안에서 옮겨 온 경우만 막는다. */
function RequireAdmin({ children }) {
    const { me, loading } = useAuth();
    if (loading)
        return _jsx(Loading, {});
    if (!me?.authenticated)
        return _jsx(RequireLogin, { children: children });
    if (!isStaff(me.member?.role))
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
        // 탈퇴 유예 회원은 복구 화면만 쓴다(WithdrawnGate). 재동의 요청도 서버가 막으므로 여기서 보내지 않는다
        if (me?.agreementRequired && me.member?.status !== 'WITHDRAWN' && path !== '/agreements') {
            navigate(`/agreements?redirect=${encodeURIComponent(path)}`, { replace: true });
        }
    }, [me, path]);
    return _jsx(_Fragment, { children: children });
}
