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
            document.title = `${p.nickname}의 개발 기록 - 포트폴리오`;
        } })
            .catch((e) => { if (alive)
            (e instanceof ApiError && e.status === 404 ? setMissing : setFailed)(true); });
        return () => { alive = false; };
    }, [handle]);
    if (missing)
        return _jsx(NotFoundPage, {});
    if (failed)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", role: "alert", children: "\uD3EC\uD2B8\uD3F4\uB9AC\uC624\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC7A0\uC2DC \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694." }) });
    if (!data)
        return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    const mine = me?.member?.handle === data.handle;
    const github = SOCIAL_FIELDS.find((f) => f.kind === 'github');
    const contact = contactHref(data.socialLinks);
    return (_jsxs("main", { className: "container portfolio", children: [_jsxs("div", { className: "portfolio-brand", children: [_jsx(GraphLogo, {}), _jsxs("span", { children: [data.nickname, "\uC758 \uAC1C\uBC1C \uAE30\uB85D"] }), _jsx(Link, { to: `/@${data.handle}`, className: "btn btn-text btn-small portfolio-back", "data-tip": "\uBE14\uB85C\uADF8 \uAE00 \uBAA9\uB85D\uC73C\uB85C \uAC00\uC694", children: "\uBE14\uB85C\uADF8\uB85C \uBCF4\uAE30" })] }), _jsxs("header", { className: "portfolio-hero", children: [_jsx(Avatar, { src: data.profileImageUrl, name: data.nickname, seed: data.handle, size: 88 }), _jsxs("div", { className: "portfolio-hero-text", children: [_jsx("h1", { className: "page-title", children: data.nickname }), data.bio && _jsx("p", { className: "portfolio-role", children: data.bio }), _jsxs("div", { className: "row portfolio-actions", children: [data.socialLinks.github && (_jsx("a", { href: github.href(data.socialLinks.github), className: "btn btn-primary", target: "_blank", rel: "noopener me", "data-tip": "\uC0C8 \uD0ED\uC5D0\uC11C GitHub \uC5F4\uAE30", children: "GitHub \uBCF4\uAE30" })), contact && _jsx("a", { href: contact, className: "btn btn-outline", target: contact.startsWith('mailto:') ? undefined : '_blank', rel: "noopener", "data-tip": "\uC774\uBA54\uC77C\uC774\uB098 \uD648\uD398\uC774\uC9C0\uB85C \uC5F0\uB77D\uD574\uC694", children: "\uC5F0\uB77D\uD558\uAE30" })] })] }), _jsxs("ul", { className: "portfolio-stats", children: [_jsxs("li", { children: [_jsx("b", { children: compactNumber(data.postCount) }), _jsx("span", { children: "\uC4F4 \uAE00" })] }), _jsxs("li", { children: [_jsx("b", { children: compactNumber(data.projects.length) }), _jsx("span", { children: "\uD504\uB85C\uC81D\uD2B8" })] }), _jsxs("li", { children: [_jsx("b", { children: compactNumber(data.likeCount) }), _jsx("span", { children: "\uBC1B\uC740 \uC88B\uC544\uC694" })] })] })] }), _jsx("h2", { className: "portfolio-section", children: "\uD504\uB85C\uC81D\uD2B8" }), data.projects.length === 0 ? (_jsxs("div", { className: "empty", children: [_jsx("p", { children: "\uC544\uC9C1 \uD3EC\uD2B8\uD3F4\uB9AC\uC624\uC5D0 \uBCF4\uC774\uB294 \uD504\uB85C\uC81D\uD2B8\uAC00 \uC5C6\uC5B4\uC694." }), mine && _jsx("p", { className: "muted small", children: "\uC2DC\uB9AC\uC988 \uD654\uBA74\uC758 [\uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uD504\uB85C\uC81D\uD2B8]\uC5D0\uC11C \uC2DC\uB9AC\uC988\uB97C \uD504\uB85C\uC81D\uD2B8\uB85C \uBCF4\uC774\uAC8C \uD560 \uC218 \uC788\uC5B4\uC694." }), mine && _jsx(Link, { to: `/@${data.handle}/series`, className: "btn btn-primary", children: "\uB0B4 \uC2DC\uB9AC\uC988 \uBCF4\uAE30" })] })) : (_jsx("div", { className: "portfolio-projects", children: data.projects.map((p) => _jsx(ProjectCard, { project: p }, p.id)) }))] }));
}
function ProjectCard({ project: p }) {
    const first = p.posts[0]?.firstPublicAt;
    return (_jsxs("article", { className: "project-card", children: [_jsxs("div", { className: "project-main", children: [_jsxs("header", { children: [_jsx("h3", { className: "project-title", children: _jsx(Link, { to: p.url, children: p.name }) }), p.period && _jsx("p", { className: "muted small", children: p.period })] }), p.summary && _jsx("p", { className: "project-summary", children: p.summary }), p.tech.length > 0 && (_jsx("ul", { className: "card-tags project-tech", "aria-label": "\uC4F4 \uAE30\uC220", children: p.tech.map((t) => _jsx("li", { children: _jsx("span", { className: "card-tag", children: t }) }, t)) })), p.teamWork && _jsxs("section", { className: "project-text", children: [_jsx("h4", { children: "\uC6B0\uB9AC \uD300\uC774 \uD55C \uC77C" }), _jsx("p", { children: p.teamWork })] }), p.myRole && _jsxs("section", { className: "project-text", children: [_jsx("h4", { children: "\uC81C \uC5ED\uD560" }), _jsx("p", { children: p.myRole })] })] }), _jsxs("nav", { className: "branch-box branch-box-series project-branch", "aria-label": `${p.name} 글`, children: [_jsxs("header", { className: "branch-box-head", children: [_jsxs(Link, { to: p.url, className: "bl-branch bl-branch-series", "data-tip": "\uC2DC\uB9AC\uC988 \uAE00 \uBAA8\uB450 \uBCF4\uAE30", children: [_jsx(BranchMark, { kind: "SERIES" }), "\uAE00 ", p.posts.length, "\uD3B8"] }), first && _jsxs("span", { className: "muted small", title: fullDate(first), children: [monthDay(first), " \uC2DC\uC791"] })] }), p.posts.length === 0 ? _jsx("p", { className: "muted small", children: "\uC544\uC9C1 \uACF5\uAC1C\uD55C \uAE00\uC774 \uC5C6\uC5B4\uC694." }) : (_jsxs("ol", { className: "branch-box-list", reversed: true, children: [[...p.posts].reverse().map((post) => (_jsxs("li", { children: [_jsx("span", { className: "branch-box-dot", "aria-hidden": "true" }), _jsx(Link, { to: post.url, children: post.title })] }, post.id))), _jsxs("li", { className: "branch-box-fork", "aria-hidden": "true", children: [_jsx("span", { className: "branch-box-dot" }), "main\uC5D0\uC11C \uAC08\uB77C\uC9D0"] })] }))] })] }));
}
