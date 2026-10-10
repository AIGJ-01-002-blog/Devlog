import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { ACCEPTED_TYPES } from '../lib/image';
import { prepareImage, uploadPostImage } from '../lib/postImages';
import { thumbnailPreview } from '../lib/postThumbnail';
import { t } from '../lib/i18n';
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
            setUploadError(e instanceof Error ? e.message : t('사진을 올리지 못했어요.'));
        }
        finally {
            setUploading(false);
            onBusy(false);
        }
    };
    return (_jsxs("fieldset", { className: "field thumbnail-picker", children: [_jsx("legend", { children: t('썸네일') }), _jsx("div", { className: "thumbnail-preview", children: preview
                    ? _jsx("img", { src: preview, alt: "", width: 640, height: 360 })
                    : _jsx("span", { className: "muted small", children: value.kind === 'none' ? t('썸네일 없음') : t('본문에 사진이 없어요') }) }), _jsx("p", { className: "muted small", "aria-live": "polite", children: uploading ? t('사진을 올리는 중…')
                    : value.kind === 'image' ? t('직접 고른 사진이 목록과 공유 미리보기에 보여요.')
                        : value.kind === 'none' ? t('목록에 사진 없이 보여요.')
                            : t('본문 첫 사진이 목록과 공유 미리보기에 보여요.') }), _jsxs("div", { className: "row", children: [_jsx("button", { type: "button", className: "btn btn-outline", disabled: uploading, onClick: () => fileRef.current?.click(), children: value.kind === 'image' ? t('다른 사진 올리기') : t('사진 올리기') }), value.kind !== 'auto' && (_jsx("button", { type: "button", className: "btn btn-text", disabled: uploading, onClick: () => onChange({ kind: 'auto' }), children: t('본문 첫 사진으로') })), value.kind !== 'none' && (_jsx("button", { type: "button", className: "btn btn-text", disabled: uploading, onClick: () => onChange({ kind: 'none' }), children: t('썸네일 없애기') }))] }), _jsx("input", { ref: fileRef, type: "file", accept: ACCEPTED_TYPES.join(','), hidden: true, onChange: (e) => { void pick(e.target.files?.[0]); e.target.value = ''; } }), message && _jsx("p", { className: "error small", role: "alert", children: message })] }));
}
