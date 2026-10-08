# 구현 메모: 052 devlog MCP 서버와 개인 접근 토큰 (v1.27.0)

| 파일 | 바뀜 |
|---|---|
| `V13__mcp_access.sql` | `oauth_client`, `personal_access_token`(OAuth 열 포함), `post_ai_hint` 테이블 |
| `mcp/application/AccessTokens` | 토큰 만들기·목록·폐기·Bearer 인증(마지막 사용은 10분마다 기록) |
| `mcp/application/McpTools` | 도구 8개 정의와 실행, 요청 제한·권한 확인 |
| `mcp/application/AiDraftHints` | 태그 제안·발행 요청 기록. 발행되면 지운다(`PublishExtension`) |
| `mcp/application/AccessTokenWithdrawalPurgeStep` | 탈퇴 정리(순서 46) |
| `mcp/web/McpController` | `/api/mcp` JSON-RPC |
| `mcp/application/OAuthServer`, `mcp/web/OAuthController` | OAuth 메타데이터·동적 등록·동의 API·토큰 교환 |
| `mcp/web/AccessTokenController` | `/api/me/tokens`, `/api/posts/{id}/ai-hint` |
| `config/SecurityConfig` | `/api/mcp`·`/api/oauth/token`·`/api/oauth/register` 전용 보안 체인(`@Order(0)`, 세션·CSRF 없음) |
| 화면 | `components/AiConnectSection`(설정 › AI 연결), `pages/WritePage`(태그 미리 채움·발행 요청 알림), `pages/McpPage`("곧 열려요" 제거, Codex·ChatGPT 안내), `pages/OAuthAuthorizePage`(동의 화면), `lib/mcp`(토큰 API) |
| `ai/application/AiProperties`·`ProviderState`·`AiTagService`·`MemoDraftService`, `ai/infra/OllamaModel` | 집 PC 먼저(`prefer`), 집 PC 꺼짐 표시(`ai:local:down`), 접근 헤더 |
| 테스트 | `McpTest` 6개, `McpOAuthTest` 3개, `AiConnectSection.test.tsx` 1개, `mcp.test.ts` 2개 추가, `AiLocalFirstTest` 1개(기존 AI 시험은 `prefer: gemini`로 예전 순서를 계속 본다), `MigrationTest` 테이블 수 37 |

## 결정
- **Spring AI MCP 스타터를 쓰지 않고 직접 구현**: 도구 8개와 JSON-RPC 몇 가지라 코드가 작고, 기존 서비스와 권한 검사를 그대로 부르며, Spring Boot 4.1 호환 버전을 기다릴 필요가 없다. 상태 없는 JSON 응답은 MCP 규격의 Streamable HTTP가 허용하는 형태다.
- **발행 도구 없음**: 민서님 조건 "발행은 사람 확인". AI가 부를 수 있는 가장 센 일은 "발행 대기" 표시다. 발행 API는 로그인 세션 + CSRF가 필요해 토큰으로는 부를 수 없다.
- **임시글 태그는 따로 둔다**: 이 블로그는 태그를 발행 때 확정하므로(010) AI 제안을 `post_ai_hint`에 두었다가 발행 창에 채운다. post 패키지가 mcp 패키지를 모르게, 제안은 별도 API로 읽는다.
- **기본 권한 WRITE**: 핵심 기능이 개발 일지 쓰기라서. 읽기 전용도 고를 수 있다.
- **토큰 해시는 SHA-256**: 무작위 256비트라 대입 공격이 의미 없어 느린 해시가 필요 없다.
- **이메일 인증 전 회원**: 웹과 같이 글쓰기를 막는다(004 FR-008). 읽기 도구는 쓸 수 있다.
- 화면에 보이는 기능이 늘어나므로 Minor 버전이다.
- **ChatGPT는 OAuth, 나머지는 개인 토큰**: ChatGPT 커넥터는 헤더에 토큰을 넣는 방법이 없고 OAuth를 요구한다. Claude Code·Cursor·Codex는 개인 토큰이 더 간단해 그대로 둔다. Claude 웹·데스크톱 커넥터도 같은 OAuth로 붙는다.
- **OAuth도 직접 구현**: Spring Authorization Server는 JWT·키 관리·여러 흐름을 다 가져와 이 용도엔 크다. 공개 클라이언트 + PKCE + 불투명 토큰(해시 저장)만 필요해 200줄 남짓이다. 토큰을 같은 표에 두어 MCP 쪽 인증 코드는 바뀌지 않는다.
- **동적 등록을 연다**: 앱마다 미리 등록할 수 없어서다. 대신 동의 화면에 앱 이름과 돌아갈 곳(호스트)을 보여 주고, 처음 보는 앱이면 거부하라고 적었다. 돌아갈 주소는 등록한 값과 정확히 같아야 한다.
- **접근 토큰 1시간 + 갱신 회전**: 새어 나가도 오래 못 쓰고, 갱신 토큰을 두 번 쓰면 실패해 도용을 알아챌 수 있다.
- **집 PC 먼저 (답 4번 변경)**: MCP 개발 일지는 사용자 AI가 쓰므로 집 PC에 오는 일은 태그 추천·메모 다듬기뿐이라 1대로 충분하다. 꺼졌을 때 매번 시간 초과를 기다리지 않게 실패하면 60초 건너뛴다. Ollama를 그냥 열지 않도록 Cloudflare Access 서비스 토큰을 기본 방법으로 안내한다(집 PC에 프록시를 따로 띄우지 않아도 된다).
- **임베딩 대기열은 다음으로**: 의미 검색 기능이 아직 없어 대기열만 먼저 만들 이유가 없다. 의미 검색 spec에서 Redis 대기열 + 모델 하나 고정(`bge-m3`)으로 넣는다.

## 보안 점검 반영 (2026-10-08)

- 범위를 요청하지 않거나 모르는 값이면 읽기만 준다. 쓰기는 `devlog.write`를 요청했을 때만.
- `code_verifier`도 `code_challenge`와 같이 43~128자 unreserved 문자만 받는다(RFC 7636).
- 동적 등록은 누구나 할 수 있어 앱 이름을 믿을 수 없으므로, 동의 화면에 "devlog가 확인하지 않은 앱" 표시와 돌아갈 주소(호스트)를 크게 보인다.
- 후속: 교체된 refresh 토큰이 다시 쓰이면 그 연결을 통째로 끊기, 같은 회원·앱이 다시 동의하면 이전 연결 행을 바꾸기(지금은 쌓임).
