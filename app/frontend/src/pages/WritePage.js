import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { ConflictDialog } from '../components/ConflictDialog';
import { Modal } from '../components/Modal';
import { AiTagSuggest } from '../components/AiTagSuggest';
import { AttachmentEditor } from '../components/AttachmentEditor';
import { PrepublishCheck } from '../components/PrepublishCheck';
import { RevisionHistory } from '../components/RevisionHistory';
import { SeriesPicker } from '../components/SeriesPicker';
import { TagInput } from '../components/TagInput';
import { ThumbnailPicker } from '../components/ThumbnailPicker';
import { api, ApiError } from '../lib/api';
import { Autosaver } from '../lib/autosave';
import { useAuth } from '../lib/auth';
import { clock } from '../lib/format';
import { highlightWithin } from '../lib/highlight';
import { localDrafts } from '../lib/localDrafts';
import { ALT_SOFT_LIMIT, bodyImages, formatBytes, forPreview, pendingIds, restorePendingInPreview, setAlt } from '../lib/postImages';
import { useImageUploads } from '../lib/useImageUploads';
import { decideRestore } from '../lib/restore';
import { navigate, setLeaveGuard } from '../lib/router';
import { isPublishField, SUMMARY_MAX, summaryLength } from '../lib/postSummary';
import { initialThumbnail, thumbnailRequest } from '../lib/postThumbnail';
import { aiHint } from '../lib/mcp';
import { addTag, tagErrors } from '../lib/tags';
import { NotFoundPage } from './NotFoundPage';
/** [새 글]: 임시글을 먼저 만들고 에디터 주소로 바꾼다 (docs/04 §2-5). */
export function NewPostPage() {
    const [error, setError] = useState(null);
    const started = useRef(false);
    useEffect(() => {
        if (started.current)
            return;
        started.current = true;
        api('/api/posts', { method: 'POST', body: {} })
            .then((p) => navigate(`/write/${p.id}`, { replace: true }))
            .catch((e) => setError(e instanceof ApiError ? e.message : '새 글을 만들지 못했어요.'));
    }, []);
    return _jsx("main", { className: "container narrow", children: _jsx("p", { className: "muted center", children: error ?? '새 글을 준비하는 중…' }) });
}
export function WritePage({ id }) {
    const { me } = useAuth();
    const memberId = me?.member?.id;
    const [loaded, setLoaded] = useState(null);
    const [missing, setMissing] = useState(false);
    useEffect(() => {
        if (memberId == null)
            return;
        setLoaded(null);
        api(`/api/posts/${encodeURIComponent(id)}/edit`)
            .then(async (view) => setLoaded({ view, local: await localDrafts.get(memberId, view.id) }))
            .catch(() => setMissing(true));
    }, [id, memberId]);
    if (missing)
        return _jsx(NotFoundPage, {});
    if (!loaded || memberId == null)
        return _jsx("main", { className: "container", children: _jsx("p", { className: "muted center", children: "\uBD88\uB7EC\uC624\uB294 \uC911\u2026" }) });
    return _jsx(Editor, { view: loaded.view, local: loaded.local, memberId: memberId }, loaded.view.id);
}
const LOCAL_IDLE_MS = 1000;
function Editor({ view, local, memberId }) {
    const serverContent = { title: view.title, contentMd: view.contentMd, version: view.version, savedAt: view.savedAt };
    const [restore] = useState(() => decideRestore(view, local));
    const restored = restore === 'load' || restore === 'conflict';
    const [title, setTitle] = useState(restored ? local.title : view.title);
    const [content, setContent] = useState(restored ? local.contentMd : view.contentMd);
    const [state, setState] = useState({ kind: 'saved', at: new Date(view.savedAt) });
    const [showConflict, setShowConflict] = useState(restore === 'conflict');
    const [notice, setNotice] = useState(restore === 'load' ? '이 기기에 저장되지 않은 변경을 불러왔어요.' : null);
    const [localStored, setLocalStored] = useState(false);
    const [backups, setBackups] = useState([]);
    const [showBackups, setShowBackups] = useState(false);
    const [showRevisions, setShowRevisions] = useState(false);
    const [preview, setPreview] = useState('');
    const [previewError, setPreviewError] = useState(null);
    const [tab, setTab] = useState('write');
    const [publishing, setPublishing] = useState(false);
    const [showPublish, setShowPublish] = useState(false);
    const [visibility, setVisibility] = useState(view.visibility);
    // 태그는 발행할 때만 확정된다. 다시 발행할 때는 지금 달린 태그로 미리 채운다 (010 FR-006·FR-014)
    const [tags, setTags] = useState(view.tags ?? []);
    // 짧은 소개도 발행할 때 확정된다. 비우면 목록이 본문 앞부분으로 요약한다 (045)
    const [summary, setSummary] = useState(view.summary ?? '');
    // 썸네일도 발행할 때 확정된다. 고르지 않으면 본문 첫 사진 (047)
    const [thumbnail, setThumbnail] = useState(() => initialThumbnail(view));
    const [thumbnailBusy, setThumbnailBusy] = useState(false);
    const [errors, setErrors] = useState({});
    // AI(MCP)가 만든 임시글이면 태그 제안을 발행 창에 미리 채우고, 발행 요청이 있으면 알린다 (052)
    const [hint, setHint] = useState(null);
    const [showAlts, setShowAlts] = useState(false);
    const [dragging, setDragging] = useState(false);
    const saver = useRef(null);
    const previewRef = useRef(null);
    const bodyRef = useRef(null);
    const fileRef = useRef(null);
    const contentRef = useRef(content);
    contentRef.current = content;
    const getContent = useCallback(() => contentRef.current, []);
    const images = useImageUploads(memberId, view.id, getContent, (update) => setContent((c) => {
        const next = update(c);
        contentRef.current = next;
        return next;
    }));
    /** 커서 자리에 원문을 넣는다(사진 업로드 대기 표시). 선택한 글자가 있으면 바꾼다. */
    const insertAtCursor = useCallback((text) => {
        const el = bodyRef.current;
        setContent((c) => {
            const start = el ? el.selectionStart : c.length;
            const end = el ? el.selectionEnd : c.length;
            const before = c.slice(0, start);
            const lead = before && !before.endsWith('\n') ? '\n' : '';
            const next = before + lead + text + c.slice(end);
            contentRef.current = next;
            const caret = start + lead.length + text.length;
            requestAnimationFrame(() => { if (el) {
                el.selectionStart = el.selectionEnd = caret;
            } });
            return next;
        });
    }, []);
    const addFiles = (list) => {
        const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/'));
        if (files.length)
            void images.add(files, insertAtCursor);
        return files.length > 0;
    };
    useEffect(() => {
        if (view.status !== 'DRAFT')
            return;
        let alive = true;
        aiHint(view.id).then((h) => {
            if (!alive || !h)
                return;
            setHint(h);
            if (h.tags.length)
                setTags((cur) => (cur.length ? cur : h.tags));
        }).catch(() => undefined);
        return () => { alive = false; };
    }, [view.id, view.status]);
    if (saver.current == null) {
        saver.current = new Autosaver({ title: view.title, contentMd: view.contentMd }, view.version, {
            send: (c, base, keepalive) => api(`/api/posts/${view.id}/autosave`, { method: 'PUT', body: { ...c, baseVersion: base }, keepalive }),
            onState: setState,
            onVersion: () => undefined,
        });
        if (restore === 'conflict')
            saver.current.markConflict(serverContent);
    }
    // 이 기기에 남기기 (FR-001·FR-002): 입력이 1초 멈추면 서버 요청 없이. 서버 저장이 끝나도 미전송 여부를 갱신한다
    const latest = useRef({ title, content });
    latest.current = { title, content };
    const storeLocal = useCallback(async () => {
        const s = saver.current;
        const ok = await localDrafts.put({
            memberId, postId: view.id, title: latest.current.title, contentMd: latest.current.content,
            baseVersion: s.version, unsynced: s.hasUnsaved || s.isConflict, pendingImages: pendingIds(latest.current.content),
            savedAt: Date.now(),
        });
        setLocalStored(ok);
    }, [memberId, view.id]);
    useEffect(() => {
        saver.current?.change({ title, contentMd: content });
        images.refreshCount();
        setLocalStored(false);
        const t = setTimeout(() => void storeLocal(), LOCAL_IDLE_MS);
        return () => clearTimeout(t);
    }, [title, content, storeLocal]);
    useEffect(() => {
        if (state.kind === 'saved')
            void storeLocal();
    }, [state, storeLocal]);
    useEffect(() => {
        if (restore === 'discard')
            void localDrafts.remove(memberId, view.id);
        void localDrafts.backups(memberId, view.id).then(setBackups);
    }, [restore, memberId, view.id]);
    // 탭이 가려지거나 떠날 때 바로 저장, 미저장이면 떠나기 전에 묻는다 (FR-011, FR-015)
    useEffect(() => {
        const s = saver.current;
        const onHide = () => { if (document.visibilityState === 'hidden')
            void s.flushNow(true); };
        const onPageHide = () => void s.flushNow(true);
        const onBeforeUnload = (e) => {
            if (s.hasUnsaved || s.isConflict)
                e.preventDefault();
        };
        const onOnline = () => s.retryNow();
        document.addEventListener('visibilitychange', onHide);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('beforeunload', onBeforeUnload);
        window.addEventListener('online', onOnline);
        setLeaveGuard(() => !(s.hasUnsaved || s.isConflict) || confirm('저장되지 않은 변경이 있어요. 떠날까요?'));
        return () => {
            document.removeEventListener('visibilitychange', onHide);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener('beforeunload', onBeforeUnload);
            window.removeEventListener('online', onOnline);
            setLeaveGuard(null);
            // 미전송 내용이 없으면 이 글의 기기 데이터를 지운다 (FR-009). 있으면 남겨 다시 열 때 복구한다
            if (!(s.hasUnsaved || s.isConflict))
                void localDrafts.remove(memberId, view.id);
            void s.flushNow(true);
            s.stop();
        };
    }, []);
    // 미리보기: 발행과 같은 변환기(서버)로 만든다 (FR-003)
    useEffect(() => {
        const t = setTimeout(() => {
            if (!content.trim())
                return setPreview('');
            // 업로드 대기 사진은 이 기기 사진으로 보여 준다 (FR-016)
            api('/api/markdown/preview', { method: 'POST', body: { contentMd: forPreview(content) } })
                .then((r) => { setPreview(restorePendingInPreview(r.html, images.localUrls.current)); setPreviewError(null); })
                .catch((e) => setPreviewError(e instanceof ApiError ? e.message : '미리보기를 만들지 못했어요.'));
        }, 500);
        return () => clearTimeout(t);
    }, [content]);
    useEffect(() => { void highlightWithin(previewRef.current); }, [preview, tab]);
    const current = () => ({ title, contentMd: content });
    const saveNow = useCallback(async (base) => {
        const s = saver.current;
        // 충돌 중 [저장]은 비교 창으로 (FR-011). 비교 창의 [편집 중인 내용으로 저장]만 서버 버전을 넘겨 덮어쓴다
        if (s.isConflict && base === undefined) {
            setShowConflict(true);
            return false;
        }
        setState({ kind: 'saving' });
        try {
            const r = await api(`/api/posts/${view.id}`, { method: 'PUT', body: { title, contentMd: content, baseVersion: base ?? s.version } });
            s.reset({ title, contentMd: content }, r.version);
            setState({ kind: 'saved', at: new Date(r.savedAt) });
            setShowConflict(false);
            return true;
        }
        catch (e) {
            handleError(e);
            return false;
        }
    }, [title, content, view.id]);
    const handleError = (e) => {
        if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') {
            setState({ kind: 'conflict', server: e.details.server });
            setShowConflict(true);
        }
        else if (e instanceof ApiError) {
            const map = {};
            e.errors.forEach((f) => (map[f.field] = f.message));
            setErrors(map);
            setState({ kind: 'error', message: e.errors.length ? '입력값을 확인해 주세요.' : e.message });
        }
        else {
            setState({ kind: 'offline' });
        }
    };
    const publish = async () => {
        if (state.kind === 'conflict')
            return setShowConflict(true);
        setPublishing(true);
        setErrors({});
        const key = crypto.randomUUID();
        const body = { title, contentMd: content, summary, tags, visibility, baseVersion: saver.current.version, ...thumbnailRequest(thumbnail) };
        try {
            for (let attempt = 0;; attempt++) {
                try {
                    const r = await api(`/api/posts/${view.id}/publish`, { method: 'POST', body, headers: { 'Idempotency-Key': key } });
                    saver.current.reset({ title, contentMd: content }, r.version);
                    saver.current.stop();
                    await localDrafts.remove(memberId, view.id);
                    setLeaveGuard(null);
                    navigate(r.url);
                    return;
                }
                catch (e) {
                    // 같은 키의 요청이 아직 처리 중이면 1초 뒤 같은 키로 다시 확인한다 (docs/05 §5)
                    if (e instanceof ApiError && e.code === 'IN_PROGRESS' && attempt < 10) {
                        await new Promise((res) => setTimeout(res, 1000));
                        continue;
                    }
                    throw e;
                }
            }
        }
        catch (e) {
            // 태그·짧은 소개·썸네일 오류는 발행 창 안에 보여 준다
            if (!(e instanceof ApiError && e.errors.some((f) => isPublishField(f.field))))
                setShowPublish(false);
            handleError(e);
        }
        finally {
            setPublishing(false);
        }
    };
    const conflictServer = state.kind === 'conflict' ? state.server : null;
    return (_jsxs("main", { className: "editor", children: [_jsxs("div", { className: "editor-toolbar", children: [_jsxs("div", { className: "row", children: [_jsx("button", { type: "button", className: "btn btn-text", onClick: () => history.length > 1 ? history.back() : navigate('/manage/posts'), children: "\u2190 \uB098\uAC00\uAE30" }), _jsx(SaveIndicator, { state: state, localStored: localStored, onCompare: () => setShowConflict(true) })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "tabs-mobile", role: "tablist", children: [_jsx("button", { type: "button", role: "tab", "aria-selected": tab === 'write', onClick: () => setTab('write'), children: "\uC4F0\uAE30" }), _jsx("button", { type: "button", role: "tab", "aria-selected": tab === 'preview', onClick: () => setTab('preview'), children: "\uBBF8\uB9AC\uBCF4\uAE30" })] }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => fileRef.current?.click(), title: "jpg\u00B7png\u00B7gif\u00B7webp, 10MB\uAE4C\uC9C0. \uC6C0\uC9C1\uC774\uB294 webp\u00B7png\uB294 \uCCAB \uC7A5\uBA74\uB9CC \uB0A8\uC544\uC694.", children: "\uD83D\uDDBC \uC0AC\uC9C4" }), _jsx("input", { ref: fileRef, type: "file", accept: "image/jpeg,image/png,image/gif,image/webp", multiple: true, hidden: true, onChange: (e) => { addFiles(e.target.files); e.target.value = ''; } }), _jsx("button", { type: "button", className: "btn btn-outline", onClick: () => saveNow(), children: "\uC800\uC7A5" }), view.status === 'PUBLISHED' && (_jsx("button", { type: "button", className: "btn btn-text", onClick: () => setShowRevisions(true), title: "\uBC1C\uD589\uD55C \uD310\uC744 \uC9C0\uAE08 \uB0B4\uC6A9\uACFC \uBE44\uAD50\uD558\uACE0, \uC774\uC804 \uD310\uC744 \uBD88\uB7EC\uC640\uC694", children: "\uD83D\uDD58 \uC218\uC815 \uC774\uB825" })), backups.length > 0 && (_jsxs("button", { type: "button", className: "btn btn-text", onClick: () => setShowBackups(true), children: ["\uC774 \uAE30\uAE30 \uBC31\uC5C5 ", backups.length] })), _jsx("button", { type: "button", className: "btn btn-primary", onClick: () => saver.current.isConflict ? setShowConflict(true) : setShowPublish(true), children: view.status === 'PUBLISHED' ? '다시 발행' : '발행' })] })] }), state.kind === 'conflict' && (_jsxs("div", { className: "banner banner-warn", children: ["\u26A0 \uB2E4\uB978 \uD0ED\uC774\uB098 \uAE30\uAE30\uC5D0\uC11C \uC774 \uAE00\uC774 \uC218\uC815\uB418\uC5C8\uC5B4\uC694(", clock(state.server.savedAt), "). \uC9C0\uAE08 \uB0B4\uC6A9\uC740 \uC774 \uAE30\uAE30\uC5D0\uB9CC \uC800\uC7A5\uB418\uACE0 \uC788\uC5B4\uC694.", _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setShowConflict(true), children: "\uBE44\uAD50\uD558\uAE30" })] })), hint?.publishRequestedAt && (_jsxs("div", { className: "banner ai-hint-banner", role: "status", children: ["AI\uAC00 \uC774 \uAE00\uC758 \uBC1C\uD589\uC744 \uC694\uCCAD\uD588\uC5B4\uC694. \uB0B4\uC6A9\uC744 \uC77D\uC5B4 \uBCF4\uACE0 \uAD1C\uCC2E\uC73C\uBA74 \uBC1C\uD589\uD574 \uC8FC\uC138\uC694.", hint.tags.length > 0 && _jsxs("span", { className: "muted small", children: [" \uD0DC\uADF8 \uC81C\uC548 ", hint.tags.length, "\uAC1C\uB97C \uBC1C\uD589 \uCC3D\uC5D0 \uCC44\uC6CC \uB480\uC5B4\uC694."] }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => saver.current.isConflict ? setShowConflict(true) : setShowPublish(true), children: "\uBC1C\uD589 \uCC3D \uC5F4\uAE30" })] })), notice && (_jsxs("div", { className: "banner banner-ok", role: "status", children: [notice, _jsx("button", { type: "button", className: "btn btn-text", "aria-label": "\uB2EB\uAE30", onClick: () => setNotice(null), children: "\u2715" })] })), images.waiting > 0 && (_jsxs("div", { className: "banner banner-warn", role: "status", children: [images.uploading > 0 ? `사진 ${images.waiting}장을 올리는 중…` : `⚠ 업로드 대기 사진 ${images.waiting}장 — 연결되면 자동으로 올려요. 다 올라가야 발행할 수 있어요.`, images.uploading === 0 && _jsx("button", { type: "button", className: "btn btn-text", onClick: () => void images.retryAll(), children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] })), images.error && (_jsxs("div", { className: "banner banner-warn", role: "alert", children: [images.error, _jsx("button", { type: "button", className: "btn btn-text", "aria-label": "\uB2EB\uAE30", onClick: images.clearError, children: "\u2715" })] })), images.usage && images.usage.usedBytes > images.usage.quotaBytes * 0.9 && (_jsxs("p", { className: "muted small editor-note", children: ["\uC0AC\uC9C4 \uC800\uC7A5 \uACF5\uAC04: \uB0A8\uC740 \uACF5\uAC04 \uC57D ", formatBytes(Math.max(0, images.usage.quotaBytes - images.usage.usedBytes))] })), view.status === 'PUBLISHED' && (_jsx("p", { className: "muted small editor-note", children: "\uBC1C\uD589\uD55C \uAE00\uC744 \uACE0\uCE58\uB294 \uC911\uC774\uC5D0\uC694. \uB2E4\uC2DC \uBC1C\uD589\uD560 \uB54C\uAE4C\uC9C0 \uB3C5\uC790\uC5D0\uAC8C\uB294 \uC774\uC804 \uBC1C\uD589\uBCF8\uC774 \uBCF4\uC5EC\uC694." })), _jsxs("div", { className: `editor-panes show-${tab}`, children: [_jsxs("section", { className: "editor-write", children: [_jsx("input", { className: "editor-title", placeholder: "\uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694", value: title, maxLength: 100, onChange: (e) => setTitle(e.target.value), "aria-label": "\uC81C\uBAA9", "aria-invalid": !!errors.title }), errors.title && _jsx("small", { className: "error", children: errors.title }), _jsx("textarea", { ref: bodyRef, className: `editor-body${dragging ? ' dragging' : ''}`, placeholder: "Markdown\uC73C\uB85C \uB0B4\uC6A9\uC744 \uC4F0\uC138\uC694\u2026 \uC0AC\uC9C4\uC740 \uBD99\uC5EC \uB123\uAC70\uB098 \uB04C\uC5B4 \uB193\uC73C\uC138\uC694", value: content, onChange: (e) => setContent(e.target.value), "aria-label": "\uBCF8\uBB38", "aria-invalid": !!errors.contentMd, spellCheck: false, onPaste: (e) => { if (addFiles(e.clipboardData?.files))
                                    e.preventDefault(); }, onDragOver: (e) => { if (e.dataTransfer?.types.includes('Files')) {
                                    e.preventDefault();
                                    setDragging(true);
                                } }, onDragLeave: () => setDragging(false), onDrop: (e) => {
                                    setDragging(false);
                                    if (e.dataTransfer?.files.length) {
                                        e.preventDefault();
                                        addFiles(e.dataTransfer.files);
                                    }
                                } }), errors.contentMd && _jsx("small", { className: "error", children: errors.contentMd }), _jsx(SeriesPicker, { postId: view.id }), _jsx(AttachmentEditor, { postId: view.id, published: view.status === 'PUBLISHED' })] }), _jsxs("section", { className: "editor-preview", "aria-label": "\uBBF8\uB9AC\uBCF4\uAE30", children: [_jsx("h1", { className: "post-title", children: title || _jsx("span", { className: "muted", children: "\uC81C\uBAA9 \uC5C6\uC74C" }) }), previewError && _jsx("p", { className: "error", children: previewError }), _jsx("div", { className: "post-body markdown", ref: previewRef, dangerouslySetInnerHTML: { __html: preview } })] })] }), showPublish && (_jsxs(Modal, { labelledBy: "publish-title", onClose: () => { if (!publishing)
                    setShowPublish(false); }, children: [_jsx("h2", { id: "publish-title", children: view.status === 'PUBLISHED' ? '다시 발행' : '발행' }), _jsxs("fieldset", { className: "field", children: [_jsx("legend", { children: "\uACF5\uAC1C \uBC94\uC704" }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "visibility", checked: visibility === 'PUBLIC', onChange: () => setVisibility('PUBLIC') }), " \uD83C\uDF10 \uC804\uCCB4 \uACF5\uAC1C"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "visibility", checked: visibility === 'FRIENDS', onChange: () => setVisibility('FRIENDS') }), " \uD83D\uDC65 \uCE5C\uAD6C\uC5D0\uAC8C\uB9CC"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "visibility", checked: visibility === 'PRIVATE', onChange: () => setVisibility('PRIVATE') }), " \uD83D\uDD12 \uBE44\uACF5\uAC1C (\uB098\uB9CC \uBCF4\uAE30)"] })] }), visibility === 'FRIENDS' && _jsx(NoFriendsHint, { onPublic: () => setVisibility('PUBLIC') }), _jsx(TagInput, { value: tags, onChange: (t) => { setTags(t); setErrors((m) => withoutTagErrors(m)); }, errors: tagErrors(errors) }), _jsx(AiTagSuggest, { postId: view.id, title: title, content: content, tags: tags, onAdd: (t) => { setTags((cur) => addTag(cur, t)); setErrors((m) => withoutTagErrors(m)); } }), _jsxs("label", { className: "field", children: [_jsxs("span", { children: ["\uC9E7\uC740 \uC18C\uAC1C (", summaryLength(summary), "/", SUMMARY_MAX, ")"] }), _jsx("textarea", { value: summary, rows: 3, "aria-invalid": errors.summary ? true : undefined, "aria-describedby": errors.summary ? 'summary-error' : undefined, placeholder: "\uBE44\uC6CC \uB450\uBA74 \uBCF8\uBB38 \uC55E\uBD80\uBD84\uC774 \uBAA9\uB85D\uC5D0 \uBCF4\uC5EC\uC694", onChange: (e) => { setSummary(e.target.value); setErrors(({ summary: _, ...rest }) => rest); } })] }), errors.summary && _jsx("p", { id: "summary-error", className: "error small", role: "alert", children: errors.summary }), _jsx(ThumbnailPicker, { value: thumbnail, content: content, error: errors.thumbnail, onBusy: setThumbnailBusy, onChange: (c) => { setThumbnail(c); setErrors(({ thumbnail: _, ...rest }) => rest); } }), Object.keys(errors).some((k) => !isPublishField(k)) && _jsx("p", { className: "error small", children: "\uC81C\uBAA9\uC774\uB098 \uBCF8\uBB38\uB3C4 \uD655\uC778\uD574 \uC8FC\uC138\uC694." }), _jsx(PrepublishCheck, { title: title, contentMd: content, summary: summary, tags: tags, thumbnail: thumbnail }), view.status === 'PUBLISHED' && _jsx("p", { className: "muted small", children: "\uC8FC\uC18C\uC640 \uCC98\uC74C \uACF5\uAC1C\uD55C \uB0A0\uC9DC\uB294 \uADF8\uB300\uB85C\uC774\uACE0 \"\uC218\uC815\uB428\"\uC774 \uD45C\uC2DC\uB3FC\uC694." }), _jsx(AltTexts, { content: content, open: showAlts, onOpen: () => setShowAlts(true), localUrls: images.localUrls.current, onChange: (i, alt) => setContent((c) => setAlt(c, i, alt)) }), pendingIds(content).length > 0 && _jsx("p", { className: "error small", children: "\uC5C5\uB85C\uB4DC\uAC00 \uB05D\uB098\uC9C0 \uC54A\uC740 \uC0AC\uC9C4\uC774 \uC788\uC5B4\uC694. \uB2E4 \uC62C\uB77C\uAC04 \uB4A4 \uBC1C\uD589\uD560 \uC218 \uC788\uC5B4\uC694." }), _jsxs("footer", { className: "dialog-footer", children: [_jsx("button", { type: "button", className: "btn btn-text", onClick: () => setShowPublish(false), disabled: publishing, children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: publish, disabled: publishing || thumbnailBusy, children: publishing ? '발행 중…' : '발행하기' })] })] })), showRevisions && (_jsx(RevisionHistory, { postId: view.id, current: current(), onClose: () => setShowRevisions(false), onLoad: async (r) => {
                    // 지금 내용은 이 기기 백업에 남겨 둔다: 불러오기로 사라지지 않게 (백업 불러오기와 같은 규칙)
                    const mine = { memberId, postId: view.id, ...current(), at: Date.now() };
                    if (mine.title !== r.title || mine.contentMd !== r.contentMd)
                        await localDrafts.addBackup(mine);
                    setTitle(r.title);
                    setContent(r.contentMd);
                    setSummary(r.summary ?? '');
                    setBackups(await localDrafts.backups(memberId, view.id));
                    setShowRevisions(false);
                    setNotice(`${r.no}판을 불러왔어요. 다시 발행하면 독자에게 보여요. 바로 전 내용은 이 기기 백업에 있어요.`);
                } })), showBackups && (_jsxs(Modal, { labelledBy: "backups-title", onClose: () => setShowBackups(false), children: [_jsx("h2", { id: "backups-title", children: "\uC774 \uAE30\uAE30 \uBC31\uC5C5" }), _jsx("p", { className: "muted small", children: "[\uC800\uC7A5\uB41C \uB0B4\uC6A9 \uBD88\uB7EC\uC624\uAE30]\uB97C \uACE0\uB97C \uB54C \uD3B8\uC9D1 \uC911\uC774\uB358 \uB0B4\uC6A9\uC774\uC5D0\uC694. 7\uC77C \uB3D9\uC548 \uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uB9CC \uB0A8\uC544\uC694." }), _jsx("ul", { className: "backup-list", children: backups.map((b) => (_jsxs("li", { children: [_jsxs("div", { children: [_jsx("b", { children: b.title || '제목 없음' }), " ", _jsx("span", { className: "muted small", children: new Date(b.at).toLocaleString('ko-KR') }), _jsx("p", { className: "small muted backup-excerpt", children: b.contentMd.slice(0, 120) })] }), _jsxs("div", { className: "row", children: [_jsx("button", { type: "button", className: "btn btn-outline", onClick: async () => {
                                                // 지금 내용도 백업해 두고 바꾼다: 어느 쪽도 모르게 사라지지 않게 (FR-013)
                                                const mine = { memberId, postId: view.id, ...current(), at: Date.now() };
                                                if (mine.title !== b.title || mine.contentMd !== b.contentMd)
                                                    await localDrafts.addBackup(mine);
                                                setTitle(b.title);
                                                setContent(b.contentMd);
                                                setBackups(await localDrafts.backups(memberId, view.id));
                                                setShowBackups(false);
                                                setNotice('백업한 내용을 불러왔어요. 바로 전 내용도 백업해 두었어요.');
                                            }, children: "\uBD88\uB7EC\uC624\uAE30" }), _jsx("button", { type: "button", className: "btn btn-text", onClick: async () => {
                                                await localDrafts.removeBackup(b);
                                                setBackups((list) => list.filter((x) => x !== b));
                                            }, children: "\uC9C0\uC6B0\uAE30" })] })] }, b.at))) }), _jsx("footer", { className: "dialog-footer", children: _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setShowBackups(false), children: "\uB2EB\uAE30" }) })] })), showConflict && conflictServer && (_jsx(ConflictDialog, { server: conflictServer, mine: current(), onClose: () => setShowConflict(false), onOverwrite: () => void saveNow(conflictServer.version), onLoadServer: async () => {
                    // 편집 중이던 내용은 이 기기에 7일 백업한다 (FR-012). 백업을 못 하면 불러오기 전에 알린다
                    const backup = { memberId, postId: view.id, ...current(), at: Date.now() };
                    if (!(await localDrafts.addBackup(backup))) {
                        if (!confirm('이 브라우저에는 백업을 남길 수 없어요. 편집 중인 내용을 버리고 저장된 내용을 불러올까요?'))
                            return;
                    }
                    else {
                        setBackups((b) => [backup, ...b]);
                        setNotice('편집 중인 내용은 이 기기에 7일 동안 백업돼요.');
                    }
                    setTitle(conflictServer.title);
                    setContent(conflictServer.contentMd);
                    saver.current.reset({ title: conflictServer.title, contentMd: conflictServer.contentMd }, conflictServer.version);
                    setState({ kind: 'saved', at: new Date(conflictServer.savedAt) });
                    setShowConflict(false);
                }, onSaveAsNew: async () => {
                    const created = await api('/api/posts', { method: 'POST', body: current() });
                    saver.current.reset({ title: conflictServer.title, contentMd: conflictServer.contentMd }, conflictServer.version);
                    setLeaveGuard(null);
                    navigate(`/write/${created.id}`);
                } }))] }));
}
function withoutTagErrors(map) {
    return Object.fromEntries(Object.entries(map).filter(([k]) => !k.startsWith('tags')));
}
/** 발행 설정 창의 대체글 넣기 (009 US3). 없어도 발행은 막지 않는다. */
function AltTexts({ content, open, onOpen, localUrls, onChange }) {
    const list = bodyImages(content);
    const missing = list.filter((i) => !i.alt.trim()).length;
    if (list.length === 0)
        return null;
    if (!open) {
        return missing > 0 ? (_jsxs("p", { className: "small", children: ["\uB300\uCCB4\uAE00\uC774 \uC5C6\uB294 \uC0AC\uC9C4\uC774 ", missing, "\uC7A5 \uC788\uC5B4\uC694 ", _jsx("button", { type: "button", className: "btn btn-text", onClick: onOpen, children: "\uB300\uCCB4\uAE00 \uB123\uAE30" })] })) : null;
    }
    return (_jsxs("fieldset", { className: "field alt-texts", children: [_jsx("legend", { children: "\uC0AC\uC9C4 \uB300\uCCB4\uAE00" }), _jsx("p", { className: "muted small", children: "\uC0AC\uC9C4\uC744 \uBCFC \uC218 \uC5C6\uB294 \uBD84\uAED8 \uC77D\uC5B4 \uC904 \uC124\uBA85\uC774\uC5D0\uC694." }), list.map((img) => {
                const src = img.src.startsWith('local:') ? localUrls.get(img.src.slice(6)) : img.src;
                return (_jsxs("label", { className: "alt-row", children: [src ? _jsx("img", { src: src, alt: "", className: "alt-thumb" }) : _jsx("span", { className: "alt-thumb" }), _jsxs("span", { className: "alt-input", children: [_jsx("input", { value: img.alt, placeholder: "\uC608: \uB85C\uADF8\uC778 \uD654\uBA74\uC758 \uC624\uB958 \uBA54\uC2DC\uC9C0", onChange: (e) => onChange(img.index, e.target.value) }), img.alt.length > ALT_SOFT_LIMIT && _jsxs("small", { className: "muted", children: ["\uC9E7\uAC8C \uC4F0\uBA74 \uB354 \uB4E3\uAE30 \uD3B8\uD574\uC694 (", img.alt.length, "\uC790)"] })] })] }, img.index));
            })] }));
}
function SaveIndicator({ state, localStored, onCompare }) {
    switch (state.kind) {
        case 'saved':
            return _jsxs("span", { className: "save-state ok", role: "status", children: ["\u2713 \uC800\uC7A5\uB428", state.at ? ` ${clock(state.at)}` : ''] });
        case 'dirty':
            return _jsx("span", { className: "save-state", role: "status", children: localStored ? '● 이 기기에 저장됨 (동기화 대기)' : '● 저장 대기' });
        case 'saving':
            return _jsx("span", { className: "save-state", role: "status", children: "\uC800\uC7A5 \uC911\u2026" });
        case 'offline':
            return _jsx("span", { className: "save-state warn", role: "status", children: "\u26A0 \uC624\uD504\uB77C\uC778 \u2014 \uC774 \uAE30\uAE30\uC5D0 \uC800\uC7A5 \uC911, \uC5F0\uACB0\uB418\uBA74 \uC790\uB3D9 \uB3D9\uAE30\uD654" });
        case 'conflict':
            return _jsx("button", { type: "button", className: "save-state warn btn-text", onClick: onCompare, children: "\u26A0 \uB2E4\uB978 \uACF3\uC5D0\uC11C \uC218\uC815\uB428 \u2014 \uC774 \uAE30\uAE30\uC5D0\uB9CC \uC800\uC7A5 \uC911 [\uBE44\uAD50\uD558\uAE30]" });
        case 'error':
            return _jsxs("span", { className: "save-state warn", role: "status", children: ["\u26A0 ", state.message] });
    }
}
/** 친구가 없는데 친구 공개를 고르면 아무도 못 보는 글이 된다는 것을 알려 준다 (docs/06 §5). */
function NoFriendsHint({ onPublic }) {
    const [count, setCount] = useState(null);
    useEffect(() => {
        let alive = true;
        api('/api/me/friends').then((o) => { if (alive)
            setCount(o.friends.length); }).catch(() => undefined);
        return () => { alive = false; };
    }, []);
    if (count !== 0)
        return null;
    return (_jsxs("p", { className: "banner small", role: "status", children: ["\uC544\uC9C1 \uCE5C\uAD6C\uAC00 \uC5C6\uC5B4\uC11C \uC9C0\uAE08\uC740 \uB098\uB9CC \uBCFC \uC218 \uC788\uC5B4\uC694.", ' ', _jsx("button", { type: "button", className: "btn btn-text", onClick: onPublic, children: "\uC804\uCCB4 \uACF5\uAC1C\uB85C \uBC14\uAFB8\uAE30" })] }));
}
