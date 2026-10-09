import { api } from './api';
export const PROJECT_LIMITS = { period: 40, summary: 200, tech: 12, techName: 30, text: 2000 };
export const portfolioApi = {
    of: (handle) => api(`/api/members/${encodeURIComponent(handle)}/portfolio`),
    project: (seriesId) => api(`/api/me/series/${seriesId}/project`),
    save: (seriesId, f) => api(`/api/me/series/${seriesId}/project`, { method: 'PUT', body: f }),
};
/** "Spring Boot, React" 같은 입력을 기술 목록으로. 쉼표로 나누고 빈 칸·같은 이름(대소문자 무시)은 한 번만 */
export function parseTech(raw) {
    const seen = new Set();
    const out = [];
    for (const part of raw.split(',')) {
        const v = part.trim().replace(/\s+/g, ' ');
        if (!v || seen.has(v.toLowerCase()))
            continue;
        seen.add(v.toLowerCase());
        out.push(v);
    }
    return out;
}
/** 연락하기 주소: 이메일이 있으면 메일, 없으면 홈페이지 */
export function contactHref(links) {
    if (links.email)
        return `mailto:${links.email}`;
    return links.homepage ?? null;
}
