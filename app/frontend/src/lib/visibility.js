/** 공개 범위 표시를 한곳에 모은다 (docs/06 §2, 배지 🌐 / 👥 / 🔒). */
export const VISIBILITIES = ['PUBLIC', 'FRIENDS', 'PRIVATE'];
export const VISIBILITY_ICON = { PUBLIC: '🌐', FRIENDS: '👥', PRIVATE: '🔒' };
export const VISIBILITY_LABEL = { PUBLIC: '전체 공개', FRIENDS: '친구에게만', PRIVATE: '나만 보기' };
/** 바꾼 뒤 알려 주는 문장 */
export const VISIBILITY_CHANGED = {
    PUBLIC: '공개했어요.',
    FRIENDS: '친구에게만 공개로 바꿨어요. 이제 나와 친구만 볼 수 있어요.',
    PRIVATE: '비공개로 바꿨어요. 이제 나만 볼 수 있어요.',
};
export const DEFAULT_VISIBILITY_CHANGED = {
    PUBLIC: '이제 새 글은 전체 공개로 시작해요.',
    FRIENDS: '이제 새 글은 친구에게만 공개로 시작해요.',
    PRIVATE: '이제 새 글은 나만 보기로 시작해요.',
};
export function isVisibility(v) {
    return typeof v === 'string' && VISIBILITIES.includes(v);
}
