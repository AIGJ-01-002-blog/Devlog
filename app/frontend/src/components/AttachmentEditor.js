import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { ACCEPT, checkFile, fileErrorText, fileSize, listFiles, MAX_FILES, move, saveFiles, uploadFile, } from '../lib/files';
import { t, tNodes } from '../lib/i18n';
function uploadStatus(list) {
    const busy = list.filter((u) => !u.error).length;
    if (busy > 0)
        return t('파일 {0}개를 올리는 중이에요', { 0: busy });
    const failed = list.length;
    return failed > 0 ? t('파일 {0}개를 올리지 못했어요', { 0: failed }) : '';
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
    return (_jsxs("section", { className: "attachments attachments-edit", "aria-label": t('첨부파일'), children: [_jsxs("div", { className: "attachments-head", children: [_jsx("h2", { children: tNodes('첨부파일 {0}', { 0: _jsxs("span", { className: "muted", children: [count, "/", MAX_FILES] }) }) }), _jsx("button", { type: "button", className: "btn btn-small", onClick: () => input.current?.click(), disabled: count >= MAX_FILES, children: t('파일 첨부') }), _jsx("input", { ref: input, type: "file", accept: ACCEPT, multiple: true, hidden: true, onChange: (e) => { void add(e.target.files); e.target.value = ''; } })] }), _jsxs("p", { className: "muted small", children: [t('pdf, zip, txt, md, csv, docx, xlsx, pptx · 파일 하나 20MB까지'), published && t(' · 발행한 글의 첨부는 바로 바뀌어요')] }), error && _jsx("p", { className: "error small", role: "alert", children: error }), _jsx("p", { className: "sr-only", role: "status", children: uploadStatus(uploading) }), (count > 0 || uploading.length > 0) && (_jsxs("ul", { className: "attachment-list", children: [files.map((f, i) => (_jsxs("li", { children: [_jsx("span", { className: "attachment-name", title: f.name, children: f.name }), _jsx("span", { className: "muted small", children: fileSize(f.sizeBytes) }), _jsxs("span", { className: "attachment-actions", children: [_jsx("button", { type: "button", className: "btn btn-text", "aria-label": t('{0} 위로', { 0: f.name }), disabled: i === 0, onClick: () => save(move(files, i, -1)), children: "\u2191" }), _jsx("button", { type: "button", className: "btn btn-text", "aria-label": t('{0} 아래로', { 0: f.name }), disabled: i === count - 1, onClick: () => save(move(files, i, 1)), children: "\u2193" }), _jsx("button", { type: "button", className: "btn btn-text danger", "aria-label": t('{0} 빼기', { 0: f.name }), onClick: () => { if (confirm(t('첨부를 뺄까요?')))
                                            save(files.filter((x) => x.id !== f.id)); }, children: "\u2715" })] })] }, f.id))), uploading.map((u) => (_jsxs("li", { className: u.error ? 'attachment-failed' : 'attachment-pending', children: [_jsx("span", { className: "attachment-name", title: u.name, children: u.name }), u.error ? _jsx("span", { className: "error small", children: u.error }) : _jsx("span", { className: "muted small", children: t('올리는 중…') }), u.error && (_jsx("span", { className: "attachment-actions", children: _jsx("button", { type: "button", className: "btn btn-text", "aria-label": t('{0} 알림 닫기', { 0: u.name }), onClick: () => setUploading((l) => l.filter((x) => x.key !== u.key)), children: "\u2715" }) }))] }, `u${u.key}`)))] }))] }));
}
