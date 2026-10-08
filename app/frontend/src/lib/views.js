import { useEffect } from 'react';
import { api } from './api';
/** 글이 화면에 이만큼 연속으로 보이면 한 번 본 것으로 친다 (spec 013 FR-001). */
export const VIEW_DWELL_MS = 1000;
export const VIEW_HINT = '같은 사람은 하루에 한 번만 세요';
/**
 * 탭이 보이고 글이 화면 안에 있는 동안만 시간을 잰다. 다시 가려지면 처음부터 잰다.
 * 한 번 보내면 끝이고, 실패해도 다시 보내지 않는다(조회수는 정확하지 않아도 되고 읽기를 방해하면 안 된다).
 * @returns 정리 함수
 */
export function watchView(el, send, win = window) {
    let inView = false;
    let timer = null;
    let done = false;
    const doc = win.document;
    const update = () => {
        const ready = inView && doc.visibilityState === 'visible' && !done;
        if (ready && timer === null) {
            timer = setTimeout(() => {
                done = true;
                cleanup();
                send();
            }, VIEW_DWELL_MS);
        }
        else if (!ready && timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    };
    const observer = new IntersectionObserver((entries) => {
        inView = entries.some((e) => e.isIntersecting);
        update();
    });
    observer.observe(el);
    doc.addEventListener('visibilitychange', update);
    function cleanup() {
        observer.disconnect();
        doc.removeEventListener('visibilitychange', update);
        if (timer !== null)
            clearTimeout(timer);
        timer = null;
    }
    return cleanup;
}
export function sendView(postId) {
    api(`/api/posts/${postId}/views`, { method: 'POST', keepalive: true }).catch(() => { });
}
let visitSent = false;
/**
 * 사이트 방문 (spec 064). 화면을 처음 열 때 한 번만 보낸다. 같은 날 같은 사람은 서버가 한 명으로 모으고,
 * 30분 넘게 쉬었다 다시 열면 방문 수만 늘린다. 실패해도 다시 보내지 않는다.
 */
export function sendVisit() {
    if (visitSent)
        return;
    visitSent = true;
    api('/api/visits', { method: 'POST', keepalive: true }).catch(() => { });
}
/** 남의 발행 글을 열었을 때만 센다. 작성자 본인은 서버도 세지 않지만 요청부터 보내지 않는다. */
export function useViewBeacon(ref, postId, enabled) {
    useEffect(() => {
        const el = ref.current;
        if (!enabled || postId === undefined || !el || typeof IntersectionObserver === 'undefined')
            return;
        return watchView(el, () => sendView(postId));
    }, [ref, postId, enabled]);
}
