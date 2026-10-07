// 서버 API 호출. 쿠키 세션 + CSRF(XSRF-TOKEN 쿠키 → X-XSRF-TOKEN 헤더), 공통 오류 형식 {code, message, errors, details}.
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
        throw new ApiError(0, 'NETWORK', '네트워크에 연결할 수 없어요.');
    }
    if (res.status === 204)
        return undefined;
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) {
        const body = (data ?? {});
        const retry = res.headers.get('Retry-After');
        throw new ApiError(res.status, body.code ?? `HTTP_${res.status}`, body.message ?? '잠시 후 다시 시도해 주세요.', body.errors ?? [], body.details ?? null, retry ? Number(retry) : null);
    }
    return data;
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
