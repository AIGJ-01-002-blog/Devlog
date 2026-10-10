import { t } from './i18n';
export class ApiError extends Error {
    status;
    code;
    errors;
    details;
    retryAfter;
    constructor(status, code, message, errors = [], details = null, retryAfter = null) {
        super(message);
        this.status = status;
        this.code = code;
        this.errors = errors;
        this.details = details;
        this.retryAfter = retryAfter;
    }
    fieldError(field) {
        return this.errors.find((e) => e.field === field)?.message;
    }
}
function csrfToken() {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}
/** 쓰기 요청 전에 CSRF 쿠키가 없으면 한 번 받아 둔다 (첫 방문 직후 바로 쓰기를 할 때). */
async function ensureCsrf() {
    if (csrfToken())
        return;
    await fetch('/api/auth/me', { credentials: 'same-origin' }).catch(() => undefined);
}
export async function api(path, options = {}) {
    const method = options.method ?? 'GET';
    const headers = { Accept: 'application/json', ...options.headers };
    if (method !== 'GET') {
        await ensureCsrf();
        const token = csrfToken();
        if (token)
            headers['X-XSRF-TOKEN'] = token;
    }
    if (options.rawBody)
        headers['Content-Type'] = options.rawBody.type || 'application/octet-stream';
    else if (options.body !== undefined)
        headers['Content-Type'] = 'application/json';
    let res;
    try {
        res = await fetch(path, {
            method,
            headers,
            credentials: 'same-origin',
            body: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
            keepalive: options.keepalive,
            signal: options.signal,
        });
    }
    catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError')
            throw e;
        throw new ApiError(0, 'NETWORK', t('네트워크에 연결할 수 없어요.'));
    }
    if (res.status === 204)
        return undefined;
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok)
        throw errorOf(res, data);
    return data;
}
/** 파일로 받는 GET (059 내보내기). 오류는 {@link api}와 같은 ApiError로 던진다. */
export async function apiFile(path) {
    let res;
    try {
        res = await fetch(path, { credentials: 'same-origin' });
    }
    catch {
        throw new ApiError(0, 'NETWORK', t('네트워크에 연결할 수 없어요.'));
    }
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw errorOf(res, text ? safeJson(text) : null);
    }
    return { blob: await res.blob(), fileName: attachmentName(res.headers.get('Content-Disposition')) };
}
/** Content-Disposition의 파일 이름. filename*=UTF-8''…(RFC 5987)을 먼저 본다. */
export function attachmentName(header) {
    if (!header)
        return null;
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
    if (encoded) {
        try {
            return decodeURIComponent(encoded.trim());
        }
        catch {
            // 잘못 인코딩된 값이면 아래의 filename=을 쓴다
        }
    }
    return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? null;
}
function errorOf(res, data) {
    const body = (data ?? {});
    const retry = res.headers.get('Retry-After');
    return new ApiError(res.status, body.code ?? `HTTP_${res.status}`, body.message ?? t('잠시 후 다시 시도해 주세요.'), body.errors ?? [], body.details ?? null, retry ? Number(retry) : null);
}
function safeJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
/** 서버가 페이지에 넣어 준 첫 화면 데이터. 한 번 꺼내면 지운다(뒤로 가기 등으로 다시 쓰지 않게). */
let initialData;
export function takeInitialData(page) {
    if (initialData === undefined) {
        const el = document.getElementById('initial-data');
        initialData = el?.textContent ? safeJson(el.textContent) : null;
    }
    if (!initialData || initialData.page !== page)
        return null;
    const d = initialData;
    initialData = null;
    return d;
}
