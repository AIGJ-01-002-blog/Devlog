import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { count } from '../lib/admin';
/**
 * 관리자 통계의 막대그래프 (062). 계열이 하나라 범례 없이 제목이 이름을 대신한다.
 * 막대마다 마우스를 올리면 날짜와 값이 툴팁으로 뜨고(막대보다 넓은 칸이 대상), 화면 읽기 프로그램은 같은 값을 표로 읽는다.
 */
export function BarChart({ title, unit, points }) {
    const max = Math.max(0, ...points.map((p) => p.value));
    const total = points.reduce((s, p) => s + p.value, 0);
    // 축 이름은 처음·가운데·끝만 (좁은 화면에서 겹치지 않게)
    const marks = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);
    return (_jsxs("figure", { className: "bar-chart", children: [_jsxs("figcaption", { className: "bar-chart-head", children: [_jsx("span", { className: "bar-chart-title", children: title }), _jsxs("span", { className: "muted small", children: ["\uD569\uACC4 ", count(total), unit, " \u00B7 \uAC00\uC7A5 \uB9CE\uC740 \uB0A0 ", count(max), unit] })] }), _jsxs("div", { className: "bar-chart-plot", "aria-hidden": "true", children: [_jsx("span", { className: "bar-chart-max", children: count(max) }), _jsx("div", { className: "bar-chart-bars", children: points.map((p) => (_jsx("div", { className: "bar-chart-col", "data-tip": `${p.fullLabel} · ${count(p.value)}${unit}`, children: _jsx("div", { className: `bar-chart-bar${p.value === 0 ? ' zero' : ''}`, style: { height: max === 0 ? 0 : `${(p.value / max) * 100}%` } }) }, p.fullLabel))) })] }), _jsx("div", { className: "bar-chart-axis", "aria-hidden": "true", children: points.map((p, i) => _jsx("span", { children: marks.has(i) ? p.label : '' }, p.fullLabel)) }), _jsxs("table", { className: "sr-only", children: [_jsxs("caption", { children: [title, " \uB0A0\uC9DC\uBCC4 \uD45C"] }), _jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "\uB0A0\uC9DC" }), _jsx("th", { scope: "col", children: title })] }) }), _jsx("tbody", { children: points.map((p) => _jsxs("tr", { children: [_jsx("th", { scope: "row", children: p.fullLabel }), _jsxs("td", { children: [count(p.value), unit] })] }, p.fullLabel)) })] })] }));
}
