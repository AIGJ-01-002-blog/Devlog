import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ApiError } from '../lib/api';
import { SERIES_NAME_MAX, seriesApi, seriesNameError } from '../lib/series';
/**
 * 글쓰기 화면의 [시리즈] (024 US1). 고르는 즉시 저장한다. 임시글도 넣을 수 있고 독자에게는 발행된 뒤에 보인다.
 * "새 시리즈"는 만들고 바로 이 글을 넣는다.
 */
export function SeriesPicker({ postId }) {
    const [series, setSeries] = useState(null);
    const [current, setCurrent] = useState(null);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        let alive = true;
        Promise.all([seriesApi.mine(), seriesApi.ofPost(postId)])
            .then(([mine, nav]) => { if (alive) {
            setSeries(mine);
            setCurrent(nav?.id ?? null);
        } })
            .catch(() => { if (alive)
            setSeries([]); });
        return () => { alive = false; };
    }, [postId]);
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
    const choose = (value) => {
        if (value === 'new')
            return setCreating(true);
        const id = value ? Number(value) : null;
        void run(async () => {
            await seriesApi.assign(postId, id);
            setCurrent(id);
        });
    };
    const create = () => {
        const invalid = seriesNameError(name);
        if (invalid)
            return setError(invalid);
        void run(async () => {
            const made = await seriesApi.create(name);
            await seriesApi.assign(postId, made.id);
            setSeries((l) => [{ ...made, postCount: 1 }, ...(l ?? [])]);
            setCurrent(made.id);
            setCreating(false);
            setName('');
        });
    };
    if (!series)
        return null;
    return (_jsxs("div", { className: "series-picker", children: [_jsxs("label", { children: [_jsx("span", { className: "muted small", children: "\uC2DC\uB9AC\uC988" }), ' ', _jsxs("select", { value: current ?? '', disabled: busy, onChange: (e) => choose(e.target.value), children: [_jsx("option", { value: "", children: "\uC2DC\uB9AC\uC988 \uC5C6\uC74C" }), series.map((s) => _jsxs("option", { value: s.id, children: [s.name, " (", s.postCount, ")"] }, s.id)), _jsx("option", { value: "new", children: "+ \uC0C8 \uC2DC\uB9AC\uC988" })] })] }), creating && (_jsxs("span", { className: "row series-new", children: [_jsx("input", { "aria-label": "\uC0C8 \uC2DC\uB9AC\uC988 \uC774\uB984", value: name, maxLength: SERIES_NAME_MAX, autoFocus: true, placeholder: "\uC2DC\uB9AC\uC988 \uC774\uB984", onChange: (e) => setName(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') {
                            e.preventDefault();
                            create();
                        } } }), _jsx("button", { type: "button", className: "btn btn-primary", disabled: busy, onClick: create, children: "\uB9CC\uB4E4\uAE30" }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => { setCreating(false); setError(null); }, children: "\uCDE8\uC18C" })] })), error && _jsx("small", { className: "error", role: "alert", children: error })] }));
}
