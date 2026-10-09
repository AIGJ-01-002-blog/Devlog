import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { ACCEPT, checkFile, fileErrorText, fileSize, listFiles, MAX_FILES, move, saveFiles, uploadFile, } from '../lib/files';
function uploadStatus(list) {
    const busy = list.filter((u) => !u.error).length;
    if (busy > 0)
        return `파일 ${busy}개를 올리는 중이에요`;
    const failed = list.length;
    return failed > 0 ? `파일 ${failed}개를 올리지 못했어요` : '';
}
/**
 * 편집 화면 아래 첨부 목록 (022 US1). 더하기·빼기·순서 바꾸기마다 서버에 바로 저장한다.
 * 저장은 하나씩 차례로 보내고, 실패하면 서버 목록으로 되돌린다.
 */
export function AttachmentEditor({ postId, published }) {
    const [files, setFiles] = useState(null);
    const [uploading, setUploading] = useState([]);
    const [error, setError] = useState(null);
    const input = useRef(null);
    const queue = useRef(Promise.resolve());
    const current = useRef([]);
    const seq = useRef(0);
    const pending = useRef(0);
    useEffect(() => {
        let alive = true;
        listFiles(postId).then((l) => { if (alive) {
            current.current = l;
            setFiles(l);
        } })
            .catch(() => { if (alive) {
            current.current = [];
            setFiles([]);
        } });
        return () => { alive = false; };
    }, [postId]);
    /** 화면을 먼저 바꾸고 서버에 저장한다. 앞의 저장이 끝난 뒤에 보낸다. */
    function save(next) {
        current.current = next;
        setFiles(next);
        setError(null);
        queue.current = queue.current.then(async () => {
            try {
                const saved = await saveFiles(postId, next.map((f) => f.id));
                if (current.current === next) {
                    current.current = saved;
                    setFiles(saved);
                }
            }
            catch (e) {
                setError(fileErrorText(e));
                const server = await listFiles(postId).catch(() => null);
                if (server) {
                    current.current = server;
                    setFiles(server);
                }
            }
        });
    }
    async function add(list) {
        if (!list)
            return;
        for (const file of Array.from(list)) {
            const key = ++seq.current;
            const problem = checkFile(file, current.current.length + pending.current);
            if (problem) {
                setUploading((u) => [...u, { key, name: file.name, error: problem }]);
                continue;
            }
            setUploading((u) => [...u, { key, name: file.name }]);
            pending.current++;
            try {
                const up = await uploadFile(file);
                setUploading((u) => u.filter((x) => x.key !== key));
                save([...current.current, up]);
            }
            catch (e) {
                setUploading((u) => u.map((x) => (x.key === key ? { ...x, error: fileErrorText(e) } : x)));
            }
            finally {
                pending.current--;
            }
        }
    }
    if (files === null)
        return null;
    const count = files.length;
    return (_jsxs("section", { className: "attachments attachments-edit", "aria-label": "\uCCA8\uBD80\uD30C\uC77C", children: [_jsxs("div", { className: "attachments-head", children: [_jsxs("h2", { children: ["\uCCA8\uBD80\uD30C\uC77C ", _jsxs("span", { className: "muted", children: [count, "/", MAX_FILES] })] }), _jsx("button", { type: "button", className: "btn btn-small", onClick: () => input.current?.click(), disabled: count >= MAX_FILES, children: "\uD30C\uC77C \uCCA8\uBD80" }), _jsx("input", { ref: input, type: "file", accept: ACCEPT, multiple: true, hidden: true, onChange: (e) => { void add(e.target.files); e.target.value = ''; } })] }), _jsxs("p", { className: "muted small", children: ["pdf, zip, txt, md, csv, docx, xlsx, pptx \u00B7 \uD30C\uC77C \uD558\uB098 20MB\uAE4C\uC9C0", published && ' · 발행한 글의 첨부는 바로 바뀌어요'] }), error && _jsx("p", { className: "error small", role: "alert", children: error }), _jsx("p", { className: "sr-only", role: "status", children: uploadStatus(uploading) }), (count > 0 || uploading.length > 0) && (_jsxs("ul", { className: "attachment-list", children: [files.map((f, i) => (_jsxs("li", { children: [_jsx("span", { className: "attachment-name", title: f.name, children: f.name }), _jsx("span", { className: "muted small", children: fileSize(f.sizeBytes) }), _jsxs("span", { className: "attachment-actions", children: [_jsx("button", { type: "button", className: "btn btn-text", "aria-label": `${f.name} 위로`, disabled: i === 0, onClick: () => save(move(files, i, -1)), children: "\u2191" }), _jsx("button", { type: "button", className: "btn btn-text", "aria-label": `${f.name} 아래로`, disabled: i === count - 1, onClick: () => save(move(files, i, 1)), children: "\u2193" }), _jsx("button", { type: "button", className: "btn btn-text danger", "aria-label": `${f.name} 빼기`, onClick: () => { if (confirm('첨부를 뺄까요?'))
                                            save(files.filter((x) => x.id !== f.id)); }, children: "\u2715" })] })] }, f.id))), uploading.map((u) => (_jsxs("li", { className: u.error ? 'attachment-failed' : 'attachment-pending', children: [_jsx("span", { className: "attachment-name", title: u.name, children: u.name }), u.error ? _jsx("span", { className: "error small", children: u.error }) : _jsx("span", { className: "muted small", children: "\uC62C\uB9AC\uB294 \uC911\u2026" }), u.error && (_jsx("span", { className: "attachment-actions", children: _jsx("button", { type: "button", className: "btn btn-text", "aria-label": `${u.name} 알림 닫기`, onClick: () => setUploading((l) => l.filter((x) => x.key !== u.key)), children: "\u2715" }) }))] }, `u${u.key}`)))] }))] }));
}
