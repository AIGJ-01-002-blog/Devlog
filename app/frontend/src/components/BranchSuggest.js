import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { topicApi } from '../lib/branch';
import { seriesApi } from '../lib/series';
import { BranchMark } from './BranchList';
/** 태그를 바꾸고 잠시 뒤에 다시 묻는다 */
const DEBOUNCE_MS = 400;
/**
 * 발행 창 브랜치 추천 (072 2단계). 지금 태그와 가장 많이 겹치는 내 시리즈·주제 브랜치를 먼저 보여 준다.
 * [이 시리즈에 넣기]는 바로 저장하고, 주제 브랜치는 자동으로 묶이므로 [이어 붙이기]는 다음 계산 때 이어진다는 안내다.
 * [묶지 않기]를 고르면 이 글은 주제 브랜치로 자동으로 묶이지 않는다. 곁들이 기능이라 실패해도 발행은 그대로 된다.
 */
export function BranchSuggest({ postId, tags }) {
    const [result, setResult] = useState(null);
    const [accepted, setAccepted] = useState(false);
    const [picking, setPicking] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [version, setVersion] = useState(0);
    const key = tags.join('\u0000');
    useEffect(() => {
        let alive = true;
        const t = setTimeout(() => {
            topicApi.suggest(postId, tags).then((r) => { if (alive)
                setResult(r); }, () => { if (alive)
                setResult(null); });
        }, DEBOUNCE_MS);
        return () => { alive = false; clearTimeout(t); };
        // tags는 key로 비교한다(배열이 매번 새로 만들어져도 같은 태그면 다시 묻지 않는다)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postId, key, version]);
    const run = async (fn) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
        }
        catch (e) {
            setError(e instanceof ApiError ? e.message : '저장하지 못했어요. 다시 시도해 주세요.');
        }
        finally {
            setBusy(false);
        }
    };
    const intoSeries = (seriesId) => run(async () => {
        await seriesApi.assign(postId, seriesId);
        setPicking(null);
        setVersion((v) => v + 1);
    });
    const optOut = (on) => run(async () => {
        await topicApi.optOut(postId, on);
        setAccepted(false);
        setVersion((v) => v + 1);
    });
    const pickSeries = () => run(async () => setPicking(await seriesApi.mine()));
    if (!result)
        return null;
    const { current, series, topic, optedOut } = result;
    if (current?.kind === 'SERIES') {
        return (_jsxs("div", { className: "branch-suggest", role: "status", children: [_jsx(Label, { s: current }), " ", _jsx("span", { className: "muted small", children: "\uC2DC\uB9AC\uC988\uB85C \uC774\uC5B4\uC838\uC694." }), result.portfolio && _jsx("p", { className: "small branch-suggest-ok", children: "\uC774 \uC2DC\uB9AC\uC988\uB294 \uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uD504\uB85C\uC81D\uD2B8\uB77C \uC774 \uAE00\uB3C4 \uD3EC\uD2B8\uD3F4\uB9AC\uC624\uC5D0 \uBCF4\uC5EC\uC694." })] }));
    }
    const best = series ?? topic ?? current;
    return (_jsxs("div", { className: "branch-suggest", children: [_jsx("p", { className: "branch-suggest-title", children: "\uBE0C\uB79C\uCE58" }), optedOut ? (_jsxs("p", { className: "small", children: ["\uC774 \uAE00\uC740 \uBE44\uC2B7\uD55C \uAE00\uACFC \uC790\uB3D9\uC73C\uB85C \uBB36\uC9C0 \uC54A\uC544\uC694.", ' ', _jsx("button", { type: "button", className: "btn btn-text btn-small", disabled: busy, onClick: () => void optOut(false), children: "\uB2E4\uC2DC \uBB36\uAE30" })] })) : current ? (_jsxs("p", { className: "small", children: [_jsx(Label, { s: current }), " \uBE0C\uB79C\uCE58\uC5D0 \uC774\uC5B4\uC838 \uC788\uC5B4\uC694."] })) : best ? (_jsxs("p", { className: "small", children: ["\uAC00\uC7A5 \uBE44\uC2B7\uD55C \uBE0C\uB79C\uCE58: ", _jsx(Label, { s: best }), best.shared.length > 0 && _jsxs("span", { className: "muted", children: [" \u00B7 \uD568\uAED8 \uC4F4 \uD0DC\uADF8 ", best.shared.map((t) => `#${t}`).join(' ')] })] })) : (_jsx("p", { className: "small muted", children: "\uBE44\uC2B7\uD55C \uBE0C\uB79C\uCE58\uAC00 \uC544\uC9C1 \uC5C6\uC5B4\uC694. \uBC1C\uD589\uD558\uBA74 main\uC5D0 \uC0C8 \uAE00\uB85C \uC62C\uB77C\uAC00\uC694." })), accepted && topic && _jsxs("p", { className: "small branch-suggest-ok", role: "status", children: ["\uBC1C\uD589\uD558\uBA74 \uB2E4\uC74C \uACC4\uC0B0 \uB54C ", topic.name, " \uBE0C\uB79C\uCE58\uC5D0 \uC774\uC5B4\uC838\uC694."] }), picking && (_jsxs("label", { className: "small branch-suggest-pick", children: [_jsx("span", { className: "sr-only", children: "\uB123\uC744 \uC2DC\uB9AC\uC988" }), _jsxs("select", { defaultValue: "", disabled: busy, onChange: (e) => { if (e.target.value)
                            void intoSeries(Number(e.target.value)); }, children: [_jsx("option", { value: "", disabled: true, children: picking.length ? '시리즈 고르기' : '시리즈가 없어요. 글쓰기 화면 [시리즈]에서 만들 수 있어요' }), picking.map((s) => _jsxs("option", { value: s.id, children: [s.name, " (", s.postCount, ")"] }, s.id))] })] })), _jsxs("div", { className: "row branch-suggest-actions", children: [series?.seriesId != null && (_jsx("button", { type: "button", className: "btn btn-outline btn-small", disabled: busy, onClick: () => void intoSeries(series.seriesId), "data-tip": `이 글을 ${series.name} 시리즈 마지막 편으로 넣어요`, children: "\uC774 \uC2DC\uB9AC\uC988\uC5D0 \uB123\uAE30" })), !series && topic && !optedOut && !accepted && (_jsx("button", { type: "button", className: "btn btn-outline btn-small", onClick: () => setAccepted(true), "data-tip": "\uBE44\uC2B7\uD55C \uAE00\uC740 \uC790\uB3D9\uC73C\uB85C \uC774\uC5B4\uC838\uC694. \uBC1C\uD589 \uB4A4 \uB2E4\uC74C \uACC4\uC0B0 \uB54C \uBD99\uC5B4\uC694", children: "\uC774 \uBE0C\uB79C\uCE58\uC5D0 \uC774\uC5B4 \uBD99\uC774\uAE30" })), !picking && (_jsx("button", { type: "button", className: "btn btn-text btn-small", disabled: busy, onClick: () => void pickSeries(), "data-tip": "\uB0B4 \uC2DC\uB9AC\uC988 \uC911 \uD558\uB098\uB97C \uACE8\uB77C \uB123\uC5B4\uC694", children: "\uB0B4 \uC2DC\uB9AC\uC988\uC5D0 \uB123\uAE30" })), !optedOut && (_jsx("button", { type: "button", className: "btn btn-text btn-small", disabled: busy, onClick: () => void optOut(true), "data-tip": "\uC774 \uAE00\uC740 \uBE44\uC2B7\uD55C \uAE00\uACFC \uC790\uB3D9\uC73C\uB85C \uBB36\uC9C0 \uC54A\uC544\uC694", children: "\uBB36\uC9C0 \uC54A\uAE30" }))] }), error && _jsx("p", { className: "error small", role: "alert", children: error })] }));
}
function Label({ s }) {
    const body = _jsxs(_Fragment, { children: [_jsx(BranchMark, { kind: s.kind }), s.name] });
    const cls = `bl-branch bl-branch-${s.kind.toLowerCase()}`;
    return s.url ? _jsx("a", { href: s.url, className: cls, target: "_blank", rel: "noopener", "data-tip": "\uC0C8 \uD0ED\uC5D0\uC11C \uBE0C\uB79C\uCE58 \uBCF4\uAE30", children: body }) : _jsx("span", { className: cls, children: body });
}
