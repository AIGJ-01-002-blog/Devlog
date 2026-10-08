import { api } from './api';
export const releasesApi = {
    list: () => api('/api/release-notes'),
};
/** 주소의 #v1.29.0 → "1.29.0" */
export function versionFromHash(hash) {
    const m = /^#v(\d+\.\d+\.\d+)$/.exec(hash);
    return m ? m[1] : null;
}
