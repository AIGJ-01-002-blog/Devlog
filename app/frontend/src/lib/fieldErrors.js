import { ApiError } from './api';
/** 서버 필드 오류를 칸별 문구로. 같은 칸에 여러 규칙을 어기면 한 줄로 잇는다. 필드가 없으면 form에 담는다. */
export function fieldErrors(err) {
    if (!(err instanceof ApiError))
        return { form: '잠시 후 다시 시도해 주세요.' };
    const map = {};
    for (const f of err.errors)
        map[f.field] = map[f.field] ? `${map[f.field]} ${f.message}` : f.message;
    if (!err.errors.length)
        map.form = err.message;
    return map;
}
