export function browserShareEnv() {
    const nav = typeof navigator === 'undefined' ? undefined : navigator;
    return {
        share: nav?.share ? (d) => nav.share(d) : undefined,
        writeText: nav?.clipboard?.writeText ? (t) => nav.clipboard.writeText(t) : undefined,
        touch: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches,
    };
}
/** 사이트 안 경로를 남에게 보낼 수 있는 전체 주소로 바꾼다 */
export function absoluteUrl(path, origin) {
    return new URL(path, origin).href;
}
export async function shareLink(url, title, env) {
    if (env.touch && env.share) {
        try {
            await env.share({ title, url });
            return 'shared';
        }
        catch (e) {
            // 사용자가 공유 창을 닫았다. 복사로 넘어가지 않는다
            if (e instanceof DOMException && e.name === 'AbortError')
                return 'cancelled';
        }
    }
    if (!env.writeText)
        return 'failed';
    try {
        await env.writeText(url);
        return 'copied';
    }
    catch {
        return 'failed';
    }
}
