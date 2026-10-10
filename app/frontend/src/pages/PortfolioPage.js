import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { BranchMark } from '../components/BranchList';
import { GraphLogo } from '../components/GraphLogo';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { compactNumber, fullDate, monthDay } from '../lib/format';
import { contactHref, portfolioApi } from '../lib/portfolio';
import { Link } from '../lib/router';
import { SOCIAL_FIELDS } from '../lib/socialLinks';
import { NotFoundPage } from './NotFoundPage';
import { t, tNodes } from '../lib/i18n';
/**
 * 포트폴리오 모드 /@handle/portfolio (072 3단계). 그래프 로고와 "○○의 개발 기록", 머리(이름·한 줄 소개·GitHub·연락하기·수),
 * 그리고 프로젝트(포트폴리오에 보이기로 한 시리즈)마다 설명과 그 시리즈 글을 브랜치 모양으로 보인다.
 */
export function PortfolioPage({ handle }) {
    const [data, setData] = useState(null);
    const [missing, setMissing] = useState(false);
    const [failed, setFailed] = useState(false);
    const { me } = useAuth();
    useEffect(() => {
        let alive = true;
        portfolioApi.of(handle)
            .then((p) => { if (alive) {
            setData(p);
            document.title = t('{0}의 개발 기록 - 포트폴리오', { 0: p.nickname });
        } })
            .catch((e) => { if (alive)
            (e instanceof ApiError && e.status === 404 ? setMissing : setFailed)(true); });
        return () => { alive = false; };
    }, [handle]);
    if (missing)
        return _jsx(NotFoundPage, {});
    if (failed)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", role: "alert", children: t('포트폴리오를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.') }) });
    if (!data)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: t('불러오는 중…') }) });
    const mine = me?.member?.handle === data.handle;
    const github = SOCIAL_FIELDS.find((f) => f.kind === 'github');
    const contact = contactHref(data.socialLinks);
    return (_jsxs("main", { className: "container portfolio", children: [_jsxs("div", { className: "portfolio-brand", children: [_jsx(GraphLogo, {}), _jsx("span", { children: tNodes('{0}의 개발 기록', { 0: data.nickname }) }), _jsx(Link, { to: `/@${data.handle}`, className: "btn btn-text btn-small portfolio-back", "data-tip": t('블로그 글 목록으로 가요'), children: t('블로그로 보기') })] }), _jsxs("header", { className: "portfolio-hero", children: [_jsx(Avatar, { src: data.profileImageUrl, name: data.nickname, seed: data.handle, size: 88 }), _jsxs("div", { className: "portfolio-hero-text", children: [_jsx("h1", { className: "page-title", children: data.nickname }), data.bio && _jsx("p", { className: "portfolio-role", children: data.bio }), _jsxs("div", { className: "row portfolio-actions", children: [data.socialLinks.github && (_jsx("a", { href: github.href(data.socialLinks.github), className: "btn btn-primary", target: "_blank", rel: "noopener me", "data-tip": t('새 탭에서 GitHub 열기'), children: t('GitHub 보기') })), contact && _jsx("a", { href: contact, className: "btn btn-outline", target: contact.startsWith('mailto:') ? undefined : '_blank', rel: "noopener", "data-tip": t('이메일이나 홈페이지로 연락해요'), children: t('연락하기') })] })] }), _jsxs("ul", { className: "portfolio-stats", children: [_jsxs("li", { children: [_jsx("b", { children: compactNumber(data.postCount) }), _jsx("span", { children: t('쓴 글') })] }), _jsxs("li", { children: [_jsx("b", { children: compactNumber(data.projects.length) }), _jsx("span", { children: t('프로젝트') })] }), _jsxs("li", { children: [_jsx("b", { children: compactNumber(data.likeCount) }), _jsx("span", { children: t('받은 좋아요') })] })] })] }), _jsx("h2", { className: "portfolio-section", children: t('프로젝트') }), data.projects.length === 0 ? (_jsxs("div", { className: "empty", children: [_jsx("p", { children: t('아직 포트폴리오에 보이는 프로젝트가 없어요.') }), mine && _jsx("p", { className: "muted small", children: t('시리즈 화면의 [포트폴리오 프로젝트]에서 시리즈를 프로젝트로 보이게 할 수 있어요.') }), mine && _jsx(Link, { to: `/@${data.handle}/series`, className: "btn btn-primary", children: t('내 시리즈 보기') })] })) : (_jsx("div", { className: "portfolio-projects", children: data.projects.map((p) => _jsx(ProjectCard, { project: p }, p.id)) }))] }));
}
function ProjectCard({ project: p }) {
    const first = p.posts[0]?.firstPublicAt;
    return (_jsxs("article", { className: "project-card", children: [_jsxs("div", { className: "project-main", children: [_jsxs("header", { children: [_jsx("h3", { className: "project-title", children: _jsx(Link, { to: p.url, children: p.name }) }), p.period && _jsx("p", { className: "muted small", children: p.period })] }), p.summary && _jsx("p", { className: "project-summary", children: p.summary }), p.tech.length > 0 && (_jsx("ul", { className: "card-tags project-tech", "aria-label": t('쓴 기술'), children: p.tech.map((t) => _jsx("li", { children: _jsx("span", { className: "card-tag", children: t }) }, t)) })), p.teamWork && _jsxs("section", { className: "project-text", children: [_jsx("h4", { children: t('우리 팀이 한 일') }), _jsx("p", { children: p.teamWork })] }), p.myRole && _jsxs("section", { className: "project-text", children: [_jsx("h4", { children: t('제 역할') }), _jsx("p", { children: p.myRole })] })] }), _jsxs("nav", { className: "branch-box branch-box-series project-branch", "aria-label": t('{0} 글', { 0: p.name }), children: [_jsxs("header", { className: "branch-box-head", children: [_jsx(Link, { to: p.url, className: "bl-branch bl-branch-series", "data-tip": t('시리즈 글 모두 보기'), children: tNodes('{0}글 {1}편', { 0: _jsx(BranchMark, { kind: "SERIES" }), 1: p.posts.length }) }), first && _jsx("span", { className: "muted small", title: fullDate(first), children: tNodes('{0} 시작', { 0: monthDay(first) }) })] }), p.posts.length === 0 ? _jsx("p", { className: "muted small", children: t('아직 공개한 글이 없어요.') }) : (_jsxs("ol", { className: "branch-box-list", reversed: true, children: [[...p.posts].reverse().map((post) => (_jsxs("li", { children: [_jsx("span", { className: "branch-box-dot", "aria-hidden": "true" }), _jsx(Link, { to: post.url, children: post.title })] }, post.id))), _jsx("li", { className: "branch-box-fork", "aria-hidden": "true", children: tNodes('{0}main에서 갈라짐', { 0: _jsx("span", { className: "branch-box-dot" }) }) })] }))] })] }));
}
