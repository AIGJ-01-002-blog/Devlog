import { api } from './api';
import { localDrafts } from './localDrafts';
import { t } from './i18n';
export const TRASH_CONFIRM = t('휴지통으로 옮길까요? 30일 안에는 복구할 수 있어요.');
export const PURGE_CONFIRM = t('완전히 삭제할까요? 댓글·좋아요도 함께 지워지고 되돌릴 수 없어요.');
/** 휴지통으로 옮긴다. 이 기기에 남은 작성 데이터도 지워 다시 열었을 때 되살아나지 않게 한다. */
export async function trashPost(id, memberId) {
    const r = await api(`/api/posts/${id}`, { method: 'DELETE' });
    if (memberId != null)
        await localDrafts.remove(memberId, id);
    return r;
}
export function restorePost(id) {
    return api(`/api/posts/${id}/restore`, { method: 'POST' });
}
export function purgePost(id) {
    return api(`/api/posts/${id}/permanent`, { method: 'DELETE' });
}
/** 완전 삭제까지 남은 날 (올림, 최소 0). "D-3"처럼 보여 준다. */
export function daysLeft(purgeAt, now = Date.now()) {
    return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - now) / 86_400_000));
}
export function trashedMessage(r) {
    return r.result === 'DELETED_EMPTY' ? t('빈 임시글이라 바로 지웠어요.') : t('휴지통으로 옮겼어요. 30일 안에 복구할 수 있어요.');
}
