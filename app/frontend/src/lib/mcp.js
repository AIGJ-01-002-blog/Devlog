/** devlog MCP 서버 연결 안내 (050). 실제 주소는 지금 사이트 주소를 따라간다(로컬 개발이면 localhost). */
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
/** AI가 쓸 수 있는 도구. 발행은 언제나 사람이 devlog 화면에서 한다 */
export const MCP_TOOLS = [
    { name: 'write_devlog', does: '오늘 대화·커밋을 정리한 개발 일지를 임시글로 올려요', scope: '쓰기' },
    { name: 'create_draft', does: '새 임시글 만들기 (제목·본문·태그)', scope: '쓰기' },
    { name: 'update_draft', does: '내 임시글 고치기', scope: '쓰기' },
    { name: 'request_publish', does: '"발행 대기"로 올리기. 내가 화면에서 [발행]을 눌러야 공개돼요', scope: '쓰기' },
    { name: 'search_posts', does: '내 글·공개 글 검색', scope: '읽기' },
    { name: 'get_post', does: '글 본문(Markdown) 읽기. 웹과 같은 공개 범위를 따라요', scope: '읽기' },
    { name: 'list_my_posts', does: '내 글·임시글 목록', scope: '읽기' },
    { name: 'suggest_tags', does: '본문에 맞는 태그 추천', scope: '읽기' },
];
