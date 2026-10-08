import { api } from './api';
/** devlog MCP 서버 연결 안내 (051·052). 실제 주소는 지금 사이트 주소를 따라간다(로컬 개발이면 localhost). */
export const MCP_PATH = '/api/mcp';
export const TOKEN_PLACEHOLDER = '<내 토큰>';
export function mcpEndpoint(origin) {
    return new URL(MCP_PATH, origin).href;
}
/** Claude Code 터미널에서 한 줄로 연결하는 명령 */
export function claudeCodeCommand(origin, token = TOKEN_PLACEHOLDER) {
    return `claude mcp add --transport http devlog ${mcpEndpoint(origin)} --header "Authorization: Bearer ${token}"`;
}
/** Claude 데스크톱·Cursor 같은 설정 파일(JSON)에 넣는 내용 */
export function mcpJsonConfig(origin, token = TOKEN_PLACEHOLDER) {
    return JSON.stringify({ mcpServers: { devlog: { url: mcpEndpoint(origin), headers: { Authorization: `Bearer ${token}` } } } }, null, 2);
}
/**
 * AI가 쓸 수 있는 도구. 기본으로 발행은 사람이 devlog 화면에서 한다.
 * aiPublish 도구는 설정 › AI 연결에서 "AI가 발행·삭제하도록 허용"을 켠 회원에게만 열린다 (053).
 */
export const MCP_TOOLS = [
    { name: 'write_devlog', does: '오늘 대화·커밋을 정리한 개발 일지를 임시글로 올려요', scope: '쓰기' },
    { name: 'create_draft', does: '새 임시글 만들기 (제목·본문·태그)', scope: '쓰기' },
    { name: 'update_draft', does: '내 임시글 고치기', scope: '쓰기' },
    { name: 'request_publish', does: '"발행 대기"로 올리기. 내가 화면에서 [발행]을 눌러야 공개돼요', scope: '쓰기' },
    { name: 'publish_post', does: '임시글을 바로 발행하기 (웹의 [발행하기]와 같아요)', scope: '쓰기', aiPublish: true },
    { name: 'delete_post', does: '내 글 삭제하기. 웹에서 지울 때처럼 휴지통으로 가고 30일 안에 복구할 수 있어요', scope: '쓰기', aiPublish: true },
    { name: 'search_posts', does: '내 글·공개 글 검색', scope: '읽기' },
    { name: 'get_post', does: '글 본문(Markdown) 읽기. 웹과 같은 공개 범위를 따라요', scope: '읽기' },
    { name: 'list_my_posts', does: '내 글·임시글 목록', scope: '읽기' },
    { name: 'list_tags', does: '내가 자주 쓴 태그·인기 태그 보기 (태그 제안에 써요)', scope: '읽기' },
];
export const TOKEN_EXPIRY_DAYS = [30, 90, 365];
export const TOKEN_NAME_MAX = 40;
export const tokensApi = {
    list: () => api('/api/me/tokens'),
    create: (name, scope, expiresInDays) => api('/api/me/tokens', { method: 'POST', body: { name, scope, expiresInDays } }),
    revoke: (id) => api(`/api/me/tokens/${id}`, { method: 'DELETE' }),
};
export const aiPublishApi = {
    get: () => api('/api/me/ai-publish'),
    set: (allowed) => api('/api/me/ai-publish', { method: 'PUT', body: { allowed } }),
};
export const aiHint = (postId) => api(`/api/posts/${postId}/ai-hint`).then((h) => h ?? null);
/** 주소창의 OAuth 매개변수를 동의 API 본문 모양으로 */
export function oauthParams(search) {
    const q = new URLSearchParams(search);
    const get = (k) => q.get(k) ?? undefined;
    return {
        clientId: get('client_id'), redirectUri: get('redirect_uri'), responseType: get('response_type'),
        codeChallenge: get('code_challenge'), codeChallengeMethod: get('code_challenge_method'),
        scope: get('scope'), state: get('state'), resource: get('resource'),
    };
}
export const oauthApi = {
    view: (search) => api(`/api/oauth/authorize${search}`),
};
/** Codex CLI 설정 (~/.codex/config.toml). 토큰은 환경 변수로 넘긴다 */
export function codexConfig(origin) {
    return `[mcp_servers.devlog]\nurl = "${mcpEndpoint(origin)}"\nbearer_token_env_var = "DEVLOG_TOKEN"`;
}
