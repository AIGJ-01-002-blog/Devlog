import { api } from './api';
import { ACCEPTED_TYPES } from './image';
import { t } from './i18n';
// 본문 사진 (009). 브라우저에서 줄이고(긴 변 1920px) 다시 그려 사진 정보를 지운 뒤, 가로 640px 썸네일과 함께 올린다.
// 못 올린 사진은 이 기기에 보관하고 본문에는 "업로드 대기" 임시 표시(local:…)를 넣는다. 발행은 서버가 막는다.
export const MAX_EDGE = 1920;
export const THUMB_WIDTH = 640;
export const MAX_BYTES = 10 * 1024 * 1024;
export const ALT_SOFT_LIMIT = 125;
/** 고르기 전 검사. 문제가 있으면 안내 문구. */
export function checkImageFile(file) {
    if (!ACCEPTED_TYPES.includes(file.type))
        return t('jpg·png·gif·webp 사진만 올릴 수 있어요.');
    if (file.size > MAX_BYTES)
        return t('사진은 10MB까지 올릴 수 있어요.');
    return null;
}
/** 긴 변을 limit 이하로 줄인 크기. 이미 작으면 그대로. */
export function fitWithin(width, height, limit) {
    const scale = Math.min(1, limit / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
/** 가로를 limit 이하로 줄인 크기 (썸네일). */
export function fitWidth(width, height, limit) {
    const scale = Math.min(1, limit / width);
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
async function draw(source, size, preferPng) {
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('canvas');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, size.width, size.height);
    const encode = (type, q) => new Promise((resolve) => canvas.toBlob(resolve, type, q));
    const webp = await encode('image/webp', 0.85);
    if (webp && webp.type === 'image/webp')
        return webp;
    // webp를 못 만드는 브라우저: 투명할 수 있는 png는 png로, 나머지는 jpg로
    const fallback = preferPng ? await encode('image/png') : await encode('image/jpeg', 0.88);
    if (!fallback)
        throw new Error('encode');
    return fallback;
}
/**
 * 올릴 사진과 썸네일을 만든다. GIF는 원본 그대로(가로·세로 1920px 이하만), 썸네일은 첫 장면이다.
 * 움직이는 webp·png는 다시 그리면서 첫 장면만 남는다.
 * @throws Error 안내 문구를 message로
 */
export async function prepareImage(file) {
    const problem = checkImageFile(file);
    if (problem)
        throw new Error(problem);
    let bitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    }
    catch {
        throw new Error(t('사진 파일을 열 수 없어요. 손상된 파일인지 확인해 주세요.'));
    }
    try {
        const png = file.type === 'image/png' || file.type === 'image/gif';
        const thumb = await draw(bitmap, fitWidth(bitmap.width, bitmap.height, THUMB_WIDTH), png);
        if (file.type === 'image/gif') {
            if (bitmap.width > MAX_EDGE || bitmap.height > MAX_EDGE)
                throw new Error(t('GIF는 가로·세로 1920px까지 올릴 수 있어요.'));
            return { image: file, thumb };
        }
        const image = await draw(bitmap, fitWithin(bitmap.width, bitmap.height, MAX_EDGE), png);
        return { image, thumb };
    }
    finally {
        bitmap.close();
    }
}
/** 원본 다음에 썸네일을 이어 붙여 한 번에 보낸다. 썸네일 길이는 머리글로 알린다. */
export function uploadPostImage(p, signal) {
    return api('/api/images', {
        method: 'POST',
        rawBody: new Blob([p.image, p.thumb], { type: 'application/octet-stream' }),
        headers: { 'X-Thumbnail-Bytes': String(p.thumb.size) },
        signal,
    });
}
export function storageUsage() {
    return api('/api/me/storage');
}
// ---------------------------------------------------------------- 본문 원문 다루기
const LOCAL = /!\[([^\]]*)\]\(local:([A-Za-z0-9_-]{6,40})\)/g;
export function placeholder(id, alt = '') {
    return `![${alt}](local:${id})`;
}
/** 본문에 남은 업로드 대기 사진 표시. */
export function pendingIds(md) {
    return [...md.matchAll(LOCAL)].map((m) => m[2]);
}
/** 업로드가 끝난 사진의 임시 표시를 진짜 주소로 바꾼다(대체글은 그대로). */
export function replacePlaceholder(md, id, url) {
    return md.replaceAll(`](local:${id})`, `](${url})`);
}
/** 실패한 사진의 임시 표시를 지운다. */
export function removePlaceholder(md, id) {
    return md.replace(new RegExp(`!\\[[^\\]]*\\]\\(local:${id}\\)\\n?`, 'g'), '');
}
const IMAGE = /!\[([^\]\n]*)\]\(([^)\s]+)\)/g;
/** 본문의 사진들 (대체글 넣기 창). 코드 블록 속 예시도 세지만 실제 글에서 드물어 그대로 둔다. */
export function bodyImages(md) {
    return [...md.matchAll(IMAGE)].map((m, index) => ({ index, alt: m[1], src: m[2] }));
}
/** 대체글로 쓸 수 있게 다듬는다: 줄바꿈과 대괄호는 원문 문법을 깨므로 뺀다. */
export function cleanAlt(alt) {
    return alt.replace(/[\r\n]+/g, ' ').replace(/[[\]]/g, '');
}
/** index번째 사진의 대체글을 바꾼다. */
export function setAlt(md, index, alt) {
    let i = -1;
    return md.replace(IMAGE, (whole, _old, src) => (++i === index ? `![${cleanAlt(alt)}](${src})` : whole));
}
/** 미리보기용: 업로드 대기 표시를 서버가 링크로 그릴 수 있는 주소로 바꾼다. 받은 HTML에서 다시 사진으로 바꾼다. */
export const PREVIEW_PENDING_BASE = 'https://pending.invalid/';
export function forPreview(md) {
    return md.replace(LOCAL, (_w, alt, id) => `![${alt}](${PREVIEW_PENDING_BASE}${id})`);
}
/** 서버가 만든 미리보기 HTML에서 업로드 대기 링크를 이 기기 사진으로 바꾼다. */
export function restorePendingInPreview(html, urls) {
    if (!html.includes(PREVIEW_PENDING_BASE))
        return html;
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    doc.querySelectorAll(`a[href^="${PREVIEW_PENDING_BASE}"]`).forEach((a) => {
        const id = a.getAttribute('href').slice(PREVIEW_PENDING_BASE.length);
        const src = urls.get(id);
        const img = doc.createElement('img');
        if (src)
            img.src = src;
        img.alt = '';
        img.className = 'pending-image';
        img.title = t('업로드 대기 중');
        a.replaceWith(img);
    });
    return doc.body.firstElementChild.innerHTML;
}
export function formatBytes(n) {
    if (n <= 0)
        return '0MB';
    if (n >= 1024 * 1024 * 1024)
        return `${(n / 1024 / 1024 / 1024).toFixed(n % (1024 * 1024 * 1024) === 0 ? 0 : 1)}GB`;
    if (n >= 1024 * 1024)
        return `${Math.round(n / 1024 / 1024)}MB`;
    return `${Math.max(1, Math.round(n / 1024))}KB`;
}
