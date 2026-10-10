import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { topicApi } from '../lib/branch';
import { seriesApi } from '../lib/series';
import { BranchMark } from './BranchList';
import { t, tNodes } from '../lib/i18n';
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
            setError(e instanceof ApiError ? e.message : t('저장하지 못했어요. 다시 시도해 주세요.'));
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
        return (_jsxs("div", { className: "branch-suggest", role: "status", children: [_jsx(Label, { s: current }), " ", _jsx("span", { className: "muted small", children: t('시리즈로 이어져요.') }), result.portfolio && _jsx("p", { className: "small branch-suggest-ok", children: t('이 시리즈는 포트폴리오 프로젝트라 이 글도 포트폴리오에 보여요.') })] }));
    }
    const best = series ?? topic ?? current;
    return (_jsxs("div", { className: "branch-suggest", children: [_jsx("p", { className: "branch-suggest-title", children: t('브랜치') }), optedOut ? (_jsx("p", { className: "small", children: tNodes('이 글은 비슷한 글과 자동으로 묶지 않아요. {0}', { 0: _jsx("button", { type: "button", className: "btn btn-text btn-small", disabled: busy, onClick: () => void optOut(false), children: t('다시 묶기') }) }) })) : current ? (_jsx("p", { className: "small", children: tNodes('{0} 브랜치에 이어져 있어요.', { 0: _jsx(Label, { s: current }) }) })) : best ? (_jsxs("p", { className: "small", children: [t('가장 비슷한 브랜치:'), " ", _jsx(Label, { s: best }), best.shared.length > 0 && _jsxs("span", { className: "muted", children: ["  ", tNodes('· 함께 쓴 태그 {0}', { 0: best.shared.map((t) => `#${t}`).join(' ') })] })] })) : (_jsx("p", { className: "small muted", children: t('비슷한 브랜치가 아직 없어요. 발행하면 main에 새 글로 올라가요.') })), accepted && topic && _jsx("p", { className: "small branch-suggest-ok", role: "status", children: tNodes('발행하면 다음 계산 때 {0} 브랜치에 이어져요.', { 0: topic.name }) }), picking && (_jsxs("label", { className: "small branch-suggest-pick", children: [_jsx("span", { className: "sr-only", children: t('넣을 시리즈') }), _jsxs("select", { defaultValue: "", disabled: busy, onChange: (e) => { if (e.target.value)
                            void intoSeries(Number(e.target.value)); }, children: [_jsx("option", { value: "", disabled: true, children: picking.length ? t('시리즈 고르기') : t('시리즈가 없어요. 글쓰기 화면 [시리즈]에서 만들 수 있어요') }), picking.map((s) => _jsxs("option", { value: s.id, children: [s.name, " (", s.postCount, ")"] }, s.id))] })] })), _jsxs("div", { className: "row branch-suggest-actions", children: [series?.seriesId != null && (_jsx("button", { type: "button", className: "btn btn-outline btn-small", disabled: busy, onClick: () => void intoSeries(series.seriesId), "data-tip": t('이 글을 {0} 시리즈 마지막 편으로 넣어요', { 0: series.name }), children: t('이 시리즈에 넣기') })), !series && topic && !optedOut && !accepted && (_jsx("button", { type: "button", className: "btn btn-outline btn-small", onClick: () => setAccepted(true), "data-tip": t('비슷한 글은 자동으로 이어져요. 발행 뒤 다음 계산 때 붙어요'), children: t('이 브랜치에 이어 붙이기') })), !picking && (_jsx("button", { type: "button", className: "btn btn-text btn-small", disabled: busy, onClick: () => void pickSeries(), "data-tip": t('내 시리즈 중 하나를 골라 넣어요'), children: t('내 시리즈에 넣기') })), !optedOut && (_jsx("button", { type: "button", className: "btn btn-text btn-small", disabled: busy, onClick: () => void optOut(true), "data-tip": t('이 글은 비슷한 글과 자동으로 묶지 않아요'), children: t('묶지 않기') }))] }), error && _jsx("p", { className: "error small", role: "alert", children: error })] }));
}
function Label({ s }) {
    const body = _jsxs(_Fragment, { children: [_jsx(BranchMark, { kind: s.kind }), s.name] });
    const cls = `bl-branch bl-branch-${s.kind.toLowerCase()}`;
    return s.url ? _jsx("a", { href: s.url, className: cls, target: "_blank", rel: "noopener", "data-tip": t('새 탭에서 브랜치 보기'), children: body }) : _jsx("span", { className: cls, children: body });
}
