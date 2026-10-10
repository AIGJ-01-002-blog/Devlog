import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatTextarea, MarkdownToolbar } from '../components/MarkdownToolbar';
import { formatForKey } from '../lib/mdFormat';
import { ConflictDialog } from '../components/ConflictDialog';
import { Modal } from '../components/Modal';
import { AiTagSuggest } from '../components/AiTagSuggest';
import { AttachmentEditor } from '../components/AttachmentEditor';
import { PrepublishCheck } from '../components/PrepublishCheck';
import { RevisionHistory } from '../components/RevisionHistory';
import { BranchSuggest } from '../components/BranchSuggest';
import { SeriesPicker } from '../components/SeriesPicker';
import { TagInput } from '../components/TagInput';
import { ThumbnailPicker } from '../components/ThumbnailPicker';
import { api, ApiError } from '../lib/api';
import { Autosaver } from '../lib/autosave';
import { useAuth } from '../lib/auth';
import { clock, fullDate } from '../lib/format';
import { renderDiagramsWithin } from '../lib/diagram';
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
import { t, tNodes } from '../lib/i18n';
/** [새 글]: 임시글을 먼저 만들고 에디터 주소로 바꾼다 (docs/04 §2-5). */
export function NewPostPage() {
    const [error, setError] = useState(null);
    const started = useRef(false);
    const create = useCallback(() => {
        setError(null);
        api('/api/posts', { method: 'POST', body: {} })
            .then((p) => navigate(`/write/${p.id}`, { replace: true }))
            .catch((e) => setError(e instanceof ApiError ? e.message : t('새 글을 만들지 못했어요.')));
    }, []);
    useEffect(() => {
        if (started.current)
            return;
        started.current = true;
        create();
    }, [create]);
    return (_jsx("main", { className: "container narrow", children: error
            ? _jsxs("p", { className: "error center", role: "alert", children: [error, " ", _jsx("button", { type: "button", className: "btn btn-text", onClick: create, children: t('다시 시도') })] })
            : _jsx("p", { className: "muted center", children: t('새 글을 준비하는 중…') }) }));
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
        return _jsx("main", { className: "container", children: _jsx("p", { className: "muted center", children: t('불러오는 중…') }) });
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
    const [notice, setNotice] = useState(restore === 'load' ? { ok: true, text: t('이 기기에 저장되지 않은 변경을 불러왔어요.') } : null);
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
        setLeaveGuard(() => !(s.hasUnsaved || s.isConflict) || confirm(t('저장되지 않은 변경이 있어요. 떠날까요?')));
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
        const timer = setTimeout(() => {
            if (!content.trim())
                return setPreview('');
            // 업로드 대기 사진은 이 기기 사진으로 보여 준다 (FR-016)
            api('/api/markdown/preview', { method: 'POST', body: { contentMd: forPreview(content) } })
                .then((r) => { setPreview(restorePendingInPreview(r.html, images.localUrls.current)); setPreviewError(null); })
                .catch((e) => setPreviewError(e instanceof ApiError ? e.message : t('미리보기를 만들지 못했어요.')));
        }, 500);
        return () => clearTimeout(timer);
    }, [content]);
    useEffect(() => {
        void renderDiagramsWithin(previewRef.current);
        void highlightWithin(previewRef.current);
    }, [preview, tab]);
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
    // Ctrl(⌘)+S: 브라우저의 "페이지 저장" 대신 이 글을 바로 저장한다(제목·본문 어디에 있든)
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                void saveNow();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [saveNow]);
    const handleError = (e) => {
        if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') {
            setState({ kind: 'conflict', server: e.details.server });
            setShowConflict(true);
        }
        else if (e instanceof ApiError) {
            const map = {};
            e.errors.forEach((f) => (map[f.field] = f.message));
            setErrors(map);
            setState({ kind: 'error', message: e.errors.length ? t('입력값을 확인해 주세요.') : e.message });
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
    return (_jsxs("main", { className: "editor", children: [_jsxs("div", { className: "editor-toolbar", children: [_jsxs("div", { className: "row", children: [_jsx("button", { type: "button", className: "btn btn-text", "data-tip": t('에디터 닫기. 쓴 내용은 자동으로 저장돼요'), onClick: () => history.length > 1 ? history.back() : navigate('/manage/posts'), children: t('← 나가기') }), _jsx(SaveIndicator, { state: state, localStored: localStored, onCompare: () => setShowConflict(true) })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "tabs-mobile", role: "tablist", children: [_jsx("button", { type: "button", role: "tab", "aria-selected": tab === 'write', onClick: () => setTab('write'), children: t('쓰기') }), _jsx("button", { type: "button", role: "tab", "aria-selected": tab === 'preview', onClick: () => setTab('preview'), children: t('미리보기') })] }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => fileRef.current?.click(), "data-tip": t('사진 넣기: jpg·png·gif·webp, 10MB까지. 움직이는 webp·png는 첫 장면만 남아요'), children: tNodes('{0} 사진', { 0: _jsx("span", { "aria-hidden": "true", children: "\uD83D\uDDBC" }) }) }), _jsx("input", { ref: fileRef, type: "file", accept: "image/jpeg,image/png,image/gif,image/webp", multiple: true, hidden: true, onChange: (e) => { addFiles(e.target.files); e.target.value = ''; } }), _jsx("button", { type: "button", className: "btn btn-outline", "data-tip": t('지금 바로 저장 (Ctrl+S). 평소에도 몇 초마다 자동 저장돼요'), onClick: () => saveNow(), children: t('저장') }), view.status === 'PUBLISHED' && (_jsx("button", { type: "button", className: "btn btn-text", onClick: () => setShowRevisions(true), "data-tip": t('발행한 판을 지금 내용과 비교하고, 이전 판을 불러와요'), children: tNodes('{0} 수정 이력', { 0: _jsx("span", { "aria-hidden": "true", children: "\uD83D\uDD58" }) }) })), backups.length > 0 && (_jsx("button", { type: "button", className: "btn btn-text", "data-tip": t('이 브라우저에 따로 남겨 둔 사본 보기'), onClick: () => setShowBackups(true), children: tNodes('이 기기 백업 {0}', { 0: backups.length }) })), _jsx("button", { type: "button", className: "btn btn-primary", "data-tip": t('공개 범위·태그·썸네일을 정하고 발행해요'), onClick: () => saver.current.isConflict ? setShowConflict(true) : setShowPublish(true), children: view.status === 'PUBLISHED' ? t('다시 발행') : t('발행') })] })] }), state.kind === 'conflict' && (_jsx("div", { className: "banner banner-warn", role: "alert", children: tNodes('{0} 다른 탭이나 기기에서 이 글이 수정되었어요({1}). 지금 내용은 이 기기에만 저장되고 있어요.{2}', { 0: _jsx("span", { "aria-hidden": "true", children: "\u26A0" }), 1: clock(state.server.savedAt), 2: _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setShowConflict(true), children: t('비교하기') }) }) })), hint?.publishRequestedAt && (_jsxs("div", { className: "banner ai-hint-banner", role: "status", children: [t('AI가 이 글의 발행을 요청했어요. 내용을 읽어 보고 괜찮으면 발행해 주세요.'), hint.tags.length > 0 && _jsxs("span", { className: "muted small", children: ["  ", tNodes('태그 제안 {0}개를 발행 창에 채워 뒀어요.', { 0: hint.tags.length })] }), _jsx("button", { type: "button", className: "btn btn-text", onClick: () => saver.current.isConflict ? setShowConflict(true) : setShowPublish(true), children: t('발행 창 열기') })] })), notice && (_jsxs("div", { className: notice.ok ? 'banner banner-ok' : 'banner banner-warn', role: notice.ok ? 'status' : 'alert', children: [notice.text, _jsx("button", { type: "button", className: "btn btn-text", "aria-label": t('닫기'), onClick: () => setNotice(null), children: "\u2715" })] })), images.waiting > 0 && (_jsxs("div", { className: "banner banner-warn", role: "status", children: [images.uploading > 0
                        ? t('사진 {0}장을 올리는 중…', { 0: images.waiting })
                        : _jsx(_Fragment, { children: tNodes('{0} 업로드 대기 사진 {1}장 — 연결되면 자동으로 올려요. 다 올라가야 발행할 수 있어요.', { 0: _jsx("span", { "aria-hidden": "true", children: "\u26A0" }), 1: images.waiting }) }), images.uploading === 0 && _jsx("button", { type: "button", className: "btn btn-text", onClick: () => void images.retryAll(), children: t('다시 시도') })] })), images.error && (_jsxs("div", { className: "banner banner-warn", role: "alert", children: [images.error, _jsx("button", { type: "button", className: "btn btn-text", "aria-label": t('닫기'), onClick: images.clearError, children: "\u2715" })] })), images.usage && images.usage.usedBytes > images.usage.quotaBytes * 0.9 && (_jsx("p", { className: "muted small editor-note", children: tNodes('사진 저장 공간: 남은 공간 약 {0}', { 0: formatBytes(Math.max(0, images.usage.quotaBytes - images.usage.usedBytes)) }) })), view.status === 'PUBLISHED' && (_jsx("p", { className: "muted small editor-note", children: t('발행한 글을 고치는 중이에요. 다시 발행할 때까지 독자에게는 이전 발행본이 보여요.') })), _jsxs("div", { className: `editor-panes show-${tab}`, children: [_jsxs("section", { className: "editor-write", children: [_jsx("input", { className: "editor-title", placeholder: t('제목을 입력하세요'), value: title, maxLength: 100, onChange: (e) => setTitle(e.target.value), "aria-label": t('제목'), "aria-invalid": !!errors.title, "aria-describedby": errors.title ? 'title-error' : undefined }), errors.title && _jsx("small", { id: "title-error", className: "error", children: errors.title }), _jsx(MarkdownToolbar, { bodyRef: bodyRef, onChange: setContent }), _jsx("textarea", { ref: bodyRef, className: `editor-body${dragging ? ' dragging' : ''}`, placeholder: t('Markdown으로 내용을 쓰세요… 사진은 붙여 넣거나 끌어 놓으세요'), value: content, onChange: (e) => setContent(e.target.value), "aria-label": t('본문'), "aria-invalid": !!errors.contentMd, "aria-describedby": errors.contentMd ? 'content-error' : undefined, onKeyDown: (e) => {
                                    // Ctrl(⌘)+B·I·K는 서식
                                    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey)
                                        return;
                                    const f = formatForKey(e.key);
                                    if (f) {
                                        e.preventDefault();
                                        formatTextarea(e.currentTarget, f, setContent);
                                    }
                                }, spellCheck: false, onPaste: (e) => { if (addFiles(e.clipboardData?.files))
                                    e.preventDefault(); }, onDragOver: (e) => { if (e.dataTransfer?.types.includes('Files')) {
                                    e.preventDefault();
                                    setDragging(true);
                                } }, onDragLeave: () => setDragging(false), onDrop: (e) => {
                                    setDragging(false);
                                    if (e.dataTransfer?.files.length) {
                                        e.preventDefault();
                                        addFiles(e.dataTransfer.files);
                                    }
                                } }), errors.contentMd && _jsx("small", { id: "content-error", className: "error", children: errors.contentMd }), _jsx(SeriesPicker, { postId: view.id }), _jsx(AttachmentEditor, { postId: view.id, published: view.status === 'PUBLISHED' })] }), _jsxs("section", { className: "editor-preview", "aria-label": t('미리보기'), children: [_jsx("h1", { className: "post-title", children: title || _jsx("span", { className: "muted", children: t('제목 없음') }) }), previewError && _jsx("p", { className: "error", role: "alert", children: previewError }), _jsx("div", { className: "post-body markdown", ref: previewRef, dangerouslySetInnerHTML: { __html: preview } })] })] }), showPublish && (_jsxs(Modal, { labelledBy: "publish-title", onClose: () => { if (!publishing)
                    setShowPublish(false); }, children: [_jsx("h2", { id: "publish-title", children: view.status === 'PUBLISHED' ? t('다시 발행') : t('발행') }), _jsxs("fieldset", { className: "field", children: [_jsx("legend", { children: t('공개 범위') }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "visibility", checked: visibility === 'PUBLIC', onChange: () => setVisibility('PUBLIC') }), " ", _jsx("span", { "aria-hidden": "true", children: "\uD83C\uDF10" }), "  ", t('전체 공개')] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "visibility", checked: visibility === 'FRIENDS', onChange: () => setVisibility('FRIENDS') }), " ", _jsx("span", { "aria-hidden": "true", children: "\uD83D\uDC65" }), "  ", t('친구에게만')] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "visibility", checked: visibility === 'PRIVATE', onChange: () => setVisibility('PRIVATE') }), " ", _jsx("span", { "aria-hidden": "true", children: "\uD83D\uDD12" }), "  ", t('비공개 (나만 보기)')] })] }), visibility === 'FRIENDS' && _jsx(NoFriendsHint, { onPublic: () => setVisibility('PUBLIC') }), _jsx(TagInput, { value: tags, onChange: (t) => { setTags(t); setErrors((m) => withoutTagErrors(m)); }, errors: tagErrors(errors) }), _jsx(AiTagSuggest, { postId: view.id, title: title, content: content, tags: tags, onAdd: (t) => { setTags((cur) => addTag(cur, t)); setErrors((m) => withoutTagErrors(m)); } }), _jsx(BranchSuggest, { postId: view.id, tags: tags }), _jsxs("label", { className: "field", children: [_jsx("span", { children: tNodes('짧은 소개 ({0}/{1})', { 0: summaryLength(summary), 1: SUMMARY_MAX }) }), _jsx("textarea", { value: summary, rows: 3, "aria-invalid": errors.summary ? true : undefined, "aria-describedby": errors.summary ? 'summary-error' : undefined, placeholder: t('비워 두면 본문 앞부분이 목록에 보여요'), onChange: (e) => { setSummary(e.target.value); setErrors(({ summary: _, ...rest }) => rest); } })] }), errors.summary && _jsx("p", { id: "summary-error", className: "error small", role: "alert", children: errors.summary }), _jsx(ThumbnailPicker, { value: thumbnail, content: content, error: errors.thumbnail, onBusy: setThumbnailBusy, onChange: (c) => { setThumbnail(c); setErrors(({ thumbnail: _, ...rest }) => rest); } }), Object.keys(errors).some((k) => !isPublishField(k)) && _jsx("p", { className: "error small", children: t('제목이나 본문도 확인해 주세요.') }), _jsx(PrepublishCheck, { title: title, contentMd: content, summary: summary, tags: tags, thumbnail: thumbnail }), view.status === 'PUBLISHED' && _jsx("p", { className: "muted small", children: t('주소와 처음 공개한 날짜는 그대로이고 "수정됨"이 표시돼요.') }), _jsx(AltTexts, { content: content, open: showAlts, onOpen: () => setShowAlts(true), localUrls: images.localUrls.current, onChange: (i, alt) => setContent((c) => setAlt(c, i, alt)) }), pendingIds(content).length > 0 && _jsx("p", { className: "error small", children: t('업로드가 끝나지 않은 사진이 있어요. 다 올라간 뒤 발행할 수 있어요.') }), _jsxs("footer", { className: "dialog-footer", children: [_jsx("button", { type: "button", className: "btn btn-text", onClick: () => setShowPublish(false), disabled: publishing, children: t('취소') }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: publish, disabled: publishing || thumbnailBusy, children: publishing ? t('발행 중…') : t('발행하기') })] })] })), showRevisions && (_jsx(RevisionHistory, { postId: view.id, current: current(), onClose: () => setShowRevisions(false), onLoad: async (r) => {
                    // 지금 내용은 이 기기 백업에 남겨 둔다: 불러오기로 사라지지 않게 (백업 불러오기와 같은 규칙)
                    const mine = { memberId, postId: view.id, ...current(), at: Date.now() };
                    if ((mine.title !== r.title || mine.contentMd !== r.contentMd) && !(await localDrafts.addBackup(mine))) {
                        if (!confirm(t('이 브라우저에는 백업을 남길 수 없어요. 편집 중인 내용을 버리고 이 판을 불러올까요?')))
                            return;
                    }
                    setTitle(r.title);
                    setContent(r.contentMd);
                    setSummary(r.summary ?? '');
                    setBackups(await localDrafts.backups(memberId, view.id));
                    setShowRevisions(false);
                    setNotice({ ok: true, text: t('{0}판을 불러왔어요. 다시 발행하면 독자에게 보여요. 바로 전 내용은 이 기기 백업에 있어요.', { 0: r.no }) });
                } })), showBackups && (_jsxs(Modal, { labelledBy: "backups-title", onClose: () => setShowBackups(false), children: [_jsx("h2", { id: "backups-title", children: t('이 기기 백업') }), _jsx("p", { className: "muted small", children: t('[저장된 내용 불러오기]를 고를 때 편집 중이던 내용이에요. 7일 동안 이 브라우저에만 남아요.') }), _jsx("ul", { className: "backup-list", children: backups.map((b) => (_jsxs("li", { children: [_jsxs("div", { children: [_jsx("b", { children: b.title || t('제목 없음') }), " ", _jsxs("span", { className: "muted small", children: [fullDate(new Date(b.at).toISOString()), " ", clock(new Date(b.at))] }), _jsx("p", { className: "small muted backup-excerpt", children: b.contentMd.slice(0, 120) })] }), _jsxs("div", { className: "row", children: [_jsx("button", { type: "button", className: "btn btn-outline", onClick: async () => {
                                                // 지금 내용도 백업해 두고 바꾼다: 어느 쪽도 모르게 사라지지 않게 (FR-013)
                                                const mine = { memberId, postId: view.id, ...current(), at: Date.now() };
                                                if ((mine.title !== b.title || mine.contentMd !== b.contentMd) && !(await localDrafts.addBackup(mine))) {
                                                    if (!confirm(t('이 브라우저에는 백업을 남길 수 없어요. 편집 중인 내용을 버리고 백업을 불러올까요?')))
                                                        return;
                                                }
                                                setTitle(b.title);
                                                setContent(b.contentMd);
                                                setBackups(await localDrafts.backups(memberId, view.id));
                                                setShowBackups(false);
                                                setNotice({ ok: true, text: t('백업한 내용을 불러왔어요. 바로 전 내용도 백업해 두었어요.') });
                                            }, children: t('불러오기') }), _jsx("button", { type: "button", className: "btn btn-text", onClick: async () => {
                                                if (!confirm(t('이 백업을 지울까요? 되돌릴 수 없어요.')))
                                                    return;
                                                await localDrafts.removeBackup(b);
                                                setBackups((list) => list.filter((x) => x !== b));
                                            }, children: t('지우기') })] })] }, b.at))) }), _jsx("footer", { className: "dialog-footer", children: _jsx("button", { type: "button", className: "btn btn-text", onClick: () => setShowBackups(false), children: t('닫기') }) })] })), showConflict && conflictServer && (_jsx(ConflictDialog, { server: conflictServer, mine: current(), onClose: () => setShowConflict(false), onOverwrite: () => void saveNow(conflictServer.version), onLoadServer: async () => {
                    // 편집 중이던 내용은 이 기기에 7일 백업한다 (FR-012). 백업을 못 하면 불러오기 전에 알린다
                    const backup = { memberId, postId: view.id, ...current(), at: Date.now() };
                    if (!(await localDrafts.addBackup(backup))) {
                        if (!confirm(t('이 브라우저에는 백업을 남길 수 없어요. 편집 중인 내용을 버리고 저장된 내용을 불러올까요?')))
                            return;
                    }
                    else {
                        setBackups((b) => [backup, ...b]);
                        setNotice({ ok: true, text: t('편집 중인 내용은 이 기기에 7일 동안 백업돼요.') });
                    }
                    setTitle(conflictServer.title);
                    setContent(conflictServer.contentMd);
                    saver.current.reset({ title: conflictServer.title, contentMd: conflictServer.contentMd }, conflictServer.version);
                    setState({ kind: 'saved', at: new Date(conflictServer.savedAt) });
                    setShowConflict(false);
                }, onSaveAsNew: async () => {
                    let created;
                    try {
                        created = await api('/api/posts', { method: 'POST', body: current() });
                    }
                    catch (e) {
                        setShowConflict(false);
                        setNotice({ ok: false, text: e instanceof ApiError ? e.message : t('새 글로 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.') });
                        return;
                    }
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
        return missing > 0 ? (_jsx("p", { className: "small", children: tNodes('대체글이 없는 사진이 {0}장 있어요 {1}', { 0: missing, 1: _jsx("button", { type: "button", className: "btn btn-text", onClick: onOpen, children: t('대체글 넣기') }) }) })) : null;
    }
    return (_jsxs("fieldset", { className: "field alt-texts", children: [_jsx("legend", { children: t('사진 대체글') }), _jsx("p", { className: "muted small", children: t('사진을 볼 수 없는 분께 읽어 줄 설명이에요.') }), list.map((img) => {
                const src = img.src.startsWith('local:') ? localUrls.get(img.src.slice(6)) : img.src;
                return (_jsxs("label", { className: "alt-row", children: [src ? _jsx("img", { src: src, alt: "", className: "alt-thumb" }) : _jsx("span", { className: "alt-thumb" }), _jsxs("span", { className: "alt-input", children: [_jsx("input", { value: img.alt, placeholder: t('예: 로그인 화면의 오류 메시지'), onChange: (e) => onChange(img.index, e.target.value) }), img.alt.length > ALT_SOFT_LIMIT && _jsx("small", { className: "muted", children: tNodes('짧게 쓰면 더 듣기 편해요 ({0}자)', { 0: img.alt.length }) })] })] }, img.index));
            })] }));
}
// 상태 영역(role=status)은 하나만 두고 글자만 바꾼다: 새로 끼우면 화면 읽기 프로그램이 바뀐 상태를 놓친다
function SaveIndicator({ state, localStored, onCompare }) {
    const icon = (c) => _jsxs("span", { "aria-hidden": "true", children: [c, " "] });
    let cls = 'save-state';
    let body;
    switch (state.kind) {
        case 'saved':
            cls = 'save-state ok';
            body = _jsxs(_Fragment, { children: [icon('✓'), t('저장됨'), state.at ? ` ${clock(state.at)}` : ''] });
            break;
        case 'dirty':
            body = _jsxs(_Fragment, { children: [icon('●'), localStored ? t('이 기기에 저장됨 (동기화 대기)') : t('저장 대기')] });
            break;
        case 'saving':
            body = t('저장 중…');
            break;
        case 'offline':
            cls = 'save-state warn';
            body = _jsx(_Fragment, { children: tNodes('{0}오프라인 — 이 기기에 저장 중, 연결되면 자동 동기화', { 0: icon('⚠') }) });
            break;
        case 'conflict':
            cls = '';
            body = (_jsx("button", { type: "button", className: "save-state warn btn-text", onClick: onCompare, children: tNodes('{0}다른 곳에서 수정됨 — 이 기기에만 저장 중 [비교하기]', { 0: icon('⚠') }) }));
            break;
        case 'error':
            cls = 'save-state warn';
            body = _jsxs(_Fragment, { children: [icon('⚠'), state.message] });
            break;
    }
    return _jsx("span", { className: cls || undefined, role: "status", children: body });
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
    return (_jsx("p", { className: "banner small", role: "status", children: tNodes('아직 친구가 없어서 지금은 나만 볼 수 있어요. {0}', { 0: _jsx("button", { type: "button", className: "btn btn-text", onClick: onPublic, children: t('전체 공개로 바꾸기') }) }) }));
}
