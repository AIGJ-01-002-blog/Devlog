import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { branchLabel, branchLanes, dayLabel } from '../lib/branchLanes';
import { fullDate, relativeDate } from '../lib/format';
import { Link } from '../lib/router';
import { Avatar } from './Avatar';
import { CardStats, CardTags } from './PostCard';
import { t } from '../lib/i18n';
/**
 * 홈 최신 글의 브랜치 그래프 목록 (072). 왼쪽 그래프 칸에 main과 브랜치 줄을 그리고, 오른쪽에 글을 한 줄씩 보인다.
 * graph=false면 그래프 없이 같은 모양의 목록만 그린다(트렌딩: 순위라 시간 흐름이 없다).
 * 그래프는 장식이라 화면 읽기 프로그램에는 숨기고, 브랜치는 이름표 글자로 알린다.
 */
export function BranchList({ items, hasMore, graph = true }) {
    const rows = branchLanes(items, hasMore);
    const lanes = graph ? Math.max(0, ...rows.flatMap((r) => [r.lane, ...r.segments.map((s) => s.lane)])) : 0;
    const style = { '--lanes': lanes };
    let prevDay = '';
    return (_jsx("ol", { className: `branch-list${graph ? '' : ' branch-list-plain'}`, style: style, children: rows.flatMap((row, i) => {
            const at = row.card.firstPublicAt ?? row.card.publishedAt;
            const day = graph ? dayLabel(at) : '';
            const out = [];
            if (graph && day !== prevDay) {
                out.push(_jsxs("li", { className: "bl-day", "aria-hidden": "true", children: [_jsxs("span", { className: "bl-graph", children: [i > 0 && _jsx("span", { className: "bl-line bl-full", style: laneStyle(0) }), row.above.map((a) => _jsx("span", { className: `bl-line bl-full bl-${a.kind.toLowerCase()}`, style: laneStyle(a.lane) }, a.lane))] }), _jsx("span", { className: "bl-day-label", children: day })] }, `d${row.card.id}`));
            }
            prevDay = day;
            out.push(_jsx(BranchRow, { row: row, graph: graph }, row.card.id));
            return out;
        }) }));
}
function laneStyle(lane) {
    return { '--lane': lane };
}
function BranchRow({ row, graph }) {
    const { card } = row;
    const b = card.branch && card.branch.total > 1 ? card.branch : null;
    const at = card.firstPublicAt ?? card.publishedAt;
    return (_jsxs("li", { className: "bl-row", children: [graph && (_jsxs("span", { className: "bl-graph", "aria-hidden": "true", children: [row.mainTop && _jsx("span", { className: "bl-line bl-top", style: laneStyle(0) }), row.mainBottom && _jsx("span", { className: "bl-line bl-bottom", style: laneStyle(0) }), row.segments.map((s) => {
                        const kind = `bl-${s.kind.toLowerCase()}`;
                        return (_jsxs("span", { children: [s.top && _jsx("span", { className: `bl-line bl-top ${kind}`, style: laneStyle(s.lane) }), s.bottom && _jsx("span", { className: `bl-line bl-bottom ${kind}`, style: laneStyle(s.lane) }), s.fork && _jsx("span", { className: `bl-fork ${kind}`, style: laneStyle(s.lane) })] }, s.lane));
                    }), _jsx("span", { className: `bl-dot bl-dot-${row.dot.toLowerCase()}`, style: laneStyle(row.lane) })] })), _jsxs("article", { className: "bl-body", children: [_jsxs("div", { className: "bl-text", children: [b && (_jsxs(Link, { to: b.url, className: `bl-branch bl-branch-${b.kind.toLowerCase()}`, "data-tip": b.kind === 'SERIES' ? t('이 시리즈 글 모두 보기') : t('태그·내용이 비슷해 자동으로 묶인 글만 보기'), children: [_jsx(BranchMark, { kind: b.kind }), branchLabel(b)] })), _jsx("h2", { className: "bl-title", children: _jsx(Link, { to: card.url, children: card.title }) }), card.excerpt && _jsx("p", { className: "bl-excerpt", children: card.excerpt }), _jsx(CardTags, { tags: card.tags ?? [] }), _jsxs("div", { className: "bl-meta", children: [_jsxs(Link, { to: `/@${card.author.handle}`, className: "bl-author", children: [_jsx(Avatar, { src: card.author.profileImageUrl, name: card.author.nickname, seed: card.author.handle, size: 20 }), _jsx("span", { children: card.author.nickname })] }), _jsx("span", { "aria-hidden": "true", children: "\u00B7" }), _jsx("time", { dateTime: at, title: fullDate(at), children: relativeDate(at) }), _jsx(CardStats, { card: card })] })] }), card.thumbnailUrl && (_jsx(Link, { to: card.url, className: "bl-thumb", tabIndex: -1, "aria-hidden": "true", "aria-label": card.title, children: _jsx("img", { src: card.thumbnailUrl, alt: "", width: 240, height: 160, loading: "lazy" }) }))] })] }));
}
/** 이름표 앞 작은 갈래 모양. 시리즈는 실선, 주제는 점선 */
export function BranchMark({ kind }) {
    return (_jsxs("svg", { className: "bl-mark", width: "12", height: "12", viewBox: "0 0 12 12", "aria-hidden": "true", children: [_jsx("circle", { cx: "3", cy: "2.5", r: "1.6", fill: "currentColor" }), _jsx("circle", { cx: "9", cy: "9.5", r: "1.6", fill: "currentColor" }), _jsx("path", { d: "M3 4v2.5c0 1.5 1 3 4.5 3", fill: "none", stroke: "currentColor", strokeWidth: "1.4", strokeDasharray: kind === 'TOPIC' ? '1.6 1.4' : undefined })] }));
}
