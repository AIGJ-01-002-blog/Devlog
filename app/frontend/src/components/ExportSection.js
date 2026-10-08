import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { downloadExport, exportErrorText, exportSummary } from '../lib/export';
/**
 * 내 글 내보내기 (056). Crowfoot의 Markdown 내보내기처럼, 내 글을 언제든 들고 나갈 수 있게 한다.
 * 받는 동안 버튼을 막고, 요청 제한(10분 5번)이나 오류는 글로 알린다.
 */
export function ExportSection() {
    const [count, setCount] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    useEffect(() => {
        exportSummary().then((r) => setCount(r.posts)).catch(() => setCount(null));
    }, []);
    async function download() {
        setBusy(true);
        setMessage(null);
        try {
            const name = await downloadExport();
            setMessage({ ok: true, text: `${name} 파일을 받았어요.` });
        }
        catch (e) {
            setMessage({ ok: false, text: exportErrorText(e) });
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs("section", { className: "settings-section", id: "export", children: [_jsx("h2", { children: "\uB0B4 \uAE00 \uB0B4\uBCF4\uB0B4\uAE30" }), _jsxs("p", { className: "muted small", children: ["\uD734\uC9C0\uD1B5\uC5D0 \uC5C6\uB294 \uB0B4 \uAE00", count != null ? ` ${count}개` : '', "\uB97C \uAE00\uB9C8\uB2E4 Markdown \uD30C\uC77C \uD558\uB098\uB85C \uBB36\uC5B4 zip\uC73C\uB85C \uBC1B\uC544\uC694. \uC81C\uBAA9\u00B7\uB0A0\uC9DC\u00B7\uD0DC\uADF8\u00B7\uC2DC\uB9AC\uC988\uAC00 \uD30C\uC77C \uB9E8 \uC704\uC5D0 \uC801\uD600 \uC788\uC5B4 \uB2E4\uB978 \uBE14\uB85C\uADF8\uB85C \uC62E\uAE30\uAC70\uB098 \uBC31\uC5C5\uD558\uAE30 \uC88B\uC544\uC694."] }), _jsx("button", { type: "button", className: "btn btn-outline", onClick: () => void download(), disabled: busy || count === 0, title: "\uBC1C\uD589\uD55C \uAE00(posts/)\uACFC \uC784\uC2DC\uAE00(drafts/)\uC744 Markdown zip \uD30C\uC77C\uB85C \uBC1B\uC544\uC694", children: busy ? '만드는 중…' : '⬇ Markdown으로 내보내기' }), message && _jsx("p", { className: message.ok ? 'small' : 'error small', role: message.ok ? 'status' : 'alert', children: message.text })] }));
}
