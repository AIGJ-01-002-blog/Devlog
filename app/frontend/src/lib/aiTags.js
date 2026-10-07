import { api, ApiError } from './api';
export const aiTagsApi = {
    status: () => api('/api/ai/tags/status'),
    agree: () => api('/api/me/agreements/ai', { method: 'POST' }),
    suggest: (postId, body) => api(`/api/posts/${postId}/ai-tags`, { method: 'POST', body }),
};
/** 실패 이유별 안내 (FR-035). 동의 필요는 화면이 동의 창으로 따로 처리한다. */
export function aiErrorText(e) {
    if (e instanceof ApiError) {
        switch (e.code) {
            case 'AI_TOO_SHORT': return '글을 조금 더 쓴 뒤 추천받아 보세요.';
            case 'AI_DAILY_LIMIT': return '오늘 AI 추천 횟수를 다 썼어요. 내일 다시 쓸 수 있어요.';
            case 'AI_BUSY':
            case 'TOO_MANY_REQUESTS': return '잠시 후 다시 시도해 주세요.';
            case 'EMAIL_NOT_VERIFIED': return '이메일 인증을 마친 뒤 쓸 수 있어요.';
        }
    }
    return '지금은 추천할 수 없어요.';
}
/** 이미 붙인 태그와 남은 자리를 반영한 제안 (붙인 뒤 다시 그릴 때도 쓴다) */
export function visibleSuggestions(suggested, attached, maxTags) {
    const room = Math.max(0, maxTags - attached.length);
    return suggested.filter((t) => !attached.includes(t)).slice(0, Math.min(5, room));
}
