import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { downloadUrl, fileSize, listFiles } from '../lib/files';
/** 글 본문 아래 첨부 목록 (022 US2). 첨부가 없으면 아무것도 그리지 않는다. */
export function AttachmentList({ postId }) {
    const [files, setFiles] = useState([]);
    useEffect(() => {
        let alive = true;
        listFiles(postId).then((l) => { if (alive)
            setFiles(l); }).catch(() => { if (alive)
            setFiles([]); });
        return () => { alive = false; };
    }, [postId]);
    if (files.length === 0)
        return null;
    return (_jsxs("section", { className: "attachments", "aria-label": "\uCCA8\uBD80\uD30C\uC77C", children: [_jsxs("h2", { children: ["\uCCA8\uBD80\uD30C\uC77C ", _jsx("span", { className: "muted", children: files.length })] }), _jsx("ul", { className: "attachment-list", children: files.map((f) => (_jsxs("li", { children: [_jsxs("a", { className: "attachment-name", href: downloadUrl(postId, f.id), title: f.name, children: [_jsx("span", { "aria-hidden": "true", children: "\uD83D\uDCCE" }), " ", f.name] }), _jsx("span", { className: "muted small", children: fileSize(f.sizeBytes) })] }, f.id))) })] }));
}
