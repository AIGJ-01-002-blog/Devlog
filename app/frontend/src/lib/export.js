import { ApiError, api, apiFile } from './api';
import { t } from './i18n';
/** 내 글 내보내기 (059). */
export function exportSummary() {
    return api('/api/me/export');
}
/** zip을 받아 브라우저 다운로드로 넘기고 파일 이름을 돌려준다. */
export async function downloadExport() {
    const { blob, fileName } = await apiFile('/api/me/export.zip');
    const name = fileName ?? 'devlog-export.zip';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return name;
}
/** 받지 못한 까닭을 사람이 읽는 말로. */
export function exportErrorText(e) {
    if (e instanceof ApiError && e.status === 429)
        return t('잠시 뒤에 다시 받아 주세요. 10분에 5번까지 받을 수 있어요.');
    if (e instanceof ApiError && e.status === 0)
        return t('연결이 끊겨 받지 못했어요. 다시 시도해 주세요.');
    return t('내보내기 파일을 만들지 못했어요.');
}
