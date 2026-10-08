import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { ACCEPTED_TYPES } from '../lib/image';
import { prepareImage, uploadPostImage } from '../lib/postImages';
import { thumbnailPreview } from '../lib/postThumbnail';
/**
 * 발행 창의 썸네일 칸 (047). velog처럼 미리보기와 [사진 올리기]·[본문 첫 사진으로]·[썸네일 없애기]를 둔다.
 * 올린 사진은 본문 사진과 같은 규칙으로 올라가고, 발행할 때 고른 것으로 확정된다.
 */
export function ThumbnailPicker({ value, content, error, onChange, onBusy }) {
    const fileRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const preview = thumbnailPreview(value, content);
    const message = uploadError ?? error;
    const pick = async (file) => {
        if (!file)
            return;
        setUploadError(null);
        setUploading(true);
        onBusy(true);
        try {
            const up = await uploadPostImage(await prepareImage(file));
            onChange({ kind: 'image', url: up.url });
        }
        catch (e) {
            setUploadError(e instanceof Error ? e.message : '사진을 올리지 못했어요.');
        }
        finally {
            setUploading(false);
            onBusy(false);
        }
    };
    return (_jsxs("fieldset", { className: "field thumbnail-picker", children: [_jsx("legend", { children: "\uC378\uB124\uC77C" }), _jsx("div", { className: "thumbnail-preview", children: preview
                    ? _jsx("img", { src: preview, alt: "" })
                    : _jsx("span", { className: "muted small", children: value.kind === 'none' ? '썸네일 없음' : '본문에 사진이 없어요' }) }), _jsx("p", { className: "muted small", "aria-live": "polite", children: uploading ? '사진을 올리는 중…'
                    : value.kind === 'image' ? '직접 고른 사진이 목록과 공유 미리보기에 보여요.'
                        : value.kind === 'none' ? '목록에 사진 없이 보여요.'
                            : '본문 첫 사진이 목록과 공유 미리보기에 보여요.' }), _jsxs("div", { className: "row", children: [_jsx("button", { type: "button", className: "btn btn-outline", disabled: uploading, onClick: () => fileRef.current?.click(), children: value.kind === 'image' ? '다른 사진 올리기' : '사진 올리기' }), value.kind !== 'auto' && (_jsx("button", { type: "button", className: "btn btn-text", disabled: uploading, onClick: () => onChange({ kind: 'auto' }), children: "\uBCF8\uBB38 \uCCAB \uC0AC\uC9C4\uC73C\uB85C" })), value.kind !== 'none' && (_jsx("button", { type: "button", className: "btn btn-text", disabled: uploading, onClick: () => onChange({ kind: 'none' }), children: "\uC378\uB124\uC77C \uC5C6\uC560\uAE30" }))] }), _jsx("input", { ref: fileRef, type: "file", accept: ACCEPTED_TYPES.join(','), hidden: true, onChange: (e) => { void pick(e.target.files?.[0]); e.target.value = ''; } }), message && _jsx("p", { className: "error small", role: "alert", children: message })] }));
}
